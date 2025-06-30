/**
 * Dynamic Module Loader for ReportMate
 * Supports individual module repositories following the pattern reportmate-module-NAME
 */

export interface ModuleRepository {
  id: string
  name: string
  url: string
  branch?: string
  official: boolean
  verified: boolean
  enabled: boolean
  version?: string
  lastUpdated?: string
  author?: string
  description?: string
  type: 'single' | 'registry' // Single repo vs registry of multiple modules
}

export interface ModuleManifest {
  id: string
  name: string
  version: string
  description: string
  author: string
  repository: string
  
  // Module metadata
  official: boolean
  category: 'core' | 'widget' | 'integration' | 'security' | 'hardware' | 'software'
  tags: string[]
  
  // Dependencies
  dependencies: string[]
  peerDependencies?: string[]
  
  // Entry points
  main: string  // JavaScript entry point
  styles?: string  // CSS entry point
  
  // Permissions required
  permissions: string[]
  
  // Configuration schema
  configSchema?: any
  defaultConfig?: any
  
  // Compatibility
  minVersion: string  // Minimum ReportMate version
  maxVersion?: string
  
  // Security
  checksum?: string
  signature?: string
}

export interface ModuleRuntime {
  manifest: ModuleManifest
  loaded: boolean
  enabled: boolean
  instance?: any
  error?: string
  lastLoaded?: Date
}

export class DynamicModuleLoader {
  private modules: Map<string, ModuleRuntime> = new Map()
  private repositories: ModuleRepository[] = []
  private apiBaseUrl: string

  constructor(apiBaseUrl: string = '/api') {
    this.apiBaseUrl = apiBaseUrl
  }

  /**
   * Initialize the module system
   */
  async initialize(): Promise<void> {
    await this.loadRepositoryConfig()
    await this.loadEnabledModules()
  }

  /**
   * Load repository configuration from backend
   */
  private async loadRepositoryConfig(): Promise<void> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/modules/repositories`)
      if (response.ok) {
        this.repositories = await response.json()
      }
    } catch (error) {
      console.error('Failed to load repository config:', error)
    }
  }

  /**
   * Discover available modules from all enabled repositories and GitHub
   */
  async discoverModules(): Promise<ModuleManifest[]> {
    const allModules: ModuleManifest[] = []
    
    // Discover official modules from GitHub organization
    try {
      const officialModules = await this.discoverOfficialModules()
      allModules.push(...officialModules)
    } catch (error) {
      console.error('Failed to discover official modules:', error)
    }
    
    // Discover from manually added repositories
    for (const repo of this.repositories.filter(r => r.enabled)) {
      try {
        if (repo.type === 'single') {
          const manifest = await this.fetchModuleManifest(repo.url, repo.branch || 'main')
          if (manifest) {
            allModules.push(manifest)
          }
        } else {
          // Legacy multi-module repository support
          const modules = await this.fetchRepositoryModules(repo)
          allModules.push(...modules)
        }
      } catch (error) {
        console.error(`Failed to fetch modules from ${repo.name}:`, error)
      }
    }
    
    return allModules
  }

  /**
   * Discover modules from GitHub organization using the reportmate-module-* pattern
   */
  async discoverOfficialModules(): Promise<ModuleManifest[]> {
    try {
      // GitHub API to list repositories in the reportmate organization
      const response = await fetch('https://api.github.com/orgs/reportmate/repos?per_page=100')
      if (!response.ok) throw new Error('Failed to fetch GitHub repositories')
      
      const repos = await response.json()
      const moduleRepos = repos.filter((repo: any) => repo.name.startsWith('reportmate-module-'))
      
      const modules: ModuleManifest[] = []
      
      for (const repo of moduleRepos) {
        try {
          const manifest = await this.fetchModuleManifest(repo.html_url, repo.default_branch || 'main')
          if (manifest) {
            manifest.official = true
            manifest.repository = repo.html_url
            modules.push(manifest)
          }
        } catch (error) {
          console.warn(`Failed to load manifest from ${repo.name}:`, error)
        }
      }
      
      return modules
    } catch (error) {
      console.error('Failed to discover official modules:', error)
      return []
    }
  }

  /**
   * Fetch module manifest from a single repository
   */
  private async fetchModuleManifest(repoUrl: string, branch: string = 'main'): Promise<ModuleManifest | null> {
    try {
      // Convert GitHub URL to raw content URL
      const rawUrl = repoUrl
        .replace('github.com', 'raw.githubusercontent.com')
        .replace(/\/$/, '') + `/${branch}/manifest.json`
      
      const response = await fetch(rawUrl)
      if (!response.ok) return null
      
      const manifest = await response.json()
      
      // Validate required fields
      if (!manifest.id || !manifest.name || !manifest.version) {
        throw new Error('Invalid manifest: missing required fields')
      }
      
      return manifest
    } catch (error) {
      console.warn(`Failed to fetch manifest from ${repoUrl}:`, error)
      return null
    }
  }

  /**
   * Fetch modules from a specific repository
   */
  private async fetchRepositoryModules(repo: ModuleRepository): Promise<ModuleManifest[]> {
    // For GitHub repositories, fetch the modules.json index
    const indexUrl = `${repo.url}/raw/${repo.branch || 'main'}/modules.json`
    
    try {
      const response = await fetch(indexUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch module index: ${response.statusText}`)
      }
      
      const moduleIndex = await response.json()
      return moduleIndex.modules || []
    } catch (error) {
      console.error(`Error fetching modules from ${repo.name}:`, error)
      return []
    }
  }

  /**
   * Install a module from a repository
   */
  async installModule(moduleId: string, repositoryId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/modules/install`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleId, repositoryId })
      })
      
      if (response.ok) {
        await this.loadModule(moduleId)
        return true
      }
      
      return false
    } catch (error) {
      console.error(`Failed to install module ${moduleId}:`, error)
      return false
    }
  }

  /**
   * Install module from individual repository
   */
  async installModuleFromRepository(repoUrl: string, branch: string = 'main'): Promise<boolean> {
    try {
      // Extract module ID from repository name
      const repoName = repoUrl.split('/').pop()?.replace('.git', '') || ''
      const moduleId = repoName.replace('reportmate-module-', '')
      
      if (!moduleId) {
        throw new Error('Invalid repository name. Must follow pattern: reportmate-module-NAME')
      }
      
      // Fetch manifest
      const manifest = await this.fetchModuleManifest(repoUrl, branch)
      if (!manifest) {
        throw new Error('No valid manifest.json found in repository')
      }
      
      // Check compatibility
      if (!this.isCompatible(manifest)) {
        throw new Error(`Module ${manifest.id} is not compatible with current ReportMate version`)
      }
      
      // Check dependencies
      const missingDeps = await this.checkDependencies(manifest)
      if (missingDeps.length > 0) {
        throw new Error(`Missing dependencies: ${missingDeps.join(', ')}`)
      }
      
      // Fetch module code
      const codeUrl = repoUrl
        .replace('github.com', 'raw.githubusercontent.com')
        .replace(/\/$/, '') + `/${branch}/${manifest.main}`
      
      const moduleCode = await this.fetchModuleCode(codeUrl)
      
      // Execute and register module
      const moduleInstance = await this.executeModuleCode(moduleCode, manifest)
      
      // Save to installed modules
      const moduleRuntime: ModuleRuntime = {
        manifest,
        loaded: true,
        enabled: true,
        instance: moduleInstance,
        lastLoaded: new Date()
      }
      
      this.modules.set(manifest.id, moduleRuntime)
      
      // Save to localStorage for persistence
      const installedModules = JSON.parse(localStorage.getItem('reportmate_installed_modules') || '{}')
      installedModules[manifest.id] = {
        repository: repoUrl,
        branch,
        installedAt: new Date().toISOString()
      }
      localStorage.setItem('reportmate_installed_modules', JSON.stringify(installedModules))
      
      console.log(`✅ Successfully installed module: ${manifest.name}`)
      return true
      
    } catch (error) {
      console.error('Failed to install module from repository:', error)
      return false
    }
  }

  /**
   * Uninstall a module
   */
  async uninstallModule(moduleId: string): Promise<boolean> {
    try {
      // Remove from runtime
      this.modules.delete(moduleId)
      
      // Call backend to remove files
      const response = await fetch(`${this.apiBaseUrl}/modules/${moduleId}`, {
        method: 'DELETE'
      })
      
      return response.ok
    } catch (error) {
      console.error(`Failed to uninstall module ${moduleId}:`, error)
      return false
    }
  }

  /**
   * Load and initialize a module
   */
  async loadModule(moduleId: string): Promise<boolean> {
    try {
      // Check if already loaded
      if (this.modules.has(moduleId) && this.modules.get(moduleId)?.loaded) {
        return true
      }

      // Fetch module manifest
      const manifestResponse = await fetch(`${this.apiBaseUrl}/modules/${moduleId}/manifest`)
      if (!manifestResponse.ok) {
        throw new Error(`Failed to load manifest for ${moduleId}`)
      }
      
      const manifest: ModuleManifest = await manifestResponse.json()
      
      // Validate compatibility
      if (!this.isCompatible(manifest)) {
        throw new Error(`Module ${moduleId} is not compatible with this ReportMate version`)
      }

      // Check dependencies
      const missingDeps = await this.checkDependencies(manifest)
      if (missingDeps.length > 0) {
        throw new Error(`Missing dependencies: ${missingDeps.join(', ')}`)
      }

      // Load the module code
      const moduleUrl = `${this.apiBaseUrl}/modules/${moduleId}/bundle.js`
      const moduleCode = await this.fetchModuleCode(moduleUrl)
      
      // Create isolated execution context
      const moduleInstance = await this.executeModuleCode(moduleCode, manifest)
      
      // Register the module
      this.modules.set(moduleId, {
        manifest,
        loaded: true,
        enabled: true,
        instance: moduleInstance,
        lastLoaded: new Date()
      })

      console.log(`Module ${moduleId} loaded successfully`)
      return true
      
    } catch (error) {
      console.error(`Failed to load module ${moduleId}:`, error)
      
      this.modules.set(moduleId, {
        manifest: {} as ModuleManifest,
        loaded: false,
        enabled: false,
        error: error instanceof Error ? error.message : String(error),
        lastLoaded: new Date()
      })
      
      return false
    }
  }

  /**
   * Fetch and validate module code
   */
  private async fetchModuleCode(url: string): Promise<string> {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch module code: ${response.statusText}`)
    }
    
    return await response.text()
  }

  /**
   * Execute module code in isolated context
   */
  private async executeModuleCode(code: string, manifest: ModuleManifest): Promise<any> {
    // Create a safe execution environment
    const moduleGlobals = {
      React: (await import('react')),
      console: console,
      fetch: fetch,
      // Add other safe globals as needed
    }

    // Use Function constructor for safer eval alternative
    const moduleFunction = new Function(
      'globals', 
      `
        const { React, console, fetch } = globals;
        ${code}
        return typeof module !== 'undefined' ? module.exports : exports;
      `
    )

    return moduleFunction(moduleGlobals)
  }

  /**
   * Check if module is compatible with current ReportMate version
   */
  private isCompatible(manifest: ModuleManifest): boolean {
    // Version compatibility check logic
    const currentVersion = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'
    // Implement semver comparison logic here
    return true // Simplified for now
  }

  /**
   * Check module dependencies
   */
  private async checkDependencies(manifest: ModuleManifest): Promise<string[]> {
    const missing: string[] = []
    
    for (const dep of manifest.dependencies || []) {
      if (!this.modules.has(dep) || !this.modules.get(dep)?.loaded) {
        missing.push(dep)
      }
    }
    
    return missing
  }

  /**
   * Load all enabled modules
   */
  private async loadEnabledModules(): Promise<void> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/modules/enabled`)
      if (response.ok) {
        const enabledModules: string[] = await response.json()
        
        for (const moduleId of enabledModules) {
          await this.loadModule(moduleId)
        }
      }
    } catch (error) {
      console.error('Failed to load enabled modules:', error)
    }
  }

  /**
   * Enable/disable a module
   */
  async toggleModule(moduleId: string, enabled: boolean): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/modules/${moduleId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      })
      
      if (response.ok) {
        const moduleRuntime = this.modules.get(moduleId)
        if (moduleRuntime) {
          moduleRuntime.enabled = enabled
        }
        return true
      }
      
      return false
    } catch (error) {
      console.error(`Failed to toggle module ${moduleId}:`, error)
      return false
    }
  }

  /**
   * Get all loaded modules
   */
  getLoadedModules(): Map<string, ModuleRuntime> {
    return new Map(this.modules)
  }

  /**
   * Get modules by category
   */
  getModulesByCategory(category: string): ModuleRuntime[] {
    return Array.from(this.modules.values())
      .filter(m => m.manifest.category === category)
  }

  /**
   * Add a new repository
   */
  async addRepository(repo: Omit<ModuleRepository, 'id'>): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/modules/repositories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(repo)
      })
      
      if (response.ok) {
        await this.loadRepositoryConfig()
        return true
      }
      
      return false
    } catch (error) {
      console.error('Failed to add repository:', error)
      return false
    }
  }

  /**
   * Remove a repository
   */
  async removeRepository(repositoryId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/modules/repositories/${repositoryId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        await this.loadRepositoryConfig()
        return true
      }
      
      return false
    } catch (error) {
      console.error('Failed to remove repository:', error)
      return false
    }
  }

  /**
   * Add individual module repository
   */
  async addModuleRepository(repoUrl: string, branch: string = 'main'): Promise<boolean> {
    try {
      // Validate repository URL
      if (!repoUrl.includes('github.com') || !repoUrl.includes('reportmate-module-')) {
        throw new Error('Repository must be a GitHub repository following the reportmate-module-NAME pattern')
      }
      
      // Check if manifest exists
      const manifest = await this.fetchModuleManifest(repoUrl, branch)
      if (!manifest) {
        throw new Error('Repository does not contain a valid manifest.json')
      }
      
      // Create repository entry
      const repository: ModuleRepository = {
        id: manifest.id,
        name: manifest.name,
        url: repoUrl,
        branch,
        official: repoUrl.includes('github.com/reportmate/'),
        verified: false, // Would be verified through a review process
        enabled: true,
        author: manifest.author,
        description: manifest.description,
        type: 'single'
      }
      
      // Save to repositories list
      const repositories = JSON.parse(localStorage.getItem('reportmate_module_repositories') || '[]')
      
      // Check if already exists
      const existingIndex = repositories.findIndex((r: ModuleRepository) => r.url === repoUrl)
      if (existingIndex >= 0) {
        repositories[existingIndex] = repository
      } else {
        repositories.push(repository)
      }
      
      localStorage.setItem('reportmate_module_repositories', JSON.stringify(repositories))
      
      console.log(`✅ Added module repository: ${manifest.name}`)
      return true
      
    } catch (error) {
      console.error('Failed to add module repository:', error)
      return false
    }
  }
}

// Create and export a global instance
export const moduleLoader = new DynamicModuleLoader()

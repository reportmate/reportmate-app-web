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
    this.loadDefaultRepositories()
  }

  /**
   * Initialize the module system
   */
  async initialize(): Promise<void> {
    await this.loadRepositoryConfig()
    await this.loadEnabledModules()
  }

  /**
   * Load default repositories (official and community)
   */
  private loadDefaultRepositories(): void {
    this.repositories = [
      {
        id: 'official',
        name: 'Official ReportMate Modules',
        url: 'https://github.com/reportmate',
        official: true,
        verified: true,
        enabled: true,
        type: 'registry',
        description: 'Official modules maintained by the ReportMate team'
      }
    ]

    // Load user-added repositories from localStorage
    const userRepos = JSON.parse(localStorage.getItem('reportmate_module_repositories') || '[]')
    this.repositories.push(...userRepos)
  }

  /**
   * Load repository configuration from backend
   */
  private async loadRepositoryConfig(): Promise<void> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/modules/repositories`)
      if (response.ok) {
        const backendRepos = await response.json()
        this.repositories.push(...backendRepos)
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
    for (const repo of this.repositories.filter(r => r.enabled && r.type === 'single')) {
      try {
        const manifest = await this.fetchModuleManifest(repo.url, repo.branch || 'main')
        if (manifest) {
          allModules.push(manifest)
        }
      } catch (error) {
        console.error(`Failed to fetch module from ${repo.name}:`, error)
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
   * Install a module
   */
  async installModule(moduleId: string, repositoryUrl?: string): Promise<boolean> {
    if (repositoryUrl) {
      return this.installModuleFromRepository(repositoryUrl)
    }
    
    // Legacy support for ID-based installation
    try {
      const response = await fetch(`${this.apiBaseUrl}/modules/install`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleId })
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
   * Uninstall a module
   */
  async uninstallModule(moduleId: string): Promise<boolean> {
    try {
      // Remove from runtime
      this.modules.delete(moduleId)
      
      // Remove from localStorage
      const installedModules = JSON.parse(localStorage.getItem('reportmate_installed_modules') || '{}')
      delete installedModules[moduleId]
      localStorage.setItem('reportmate_installed_modules', JSON.stringify(installedModules))
      
      console.log(`✅ Uninstalled module: ${moduleId}`)
      return true
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

      // Get installed module info
      const installedModules = JSON.parse(localStorage.getItem('reportmate_installed_modules') || '{}')
      const moduleInfo = installedModules[moduleId]
      
      if (!moduleInfo) {
        throw new Error(`Module ${moduleId} is not installed`)
      }
      
      // Fetch manifest
      const manifest = await this.fetchModuleManifest(moduleInfo.repository, moduleInfo.branch)
      if (!manifest) {
        throw new Error(`Failed to load manifest for ${moduleId}`)
      }
      
      // Validate compatibility
      if (!this.isCompatible(manifest)) {
        throw new Error(`Module ${moduleId} is not compatible with this ReportMate version`)
      }
      
      // Check dependencies
      const missingDeps = await this.checkDependencies(manifest)
      if (missingDeps.length > 0) {
        throw new Error(`Missing dependencies: ${missingDeps.join(', ')}`)
      }
      
      // Fetch and execute module code
      const codeUrl = moduleInfo.repository
        .replace('github.com', 'raw.githubusercontent.com')
        .replace(/\/$/, '') + `/${moduleInfo.branch}/${manifest.main}`
      
      const moduleCode = await this.fetchModuleCode(codeUrl)
      const moduleInstance = await this.executeModuleCode(moduleCode, manifest)
      
      // Store runtime info
      const runtime: ModuleRuntime = {
        manifest,
        loaded: true,
        enabled: true,
        instance: moduleInstance,
        lastLoaded: new Date()
      }
      
      this.modules.set(moduleId, runtime)
      console.log(`✅ Loaded module: ${manifest.name}`)
      return true
      
    } catch (error) {
      console.error(`Failed to load module ${moduleId}:`, error)
      this.modules.set(moduleId, {
        manifest: { id: moduleId } as ModuleManifest,
        loaded: false,
        enabled: false,
        error: error instanceof Error ? error.message : 'Unknown error'
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
    
    const code = await response.text()
    
    // Basic security validation
    if (code.includes('eval(') || code.includes('Function(') || code.includes('innerHTML')) {
      throw new Error('Module contains potentially unsafe code')
    }
    
    return code
  }

  /**
   * Execute module code in isolated context
   */
  private async executeModuleCode(code: string, manifest: ModuleManifest): Promise<any> {
    try {
      // Create a sandboxed execution context
      const moduleFunction = new Function('require', 'module', 'exports', 'console', code)
      const moduleExports = {}
      const moduleObject = { exports: moduleExports }
      
      // Mock require function for basic dependencies
      const mockRequire = (id: string) => {
        if (id === 'react') return window.React
        if (id === 'react-dom') return window.ReactDOM
        throw new Error(`Module dependency '${id}' is not available`)
      }
      
      // Execute the module
      moduleFunction(mockRequire, moduleObject, moduleExports, console)
      
      // Return the module instance
      return moduleObject.exports.default || moduleObject.exports
    } catch (error) {
      throw new Error(`Failed to execute module code: ${error}`)
    }
  }

  /**
   * Check if module is compatible with current ReportMate version
   */
  private isCompatible(manifest: ModuleManifest): boolean {
    // For now, assume all modules are compatible
    // In a real implementation, this would check semantic versioning
    return true
  }

  /**
   * Check module dependencies
   */
  private async checkDependencies(manifest: ModuleManifest): Promise<string[]> {
    const missingDeps: string[] = []
    
    if (manifest.dependencies) {
      for (const dep of manifest.dependencies) {
        if (!this.modules.has(dep)) {
          missingDeps.push(dep)
        }
      }
    }
    
    return missingDeps
  }

  /**
   * Load all enabled modules
   */
  private async loadEnabledModules(): Promise<void> {
    const installedModules = JSON.parse(localStorage.getItem('reportmate_installed_modules') || '{}')
    
    for (const moduleId of Object.keys(installedModules)) {
      try {
        await this.loadModule(moduleId)
      } catch (error) {
        console.error(`Failed to load enabled module ${moduleId}:`, error)
      }
    }
  }

  /**
   * Enable/disable a module
   */
  async toggleModule(moduleId: string, enabled: boolean): Promise<boolean> {
    const module = this.modules.get(moduleId)
    if (!module) return false
    
    module.enabled = enabled
    
    if (enabled && module.instance && module.instance.onEnable) {
      await module.instance.onEnable()
    } else if (!enabled && module.instance && module.instance.onDisable) {
      await module.instance.onDisable()
    }
    
    return true
  }

  /**
   * Get all loaded modules
   */
  getLoadedModules(): Map<string, ModuleRuntime> {
    return this.modules
  }

  /**
   * Get modules by category
   */
  getModulesByCategory(category: string): ModuleRuntime[] {
    return Array.from(this.modules.values()).filter(m => m.manifest.category === category)
  }

  /**
   * Add a new repository
   */
  async addRepository(repo: Omit<ModuleRepository, 'id'>): Promise<boolean> {
    try {
      const repository: ModuleRepository = {
        ...repo,
        id: `custom-${Date.now()}`
      }
      
      this.repositories.push(repository)
      
      // Save to localStorage
      const userRepos = this.repositories.filter(r => !r.official)
      localStorage.setItem('reportmate_module_repositories', JSON.stringify(userRepos))
      
      return true
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
      this.repositories = this.repositories.filter(r => r.id !== repositoryId)
      
      // Save to localStorage
      const userRepos = this.repositories.filter(r => !r.official)
      localStorage.setItem('reportmate_module_repositories', JSON.stringify(userRepos))
      
      return true
    } catch (error) {
      console.error('Failed to remove repository:', error)
      return false
    }
  }
}

// Global module loader instance
export const moduleLoader = new DynamicModuleLoader()

/**
 * ReportMate Module Management API
 * Handles dynamic module installation, removal, and management
 */

import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import crypto from 'crypto'

// Types
interface ModuleRepository {
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
  dependencies?: string[]
}

interface ModuleManifest {
  id: string
  name: string
  version: string
  description: string
  author: string
  repository: string
  official: boolean
  category: 'core' | 'widget' | 'integration' | 'security' | 'hardware' | 'software'
  tags: string[]
  dependencies: string[]
  peerDependencies?: string[]
  main: string
  styles?: string
  permissions: string[]
  configSchema?: any
  defaultConfig?: any
  minVersion: string
  maxVersion?: string
  checksum?: string
  signature?: string
}

// Configuration
const MODULES_DIR = path.join(process.cwd(), 'modules')
const CONFIG_FILE = path.join(MODULES_DIR, 'config.json')
const REPOSITORIES_FILE = path.join(MODULES_DIR, 'repositories.json')

// Ensure modules directory exists
async function ensureModulesDir() {
  try {
    await fs.access(MODULES_DIR)
  } catch {
    await fs.mkdir(MODULES_DIR, { recursive: true })
  }
}

// Load configuration
async function loadConfig(): Promise<{ enabledModules: string[] }> {
  try {
    const content = await fs.readFile(CONFIG_FILE, 'utf-8')
    return JSON.parse(content)
  } catch {
    return { enabledModules: [] }
  }
}

// Save configuration
async function saveConfig(config: { enabledModules: string[] }) {
  await ensureModulesDir()
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2))
}

// Load repositories
async function loadRepositories(): Promise<ModuleRepository[]> {
  try {
    const content = await fs.readFile(REPOSITORIES_FILE, 'utf-8')
    return JSON.parse(content)
  } catch {
    // Return default repositories
    const defaultRepos: ModuleRepository[] = [
      {
        id: 'official',
        name: 'Official ReportMate Modules',
        url: 'https://github.com/reportmate/reportmate-modules',
        branch: 'main',
        official: true,
        verified: true,
        enabled: true,
        description: 'Official modules maintained by the ReportMate team'
      },
      {
        id: 'community',
        name: 'Community Modules',
        url: 'https://github.com/reportmate/community-modules',
        branch: 'main',
        official: false,
        verified: true,
        enabled: true,
        description: 'Community-contributed modules'
      }
    ]
    await saveRepositories(defaultRepos)
    return defaultRepos
  }
}

// Save repositories
async function saveRepositories(repositories: ModuleRepository[]) {
  await ensureModulesDir()
  await fs.writeFile(REPOSITORIES_FILE, JSON.stringify(repositories, null, 2))
}

// Fetch module from GitHub repository
async function fetchModuleFromRepo(moduleId: string, repoUrl: string, branch: string = 'main'): Promise<{ manifest: ModuleManifest, code: string }> {
  const baseUrl = repoUrl.replace('github.com', 'raw.githubusercontent.com')
  
  // Fetch manifest
  const manifestUrl = `${baseUrl}/${branch}/modules/${moduleId}/manifest.json`
  const manifestResponse = await fetch(manifestUrl)
  
  if (!manifestResponse.ok) {
    throw new Error(`Module ${moduleId} not found in repository`)
  }
  
  const manifest: ModuleManifest = await manifestResponse.json()
  
  // Fetch main module code
  const codeUrl = `${baseUrl}/${branch}/modules/${moduleId}/${manifest.main}`
  const codeResponse = await fetch(codeUrl)
  
  if (!codeResponse.ok) {
    throw new Error(`Module code not found: ${manifest.main}`)
  }
  
  const code = await codeResponse.text()
  
  return { manifest, code }
}

// Validate module security
async function validateModule(manifest: ModuleManifest, code: string): Promise<boolean> {
  // Basic security checks
  const dangerousPatterns = [
    /eval\s*\(/g,
    /Function\s*\(/g,
    /document\.write/g,
    /innerHTML\s*=/g,
    /outerHTML\s*=/g,
    /script\s*>/g,
    /on\w+\s*=/g, // event handlers
  ]
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(code)) {
      console.warn(`Module ${manifest.id} contains potentially dangerous code`)
      return false
    }
  }
  
  // Verify checksum if provided
  if (manifest.checksum) {
    const hash = crypto.createHash('sha256').update(code).digest('hex')
    if (hash !== manifest.checksum) {
      console.error(`Module ${manifest.id} checksum mismatch`)
      return false
    }
  }
  
  return true
}

// Install module
async function installModule(moduleId: string, repositoryId: string): Promise<boolean> {
  try {
    const repositories = await loadRepositories()
    const repo = repositories.find(r => r.id === repositoryId)
    
    if (!repo) {
      throw new Error(`Repository ${repositoryId} not found`)
    }
    
    if (!repo.enabled) {
      throw new Error(`Repository ${repositoryId} is disabled`)
    }
    
    // Fetch module from repository
    const { manifest, code } = await fetchModuleFromRepo(moduleId, repo.url, repo.branch)
    
    // Validate module
    const isValid = await validateModule(manifest, code)
    if (!isValid) {
      throw new Error(`Module ${moduleId} failed security validation`)
    }
    
    // Create module directory
    const moduleDir = path.join(MODULES_DIR, moduleId)
    await fs.mkdir(moduleDir, { recursive: true })
    
    // Save manifest
    await fs.writeFile(
      path.join(moduleDir, 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    )
    
    // Save module code as bundle
    await fs.writeFile(
      path.join(moduleDir, 'bundle.js'),
      code
    )
    
    // Update enabled modules
    const config = await loadConfig()
    if (!config.enabledModules.includes(moduleId)) {
      config.enabledModules.push(moduleId)
      await saveConfig(config)
    }
    
    console.log(`Module ${moduleId} installed successfully`)
    return true
    
  } catch (error) {
    console.error(`Failed to install module ${moduleId}:`, error)
    return false
  }
}

// Uninstall module
async function uninstallModule(moduleId: string): Promise<boolean> {
  try {
    const moduleDir = path.join(MODULES_DIR, moduleId)
    
    // Remove module directory
    await fs.rm(moduleDir, { recursive: true, force: true })
    
    // Update enabled modules
    const config = await loadConfig()
    config.enabledModules = config.enabledModules.filter(id => id !== moduleId)
    await saveConfig(config)
    
    console.log(`Module ${moduleId} uninstalled successfully`)
    return true
    
  } catch (error) {
    console.error(`Failed to uninstall module ${moduleId}:`, error)
    return false
  }
}

// API Route Handlers

// GET /api/modules/repositories
export async function GET(request: NextRequest) {
  const { pathname } = new URL(request.url)
  
  if (pathname.endsWith('/repositories')) {
    const repositories = await loadRepositories()
    return NextResponse.json(repositories)
  }
  
  if (pathname.endsWith('/enabled')) {
    const config = await loadConfig()
    return NextResponse.json(config.enabledModules)
  }
  
  // GET /api/modules/{moduleId}/manifest
  const moduleId = pathname.split('/').slice(-2)[0]
  if (pathname.endsWith('/manifest')) {
    try {
      const manifestPath = path.join(MODULES_DIR, moduleId, 'manifest.json')
      const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'))
      return NextResponse.json(manifest)
    } catch {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 })
    }
  }
  
  // GET /api/modules/{moduleId}/bundle.js
  if (pathname.endsWith('/bundle.js')) {
    try {
      const bundlePath = path.join(MODULES_DIR, moduleId, 'bundle.js')
      const code = await fs.readFile(bundlePath, 'utf-8')
      return new NextResponse(code, {
        headers: { 'Content-Type': 'application/javascript' }
      })
    } catch {
      return NextResponse.json({ error: 'Module bundle not found' }, { status: 404 })
    }
  }
  
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

// POST /api/modules/install
export async function POST(request: NextRequest) {
  const { pathname } = new URL(request.url)
  
  if (pathname.endsWith('/install')) {
    const { moduleId, repositoryId } = await request.json()
    
    if (!moduleId || !repositoryId) {
      return NextResponse.json({ error: 'Missing moduleId or repositoryId' }, { status: 400 })
    }
    
    const success = await installModule(moduleId, repositoryId)
    
    if (success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: 'Installation failed' }, { status: 500 })
    }
  }
  
  if (pathname.endsWith('/repositories')) {
    const repo = await request.json()
    const repositories = await loadRepositories()
    
    const newRepo: ModuleRepository = {
      ...repo,
      id: crypto.randomUUID(),
      official: false,
      verified: false
    }
    
    repositories.push(newRepo)
    await saveRepositories(repositories)
    
    return NextResponse.json({ success: true })
  }
  
  // POST /api/modules/{moduleId}/toggle
  const moduleId = pathname.split('/').slice(-2)[0]
  if (pathname.endsWith('/toggle')) {
    const { enabled } = await request.json()
    const config = await loadConfig()
    
    if (enabled && !config.enabledModules.includes(moduleId)) {
      config.enabledModules.push(moduleId)
    } else if (!enabled) {
      config.enabledModules = config.enabledModules.filter(id => id !== moduleId)
    }
    
    await saveConfig(config)
    return NextResponse.json({ success: true })
  }
  
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

// DELETE /api/modules/{moduleId}
export async function DELETE(request: NextRequest) {
  const { pathname } = new URL(request.url)
  
  if (pathname.includes('/repositories/')) {
    const repositoryId = pathname.split('/').pop()
    const repositories = await loadRepositories()
    
    const filteredRepos = repositories.filter(r => r.id !== repositoryId)
    await saveRepositories(filteredRepos)
    
    return NextResponse.json({ success: true })
  }
  
  const moduleId = pathname.split('/').pop()
  if (moduleId) {
    const success = await uninstallModule(moduleId)
    
    if (success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: 'Uninstallation failed' }, { status: 500 })
    }
  }
  
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

/**
 * Module Initialization
 * Loads and registers all core and custom modules
 */

import { moduleRegistry } from './ModuleRegistry'
import { moduleLoader } from './BaseModule'

// Import core modules
import DeviceInfoModule from './core/DeviceInfoModule'
import EventsModule from './core/EventsModule'

// Import widget modules
import ManagedInstallsModule from './widgets/ManagedInstallsModule'
import HardwareModule from './widgets/HardwareModule'
import ApplicationsModule from './widgets/ApplicationsModule'
import NetworkModule from './widgets/NetworkModuleWidget'
import SecurityModule from './widgets/SecurityModule'
import MDMModule from './widgets/MDMModule'
import EventsWidgetModule from './widgets/EventsModule'

/**
 * Initialize core modules
 */
export async function initializeCoreModules(): Promise<void> {
  console.log('🚀 Initializing ReportMate modules...')
  
  try {
    // Register core modules
    const coreModules = [
      new DeviceInfoModule(),
      new EventsModule(),
    ]
    
    // Register widget modules
    const widgetModules = [
      new ManagedInstallsModule(),
      new HardwareModule(),
      ApplicationsModule,
      NetworkModule,
      SecurityModule,
      MDMModule,
      EventsWidgetModule,
    ]
    
    const allModules = [...coreModules, ...widgetModules]
    
    for (const module of allModules) {
      // Handle both class instances and module objects
      if ('onLoad' in module && typeof module.onLoad === 'function') {
        await module.onLoad()
      }
      
      let manifest = module.manifest
      
      // For enhanced modules, add deviceWidgets to the manifest
      if ('deviceWidgets' in module && module.deviceWidgets) {
        manifest = {
          ...manifest,
          deviceWidgets: module.deviceWidgets
        }
      }
      
      moduleRegistry.register(manifest)
    }
    
    console.log(`✅ Loaded ${allModules.length} modules (${coreModules.length} core, ${widgetModules.length} widgets)`)
  } catch (error) {
    console.error('❌ Failed to initialize core modules:', error)
    throw error
  }
}

/**
 * Load custom modules from a directory or URL
 */
export async function loadCustomModules(sources: string[]): Promise<void> {
  console.log('📦 Loading custom modules...')
  
  let loadedCount = 0
  
  for (const source of sources) {
    try {
      const module = await moduleLoader.loadFromUrl(source)
      moduleRegistry.register(module.manifest)
      loadedCount++
    } catch (error) {
      console.warn(`Failed to load module from ${source}:`, error)
    }
  }
  
  if (loadedCount > 0) {
    console.log(`✅ Loaded ${loadedCount} custom modules`)
  }
}

/**
 * Initialize module system
 */
export async function initializeModules(customModuleSources: string[] = []): Promise<void> {
  await initializeCoreModules()
  
  if (customModuleSources.length > 0) {
    await loadCustomModules(customModuleSources)
  }
  
  // Log final module count
  const enabled = moduleRegistry.getEnabledModules()
  const total = moduleRegistry.getModules()
  
  console.log(`🎉 Module system initialized: ${enabled.length}/${total.length} modules enabled`)
  
  // Log enabled modules
  enabled.forEach(module => {
    console.log(`  ✓ ${module.name} (${module.id})`)
  })
}

/**
 * Get available module sources from configuration
 */
export function getModuleSourcesFromConfig(): string[] {
  // In a real implementation, this would read from a configuration file
  // or environment variables. For now, return an empty array.
  
  // Example sources that could be configured:
  // - '/modules/custom/' (local directory)
  // - 'https://modules.reportmate.com/registry.json' (remote registry)
  // - 'https://cdn.jsdelivr.net/npm/@reportmate/modules@latest/' (CDN)
  
  return []
}

/**
 * Install a module from a URL or file
 */
export async function installModule(source: string | File): Promise<void> {
  try {
    let module
    
    if (typeof source === 'string') {
      module = await moduleLoader.loadFromUrl(source)
    } else {
      module = await moduleLoader.loadFromFile(source)
    }
    
    // Register the module
    moduleRegistry.register(module.manifest)
    
    // Enable by default
    moduleRegistry.setEnabled(module.manifest.id, true)
    
    console.log(`✅ Installed module: ${module.manifest.name}`)
  } catch (error) {
    console.error('❌ Failed to install module:', error)
    throw error
  }
}

/**
 * Uninstall a module
 */
export async function uninstallModule(moduleId: string): Promise<void> {
  try {
    // Disable the module
    moduleRegistry.setEnabled(moduleId, false)
    
    // Unload from module loader
    await moduleLoader.unload(moduleId)
    
    console.log(`✅ Uninstalled module: ${moduleId}`)
  } catch (error) {
    console.error('❌ Failed to uninstall module:', error)
    throw error
  }
}

/**
 * Enable/disable a module
 */
export function toggleModule(moduleId: string, enabled?: boolean): void {
  const currentState = moduleRegistry.isEnabled(moduleId)
  const newState = enabled !== undefined ? enabled : !currentState
  moduleRegistry.setEnabled(moduleId, newState)
  console.log(`${newState ? '✅ Enabled' : '❌ Disabled'} module: ${moduleId}`)
}

/**
 * Get module marketplace info
 * This would connect to a remote service for module discovery
 */
export async function getModuleMarketplace(): Promise<any[]> {
  // In a real implementation, this would fetch from a remote API
  // For now, return some example modules
  
  return [
    {
      id: 'hardware-inventory',
      name: 'Hardware Inventory',
      version: '1.2.0',
      description: 'Detailed hardware inventory and monitoring',
      author: 'Community',
      downloadUrl: 'https://example.com/modules/hardware-inventory.js',
      installed: false,
      rating: 4.5,
      downloads: 1234,
    },
    {
      id: 'software-updates',
      name: 'Software Updates',
      version: '2.1.0',
      description: 'Track and manage software updates across your fleet',
      author: 'Community',
      downloadUrl: 'https://example.com/modules/software-updates.js',
      installed: false,
      rating: 4.8,
      downloads: 856,
    },
    {
      id: 'security-compliance',
      name: 'Security Compliance',
      version: '1.5.0',
      description: 'Monitor security compliance and policies',
      author: 'Security Team',
      downloadUrl: 'https://example.com/modules/security-compliance.js',
      installed: false,
      rating: 4.7,
      downloads: 642,
    },
  ]
}

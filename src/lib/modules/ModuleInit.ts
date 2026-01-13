/**
 * Module Initialization
 * Loads and registers all core and custom modules
 */

import { moduleRegistry } from './ModuleRegistry'
import { moduleLoader } from './BaseModule'

/**
 * Map ExtendedModuleManifest category to ModuleManifest category
 */
function mapExtendedCategory(category?: string): 'core' | 'widget' | 'integration' | 'security' | 'hardware' | 'software' | undefined {
  switch (category) {
    case 'device':
    case 'dashboard':
    case 'reporting':
      return 'widget'
    case 'integration':
      return 'integration'
    case 'security':
      return 'security'
    case 'core':
      return 'core'
    default:
      return 'widget'
  }
}

// Import core modules
import DeviceInfoModule from './core/DeviceInfoModule'
import EventsModule from './core/EventsModule'
import PeripheralsModule from './core/PeripheralsModule'

// Import widget modules
import ManagedInstallsModule from './widgets/ManagedInstallsModule'
import InstallsModule from './widgets/InstallsModule'
import HardwareModule from './widgets/HardwareModule'
import ApplicationsModule from './widgets/ApplicationsModule'
import NetworkModule from './widgets/NetworkModuleWidget'
import SecurityModule from './widgets/SecurityModule'
import ManagementModule from './widgets/ManagementModule'
import EventsWidgetModule from './widgets/EventsModule'

/**
 * Initialize core modules
 */
export async function initializeCoreModules(): Promise<void> {
  try {
    // Register core modules
    const coreModules = [
      new DeviceInfoModule(),
      new EventsModule(),
      new PeripheralsModule(),
    ]
    
    // Register widget modules
    const widgetModules = [
      new ManagedInstallsModule(),
      new InstallsModule(),
      new HardwareModule(),
      ApplicationsModule,
      NetworkModule,
      SecurityModule,
      ManagementModule,
      EventsWidgetModule,
    ]
    
    const allModules = [...coreModules, ...widgetModules]
    
    for (const moduleInstance of allModules) {
      // Handle both class instances and module objects
      if ('onLoad' in moduleInstance && typeof moduleInstance.onLoad === 'function') {
        await moduleInstance.onLoad()
      }
      
      // Register the manifest, casting to handle type compatibility
      moduleRegistry.register(moduleInstance.manifest as any)
    }
    
    `)
  } catch (error) {
    console.error('Failed to initialize core modules:', error)
    throw error
  }
}

/**
 * Load custom modules from a directory or URL
 */
export async function loadCustomModules(sources: string[]): Promise<void> {
  let loadedCount = 0
  
  for (const source of sources) {
    try {
      const moduleInstance = await moduleLoader.loadFromUrl(source)
      moduleRegistry.register(moduleInstance.manifest)
      loadedCount++
    } catch (error) {
      console.warn(`Failed to load module from ${source}:`, error)
    }
  }
  
  if (loadedCount > 0) {
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
  
  // Log enabled modules
  enabled.forEach(moduleManifest => {
    `)
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
    let moduleInstance
    
    if (typeof source === 'string') {
      moduleInstance = await moduleLoader.loadFromUrl(source)
    } else {
      moduleInstance = await moduleLoader.loadFromFile(source)
    }
    
    // Register the module
    moduleRegistry.register(moduleInstance.manifest)
    
    // Enable by default
    moduleRegistry.setEnabled(moduleInstance.manifest.id, true)
    
    } catch (error) {
    console.error('Failed to install module:', error)
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
    
    } catch (error) {
    console.error('Failed to uninstall module:', error)
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
      description: 'Track and manage software updates across fleet',
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

/**
 * ReportMate Module Registry
 * Inspired by MunkiReport's modular architecture
 */

import React from 'react'

export interface ModuleManifest {
  id: string
  name: string
  version: string
  description?: string
  author?: string
  enabled: boolean
  dependencies?: string[]
  
  // Module metadata
  official?: boolean
  repository?: string
  category?: 'core' | 'widget' | 'integration' | 'security' | 'hardware' | 'software'
  tags?: string[]
  
  // Entry points
  main?: string  // JavaScript entry point
  styles?: string  // CSS entry point
  
  // Permissions required
  permissions?: string[]
  
  // Configuration schema
  configSchema?: any
  defaultConfig?: any
  
  // Compatibility
  minVersion?: string  // Minimum ReportMate version
  maxVersion?: string
  
  // UI Components
  dashboardWidgets?: DashboardWidget[]
  deviceTabs?: DeviceTab[]
  deviceWidgets?: DeviceWidget[]
  routes?: ModuleRoute[]
  
  // Data Providers
  dataProviders?: DataProvider[]
  
  // Event Processors
  eventProcessors?: EventProcessor[]
}

/**
 * Device widgets - smaller, more focused components
 */
export interface DeviceWidget {
  id: string
  name: string
  description?: string
  component: React.ComponentType<DeviceWidgetProps>
  category: 'overview' | 'hardware' | 'software' | 'security' | 'network' | 'custom'
  size: 'small' | 'medium' | 'large' | 'full'
  order?: number
  permissions?: string[]
  conditions?: WidgetCondition[]
  refreshInterval?: number
  supportsExport?: boolean
  supportsPrint?: boolean
  configurable?: boolean
}

export interface DeviceWidgetProps {
  deviceId: string
  device?: any
  config?: any
  onConfigChange?: (config: any) => void
  isExpanded?: boolean
  onToggleExpand?: () => void
}

export interface DashboardWidget {
  id: string
  name: string
  component: React.ComponentType<any>
  defaultProps?: Record<string, any>
  size?: 'small' | 'medium' | 'large' | 'full'
  order?: number
  conditions?: WidgetCondition[]
}

export interface DeviceTab {
  id: string
  name: string
  icon: string
  component: React.ComponentType<{ deviceId: string }>
  order?: number
  conditions?: TabCondition[]
}

export interface ModuleRoute {
  path: string
  component: React.ComponentType<any>
  exact?: boolean
}

export interface DataProvider {
  id: string
  endpoint: string
  processor: (data: any) => any
  interval?: number // for polling
}

export interface EventProcessor {
  id: string
  eventTypes: string[]
  processor: (event: any) => any
}

export interface WidgetCondition {
  type: 'device_os' | 'device_type' | 'has_data' | 'user_permission' | 'device_count' | 'user_role' | 'custom'
  field?: string
  operator: 'eq' | 'neq' | 'contains' | 'not_contains' | 'gt' | 'lt' | 'exists' | 'not_exists'
  value: any
  customCheck?: (device: any, user?: any) => boolean
}

export interface TabCondition {
  type: 'device_os' | 'device_type' | 'user_role' | 'custom'
  value: any
  operator: 'eq' | 'contains' | 'matches'
}

class ModuleRegistry {
  private modules: Map<string, ModuleManifest> = new Map()
  private enabledModules: Set<string> = new Set()
  
  constructor() {
    this.loadEnabledModules()
  }
  
  /**
   * Register a module
   */
  register(module: ModuleManifest): void {
    // Validate dependencies
    if (module.dependencies) {
      const missingDeps = module.dependencies.filter(dep => !this.modules.has(dep))
      if (missingDeps.length > 0) {
        throw new Error(`Module ${module.id} has missing dependencies: ${missingDeps.join(', ')}`)
      }
    }
    
    this.modules.set(module.id, module)
    
    if (module.enabled) {
      this.enabledModules.add(module.id)
    }
    
    console.log(`📦 Module registered: ${module.name} (${module.id})`)
  }
  
  /**
   * Get all registered modules
   */
  getModules(): ModuleManifest[] {
    return Array.from(this.modules.values())
  }
  
  /**
   * Get enabled modules only
   */
  getEnabledModules(): ModuleManifest[] {
    return Array.from(this.modules.values()).filter(m => this.enabledModules.has(m.id))
  }
  
  /**
   * Get module by ID
   */
  getModule(id: string): ModuleManifest | undefined {
    return this.modules.get(id)
  }
  
  /**
   * Check if module is enabled
   */
  isEnabled(id: string): boolean {
    return this.enabledModules.has(id)
  }
  
  /**
   * Enable/disable module
   */
  setEnabled(id: string, enabled: boolean): void {
    if (enabled) {
      this.enabledModules.add(id)
    } else {
      this.enabledModules.delete(id)
    }
    this.saveEnabledModules()
  }
  
  /**
   * Get all dashboard widgets from enabled modules
   */
  getDashboardWidgets(): DashboardWidget[] {
    const widgets: DashboardWidget[] = []
    
    for (const module of this.getEnabledModules()) {
      if (module.dashboardWidgets) {
        widgets.push(...module.dashboardWidgets)
      }
    }
    
    // Sort by order
    return widgets.sort((a, b) => (a.order || 999) - (b.order || 999))
  }
  
  /**
   * Get all device tabs from enabled modules
   */
  getDeviceTabs(): DeviceTab[] {
    const tabs: DeviceTab[] = []
    
    for (const module of this.getEnabledModules()) {
      if (module.deviceTabs) {
        tabs.push(...module.deviceTabs)
      }
    }
    
    // Sort by order
    return tabs.sort((a, b) => (a.order || 999) - (b.order || 999))
  }
  
  /**
   * Get all device widgets from enabled modules
   */
  getDeviceWidgets(): DeviceWidget[] {
    const widgets: DeviceWidget[] = []
    
    for (const module of this.getEnabledModules()) {
      if (module.deviceWidgets) {
        widgets.push(...module.deviceWidgets)
      }
    }
    
    // Sort by order
    return widgets.sort((a, b) => (a.order || 999) - (b.order || 999))
  }
  
  /**
   * Get data providers from enabled modules
   */
  getDataProviders(): DataProvider[] {
    const providers: DataProvider[] = []
    
    for (const module of this.getEnabledModules()) {
      if (module.dataProviders) {
        providers.push(...module.dataProviders)
      }
    }
    
    return providers
  }
  
  /**
   * Get event processors from enabled modules
   */
  getEventProcessors(): EventProcessor[] {
    const processors: EventProcessor[] = []
    
    for (const module of this.getEnabledModules()) {
      if (module.eventProcessors) {
        processors.push(...module.eventProcessors)
      }
    }
    
    return processors
  }
  
  /**
   * Load enabled modules from localStorage
   */
  private loadEnabledModules(): void {
    if (typeof window === 'undefined') {
      return
    }
    try {
      const stored = localStorage.getItem('reportmate_enabled_modules')
      if (stored) {
        const enabled = JSON.parse(stored)
        this.enabledModules = new Set(enabled)
      }
    } catch (error) {
      console.error('Failed to load enabled modules:', error)
    }
  }
  
  /**
   * Save enabled modules to localStorage
   */
  private saveEnabledModules(): void {
    if (typeof window === 'undefined') {
      return
    }
    try {
      const enabled = Array.from(this.enabledModules)
      localStorage.setItem('reportmate_enabled_modules', JSON.stringify(enabled))
    } catch (error) {
      console.error('Failed to save enabled modules:', error)
    }
  }
}

// Global module registry instance
export const moduleRegistry = new ModuleRegistry()

// Helper hook for React components
export function useModules() {
  return {
    registry: moduleRegistry,
    modules: moduleRegistry.getModules(),
    enabledModules: moduleRegistry.getEnabledModules(),
    dashboardWidgets: moduleRegistry.getDashboardWidgets(),
    deviceTabs: moduleRegistry.getDeviceTabs(),
    deviceWidgets: moduleRegistry.getDeviceWidgets(),
    dataProviders: moduleRegistry.getDataProviders(),
    eventProcessors: moduleRegistry.getEventProcessors(),
  }
}

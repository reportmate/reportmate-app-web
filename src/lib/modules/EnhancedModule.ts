/**
 * Enhanced Module System for ReportMate
 * 
 * This extends the existing module system to support:
 * - Modular data widgets/components
 * - Configurable layouts
 * - Theme/styling support
 * - Advanced dependency management
 * - Module settings/configuration UI
 */

import { ModuleManifest } from './ModuleRegistry'

/**
 * Extended Module Manifest with additional capabilities
 */
export interface ExtendedModuleManifest extends ModuleManifest {
  // Module metadata
  category?: 'core' | 'device' | 'dashboard' | 'security' | 'reporting' | 'integration'
  tags?: string[]
  license?: string
  homepage?: string
  repository?: string
  
  // Assets and dependencies
  stylesheets?: string[]
  scripts?: string[]
  requiredPermissions?: string[]
  
  // Configuration schema
  configSchema?: ModuleConfigSchema
  
  // Module lifecycle hooks
  hooks?: ModuleHooks
  
  // Data model extensions
  dataModels?: DataModel[]
  
  // API endpoints this module provides
  apiEndpoints?: APIEndpoint[]
  
  // Device detail widgets (more granular than tabs)
  deviceWidgets?: DeviceWidget[]
  
  // Settings pages
  settingsPages?: SettingsPage[]
}

/**
 * Configuration schema for module settings
 */
export interface ModuleConfigSchema {
  title: string
  description?: string
  properties: Record<string, ConfigProperty>
  required?: string[]
}

export interface ConfigProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'select'
  title: string
  description?: string
  default?: any
  options?: Array<{ label: string; value: any }>
  validation?: {
    min?: number
    max?: number
    pattern?: string
    required?: boolean
  }
}

/**
 * Module lifecycle hooks
 */
export interface ModuleHooks {
  onInstall?: () => Promise<void>
  onUninstall?: () => Promise<void>
  onUpdate?: (oldVersion: string, newVersion: string) => Promise<void>
  onDeviceConnect?: (deviceId: string) => Promise<void>
  onDeviceDisconnect?: (deviceId: string) => Promise<void>
  onDataReceived?: (deviceId: string, dataType: string, data: any) => Promise<void>
}

/**
 * Data model extensions that modules can register
 */
export interface DataModel {
  name: string
  schema: Record<string, any>
  tableName?: string
  relationships?: Array<{
    type: 'hasOne' | 'hasMany' | 'belongsTo'
    model: string
    foreignKey?: string
  }>
}

/**
 * API endpoints that modules can register
 */
export interface APIEndpoint {
  path: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  handler: (req: any, res: any) => Promise<any>
  middleware?: string[]
  permissions?: string[]
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

/**
 * Settings pages that modules can contribute
 */
export interface SettingsPage {
  id: string
  name: string
  icon?: string
  component: React.ComponentType<SettingsPageProps>
  category: 'general' | 'security' | 'integrations' | 'advanced'
  order?: number
  permissions?: string[]
}

export interface SettingsPageProps {
  config: any
  onConfigChange: (config: any) => void
  onSave: () => Promise<void>
}

/**
 * Widget condition types
 */
export interface WidgetCondition {
  type: 'device_os' | 'device_type' | 'has_data' | 'user_permission' | 'device_count' | 'user_role' | 'custom'
  field?: string
  operator: 'eq' | 'neq' | 'contains' | 'not_contains' | 'gt' | 'lt' | 'exists' | 'not_exists'
  value: any
  customCheck?: (device: any, user?: any) => boolean
}

/**
 * Enhanced Base Module with additional capabilities
 */
export abstract class EnhancedBaseModule {
  abstract readonly manifest: ExtendedModuleManifest
  
  // Lifecycle methods
  async onInstall(): Promise<void> {}
  async onUninstall(): Promise<void> {}
  async onLoad(): Promise<void> {}
  async onUnload(): Promise<void> {}
  async onEnable(): Promise<void> {}
  async onDisable(): Promise<void> {}
  async onConfigChange(config: any): Promise<void> {}
  
  // Configuration methods
  getConfig<T = any>(): T {
    if (typeof window === 'undefined') {
      return this.getDefaultConfig()
    }
    const stored = localStorage.getItem(`reportmate_module_config_${this.manifest.id}`)
    return stored ? JSON.parse(stored) : this.getDefaultConfig()
  }
  
  setConfig<T = any>(config: T): void {
    if (typeof window === 'undefined') {
      return
    }
    localStorage.setItem(`reportmate_module_config_${this.manifest.id}`, JSON.stringify(config))
    this.onConfigChange(config)
  }
  
  getDefaultConfig(): any {
    const defaults: any = {}
    if (this.manifest.configSchema?.properties) {
      Object.entries(this.manifest.configSchema.properties).forEach(([key, prop]) => {
        if (prop.default !== undefined) {
          defaults[key] = prop.default
        }
      })
    }
    return defaults
  }
  
  // Utility methods
  log(level: 'info' | 'warn' | 'error', message: string, ...args: any[]): void {
    const prefix = `[${this.manifest.name}]`
    console[level](prefix, message, ...args)
  }
  
  // Data access helpers
  async fetchDeviceData(deviceId: string, endpoint: string): Promise<any> {
    const response = await fetch(`/api/device/${deviceId}/${endpoint}`)
    if (!response.ok) throw new Error(`Failed to fetch ${endpoint} for device ${deviceId}`)
    return response.json()
  }
  
  async postData(endpoint: string, data: any): Promise<any> {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error(`Failed to post to ${endpoint}`)
    return response.json()
  }
  
  // Event system
  emit(eventName: string, data: any): void {
    window.dispatchEvent(new CustomEvent(`module:${this.manifest.id}:${eventName}`, { detail: data }))
  }
  
  on(eventName: string, handler: (data: any) => void): () => void {
    const listener = (event: CustomEvent) => handler(event.detail)
    window.addEventListener(`module:${this.manifest.id}:${eventName}`, listener as EventListener)
    return () => window.removeEventListener(`module:${this.manifest.id}:${eventName}`, listener as EventListener)
  }
}

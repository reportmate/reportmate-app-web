/**
 * Base Module Class
 * All modules should extend this class
 */

import { ModuleManifest } from './ModuleRegistry'

export abstract class BaseModule {
  abstract readonly manifest: ModuleManifest
  
  /**
   * Called when module is loaded
   */
  async onLoad(): Promise<void> {
    // Override in child classes
  }
  
  /**
   * Called when module is unloaded
   */
  async onUnload(): Promise<void> {
    // Override in child classes
  }
  
  /**
   * Called when module is enabled
   */
  async onEnable(): Promise<void> {
    // Override in child classes
  }
  
  /**
   * Called when module is disabled
   */
  async onDisable(): Promise<void> {
    // Override in child classes
  }
  
  /**
   * Get module configuration
   */
  getConfig<T = any>(): T {
    if (typeof window === 'undefined') {
      return {} as T
    }
    const stored = localStorage.getItem(`reportmate_module_config_${this.manifest.id}`)
    return stored ? JSON.parse(stored) : ({} as T)
  }
  
  /**
   * Set module configuration
   */
  setConfig<T = any>(config: T): void {
    if (typeof window === 'undefined') {
      return
    }
    localStorage.setItem(`reportmate_module_config_${this.manifest.id}`, JSON.stringify(config))
  }
  
  /**
   * Log with module prefix
   */
  log(level: 'info' | 'warn' | 'error', message: string, ...args: any[]): void {
    const prefix = `[${this.manifest.name}]`
    console[level](prefix, message, ...args)
  }
}

/**
 * Module Loader
 * Dynamically loads modules from different sources
 */
export class ModuleLoader {
  private loadedModules: Map<string, BaseModule> = new Map()
  
  /**
   * Load module from URL
   */
  async loadFromUrl(url: string): Promise<BaseModule> {
    try {
      // Dynamic import with proper typing to reduce webpack warnings
      const module = await import(/* webpackChunkName: "dynamic-module" */ url)
      const ModuleClass = module.default || module.Module
      
      if (!ModuleClass) {
        throw new Error(`No default export found in module: ${url}`)
      }
      
      const instance = new ModuleClass()
      
      if (!(instance instanceof BaseModule)) {
        throw new Error(`Module must extend BaseModule: ${url}`)
      }
      
      await instance.onLoad()
      this.loadedModules.set(instance.manifest.id, instance)
      
      return instance
    } catch (error) {
      console.error(`Failed to load module from ${url}:`, error)
      throw error
    }
  }
  
  /**
   * Load module from file
   */
  async loadFromFile(file: File): Promise<BaseModule> {
    const url = URL.createObjectURL(file)
    try {
      return await this.loadFromUrl(url)
    } finally {
      URL.revokeObjectURL(url)
    }
  }
  
  /**
   * Unload module
   */
  async unload(moduleId: string): Promise<void> {
    const module = this.loadedModules.get(moduleId)
    if (module) {
      await module.onUnload()
      this.loadedModules.delete(moduleId)
    }
  }
  
  /**
   * Get loaded module
   */
  getModule(moduleId: string): BaseModule | undefined {
    return this.loadedModules.get(moduleId)
  }
  
  /**
   * Get all loaded modules
   */
  getLoadedModules(): BaseModule[] {
    return Array.from(this.loadedModules.values())
  }
}

// Global module loader instance
export const moduleLoader = new ModuleLoader()

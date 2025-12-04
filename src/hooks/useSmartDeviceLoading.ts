import { useState, useEffect, useCallback, useRef } from 'react'
import { mapDeviceData } from '../lib/data-processing/device-mapper-modular'

/**
 * Smart Device Loading Hook - V2
 * 
 * Strategy:
 * 1. Load InfoTab modules FIRST (inventory, system, hardware, management, security, network)
 * 2. Load remaining modules in PARALLEL in background
 * 3. No artificial delays - let the network be the bottleneck
 * 4. Properly process all data through mapDeviceData()
 * 
 * This gives instant InfoTab while loading the rest efficiently.
 */

export type ModuleLoadState = 'unloaded' | 'loading' | 'loaded' | 'error'

export interface ModuleStatus {
  state: ModuleLoadState
  data: any | null
  error: string | null
  loadedAt?: Date
}

const BACKGROUND_MODULES: string[] = ['events', 'installs', 'profiles', 'applications', 'displays', 'printers']

export function useSmartDeviceLoading(deviceId: string) {
  // Device info (processed and ready for InfoTab)
  const [deviceInfo, setDeviceInfo] = useState<any>(null)
  const [infoLoading, setInfoLoading] = useState(true)
  const [infoError, setInfoError] = useState<string | null>(null)
  
  // Module loading states
  const [moduleStates, setModuleStates] = useState<Record<string, ModuleStatus>>({})
  const [allModulesLoaded, setAllModulesLoaded] = useState(false)
  const moduleStatesRef = useRef<Record<string, ModuleStatus>>({})
  
  useEffect(() => {
    moduleStatesRef.current = moduleStates
  }, [moduleStates])
  
  /**
   * Load InfoTab data - FAST
   */
  useEffect(() => {
    let cancelled = false
    
    const loadInfoData = async () => {
      if (cancelled) return
      
      setInfoLoading(true)
      setInfoError(null)
      
      try {
        const response = await fetch(`/api/device/${encodeURIComponent(deviceId)}/info`)
        
        if (cancelled) return
        
        if (!response.ok) {
          throw new Error(response.status === 404 ? 'Device not found' : 'Failed to load device')
        }
        
        const result = await response.json()
        
        if (cancelled) return
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to load device info')
        }
        
        // Process through mapDeviceData to ensure proper structure
        const processed = mapDeviceData(result.device)
        
        setDeviceInfo(processed)
        
        // Mark info modules as loaded
        if (result.device?.modules) {
          const loadedModules = Object.keys(result.device.modules)
          const newStates: Record<string, ModuleStatus> = {}
          
          loadedModules.forEach(moduleName => {
            newStates[moduleName] = {
              state: 'loaded',
              data: result.device.modules[moduleName],
              error: null,
              loadedAt: new Date()
            }
          })
          
          setModuleStates(newStates)
        }
        
        setInfoLoading(false)
        
      } catch (error) {
        if (cancelled) return
        console.error(`[SMART LOAD] ❌ Error loading InfoTab:`, error)
        setInfoError(error instanceof Error ? error.message : String(error))
        setInfoLoading(false)
      }
    }
    
    if (deviceId) {
      loadInfoData()
    }
    
    return () => {
      cancelled = true
    }
  }, [deviceId])
  
  /**
   * Load remaining modules in PARALLEL once InfoTab is ready
   */
  useEffect(() => {
    if (!deviceInfo || infoLoading || allModulesLoaded) return
    
    let cancelled = false
    
    const loadBackgroundModules = async () => {
      // Load ALL remaining modules at once (browser will handle parallelization)
      const promises = BACKGROUND_MODULES.map(async (moduleName) => {
        // Skip if already loaded
        if (moduleStatesRef.current[moduleName]?.state === 'loaded') {
          return
        }
        
        // Mark as loading
        setModuleStates(prev => ({
          ...prev,
          [moduleName]: { state: 'loading', data: null, error: null }
        }))
        
        try {
          const response = await fetch(`/api/device/${encodeURIComponent(deviceId)}/modules/${moduleName}`)
          
          if (cancelled) return
          
          if (!response.ok) {
            if (response.status === 404) {
              // Module doesn't exist for this device - that's OK
              setModuleStates(prev => ({
                ...prev,
                [moduleName]: { state: 'loaded', data: null, error: null, loadedAt: new Date() }
              }))
              return
            }
            throw new Error(`HTTP ${response.status}`)
          }
          
          const result = await response.json()
          
          if (cancelled) return
          
          if (result.success) {
            setModuleStates(prev => ({
              ...prev,
              [moduleName]: {
                state: 'loaded',
                data: result.data,
                error: null,
                loadedAt: new Date()
              }
            }))
            
            // Update deviceInfo with new module data
            setDeviceInfo((prev: any) => {
              if (!prev) return prev
              return {
                ...prev,
                modules: {
                  ...prev.modules,
                  [moduleName]: result.data
                }
              }
            })
          } else {
            throw new Error(result.error || 'Failed to load module')
          }
          
        } catch (error) {
          if (cancelled) return
          console.error(`[SMART LOAD] ❌ Error loading ${moduleName}:`, error)
          
          setModuleStates(prev => ({
            ...prev,
            [moduleName]: {
              state: 'error',
              data: null,
              error: error instanceof Error ? error.message : String(error)
            }
          }))
        }
      })
      
      // Wait for all to complete
      await Promise.allSettled(promises)
      
      if (!cancelled) {
        setAllModulesLoaded(true)
      }
    }
    
    loadBackgroundModules()
    
    return () => {
      cancelled = true
    }
  }, [deviceInfo, infoLoading, deviceId, allModulesLoaded])
  
  /**
   * On-demand module loading (if user clicks tab before background load completes)
   */
  const requestModule = useCallback(async (moduleName: string) => {
    // If already loaded, return data from ref (always current)
    if (moduleStatesRef.current[moduleName]?.state === 'loaded') {
      return moduleStatesRef.current[moduleName].data
    }
    
    // If currently loading, just return null - the background load will update state
    // No polling needed - React will re-render when moduleStates changes
    if (moduleStatesRef.current[moduleName]?.state === 'loading') {
      return null
    }
    
    // Otherwise, load it now
    setModuleStates(prev => ({
      ...prev,
      [moduleName]: { state: 'loading', data: null, error: null }
    }))
    
    try {
      const response = await fetch(`/api/device/${encodeURIComponent(deviceId)}/modules/${moduleName}`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const result = await response.json()
      
      if (result.success) {
        setModuleStates(prev => ({
          ...prev,
          [moduleName]: {
            state: 'loaded',
            data: result.data,
            error: null,
            loadedAt: new Date()
          }
        }))
        
        // Update deviceInfo
        setDeviceInfo((prev: any) => {
          if (!prev) return prev
          return {
            ...prev,
            modules: {
              ...prev.modules,
              [moduleName]: result.data
            }
          }
        })
        
        return result.data
      } else {
        throw new Error(result.error || 'Failed to load module')
      }
      
    } catch (error) {
      console.error(`[SMART LOAD] ❌ On-demand load failed for ${moduleName}:`, error)
      
      setModuleStates(prev => ({
        ...prev,
        [moduleName]: {
          state: 'error',
          data: null,
          error: error instanceof Error ? error.message : String(error)
        }
      }))
      
      throw error
    }
  }, [deviceId, moduleStates])
  
  return {
    // Device data (ready for InfoTab immediately)
    deviceInfo,
    infoLoading,
    infoError,
    
    // Module states
    moduleStates,
    allModulesLoaded,
    
    // Actions
    requestModule,
    
    // Helper functions
    isModuleLoaded: (moduleName: string) => moduleStates[moduleName]?.state === 'loaded',
    isModuleLoading: (moduleName: string) => moduleStates[moduleName]?.state === 'loading',
    isModuleError: (moduleName: string) => moduleStates[moduleName]?.state === 'error',
    getModuleData: (moduleName: string) => moduleStates[moduleName]?.data || null,
    getModuleError: (moduleName: string) => moduleStates[moduleName]?.error || null,
  }
}

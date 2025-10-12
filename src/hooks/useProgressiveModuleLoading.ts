import { useState, useEffect, useCallback, useRef } from 'react'
import { mapDeviceData } from '../lib/data-processing/device-mapper-modular'

/**
 * Module Loading States
 */
export type ModuleLoadState = 'unloaded' | 'loading' | 'loaded' | 'error'

export interface ModuleStatus {
  state: ModuleLoadState
  data: any | null
  error: string | null
  loadedAt?: Date
}

/**
 * Progressive Module Loading Hook
 * 
 * Manages lazy loading of device modules in priority order:
 * 1. Info tab modules (loaded immediately)
 * 2. Background progressive loading (hardware → events → installs → ...)
 * 3. On-demand loading (when user clicks unloaded tab)
 * 
 * @param deviceId - Device identifier (serial number, UUID, or asset tag)
 * @param priorityOrder - Array of module names in order of loading priority
 */
export function useProgressiveModuleLoading(
  deviceId: string,
  priorityOrder: string[] = [
    'hardware',
    'events', 
    'installs',
    'management',
    'system',
    'network',
    'security',
    'profiles',
    'applications',
    'peripherals'
  ]
) {
  // Track loading state for each module
  const [moduleStates, setModuleStates] = useState<Record<string, ModuleStatus>>({})
  
  // Track overall loading progress
  const [loadingProgress, setLoadingProgress] = useState<{
    loaded: number
    total: number
    percentage: number
  }>({ loaded: 0, total: priorityOrder.length, percentage: 0 })
  
  // Track which modules have been requested for loading
  const requestedModules = useRef<Set<string>>(new Set())
  
  // Track background loading queue
  const backgroundQueue = useRef<string[]>([...priorityOrder])
  const isBackgroundLoading = useRef(false)
  
  // Device info (minimal metadata)
  const [deviceInfo, setDeviceInfo] = useState<any>(null)
  const [infoLoading, setInfoLoading] = useState(true)
  const [infoError, setInfoError] = useState<string | null>(null)
  
  /**
   * Load a specific module
   */
  const loadModule = useCallback(async (moduleName: string): Promise<any> => {
    // Check current state using functional update to avoid stale closure
    let shouldLoad = true
    let existingData: any = null
    setModuleStates(prev => {
      if (prev[moduleName]?.state === 'loaded' || prev[moduleName]?.state === 'loading') {
        console.log(`[PROGRESSIVE] Module '${moduleName}' already ${prev[moduleName].state}`)
        shouldLoad = false
        existingData = prev[moduleName]?.data ?? null
        return prev // No change
      }
      
      // Set loading state
      console.log(`[PROGRESSIVE] 🔄 Loading module '${moduleName}' for device ${deviceId}`)
      return {
        ...prev,
        [moduleName]: { state: 'loading', data: null, error: null }
      }
    })
    
    if (!shouldLoad) {
      // Return existing data captured during state check
      return existingData
    }
    
    // Mark as requested
    requestedModules.current.add(moduleName)
    
    try {
      const response = await fetch(`/api/device/${encodeURIComponent(deviceId)}/modules/${moduleName}`)
      
      if (!response.ok) {
        throw new Error(`Failed to load module: ${response.statusText}`)
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to load module')
      }
      
      console.log(`[PROGRESSIVE] ✅ Module '${moduleName}' loaded successfully`)
      
      // Update state with loaded data
      setModuleStates(prev => ({
        ...prev,
        [moduleName]: { 
          state: 'loaded', 
          data: result.data, 
          error: null,
          loadedAt: new Date()
        }
      }))
      
      // Update progress
      setLoadingProgress(prev => {
        const loaded = prev.loaded + 1
        return {
          loaded,
          total: prev.total,
          percentage: Math.round((loaded / prev.total) * 100)
        }
      })
      
      return result.data
      
    } catch (error) {
      console.error(`[PROGRESSIVE] ❌ Error loading module '${moduleName}':`, error)
      
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      setModuleStates(prev => ({
        ...prev,
        [moduleName]: { 
          state: 'error', 
          data: null, 
          error: errorMessage
        }
      }))
      
      throw error
    }
  }, [deviceId]) // Only depend on deviceId
  
  /**
   * Load next module in background queue
   */
  const loadNextInQueue = useCallback(async () => {
    if (isBackgroundLoading.current || backgroundQueue.current.length === 0) {
      return
    }
    
    isBackgroundLoading.current = true
    const nextModule = backgroundQueue.current.shift()
    
    if (nextModule) {
      try {
        await loadModule(nextModule)
        // Small delay between background loads to prevent overwhelming the server
        setTimeout(() => {
          isBackgroundLoading.current = false
          loadNextInQueue()
        }, 100)
      } catch (error) {
        console.error(`[PROGRESSIVE] ❌ Background load failed for module '${nextModule}':`, error)
        // Continue to next module even if this one fails
        isBackgroundLoading.current = false
        loadNextInQueue()
      }
    } else {
      isBackgroundLoading.current = false
    }
  }, [loadModule])
  
  /**
   * Request a module to be loaded (on-demand or priority)
   */
  const requestModule = useCallback(async (moduleName: string) => {
    // Remove from background queue if present (prioritize on-demand)
    const queueIndex = backgroundQueue.current.indexOf(moduleName)
    if (queueIndex > -1) {
      backgroundQueue.current.splice(queueIndex, 1)
    }
    
    // Load immediately (loadModule will handle checking if already loaded)
    return await loadModule(moduleName)
  }, [loadModule])
  
  /**
   * Load fast info data (for Info tab)
   */
  useEffect(() => {
    let cancelled = false
    
    const loadInfo = async () => {
      if (cancelled) return
      
      setInfoLoading(true)
      setInfoError(null)
      
      console.log(`[PROGRESSIVE] 🚀 Loading fast info data for device ${deviceId}`)
      
      try {
        const response = await fetch(`/api/device/${encodeURIComponent(deviceId)}/info`)
        
        if (cancelled) return
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Device not found')
          }
          throw new Error(`Failed to load device info: ${response.statusText}`)
        }
        
        const result = await response.json()
        
        if (cancelled) return
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to load device info')
        }
        
        console.log(`[PROGRESSIVE] ✅ Fast info data loaded successfully`)
        
        // CRITICAL: Process data through mapDeviceData to ensure proper structure
        const processedDevice = mapDeviceData(result.device)
        setDeviceInfo(processedDevice)
        
        // Mark info modules as loaded
        if (result.device?.modules) {
          const infoModules = Object.keys(result.device.modules)
          setModuleStates(prev => {
            const updated = { ...prev }
            infoModules.forEach(moduleName => {
              updated[moduleName] = {
                state: 'loaded',
                data: result.device.modules[moduleName],
                error: null,
                loadedAt: new Date()
              }
            })
            return updated
          })
          
          // Update progress for info modules
          setLoadingProgress(prev => ({
            ...prev,
            loaded: infoModules.length,
            percentage: Math.round((infoModules.length / prev.total) * 100)
          }))
        }
        
        setInfoLoading(false)
        
        // Start background loading of remaining modules after info is loaded
        setTimeout(() => {
          if (!cancelled) {
            loadNextInQueue()
          }
        }, 500)
        
      } catch (error) {
        if (cancelled) return
        console.error(`[PROGRESSIVE] ❌ Error loading info:`, error)
        setInfoError(error instanceof Error ? error.message : String(error))
        setInfoLoading(false)
      }
    }
    
    if (deviceId) {
      loadInfo()
    }
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      cancelled = true
    }
  }, [deviceId, loadNextInQueue])
  
  return {
    // Device metadata
    deviceInfo,
    infoLoading,
    infoError,
    
    // Module states
    moduleStates,
    
    // Loading progress
    loadingProgress,
    
    // Actions
    requestModule,
    
    // Helper functions
    isModuleLoaded: (moduleName: string) => moduleStates[moduleName]?.state === 'loaded',
    isModuleLoading: (moduleName: string) => moduleStates[moduleName]?.state === 'loading',
    isModuleError: (moduleName: string) => moduleStates[moduleName]?.state === 'error',
    getModuleData: (moduleName: string) => moduleStates[moduleName]?.data || null,
    getModuleError: (moduleName: string) => moduleStates[moduleName]?.error || null
  }
}

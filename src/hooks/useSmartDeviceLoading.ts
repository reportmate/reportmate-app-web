import { useState, useEffect, useCallback, useRef } from 'react'
import { mapDeviceData } from '../lib/data-processing/device-mapper-modular'

/**
 * Smart Device Loading Hook - V3
 * 
 * Strategy:
 * 1. Load InfoTab modules FIRST (inventory, system, hardware, management, security, network)
 * 2. Check URL hash - if user landed on a specific tab, load that NEXT
 * 3. Load remaining modules in PARALLEL in background
 * 4. Events are loaded with limit=5 initially for speed
 * 5. No artificial delays - let the network be the bottleneck
 * 
 * This gives instant InfoTab + active tab priority.
 */

export type ModuleLoadState = 'unloaded' | 'loading' | 'loaded' | 'error'

export interface ModuleStatus {
  state: ModuleLoadState
  data: any | null
  error: string | null
  loadedAt?: Date
}

const BACKGROUND_MODULES: string[] = ['events', 'installs', 'profiles', 'applications', 'displays', 'printers', 'peripherals']

// Get initial active tab from URL hash
const getInitialActiveTab = (): string | null => {
  if (typeof window === 'undefined') return null
  const hash = window.location.hash.replace('#', '')
  if (hash && BACKGROUND_MODULES.includes(hash)) {
    return hash
  }
  return null
}

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
        console.error(`[SMART LOAD] Error loading InfoTab:`, error)
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
   * Load remaining modules - PRIORITIZE ACTIVE TAB, then parallel for rest
   */
  useEffect(() => {
    if (!deviceInfo || infoLoading || allModulesLoaded) return
    
    let cancelled = false
    
    const loadSingleModule = async (moduleName: string): Promise<void> => {
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
        // Events module: limit to 5 for initial fast load
        const url = moduleName === 'events' 
          ? `/api/device/${encodeURIComponent(deviceId)}/modules/${moduleName}?limit=5`
          : `/api/device/${encodeURIComponent(deviceId)}/modules/${moduleName}`
        
        const response = await fetch(url)
        
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
        console.error(`[SMART LOAD] Error loading ${moduleName}:`, error)
        
        setModuleStates(prev => ({
          ...prev,
          [moduleName]: {
            state: 'error',
            data: null,
            error: error instanceof Error ? error.message : String(error)
          }
        }))
      }
    }
    
    const loadBackgroundModules = async () => {
      // Check if user landed on a specific tab (from URL hash)
      const activeTab = getInitialActiveTab()
      
      // Prioritize active tab first if it's a background module
      if (activeTab && !moduleStatesRef.current[activeTab]?.state) {
        await loadSingleModule(activeTab)
      }
      
      // Then load remaining modules in parallel
      const remainingModules = BACKGROUND_MODULES.filter(m => 
        m !== activeTab && !moduleStatesRef.current[m]?.state
      )
      
      await Promise.allSettled(remainingModules.map(loadSingleModule))
      
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
      console.error(`[SMART LOAD] On-demand load failed for ${moduleName}:`, error)
      
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

import { useState, useEffect, useCallback, useRef } from 'react'
import { mapDeviceData } from '../lib/data-processing/device-mapper-modular'

/**
 * Smart Device Loading Hook - V4 (Simplified & Robust)
 * 
 * Strategy:
 * 1. Load InfoTab (Basic device info) - FAST
 * 2. Background Load - All other modules in parallel
 * 3. Simple state management - no complex ref syncing
 */

export type ModuleLoadState = 'unloaded' | 'loading' | 'loaded' | 'error'

export interface ModuleStatus {
  state: ModuleLoadState
  data: any | null
  error: string | null
  loadedAt?: Date
}

const BACKGROUND_MODULES: string[] = ['events', 'installs', 'applications', 'displays', 'printers', 'peripherals', 'system', 'network', 'security']

export function useSmartDeviceLoading(deviceId: string) {
  // Device info (core identity + info tab modules)
  const [deviceInfo, setDeviceInfo] = useState<any>(null)
  const [infoLoading, setInfoLoading] = useState(true)
  const [infoError, setInfoError] = useState<string | null>(null)
  
  // Module loading states - simple object tracking
  const [moduleStates, setModuleStates] = useState<Record<string, ModuleStatus>>({})
  const [allModulesLoaded, setAllModulesLoaded] = useState(false)
  
  // Track if background loading has been triggered for this deviceId
  const backgroundLoadingTriggered = useRef(false)
  const currentDeviceId = useRef(deviceId)

  // Reset everything when deviceId changes
  useEffect(() => {
    currentDeviceId.current = deviceId
    backgroundLoadingTriggered.current = false
    setDeviceInfo(null)
    setInfoLoading(true)
    setInfoError(null)
    setModuleStates({})
    setAllModulesLoaded(false)
  }, [deviceId])

  // Fetch helper - simple and direct
  const fetchModuleData = useCallback(async (moduleName: string): Promise<any> => {
    const url = moduleName === 'events' 
      ? `/api/device/${encodeURIComponent(deviceId)}/modules/${moduleName}?limit=5`
      : `/api/device/${encodeURIComponent(deviceId)}/modules/${moduleName}`
      
    const response = await fetch(url)
    
    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error(`HTTP ${response.status}`)
    }
    
    const result = await response.json()
    if (result.success) return result.data
    throw new Error(result.error || 'Failed to load module')
  }, [deviceId])

  /**
   * 1. Load InfoTab data
   */
  useEffect(() => {
    let cancelled = false
    
    const loadInfoData = async () => {
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
        
        if (cancelled) return
        
        setDeviceInfo(processed)
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
    
    return () => { cancelled = true }
  }, [deviceId])

  /**
   * 2. Load background modules - ONLY ONCE per deviceId
   */
  useEffect(() => {
    // Wait for info to load successfully
    if (!deviceInfo || infoLoading || infoError) return
    
    // Only trigger once per deviceId
    if (backgroundLoadingTriggered.current) return
    backgroundLoadingTriggered.current = true
    
    let cancelled = false
    
    const loadAllModules = async () => {
      console.log('[SMART LOAD] Starting background module loading for:', BACKGROUND_MODULES)
      
      // Mark all as loading first
      const loadingStates: Record<string, ModuleStatus> = {}
      BACKGROUND_MODULES.forEach(mod => {
        loadingStates[mod] = { state: 'loading', data: null, error: null }
      })
      setModuleStates(loadingStates)
      
      // Fetch all in parallel
      const results = await Promise.allSettled(
        BACKGROUND_MODULES.map(async (mod) => {
          const data = await fetchModuleData(mod)
          return { mod, data }
        })
      )
      
      if (cancelled) return
      
      // Update states based on results
      const finalStates: Record<string, ModuleStatus> = {}
      
      results.forEach((result, index) => {
        const mod = BACKGROUND_MODULES[index]
        
        if (result.status === 'fulfilled') {
          finalStates[mod] = {
            state: 'loaded',
            data: result.value.data,
            error: null,
            loadedAt: new Date()
          }
        } else {
          finalStates[mod] = {
            state: 'error',
            data: null,
            error: result.reason?.message || 'Failed to load'
          }
        }
      })
      
      if (cancelled) return
      
      console.log('[SMART LOAD] All modules loaded, final states:', Object.keys(finalStates).map(k => `${k}: ${finalStates[k].state}`))
      
      // Single state update with all results
      setModuleStates(finalStates)
      
      // Also sync to deviceInfo.modules for legacy components
      setDeviceInfo((prev: any) => {
        if (!prev) return prev
        const modules = { ...prev.modules }
        Object.entries(finalStates).forEach(([mod, status]) => {
          if (status.state === 'loaded') {
            modules[mod] = status.data
          }
        })
        return { ...prev, modules }
      })
      
      setAllModulesLoaded(true)
    }
    
    loadAllModules()
    
    return () => { cancelled = true }
  }, [deviceInfo, infoLoading, infoError, fetchModuleData])

  /**
   * 3. On-demand module loading (for modules not in background list)
   */
  const requestModule = useCallback(async (moduleName: string) => {
    // Check current state
    const currentState = moduleStates[moduleName]
    
    if (currentState?.state === 'loaded') {
      return currentState.data
    }
    
    if (currentState?.state === 'loading') {
      return null
    }
    
    // Mark as loading
    setModuleStates(prev => ({
      ...prev,
      [moduleName]: { state: 'loading', data: null, error: null }
    }))
    
    try {
      const data = await fetchModuleData(moduleName)
      
      setModuleStates(prev => ({
        ...prev,
        [moduleName]: { state: 'loaded', data, error: null, loadedAt: new Date() }
      }))
      
      // Sync to deviceInfo.modules
      setDeviceInfo((prev: any) => {
        if (!prev) return prev
        return {
          ...prev,
          modules: { ...prev.modules, [moduleName]: data }
        }
      })
      
      return data
      
    } catch (err: any) {
      setModuleStates(prev => ({
        ...prev,
        [moduleName]: { state: 'error', data: null, error: err.message }
      }))
      throw err
    }
  }, [moduleStates, fetchModuleData])
  
  // Memoized helper functions to avoid creating new functions on every render
  const isModuleLoaded = useCallback((mod: string) => {
    const loaded = moduleStates[mod]?.state === 'loaded'
    console.log(`[SMART LOAD] isModuleLoaded('${mod}') = ${loaded}, state = ${moduleStates[mod]?.state}`)
    return loaded
  }, [moduleStates])
  const isModuleLoading = useCallback((mod: string) => moduleStates[mod]?.state === 'loading', [moduleStates])
  const isModuleError = useCallback((mod: string) => moduleStates[mod]?.state === 'error', [moduleStates])
  const getModuleData = useCallback((mod: string) => moduleStates[mod]?.data || null, [moduleStates])
  const getModuleError = useCallback((mod: string) => moduleStates[mod]?.error || null, [moduleStates])
  
  return {
    deviceInfo,
    infoLoading,
    infoError,
    moduleStates,
    allModulesLoaded,
    requestModule,
    isModuleLoaded,
    isModuleLoading,
    isModuleError,
    getModuleData,
    getModuleError,
  }
}

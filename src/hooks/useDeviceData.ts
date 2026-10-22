import { useState, useEffect, useCallback } from 'react'
import { peekCached, rememberCached, trackedFetch } from '../lib/data-cache'

// Both caches hold the raw parsed JSON, keyed by request URL.
const DEVICES_URL = '/api/v1/devices'
const moduleUrl = (moduleType: string) => `/api/v1/${moduleType}`
const devicesFrom = (data: any): any[] => (Array.isArray(data) ? data : (data?.devices || []))

interface Device {
  deviceId: string
  serialNumber: string
  name: string
  model?: string
  os?: string
  lastSeen: string
  status: 'active' | 'stale' | 'missing' | 'warning' | 'error' | 'offline'
  platform: string
  totalEvents?: number
  lastEventTime?: string
  modules?: {
    inventory?: {
      catalog: string
      usage: string
      [key: string]: any
    }
    system?: {
      operatingSystem?: {
        name: string
        version: string
        build: string
        architecture: string
        displayVersion?: string
        edition?: string
        featureUpdate?: string
      }
    }
    hardware?: {
      processor?: {
        architecture: string
        [key: string]: any
      }
      [key: string]: any
    }
    [key: string]: any
  }
  [key: string]: any
}

interface UseDeviceDataOptions {
  includeModuleData?: boolean
  moduleType?: 'inventory' | 'system' | 'applications' | 'hardware' | 'management' | 'network' | 'peripherals' | 'profiles' | 'security' | 'installs'
}

interface UseDeviceDataReturn {
  devices: Device[]
  moduleData: any[]
  devicesLoading: boolean
  moduleLoading: boolean
  error: string | null
  /** Set when a background refresh failed while cached data stays on screen. */
  refreshError: string | null
  refetch: () => Promise<void>
}

/**
 * Custom hook that provides access to both main device data (with inventory) 
 * and optional module-specific data for device pages.
 * 
 * This ensures all device pages have access to inventory data while also
 * providing module-specific functionality when needed.
 */
export function useDeviceData(options: UseDeviceDataOptions = {}): UseDeviceDataReturn {
  const { includeModuleData = false, moduleType } = options
  
  // Seed from the tab's cache so a return visit renders its last data at once
  // and the fetches below refresh it in the background.
  const moduleCached = () =>
    includeModuleData && moduleType ? peekCached<any[]>(moduleUrl(moduleType)) : undefined
  const [devices, setDevices] = useState<Device[]>(() => {
    const cached = peekCached(DEVICES_URL)
    return cached === undefined ? [] : devicesFrom(cached)
  })
  const [moduleData, setModuleData] = useState<any[]>(() => moduleCached() ?? [])
  const [devicesLoading, setDevicesLoading] = useState(() => peekCached(DEVICES_URL) === undefined)
  const [moduleLoading, setModuleLoading] = useState(() => includeModuleData && moduleCached() === undefined)
  const [error, setError] = useState<string | null>(null)
  const [devicesRefreshError, setDevicesRefreshError] = useState<string | null>(null)
  const [moduleRefreshError, setModuleRefreshError] = useState<string | null>(null)

  const fetchDevices = useCallback(async () => {
    try {
      const response = await trackedFetch(DEVICES_URL, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      }, { background: peekCached(DEVICES_URL) !== undefined })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      // FastAPI returns { devices: [...], total: ..., message: ... }
      // Extract the devices array
      setDevices(devicesFrom(rememberCached(DEVICES_URL, data)))
      setDevicesRefreshError(null)
    } catch (err) {
      console.error('Error fetching devices:', err)
      // Keep the cached devices on screen when a background refresh fails.
      if (peekCached(DEVICES_URL) === undefined) setError(err instanceof Error ? err.message : 'Failed to fetch devices')
      else setDevicesRefreshError(err instanceof Error ? err.message : String(err))
    } finally {
      setDevicesLoading(false)
    }
  }, [])

  const fetchModuleData = useCallback(async () => {
    if (!includeModuleData || !moduleType) {
      setModuleLoading(false)
      return
    }

    const maxRetries = 3
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const startTime = Date.now()
        console.log(`[useDeviceData] Fetching ${moduleType} module data... (attempt ${attempt}/${maxRetries})`)
        
        const url = moduleUrl(moduleType)
        const response = await trackedFetch(url, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        }, { background: peekCached(url) !== undefined })
        
        const fetchTime = Date.now() - startTime
        console.log(`[useDeviceData] ${moduleType} fetch completed in ${fetchTime}ms, status: ${response.status}`)
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error(`[useDeviceData] ${moduleType} error response:`, errorText)
          
          // Retry on 503 (service unavailable) - container might be scaling
          if (response.status === 503 && attempt < maxRetries) {
            console.log(`[useDeviceData] Got 503, retrying in ${attempt * 2}s...`)
            await new Promise(r => setTimeout(r, attempt * 2000))
            continue
          }
          
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        console.log(`[useDeviceData] ${moduleType} data received:`, Array.isArray(data) ? `${data.length} items` : typeof data)
        setModuleData(rememberCached(url, data))
        setModuleRefreshError(null)
        setModuleLoading(false)
        return // Success, exit retry loop
        
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
        console.error(`Error fetching ${moduleType} module data (attempt ${attempt}):`, err)
        
        // Retry on network errors
        if (attempt < maxRetries) {
          console.log(`[useDeviceData] Retrying in ${attempt * 2}s...`)
          await new Promise(r => setTimeout(r, attempt * 2000))
          continue
        }
      }
    }
    
    // All retries failed
    console.error(`[useDeviceData] All ${maxRetries} attempts failed for ${moduleType}:`, lastError)
    if (peekCached(moduleUrl(moduleType)) !== undefined) {
      setModuleRefreshError(lastError?.message ?? 'Refresh failed')
    }
    setModuleLoading(false)
  }, [includeModuleData, moduleType])

  const refetch = async () => {
    // With cached data on screen, refresh without flipping back to loading.
    if (peekCached(DEVICES_URL) === undefined) setDevicesLoading(true)
    if (includeModuleData && moduleCached() === undefined) {
      setModuleLoading(true)
    }
    setError(null)
    
    await Promise.all([
      fetchDevices(),
      fetchModuleData()
    ])
  }

  useEffect(() => {
    fetchDevices()
    fetchModuleData()
  }, [fetchDevices, fetchModuleData])

  return {
    devices,
    moduleData,
    devicesLoading,
    moduleLoading,
    error,
    refreshError: moduleRefreshError ?? devicesRefreshError,
    refetch
  }
}

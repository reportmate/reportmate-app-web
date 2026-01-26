import { useState, useEffect, useCallback } from 'react'

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
  
  const [devices, setDevices] = useState<Device[]>([])
  const [moduleData, setModuleData] = useState<any[]>([])
  const [devicesLoading, setDevicesLoading] = useState(true)
  const [moduleLoading, setModuleLoading] = useState(includeModuleData)
  const [error, setError] = useState<string | null>(null)

  const fetchDevices = useCallback(async () => {
    try {
      const response = await fetch('/api/devices', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      // FastAPI returns { devices: [...], total: ..., message: ... }
      // Extract the devices array
      setDevices(Array.isArray(data) ? data : (data.devices || []))
    } catch (err) {
      console.error('Error fetching devices:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch devices')
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
        
        const response = await fetch(`/api/modules/${moduleType}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        })
        
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
        setModuleData(data)
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
    setModuleLoading(false)
  }, [includeModuleData, moduleType])

  const refetch = async () => {
    setDevicesLoading(true)
    if (includeModuleData) {
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
    refetch
  }
}

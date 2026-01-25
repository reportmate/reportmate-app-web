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

    try {
      const startTime = Date.now()
      console.log(`[useDeviceData] Fetching ${moduleType} module data...`)
      
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
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log(`[useDeviceData] ${moduleType} data received:`, Array.isArray(data) ? `${data.length} items` : typeof data)
      setModuleData(data)
    } catch (err) {
      console.error(`Error fetching ${moduleType} module data:`, err)
      // Don't set error for module data failures as the main devices data is more important
    } finally {
      setModuleLoading(false)
    }
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

/**
 * Shared device name utilities for API routes
 * Avoids internal HTTP calls between API routes
 */

// Cache for device names only (much smaller than full devices)
let deviceNamesCache: Map<string, string> = new Map()
let cacheTimestamp: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export async function getDeviceNames(requestedSerials: string[] = []): Promise<Map<string, string>> {
  const now = Date.now()
  
  // Check cache first
  if (deviceNamesCache.size > 0 && (now - cacheTimestamp) < CACHE_DURATION) {
    return deviceNamesCache
  }
  
  const apiBaseUrl = process.env.API_BASE_URL
  
  if (!apiBaseUrl) {
    console.error('[DEVICE-NAMES] API_BASE_URL environment variable not configured')
    return new Map()
  }
  
  try {
    console.log('[DEVICE-NAMES] Fetching device names from FastAPI Container')
    
    // Fetch only basic device info from FastAPI Container
    const response = await fetch(`${apiBaseUrl}/api/devices`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'User-Agent': 'ReportMate-DeviceNames/1.0'
      }
    })
    
    if (!response.ok) {
      throw new Error(`FastAPI Container returned ${response.status}`)
    }
    
    const data = await response.json()
    const devices = data.devices || []
    
    // Build device names cache - extract only serialNumber and deviceName
    const newCache = new Map<string, string>()
    
    devices.forEach((device: any) => {
      if (device.serialNumber) {
        let deviceName = device.serialNumber
        
        // Use deviceName if available and meaningful
        if (device.deviceName && 
            device.deviceName.trim() !== '' && 
            device.deviceName !== device.serialNumber &&
            !device.deviceName.toLowerCase().includes('unknown')) {
          deviceName = device.deviceName.trim()
        }
        
        newCache.set(device.serialNumber, deviceName)
      }
    })
    
    // Update cache
    deviceNamesCache = newCache
    cacheTimestamp = now
    
    console.log(`[DEVICE-NAMES] Cached ${deviceNamesCache.size} device names`)
    
    return deviceNamesCache
    
  } catch (error) {
    console.error('[DEVICE-NAMES] Error:', error)
    return deviceNamesCache // Return existing cache on error
  }
}

export function getDeviceNamesFromCache(serials: string[]): Record<string, string> {
  const result: Record<string, string> = {}
  
  serials.forEach(serial => {
    const name = deviceNamesCache.get(serial)
    if (name) {
      result[serial] = name
    }
  })
  
  return result
}
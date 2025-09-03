import { NextResponse } from 'next/server'

// Quick cache for devices data (in memory, resets on server restart)
let devicesCache: any[] = []
let cacheTimestamp: number = 0
const CACHE_DURATION = 60 * 1000 // 60 seconds for better performance

interface RawDevice {
  serialNumber?: string
  serial_number?: string
  deviceId?: string
  id?: string
  name?: string
  lastSeen?: string
  last_seen?: string
  createdAt?: string
  clientVersion?: string
  [key: string]: unknown
}

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const timestamp = new Date().toISOString()
    console.log(`[DEVICES API CACHED] ${timestamp} - Cached devices endpoint`)

    // Check cache first
    const now = Date.now()
    if (devicesCache.length > 0 && (now - cacheTimestamp) < CACHE_DURATION) {
      console.log(`[DEVICES API CACHED] ${timestamp} - Serving from cache: ${devicesCache.length} devices`)
      return NextResponse.json(devicesCache, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'X-Fetched-At': new Date(cacheTimestamp).toISOString(),
          'X-Data-Source': 'in-memory-cache'
        }
      })
    }

    const apiBaseUrl = process.env.API_BASE_URL
    
    if (!apiBaseUrl) {
      return NextResponse.json({
        error: 'API configuration error',
        details: 'API_BASE_URL environment variable not configured'
      }, { status: 500 })
    }
    
    console.log(`[DEVICES API CACHED] ${timestamp} - Fetching fresh data from Azure Functions`)
  
    // Fetch both devices and inventory data to get complete device information (same as inventory page)
    const [devicesResponse, inventoryResponse] = await Promise.all([
      fetch(`${apiBaseUrl}/api/devices`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'User-Agent': 'ReportMate-Frontend/1.0'
        }
      }),
      fetch(`${apiBaseUrl}/api/inventory`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'User-Agent': 'ReportMate-Frontend/1.0'
        }
      })
    ])
    
    if (!devicesResponse.ok) {
      throw new Error(`Devices API failed: ${devicesResponse.status} ${devicesResponse.statusText}`)
    }
    
    const devicesData = await devicesResponse.json()
    
    // Get inventory data for device names (same as inventory page uses)
    let inventoryData = []
    if (inventoryResponse.ok) {
      inventoryData = await inventoryResponse.json()
      console.log(`[DEVICES API CACHED] ${timestamp} - Got ${inventoryData.length} inventory items`)
    } else {
      console.warn(`[DEVICES API CACHED] ${timestamp} - Inventory API failed: ${inventoryResponse.status}`)
    }
    
    // Build inventory lookup map for fast device name resolution (same as inventory page)
    const inventoryMap = new Map<string, any>()
    if (Array.isArray(inventoryData)) {
      inventoryData.forEach((item: any) => {
        if (item.serialNumber) {
          inventoryMap.set(item.serialNumber, item)
        }
      })
      console.log(`[DEVICES API CACHED] ${timestamp} - Built inventory map for ${inventoryMap.size} devices`)
    }
    
    console.log(`[DEVICES API CACHED] ${timestamp} - Raw Azure Functions response:`, {
      success: devicesData.success,
      deviceCount: devicesData.devices?.length || 0,
      keys: Object.keys(devicesData || {}),
      firstDeviceKeys: devicesData.devices?.[0] ? Object.keys(devicesData.devices[0]) : []
    })
    
    // Extract devices array from Azure Functions response structure
    const devicesArray = devicesData.devices || devicesData || []
    console.log(`[DEVICES API CACHED] ${timestamp} - Got ${devicesArray.length} devices from optimized endpoint`)
    
    // Enhanced transformation using inventory data (same logic as inventory page)
    const transformedDevices = (Array.isArray(devicesArray) ? devicesArray : [])
      .filter((device: RawDevice) => {
        const serialNumber = device.serialNumber || device.serial_number
        return serialNumber && 
               !serialNumber.startsWith('TEST-') && 
               !serialNumber.includes('test-device') &&
               serialNumber !== 'localhost'
      })
      .map((device: any) => {
        const serialNumber = device.serialNumber || device.serial_number
        
        // Fast status calculation
        const calculateStatus = (lastSeen: string | null) => {
          if (!lastSeen) return 'missing'
          const hours = (Date.now() - new Date(lastSeen).getTime()) / (1000 * 60 * 60)
          return hours < 24 ? 'active' : hours < 168 ? 'stale' : 'missing'
        }

        const lastSeenValue = (device.lastSeen || device.last_seen) as string | null
        
        // Get inventory info for this device (same as inventory page)
        const inventoryInfo = inventoryMap.get(serialNumber) || {}
        
        // Build proper device name using EXACT SAME logic as inventory page
        const deviceName = inventoryInfo.deviceName || inventoryInfo.computerName || serialNumber || 'Unknown Device'
        
        // Debug logging for specific device
        if (serialNumber === '8LD0BZ2') {
          console.log(`[DEVICES API DEBUG] Processing device ${serialNumber}:`)
          console.log(`[DEVICES API DEBUG] - inventoryInfo.deviceName: "${inventoryInfo?.deviceName}"`)
          console.log(`[DEVICES API DEBUG] - inventoryInfo.computerName: "${inventoryInfo?.computerName}"`)
          console.log(`[DEVICES API DEBUG] - Final deviceName: "${deviceName}"`)
        }
        
        return {
          deviceId: device.deviceId || device.id || serialNumber,
          serialNumber: serialNumber,
          name: deviceName,
          lastSeen: lastSeenValue,
          createdAt: device.createdAt,
          status: calculateStatus(lastSeenValue),
          clientVersion: device.clientVersion || '1.0.0',
          assetTag: inventoryInfo?.assetTag,
          location: inventoryInfo?.location,
          os: inventoryInfo?.operatingSystem || device.os,
          modules: {
            inventory: inventoryInfo
          },
          totalEvents: device.totalEvents || 0,
          lastEventTime: lastSeenValue
        }
      })
    
    // Update cache
    devicesCache = transformedDevices
    cacheTimestamp = now
    
    console.log(`[DEVICES API CACHED] ${timestamp} - Cached ${transformedDevices.length} devices for future requests`)
    return NextResponse.json(transformedDevices, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'X-Fetched-At': timestamp,
        'X-Data-Source': 'azure-functions-fresh'
      }
    })
      
  } catch (error) {
    console.error('[DEVICES API CACHED] Error:', error)
    
    // If we have cached data, return it even if fresh fetch fails
    if (devicesCache.length > 0) {
      console.log(`[DEVICES API CACHED] Falling back to stale cache: ${devicesCache.length} devices`)
      return NextResponse.json(devicesCache, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'X-Fetched-At': new Date(cacheTimestamp).toISOString(),
          'X-Data-Source': 'stale-cache-fallback',
          'X-Warning': 'Fresh-data-fetch-failed'
        }
      })
    }
    
    return NextResponse.json({
      error: 'Failed to fetch devices',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

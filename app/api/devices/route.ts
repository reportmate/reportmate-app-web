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
  
    // Use the optimized devices endpoint that includes all module data
    const devicesResponse = await fetch(`${apiBaseUrl}/api/devices`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'User-Agent': 'ReportMate-Frontend/1.0'
      }
    })
    
    if (!devicesResponse.ok) {
      throw new Error(`Devices API failed: ${devicesResponse.status} ${devicesResponse.statusText}`)
    }
    
    const devicesData = await devicesResponse.json()
    
    console.log(`[DEVICES API CACHED] ${timestamp} - Got ${devicesData.length || 0} devices from optimized endpoint`)
    
    // Enhanced transformation using modules data from the device response
    const transformedDevices = (Array.isArray(devicesData) ? devicesData : [])
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
        
        // Use existing modules data from the Azure Functions response
        const inventoryInfo = device.modules?.inventory || {}
        const systemInfo = device.modules?.system || {}
        
        // Build proper device name - prioritize inventory deviceName
        let deviceName = device.name || serialNumber
        
        // Use inventory deviceName if available
        if (inventoryInfo?.deviceName && inventoryInfo.deviceName !== serialNumber) {
          deviceName = inventoryInfo.deviceName
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
          os: systemInfo?.operatingSystem?.name || inventoryInfo?.operatingSystem || device.os,
          modules: {
            inventory: inventoryInfo,
            system: systemInfo
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

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
    
    // Get ALL modules' latest timestamps for proper status calculation
    let allModulesData = []
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Pool } = require('pg')
      const pool = new Pool({ connectionString: process.env.DATABASE_URL })
      
      // Query all module tables to get latest collectedAt timestamps per device
      const moduleTableQueries = [
        'SELECT device_id, collected_at, \'system\' as module_name FROM system WHERE collected_at IS NOT NULL',
        'SELECT device_id, collected_at, \'inventory\' as module_name FROM inventory WHERE collected_at IS NOT NULL',
        'SELECT device_id, collected_at, \'hardware\' as module_name FROM hardware WHERE collected_at IS NOT NULL',
        'SELECT device_id, collected_at, \'installs\' as module_name FROM installs WHERE collected_at IS NOT NULL',
        'SELECT device_id, collected_at, \'applications\' as module_name FROM applications WHERE collected_at IS NOT NULL',
        'SELECT device_id, collected_at, \'management\' as module_name FROM management WHERE collected_at IS NOT NULL',
        'SELECT device_id, collected_at, \'network\' as module_name FROM network WHERE collected_at IS NOT NULL',
        'SELECT device_id, collected_at, \'security\' as module_name FROM security WHERE collected_at IS NOT NULL',
        'SELECT device_id, collected_at, \'profiles\' as module_name FROM profiles WHERE collected_at IS NOT NULL',
        'SELECT device_id, collected_at, \'printers\' as module_name FROM printers WHERE collected_at IS NOT NULL'
      ]
      
      const unionQuery = `
        WITH all_modules AS (
          ${moduleTableQueries.join(' UNION ALL ')}
        ),
        latest_per_device AS (
          SELECT 
            device_id,
            MAX(collected_at) as latest_collected_at
          FROM all_modules 
          GROUP BY device_id
        )
        SELECT 
          d.serial_number,
          l.latest_collected_at
        FROM latest_per_device l
        JOIN devices d ON l.device_id = d.id
        WHERE d.serial_number IS NOT NULL
      `
      
      const result = await pool.query(unionQuery)
      allModulesData = result.rows
      console.log(`[DEVICES API CACHED] ${timestamp} - Got latest module timestamps for ${allModulesData.length} devices`)
      
      await pool.end()
    } catch (dbError) {
      console.warn(`[DEVICES API CACHED] ${timestamp} - Module timestamps query failed:`, dbError)
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
    
    // Build module timestamps map for latest activity per device
    const moduleTimestampsMap = new Map<string, Date>()
    if (Array.isArray(allModulesData)) {
      allModulesData.forEach((item: any) => {
        if (item.serial_number && item.latest_collected_at) {
          moduleTimestampsMap.set(item.serial_number, new Date(item.latest_collected_at))
        }
      })
      console.log(`[DEVICES API CACHED] ${timestamp} - Built module timestamps map for ${moduleTimestampsMap.size} devices`)
    }
    
    console.log(`[DEVICES API CACHED] ${timestamp} - Raw Azure Functions response:`, {
      isArray: Array.isArray(devicesData),
      deviceCount: Array.isArray(devicesData) ? devicesData.length : (devicesData.devices?.length || 0),
      keys: Object.keys(devicesData || {}),
      firstDeviceKeys: Array.isArray(devicesData) && devicesData[0] ? Object.keys(devicesData[0]) : (devicesData.devices?.[0] ? Object.keys(devicesData.devices[0]) : [])
    })
    
    // Extract devices array from Azure Functions response structure
    // Azure Functions returns array directly, not wrapped in devices property
    const devicesArray = Array.isArray(devicesData) ? devicesData : (devicesData.devices || devicesData || [])
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
        
        // Status calculation using module timestamps (matches Azure Functions logic)
        const calculateStatus = (lastSeen: string | null, serialNumber: string) => {
          // Check for most recent module timestamp first (like Azure Functions)
          const latestModuleTimestamp = moduleTimestampsMap.get(serialNumber)
          
          // Use latest module timestamp if available, otherwise fall back to lastSeen
          const timestampToUse = latestModuleTimestamp || (lastSeen ? new Date(lastSeen) : null)
          
          if (!timestampToUse || isNaN(timestampToUse.getTime())) return 'missing'
          
          const hours = (Date.now() - timestampToUse.getTime()) / (1000 * 60 * 60)
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
          console.log(`[DEVICES API DEBUG] - Device keys: ${Object.keys(device).join(', ')}`)
          console.log(`[DEVICES API DEBUG] - Has inventory: ${inventoryInfo !== undefined}`)
          console.log(`[DEVICES API DEBUG] - Latest module timestamp: ${moduleTimestampsMap.get(serialNumber)}`)
          console.log(`[DEVICES API DEBUG] - Final deviceName: "${deviceName}"`)
        }
        
        // Build simplified modules structure (we only have inventory data now)
        const modules = {
          inventory: {
            catalog: inventoryInfo?.catalog || 'Unknown',
            usage: inventoryInfo?.usage || 'Unknown',
            ...inventoryInfo // Include all other inventory fields
          },
          system: {
            // System module data is no longer directly available for efficiency
            // but status calculation uses all module timestamps
            operatingSystem: undefined
          }
        }
        
        return {
          deviceId: device.deviceId || device.id || serialNumber,
          serialNumber: serialNumber,
          name: deviceName,
          lastSeen: lastSeenValue,
          createdAt: device.createdAt,
          status: calculateStatus(lastSeenValue, serialNumber),
          clientVersion: device.clientVersion || '1.0.0',
          assetTag: inventoryInfo?.assetTag,
          location: inventoryInfo?.location,
          os: inventoryInfo?.operatingSystem || device.os,
          modules,
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

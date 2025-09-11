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
  const timestamp = new Date().toISOString()
  
  try {
    // Check cache first
    const now = Date.now()
    if (devicesCache.length > 0 && (now - cacheTimestamp) < CACHE_DURATION) {
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
    
    // Fetch devices and inventory data concurrently
  
    // Fetch devices and inventory data from Azure Functions
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
    } else {
      console.warn(`[DEVICES API] Inventory API failed: ${inventoryResponse.status}`)
    }

    // Get system data from database for OS information
    let systemData: any[] = []
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Pool } = require('pg')
      const pool = new Pool({ connectionString: process.env.DATABASE_URL })
      
      // Query system table for OS information with device serial numbers
      const systemQuery = `
        SELECT 
          device_id as system_device_id,
          data,
          collected_at
        FROM system
        WHERE collected_at IS NOT NULL 
          AND data IS NOT NULL
          AND device_id IS NOT NULL
        ORDER BY collected_at DESC
      `
      
      const systemResult = await pool.query(systemQuery)
      systemData = systemResult.rows || []
      
      await pool.end()
    } catch (systemError) {
      console.warn(`[DEVICES API] System database query failed:`, systemError)
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
      
      await pool.end()
    } catch (dbError) {
      console.warn(`[DEVICES API] Module timestamps query failed:`, dbError)
    }
    
    // Build inventory lookup map for fast device name resolution (same as inventory page)
    const inventoryMap = new Map<string, any>()
    if (Array.isArray(inventoryData)) {
      inventoryData.forEach((item: any) => {
        if (item.serialNumber) {
          inventoryMap.set(item.serialNumber, item)
        }
      })
    }

    // Build system map for OS information using database data
    const systemMap = new Map<string, any>()
    if (Array.isArray(systemData)) {
      systemData.forEach((item: any) => {
        if (item.system_device_id && item.data) {
          // Parse the data JSON field from database to extract operatingSystem
          let systemInfo = null
          let operatingSystem = null
          try {
            systemInfo = typeof item.data === 'string' 
              ? JSON.parse(item.data) 
              : item.data
            
            // Extract operatingSystem from the system data
            operatingSystem = systemInfo?.operatingSystem
          } catch (parseError) {
            console.warn(`[DEVICES API] Failed to parse system data for ${item.system_device_id}:`, parseError)
          }
          
          if (operatingSystem) {
            // Use device_id from system table as the serial number
            systemMap.set(item.system_device_id, {
              operatingSystem,
              collected_at: item.collected_at,
              device_id: item.system_device_id
            })
          }
        }
      })
    }
    
    // Build module timestamps map for latest activity per device
    const moduleTimestampsMap = new Map<string, Date>()
    if (Array.isArray(allModulesData)) {
      allModulesData.forEach((item: any) => {
        if (item.serial_number && item.latest_collected_at) {
          moduleTimestampsMap.set(item.serial_number, new Date(item.latest_collected_at))
        }
      })
    }
    
    // Extract devices array from Azure Functions response structure
    // Azure Functions returns array directly, not wrapped in devices property
    const devicesArray = Array.isArray(devicesData) ? devicesData : (devicesData.devices || devicesData || [])
    
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
        
        // Get system info for this device
        const systemInfo = systemMap.get(serialNumber) || {}
        
        // Build modules structure with system and inventory data
        const modules = {
          inventory: {
            catalog: inventoryInfo?.catalog || 'Unknown',
            usage: inventoryInfo?.usage || 'Unknown',
            ...inventoryInfo // Include all other inventory fields
          },
          system: {
            // Include system module data if available from database
            operatingSystem: systemInfo?.operatingSystem,
            ...systemInfo // Include all other system fields (collected_at, device_id)
          }
        }
        
        // Create clean device object to avoid property duplication
        const cleanDevice = {
          deviceId: device.deviceId || device.id || serialNumber,
          serialNumber: serialNumber,
          name: deviceName, // Use name for consistency with component interface
          lastSeen: lastSeenValue,
          createdAt: device.createdAt,
          status: calculateStatus(lastSeenValue, serialNumber),
          clientVersion: device.clientVersion || '1.0.0',
          assetTag: inventoryInfo?.assetTag,
          location: inventoryInfo?.location,
          os: systemInfo?.operatingSystem?.name || inventoryInfo?.operatingSystem || device.os,
          modules,
          totalEvents: device.totalEvents || 0,
          lastEventTime: lastSeenValue,
          hasData: true // Explicitly set since these devices have data
        }
        
        return cleanDevice
      })
    
    // Update cache
    devicesCache = transformedDevices
    cacheTimestamp = now
    
    return NextResponse.json(transformedDevices, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'X-Fetched-At': timestamp,
        'X-Data-Source': 'azure-functions-fresh'
      }
    })
      
  } catch (error) {
    console.error('[DEVICES API] Error:', error)
    
    // If we have cached data, return it even if fresh fetch fails
    if (devicesCache.length > 0) {
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

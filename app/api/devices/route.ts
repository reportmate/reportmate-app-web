import { NextResponse } from 'next/server'

interface RawDevice {
  serial_number?: string
  [key: string]: unknown
}

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const timestamp = new Date().toISOString()
    console.log(`[DEVICES API] ${timestamp} - Fetching devices from Azure Functions API`)

    // Use server-side API base URL configuration
    const apiBaseUrl = process.env.API_BASE_URL
    
    if (!apiBaseUrl) {
      console.error(`[DEVICES API] ${timestamp} - API_BASE_URL environment variable not configured`)
      return NextResponse.json({
        error: 'API configuration error',
        details: 'API_BASE_URL environment variable not configured'
      }, { status: 500 })
    }
    
    console.log(`[DEVICES API] ${timestamp} - Using API base URL:`, apiBaseUrl)
    
    let response
    let useLocalFallback = false
    
    try {
      response = await fetch(`${apiBaseUrl}/api/devices`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'X-API-PASSPHRASE': 's3cur3-p@ssphras3!'
        }
      })
      
      if (!response.ok) {
        console.error(`[DEVICES API] ${timestamp} - Azure Functions API error:`, response.status, response.statusText)
        useLocalFallback = true
      }
    } catch (fetchError) {
      console.error(`[DEVICES API] ${timestamp} - Failed to reach Azure Functions API:`, fetchError)
      useLocalFallback = true
    }
    
    // Fallback to local database query if Azure Functions API fails
    if (useLocalFallback) {
      console.log(`[DEVICES API] ${timestamp} - Using local database fallback`)
      
      try {
        // Import database connection
        const { Pool } = require('pg')
        const pool = new Pool({
          connectionString: process.env.DATABASE_URL
        })

        const result = await pool.query(`
          SELECT 
            d.device_id as id,
            d.name,
            d.serial_number as "serialNumber",
            d.ip_address_v4 as "ipAddress",
            d.last_seen as "lastSeen",
            d.manufacturer,
            s.data->'operatingSystem'->>'name' as os,
            s.data->'operatingSystem'->>'version' as "osVersion",
            s.data as system_data,
            i.data as inventory_data
          FROM devices d
          LEFT JOIN system s ON d.id = s.device_id
          LEFT JOIN inventory i ON d.serial_number = i.device_id
          ORDER BY d.last_seen DESC
          LIMIT 50
        `)
        
        const devices = result.rows.map((row: any) => {
          // Extract inventory data for device name
          const inventoryData = row.inventory_data || {}
          const systemData = row.system_data || {}
          const deviceName = inventoryData.deviceName || inventoryData.device_name || row.name || 'Unknown Device'
          
          // Calculate status based on last_seen (same logic as Azure Functions)
          const calculateStatus = (lastSeen: any) => {
            if (!lastSeen) return 'missing'
            
            const now = new Date()
            const lastSeenDate = new Date(lastSeen)
            const hours = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60 * 60)
            
            if (hours <= 24) return 'active'
            else if (hours <= 168) return 'stale' // 7 days  
            else return 'missing'
          }
          
          return {
            deviceId: row.id || row.serialNumber,  // Use deviceId instead of id
            name: deviceName,
            model: 'Unknown Model',
            os: row.os || 'Unknown OS',
            serialNumber: row.serialNumber,
            assetTag: inventoryData.assetTag || '',
            ipAddress: row.ipAddress || 'Unknown',
            ipAddressV4: row.ipAddress || '',
            ipAddressV6: '',
            lastSeen: row.lastSeen,
            status: calculateStatus(row.lastSeen), // Calculate status based on last_seen
            // Include modules data for frontend compatibility
            modules: {
              inventory: inventoryData,
              system: systemData
            }
          }
        })

        await pool.end()

        console.log(`[DEVICES API] ${timestamp} - Local database fallback successful, found ${devices.length} devices`)
        
        // Return direct array for frontend compatibility (not wrapped in object)
        return NextResponse.json(devices, {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'X-Fetched-At': timestamp,
            'X-Data-Source': 'local-database-fallback'
          }
        })
        
      } catch (dbError) {
        console.error(`[DEVICES API] ${timestamp} - Local database fallback failed:`, dbError)
        
        return NextResponse.json({
          error: 'Both Azure Functions API and local database unavailable',
          details: `Azure API: ${response?.status || 'unreachable'}, Database: ${dbError}`
        }, { status: 503 })
      }
    }
    
    // Continue with Azure Functions API response processing if we have a valid response
    if (response) {
      const data = await response.json()
      console.log(`[DEVICES API] ${timestamp} - Successfully fetched data from Azure Functions`)
      
      // CRITICAL FIX: Always extract devices array from Azure Functions response
      // Azure Functions returns: {"devices": [...], "count": 4}
      // Frontend expects: [device1, device2, ...]
      
      console.log('[DEVICES API] Raw response type:', typeof data)
      console.log('[DEVICES API] Raw response structure:', Object.keys(data || {}))
      
      let devicesArray = []
      
      if (data && data.devices && Array.isArray(data.devices)) {
        devicesArray = data.devices
        console.log(`[DEVICES API] ✅ Extracted ${devicesArray.length} devices from wrapped format`)
      } else if (Array.isArray(data)) {
        devicesArray = data
        console.log(`[DEVICES API] ✅ Using direct array format with ${devicesArray.length} devices`)
      } else {
        console.error('[DEVICES API] ❌ Invalid response format from Azure Functions:', data)
        return NextResponse.json({
          error: 'Invalid response format from Azure Functions API',
          details: `Expected {devices: [...]} or [...], got ${typeof data}`,
          received: data
        }, { 
          status: 500,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        })
      }
      
      // Transform field names from snake_case to camelCase for frontend compatibility
      // ENHANCED: Fetch full device details with modules for each device
      const transformedDevices = await Promise.all(
        devicesArray
          .filter((device: RawDevice) => {
            // Filter out test devices - only include devices with real serial numbers
            const serialNumber = device.serial_number
            return serialNumber && 
                   !serialNumber.startsWith('TEST-') && 
                   !serialNumber.includes('test-device') &&
                   serialNumber !== 'localhost' &&
                   !serialNumber.includes('{"serial_number"')
          })
          .map(async (device: RawDevice) => {
            console.log('[DEVICES API] 🔍 Processing device:', device.serial_number)
            
            // Fetch full device details with modules from individual device endpoint
            let fullDeviceData = null
            try {
              const deviceDetailResponse = await fetch(`${apiBaseUrl}/api/device/${device.serial_number}`, {
                cache: 'no-store',
                headers: {
                  'Cache-Control': 'no-cache',
                  'Pragma': 'no-cache',
                  'X-API-PASSPHRASE': 's3cur3-p@ssphras3!'
                }
              })
              
              if (deviceDetailResponse.ok) {
                const deviceDetailData = await deviceDetailResponse.json()
                // Check if response has device modules (indicating a successful detailed response)
                if (deviceDetailData && (deviceDetailData.metadata || deviceDetailData.inventory || deviceDetailData.applications)) {
                  fullDeviceData = deviceDetailData
                  console.log('[DEVICES API] ✅ Got full device data with modules for:', device.serial_number)
                  console.log('[DEVICES API]   Available modules:', Object.keys(deviceDetailData).filter(key => key !== 'metadata'))
                }
              }
            } catch (error) {
              console.warn('[DEVICES API] ⚠️ Failed to fetch full device data for:', device.serial_number, error)
            }
            
            // Use full device data if available, otherwise fall back to basic data
            const sourceData = fullDeviceData || device
            
            // Calculate status based on last_seen timestamp (same logic as Azure Functions API)
            const calculateDeviceStatus = (lastSeen: string | Date | null) => {
              if (!lastSeen) return 'missing'
              
              const now = new Date()
              let lastSeenDate: Date
              
              if (typeof lastSeen === 'string') {
                lastSeenDate = new Date(lastSeen)
              } else {
                lastSeenDate = lastSeen
              }
              
              const timeDiff = now.getTime() - lastSeenDate.getTime()
              const hours = timeDiff / (1000 * 60 * 60)
              
              if (hours <= 24) return 'active'
              else if (hours <= 168) return 'stale' // 7 days
              else return 'missing'
            }

            const lastSeenValue = sourceData.metadata?.collectedAt || device.last_seen
            const calculatedStatus = calculateDeviceStatus(lastSeenValue)

            const transformed = {
              deviceId: sourceData.metadata?.deviceId || device.id,     // Internal UUID
              serialNumber: sourceData.metadata?.serialNumber || device.serial_number, // Human-readable unique ID
              name: sourceData.inventory?.deviceName || sourceData.name || device.name || device.serial_number,
              lastSeen: lastSeenValue,
              status: sourceData.status || device.status || calculatedStatus, // Use calculated status if not provided
              clientVersion: sourceData.metadata?.clientVersion || device.client_version || '1.0.0',
              assetTag: sourceData.inventory?.assetTag, // Asset tag from inventory module
              location: sourceData.inventory?.location, // Location from inventory module
              modules: {
                inventory: sourceData.inventory,
                applications: sourceData.applications,
                security: sourceData.security,
                services: sourceData.services,
                system: sourceData.system,           // Add system module for OS data
                hardware: sourceData.hardware,       // Add hardware module
                network: sourceData.network,         // Add network module
                displays: sourceData.displays,       // Add displays module
                printers: sourceData.printers,       // Add printers module
                profiles: sourceData.profiles,       // Add profiles module
                management: sourceData.management,   // Add management module
                installs: sourceData.installs        // Add installs module
              },
              totalEvents: 0,                                // Default for compatibility
              lastEventTime: sourceData.metadata?.collectedAt || device.last_seen // Use collectedAt as placeholder
            }
            
            return transformed
          })
      )
      
      // Always return a direct array for the frontend
      console.log(`[DEVICES API] ${timestamp} - Returning filtered devices array with ${transformedDevices.length} items (filtered from ${devicesArray.length})`)
      return NextResponse.json(transformedDevices, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Fetched-At': timestamp,
          'X-Data-Source': 'azure-functions'
        }
      })
    }
    
    // This should not be reached since we handle the fallback above
    return NextResponse.json({
      error: 'Unexpected error in API routing'
    }, { status: 500 })

  } catch (error) {
    console.error('[DEVICES API] Error fetching devices:', error)
    return NextResponse.json({
      error: 'Failed to fetch devices',
      details: error instanceof Error ? error.message : String(error)
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  }
}

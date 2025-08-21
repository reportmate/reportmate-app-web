import { NextResponse } from 'next/server'

interface RawDevice {
  serialNumber?: string  // Azure Functions uses camelCase
  serial_number?: string  // Fallback for snake_case
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
  
  // Check if REPORTMATE_PASSPHRASE is configured
  if (!process.env.REPORTMATE_PASSPHRASE) {
    console.error(`[DEVICES API] ${timestamp} - Missing REPORTMATE_PASSPHRASE environment variable`)
    return NextResponse.json({
      success: false,
      error: 'Configuration error',
      details: 'REPORTMATE_PASSPHRASE environment variable not configured',
      timestamp
    }, { status: 500 })
  }
  
  // 🚨 CLOUD-FIRST: No fallbacks, fail immediately on API errors
  try {
    const response = await fetch(`${apiBaseUrl}/api/devices`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'X-API-PASSPHRASE': process.env.REPORTMATE_PASSPHRASE!
      }
    })
    
    if (!response.ok) {
        console.error(`[DEVICES API] ${timestamp} - 🚨 CRITICAL: Azure Functions API failed with ${response.status} ${response.statusText}`)
        console.error(`[DEVICES API] ${timestamp} - 🔄 ENTERING DEGRADED MODE: Building device list from individual device calls`)
        
        // 🔄 DEGRADED MODE: Try to build device list by calling individual device endpoints
        // This is a temporary workaround while the Azure Functions /api/devices endpoint is fixed
        try {
          // First, try to get a list of device serial numbers from events
          const eventsResponse = await fetch(`${apiBaseUrl}/api/events`, {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache',
              'X-API-PASSPHRASE': process.env.REPORTMATE_PASSPHRASE!
            }
          })
          
          if (!eventsResponse.ok) {
            throw new Error(`Events API also failing: ${eventsResponse.status}`)
          }
          
          const eventsData = await eventsResponse.json()
          console.log(`[DEVICES API] ${timestamp} - 🔄 DEGRADED: Got ${eventsData.events?.length || 0} events`)
          
          // Extract unique device serial numbers from events
          const deviceSerials = new Set<string>()
          if (eventsData.events && Array.isArray(eventsData.events)) {
            eventsData.events.forEach((event: any) => {
              if (event.device && 
                  !event.device.startsWith('TEST-') && 
                  !event.device.includes('test-device') &&
                  event.device !== 'localhost') {
                deviceSerials.add(event.device)
              }
            })
          }
          
          console.log(`[DEVICES API] ${timestamp} - 🔄 DEGRADED: Found ${deviceSerials.size} unique devices in events`)
          
          // Fetch detailed data for each device
          const degradedDevices = await Promise.all(
            Array.from(deviceSerials).map(async (serial) => {
              try {
                const deviceResponse = await fetch(`${apiBaseUrl}/api/device/${serial}`, {
                  cache: 'no-store',
                  headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                    'X-API-PASSPHRASE': process.env.REPORTMATE_PASSPHRASE!
                  }
                })
                
                if (deviceResponse.ok) {
                  const deviceData = await deviceResponse.json()
                  
                  // Extract data from standardized nested structure only
                  const deviceModules = deviceData.device?.modules
                  const inventoryData = deviceModules?.inventory
                  
                  // Transform to match expected format
                  return {
                    deviceId: deviceData.device?.deviceId || deviceData.metadata?.deviceId || serial,
                    serialNumber: deviceData.device?.serialNumber || serial,
                    name: inventoryData?.deviceName || 'Unknown Device',
                    lastSeen: deviceData.device?.lastSeen || deviceData.metadata?.collectedAt,
                    status: 'active', // Default since we got recent events
                    clientVersion: deviceData.device?.clientVersion || deviceData.metadata?.clientVersion || '1.0.0',
                    assetTag: inventoryData?.assetTag,
                    location: inventoryData?.location,
                    modules: deviceModules || {},
                    totalEvents: 0,
                    lastEventTime: deviceData.device?.lastSeen || deviceData.metadata?.collectedAt
                  }
                } else {
                  console.warn(`[DEVICES API] ${timestamp} - 🔄 DEGRADED: Failed to fetch device ${serial}: ${deviceResponse.status}`)
                  return null
                }
              } catch (error) {
                console.warn(`[DEVICES API] ${timestamp} - 🔄 DEGRADED: Error fetching device ${serial}:`, error)
                return null
              }
            })
          )
          
          const validDevices = degradedDevices.filter(d => d !== null)
          
          console.error(`[DEVICES API] ${timestamp} - 🔄 DEGRADED MODE SUCCESS: Built ${validDevices.length} devices from individual API calls`)
          console.error(`[DEVICES API] ${timestamp} - ⚠️  WARNING: This is a temporary workaround - Azure Functions /api/devices needs to be fixed!`)
          
          return NextResponse.json(validDevices, {
            headers: {
              'Cache-Control': 'no-store, no-cache, must-revalidate',
              'Pragma': 'no-cache',
              'X-Fetched-At': timestamp,
              'X-Data-Source': 'degraded-individual-calls',
              'X-Cloud-API-Status': 'failed-using-fallback',
              'X-Warning': 'API-in-degraded-mode',
              'X-Original-Error': `${response.status}-${response.statusText}`
            }
          })
          
        } catch (degradedError) {
          console.error(`[DEVICES API] ${timestamp} - 🚨 DEGRADED MODE FAILED:`, degradedError)
          
          return NextResponse.json({
            error: `Critical Infrastructure Failure`,
            details: `Azure Functions /api/devices is failing (${response.status} ${response.statusText}) and degraded mode also failed. This requires immediate attention.`,
            timestamp,
            primaryError: `${response.status} ${response.statusText}`,
            degradedModeError: degradedError instanceof Error ? degradedError.message : String(degradedError),
            cloudApiUrl: `${apiBaseUrl}/api/devices`
          }, { 
            status: 503,
            headers: {
              'Cache-Control': 'no-store, no-cache, must-revalidate',
              'Pragma': 'no-cache',
              'X-Cloud-API-Status': response.status.toString(),
              'X-Error-Type': 'total-infrastructure-failure'
            }
          })
        }
      }

      // Success path - process the response
      const data = await response.json()
      console.log(`[DEVICES API] ${timestamp} - ✅ Successfully fetched data from Azure Functions`)
      
      // Extract devices array from Azure Functions response
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
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache'
          }
        })
      }
      
      // Transform and enrich device data
      const transformedDevices = await Promise.all(
        devicesArray
          .filter((device: RawDevice) => {
            // Filter out test devices - handle both camelCase and snake_case
            const serialNumber = device.serialNumber || device.serial_number
            return serialNumber && 
                   !serialNumber.startsWith('TEST-') && 
                   !serialNumber.includes('test-device') &&
                   serialNumber !== 'localhost' &&
                   !serialNumber.includes('{"serial_number"')
          })
          .map(async (device: RawDevice) => {
            const serialNumber = device.serialNumber || device.serial_number
            console.log('[DEVICES API] 🔍 Processing device:', serialNumber)
            
            // Fetch full device details with modules
            let fullDeviceData = null
            try {
              const deviceDetailResponse = await fetch(`${apiBaseUrl}/api/device/${serialNumber}`, {
                cache: 'no-store',
                headers: {
                  'Cache-Control': 'no-cache',
                  'Pragma': 'no-cache',
                  'X-API-PASSPHRASE': process.env.REPORTMATE_PASSPHRASE!
                }
              })
              
              if (deviceDetailResponse.ok) {
                const deviceDetailData = await deviceDetailResponse.json()
                if (deviceDetailData && (deviceDetailData.metadata || deviceDetailData.device?.modules)) {
                  fullDeviceData = deviceDetailData
                  console.log('[DEVICES API] ✅ Got full device data with modules for:', serialNumber)
                }
              }
            } catch (error) {
              console.warn('[DEVICES API] ⚠️ Failed to fetch full device data for:', serialNumber, error)
            }
            
            const sourceData = fullDeviceData || device
            
            // Calculate status based on last_seen timestamp
            const calculateDeviceStatus = (lastSeen: string | Date | null) => {
              if (!lastSeen) return 'missing'
              
              const now = new Date()
              const lastSeenDate = new Date(lastSeen)
              const hours = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60 * 60)
              
              if (hours <= 72) return 'active'      // < 3 days
              else if (hours <= 240) return 'stale' // 3-10 days
              else return 'missing'                 // 10+ days
            }

            const lastSeenValue = sourceData.device?.lastSeen || sourceData.metadata?.collectedAt || device.last_seen
            const calculatedStatus = calculateDeviceStatus(lastSeenValue)

            // 🕐 TIMESTAMP SYNCHRONIZATION: Fetch recent events to update lastSeen (same as individual device API)
            let finalLastSeen = lastSeenValue
            try {
              const deviceEventsUrl = `${apiBaseUrl}/api/events?device=${encodeURIComponent(sourceData.device?.serialNumber || sourceData.metadata?.serialNumber || device.serialNumber)}&limit=1`
              const eventsResponse = await fetch(deviceEventsUrl, {
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json'
                }
              })
              
              if (eventsResponse.ok) {
                const eventsData = await eventsResponse.json()
                if (eventsData.success && eventsData.events && eventsData.events.length > 0) {
                  const latestEvent = eventsData.events[0]
                  const eventTimestamp = latestEvent.ts || latestEvent.timestamp || latestEvent.created_at
                  
                  if (eventTimestamp) {
                    finalLastSeen = eventTimestamp
                    console.log(`[DEVICES API] 🕐 Updated lastSeen for ${sourceData.device?.serialNumber || device.serialNumber} from ${lastSeenValue} to ${eventTimestamp}`)
                  }
                }
              }
            } catch (eventsError) {
              console.warn(`[DEVICES API] 🕐 Failed to fetch events for timestamp sync for ${sourceData.device?.serialNumber || device.serialNumber}:`, eventsError)
            }

            // Extract data from standardized nested structure only
            const deviceModules = sourceData.device?.modules
            const inventoryData = deviceModules?.inventory
            const systemData = deviceModules?.system

            return {
              deviceId: sourceData.device?.deviceId || sourceData.metadata?.deviceId || device.id,
              serialNumber: sourceData.device?.serialNumber || sourceData.metadata?.serialNumber || device.serialNumber,
              name: inventoryData?.deviceName || sourceData.name || device.name || 'Unknown Device',
              lastSeen: finalLastSeen,
              status: calculatedStatus, // Use calculated status based on actual recent timestamps
              clientVersion: sourceData.device?.clientVersion || sourceData.metadata?.clientVersion || '1.0.0',
              assetTag: inventoryData?.assetTag,
              location: inventoryData?.location,
              modules: deviceModules || {},
              totalEvents: 0,
              lastEventTime: finalLastSeen
            }
          })
      )
      
      console.log(`[DEVICES API] ${timestamp} - ✅ Returning ${transformedDevices.length} devices from Azure Functions`)
      return NextResponse.json(transformedDevices, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'X-Fetched-At': timestamp,
          'X-Data-Source': 'azure-functions',
          'X-Cloud-API-Status': 'success'
        }
      })
      
    } catch (fetchError) {
      console.error(`[DEVICES API] ${timestamp} - 🚨 CRITICAL: Failed to reach Azure Functions API:`, fetchError)
      
      return NextResponse.json({
        error: 'Cloud infrastructure unavailable',
        details: `Cannot connect to Azure Functions API at ${apiBaseUrl}/api/devices. This indicates a critical network or infrastructure problem.`,
        timestamp,
        cloudApiUrl: `${apiBaseUrl}/api/devices`,
        networkError: fetchError instanceof Error ? fetchError.message : String(fetchError)
      }, { 
        status: 503, // Service Unavailable
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'X-Error-Type': 'network-failure'
        }
      })
    }

  } catch (error) {
    console.error('[DEVICES API] 🚨 CRITICAL: Unexpected error in devices API:', error)
    return NextResponse.json({
      error: 'Critical system error',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'X-Error-Type': 'system-failure'
      }
    })
  }
}

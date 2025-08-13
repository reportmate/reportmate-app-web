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
    
    // 🚨 CLOUD-FIRST: No fallbacks, fail immediately on API errors
    try {
      const response = await fetch(`${apiBaseUrl}/api/devices`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'X-API-PASSPHRASE': 's3cur3-p@ssphras3!'
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
              'X-API-PASSPHRASE': 's3cur3-p@ssphras3!'
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
                    'X-API-PASSPHRASE': 's3cur3-p@ssphras3!'
                  }
                })
                
                if (deviceResponse.ok) {
                  const deviceData = await deviceResponse.json()
                  
                  // Transform to match expected format
                  return {
                    deviceId: deviceData.metadata?.deviceId || serial,
                    serialNumber: serial,
                    name: deviceData.inventory?.deviceName || serial,
                    lastSeen: deviceData.metadata?.collectedAt,
                    status: 'active', // Default since we got recent events
                    clientVersion: deviceData.metadata?.clientVersion || '1.0.0',
                    assetTag: deviceData.inventory?.assetTag,
                    location: deviceData.inventory?.location,
                    modules: {
                      inventory: deviceData.inventory,
                      applications: deviceData.applications,
                      security: deviceData.security,
                      services: deviceData.services,
                      system: deviceData.system,
                      hardware: deviceData.hardware,
                      network: deviceData.network,
                      displays: deviceData.displays,
                      printers: deviceData.printers,
                      profiles: deviceData.profiles,
                      management: deviceData.management,
                      installs: deviceData.installs
                    },
                    totalEvents: 0,
                    lastEventTime: deviceData.metadata?.collectedAt
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
            // Filter out test devices
            const serialNumber = device.serial_number
            return serialNumber && 
                   !serialNumber.startsWith('TEST-') && 
                   !serialNumber.includes('test-device') &&
                   serialNumber !== 'localhost' &&
                   !serialNumber.includes('{"serial_number"')
          })
          .map(async (device: RawDevice) => {
            console.log('[DEVICES API] 🔍 Processing device:', device.serial_number)
            
            // Fetch full device details with modules
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
                if (deviceDetailData && (deviceDetailData.metadata || deviceDetailData.inventory || deviceDetailData.applications)) {
                  fullDeviceData = deviceDetailData
                  console.log('[DEVICES API] ✅ Got full device data with modules for:', device.serial_number)
                }
              }
            } catch (error) {
              console.warn('[DEVICES API] ⚠️ Failed to fetch full device data for:', device.serial_number, error)
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

            const lastSeenValue = sourceData.metadata?.collectedAt || device.last_seen
            const calculatedStatus = calculateDeviceStatus(lastSeenValue)

            return {
              deviceId: sourceData.metadata?.deviceId || device.id || device.deviceId,
              serialNumber: sourceData.metadata?.serialNumber || device.serial_number || device.serialNumber,
              name: sourceData.inventory?.deviceName || sourceData.name || device.name || device.serialNumber || device.serial_number,
              lastSeen: lastSeenValue,
              status: sourceData.status || device.status || calculatedStatus,
              clientVersion: sourceData.metadata?.clientVersion || device.client_version || '1.0.0',
              assetTag: sourceData.inventory?.assetTag,
              location: sourceData.inventory?.location,
              modules: {
                inventory: sourceData.inventory,
                applications: sourceData.applications,
                security: sourceData.security,
                services: sourceData.services,
                system: sourceData.system,
                hardware: sourceData.hardware,
                network: sourceData.network,
                displays: sourceData.displays,
                printers: sourceData.printers,
                profiles: sourceData.profiles,
                management: sourceData.management,
                installs: sourceData.installs
              },
              totalEvents: 0,
              lastEventTime: sourceData.metadata?.collectedAt || device.last_seen
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

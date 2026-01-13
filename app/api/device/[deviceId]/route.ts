import { NextRequest, NextResponse } from 'next/server'
import { getInternalApiHeaders } from '@/lib/api-auth'

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Helper function to convert PowerShell object strings to JSON objects
function parsePowerShellObject(str: string, parentKey?: string, originalObj?: unknown): unknown {
  if (typeof str !== 'string' || !str.startsWith('@{') || !str.endsWith('}')) {
    return str
  }
  
  try {
    // Remove @{ and } wrapper
    const content = str.slice(2, -1).trim()
    
    if (!content) return {}
    
    // Split by semicolons and parse key-value pairs
    const pairs = content.split(';')
    const result: Record<string, unknown> = {}
    
    for (const pair of pairs) {
      const equalIndex = pair.indexOf('=')
      if (equalIndex === -1) continue
      
      const key = pair.slice(0, equalIndex).trim()
      const valueStr = pair.slice(equalIndex + 1).trim()
      
      if (!key) continue
      
      // Handle different value types
      if (valueStr === '') {
        result[key] = ''
      } else if (valueStr === 'True') {
        result[key] = true
      } else if (valueStr === 'False') {
        result[key] = false
      } else if (/^\d+$/.test(valueStr)) {
        result[key] = parseInt(valueStr, 10)
      } else if (/^\d+\.\d+$/.test(valueStr)) {
        result[key] = parseFloat(valueStr)
      } else if (valueStr.startsWith('@{') && valueStr.endsWith('}')) {
        // Nested PowerShell object
        result[key] = parsePowerShellObject(valueStr, key, originalObj)
      } else if (valueStr.startsWith('System.Object[]')) {
        // PowerShell array - this contains actual data that needs to be preserved
        // TODO: Implement proper PowerShell array parsing
        // For now, mark as array for downstream processing instead of discarding
        console.warn('[DEVICE API] PowerShell array detected but not parsed:', key, '- preserving for processing')
        result[key] = { _powershellArray: true, _rawValue: valueStr }
      } else {
        result[key] = valueStr
      }
    }
    
    return result
  } catch (error) {
    console.warn('Failed to parse PowerShell object:', str.substring(0, 100), error)
    return str
  }
}

// Recursively process object to convert PowerShell object strings
function convertPowerShellObjects(obj: unknown, parentKey?: string, originalObj?: unknown): unknown {
  if (typeof obj === 'string') {
    // Pass context to parsePowerShellObject for better array handling
    return parsePowerShellObject(obj, parentKey, originalObj)
  } else if (Array.isArray(obj)) {
    // Preserve arrays as-is, but process their contents
    return obj.map((item, index) => convertPowerShellObjects(item, `${parentKey}[${index}]`, obj))
  } else if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      // For known array fields, preserve original data if available
      if (['events', 'items', 'sessions'].includes(key) && Array.isArray(value)) {
                result[key] = value // Preserve original array data
      } else {
        result[key] = convertPowerShellObjects(value, key, obj)
      }
    }
    return result
  }
  return obj
}

// Type definitions
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await params
        
    // Use server-side API base URL configuration
    const apiBaseUrl = process.env.API_BASE_URL
    
    if (!apiBaseUrl) {
      console.error('[DEVICE API] API_BASE_URL environment variable not configured')
      console.error('[DEVICE API] Available env vars:', Object.keys(process.env))
      return NextResponse.json({
        error: 'API configuration error',
        details: 'API_BASE_URL environment variable not configured',
        debug: {
          envVars: Object.keys(process.env).filter(k => k.includes('API')),
          nodeEnv: process.env.NODE_ENV
        }
      }, { status: 500 })
    }
    
        const azureFunctionsUrl = `${apiBaseUrl}/api/device/${encodeURIComponent(deviceId)}`
        
    // Use shared authentication headers
    const headers = getInternalApiHeaders()
    
    const response = await fetch(azureFunctionsUrl, {
      cache: 'no-store',
      headers
    })
    
            
    if (!response.ok) {
      console.error('[DEVICE API] Azure Functions API error:', response.status, response.statusText)
      console.error('[DEVICE API] Response headers:', Object.fromEntries(response.headers.entries()))
      
      // Read error body once and parse it
      let errorDetails = `API returned ${response.status}: ${response.statusText}`
      try {
        const errorBody = await response.text()
        console.error('[DEVICE API] Error response body:', errorBody)
        
        // Try to parse error details from response
        try {
          const errorJson = JSON.parse(errorBody)
          if (errorJson.detail) {
            errorDetails = errorJson.detail
          } else if (errorJson.error) {
            errorDetails = errorJson.error
          }
        } catch {
          // Not JSON, use text as-is
          errorDetails = errorBody || errorDetails
        }
      } catch (bodyError) {
        console.error('[DEVICE API] Could not read error response body:', bodyError)
      }
      
      // Pass through 404 errors cleanly (device not found)
      if (response.status === 404) {
                return NextResponse.json({
          success: false,
          error: 'Device not found',
          details: errorDetails
        }, { 
          status: 404,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        })
      }
      
      // For other errors, return 502 (Bad Gateway) to indicate upstream API failure
      console.error('[DEVICE API] Upstream API error - returning 502')
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch device from upstream API',
        details: errorDetails
      }, { 
        status: 502,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
    }

    const data = await response.json()
                
    // DEBUG: Log the raw response to understand the structure
        
        
    // Handle new nested Azure Functions format: {success: true, device: {modules: {...}}}
    if (data.success && data.device && data.device.modules) {
            
      const device = data.device
      const modules = device.modules
      
            
      // Convert any PowerShell objects in the modules
            const cleanedModules = convertPowerShellObjects(modules, 'modules', data) as Record<string, unknown>
            
        const responseData = {
          success: true,
          device: {
            deviceId: device.deviceId,
            serialNumber: device.serialNumber,
            // Let frontend calculate status based on lastSeen timestamp
            lastSeen: device.lastSeen || device.collectedAt,
            createdAt: device.createdAt, // Include registration date
            clientVersion: device.clientVersion || '1.0.0',
            modules: cleanedModules
          }
        }
      
            
      // TIMESTAMP SYNCHRONIZATION: Fetch recent events to update lastSeen
      try {
                const deviceEventsUrl = `${apiBaseUrl}/api/events?device=${encodeURIComponent(deviceId)}&limit=1`
                
        // Use shared auth headers for internal API calls
        const eventsHeaders = getInternalApiHeaders()
        
        const eventsResponse = await fetch(deviceEventsUrl, {
          headers: eventsHeaders
        })
        
        if (eventsResponse.ok) {
          const eventsData = await eventsResponse.json()
                    
          if (eventsData.success && eventsData.events && eventsData.events.length > 0) {
            const latestEvent = eventsData.events[0] // Events should be sorted by timestamp desc
            const eventTimestamp = latestEvent.ts || latestEvent.timestamp || latestEvent.created_at
            
            if (eventTimestamp) {
                            responseData.device.lastSeen = eventTimestamp
            }
          }
        } else {
                  }
      } catch (eventsError) {
        console.error('[DEVICE API] Error fetching events for timestamp sync:', eventsError)
        // Continue without timestamp sync if events fetch fails
      }
      
            
      return NextResponse.json(responseData, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
    }
    // Handle legacy unified structure - data is the device info directly
    else if (data.metadata) {
      const metadata = data.metadata
      
            
      // Build clean modules object with proper ordering: inventory, system, hardware, management, then alphabetical
      const modules: Record<string, unknown> = {}
      const moduleOrder = ['inventory', 'system', 'hardware', 'management']
      
      // Add priority modules first
      moduleOrder.forEach(moduleName => {
        if (data[moduleName] && moduleName !== 'metadata') {
          modules[moduleName] = data[moduleName]
        }
      })
      
      // Add remaining modules alphabetically
      const remainingKeys = Object.keys(data)
        .filter(key => key !== 'metadata' && !moduleOrder.includes(key))
        .sort()
      
      remainingKeys.forEach(key => {
        modules[key] = data[key]
      })
      
      // Return CLEAN structure - modules are the ONLY source of truth
      const responseData = {
        success: true,
        device: {
          // Only essential identifiers - NO duplicate data
          deviceId: metadata.deviceId,           // Internal UUID (unique)
          serialNumber: metadata.serialNumber,   // Human-readable ID (unique)
          // Let frontend calculate status based on lastSeen timestamp
          lastSeen: metadata.collectedAt,
          createdAt: metadata.createdAt, // Include registration date
          clientVersion: metadata.clientVersion,
          
          // ALL data comes from modules - frontend must use device.modules.{moduleName} for everything
          modules: modules
        }
      }
      
            
            
      // TIMESTAMP SYNCHRONIZATION: Fetch recent events to update lastSeen
      try {
                const deviceEventsUrl = `${apiBaseUrl}/api/events?device=${encodeURIComponent(deviceId)}&limit=1`
                
        // Use shared auth headers for internal API calls
        const eventsHeaders = getInternalApiHeaders()
        
        const eventsResponse = await fetch(deviceEventsUrl, {
          headers: eventsHeaders
        })
        
        if (eventsResponse.ok) {
          const eventsData = await eventsResponse.json()
                    
          if (eventsData.success && eventsData.events && eventsData.events.length > 0) {
            const latestEvent = eventsData.events[0] // Events should be sorted by timestamp desc
            const eventTimestamp = latestEvent.ts || latestEvent.timestamp || latestEvent.created_at
            
            if (eventTimestamp) {
                            responseData.device.lastSeen = eventTimestamp
            }
          }
        } else {
                  }
      } catch (eventsError) {
        console.error('[DEVICE API] Error fetching events for timestamp sync:', eventsError)
        // Continue without timestamp sync if events fetch fails
      }
      
      return NextResponse.json(responseData, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
    } else {
      // Handle direct Azure Functions response format (without metadata wrapper)
            
      // Check if this is the raw Azure Functions format with direct module properties
      if (data.success && (data.security || data.management || data.inventory)) {
                
        // Extract device metadata from the response
        const deviceMetadata = {
          deviceId: data.metadata?.deviceId || data.deviceId,
          serialNumber: data.metadata?.serialNumber || data.serialNumber,
          collectedAt: data.metadata?.collectedAt || data.collectedAt,
          createdAt: data.metadata?.createdAt || data.createdAt,
          clientVersion: data.metadata?.clientVersion || data.clientVersion || '1.0.0'
        }
        
        // Build modules from the response
        const modules: Record<string, unknown> = {}
        const moduleNames = [
          'applications', 'displays', 'hardware', 'installs', 'inventory',
          'management', 'network', 'peripherals', 'printers', 'profiles', 'security', 'system'
        ]
        
        moduleNames.forEach(moduleName => {
          if (data[moduleName]) {
            modules[moduleName] = data[moduleName]
          }
        })
        
        // Build device name from inventory module (for logging only)
        const deviceIdentifier = data.inventory?.deviceName || deviceMetadata.serialNumber || 'Unknown Device'
        
        // Return properly structured response - STANDARDIZED NESTED FORMAT
        const responseData = {
          success: true,
          device: {
            // Only essential identifiers - NO duplicate data
            deviceId: deviceMetadata.deviceId,           // Internal UUID (unique)
            serialNumber: deviceMetadata.serialNumber,   // Human-readable ID (unique) 
            // Let frontend calculate status based on lastSeen timestamp
            lastSeen: deviceMetadata.collectedAt,
            createdAt: deviceMetadata.createdAt, // Include registration date
            clientVersion: deviceMetadata.clientVersion,
            
            // ALL data comes from modules - frontend must use device.modules.{moduleName} for everything
            modules: modules
          }
        }
        
                        
        // TIMESTAMP SYNCHRONIZATION: Fetch recent events to update lastSeen
        try {
                    const deviceEventsUrl = `${apiBaseUrl}/api/events?device=${encodeURIComponent(deviceId)}&limit=1`
                    
          // Use shared auth headers for internal API calls
          const eventsHeaders = getInternalApiHeaders()
          
          const eventsResponse = await fetch(deviceEventsUrl, {
            headers: eventsHeaders
          })
          
          if (eventsResponse.ok) {
            const eventsData = await eventsResponse.json()
                        
            if (eventsData.success && eventsData.events && eventsData.events.length > 0) {
              const latestEvent = eventsData.events[0] // Events should be sorted by timestamp desc
              const eventTimestamp = latestEvent.ts || latestEvent.timestamp || latestEvent.created_at
              
              if (eventTimestamp) {
                                responseData.device.lastSeen = eventTimestamp
              }
            }
          } else {
                      }
        } catch (eventsError) {
          console.error('[DEVICE API] Error fetching events for timestamp sync (Azure format):', eventsError)
          // Continue without timestamp sync if events fetch fails
        }
        
        return NextResponse.json(responseData, {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        })
      }
    }
    
    // If no metadata found, return error
        return NextResponse.json({
      error: 'Invalid device data structure',
      details: 'Expected unified data format with metadata'
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('[DEVICE API] Error fetching device:', error)
    return NextResponse.json({
      error: 'Failed to fetch device',
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

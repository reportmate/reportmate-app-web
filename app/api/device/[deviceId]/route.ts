import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

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
        console.warn('[DEVICE API] 🚨 PowerShell array detected but not parsed:', key, '- preserving for processing')
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
        console.log(`[DEVICE API] Preserving original ${key} array with ${value.length} items`)
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
  // Check authentication (bypass for localhost development)
  const isLocalhost = _request.nextUrl.hostname === 'localhost' || 
                     _request.nextUrl.hostname === '127.0.0.1' || 
                     _request.nextUrl.hostname === '0.0.0.0' ||
                     process.env.NODE_ENV === 'development'
  
  if (!isLocalhost) {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        details: 'Authentication required'
      }, { status: 401 })
    }
  } else {
    console.log('[DEVICE API] 🔓 Localhost detected - bypassing authentication')
  }

  try {
    const { deviceId } = await params
    console.log('[DEVICE API] 🚀 Starting API call for device:', deviceId)
    console.log('[DEVICE API] 🔧 Environment check:', {
      NODE_ENV: process.env.NODE_ENV,
      hasAPIBaseURL: !!process.env.API_BASE_URL,
      apiBaseUrl: process.env.API_BASE_URL,
      allEnvKeys: Object.keys(process.env).filter(k => k.includes('API')),
    })

    // Use server-side API base URL configuration
    const apiBaseUrl = process.env.API_BASE_URL
    
    if (!apiBaseUrl) {
      console.error('[DEVICE API] ❌ API_BASE_URL environment variable not configured')
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
    
    console.log('[DEVICE API] ✅ Using API base URL:', apiBaseUrl)
    const azureFunctionsUrl = `${apiBaseUrl}/api/device/${encodeURIComponent(deviceId)}`
    console.log('[DEVICE API] 🌐 About to fetch from Azure Functions:', azureFunctionsUrl)
    
    // Get managed identity principal ID from Azure Container Apps
    const managedIdentityId = process.env.AZURE_CLIENT_ID || process.env.MSI_CLIENT_ID

    // Build headers with authentication for localhost
    const headers: Record<string, string> = {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'User-Agent': 'ReportMate-Frontend/1.0'
    }
    
    // Add passphrase authentication if configured (prioritize over Managed Identity)
    if (process.env.REPORTMATE_PASSPHRASE) {
      headers['X-API-PASSPHRASE'] = process.env.REPORTMATE_PASSPHRASE
      console.log('[DEVICE API] 🔑 Added passphrase authentication')
    } else if (managedIdentityId) {
      headers['X-MS-CLIENT-PRINCIPAL-ID'] = managedIdentityId
    }
    
    const response = await fetch(azureFunctionsUrl, {
      cache: 'no-store',
      headers
    })
    
    console.log('[DEVICE API] 📡 Azure Functions response status:', response.status, response.statusText)
    console.log('[DEVICE API] 📡 Azure Functions response headers:', Object.fromEntries(response.headers.entries()))
    
    if (!response.ok) {
      console.error('[DEVICE API] ❌ Azure Functions API error:', response.status, response.statusText)
      console.error('[DEVICE API] ❌ Response headers:', Object.fromEntries(response.headers.entries()))
      
      // Read error body once and parse it
      let errorDetails = `API returned ${response.status}: ${response.statusText}`
      try {
        const errorBody = await response.text()
        console.error('[DEVICE API] ❌ Error response body:', errorBody)
        
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
        console.error('[DEVICE API] ❌ Could not read error response body:', bodyError)
      }
      
      // Pass through 404 errors cleanly (device not found)
      if (response.status === 404) {
        console.log('[DEVICE API] ℹ️  Device not found (404) - passing through')
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
      console.error('[DEVICE API] ❌ Upstream API error - returning 502')
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
    console.log('[DEVICE API] ✅ Successfully fetched device data from Azure Functions')
    console.log('[DEVICE API] � DEBUG: Raw response data:', JSON.stringify(data, null, 2).substring(0, 2000))
    console.log('[DEVICE API] �📊 Response structure:', {
      hasMetadata: 'metadata' in data,
      metadataKeys: data.metadata ? Object.keys(data.metadata) : [],
      responseKeys: Object.keys(data),
      responseSize: JSON.stringify(data).length,
      hasSuccess: 'success' in data,
      successValue: data.success,
      hasDevice: 'device' in data,
      deviceKeys: data.device ? Object.keys(data.device) : [],
      hasModules: data.device && data.device.modules ? Object.keys(data.device.modules) : []
    })
    
    // DEBUG: Log the raw response to understand the structure
    console.log('[DEVICE API] RAW RESPONSE SAMPLE:', JSON.stringify(data, null, 2).substring(0, 1000))
    
    console.log('[DEVICE API] Unified data structure sample:', JSON.stringify({
      metadata: data.metadata,
      moduleKeys: Object.keys(data).filter(k => k !== 'metadata')
    }, null, 2).substring(0, 500) + '...')
    
    // Handle new nested Azure Functions format: {success: true, device: {modules: {...}}}
    if (data.success && data.device && data.device.modules) {
      console.log('[DEVICE API] Handling new nested Azure Functions format')
      
      const device = data.device
      const modules = device.modules
      
      console.log('[DEVICE API] Clean modular response - deviceId:', device.deviceId, 'serialNumber:', device.serialNumber)
      
      // Convert any PowerShell objects in the modules
      console.log('[DEVICE API] Converting PowerShell objects...')
      const cleanedModules = convertPowerShellObjects(modules, 'modules', data) as Record<string, unknown>
      console.log('[DEVICE API] PowerShell conversion complete')
      
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
      
      console.log('[DEVICE API] Clean device response prepared:', {
        deviceId: responseData.device.deviceId,
        serialNumber: responseData.device.serialNumber,
        moduleCount: Object.keys(responseData.device.modules).length,
        moduleNames: Object.keys(responseData.device.modules)
      })
      
      // 🕐 TIMESTAMP SYNCHRONIZATION: Fetch recent events to update lastSeen
      try {
        console.log('[DEVICE API] 🕐 Fetching device events for timestamp synchronization...')
        const deviceEventsUrl = `${apiBaseUrl}/api/events?device=${encodeURIComponent(deviceId)}&limit=1`
        console.log('[DEVICE API] 🕐 Events URL:', deviceEventsUrl)
        
        // Build events headers with authentication for localhost
        const eventsHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
        
        if (process.env.REPORTMATE_PASSPHRASE) {
          eventsHeaders['X-API-PASSPHRASE'] = process.env.REPORTMATE_PASSPHRASE
        } else if (managedIdentityId) {
          eventsHeaders['X-MS-CLIENT-PRINCIPAL-ID'] = managedIdentityId
        }
        
        const eventsResponse = await fetch(deviceEventsUrl, {
          headers: eventsHeaders
        })
        
        if (eventsResponse.ok) {
          const eventsData = await eventsResponse.json()
          console.log('[DEVICE API] 🕐 Events response:', {
            success: eventsData.success,
            hasEvents: Array.isArray(eventsData.events),
            eventsCount: eventsData.events?.length || 0,
            firstEvent: eventsData.events?.[0] ? {
              id: eventsData.events[0].id,
              ts: eventsData.events[0].ts,
              device: eventsData.events[0].device
            } : null
          })
          
          if (eventsData.success && eventsData.events && eventsData.events.length > 0) {
            const latestEvent = eventsData.events[0] // Events should be sorted by timestamp desc
            const eventTimestamp = latestEvent.ts || latestEvent.timestamp || latestEvent.created_at
            
            if (eventTimestamp) {
              console.log('[DEVICE API] 🕐 ⚡ UPDATING lastSeen from', responseData.device.lastSeen, 'to', eventTimestamp)
              responseData.device.lastSeen = eventTimestamp
            }
          }
        } else {
          console.log('[DEVICE API] 🕐 Failed to fetch events for timestamp sync:', eventsResponse.status)
        }
      } catch (eventsError) {
        console.error('[DEVICE API] 🕐 Error fetching events for timestamp sync:', eventsError)
        // Continue without timestamp sync if events fetch fails
      }
      
      console.log('[DEVICE API] Final device response prepared', responseData.device.deviceId)
      
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
      
      console.log('[DEVICE API] Clean modular response - deviceId:', metadata.deviceId, 'serialNumber:', metadata.serialNumber)
      
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
      
      console.log('[DEVICE API] Returning CLEAN modular structure with', Object.keys(modules).length, 'modules')
      
      console.log('🔥🔥🔥 ABOUT TO DO TIMESTAMP SYNC 🔥🔥🔥')
      
      // 🕐 TIMESTAMP SYNCHRONIZATION: Fetch recent events to update lastSeen
      try {
        console.log('[DEVICE API] 🕐 Fetching device events for timestamp synchronization...')
        const deviceEventsUrl = `${apiBaseUrl}/api/events?device=${encodeURIComponent(deviceId)}&limit=1`
        console.log('[DEVICE API] 🕐 Events URL:', deviceEventsUrl)
        
        // Build events headers with authentication for localhost
        const eventsHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
        
        if (process.env.REPORTMATE_PASSPHRASE) {
          eventsHeaders['X-API-PASSPHRASE'] = process.env.REPORTMATE_PASSPHRASE
        } else if (managedIdentityId) {
          eventsHeaders['X-MS-CLIENT-PRINCIPAL-ID'] = managedIdentityId
        }
        
        const eventsResponse = await fetch(deviceEventsUrl, {
          headers: eventsHeaders
        })
        
        if (eventsResponse.ok) {
          const eventsData = await eventsResponse.json()
          console.log('[DEVICE API] 🕐 Events response:', {
            success: eventsData.success,
            hasEvents: Array.isArray(eventsData.events),
            eventsCount: eventsData.events?.length || 0,
            firstEvent: eventsData.events?.[0] ? {
              id: eventsData.events[0].id,
              ts: eventsData.events[0].ts,
              device: eventsData.events[0].device
            } : null
          })
          
          if (eventsData.success && eventsData.events && eventsData.events.length > 0) {
            const latestEvent = eventsData.events[0] // Events should be sorted by timestamp desc
            const eventTimestamp = latestEvent.ts || latestEvent.timestamp || latestEvent.created_at
            
            if (eventTimestamp) {
              console.log('[DEVICE API] 🕐 ⚡ UPDATING lastSeen from', responseData.device.lastSeen, 'to', eventTimestamp)
              responseData.device.lastSeen = eventTimestamp
            }
          }
        } else {
          console.log('[DEVICE API] 🕐 Failed to fetch events for timestamp sync:', eventsResponse.status)
        }
      } catch (eventsError) {
        console.error('[DEVICE API] 🕐 Error fetching events for timestamp sync:', eventsError)
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
      console.log('[DEVICE API] Handling direct Azure Functions response format')
      
      // Check if this is the raw Azure Functions format with direct module properties
      if (data.success && (data.security || data.management || data.inventory)) {
        console.log('[DEVICE API] Found direct Azure Functions format')
        
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
        
        console.log('[DEVICE API] Returning Azure Functions format with', Object.keys(modules).length, 'modules')
        console.log('[DEVICE API] Device identifier:', deviceIdentifier)
        
        // 🕐 TIMESTAMP SYNCHRONIZATION: Fetch recent events to update lastSeen
        try {
          console.log('[DEVICE API] 🕐 Fetching device events for timestamp synchronization (Azure format)...')
          const deviceEventsUrl = `${apiBaseUrl}/api/events?device=${encodeURIComponent(deviceId)}&limit=1`
          console.log('[DEVICE API] 🕐 Events URL:', deviceEventsUrl)
          
          // Build events headers with authentication for localhost
          const eventsHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
          
          if (process.env.REPORTMATE_PASSPHRASE) {
            eventsHeaders['X-API-PASSPHRASE'] = process.env.REPORTMATE_PASSPHRASE
          } else if (managedIdentityId) {
            eventsHeaders['X-MS-CLIENT-PRINCIPAL-ID'] = managedIdentityId
          }
          
          const eventsResponse = await fetch(deviceEventsUrl, {
            headers: eventsHeaders
          })
          
          if (eventsResponse.ok) {
            const eventsData = await eventsResponse.json()
            console.log('[DEVICE API] 🕐 Events response (Azure format):', {
              success: eventsData.success,
              hasEvents: Array.isArray(eventsData.events),
              eventsCount: eventsData.events?.length || 0,
              firstEvent: eventsData.events?.[0] ? {
                id: eventsData.events[0].id,
                ts: eventsData.events[0].ts,
                device: eventsData.events[0].device
              } : null
            })
            
            if (eventsData.success && eventsData.events && eventsData.events.length > 0) {
              const latestEvent = eventsData.events[0] // Events should be sorted by timestamp desc
              const eventTimestamp = latestEvent.ts || latestEvent.timestamp || latestEvent.created_at
              
              if (eventTimestamp) {
                console.log('[DEVICE API] 🕐 ⚡ UPDATING lastSeen (Azure format) from', responseData.device.lastSeen, 'to', eventTimestamp)
                responseData.device.lastSeen = eventTimestamp
              }
            }
          } else {
            console.log('[DEVICE API] 🕐 Failed to fetch events for timestamp sync (Azure format):', eventsResponse.status)
          }
        } catch (eventsError) {
          console.error('[DEVICE API] 🕐 Error fetching events for timestamp sync (Azure format):', eventsError)
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
    console.log('[DEVICE API] No metadata found in response')
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

import { NextRequest, NextResponse } from 'next/server'
import { getInternalApiHeaders } from '@/lib/api-auth'

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Individual Module Data Endpoint
 * Returns only the requested module data for fast, targeted loading
 * 
 * Usage: /api/device/[deviceId]/modules/[moduleName]
 * Example: /api/device/ABC123/modules/hardware
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string; moduleName: string }> }
) {
  try {
    const { deviceId, moduleName } = await params
    
    // Use server-side API base URL configuration
    const apiBaseUrl = process.env.API_BASE_URL
    
    if (!apiBaseUrl) {
      console.error('[MODULE API] API_BASE_URL environment variable not configured')
      return NextResponse.json({
        error: 'API configuration error',
        details: 'API_BASE_URL environment variable not configured'
      }, { status: 500 })
    }
    
        
    // Use shared authentication headers
    const headers = getInternalApiHeaders()
    
    // Get query parameters for pagination
    const url = new URL(request.url)
    const limit = url.searchParams.get('limit') || '100'
        
    // Special handling for events module (events are stored separately)
    if (moduleName === 'events') {
      const eventsUrl = `${apiBaseUrl}/api/device/${encodeURIComponent(deviceId)}/events?limit=${limit}`
            
      const eventsResponse = await fetch(eventsUrl, {
        cache: 'no-store',
        headers: headers
      })
      
      if (!eventsResponse.ok) {
        if (eventsResponse.status === 404) {
          return NextResponse.json({
            success: false,
            error: 'Device not found'
          }, { status: 404 })
        }
        
        return NextResponse.json({
          success: false,
          error: 'Failed to fetch events'
        }, { status: 502 })
      }
      
      const eventsData = await eventsResponse.json()
      
            
      return NextResponse.json({
        success: true,
        module: 'events',
        data: eventsData.events || []
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
    }
    
    // Fetch module data directly from the backend module endpoint (more efficient)
    const moduleUrl = `${apiBaseUrl}/api/device/${encodeURIComponent(deviceId)}/modules/${encodeURIComponent(moduleName)}`
        
    const response = await fetch(moduleUrl, {
      cache: 'no-store',
      headers: headers
    })
    
    if (!response.ok) {
      console.error('[MODULE API] FastAPI error:', response.status, response.statusText)
      
      if (response.status === 404) {
        return NextResponse.json({
          success: false,
          error: 'Device not found'
        }, { status: 404 })
      }
      
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch module from upstream API'
      }, { status: 502 })
    }

    const data = await response.json()
    
    // Handle direct module endpoint response: {success: true, module: "name", data: {...}}
    if (data.success !== undefined && data.module && data.hasOwnProperty('data')) {
            
      // Module endpoint may return data: null if no module data exists
      return NextResponse.json({
        success: data.success,
        module: moduleName,
        data: data.data
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
    }
    
    // Handle nested Azure Functions format: {success: true, device: {modules: {...}}}
    if (data.success && data.device && data.device.modules) {
      const moduleData = data.device.modules[moduleName]
      
      if (!moduleData) {
                return NextResponse.json({
          success: false,
          error: `Module '${moduleName}' not found`,
          availableModules: Object.keys(data.device.modules)
        }, { status: 404 })
      }
      
            
      return NextResponse.json({
        success: true,
        module: moduleName,
        data: moduleData
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
    }
    
    // Handle legacy unified structure
    if (data[moduleName]) {
            
      return NextResponse.json({
        success: true,
        module: moduleName,
        data: data[moduleName]
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
    }
    
    // Module not found - return what we have for debugging
        return NextResponse.json({
      success: false,
      error: `Module '${moduleName}' response format unexpected`,
      responseKeys: Object.keys(data)
    }, { status: 404 })

  } catch (error) {
    console.error(`[MODULE API] Error fetching module:`, error)
    return NextResponse.json({
      error: 'Failed to fetch module',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

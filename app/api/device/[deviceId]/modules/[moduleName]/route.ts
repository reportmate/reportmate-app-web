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
    console.log(`[MODULE API] 🎯 Fetching module '${moduleName}' for device:`, deviceId)

    // Use server-side API base URL configuration
    const apiBaseUrl = process.env.API_BASE_URL
    
    if (!apiBaseUrl) {
      console.error('[MODULE API] ❌ API_BASE_URL environment variable not configured')
      return NextResponse.json({
        error: 'API configuration error',
        details: 'API_BASE_URL environment variable not configured'
      }, { status: 500 })
    }
    
    console.log('[MODULE API] ✅ Using API base URL:', apiBaseUrl)
    
    // Use shared authentication headers
    const headers = getInternalApiHeaders()
    console.log('[MODULE API] 🔐 Using authenticated headers')
    
    // Special handling for events module (events are stored separately)
    if (moduleName === 'events') {
      const eventsUrl = `${apiBaseUrl}/api/device/${encodeURIComponent(deviceId)}/events`
      console.log('[MODULE API] 📅 Fetching events from:', eventsUrl)
      
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
      
      console.log(`[MODULE API] ✅ Successfully fetched ${eventsData.events?.length || 0} events`)
      
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
    
    // Fetch full device data from FastAPI for other modules
    const azureFunctionsUrl = `${apiBaseUrl}/api/device/${encodeURIComponent(deviceId)}`
    console.log('[MODULE API] 🌐 Fetching from:', azureFunctionsUrl)
    
    const response = await fetch(azureFunctionsUrl, {
      cache: 'no-store',
      headers: headers
    })
    
    if (!response.ok) {
      console.error('[MODULE API] ❌ FastAPI error:', response.status, response.statusText)
      
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
    
    // Handle nested Azure Functions format: {success: true, device: {modules: {...}}}
    if (data.success && data.device && data.device.modules) {
      const moduleData = data.device.modules[moduleName]
      
      if (!moduleData) {
        console.log(`[MODULE API] ℹ️  Module '${moduleName}' not found in device data`)
        return NextResponse.json({
          success: false,
          error: `Module '${moduleName}' not found`,
          availableModules: Object.keys(data.device.modules)
        }, { status: 404 })
      }
      
      console.log(`[MODULE API] ✅ Successfully fetched module '${moduleName}'`)
      
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
      console.log(`[MODULE API] ✅ Successfully fetched module '${moduleName}' (legacy format)`)
      
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
    
    // Module not found
    console.log(`[MODULE API] ℹ️  Module '${moduleName}' not found in device data`)
    return NextResponse.json({
      success: false,
      error: `Module '${moduleName}' not found`,
      availableModules: Object.keys(data).filter(k => k !== 'metadata' && k !== 'success')
    }, { status: 404 })

  } catch (error) {
    console.error(`[MODULE API] Error fetching module:`, error)
    return NextResponse.json({
      error: 'Failed to fetch module',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

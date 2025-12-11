import { NextRequest, NextResponse } from 'next/server'

interface DeviceEvent {
  kind?: string
  message?: string  // User-friendly message from the database
  [key: string]: unknown
}

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await params
    console.log('[DEVICE EVENTS API] Fetching events for device:', deviceId)

    // Extract query parameters for pagination
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500) // Max 500, default 100
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)
    console.log('[DEVICE EVENTS API] Query params - limit:', limit, 'offset:', offset)

    // Valid event categories - filter out everything else
    const VALID_EVENT_KINDS = ['system', 'info', 'error', 'warning', 'success']

    // Use server-side API base URL configuration
    const apiBaseUrl = process.env.API_BASE_URL
    
    if (!apiBaseUrl) {
      console.error('[DEVICE EVENTS API] API_BASE_URL environment variable not configured')
      return NextResponse.json({
        error: 'API configuration error',
        details: 'API_BASE_URL environment variable not configured'
      }, { status: 500 })
    }
    
    console.log('[DEVICE EVENTS API] Using API base URL:', apiBaseUrl)
    
    try {
      // Try to fetch from Azure Functions if available
      const response = await fetch(`${apiBaseUrl}/api/device/${encodeURIComponent(deviceId)}/events`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'User-Agent': 'ReportMate-Frontend/1.0'
        },
        signal: AbortSignal.timeout(10000)
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('[DEVICE EVENTS API] Successfully fetched device events from Azure Functions')
        
        // Filter events to only include valid categories
        if (data.success && Array.isArray(data.events)) {
          const filteredEvents = data.events.filter((event: DeviceEvent) => 
            VALID_EVENT_KINDS.includes(event.kind?.toLowerCase() ?? '')
          )
          const filteredData = {
            ...data,
            events: filteredEvents,
            count: filteredEvents.length
          }
          
          return NextResponse.json(filteredData, {
            headers: {
              'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          })
        }
        
        return NextResponse.json(data, {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        })
      } else {
        // API returned error - return empty events (no fake data)
        console.log('[DEVICE EVENTS API] Azure Functions API error:', response.status, response.statusText)
        return NextResponse.json({
          success: true,
          events: [],
          count: 0,
          deviceId: deviceId,
          source: 'api-error',
          timestamp: new Date().toISOString(),
          message: `API returned status ${response.status}`,
          pagination: {
            limit: limit,
            offset: offset,
            returned: 0
          }
        }, {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        })
      }
    } catch (error) {
      // API unavailable - return empty events (no fake data)
      console.log('[DEVICE EVENTS API] Azure Functions API error:', error instanceof Error ? error.message : String(error))
      return NextResponse.json({
        success: true,
        events: [],
        count: 0,
        deviceId: deviceId,
        source: 'api-unavailable',
        timestamp: new Date().toISOString(),
        message: 'Backend API unavailable',
        pagination: {
          limit: limit,
          offset: offset,
          returned: 0
        }
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
    }

  } catch (error) {
    console.error('[DEVICE EVENTS API] Error fetching device events:', error)
    return NextResponse.json({
      error: 'Failed to fetch device events',
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

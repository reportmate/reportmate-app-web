import { NextRequest, NextResponse } from 'next/server'

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
          'X-API-PASSPHRASE': 's3cur3-p@ssphras3!'
        },
        signal: AbortSignal.timeout(10000)
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('[DEVICE EVENTS API] Successfully fetched device events from Azure Functions')
        
        // Filter events to only include valid categories
        if (data.success && Array.isArray(data.events)) {
          const filteredEvents = data.events.filter((event: any) => 
            VALID_EVENT_KINDS.includes(event.kind?.toLowerCase())
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
        console.log('[DEVICE EVENTS API] Azure Functions API error:', response.status, response.statusText)
        // Fall through to local fallback
      }
    } catch (error) {
      console.log('[DEVICE EVENTS API] Azure Functions API error:', error instanceof Error ? error.message : String(error))
      // Fall through to local fallback
    }

    // Return sample events as fallback for the specific device
    console.log('[DEVICE EVENTS API] Using local fallback for device:', deviceId)
    
    const sampleEvents = [
      {
        id: `${deviceId}-evt-001`,
        device: deviceId,
        kind: 'system',
        ts: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        payload: {
          message: 'System information collected',
          component: 'reportmate-client',
          moduleType: 'system'
        }
      },
      {
        id: `${deviceId}-evt-002`, 
        device: deviceId,
        kind: 'info',
        ts: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
        payload: {
          message: 'Device check-in completed',
          clientVersion: '2025.7.22.0'
        }
      },
      {
        id: `${deviceId}-evt-003`,
        device: deviceId, 
        kind: 'success',
        ts: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
        payload: {
          message: 'Data transmission successful',
          transmissionSize: '2.3KB'
        }
      }
    ]
    
    // Return events in the expected format
    return NextResponse.json({
      success: true,
      events: sampleEvents,
      count: sampleEvents.length,
      deviceId: deviceId,
      source: 'local-fallback',
      timestamp: new Date().toISOString(),
      note: 'Azure Functions API not available, using local fallback data'
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

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

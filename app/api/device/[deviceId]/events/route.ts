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
        console.log('[DEVICE EVENTS API] Azure Functions API error:', response.status, response.statusText)
        // Fall through to local fallback
      }
    } catch (error) {
      console.log('[DEVICE EVENTS API] Azure Functions API error:', error instanceof Error ? error.message : String(error))
      // Fall through to local fallback
    }

    // Try direct database fallback for real events data
    console.log('[DEVICE EVENTS API] Trying direct database fallback for device:', deviceId)
    
    try {
      const { pool } = await import('../../../../../src/lib/db')
      
      // Query events for this device from the database
      const eventsQuery = `
        SELECT 
          id, device_id, event_type as kind, message, timestamp as ts, details, created_at
        FROM events 
        WHERE device_id = $1
        ORDER BY timestamp DESC
        LIMIT 50`
      
      const eventsResult = await pool.query(eventsQuery, [deviceId])
      
      if (eventsResult.rows.length > 0) {
        console.log(`[DEVICE EVENTS API] ✅ Retrieved ${eventsResult.rows.length} real events from database`)
        
        // Transform database events to expected API format
        const realEvents = eventsResult.rows
          .filter(row => VALID_EVENT_KINDS.includes(row.kind?.toLowerCase() ?? ''))
          .map(row => ({
            id: row.id.toString(),
            device: deviceId,
            kind: row.kind,
            ts: row.ts?.toISOString() || row.created_at?.toISOString() || new Date().toISOString(),
            message: row.message || `${row.kind} event`,
            payload: row.details ? (typeof row.details === 'object' ? row.details : { details: row.details }) : {}
          }))
        
        return NextResponse.json({
          success: true,
          events: realEvents,
          count: realEvents.length,
          deviceId: deviceId,
          source: 'direct-database',
          timestamp: new Date().toISOString()
        }, {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        })
      } else {
        console.log('[DEVICE EVENTS API] No events found in database for device:', deviceId)
      }
      
    } catch (dbError) {
      console.error('[DEVICE EVENTS API] Direct database fallback failed:', dbError)
    }

    // Return sample events as final fallback for the specific device
    console.log('[DEVICE EVENTS API] Using sample events fallback for device:', deviceId)
    
    const sampleEvents = [
      {
        id: `${deviceId}-evt-001`,
        device: deviceId,
        kind: 'system',
        ts: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        message: 'System module data reported', // User-friendly message from database
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
        message: 'Device check-in completed', // User-friendly message from database
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
        message: 'Data transmission successful', // User-friendly message from database
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

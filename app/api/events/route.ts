import { NextResponse } from 'next/server'

// In-memory event store for development/demo purposes
// In production, this should be stored in a database
let eventStore: any[] = []

export async function GET() {
  try {
    console.log('[EVENTS API] Fetching events from Azure Functions API')

    // Use server-side API base URL configuration for Azure Functions
    const apiBaseUrl = process.env.API_BASE_URL || 'https://reportmate-api.azurewebsites.net'
    console.log('[EVENTS API] Using API base URL:', apiBaseUrl)
    
    try {
      // Try to fetch from Azure Functions if available
      const response = await fetch(`${apiBaseUrl}/api/events`, {
        headers: {
          'X-API-PASSPHRASE': process.env.API_PASSPHRASE || 's3cur3-p@ssphras3!',
          'Content-Type': 'application/json'
        },
        // Add timeout to avoid hanging
        signal: AbortSignal.timeout(10000)
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('[EVENTS API] Successfully fetched events from Azure Functions')
        return NextResponse.json(data)
      } else {
        console.log('[EVENTS API] Azure Functions API error:', response.status, response.statusText)
        // Fall through to local event store with proper error handling
      }
    } catch (error) {
      console.log('[EVENTS API] Azure Functions API error:', error instanceof Error ? error.message : String(error))
      // Fall through to local event store
    }

    // Return local event store as fallback with some sample data if empty
    console.log('[EVENTS API] Using local event store fallback, returning', eventStore.length, 'events')
    
    if (eventStore.length === 0) {
      // Add some sample events for demonstration
      eventStore = [
        {
          id: 'evt-001',
          device: 'localhost',
          kind: 'info',
          ts: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          payload: {
            message: 'System started',
            component: 'reportmate-client'
          }
        },
        {
          id: 'evt-002', 
          device: 'localhost',
          kind: 'warning',
          ts: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
          payload: {
            message: 'High CPU usage detected',
            cpu_percent: 85
          }
        },
        {
          id: 'evt-003',
          device: 'localhost', 
          kind: 'success',
          ts: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
          payload: {
            message: 'Backup completed successfully',
            backup_size: '2.3GB'
          }
        }
      ]
    }
    
    // Return events in the expected format
    return NextResponse.json({
      success: true,
      events: eventStore,
      source: 'local-fallback',
      timestamp: new Date().toISOString(),
      note: 'Azure Functions API not available, using local fallback data'
    })

  } catch (error) {
    console.error('[EVENTS API] Error fetching events:', error)
    return NextResponse.json({
      error: 'Failed to fetch events',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const event = await request.json()
    console.log('[EVENTS API] Received new event:', event)

    // Add timestamp and ID if not present
    const enrichedEvent = {
      id: event.id || `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      device: event.device || event.Device || 'unknown',
      kind: event.kind || event.Kind || 'info',
      ts: event.ts || event.Ts || new Date().toISOString(),
      payload: event.payload || event.Payload || {},
      ...event
    }

    // Add to local store (keep only last 1000 events to prevent memory issues)
    eventStore.unshift(enrichedEvent)
    if (eventStore.length > 1000) {
      eventStore = eventStore.slice(0, 1000)
    }

    console.log('[EVENTS API] Event stored locally. Total events:', eventStore.length)

    // Try to forward to Azure Functions if available
    const apiBaseUrl = process.env.API_BASE_URL
    if (apiBaseUrl) {
      try {
        const response = await fetch(`${apiBaseUrl}/api/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-PASSPHRASE': 's3cur3-p@ssphras3!'
          },
          body: JSON.stringify(enrichedEvent),
          signal: AbortSignal.timeout(5000)
        })
        
        if (response.ok) {
          console.log('[EVENTS API] Event forwarded to Azure Functions successfully')
        } else {
          console.log('[EVENTS API] Failed to forward to Azure Functions:', response.status)
        }
      } catch (forwardError) {
        console.log('[EVENTS API] Could not forward to Azure Functions:', forwardError instanceof Error ? forwardError.message : String(forwardError))
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Event stored successfully',
      eventId: enrichedEvent.id
    })

  } catch (error) {
    console.error('[EVENTS API] Error storing event:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to store event',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
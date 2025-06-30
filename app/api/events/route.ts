import { NextResponse } from 'next/server'

// Simple in-memory storage for recent events (in production, use Redis or database)
let recentEvents: Array<Record<string, unknown>> = [
  {
    id: 'demo-1',
    device: 'JY93C5YGGM', // Celeste Martin's MacBook Air
    kind: 'success',
    ts: new Date(Date.now() - 60000).toISOString(),
    payload: { message: 'Creative Suite update completed successfully', app: 'Adobe Photoshop' }
  },
  {
    id: 'demo-2', 
    device: 'WS-ACC-001', // Jennifer Davis's Dell OptiPlex
    kind: 'warning',
    ts: new Date(Date.now() - 120000).toISOString(),
    payload: { message: 'Disk space running low (15% remaining)', threshold: '85%' }
  },
  {
    id: 'demo-3',
    device: 'FVFXQ2P3JM', // Alex Chen's MacBook Pro
    kind: 'info',
    ts: new Date(Date.now() - 180000).toISOString(),
    payload: { message: 'Development environment updated', version: 'Node.js 20.10.0' }
  },
  {
    id: 'demo-4',
    device: 'LT-SAL-007', // Marcus Thompson's ThinkPad
    kind: 'info',
    ts: new Date(Date.now() - 240000).toISOString(),
    payload: { message: 'CRM sync completed', records: 247 }
  },
  {
    id: 'demo-5',
    device: 'C02ZK8WVLVDQ', // Sarah Johnson's iMac
    kind: 'system',
    ts: new Date(Date.now() - 300000).toISOString(),
    payload: { message: 'System backup completed', size: '2.4 GB' }
  },
  {
    id: 'demo-6',
    device: 'WS-IT-003', // Ryan Martinez's HP Workstation
    kind: 'success',
    ts: new Date(Date.now() - 420000).toISOString(),
    payload: { message: 'Network monitoring tools updated', tools: 'Wireshark, nmap' }
  }
]

export async function GET() {
  try {
    // Return the most recent 50 events
    const events = recentEvents
      .slice(-50)
      .reverse() // Most recent first
      .map(event => ({
        id: event.id || `event-${Date.now()}-${Math.random()}`,
        device: event.device || 'unknown',
        kind: event.kind || 'unknown',
        ts: event.ts || new Date().toISOString(),
        payload: event.payload || {}
      }))

    return NextResponse.json({
      success: true,
      events,
      count: events.length
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const rawEvent = await request.json()
    
    console.log(`[EVENTS API] Received event from device: ${rawEvent.device || 'unknown'}`)
    console.log(`[EVENTS API] Event type/kind: ${rawEvent.kind || 'unknown'}`)
    console.log(`[EVENTS API] Raw data size: ${JSON.stringify(rawEvent).length} bytes`)
    
    // Validate and sanitize the event data
    const event = sanitizeEvent(rawEvent)
    
    console.log(`[EVENTS API] Sanitized event ID: ${event.id}`)
    console.log(`[EVENTS API] Sanitized event kind: ${event.kind}`)
    
    // Add ID if not present
    if (!event.id) {
      event.id = `event-${Date.now()}-${Math.random()}`
    }
    
    // Add timestamp if not present
    if (!event.ts) {
      event.ts = new Date().toISOString()
    }
    
    // Add to recent events
    recentEvents.push(event)
    
    // Keep only last 100 events in memory
    if (recentEvents.length > 100) {
      recentEvents = recentEvents.slice(-100)
    }
    
    return NextResponse.json({
      success: true,
      message: "Event stored",
      eventId: event.id
    })
  } catch (error) {
    console.error('Error processing event:', error)
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 })
  }
}

// Helper function to sanitize event data and prevent dashboard crashes
function sanitizeEvent(rawEvent: any): any {
  try {
    // Handle large Windows client payloads
    if (rawEvent && typeof rawEvent === 'object') {
      // If this looks like a Windows client report (large payload with device info)
      if (rawEvent.device && (rawEvent.systemInfo || rawEvent.osqueryData)) {
        console.log(`Processing Windows client report from device: ${rawEvent.device}`)
        console.log(`Data size: ${JSON.stringify(rawEvent).length} bytes`)
        
        return {
          id: rawEvent.id || `windows-${Date.now()}`,
          device: String(rawEvent.device || 'unknown'),
          kind: 'system',
          ts: rawEvent.timestamp || new Date().toISOString(),
          payload: {
            message: 'Windows client report received',
            type: 'windows_client_report',
            deviceInfo: {
              hostname: rawEvent.device,
              os: rawEvent.systemInfo?.os_name || 'Windows',
              version: rawEvent.systemInfo?.version,
              manufacturer: rawEvent.systemInfo?.manufacturer,
              model: rawEvent.systemInfo?.model,
              computerName: rawEvent.systemInfo?.computer_name
            },
            summary: {
              dataSize: JSON.stringify(rawEvent).length,
              queryResults: rawEvent.osqueryData ? Object.keys(rawEvent.osqueryData).length : 0,
              systemInfoFields: rawEvent.systemInfo ? Object.keys(rawEvent.systemInfo).length : 0,
              timestamp: rawEvent.timestamp || new Date().toISOString()
            },
            // Include first few query results for debugging if needed
            ...(rawEvent.osqueryData && Object.keys(rawEvent.osqueryData).length > 0 && {
              sampleQueries: Object.keys(rawEvent.osqueryData).slice(0, 5)
            })
          }
        }
      }
      
      // For normal events, ensure the structure is safe
      return {
        id: rawEvent.id || `event-${Date.now()}`,
        device: String(rawEvent.device || 'unknown'),
        kind: String(rawEvent.kind || 'info').toLowerCase(),
        ts: rawEvent.ts || new Date().toISOString(),
        payload: sanitizePayload(rawEvent.payload || {})
      }
    }
    
    return rawEvent
  } catch (error) {
    console.error('Error sanitizing event:', error)
    // Return a safe fallback event
    return {
      id: `error-${Date.now()}`,
      device: 'unknown',
      kind: 'error',
      ts: new Date().toISOString(),
      payload: {
        message: 'Failed to process event data',
        error: 'Event sanitization failed'
      }
    }
  }
}

// Helper function to sanitize payload and prevent JSON.stringify issues
function sanitizePayload(payload: any): Record<string, unknown> {
  if (!payload || typeof payload !== 'object') {
    return { message: String(payload || 'No payload') }
  }
  
  try {
    // Test if the payload can be safely stringified
    const payloadStr = JSON.stringify(payload)
    
    // If payload is too large, summarize it
    const payloadSize = payloadStr.length
    if (payloadSize > 10000) { // 10KB limit for display
      console.log(`[SANITIZE] Large payload detected: ${payloadSize} bytes, summarizing...`)
      return {
        message: 'Large data payload received',
        dataSize: payloadSize,
        keys: Object.keys(payload).slice(0, 10), // First 10 keys
        truncated: true,
        // Preserve important summary fields if they exist
        ...(payload.message && { originalMessage: payload.message }),
        ...(payload.type && { type: payload.type }),
        ...(payload.deviceInfo && { deviceInfo: payload.deviceInfo }),
        ...(payload.summary && { summary: payload.summary })
      }
    }
    
    return payload
  } catch (error) {
    // If JSON.stringify fails (circular references, etc.), create a safe version
    console.error('[SANITIZE] Payload contains non-serializable data:', error)
    return {
      message: 'Complex data payload (non-serializable)',
      type: typeof payload,
      keys: Object.keys(payload).slice(0, 10),
      hasCircularRefs: true,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

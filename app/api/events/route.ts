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
    const event = await request.json()
    
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
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { pool } from '../../../src/lib/db'

export async function GET() {
  try {
    console.log('[EVENTS API] Fetching events from production database...')
    
    // Query the production database for recent events
    const result = await pool.query(`
      SELECT 
        id,
        device_id as device,
        kind,
        ts,
        payload,
        created_at
      FROM events 
      ORDER BY created_at DESC 
      LIMIT 50
    `)
    
    console.log(`[EVENTS API] Retrieved ${result.rows.length} events from database`)
    
    // Transform database rows to API format
    const events = result.rows.map(row => ({
      id: row.id,
      device: row.device || 'unknown',
      kind: row.kind || 'info',
      ts: row.ts || row.created_at,
      payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload || {}
    }))

    return NextResponse.json({
      success: true,
      events,
      count: events.length,
      source: 'production-database'
    })
  } catch (error) {
    console.error('[EVENTS API] Database query failed:', error)
    
    // Fallback to demo data if database fails
    const fallbackEvents = [
      {
        id: 'fallback-1',
        device: 'database-error',
        kind: 'error',
        ts: new Date().toISOString(),
        payload: { 
          message: 'Database connection failed, using fallback data',
          error: error instanceof Error ? error.message : String(error)
        }
      }
    ]
    
    return NextResponse.json({
      success: true,
      events: fallbackEvents,
      count: fallbackEvents.length,
      source: 'fallback-demo',
      error: error instanceof Error ? error.message : String(error)
    })
  }
}

export async function POST(request: Request) {
  try {
    const rawEvent = await request.json()
    
    console.log(`[EVENTS API] Received event from device: ${rawEvent.device || 'unknown'}`)
    
    // Basic sanitization for large payloads
    const event = {
      id: rawEvent.id || `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      device: String(rawEvent.device || 'unknown'),
      kind: String(rawEvent.kind || 'info'),
      ts: rawEvent.ts || new Date().toISOString(),
      payload: rawEvent.payload || {}
    }

    // ENFORCE DEVICE REGISTRATION: Reject events from unregistered devices
    if (!event.device || event.device === 'unknown') {
      console.log(`[EVENTS API] REJECTED: Event missing device serial number`)
      return NextResponse.json({
        success: false,
        error: "Device serial number is required",
        code: "DEVICE_SERIAL_REQUIRED"
      }, { status: 400 })
    }

    // Store event in production database
    try {
      // First, check if the device is already registered
      const deviceCheck = await pool.query(`
        SELECT id, name FROM devices WHERE id = $1
      `, [event.device])
      
      if (deviceCheck.rows.length === 0) {
        console.log(`[EVENTS API] REJECTED: Device ${event.device} is not registered`)
        return NextResponse.json({
          success: false,
          error: `Device '${event.device}' is not registered. Please register the device first.`,
          code: "DEVICE_NOT_REGISTERED",
          deviceId: event.device
        }, { status: 403 })
      }
      
      console.log(`[EVENTS API] Device ${event.device} is registered: ${deviceCheck.rows[0].name}`)
      
      // Update device last_seen timestamp
      await pool.query(`
        UPDATE devices 
        SET updated_at = NOW(), last_seen = NOW()
        WHERE id = $1
      `, [event.device])
      
      // Insert the event with device_id reference
      const insertResult = await pool.query(`
        INSERT INTO events (id, device_id, kind, ts, payload, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING id
      `, [
        event.id,
        event.device, // This is now the device_id
        event.kind,
        event.ts,
        JSON.stringify(event.payload)
      ])
      
      console.log(`[EVENTS API] Event stored in database with ID: ${insertResult.rows[0].id}`)
      
      return NextResponse.json({
        success: true,
        message: "Event stored in production database",
        eventId: event.id
      })
      
    } catch (dbError) {
      console.error('[EVENTS API] Database insert failed:', dbError)
      
      return NextResponse.json({
        success: false,
        error: "Failed to store event in database",
        details: dbError instanceof Error ? dbError.message : String(dbError)
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('Error processing event:', error)
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'

// Cache for bulk events data
let eventsCache: any[] = []
let cacheTimestamp: number = 0
const CACHE_DURATION = 30 * 1000 // 30 seconds

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  try {
    const timestamp = new Date().toISOString()
    console.log(`[BULK EVENTS API] ${timestamp} - Fetching bulk events data`)

    // Parse query parameters
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '100')
    const deviceFilter = url.searchParams.get('device') // Optional device filter
    const kindFilter = url.searchParams.get('kind') // Optional event type filter

    // Check cache first (only if no specific filters applied)
    const now = Date.now()
    if (!deviceFilter && !kindFilter && eventsCache.length > 0 && (now - cacheTimestamp) < CACHE_DURATION) {
      console.log(`[BULK EVENTS API] ${timestamp} - Serving from cache: ${eventsCache.length} events`)
      return NextResponse.json(eventsCache.slice(0, limit), {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'X-Fetched-At': new Date(cacheTimestamp).toISOString(),
          'X-Data-Source': 'in-memory-cache'
        }
      })
    }

    console.log(`[BULK EVENTS API] ${timestamp} - Fetching fresh data`)

    // Get database connection
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pool } = require('pg')
    const pool = new Pool({ connectionString: process.env.DATABASE_URL })

    try {
      // Build dynamic query based on filters
      let whereClause = 'WHERE d.serial_number IS NOT NULL'
      const queryParams: any[] = []
      let paramIndex = 1

      if (deviceFilter) {
        whereClause += ` AND d.serial_number = $${paramIndex}`
        queryParams.push(deviceFilter)
        paramIndex++
      }

      if (kindFilter) {
        whereClause += ` AND e.event_type = $${paramIndex}`
        queryParams.push(kindFilter.toLowerCase())
        paramIndex++
      }

      const query = `
        SELECT 
          e.event_type,
          e.message,
          e.details,
          e.timestamp,
          d.serial_number,
          d.device_id,
          -- Get device name from inventory
          inv.data->>'deviceName' as device_name,
          inv.data->>'computerName' as computer_name
        FROM events e
        INNER JOIN devices d ON e.device_id = d.id
        LEFT JOIN inventory inv ON d.id = inv.device_id
        ${whereClause}
        ORDER BY e.timestamp DESC
        LIMIT $${paramIndex}
      `

      queryParams.push(limit)

      const result = await pool.query(query, queryParams)
      console.log(`[BULK EVENTS API] ${timestamp} - Got ${result.rows.length} events from database`)

      // Transform events to the expected format
      const processedEvents = result.rows.map((row: any) => {
        const deviceName = row.device_name || row.computer_name || row.serial_number || 'Unknown Device'
        
        return {
          id: `${row.device_id}_${row.timestamp}`,
          device: row.serial_number,
          deviceId: row.device_id,
          deviceName: deviceName,
          kind: row.event_type,
          ts: row.timestamp,
          message: row.message,
          payload: typeof row.details === 'string' ? JSON.parse(row.details) : row.details,
          timestamp: row.timestamp,
          eventType: row.event_type
        }
      })

      await pool.end()

      // Update cache (only for unfiltered requests)
      if (!deviceFilter && !kindFilter) {
        eventsCache = processedEvents
        cacheTimestamp = now
      }

      console.log(`[BULK EVENTS API] ${timestamp} - Processed ${processedEvents.length} events`)
      
      return NextResponse.json(processedEvents, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'X-Fetched-At': timestamp,
          'X-Data-Source': 'database-fresh',
          'X-Total-Events': processedEvents.length.toString(),
          'X-Applied-Filters': JSON.stringify({ device: deviceFilter, kind: kindFilter, limit })
        }
      })

    } finally {
      // Ensure pool is closed
      try {
        await pool.end()
      } catch (poolError) {
        console.warn(`[BULK EVENTS API] ${timestamp} - Error closing pool:`, poolError)
      }
    }

  } catch (error) {
    console.error('[BULK EVENTS API] Error:', error)
    
    // If we have cached data and no filters, return it even if fresh fetch fails
    if (eventsCache.length > 0) {
      console.log(`[BULK EVENTS API] Falling back to stale cache: ${eventsCache.length} events`)
      return NextResponse.json(eventsCache, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'X-Fetched-At': new Date(cacheTimestamp).toISOString(),
          'X-Data-Source': 'stale-cache-fallback',
          'X-Warning': 'Fresh-data-fetch-failed'
        }
      })
    }
    
    return NextResponse.json({
      error: 'Failed to fetch bulk events data',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

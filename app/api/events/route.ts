import { NextResponse } from 'next/server';

// Import database fallback
async function getEventsFromDatabase(limit = 100) {
  const { Pool } = require('pg');
  const DATABASE_CONNECTION_STRING = process.env.DATABASE_CONNECTION_STRING || 
    'postgresql://reportmate:2sSWbVxyqjXp9WUpeMmzRaC@reportmate-database.postgres.database.azure.com:5432/reportmate?sslmode=require';
  
  const pool = new Pool({ connectionString: DATABASE_CONNECTION_STRING });
  
  try {
    console.log('[DATABASE FALLBACK] Querying events directly from database');
    
    const query = `
      SELECT id, device_id, event_type, message, details, timestamp
      FROM events 
      ORDER BY timestamp DESC 
      LIMIT $1
    `;
    
    const result = await pool.query(query, [limit]);
    
    // Format events to match frontend expectations
    const formattedEvents = result.rows.map((row: any) => {
      // Parse details if it's JSON
      let details = row.details;
      if (details && typeof details === 'string') {
        try {
          details = JSON.parse(details);
        } catch (e) {
          details = { raw: details };
        }
      }

      return {
        id: row.id.toString(),
        device: row.device_id,          // Map device_id to device
        kind: row.event_type,           // Map event_type to kind
        message: row.message || '',
        payload: details || {},         // Map details to payload
        ts: row.timestamp ? new Date(row.timestamp).toISOString() : new Date().toISOString()
      };
    });
    
    console.log(`[DATABASE FALLBACK] Successfully fetched ${formattedEvents.length} events from database`);
    
    return {
      success: true,
      events: formattedEvents,
      count: formattedEvents.length,
      source: 'database-direct',
      timestamp: new Date().toISOString()
    };
    
  } catch (error: any) {
    console.error('[DATABASE FALLBACK] Error querying database:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

interface RawEvent {
  id: string
  device?: string
  device_id?: string
  kind?: string
  ts?: string
  timestamp?: string
  message?: string  // User-friendly message from the database
  payload?: Record<string, unknown>
}

interface NormalizedEvent {
  id: string
  device: string
  kind: string
  ts: string
  message?: string  // User-friendly message from the database
  payload: Record<string, unknown>
}

const AZURE_FUNCTIONS_BASE_URL = process.env.AZURE_FUNCTIONS_BASE_URL || 'https://reportmate-api.azurewebsites.net';

export async function GET() {
  try {
    console.log('[EVENTS API] Fetching events from Azure Functions API');
    console.log('[EVENTS API] Using API base URL:', AZURE_FUNCTIONS_BASE_URL);

    // Valid event categories - filter out everything else
    const VALID_EVENT_KINDS = ['system', 'info', 'error', 'warning', 'success', 'data_collection'];

    // Try Azure Functions API with very short timeout
    try {
      console.log('[EVENTS API] Attempting to fetch from:', `${AZURE_FUNCTIONS_BASE_URL}/api/events`);
      
      // Use shorter timeout (3 seconds) to avoid long waits
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      const response = await fetch(`${AZURE_FUNCTIONS_BASE_URL}/api/events`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store', // Ensure fresh data
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        console.log('[EVENTS API] Successfully fetched events from Azure Functions');
        console.log('[EVENTS API] Raw response structure:', {
          success: data.success,
          eventCount: data.events?.length || 0,
          firstEvent: data.events?.[0] ? {
            id: data.events[0].id,
            device: data.events[0].device || data.events[0].device_id,
            kind: data.events[0].kind,
            ts: data.events[0].ts || data.events[0].timestamp,
            payloadType: typeof data.events[0].payload,
            payloadKeys: data.events[0].payload && typeof data.events[0].payload === 'object' 
              ? Object.keys(data.events[0].payload) 
              : 'not object'
          } : 'no events'
        });
        
        // Filter events to only include valid categories and normalize field names
        if (data.success && Array.isArray(data.events)) {
          const normalizedEvents = data.events.map((event: RawEvent): NormalizedEvent => ({
            id: event.id,
            device: event.device || event.device_id || 'unknown',  // Handle both field names
            kind: event.kind || 'unknown',
            ts: event.ts || event.timestamp || new Date().toISOString(),          // Handle both field names
            message: event.message,  // Include user-friendly message from database
            payload: event.payload || {}              // Preserve the original payload structure
          }));
          
          const filteredEvents = normalizedEvents.filter((event: NormalizedEvent) => 
            VALID_EVENT_KINDS.includes(event.kind?.toLowerCase())
          );
          
          const filteredData = {
            ...data,
            events: filteredEvents,
            count: filteredEvents.length
          };
          console.log('[EVENTS API] Normalized and filtered events count:', filteredEvents.length);
          return NextResponse.json(filteredData);
        }
        
        return NextResponse.json(data);
      } else {
        console.log('[EVENTS API] Azure Functions API error:', response.status, response.statusText);
        // Fall through to local fallback
      }
    } catch (fetchError) {
      if (fetchError instanceof Error) {
        if (fetchError.name === 'AbortError') {
          console.log('[EVENTS API] Azure Functions API timed out after 3 seconds - using fallback data');
        } else {
          console.log('[EVENTS API] Azure Functions API fetch error:', fetchError.message);
        }
      } else {
        console.log('[EVENTS API] Azure Functions API fetch error:', String(fetchError));
      }
      // Fall through to direct database query
    }

    // Try direct database query as backup
    try {
      console.log('[EVENTS API] Trying direct database fallback');
      const databaseResult = await getEventsFromDatabase(100);
      
      // Filter events to only include valid categories
      if (databaseResult.success && Array.isArray(databaseResult.events)) {
        const filteredEvents = databaseResult.events.filter((event: any) => 
          VALID_EVENT_KINDS.includes(event.kind?.toLowerCase())
        );
        
        const filteredData = {
          ...databaseResult,
          events: filteredEvents,
          count: filteredEvents.length
        };
        console.log('[EVENTS API] Direct database query successful, returning', filteredEvents.length, 'filtered events');
        return NextResponse.json(filteredData);
      }
    } catch (dbError) {
      console.log('[EVENTS API] Direct database fallback failed:', dbError instanceof Error ? dbError.message : String(dbError));
      // Fall through to hardcoded fallback
    }

    // Return events based on actual device IDs in the database as fallback
    console.log('[EVENTS API] Using local fallback data with real device IDs');
    
    const fallbackEvents = [
      // Events for device 0F33V9G25083HJ (primary test device)
      {
        id: 'sample-evt-001',
        device: '0F33V9G25083HJ',
        kind: 'info',
        ts: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        message: 'Peripherals module data reported', // User-friendly message from database
        payload: {
          summary: 'Peripherals module data reported',
          message: 'Peripherals module data reported',
          module_id: 'peripherals'
        }
      },
      {
        id: 'sample-evt-002',
        device: '0F33V9G25083HJ', 
        kind: 'info',
        ts: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
        message: 'Inventory, System modules data reported', // User-friendly message from database
        payload: {
          summary: 'Data collection completed for 2 modules',
          modules: ['inventory', 'system'],
          collection_type: 'routine',
          module_id: 'system'
        }
      },
      {
        id: 'sample-evt-003',
        device: '0F33V9G25083HJ',
        kind: 'success',
        ts: new Date(Date.now() - 900000).toISOString(), // 15 minutes ago
        message: 'System module data reported', // User-friendly message from database
        payload: {
          message: 'System module data reported',
          operating_system: 'Windows 11 Pro',
          module_status: 'success'
        }
      },
      // Events for FINAL-TEST-456
      {
        id: 'sample-evt-004',
        device: 'FINAL-TEST-456',
        kind: 'info',
        ts: new Date(Date.now() - 14400000).toISOString(), // 4 hours ago
        payload: {
          message: 'Data collection completed for 2 modules',
          modules_processed: ['system', 'inventory'],
          collection_type: 'routine'
        }
      },
      // Events for TEST123
      {
        id: 'sample-evt-005',
        device: 'TEST123',
        kind: 'info',
        ts: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        payload: {
          message: 'Test device check-in',
          component: 'reportmate-client'
        }
      }
    ];

    return NextResponse.json({
      success: true,
      events: fallbackEvents,
      count: fallbackEvents.length,
      source: 'fallback',
      note: 'Azure Functions API unavailable - using fallback events with real device IDs',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[EVENTS API] Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';

// DISABLED - Always use cloud infrastructure only
async function getEventsFromDatabase(limit = 100) {
  console.error('[EVENTS API] DATABASE FALLBACK DISABLED - Use cloud infrastructure only')
  throw new Error('Database fallback is disabled - use cloud infrastructure only')
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
      
      // Use longer timeout (15 seconds) for Azure Functions
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
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
          console.log('[EVENTS API] Azure Functions API timed out after 15 seconds - using fallback data');
        } else {
          console.log('[EVENTS API] Azure Functions API fetch error:', fetchError.message);
        }
      } else {
        console.log('[EVENTS API] Azure Functions API fetch error:', String(fetchError));
      }
      // Fall through to direct database query
    }

    // Try direct database query as backup
    console.log('[EVENTS API] Azure Functions timeout - attempting direct database query');
    
    try {
      // TODO: Implement direct database query here
      console.log('[EVENTS API] Direct database query not yet implemented');
      return NextResponse.json(
        { error: 'Azure Functions API unavailable and direct database fallback not implemented' },
        { status: 503 }
      );
    } catch (error) {
      console.error('[EVENTS API] Database query failed:', error);
      return NextResponse.json(
        { error: 'Service temporarily unavailable - both Azure Functions and database failed' },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error('[EVENTS API] Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

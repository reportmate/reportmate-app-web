import { NextResponse } from 'next/server';

interface RawEvent {
  id: string
  device?: string
  device_id?: string
  kind?: string
  ts?: string
  timestamp?: string
  payload?: Record<string, unknown>
}

interface NormalizedEvent {
  id: string
  device: string
  kind: string
  ts: string
  payload: Record<string, unknown>
}

const AZURE_FUNCTIONS_BASE_URL = process.env.AZURE_FUNCTIONS_BASE_URL || 'https://reportmate-api.azurewebsites.net';

export async function GET() {
  try {
    console.log('[EVENTS API] Fetching events from Azure Functions API');
    console.log('[EVENTS API] Using API base URL:', AZURE_FUNCTIONS_BASE_URL);

    // Valid event categories - filter out everything else
    const VALID_EVENT_KINDS = ['system', 'info', 'error', 'warning', 'success', 'data_collection'];

    try {
      const response = await fetch(`${AZURE_FUNCTIONS_BASE_URL}/api/events`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store', // Ensure fresh data
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

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
      console.log('[EVENTS API] Azure Functions API fetch error:', fetchError instanceof Error ? fetchError.message : String(fetchError));
      // Fall through to local fallback
    }

    // Return sample events as fallback
    console.log('[EVENTS API] Using local fallback data');
    
    const fallbackEvents = [
      {
        id: 'sample-evt-001',
        device: '0F33V9G25083HJ',
        kind: 'system',
        ts: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        payload: {
          summary: 'Reported 8 modules data',
          moduleCount: 8,
          modules: ['inventory', 'system', 'hardware', 'network', 'security', 'applications', 'displays', 'management'],
          hasFullPayload: true
        }
      },
      {
        id: 'sample-evt-002',
        device: '0F33V9G25083HJ', 
        kind: 'info',
        ts: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
        payload: {
          summary: 'Reported 2 modules data',
          moduleCount: 2,
          modules: ['inventory', 'system'],
          hasFullPayload: true
        }
      },
      {
        id: 'sample-evt-003',
        device: '0F33V9G25083HJ',
        kind: 'success',
        ts: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
        payload: {
          message: 'Data transmission successful',
          transmissionSize: '2.3KB',
          component: 'reportmate-client'
        }
      },
      {
        id: 'sample-evt-004',
        device: 'ABC123DEF456',
        kind: 'warning',
        ts: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
        payload: {
          message: 'Low disk space detected',
          component: 'system-monitor',
          diskUtilization: 85
        }
      },
      {
        id: 'sample-evt-005',
        device: 'XYZ789QRS012',
        kind: 'error',
        ts: new Date(Date.now() - 120000).toISOString(), // 2 minutes ago
        payload: {
          message: 'Failed to connect to management server',
          component: 'network-client',
          error: 'Connection timeout'
        }
      }
    ];

    return NextResponse.json({
      success: true,
      events: fallbackEvents,
      count: fallbackEvents.length,
      source: 'fallback'
    });
  } catch (error) {
    console.error('[EVENTS API] Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';

// Cache for API responses (30 second cache)
let eventsCache: NormalizedEvent[] = []
let eventsCacheTimestamp: number = 0
const EVENTS_CACHE_DURATION = 30 * 1000 // 30 seconds

interface RawEvent {
  id: string
  // Container Apps API fields (new)
  deviceId?: string
  serialNumber?: string
  deviceName?: string
  eventType?: string
  timestamp?: string
  details?: Record<string, unknown>
  message?: string
  // Legacy Azure Functions fields (for compatibility)
  device?: string
  device_id?: string
  kind?: string
  ts?: string
  payload?: Record<string, unknown>
}

interface NormalizedEvent {
  id: string
  device: string
  deviceName?: string  // Enhanced with actual device name
  kind: string
  ts: string
  message?: string  // User-friendly message from the database
  payload: Record<string, unknown>
}

// Function to get device names for events enrichment - now uses shared utility

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get('limit')
    const offsetParam = searchParams.get('offset')
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')
    const limit = limitParam ? parseInt(limitParam, 10) : 100
    const offset = offsetParam ? parseInt(offsetParam, 10) : 0
    
    // Validate parameters  
    const validLimit = Math.min(Math.max(limit, 1), 500) // Between 1 and 500 events
    const validOffset = Math.max(offset, 0) // Non-negative offset
    
    // Validate and format date parameters
    let validStartDate = null
    let validEndDate = null
    if (startDateParam) {
      try {
        validStartDate = new Date(startDateParam).toISOString()
      } catch (parseError) {
        console.warn('[EVENTS API] Invalid startDate parameter:', startDateParam, parseError)
      }
    }
    if (endDateParam) {
      try {
        validEndDate = new Date(endDateParam).toISOString()
      } catch (parseError) {
        console.warn('[EVENTS API] Invalid endDate parameter:', endDateParam, parseError)
      }
    }
    
    const timestamp = new Date().toISOString()
    console.log(`[EVENTS API CACHED] ${timestamp} - Cached events endpoint (limit: ${validLimit}, offset: ${validOffset}, dateRange: ${validStartDate || 'none'} - ${validEndDate || 'none'})`)

    // Get API base URL (consistent with other routes)
    const apiBaseUrl = process.env.API_BASE_URL
    
    if (!apiBaseUrl) {
      console.error('[EVENTS API] API_BASE_URL environment variable not configured')
      return NextResponse.json({
        error: 'Configuration error',
        details: 'API_BASE_URL environment variable not configured'
      }, { status: 500 })
    }

    // Determine if running on localhost
    const isLocalhost = request.headers.get('host')?.includes('localhost') || request.headers.get('host')?.includes('127.0.0.1')

    // Get managed identity principal ID from Azure Container Apps
    const managedIdentityId = process.env.AZURE_CLIENT_ID || process.env.MSI_CLIENT_ID
    
    // Prepare headers with authentication
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'User-Agent': 'ReportMate-Frontend/1.0'
    }
    
    // Prioritize passphrase if available (for local dev or when explicitly configured)
    if (process.env.REPORTMATE_PASSPHRASE) {
      headers['X-API-PASSPHRASE'] = process.env.REPORTMATE_PASSPHRASE
    } else if (managedIdentityId) {
      headers['X-MS-CLIENT-PRINCIPAL-ID'] = managedIdentityId
    }

    // For pagination with date filters, we need fresh data each time
    // Only use cache for limit=50 and offset=0 with no date filters (dashboard requests)
    const shouldCache = validLimit <= 50 && validOffset === 0 && !validStartDate && !validEndDate
    
    if (shouldCache) {
      // Check cache first - but only for dashboard requests
      const now = Date.now()
      if (eventsCache.length > 0 && 
          (now - eventsCacheTimestamp) < EVENTS_CACHE_DURATION && 
          validLimit <= eventsCache.length) {
        console.log(`[EVENTS API CACHED] ${timestamp} - Serving from cache: ${validLimit}/${eventsCache.length} events`)
        const limitedEvents = eventsCache.slice(0, validLimit)
        return NextResponse.json({
          success: true,
          events: limitedEvents,
          totalEvents: eventsCache.length, // Frontend expects totalEvents field
          count: limitedEvents.length
        }, {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache',
            'X-Fetched-At': new Date(eventsCacheTimestamp).toISOString(),
            'X-Data-Source': 'in-memory-cache',
            'X-Event-Limit': validLimit.toString()
          }
        })
      }
    }

    console.log(`[EVENTS API CACHED] ${timestamp} - Fetching fresh data from Azure Functions (limit: ${validLimit}, offset: ${validOffset}, dateRange: ${validStartDate || 'none'} - ${validEndDate || 'none'})`)
    console.log('[EVENTS API] Fetching events from Azure Functions API');
    console.log('[EVENTS API] Using API base URL:', apiBaseUrl);

    // Valid event categories - filter out everything else
    const VALID_EVENT_KINDS = ['system', 'info', 'error', 'warning', 'success', 'data_collection'];

    // Try Azure Functions API with pagination and date filtering support
    try {
      // Build query parameters
      const queryParams = new URLSearchParams()
      queryParams.append('limit', validLimit.toString())
      queryParams.append('offset', validOffset.toString())
      if (validStartDate) queryParams.append('startDate', validStartDate)
      if (validEndDate) queryParams.append('endDate', validEndDate)
      
      const queryString = queryParams.toString()
      const apiUrl = `${apiBaseUrl}/api/events?${queryString}`
      
      console.log('[EVENTS API] Attempting to fetch from:', apiUrl);
      
      // Use longer timeout (15 seconds) for Azure Functions
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers,
        cache: 'no-store', // Ensure fresh data for pagination
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
            // Container Apps API fields
            deviceId: data.events[0].deviceId,
            serialNumber: data.events[0].serialNumber,
            eventType: data.events[0].eventType,
            timestamp: data.events[0].timestamp,
            // Legacy fields for compatibility
            device: data.events[0].device || data.events[0].device_id,
            kind: data.events[0].kind,
            ts: data.events[0].ts,
            payloadType: typeof (data.events[0].details || data.events[0].payload),
            payloadKeys: (data.events[0].details || data.events[0].payload) && typeof (data.events[0].details || data.events[0].payload) === 'object' 
              ? Object.keys(data.events[0].details || data.events[0].payload) 
              : 'not object'
          } : 'no events'
        });
        
        // Filter events to only include valid categories and normalize field names
        // Handle both response formats: {success: true, events: []} or {events: [], total: N}
        const eventsArray = data.events || (Array.isArray(data) ? data : [])
        
        if (Array.isArray(eventsArray) && eventsArray.length > 0) {
          // FastAPI now includes device names with JOIN - no need to enrich here!
          const normalizedEvents = eventsArray.map((event: RawEvent): NormalizedEvent => {
            // Handle both Container Apps API and legacy Azure Functions field names
            const deviceSerial = event.serialNumber || event.device || event.device_id || 'unknown'
            const deviceName = event.deviceName || deviceSerial  // Already included from FastAPI JOIN
            
            return {
              id: event.id,
              device: deviceSerial,  // Keep original serial for compatibility
              deviceName: deviceName,  // Device name from FastAPI (no additional lookup needed!)
              kind: event.eventType || event.kind || 'unknown',
              ts: event.timestamp || event.ts || new Date().toISOString(),
              message: event.message,  // Include user-friendly message from database
              payload: event.details || event.payload || {}
            }
          })
          
          const filteredEvents = normalizedEvents.filter((event: NormalizedEvent) => 
            VALID_EVENT_KINDS.includes(event.kind?.toLowerCase())
          );
          
          const filteredData = {
            success: true, // Always include success field for frontend compatibility
            events: filteredEvents,
            totalEvents: data.total || data.count || filteredEvents.length, // Handle both total and count fields
            count: filteredEvents.length
          };
          
          // Cache the normalized events only for dashboard requests
          if (shouldCache) {
            eventsCache = filteredEvents
            eventsCacheTimestamp = Date.now()
          }
          
          console.log('[EVENTS API] Normalized and filtered events count:', filteredEvents.length);
          console.log(`[EVENTS API CACHED] ${timestamp} - Cached ${filteredEvents.length} events`)
          
          return NextResponse.json(filteredData, {
            headers: {
              'Cache-Control': 'no-store, no-cache, must-revalidate',
              'Pragma': 'no-cache',
              'X-Fetched-At': timestamp,
              'X-Data-Source': 'azure-functions',
              'X-Event-Limit': validLimit.toString()
            }
          });
        }
        
        return NextResponse.json(data);
      } else {
        console.error('[EVENTS API] Azure Functions API error:', response.status, response.statusText);
        try {
          const errorText = await response.text();
          console.error('[EVENTS API] Error details:', errorText);
        } catch (e) {
          console.error('[EVENTS API] Could not read error body');
        }
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

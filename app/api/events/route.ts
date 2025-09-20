import { NextResponse } from 'next/server';

// Cache for API responses (30 second cache)
let eventsCache: NormalizedEvent[] = []
let eventsCacheTimestamp: number = 0
const EVENTS_CACHE_DURATION = 30 * 1000 // 30 seconds

// Cache for device names (shared with devices endpoint)
let deviceNamesCache: Map<string, string> = new Map()
let deviceNamesCacheTimestamp: number = 0
const DEVICE_NAMES_CACHE_DURATION = 60 * 1000 // 1 minute

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
  deviceName?: string  // Enhanced with actual device name
  kind: string
  ts: string
  message?: string  // User-friendly message from the database
  payload: Record<string, unknown>
}

const AZURE_FUNCTIONS_BASE_URL = process.env.AZURE_FUNCTIONS_BASE_URL || 'https://reportmate-api.blackdune-79551938.canadacentral.azurecontainerapps.io';

// Function to get device names for events enrichment
async function getDeviceNames(): Promise<Map<string, string>> {
  const now = Date.now()
  
  // Return cached device names if still fresh
  if (deviceNamesCache.size > 0 && (now - deviceNamesCacheTimestamp) < DEVICE_NAMES_CACHE_DURATION) {
    console.log('[EVENTS API] Using cached device names:', deviceNamesCache.size, 'devices')
    return deviceNamesCache
  }
  
  try {
    console.log('[EVENTS API] Fetching device names for enrichment...')
    
    // Fetch inventory data to get proper device names
    const inventoryResponse = await fetch(`${AZURE_FUNCTIONS_BASE_URL}/api/inventory`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'User-Agent': 'ReportMate-Events/1.0'
      }
    })
    
    if (inventoryResponse.ok) {
      const inventoryData = await inventoryResponse.json()
      const newDeviceNames = new Map<string, string>()
      
      if (Array.isArray(inventoryData)) {
        console.log(`[EVENTS API] Processing ${inventoryData.length} inventory items for device names`)
        
        inventoryData.forEach((item: any) => {
          if (item.serialNumber) {
            let deviceName = item.serialNumber
            
            // Priority 1: Use inventory deviceName if available and meaningful
            if (item.deviceName && 
                item.deviceName.trim() !== '' && 
                item.deviceName !== item.serialNumber &&
                !item.deviceName.toLowerCase().includes('unknown')) {
              deviceName = item.deviceName.trim()
              console.log(`[EVENTS API] Found deviceName for ${item.serialNumber}: "${deviceName}"`)
            } 
            // Priority 2: Fallback to manufacturer + model if deviceName is empty/same as serial
            else if (item.manufacturer && item.model) {
              const manufacturer = item.manufacturer.replace(/Unknown/gi, '').trim()
              const model = item.model.replace(/Unknown/gi, '').trim()
              if (manufacturer && model) {
                deviceName = `${manufacturer} ${model}`
              } else if (manufacturer) {
                deviceName = manufacturer
              } else if (model) {
                deviceName = model
              }
            }
            
            newDeviceNames.set(item.serialNumber, deviceName)
          }
        })
      }
      
      deviceNamesCache = newDeviceNames
      deviceNamesCacheTimestamp = now
      console.log('[EVENTS API] Successfully cached device names for', newDeviceNames.size, 'devices')
      console.log('[EVENTS API] Sample device names:', Array.from(newDeviceNames.entries()).slice(0, 3))
      return newDeviceNames
    } else {
      console.error('[EVENTS API] Inventory API returned error:', inventoryResponse.status, inventoryResponse.statusText)
    }
  } catch (error) {
    console.error('[EVENTS API] Failed to fetch device names:', error)
  }
  
  return deviceNamesCache // Return existing cache even if fetch failed
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? parseInt(limitParam, 10) : 100
    
    // Validate limit parameter
    const validLimit = Math.min(Math.max(limit, 1), 500) // Between 1 and 500 events
    
    const timestamp = new Date().toISOString()
    console.log(`[EVENTS API CACHED] ${timestamp} - Cached events endpoint (limit: ${validLimit})`)

    // Check cache first - but only if requesting same or fewer events than cached
    const now = Date.now()
    if (eventsCache.length > 0 && 
        (now - eventsCacheTimestamp) < EVENTS_CACHE_DURATION && 
        validLimit <= eventsCache.length) {
      console.log(`[EVENTS API CACHED] ${timestamp} - Serving from cache: ${validLimit}/${eventsCache.length} events`)
      const limitedEvents = eventsCache.slice(0, validLimit)
      return NextResponse.json({
        success: true,
        events: limitedEvents,
        count: limitedEvents.length,
        totalCached: eventsCache.length
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

    console.log(`[EVENTS API CACHED] ${timestamp} - Fetching fresh data from Azure Functions (limit: ${validLimit})`)
    console.log('[EVENTS API] Fetching events from Azure Functions API');
    console.log('[EVENTS API] Using API base URL:', AZURE_FUNCTIONS_BASE_URL);

    // Valid event categories - filter out everything else
    const VALID_EVENT_KINDS = ['system', 'info', 'error', 'warning', 'success', 'data_collection'];

    // Try Azure Functions API with very short timeout
    try {
      console.log('[EVENTS API] Attempting to fetch from:', `${AZURE_FUNCTIONS_BASE_URL}/api/events?limit=${validLimit}`);
      
      // Use longer timeout (15 seconds) for Azure Functions
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const response = await fetch(`${AZURE_FUNCTIONS_BASE_URL}/api/events?limit=${validLimit}`, {
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
          // Get device names for enrichment
          const deviceNames = await getDeviceNames()
          
          const normalizedEvents = data.events.map((event: RawEvent): NormalizedEvent => {
            const deviceSerial = event.device || event.device_id || 'unknown'
            const deviceName = deviceNames.get(deviceSerial) || deviceSerial
            
            return {
              id: event.id,
              device: deviceSerial,  // Keep original serial for compatibility
              deviceName: deviceName,  // Add enriched device name
              kind: event.kind || 'unknown',
              ts: event.ts || event.timestamp || new Date().toISOString(),
              message: event.message,  // Include user-friendly message from database
              payload: event.payload || {}
            }
          })
          
          const filteredEvents = normalizedEvents.filter((event: NormalizedEvent) => 
            VALID_EVENT_KINDS.includes(event.kind?.toLowerCase())
          );
          
          const filteredData = {
            ...data,
            events: filteredEvents,
            count: filteredEvents.length
          };
          
          // Cache the normalized events
          eventsCache = filteredEvents
          eventsCacheTimestamp = now
          
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

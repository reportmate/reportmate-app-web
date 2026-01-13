import { NextRequest, NextResponse } from 'next/server';
import { getInternalApiHeaders, getApiBaseUrl } from '@/lib/api-auth';

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const AZURE_FUNCTIONS_BASE_URL = getApiBaseUrl();

  if (!AZURE_FUNCTIONS_BASE_URL) {
    return NextResponse.json({ error: 'API_BASE_URL environment variable is required' }, { status: 500 });
  }
  try {
    const { eventId } = await params
    
    // Get authentication headers for internal API calls
    const headers = getInternalApiHeaders()
    headers['Content-Type'] = 'application/json'

    try {
      const response = await fetch(`${AZURE_FUNCTIONS_BASE_URL}/api/events/${encodeURIComponent(eventId)}/payload`, {
        method: 'GET',
        headers,
        cache: 'no-store',
        signal: AbortSignal.timeout(10000)
      });

      if (response.ok) {
        const data = await response.json();
                return NextResponse.json(data, {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
      } else {
        const errorText = await response.text();
                return NextResponse.json({
          error: 'Event payload not available',
          message: `API returned ${response.status}: ${response.statusText}`,
          eventId: eventId
        }, { 
          status: response.status,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
      }
    } catch (fetchError) {
            
      return NextResponse.json({
        error: 'Event payload not available',
        message: 'Failed to connect to API',
        eventId: eventId
      }, { 
        status: 503,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }

  } catch (error) {
    console.error('[EVENT PAYLOAD API] Error fetching event payload:', error);
    return NextResponse.json({
      error: 'Failed to fetch event payload',
      details: error instanceof Error ? error.message : String(error)
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }
}

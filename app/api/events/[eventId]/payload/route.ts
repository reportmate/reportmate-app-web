import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const AZURE_FUNCTIONS_BASE_URL = process.env.API_BASE_URL;

  if (!AZURE_FUNCTIONS_BASE_URL) {
    return NextResponse.json({ error: 'API_BASE_URL environment variable is required' }, { status: 500 });
  }
  try {
    const { eventId } = await params
    console.log('[EVENT PAYLOAD API] Fetching payload for event:', eventId)

    // Try to fetch from Azure Functions first
    try {
      const response = await fetch(`${AZURE_FUNCTIONS_BASE_URL}/api/events/${encodeURIComponent(eventId)}/payload`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'ReportMate-Frontend/1.0'
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(10000)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[EVENT PAYLOAD API] Successfully fetched payload from Azure Functions');
        return NextResponse.json(data, {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
      } else {
        console.log('[EVENT PAYLOAD API] Azure Functions API error:', response.status, response.statusText);
        // Fall through to local fallback
      }
    } catch (fetchError) {
      console.log('[EVENT PAYLOAD API] Azure Functions API fetch error:', fetchError instanceof Error ? fetchError.message : String(fetchError));
      
      // Return error when real API is not available
      return NextResponse.json({
        error: 'Event payload not available',
        message: 'No real data available from API',
        eventId: eventId
      }, { 
        status: 404,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }

    // Return error when real API returns bad response
    return NextResponse.json({
      error: 'Event payload not available', 
      message: 'No real data available from API',
      eventId: eventId
    }, { 
      status: 404,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

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

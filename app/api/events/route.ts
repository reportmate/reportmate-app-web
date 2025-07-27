import { NextRequest, NextResponse } from 'next/server';

const AZURE_FUNCTIONS_BASE_URL = process.env.AZURE_FUNCTIONS_BASE_URL || 'https://reportmate-api.azurewebsites.net';

export async function GET(request: NextRequest) {
  try {
    console.log('[EVENTS API] Fetching events from Azure Functions API');
    console.log('[EVENTS API] Using API base URL:', AZURE_FUNCTIONS_BASE_URL);

    // Valid event categories - filter out everything else
    const VALID_EVENT_KINDS = ['system', 'info', 'error', 'warning', 'success'];

    const response = await fetch(`${AZURE_FUNCTIONS_BASE_URL}/api/events`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // Ensure fresh data
    });

    if (!response.ok) {
      console.error('[EVENTS API] Azure Functions API error:', response.status, response.statusText);
      return NextResponse.json(
        { error: 'Failed to fetch events from Azure Functions' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[EVENTS API] Successfully fetched events from Azure Functions');
    
    // Filter events to only include valid categories
    if (data.success && Array.isArray(data.events)) {
      const filteredEvents = data.events.filter((event: any) => 
        VALID_EVENT_KINDS.includes(event.kind?.toLowerCase())
      );
      const filteredData = {
        ...data,
        events: filteredEvents,
        count: filteredEvents.length
      };
      return NextResponse.json(filteredData);
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('[EVENTS API] Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

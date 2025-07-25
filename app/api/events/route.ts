import { NextRequest, NextResponse } from 'next/server';

const AZURE_FUNCTIONS_BASE_URL = process.env.AZURE_FUNCTIONS_BASE_URL || 'https://reportmate-api.azurewebsites.net';

export async function GET(request: NextRequest) {
  try {
    console.log('[EVENTS API] Fetching events from Azure Functions API');
    console.log('[EVENTS API] Using API base URL:', AZURE_FUNCTIONS_BASE_URL);

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
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('[EVENTS API] Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

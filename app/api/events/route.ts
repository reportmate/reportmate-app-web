import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('[EVENTS API] Fetching events from Azure Functions API')

    // Use server-side API base URL configuration
    // Priority: 1. Runtime environment variable 2. Build-time variable 3. Default fallback
    const apiBaseUrl = process.env.API_BASE_URL || 
                      process.env.NEXT_PUBLIC_API_BASE_URL || 
                      'https://reportmate-api.azurewebsites.net'
    
    console.log('[EVENTS API] Using API base URL:', apiBaseUrl)
    const response = await fetch(`${apiBaseUrl}/api/events`)
    
    if (!response.ok) {
      console.error('[EVENTS API] Azure Functions API error:', response.status, response.statusText)
      return NextResponse.json({
        error: 'Failed to fetch events from API',
        details: `API returned ${response.status}: ${response.statusText}`
      }, { status: 500 })
    }

    const data = await response.json()
    console.log('[EVENTS API] Successfully fetched events from Azure Functions')
    
    // Return the events data
    return NextResponse.json(data)

  } catch (error) {
    console.error('[EVENTS API] Error fetching events:', error)
    return NextResponse.json({
      error: 'Failed to fetch events',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
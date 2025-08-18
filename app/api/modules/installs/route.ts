import { NextResponse } from 'next/server'

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const timestamp = new Date().toISOString()
    console.log(`[INSTALLS API] ${timestamp} - Fetching installs data`)

    const apiBaseUrl = process.env.API_BASE_URL
    
    if (!apiBaseUrl) {
      console.error(`[INSTALLS API] ${timestamp} - API_BASE_URL environment variable not configured`)
      return NextResponse.json({
        error: 'API configuration error',
        details: 'API_BASE_URL environment variable not configured'
      }, { status: 500 })
    }
    
    let response
    let useLocalFallback = false
    
    // Check if REPORTMATE_PASSPHRASE is configured
    if (!process.env.REPORTMATE_PASSPHRASE) {
      console.error(`[INSTALLS API] ${timestamp} - Missing REPORTMATE_PASSPHRASE environment variable`)
      return NextResponse.json({
        error: 'Configuration error',
        details: 'REPORTMATE_PASSPHRASE environment variable not configured'
      }, { status: 500 })
    }

    try {
      response = await fetch(`${apiBaseUrl}/api/installs`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'X-API-PASSPHRASE': process.env.REPORTMATE_PASSPHRASE
        }
      })
      
      if (!response.ok) {
        console.error(`[INSTALLS API] ${timestamp} - Azure Functions API error:`, response.status, response.statusText)
        useLocalFallback = true
      }
    } catch (fetchError) {
      console.error(`[INSTALLS API] ${timestamp} - Failed to reach Azure Functions API:`, fetchError)
      useLocalFallback = true
    }
    
    if (useLocalFallback) {
      console.log(`[INSTALLS API] ${timestamp} - Azure Functions /api/installs not found - extracting from events`)
      
      try {
        // Try to get installs data from events
        const eventsResponse = await fetch(`${apiBaseUrl}/api/events`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'X-API-PASSPHRASE': process.env.REPORTMATE_PASSPHRASE
          }
        })
        
        if (eventsResponse.ok) {
          const eventsData = await eventsResponse.json()
          
          if (eventsData.success && Array.isArray(eventsData.events)) {
            console.log(`[INSTALLS API] ${timestamp} - Extracting installs data from ${eventsData.events.length} events`)
            
            // Find installs module events
            const installsEvents = eventsData.events.filter((event: any) => 
              event.payload && 
              typeof event.payload === 'object' && 
              event.payload.module_id === 'installs'
            )
            
            const installsData = installsEvents.map((event: any) => ({
              id: event.device,
              deviceId: event.device,
              deviceName: event.device,
              serialNumber: event.device,
              lastSeen: event.ts,
              collectedAt: event.payload.timestamp,
              dataSize: event.payload.data_size_kb,
              collectionType: event.payload.collection_type,
              eventId: event.id,
              message: event.message
            }))
            
            console.log(`[INSTALLS API] ${timestamp} - Found ${installsData.length} installs events`)
            
            return NextResponse.json(installsData, {
              headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache', 
                'Expires': '0',
                'X-Fetched-At': timestamp,
                'X-Data-Source': 'azure-functions-events'
              }
            })
          }
        }
        
        console.error(`[INSTALLS API] ${timestamp} - Events fallback also failed`)
      } catch (eventsError) {
        console.error(`[INSTALLS API] ${timestamp} - Events fallback error:`, eventsError)
      }
      
      // If events fallback also fails, return 503
      return NextResponse.json(
        { error: 'Service temporarily unavailable - cloud infrastructure error' },
        { status: 503 }
      )
    }
    
    // Continue with Azure Functions API response processing if we have a valid response
    if (response) {
      const data = await response.json()
      console.log(`[INSTALLS API] ${timestamp} - Successfully received data from Azure Functions API`)
      
      return NextResponse.json(data, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Fetched-At': timestamp,
          'X-Data-Source': 'azure-functions'
        }
      })
    }
    
    // This should not be reached since we handle the fallback above
    return NextResponse.json({
      error: 'Unexpected error in API routing'
    }, { status: 500 })

  } catch (error) {
    console.error('[INSTALLS API] Error fetching installs:', error)
    return NextResponse.json({
      error: 'Failed to fetch installs data',
      details: error instanceof Error ? error.message : String(error)
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  }
}

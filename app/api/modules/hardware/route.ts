import { NextResponse } from 'next/server'

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const timestamp = new Date().toISOString()
    console.log(`[HARDWARE API] ${timestamp} - Fetching hardware data`)

    const apiBaseUrl = process.env.API_BASE_URL
    
    if (!apiBaseUrl) {
      console.error(`[HARDWARE API] ${timestamp} - API_BASE_URL environment variable not configured`)
      return NextResponse.json({
        error: 'API configuration error',
        details: 'API_BASE_URL environment variable not configured'
      }, { status: 500 })
    }
    
    let response
    let useLocalFallback = false
    
    try {
      response = await fetch(`${apiBaseUrl}/api/hardware`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'X-API-PASSPHRASE': 's3cur3-p@ssphras3!'
        }
      })
      
      if (!response.ok) {
        console.error(`[HARDWARE API] ${timestamp} - Azure Functions API error:`, response.status, response.statusText)
        useLocalFallback = true
      }
    } catch (fetchError) {
      console.error(`[HARDWARE API] ${timestamp} - Failed to reach Azure Functions API:`, fetchError)
      useLocalFallback = true
    }
    
    if (useLocalFallback) {
      console.log(`[HARDWARE API] ${timestamp} - Azure Functions /api/hardware not found - extracting from events`)
      
      try {
        // Try to get hardware data from events
        const eventsResponse = await fetch(`${apiBaseUrl}/api/events`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'X-API-PASSPHRASE': 's3cur3-p@ssphras3!'
          }
        })
        
        if (eventsResponse.ok) {
          const eventsData = await eventsResponse.json()
          
          if (eventsData.success && Array.isArray(eventsData.events)) {
            console.log(`[HARDWARE API] ${timestamp} - Extracting hardware data from ${eventsData.events.length} events`)
            
            // Find hardware module events
            const hardwareEvents = eventsData.events.filter((event: any) => 
              event.payload && 
              typeof event.payload === 'object' && 
              event.payload.module_id === 'hardware'
            )
            
            const hardwareData = hardwareEvents.map((event: any) => ({
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
            
            console.log(`[HARDWARE API] ${timestamp} - Found ${hardwareData.length} hardware events`)
            
            return NextResponse.json(hardwareData, {
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
        
        console.error(`[HARDWARE API] ${timestamp} - Events fallback also failed`)
      } catch (eventsError) {
        console.error(`[HARDWARE API] ${timestamp} - Events fallback error:`, eventsError)
      }
      
      // If events fallback also fails, return 503
      return NextResponse.json(
        { error: 'Service temporarily unavailable - cloud infrastructure error' },
        { status: 503 }
      )
    }
    
    if (!response) {
      throw new Error('Response is undefined')
    }
    
    const data = await response.json()
    console.log(`[HARDWARE API] ${timestamp} - Successfully received data from Azure Functions API`)
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Fetched-At': timestamp,
        'X-Data-Source': 'azure-functions'
      }
    })
    
  } catch (error) {
    console.error('[HARDWARE API] Failed to fetch hardware data:', error)
    return NextResponse.json({
      error: 'API request failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

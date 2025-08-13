import { NextResponse } from 'next/server'

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const timestamp = new Date().toISOString()
    console.log(`[INVENTORY API] ${timestamp} - Fetching inventory data`)

    const apiBaseUrl = process.env.API_BASE_URL
    
    if (!apiBaseUrl) {
      console.error(`[INVENTORY API] ${timestamp} - API_BASE_URL environment variable not configured`)
      return NextResponse.json({
        error: 'API configuration error',
        details: 'API_BASE_URL environment variable not configured'
      }, { status: 500 })
    }
    
    let response
    let useLocalFallback = false
    
    try {
      response = await fetch(`${apiBaseUrl}/api/inventory`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'X-API-PASSPHRASE': 's3cur3-p@ssphras3!'
        }
      })
      
      if (!response.ok) {
        console.error(`[INVENTORY API] ${timestamp} - Azure Functions API error:`, response.status, response.statusText)
        useLocalFallback = true
      }
    } catch (fetchError) {
      console.error(`[INVENTORY API] ${timestamp} - Failed to reach Azure Functions API:`, fetchError)
      useLocalFallback = true
    }
    
    if (useLocalFallback) {
      console.log(`[INVENTORY API] ${timestamp} - Azure Functions /api/inventory not found - extracting from events`)
      
      try {
        // Try to get inventory data from events
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
            console.log(`[INVENTORY API] ${timestamp} - Extracting inventory data from ${eventsData.events.length} events`)
            
            // Find inventory module events
            const inventoryEvents = eventsData.events.filter((event: any) => 
              event.payload && 
              typeof event.payload === 'object' && 
              event.payload.module_id === 'inventory'
            )
            
            const inventoryData = inventoryEvents.map((event: any) => ({
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
            
            console.log(`[INVENTORY API] ${timestamp} - Found ${inventoryData.length} inventory events`)
            
            return NextResponse.json(inventoryData, {
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
        
        console.error(`[INVENTORY API] ${timestamp} - Events fallback also failed`)
      } catch (eventsError) {
        console.error(`[INVENTORY API] ${timestamp} - Events fallback error:`, eventsError)
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
      console.log(`[INVENTORY API] ${timestamp} - Successfully received data from Azure Functions API`)
      
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
    console.error('[INVENTORY API] Error fetching inventory:', error)
    return NextResponse.json({
      error: 'Failed to fetch inventory data',
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

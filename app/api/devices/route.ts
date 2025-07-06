import { NextResponse } from 'next/server'

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const timestamp = new Date().toISOString()
    console.log(`[DEVICES API] ${timestamp} - Fetching devices from Azure Functions API`)

    // Use server-side API base URL configuration
    const apiBaseUrl = process.env.API_BASE_URL || 
                      'https://reportmate-api.azurewebsites.net'
    
    console.log(`[DEVICES API] ${timestamp} - Using API base URL:`, apiBaseUrl)
    const response = await fetch(`${apiBaseUrl}/api/devices`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })
    
    if (!response.ok) {
      console.error(`[DEVICES API] ${timestamp} - Azure Functions API error:`, response.status, response.statusText)
      return NextResponse.json({
        error: 'Failed to fetch devices from API',
        details: `API returned ${response.status}: ${response.statusText}`
      }, { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
    }

    const data = await response.json()
    console.log(`[DEVICES API] ${timestamp} - Successfully fetched data from Azure Functions`)
    
    // CRITICAL FIX: Always extract devices array from Azure Functions response
    // Azure Functions returns: {"devices": [...], "count": 4}
    // Frontend expects: [device1, device2, ...]
    
    console.log('[DEVICES API] Raw response type:', typeof data)
    console.log('[DEVICES API] Raw response structure:', Object.keys(data || {}))
    
    let devicesArray = []
    
    if (data && data.devices && Array.isArray(data.devices)) {
      devicesArray = data.devices
      console.log(`[DEVICES API] ✅ Extracted ${devicesArray.length} devices from wrapped format`)
    } else if (Array.isArray(data)) {
      devicesArray = data
      console.log(`[DEVICES API] ✅ Using direct array format with ${devicesArray.length} devices`)
    } else {
      console.error('[DEVICES API] ❌ Invalid response format from Azure Functions:', data)
      return NextResponse.json({
        error: 'Invalid response format from Azure Functions API',
        details: `Expected {devices: [...]} or [...], got ${typeof data}`,
        received: data
      }, { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
    }
    
    // Always return a direct array for the frontend
    console.log(`[DEVICES API] ${timestamp} - 🚀 Returning devices array with ${devicesArray.length} items`)
    return NextResponse.json(devicesArray, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Fetched-At': timestamp
      }
    })

  } catch (error) {
    console.error('[DEVICES API] Error fetching devices:', error)
    return NextResponse.json({
      error: 'Failed to fetch devices',
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

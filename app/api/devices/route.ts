import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('[DEVICES API] Fetching devices from Azure Functions API')

    // Use server-side API base URL configuration
    const apiBaseUrl = process.env.API_BASE_URL || 
                      'https://reportmate-api.azurewebsites.net'
    
    console.log('[DEVICES API] Using API base URL:', apiBaseUrl)
    const response = await fetch(`${apiBaseUrl}/api/devices`)
    
    if (!response.ok) {
      console.error('[DEVICES API] Azure Functions API error:', response.status, response.statusText)
      return NextResponse.json({
        error: 'Failed to fetch devices from API',
        details: `API returned ${response.status}: ${response.statusText}`
      }, { status: 500 })
    }

    const data = await response.json()
    console.log('[DEVICES API] Successfully fetched data from Azure Functions')
    
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
      }, { status: 500 })
    }
    
    // Always return a direct array for the frontend
    console.log(`[DEVICES API] 🚀 Returning devices array with ${devicesArray.length} items`)
    return NextResponse.json(devicesArray)

  } catch (error) {
    console.error('[DEVICES API] Error fetching devices:', error)
    return NextResponse.json({
      error: 'Failed to fetch devices',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

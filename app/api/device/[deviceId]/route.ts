import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { deviceId: string } }
) {
  try {
    const { deviceId } = params
    console.log('[DEVICE API] Fetching device data for:', deviceId)

    // Use server-side API base URL configuration
    const apiBaseUrl = process.env.API_BASE_URL || 
                      'https://reportmate-api.azurewebsites.net'
    
    console.log('[DEVICE API] Using API base URL:', apiBaseUrl)
    const response = await fetch(`${apiBaseUrl}/api/device/${encodeURIComponent(deviceId)}`)
    
    if (!response.ok) {
      console.error('[DEVICE API] Azure Functions API error:', response.status, response.statusText)
      if (response.status === 404) {
        return NextResponse.json({
          error: 'Device not found'
        }, { status: 404 })
      }
      return NextResponse.json({
        error: 'Failed to fetch device from API',
        details: `API returned ${response.status}: ${response.statusText}`
      }, { status: 500 })
    }

    const data = await response.json()
    console.log('[DEVICE API] Successfully fetched device data from Azure Functions')
    
    // Return the data as-is since the Azure Functions API should return the correct format
    return NextResponse.json(data)

  } catch (error) {
    console.error('[DEVICE API] Error fetching device:', error)
    return NextResponse.json({
      error: 'Failed to fetch device',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

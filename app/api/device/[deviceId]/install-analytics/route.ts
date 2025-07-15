import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await params
    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') || '30d'

    console.log('[INSTALL ANALYTICS API] Fetching install analytics for device:', deviceId)

    // Use server-side API base URL configuration
    const apiBaseUrl = process.env.API_BASE_URL
    
    if (!apiBaseUrl) {
      console.error('[INSTALL ANALYTICS API] API_BASE_URL environment variable not configured')
      return NextResponse.json({
        error: 'API configuration error',
        details: 'API_BASE_URL environment variable not configured'
      }, { status: 500 })
    }

    // Construct the API URL with query parameters
    const apiUrl = new URL(`${apiBaseUrl}/api/device/${encodeURIComponent(deviceId)}/install-analytics`)
    apiUrl.searchParams.set('range', range)
    
    console.log('[INSTALL ANALYTICS API] Using API URL:', apiUrl.toString())
    const response = await fetch(apiUrl.toString(), {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })
    
    if (!response.ok) {
      console.error('[INSTALL ANALYTICS API] Azure Functions API error:', response.status, response.statusText)
      if (response.status === 404) {
        return NextResponse.json({
          error: 'Device not found or no analytics data available'
        }, { 
          status: 404,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        })
      }
      return NextResponse.json({
        error: 'Failed to fetch install analytics from API',
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
    console.log('[INSTALL ANALYTICS API] Successfully fetched install analytics from Azure Functions')
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('[INSTALL ANALYTICS API] Error fetching install analytics:', error)
    return NextResponse.json({
      error: 'Failed to fetch install analytics',
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

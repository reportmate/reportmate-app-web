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
    console.log('[DEVICE API] Fetching device data for:', deviceId)

    // Use server-side API base URL configuration
    const apiBaseUrl = process.env.API_BASE_URL
    
    if (!apiBaseUrl) {
      console.error('[DEVICE API] API_BASE_URL environment variable not configured')
      return NextResponse.json({
        error: 'API configuration error',
        details: 'API_BASE_URL environment variable not configured'
      }, { status: 500 })
    }
    
    console.log('[DEVICE API] Using API base URL:', apiBaseUrl)
    const response = await fetch(`${apiBaseUrl}/api/device/${encodeURIComponent(deviceId)}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })
    
    if (!response.ok) {
      console.error('[DEVICE API] Azure Functions API error:', response.status, response.statusText)
      if (response.status === 404) {
        return NextResponse.json({
          error: 'Device not found'
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
        error: 'Failed to fetch device from API',
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
    console.log('[DEVICE API] Successfully fetched device data from Azure Functions')
    console.log('[DEVICE API] Response structure:', {
      hasSuccess: 'success' in data,
      successValue: data.success,
      hasDevice: 'device' in data,
      deviceValue: !!data.device,
      responseKeys: Object.keys(data),
      responseSize: JSON.stringify(data).length
    })
    
    // Return the data as-is since the Azure Functions API should return the correct format
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('[DEVICE API] Error fetching device:', error)
    return NextResponse.json({
      error: 'Failed to fetch device',
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

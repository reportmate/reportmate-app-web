import { NextRequest, NextResponse } from 'next/server'
import { getInternalApiHeaders } from '@/lib/api-auth'

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Device Installs Log Endpoint
 * Proxies request to FastAPI /api/device/{serial_number}/installs/log
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await params
    // Use server-side API base URL configuration
    const apiBaseUrl = process.env.API_BASE_URL
    
    if (!apiBaseUrl) {
      console.error('[INSTALLS LOG API] API_BASE_URL environment variable not configured')
      return NextResponse.json({
        error: 'API configuration error',
        details: 'API_BASE_URL environment variable not configured'
      }, { status: 500 })
    }
    
    // Use shared authentication headers
    const headers = getInternalApiHeaders()
    
    const upstreamUrl = `${apiBaseUrl}/api/device/${encodeURIComponent(deviceId)}/installs/log`
    const response = await fetch(upstreamUrl, {
      cache: 'no-store',
      headers
    })
    
    if (!response.ok) {
      console.error('[INSTALLS LOG API] FastAPI error:', response.status, response.statusText)
      
      if (response.status === 404) {
        return NextResponse.json({ runLog: null }, { status: 200 }) // Return null log instead of 404
      }
      
      return NextResponse.json({
        error: 'Failed to fetch log from upstream API'
      }, { status: response.status })
    }

    const data = await response.json()
    `)
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error(`[INSTALLS LOG API] Error fetching log:`, error)
    return NextResponse.json({
      error: 'Failed to fetch log',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

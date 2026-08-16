import { NextRequest, NextResponse } from 'next/server'
import { getInternalApiHeaders } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString()
  
  try {
    const apiBaseUrl = process.env.API_BASE_URL
    
    if (!apiBaseUrl) {
      console.error('[DEVICES API] API_BASE_URL not configured')
      return NextResponse.json({
        error: 'API configuration error',
        details: 'API_BASE_URL environment variable not configured',
        timestamp
      }, { status: 500 })
    }

    const incomingParams = new URLSearchParams(request.nextUrl.searchParams)
    const queryString = incomingParams.toString()
    const devicesUrl = `${apiBaseUrl}/api/v1/devices${queryString ? `?${queryString}` : ''}`
        
    // Use shared authentication headers
    const headers = getInternalApiHeaders()
    
    // Create abort controller with 30 second timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)
    
    const response = await fetch(devicesUrl, {
      cache: 'no-store',
      headers,
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error('[DEVICES API] FastAPI error:', response.status, response.statusText)
      return NextResponse.json({
        error: 'Failed to fetch devices from FastAPI',
        status: response.status,
        timestamp
      }, { status: 500 })
    }

    const fastApiData = await response.json()

    // No PowerShell-object conversion here: the fleet list payload was
    // audited (all ~880 devices) and contains no '@{...}' strings — modern
    // clients send clean JSON and every active device's stored data is
    // rewritten at check-in. Deep-walking ~1MB of JSON per request was pure
    // server CPU. The single-device detail route keeps its parser for
    // legacy data on long-stale devices.

    return NextResponse.json(fastApiData, {
      headers: {
        'Cache-Control': 'private, max-age=15, stale-while-revalidate=30',
      }
    })
    
  } catch (error) {
    // Handle timeout specifically
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[DEVICES API] Request timed out after 30 seconds')
      return NextResponse.json({
        error: 'Request timeout',
        details: 'The backend API took too long to respond. Please try again.',
        timestamp
      }, { status: 504 })
    }
    
    console.error('[DEVICES API] Unexpected error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp
    }, { status: 500 })
  }
}

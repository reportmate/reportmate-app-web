import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Consolidated Dashboard API Route
 * 
 * Proxies to FastAPI /api/dashboard endpoint which combines:
 * - All devices with full OS data
 * - Install statistics (errors, warnings)
 * - Recent events for the widget
 * 
 * This eliminates multiple separate API calls from the dashboard,
 * dramatically improving load time (3 calls → 1).
 */
export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString()
  
  // LOCALHOST BYPASS: Skip auth check for local development
  const isLocalhost = request.headers.get('host')?.includes('localhost') || request.headers.get('host')?.includes('127.0.0.1')
  
  // Check authentication (skip for localhost)
  if (!isLocalhost) {
    const session = await getServerSession()
    if (!session) {
      console.log('[DASHBOARD API] Unauthorized access attempt')
      return NextResponse.json({
        error: 'Unauthorized',
        details: 'Authentication required',
        timestamp
      }, { status: 401 })
    }
  }

  try {
    const apiBaseUrl = process.env.API_BASE_URL
    
    if (!apiBaseUrl) {
      console.error('[DASHBOARD API] API_BASE_URL not configured')
      return NextResponse.json({
        error: 'API configuration error',
        details: 'API_BASE_URL environment variable not configured',
        timestamp
      }, { status: 500 })
    }

    // Forward query parameters
    const incomingParams = new URLSearchParams(request.nextUrl.searchParams)
    const queryString = incomingParams.toString()
    const dashboardUrl = `${apiBaseUrl}/api/dashboard${queryString ? `?${queryString}` : ''}`
    
    console.log('[DASHBOARD API] Fetching consolidated data from:', dashboardUrl)
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    
    // Add passphrase for FastAPI authentication
    const passphrase = process.env.REPORTMATE_PASSPHRASE
    if (passphrase) {
      headers['X-API-PASSPHRASE'] = passphrase
    }

    const response = await fetch(dashboardUrl, {
      method: 'GET',
      headers,
      cache: 'no-store',
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[DASHBOARD API] FastAPI error:', response.status, errorText)
      return NextResponse.json({
        error: 'Failed to fetch dashboard data',
        details: errorText,
        timestamp
      }, { status: response.status })
    }

    const data = await response.json()
    
    console.log('[DASHBOARD API] Consolidated response - devices:', data.devices?.length || 0, 
                'events:', data.events?.length || 0,
                'installStats:', data.installStats ? 'present' : 'missing')
    
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('[DASHBOARD API] Error fetching dashboard data:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp
    }, { status: 500 })
  }
}

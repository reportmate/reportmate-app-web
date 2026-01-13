import { NextRequest, NextResponse } from 'next/server'
import { getInternalApiHeaders } from '@/lib/api-auth'

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
  
  
  try {
    const apiBaseUrl = process.env.API_BASE_URL || 'http://reportmate-functions-api'
    
    // Forward query parameters
    const incomingParams = new URLSearchParams(request.nextUrl.searchParams)
    const queryString = incomingParams.toString()
    const dashboardUrl = `${apiBaseUrl}/api/dashboard${queryString ? `?${queryString}` : ''}`
    
        
    // Use shared authentication headers
    const headers = getInternalApiHeaders()
    headers['Content-Type'] = 'application/json'

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

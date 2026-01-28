import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const includeArchived = searchParams.get('includeArchived') === 'true'
    const timestamp = new Date().toISOString()
    
    const apiBaseUrl = process.env.API_BASE_URL
    
    if (!apiBaseUrl) {
      return NextResponse.json({
        error: 'API configuration error',
        details: 'API_BASE_URL environment variable not configured'
      }, { status: 500 })
    }
    
    // Call the dedicated FastAPI /api/devices/security endpoint (NOT /api/devices)
    // This endpoint returns optimized security summary data, not full device modules
    try {
      const url = `${apiBaseUrl}/api/devices/security${includeArchived ? '?includeArchived=true' : ''}`
      console.log(`[SECURITY API] ${timestamp} - Fetching from: ${url}`)
            
      // Container-to-container auth requires X-Internal-Secret header
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (process.env.API_INTERNAL_SECRET) {
        headers['X-Internal-Secret'] = process.env.API_INTERNAL_SECRET
      }
      
      const response = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(30000) // 30 second timeout
      })
      
      if (!response.ok) {
        throw new Error(`FastAPI error: ${response.status} ${response.statusText}`)
      }
      
      const securityData = await response.json()
      console.log(`[SECURITY API] ${timestamp} - Retrieved ${Array.isArray(securityData) ? securityData.length : 0} devices`)
            
      // Data is already formatted by FastAPI /api/devices/security endpoint
      // Just pass through with caching headers
      return NextResponse.json(securityData, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache', 
          'Expires': '0',
          'X-Fetched-At': timestamp,
          'X-Data-Source': 'fastapi-devices-security',
          'X-Records-Count': String(Array.isArray(securityData) ? securityData.length : 0)
        }
      })
      
    } catch (apiError) {
      console.error(`[SECURITY API] ${timestamp} - FastAPI error:`, apiError)
      
      // NO FAKE DATA: Return error when real API fails
      return NextResponse.json({
        error: 'Security data not available',
        message: 'No real data available from API',
        details: apiError instanceof Error ? apiError.message : 'Unknown error'
      }, { 
        status: 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
    }
    
  } catch (error) {
    console.error('[SECURITY API] Failed to fetch security data:', error)
    return NextResponse.json({
      error: 'API request failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

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
    
    // Call FastAPI bulk endpoint - NO LIMITS!
    try {
      const url = `${apiBaseUrl}/api/devices/system${includeArchived ? '?includeArchived=true' : ''}`
      console.log(`[SYSTEM API] ${timestamp} - Fetching from: ${url}`)
            
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
      
      const systemData = await response.json()
      console.log(`[SYSTEM API] ${timestamp} - Retrieved ${Array.isArray(systemData) ? systemData.length : 'unknown'} devices`)
            
      return NextResponse.json(systemData, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Fetched-At': timestamp,
          'X-Data-Source': 'fastapi-container',
          'X-Records-Count': String(Array.isArray(systemData) ? systemData.length : 0)
        }
      })
      
    } catch (apiError) {
      // Check if it was a timeout
      if (apiError instanceof Error && apiError.name === 'AbortError') {
        console.error(`[SYSTEM API] ${timestamp} - Request timed out after 30 seconds`)
        return NextResponse.json({
          error: 'System data request timed out',
          message: 'The system data endpoint took too long to respond',
          details: 'Request exceeded 30 second timeout'
        }, { 
          status: 504,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        })
      }
      
      console.error(`[SYSTEM API] ${timestamp} - FastAPI error:`, apiError)
      
      // NO FAKE DATA: Return error when real API fails
      return NextResponse.json({
        error: 'System data not available',
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
    console.error('[SYSTEM API] Failed to fetch system data:', error)
    return NextResponse.json({
      error: 'API request failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

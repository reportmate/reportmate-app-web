import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '1000'), 5000) // Max 5000, default 1000
    const timestamp = new Date().toISOString()
    
    const apiBaseUrl = process.env.API_BASE_URL
    
    if (!apiBaseUrl) {
      return NextResponse.json({
        error: 'API configuration error',
        details: 'API_BASE_URL environment variable not configured'
      }, { status: 500 })
    }
    
    // NO LOCAL DATABASE: Call FastAPI container directly
    try {
      const url = `${apiBaseUrl}/api/modules/system?limit=${limit}`
      console.log(`[SYSTEM API] ${timestamp} - Calling FastAPI: ${url}`)
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      if (!response.ok) {
        throw new Error(`FastAPI error: ${response.status} ${response.statusText}`)
      }
      
      const systemData = await response.json()
      console.log(`[SYSTEM API] ${timestamp} - Successfully fetched ${systemData.length || 0} system records from FastAPI`)
      
      return NextResponse.json(systemData, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Fetched-At': timestamp,
          'X-Data-Source': 'fastapi-container'
        }
      })
      
    } catch (apiError) {
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

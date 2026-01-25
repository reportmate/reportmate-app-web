import { NextResponse } from 'next/server'
import { getInternalApiHeaders } from '@/lib/api-auth'

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
    
    // Call FastAPI bulk endpoint
    try {
      const url = `${apiBaseUrl}/api/devices/system?limit=${limit}`
      console.log(`[SYSTEM API] ${timestamp} - Fetching from: ${url}`)
            
      // Use shared authentication headers
      const headers = getInternalApiHeaders()
      headers['Content-Type'] = 'application/json'
      
      // Add timeout to prevent hanging
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
      
      try {
        const response = await fetch(url, {
          headers,
          signal: controller.signal
        })
        clearTimeout(timeoutId)
        
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
            'X-Data-Source': 'fastapi-container'
          }
        })
      } catch (fetchError) {
        clearTimeout(timeoutId)
        
        // Check if it was a timeout
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
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
        
        throw fetchError
      }
      
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

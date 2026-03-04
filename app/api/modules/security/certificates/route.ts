import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'all'
    const includeArchived = searchParams.get('includeArchived') === 'true'
    const timestamp = new Date().toISOString()
    
    const apiBaseUrl = process.env.API_BASE_URL
    
    if (!apiBaseUrl) {
      return NextResponse.json({
        error: 'API configuration error',
        details: 'API_BASE_URL environment variable not configured'
      }, { status: 500 })
    }
    
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (status) params.set('status', status)
      if (includeArchived) params.set('includeArchived', 'true')
      
      const url = `${apiBaseUrl}/api/devices/security/certificates?${params.toString()}`
      console.log(`[CERT SEARCH API] ${timestamp} - Fetching from: ${url}`)
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (process.env.API_INTERNAL_SECRET) {
        headers['X-Internal-Secret'] = process.env.API_INTERNAL_SECRET
      }
      
      const response = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(90000)
      })
      
      if (!response.ok) {
        throw new Error(`FastAPI error: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log(`[CERT SEARCH API] ${timestamp} - Retrieved ${Array.isArray(data) ? data.length : 0} certificates`)
      
      return NextResponse.json(data, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Fetched-At': timestamp,
          'X-Data-Source': 'fastapi-security-certificates',
          'X-Records-Count': String(Array.isArray(data) ? data.length : 0)
        }
      })
      
    } catch (apiError) {
      console.error(`[CERT SEARCH API] ${timestamp} - FastAPI error:`, apiError)
      
      return NextResponse.json({
        error: 'Certificate data not available',
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
    console.error('[CERT SEARCH API] Failed to fetch certificate data:', error)
    return NextResponse.json({
      error: 'API request failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

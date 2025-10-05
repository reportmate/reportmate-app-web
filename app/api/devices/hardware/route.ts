import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Bulk Hardware API Route - Proxy to FastAPI
 * Architecture: Next.js (proxy) → FastAPI (data layer) → PostgreSQL
 */
export async function GET(request: Request) {
  try {
    const timestamp = new Date().toISOString()
    const { searchParams } = new URL(request.url)
    
    console.log(`[HARDWARE PROXY] ${timestamp} - Forwarding to FastAPI`)
    
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL
    if (!API_BASE_URL) {
      throw new Error('API_BASE_URL not configured')
    }
    
    const fastApiUrl = `${API_BASE_URL}/api/devices/hardware?${searchParams.toString()}`
    console.log(`[HARDWARE PROXY] Calling: ${fastApiUrl}`)
    
    const response = await fetch(fastApiUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store'
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`FastAPI returned ${response.status}: ${errorText}`)
    }
    
    const data = await response.json()
    console.log(`[HARDWARE PROXY] Received ${Array.isArray(data) ? data.length : 0} hardware records`)
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Fetched-At': timestamp,
        'X-Data-Source': 'fastapi-proxy'
      }
    })
    
  } catch (error) {
    console.error('[HARDWARE PROXY] Error:', error)
    return NextResponse.json({
      error: 'Failed to fetch hardware',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

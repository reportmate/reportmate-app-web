import { NextResponse } from 'next/server'
import { getInternalApiHeaders } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Peripherals API Route - Proxy to FastAPI
 * Architecture: Next.js (proxy) FastAPI (data layer) PostgreSQL
 */
export async function GET() {
  try {
    const timestamp = new Date().toISOString()
        
    const API_BASE_URL = process.env.API_BASE_URL
    if (!API_BASE_URL) {
      throw new Error('API_BASE_URL not configured')
    }
    
    const fastApiUrl = `${API_BASE_URL}/api/devices/peripherals`
        
    // Use shared authentication headers
    const headers = getInternalApiHeaders()
    headers['Content-Type'] = 'application/json'
    
    const response = await fetch(fastApiUrl, {
      method: 'GET',
      headers
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`FastAPI returned ${response.status}: ${errorText}`)
    }
    
    const peripheralsData = await response.json()
    
        
    return NextResponse.json(peripheralsData, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Fetched-At': timestamp,
        'X-Data-Source': 'fastapi-bulk-peripherals'
      }
    })
    
  } catch (error) {
    console.error('[PERIPHERALS API] Error:', error)
    return NextResponse.json({
      error: 'Failed to fetch peripherals',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

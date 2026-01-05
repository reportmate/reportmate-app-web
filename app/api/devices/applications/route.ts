import { NextResponse } from 'next/server'
import { getInternalApiHeaders } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Bulk Applications API Route - Proxy to FastAPI
 * Architecture: Next.js (proxy) → FastAPI (data layer) → PostgreSQL
 * Uses internal container-to-container auth
 */
export async function GET(request: Request) {
  try {
    const timestamp = new Date().toISOString()
    const { searchParams } = new URL(request.url)
    
    console.log(`[APPLICATIONS PROXY] ${timestamp} - Forwarding to FastAPI`)
    
    // Use internal API URL for container-to-container communication
    const API_BASE_URL = process.env.API_BASE_URL || 'http://reportmate-functions-api'
    
    const fastApiUrl = `${API_BASE_URL}/api/devices/applications?${searchParams.toString()}`
    console.log(`[APPLICATIONS PROXY] Calling: ${fastApiUrl}`)
    
    // Use shared auth headers for internal API calls
    const headers = getInternalApiHeaders()
    
    const response = await fetch(fastApiUrl, {
      method: 'GET',
      headers,
      cache: 'no-store'
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`FastAPI returned ${response.status}: ${errorText}`)
    }
    
    const data = await response.json()
    console.log(`[APPLICATIONS PROXY] Received ${Array.isArray(data) ? data.length : 0} applications`)
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Fetched-At': timestamp,
        'X-Data-Source': 'fastapi-proxy'
      }
    })
    
  } catch (error) {
    console.error('[APPLICATIONS PROXY] Error:', error)
    return NextResponse.json({
      error: 'Failed to fetch applications',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

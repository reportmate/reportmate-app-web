import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Profiles API Route - Proxy to FastAPI
 * Architecture: Next.js (proxy) → FastAPI (data layer) → PostgreSQL
 */
export async function GET() {
  try {
    const timestamp = new Date().toISOString()
    console.log(`[PROFILES API] ${timestamp} - Fetching bulk profiles data from FastAPI`)
    
    const API_BASE_URL = process.env.API_BASE_URL
    if (!API_BASE_URL) {
      throw new Error('API_BASE_URL not configured')
    }
    
    const fastApiUrl = `${API_BASE_URL}/api/devices/profiles`
    console.log(`[PROFILES API] Calling: ${fastApiUrl}`)
    
    const response = await fetch(fastApiUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`FastAPI returned ${response.status}: ${errorText}`)
    }
    
    const profilesData = await response.json()
    
    console.log(`[PROFILES API] Received ${Array.isArray(profilesData) ? profilesData.length : 0} devices with profiles data`)
    
    return NextResponse.json(profilesData, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Fetched-At': timestamp,
        'X-Data-Source': 'fastapi-bulk-profiles'
      }
    })
    
  } catch (error) {
    console.error('[PROFILES PROXY] Error:', error)
    return NextResponse.json({
      error: 'Failed to fetch profiles',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

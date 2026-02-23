import { NextResponse } from 'next/server'
import { getInternalApiHeaders } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Fleet Application Usage/Utilization API Route - Proxy to FastAPI
 * Architecture: Next.js (proxy) → FastAPI (data layer) → PostgreSQL
 * Uses internal container-to-container auth
 * 
 * Returns aggregated application usage data for fleet-wide utilization reporting:
 * - Top applications by usage time
 * - Top users
 * - Single-user applications
 * - Unused applications
 */
export async function GET(request: Request) {
  try {
    const _timestamp = new Date().toISOString()
    const { searchParams } = new URL(request.url)
    
        
    // Use internal API URL for container-to-container communication
    const API_BASE_URL = process.env.API_BASE_URL || 'http://reportmate-functions-api'
    
    const fastApiUrl = `${API_BASE_URL}/api/devices/applications/usage?${searchParams.toString()}`
        
    // Use shared auth headers for internal API calls
    const headers = getInternalApiHeaders()

    const response = await fetch(fastApiUrl, {
      method: 'GET',
      headers,
      cache: 'no-store'
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[USAGE PROXY] FastAPI error: ${response.status} - ${errorText}`)
      
      return NextResponse.json({
        error: `FastAPI returned ${response.status}`,
        details: errorText
      }, { status: response.status })
    }
    
    const data = await response.json()
        
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    })
    
  } catch (error) {
    console.error('[USAGE PROXY] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch usage data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

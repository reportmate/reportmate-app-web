import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const timestamp = new Date().toISOString()
        
    // Fetch from FastAPI - use dedicated bulk network endpoint
    const apiBaseUrl = process.env.API_BASE_URL;
    
    if (!apiBaseUrl) {
      return NextResponse.json({ error: 'API_BASE_URL environment variable is required' }, { status: 500 });
    }
    
    // Container-to-container auth requires X-Internal-Secret header
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    if (process.env.API_INTERNAL_SECRET) {
      headers['X-Internal-Secret'] = process.env.API_INTERNAL_SECRET
    }
    
    const response = await fetch(`${apiBaseUrl}/api/devices/network`, {
      headers,
      signal: AbortSignal.timeout(30000) // 30 second timeout
    })
    
    if (!response.ok) {
      throw new Error(`Azure Functions API error: ${response.status}`)
    }
    
    const networkData = await response.json()
        
    // If we got an array, it's already in the correct format from FastAPI
    if (Array.isArray(networkData)) {
      return NextResponse.json(networkData, {
        headers: { 
          'X-Fetched-At': timestamp, 
          'X-Data-Source': 'fastapi-devices-network',
          'X-Records-Count': String(networkData.length)
        }
      })
    }
    
    // If we got an empty result or unexpected format, return empty array
        return NextResponse.json([], {
      headers: { 
        'X-Fetched-At': timestamp, 
        'X-Data-Source': 'fastapi-devices-network-empty',
        'X-Records-Count': '0'
      }
    })
    
  } catch (error) {
    console.error('[NETWORK API] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch network data',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

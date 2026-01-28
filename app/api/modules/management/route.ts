import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const timestamp = new Date().toISOString()
        
    const apiBaseUrl = process.env.API_BASE_URL
    if (!apiBaseUrl) {
      throw new Error('API_BASE_URL not configured')
    }
    
    const fastApiUrl = `${apiBaseUrl}/api/devices/management`
        
    // Container-to-container auth requires X-Internal-Secret header
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    if (process.env.API_INTERNAL_SECRET) {
      headers['X-Internal-Secret'] = process.env.API_INTERNAL_SECRET
    }
    
    const response = await fetch(fastApiUrl, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(30000) // 30 second timeout
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`FastAPI returned ${response.status}: ${errorText}`)
    }
    
    const managementData = await response.json()
    
        
    return NextResponse.json(managementData, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Fetched-At': timestamp,
        'X-Data-Source': 'fastapi-bulk-management'
      }
    })
  } catch (error) {
    console.error('[MANAGEMENT API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch management data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

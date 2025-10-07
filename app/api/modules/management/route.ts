import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const timestamp = new Date().toISOString()
    console.log(`[MANAGEMENT API] ${timestamp} - Fetching bulk management data from FastAPI`)
    
    const apiBaseUrl = process.env.API_BASE_URL
    if (!apiBaseUrl) {
      throw new Error('API_BASE_URL not configured')
    }
    
    const fastApiUrl = `${apiBaseUrl}/api/devices/management`
    console.log(`[MANAGEMENT API] Calling: ${fastApiUrl}`)
    
    const response = await fetch(fastApiUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`FastAPI returned ${response.status}: ${errorText}`)
    }
    
    const managementData = await response.json()
    
    console.log(`[MANAGEMENT API] Received ${Array.isArray(managementData) ? managementData.length : 0} devices with management data`)
    
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

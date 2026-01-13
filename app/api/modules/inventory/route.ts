import { NextResponse } from 'next/server'
import { getInternalApiHeaders } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const timestamp = new Date().toISOString()
    const apiBaseUrl = process.env.API_BASE_URL
    if (!apiBaseUrl) {
      throw new Error('API_BASE_URL not configured')
    }
    
    const fastApiUrl = `${apiBaseUrl}/api/devices/inventory`
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
    
    const inventoryData = await response.json()
    
    ? inventoryData.length : 0} devices with inventory data`)
    
    return NextResponse.json(inventoryData, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Fetched-At': timestamp,
        'X-Data-Source': 'fastapi-bulk-inventory'
      }
    })
    
  } catch (error) {
    console.error('[INVENTORY API] Error:', error)
    return NextResponse.json({
      error: 'Failed to fetch inventory',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

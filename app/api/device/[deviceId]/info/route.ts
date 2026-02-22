import { NextRequest, NextResponse } from 'next/server'
import { getInternalApiHeaders } from '@/lib/api-auth'

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Fast Info Tab Data Endpoint
 * 
 * Calls the FastAPI /info endpoint directly instead of the full /device/ endpoint.
 * The FastAPI /info endpoint queries only 6 module tables vs 11+ for the full endpoint,
 * reducing response time from ~28s to ~500ms.
 * 
 * Returns: inventory, system, hardware, management, security, network
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await params
    
    const apiBaseUrl = process.env.API_BASE_URL
    
    if (!apiBaseUrl) {
      console.error('[INFO API] API_BASE_URL not configured')
      return NextResponse.json({
        error: 'API configuration error'
      }, { status: 500 })
    }
    
    // Call the fast FastAPI /info endpoint (6 targeted DB queries, not 11+)
    const infoUrl = `${apiBaseUrl}/api/device/${encodeURIComponent(deviceId)}/info`
    
    const headers = getInternalApiHeaders()
        
    const response = await fetch(infoUrl, {
      cache: 'no-store',
      headers
    })
    
    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({
          success: false,
          error: 'Device not found'
        }, { status: 404 })
      }
      
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch device info'
      }, { status: 502 })
    }

    const data = await response.json()
    
    // FastAPI /info endpoint returns the exact structure we need:
    // { success: true, device: { serialNumber, deviceId, lastSeen, ..., modules: {...} } }
    if (data.success && data.device) {
      return NextResponse.json(data, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
    }
    
    return NextResponse.json({
      error: 'Invalid device data structure'
    }, { status: 500 })

  } catch (error) {
    console.error('[INFO API] Error:', error)
    return NextResponse.json({
      error: 'Failed to fetch device info',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

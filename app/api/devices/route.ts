import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString()
  
  // CRITICAL: Check authentication
  const session = await getServerSession()
  if (!session) {
    console.log('[DEVICES API] Unauthorized access attempt')
    return NextResponse.json({
      error: 'Unauthorized',
      details: 'Authentication required',
      timestamp
    }, { status: 401 })
  }
  
  try {
    console.log('[DEVICES API] Authenticated user accessing devices data:', session.user?.email)

    const apiBaseUrl = process.env.API_BASE_URL
    
    if (!apiBaseUrl) {
      console.error('[DEVICES API] API_BASE_URL not configured')
      return NextResponse.json({
        error: 'API configuration error',
        details: 'API_BASE_URL environment variable not configured',
        timestamp
      }, { status: 500 })
    }

    console.log('[DEVICES API] Using FastAPI base URL:', apiBaseUrl)

    const incomingParams = new URLSearchParams(request.nextUrl.searchParams)
    const queryString = incomingParams.toString()
    const devicesUrl = `${apiBaseUrl}/api/devices${queryString ? `?${queryString}` : ''}`
    console.log('[DEVICES API] Fetching from FastAPI:', devicesUrl)
    
    const response = await fetch(devicesUrl, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'User-Agent': 'ReportMate-Frontend/1.0'
      }
    })

    if (!response.ok) {
      console.error('[DEVICES API] FastAPI error:', response.status, response.statusText)
      return NextResponse.json({
        error: 'Failed to fetch devices from FastAPI',
        status: response.status,
        timestamp
      }, { status: 500 })
    }

    const fastApiData = await response.json()
    console.log('[DEVICES API] FastAPI returned:', fastApiData.devices?.length || 0, 'devices')

    return NextResponse.json(fastApiData, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    })
    
  } catch (error) {
    console.error('[DEVICES API] Unexpected error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp
    }, { status: 500 })
  }
}

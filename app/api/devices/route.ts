import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString()
  
  // LOCALHOST BYPASS: Skip auth check for local development
  const isLocalhost = request.headers.get('host')?.includes('localhost')
  
  // Check authentication (skip for localhost)
  if (!isLocalhost) {
    const session = await getServerSession()
    if (!session) {
      console.log('[DEVICES API] Unauthorized access attempt')
      return NextResponse.json({
        error: 'Unauthorized',
        details: 'Authentication required',
        timestamp
      }, { status: 401 })
    }
    console.log('[DEVICES API] Authenticated user accessing devices data:', session.user?.email)
  } else {
    console.log('[DEVICES API] Localhost bypass - no auth required')
  }

  try {
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
    
    // Get managed identity principal ID from Azure Container Apps
    const managedIdentityId = process.env.AZURE_CLIENT_ID || process.env.MSI_CLIENT_ID
    
    // For localhost, use passphrase authentication
    const headers: Record<string, string> = {
      'Cache-Control': 'no-cache',
      'User-Agent': 'ReportMate-Frontend/1.0'
    }
    
    if (isLocalhost && process.env.REPORTMATE_PASSPHRASE) {
      headers['X-API-PASSPHRASE'] = process.env.REPORTMATE_PASSPHRASE
    } else if (managedIdentityId) {
      headers['X-MS-CLIENT-PRINCIPAL-ID'] = managedIdentityId
    }
    
    const response = await fetch(devicesUrl, {
      cache: 'no-store',
      headers
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

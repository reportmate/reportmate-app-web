import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Fleet Application Usage/Utilization API Route - Proxy to FastAPI
 * Architecture: Next.js (proxy) FastAPI (data layer) PostgreSQL
 * 
 * Returns aggregated application usage data for fleet-wide utilization reporting:
 * - Top applications by usage time
 * - Top users
 * - Single-user applications
 * - Unused applications
 */
export async function GET(request: Request) {
  // LOCALHOST BYPASS: Skip auth check for local development
  const isLocalhost = request.headers.get('host')?.includes('localhost') || process.env.NODE_ENV === 'development'
  
  // Check authentication (skip for localhost)
  if (!isLocalhost) {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        details: 'Authentication required'
      }, { status: 401 })
    }
  }

  try {
    const timestamp = new Date().toISOString()
    const { searchParams } = new URL(request.url)
    
    console.log(`[USAGE PROXY] ${timestamp} - Forwarding to FastAPI`)
    
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL
    if (!API_BASE_URL) {
      throw new Error('API_BASE_URL not configured')
    }
    
    const fastApiUrl = `${API_BASE_URL}/api/devices/applications/usage?${searchParams.toString()}`
    console.log(`[USAGE PROXY] Calling: ${fastApiUrl}`)
    
    // Build headers with authentication
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    
    if (process.env.REPORTMATE_PASSPHRASE) {
      headers['X-API-PASSPHRASE'] = process.env.REPORTMATE_PASSPHRASE
    } else {
      const managedIdentityId = process.env.AZURE_CLIENT_ID || process.env.MSI_CLIENT_ID
      if (managedIdentityId) {
        headers['X-MS-CLIENT-PRINCIPAL-ID'] = managedIdentityId
      }
    }

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
    console.log(`[USAGE PROXY] Successfully received ${data.applications?.length || 0} apps, ${data.topUsers?.length || 0} top users`)
    
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

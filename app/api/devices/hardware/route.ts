import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Bulk Hardware API Route - Proxy to FastAPI
 * Architecture: Next.js (proxy) → FastAPI (data layer) → PostgreSQL
 */
export async function GET(request: Request) {
  // CRITICAL: Check authentication
  const session = await getServerSession()
  
  // Allow access in development mode without session
  if (!session && process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ 
      error: 'Unauthorized',
      details: 'Authentication required'
    }, { status: 401 })
  }

  try {
    const timestamp = new Date().toISOString()
    const { searchParams } = new URL(request.url)
    
    console.log(`[HARDWARE PROXY] ${timestamp} - Forwarding to FastAPI`)
    
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL
    if (!API_BASE_URL) {
      throw new Error('API_BASE_URL not configured')
    }
    
    const fastApiUrl = `${API_BASE_URL}/api/devices/hardware?${searchParams.toString()}`
    console.log(`[HARDWARE PROXY] Calling: ${fastApiUrl}`)
    
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
      throw new Error(`FastAPI returned ${response.status}: ${errorText}`)
    }
    
    const data = await response.json()
    console.log(`[HARDWARE PROXY] Received ${Array.isArray(data) ? data.length : 0} hardware records`)
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Fetched-At': timestamp,
        'X-Data-Source': 'fastapi-proxy'
      }
    })
    
  } catch (error) {
    console.error('[HARDWARE PROXY] Error:', error)
    return NextResponse.json({
      error: 'Failed to fetch hardware',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

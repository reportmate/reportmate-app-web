import { NextResponse } from 'next/server'
import { getInternalApiHeaders } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Profiles API Route - Proxy to FastAPI /api/v1/profiles
 * Fleet-wide MDM and configuration profile data per device.
 */
export async function GET(request: Request) {
  try {
    const timestamp = new Date().toISOString()

    const apiBaseUrl = process.env.API_BASE_URL
    if (!apiBaseUrl) {
      throw new Error('API_BASE_URL not configured')
    }

    const { searchParams } = new URL(request.url)
    const upstreamParams = new URLSearchParams()
    for (const key of ['includeArchived', 'limit', 'offset']) {
      const value = searchParams.get(key)
      if (value !== null) upstreamParams.set(key, value)
    }
    const queryString = upstreamParams.toString()
    const fastApiUrl = `${apiBaseUrl}/api/v1/profiles${queryString ? `?${queryString}` : ''}`

    const headers = getInternalApiHeaders()

    const response = await fetch(fastApiUrl, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(30000)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`FastAPI returned ${response.status}: ${errorText}`)
    }

    const profilesData = await response.json()

    return NextResponse.json(profilesData, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Fetched-At': timestamp,
        'X-Data-Source': 'fastapi-bulk-profiles'
      }
    })
  } catch (error) {
    console.error('[PROFILES API] Error:', error)
    return NextResponse.json({
      error: 'Failed to fetch profiles',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

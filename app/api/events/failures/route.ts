import { NextResponse } from 'next/server'
import { getInternalApiHeaders } from '@/lib/api-auth'

// Failed check-ins are the freshest-signal view there is — never cache.
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const apiBaseUrl = process.env.API_BASE_URL
    if (!apiBaseUrl) {
      console.error('[FAILURES API] API_BASE_URL environment variable not configured')
      return NextResponse.json({
        error: 'Configuration error',
        details: 'API_BASE_URL environment variable not configured'
      }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const queryParams = new URLSearchParams()
    for (const key of ['limit', 'offset', 'serial', 'reason', 'hours']) {
      const value = searchParams.get(key)
      if (value) queryParams.append(key, value)
    }

    const response = await fetch(
      `${apiBaseUrl}/api/v1/events/failures?${queryParams.toString()}`,
      {
        headers: getInternalApiHeaders(),
        cache: 'no-store',
        signal: AbortSignal.timeout(30000)
      }
    )

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      console.error(`[FAILURES API] Upstream error ${response.status}: ${text}`)
      return NextResponse.json({
        error: 'Failed to fetch ingest failures',
        details: `Upstream API returned ${response.status}`
      }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    })
  } catch (error) {
    console.error('[FAILURES API] Request failed:', error)
    return NextResponse.json({
      error: 'Failed to fetch ingest failures',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

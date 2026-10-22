import { NextResponse } from 'next/server'
import { getInternalApiHeaders } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const NO_STORE = {
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
}

/**
 * The dashboard insight cards in one call. FastAPI computes them with
 * aggregate SQL and caches them per platform for five minutes, so this proxy
 * passes the answer through untouched (docs/DASHBOARD-WIDGETS.md).
 */
export async function GET(request: Request) {
  const apiBaseUrl = process.env.API_BASE_URL
  if (!apiBaseUrl) {
    return NextResponse.json({
      error: 'API configuration error',
      details: 'API_BASE_URL environment variable not configured'
    }, { status: 500 })
  }

  const { searchParams } = new URL(request.url)
  const platform = searchParams.get('platform') || 'all'
  if (!['all', 'macOS', 'Windows'].includes(platform)) {
    return NextResponse.json({ error: 'platform must be all, macOS or Windows' }, { status: 422 })
  }
  const params = new URLSearchParams({ platform })
  if (searchParams.get('includeArchived') === 'true') params.set('includeArchived', 'true')

  try {
    const response = await fetch(`${apiBaseUrl}/api/v1/dashboard/insights?${params.toString()}`, {
      headers: getInternalApiHeaders(),
      cache: 'no-store',
      signal: AbortSignal.timeout(90000),
    })
    if (!response.ok) {
      throw new Error(`FastAPI error: ${response.status} ${response.statusText}`)
    }
    const data = await response.json()
    return NextResponse.json(data, {
      headers: {
        ...NO_STORE,
        'X-Insights-Cache': response.headers.get('X-Insights-Cache') || '',
        'Age': response.headers.get('Age') || '0',
      }
    })
  } catch (error) {
    console.error('[INSIGHTS API] Failed to fetch dashboard insights:', error)
    return NextResponse.json({
      error: 'Dashboard insights not available',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 503, headers: NO_STORE })
  }
}

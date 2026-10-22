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
 * One dashboard insight card: GET /api/v1/dashboard/insights/{card}. Each card
 * is cached by the API on its own, so the dashboard asks for them in parallel
 * and paints them as they land (src/lib/dashboard/insights.ts).
 */
export async function GET(request: Request, { params }: { params: Promise<{ card: string }> }) {
  const apiBaseUrl = process.env.API_BASE_URL
  if (!apiBaseUrl) {
    return NextResponse.json({ error: 'API_BASE_URL environment variable not configured' }, { status: 500 })
  }
  const { card } = await params
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(card)) {
    return NextResponse.json({ error: 'Unknown card' }, { status: 404, headers: NO_STORE })
  }

  const { searchParams } = new URL(request.url)
  const forward = new URLSearchParams()
  const platform = searchParams.get('platform') || 'all'
  if (!['all', 'macOS', 'Windows'].includes(platform)) {
    return NextResponse.json({ error: 'platform must be all, macOS or Windows' }, { status: 422 })
  }
  forward.set('platform', platform)
  // Card-specific filters (App Usage's usages, catalogs, days) pass straight through
  for (const key of ['includeArchived', 'usages', 'catalogs', 'days']) {
    const value = searchParams.get(key)
    if (value) forward.set(key, value)
  }

  try {
    const response = await fetch(
      `${apiBaseUrl}/api/v1/dashboard/insights/${encodeURIComponent(card)}?${forward.toString()}`,
      { headers: getInternalApiHeaders(), cache: 'no-store', signal: AbortSignal.timeout(60000) },
    )
    if (!response.ok) {
      let detail = `${response.status} ${response.statusText}`
      try {
        const body = await response.json()
        detail = body?.detail || body?.error || detail
      } catch {
        // not JSON
      }
      return NextResponse.json({
        error: response.status === 404 ? 'Card endpoint not found' : 'Card not available',
        details: String(detail),
      }, { status: response.status, headers: NO_STORE })
    }
    return NextResponse.json(await response.json(), {
      headers: { ...NO_STORE, 'X-Insights-Cache': response.headers.get('X-Insights-Cache') || '' },
    })
  } catch (error) {
    console.error(`[INSIGHTS API] Failed to fetch card ${card}:`, error)
    return NextResponse.json({
      error: 'Card not available',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 503, headers: NO_STORE })
  }
}

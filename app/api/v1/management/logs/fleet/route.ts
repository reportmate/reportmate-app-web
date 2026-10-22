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
 * The Fleet Management Tools Logs report (/management/logs): per tool,
 * common messages and devices over a window. FastAPI aggregates the
 * levelSummary stamps; this proxy validates the query and passes the answer
 * and its status through (a 404 means the API has not shipped the endpoint).
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
  const hours = searchParams.get('hours') || '24'
  if (!['24', '168'].includes(hours)) {
    return NextResponse.json({ error: 'hours must be 24 or 168' }, { status: 422, headers: NO_STORE })
  }
  const level = (searchParams.get('level') || '').toLowerCase()
  if (level && !['error', 'warning'].includes(level)) {
    return NextResponse.json({ error: 'level must be error or warning' }, { status: 422, headers: NO_STORE })
  }
  const rawPlatform = (searchParams.get('platform') || '').toLowerCase()
  const platform = rawPlatform === 'mac' || rawPlatform === 'macos' ? 'macOS'
    : rawPlatform === 'win' || rawPlatform === 'windows' ? 'Windows'
    : ''
  if (rawPlatform && rawPlatform !== 'all' && !platform) {
    return NextResponse.json({ error: 'platform must be macOS or Windows' }, { status: 422, headers: NO_STORE })
  }

  const params = new URLSearchParams({ hours })
  const tool = (searchParams.get('tool') || '').trim()
  if (tool) params.set('tool', tool)
  if (level) params.set('level', level)
  const message = (searchParams.get('message') || '').trim()
  if (message) params.set('message', message)
  if (platform) params.set('platform', platform)
  if (searchParams.get('includeArchived') === 'true') params.set('includeArchived', 'true')

  try {
    const response = await fetch(`${apiBaseUrl}/api/v1/management/logs/fleet?${params.toString()}`, {
      headers: getInternalApiHeaders(),
      cache: 'no-store',
      signal: AbortSignal.timeout(90000),
    })
    if (!response.ok) {
      let detail = `${response.status} ${response.statusText}`
      try {
        const body = await response.json()
        detail = body?.detail || body?.error || detail
      } catch {
        // not JSON
      }
      return NextResponse.json({
        error: response.status === 404 ? 'Fleet tool logs endpoint not found' : 'Fleet tool logs not available',
        details: String(detail),
      }, { status: response.status, headers: NO_STORE })
    }
    const data = await response.json()
    return NextResponse.json(data, {
      headers: { ...NO_STORE, 'Age': response.headers.get('Age') || '0' },
    })
  } catch (error) {
    console.error('[TOOL LOGS API] Failed to fetch fleet tool logs:', error)
    return NextResponse.json({
      error: 'Fleet tool logs not available',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 503, headers: NO_STORE })
  }
}

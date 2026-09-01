import { NextRequest, NextResponse } from 'next/server'
import { getInternalApiHeaders } from '@/lib/api-auth'

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Device Log Root Endpoint
 * Proxies request to FastAPI /api/device/{serial_number}/logs/{tool}
 *
 * Returns one management tool's log root with its tail. The tails are
 * stripped from the device and module payloads, so the Logs section on the
 * Management tab fetches them here when a tool's tab is opened.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string; tool: string }> }
) {
  try {
    const { deviceId, tool } = await params

    const apiBaseUrl = process.env.API_BASE_URL

    if (!apiBaseUrl) {
      console.error('[LOG ROOT API] API_BASE_URL environment variable not configured')
      return NextResponse.json({
        error: 'API configuration error',
        details: 'API_BASE_URL environment variable not configured'
      }, { status: 500 })
    }

    if (!/^[a-z0-9_-]{1,64}$/i.test(tool)) {
      return NextResponse.json({ error: 'Invalid tool name' }, { status: 400 })
    }

    const headers = getInternalApiHeaders()
    const upstreamUrl = `${apiBaseUrl}/api/v1/device/${encodeURIComponent(deviceId)}/logs/${encodeURIComponent(tool)}`

    const response = await fetch(upstreamUrl, {
      cache: 'no-store',
      headers
    })

    if (!response.ok) {
      console.error('[LOG ROOT API] FastAPI error:', response.status, response.statusText)

      if (response.status === 404) {
        return NextResponse.json({ tool, root: null }, { status: 200 })
      }

      return NextResponse.json({
        error: 'Failed to fetch log root from upstream API'
      }, { status: response.status })
    }

    const data = await response.json()

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('[LOG ROOT API] Error fetching log root:', error)
    return NextResponse.json({
      error: 'Failed to fetch log root',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

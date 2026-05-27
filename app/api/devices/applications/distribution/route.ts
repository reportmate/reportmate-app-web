import { NextResponse } from 'next/server'
import { getInternalApiHeaders } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Applications Version Distribution Proxy
 *
 * Proxies to the FastAPI /api/v1/devices/applications/distribution endpoint,
 * which aggregates installed-app counts per (app, version) in SQL. Response
 * size is bounded by distinct versions rather than fleet size, so the chart
 * no longer needs the bulk applications endpoint (which paginates at 500).
 */
export async function GET(request: Request) {
  try {
    const timestamp = new Date().toISOString()
    const { searchParams } = new URL(request.url)

    const API_BASE_URL = process.env.API_BASE_URL || 'http://reportmate-functions-api'
    const fastApiUrl = `${API_BASE_URL}/api/v1/devices/applications/distribution?${searchParams.toString()}`

    const response = await fetch(fastApiUrl, {
      method: 'GET',
      headers: getInternalApiHeaders(),
      cache: 'no-store'
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`FastAPI returned ${response.status}: ${errorText}`)
    }

    const data = await response.json()

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'private, max-age=15, stale-while-revalidate=30',
        'X-Fetched-At': timestamp,
        'X-Data-Source': 'fastapi-proxy'
      }
    })
  } catch (error) {
    console.error('[APPLICATIONS DISTRIBUTION PROXY] Error:', error)
    return NextResponse.json({
      error: 'Failed to fetch applications distribution',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

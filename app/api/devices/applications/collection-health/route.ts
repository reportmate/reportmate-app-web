import { NextResponse } from 'next/server'
import { getInternalApiHeaders } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    const API_BASE_URL = process.env.API_BASE_URL || 'http://reportmate-functions-api'
    const fastApiUrl = `${API_BASE_URL}/api/v1/devices/applications/collection-health?${searchParams.toString()}`

    const response = await fetch(fastApiUrl, {
      method: 'GET',
      headers: getInternalApiHeaders(),
      cache: 'no-store',
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[COLLECTION-HEALTH PROXY] FastAPI error: ${response.status} - ${errorText}`)
      return NextResponse.json(
        { error: `FastAPI returned ${response.status}`, details: errorText },
        { status: response.status },
      )
    }

    const data = await response.json()
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=120' },
    })
  } catch (error) {
    console.error('[COLLECTION-HEALTH PROXY] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch collection health',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

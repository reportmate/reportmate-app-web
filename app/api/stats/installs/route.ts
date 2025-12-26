import { NextRequest, NextResponse } from 'next/server'
import { getInternalApiHeaders } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  const apiBaseUrl = process.env.API_BASE_URL

  if (!apiBaseUrl) {
    return NextResponse.json(
      {
        error: 'API configuration error',
        details: 'API_BASE_URL environment variable not configured',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }

  // Use shared authentication headers
  const headers = getInternalApiHeaders()

  try {
    const response = await fetch(`${apiBaseUrl}/api/stats/installs`, {
      cache: 'no-store',
      headers,
    })

    if (!response.ok) {
      return NextResponse.json(
        {
          error: 'Failed to fetch install stats from FastAPI',
          status: response.status,
          timestamp: new Date().toISOString(),
        },
        { status: response.status }
      )
    }

    const stats = await response.json()

    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

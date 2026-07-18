import { NextResponse } from 'next/server'
import { getInternalApiHeaders } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * SignalR/WebPubSub Negotiate API Route - Proxy to FastAPI
 * Architecture: Next.js (proxy) -> FastAPI (token mint) -> Web PubSub
 *
 * The upstream negotiate endpoint mints real-time access tokens, so it must
 * never be reachable anonymously: the session gate in middleware.ts fronts
 * this route, and the internal secret authenticates the proxy hop.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    const apiBaseUrl = process.env.API_BASE_URL
    if (!apiBaseUrl) {
      throw new Error('API_BASE_URL not configured')
    }

    const fastApiUrl = `${apiBaseUrl}/api/v1/negotiate?${searchParams.toString()}`

    const headers = getInternalApiHeaders()

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

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store'
      }
    })
  } catch (error) {
    console.error('[NEGOTIATE PROXY] failed:', error)
    return NextResponse.json({ error: 'Negotiate failed' }, { status: 502 })
  }
}

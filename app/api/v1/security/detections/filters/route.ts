import { NextResponse } from 'next/server'
import { getInternalApiHeaders } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const headers = { 'Cache-Control': 'no-cache, no-store, must-revalidate' }

/** Collected detection vendors, categories, severities and statuses. */
export async function GET(request: Request) {
  const base = process.env.API_BASE_URL
  if (!base) return NextResponse.json({ error: 'API configuration unavailable' }, { status: 500, headers })
  const incoming = new URL(request.url).searchParams
  const params = new URLSearchParams()
  for (const key of ['platform', 'includeArchived']) {
    const value = incoming.get(key)
    if (value) params.set(key, value)
  }
  try {
    const response = await fetch(`${base}/api/v1/security/detections/filters?${params}`, {
      headers: getInternalApiHeaders(), cache: 'no-store', signal: AbortSignal.timeout(60000),
    })
    return NextResponse.json(await response.json(), { status: response.status, headers })
  } catch {
    return NextResponse.json({ error: 'Detection selections unavailable. Try again.' }, { status: 503, headers })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getInternalApiHeaders } from '@/lib/api-auth'
import { requireAdmin } from '@/lib/auth-roles'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type BulkResult = {
  serialNumber: string
  ok: boolean
  status: number
  detail?: string
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin(request)
  if (guard instanceof NextResponse) return guard

  const apiBaseUrl = process.env.API_BASE_URL
  if (!apiBaseUrl) {
    return NextResponse.json({ error: 'API_BASE_URL not configured' }, { status: 500 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body must be JSON' }, { status: 400 })
  }

  const serials = (body as { serialNumbers?: unknown })?.serialNumbers
  if (!Array.isArray(serials) || serials.length === 0) {
    return NextResponse.json(
      { error: 'Body must include non-empty serialNumbers: string[]' },
      { status: 400 }
    )
  }

  const cleaned = Array.from(
    new Set(
      serials
        .filter((s): s is string => typeof s === 'string')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    )
  )

  if (cleaned.length === 0) {
    return NextResponse.json({ error: 'No valid serial numbers provided' }, { status: 400 })
  }

  if (cleaned.length > 100) {
    return NextResponse.json(
      { error: 'Bulk delete is capped at 100 devices per request' },
      { status: 400 }
    )
  }

  const headers = getInternalApiHeaders()
  const results: BulkResult[] = []

  for (const serialNumber of cleaned) {
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/v1/device/${encodeURIComponent(serialNumber)}?confirm=true`,
        { method: 'DELETE', headers, cache: 'no-store' }
      )
      let detail: string | undefined
      if (!response.ok) {
        try {
          const data = await response.json()
          detail = data?.detail || data?.error
        } catch {
          detail = await response.text().catch(() => undefined)
        }
      }
      results.push({
        serialNumber,
        ok: response.ok,
        status: response.status,
        detail,
      })
    } catch (error) {
      results.push({
        serialNumber,
        ok: false,
        status: 0,
        detail: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const succeeded = results.filter((r) => r.ok).length
  return NextResponse.json({
    requested: cleaned.length,
    succeeded,
    failed: cleaned.length - succeeded,
    results,
  })
}

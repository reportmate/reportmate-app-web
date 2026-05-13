import { NextRequest, NextResponse } from 'next/server'
import { getInternalApiHeaders } from '@/lib/api-auth'
import { requireAdmin } from '@/lib/auth-roles'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  const guard = await requireAdmin(request)
  if (guard instanceof NextResponse) return guard

  const { deviceId } = await params
  const serial = encodeURIComponent(deviceId)

  const apiBaseUrl = process.env.API_BASE_URL
  if (!apiBaseUrl) {
    return NextResponse.json({ error: 'API_BASE_URL not configured' }, { status: 500 })
  }

  try {
    const response = await fetch(`${apiBaseUrl}/api/v1/device/${serial}?confirm=true`, {
      method: 'DELETE',
      headers: getInternalApiHeaders(),
      cache: 'no-store',
    })
    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('[ADMIN] Delete device failed:', error)
    return NextResponse.json(
      { error: 'Failed to delete device', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

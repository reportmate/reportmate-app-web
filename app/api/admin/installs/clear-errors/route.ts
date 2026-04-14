import { NextResponse } from 'next/server'
import { getInternalApiHeaders } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const days = searchParams.get('days') || '10'

    const apiBaseUrl = process.env.API_BASE_URL
    if (!apiBaseUrl) {
      return NextResponse.json(
        { error: 'API_BASE_URL not configured' },
        { status: 500 }
      )
    }

    const headers = getInternalApiHeaders()
    const response = await fetch(
      `${apiBaseUrl}/api/v1/admin/installs/clear-errors?days=${encodeURIComponent(days)}`,
      { method: 'DELETE', headers, cache: 'no-store' }
    )

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('[ADMIN] Clear installs errors failed:', error)
    return NextResponse.json(
      { error: 'Failed to clear installs errors', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

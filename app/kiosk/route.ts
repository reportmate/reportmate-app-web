import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { matchKioskToken, issueKioskSession } from '../../src/lib/kiosk/tokens'
import { safeKioskPath } from '../../src/lib/kiosk/role'
import { getInternalApiHeaders } from '../../lib/api-auth'

export const dynamic = 'force-dynamic'

/** The kiosk home page from Settings; the events feed when it cannot be read. */
async function kioskHomePath(): Promise<string> {
  const apiBaseUrl = process.env.API_BASE_URL
  if (!apiBaseUrl) return '/events'
  try {
    const response = await fetch(`${apiBaseUrl}/api/v1/settings`, { headers: getInternalApiHeaders(), cache: 'no-store' })
    if (!response.ok) return '/events'
    const data = await response.json()
    return safeKioskPath(data?.value?.kiosk?.homePath)
  } catch {
    return '/events'
  }
}

/**
 * GET /kiosk?token=<token>[&next=/events]
 *
 * Exchanges a kiosk token for a viewer session cookie and redirects to the
 * display's home page (Settings → Kiosk Displays, or an explicit `next`). The
 * cookie is the same NextAuth JWT the Entra flow issues, so the middleware and
 * every page treat it as a signed-in session; the role claim is what narrows
 * it. The token itself is pinned in a second cookie so the middleware can
 * renew the session after NextAuth shortens it to the app's session lifetime.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  const label = matchKioskToken(token)
  if (!label || !token) {
    return NextResponse.json({ error: 'Unauthorized', details: 'Unknown kiosk token' }, { status: 401 })
  }

  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Kiosk sessions are not configured' }, { status: 500 })
  }

  const next = request.nextUrl.searchParams.get('next')
  const target = next ? safeKioskPath(next) : await kioskHomePath()
  const base = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin
  const response = NextResponse.redirect(new URL(target, base))

  await issueKioskSession(response, { label, token, secret, secure: process.env.NODE_ENV === 'production' })
  return response
}

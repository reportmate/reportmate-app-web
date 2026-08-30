import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { matchKioskToken, issueKioskSession } from '../../src/lib/kiosk/tokens'

export const dynamic = 'force-dynamic'

/**
 * GET /kiosk?token=<token>[&next=/events]
 *
 * Exchanges a kiosk token for a viewer session cookie and redirects to the
 * requested read-only page. The cookie is the same NextAuth JWT the Entra
 * flow issues, so the middleware and every page treat it as a signed-in
 * session; the role claim is what narrows it. The token itself is pinned in
 * a second cookie so the middleware can renew the session after NextAuth
 * shortens it to the app's session lifetime.
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

  const next = request.nextUrl.searchParams.get('next') || '/events'
  const target = next.startsWith('/') && !next.startsWith('//') ? next : '/events'
  const base = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin
  const response = NextResponse.redirect(new URL(target, base))

  await issueKioskSession(response, { label, token, secret, secure: process.env.NODE_ENV === 'production' })
  return response
}

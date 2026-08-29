import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { encode } from 'next-auth/jwt'
import { matchKioskToken, KIOSK_ROLE, KIOSK_SESSION_DAYS } from '../../src/lib/kiosk/tokens'

export const dynamic = 'force-dynamic'

/**
 * GET /kiosk?token=<token>[&next=/events]
 *
 * Exchanges a kiosk token for a viewer session cookie and redirects to the
 * requested read-only page. The cookie is the same NextAuth JWT the Entra
 * flow issues, so the middleware and every page treat it as a signed-in
 * session; the role claim is what narrows it.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  const label = matchKioskToken(token)
  if (!label) {
    return NextResponse.json({ error: 'Unauthorized', details: 'Unknown kiosk token' }, { status: 401 })
  }

  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Kiosk sessions are not configured' }, { status: 500 })
  }

  const maxAge = KIOSK_SESSION_DAYS * 24 * 60 * 60
  const jwt = await encode({
    secret,
    maxAge,
    token: {
      name: `Kiosk ${label}`,
      email: `${label}@kiosk.reportmate`,
      role: KIOSK_ROLE,
      kiosk: label,
    },
  })

  const next = request.nextUrl.searchParams.get('next') || '/events'
  const target = next.startsWith('/') && !next.startsWith('//') ? next : '/events'
  const base = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin
  const response = NextResponse.redirect(new URL(target, base))

  const secure = process.env.NODE_ENV === 'production'
  response.cookies.set({
    name: secure ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
    value: jwt,
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge,
  })
  return response
}

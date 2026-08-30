/**
 * Kiosk viewer sessions.
 *
 * A display that shows ReportMate all day should not hold a person's Entra
 * session. KIOSK_TOKENS carries one opaque token per screen (comma-separated,
 * sourced from Key Vault or Secrets Manager). Presenting a listed token to
 * /kiosk mints a NextAuth JWT with role "viewer": read-only pages and
 * read-only APIs, nothing else. Rotating the secret ends every session.
 *
 * NextAuth's own session endpoint re-issues every session JWT with the app's
 * session.maxAge (24 hours), so the long expiry stamped at /kiosk does not
 * survive the first session fetch. The kiosk token is therefore pinned in a
 * second, long-lived cookie, and the middleware mints a fresh viewer session
 * from it whenever the session JWT has lapsed — a screen never lands on the
 * sign-in page while its token is still listed.
 */

import { encode } from 'next-auth/jwt'
import type { NextResponse } from 'next/server'

export const KIOSK_ROLE = 'viewer'
export const KIOSK_SESSION_DAYS = 365

export const sessionCookieName = (secure: boolean) =>
  secure ? '__Secure-next-auth.session-token' : 'next-auth.session-token'
export const kioskCookieName = (secure: boolean) =>
  secure ? '__Secure-reportmate-kiosk' : 'reportmate-kiosk'

/** Parse KIOSK_TOKENS as "label:token" or bare "token" entries. */
export function kioskTokens(): Array<{ label: string; token: string }> {
  const raw = process.env.KIOSK_TOKENS || ''
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map((entry, i) => {
      const sep = entry.indexOf(':')
      return sep > 0
        ? { label: entry.slice(0, sep), token: entry.slice(sep + 1) }
        : { label: `kiosk-${i + 1}`, token: entry }
    })
    .filter(e => e.token.length >= 16)
}

/** Constant-time comparison that also runs in the edge middleware runtime. */
function safeEqual(a: string, b: string): boolean {
  const ab = new TextEncoder().encode(a)
  const bb = new TextEncoder().encode(b)
  if (ab.length !== bb.length) return false
  let diff = 0
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i]
  return diff === 0
}

/** The label of the kiosk a presented token belongs to, or null. */
export function matchKioskToken(presented: string | null | undefined): string | null {
  if (!presented) return null
  for (const { label, token } of kioskTokens()) {
    if (safeEqual(presented, token)) return label
  }
  return null
}

/**
 * Set the viewer session for a kiosk on a response, with the kiosk token
 * pinned beside it so the session can be re-minted after NextAuth shortens it.
 */
export async function issueKioskSession(
  response: NextResponse,
  opts: { label: string; token: string; secret: string; secure: boolean },
): Promise<void> {
  const maxAge = KIOSK_SESSION_DAYS * 24 * 60 * 60
  const jwt = await encode({
    secret: opts.secret,
    maxAge,
    token: {
      name: `Kiosk ${opts.label}`,
      email: `${opts.label}@kiosk.reportmate`,
      role: KIOSK_ROLE,
      kiosk: opts.label,
    },
  })
  const base = { httpOnly: true, sameSite: 'lax' as const, secure: opts.secure, path: '/', maxAge }
  response.cookies.set({ name: sessionCookieName(opts.secure), value: jwt, ...base })
  response.cookies.set({ name: kioskCookieName(opts.secure), value: opts.token, ...base })
}

/**
 * Routes a viewer may reach. Everything is read-only by construction: the
 * middleware also refuses any method other than GET/HEAD for a viewer.
 */
const VIEWER_PAGE_PREFIXES = ['/dashboard', '/events', '/devices', '/device/', '/system', '/installs', '/applications', '/hardware', '/network', '/security', '/management', '/inventory', '/identity', '/peripherals', '/reports']
const VIEWER_API_PREFIXES = ['/api/dashboard', '/api/events', '/api/device', '/api/device-names', '/api/stats', '/api/version', '/api/v1/devices', '/api/v1/device', '/api/v1/events', '/api/v1/installs', '/api/v1/identity', '/api/v1/system', '/api/v1/applications', '/api/v1/hardware', '/api/v1/network', '/api/v1/security', '/api/v1/management', '/api/v1/inventory', '/api/v1/peripherals']

export function viewerMayRead(pathname: string): boolean {
  if (pathname === '/' || pathname === '/kiosk') return true
  if (pathname.startsWith('/api/')) return VIEWER_API_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p + '?'))
  return VIEWER_PAGE_PREFIXES.some(p => pathname === p || pathname.startsWith(p.endsWith('/') ? p : p + '/'))
}

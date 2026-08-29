/**
 * Kiosk viewer sessions.
 *
 * A display that shows ReportMate all day should not hold a person's Entra
 * session. KIOSK_TOKENS carries one opaque token per screen (comma-separated,
 * sourced from Key Vault or Secrets Manager). Presenting a listed token to
 * /kiosk mints a long-lived NextAuth JWT with role "viewer": read-only pages
 * and read-only APIs, nothing else. Rotating the secret ends every session.
 */

import { timingSafeEqual } from 'crypto'

export const KIOSK_ROLE = 'viewer'
export const KIOSK_SESSION_DAYS = 365

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

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && timingSafeEqual(ab, bb)
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

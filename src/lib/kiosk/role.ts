/** The session role a kiosk viewer carries. Kept free of server imports so client components can read it. */
export const KIOSK_ROLE = 'viewer'

/** A kiosk home must be a same-origin path: anything else falls back to the events feed. */
export function safeKioskPath(candidate: unknown): string {
  const path = typeof candidate === 'string' ? candidate.trim() : ''
  return path.startsWith('/') && !path.startsWith('//') && !/[\s\\]/.test(path) ? path : '/events'
}

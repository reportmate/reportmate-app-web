/**
 * Guards for links built from URL parameters or device-reported values, so
 * a link only ever leads where the page intends.
 */

/**
 * An in-app path from a query parameter such as `from=`: only a path on this
 * site ("/…", not "//host" or "/\\host"), otherwise the fallback.
 */
export function safeInternalPath(raw: unknown, fallback: string): string {
  if (typeof raw !== 'string') return fallback
  const value = raw.trim()
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback
  try {
    const url = new URL(value, 'http://internal.invalid')
    return url.origin === 'http://internal.invalid' ? value : fallback
  } catch {
    return fallback
  }
}

/** A host for ssh:// or vnc:// links: an IP address or host name, nothing else. */
export function safeHost(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  const value = raw.trim()
  return /^(\[[0-9a-fA-F:.%]+\]|[0-9a-fA-F:.%]+|[A-Za-z0-9](?:[A-Za-z0-9.-]{0,252}[A-Za-z0-9])?)$/.test(value) ? value : ''
}

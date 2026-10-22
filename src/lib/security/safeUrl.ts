/**
 * Guards for links built from device-reported or URL-supplied values. A
 * device can report any string, and React 18 renders a `javascript:` href
 * as-is, so every such value passes through one of these before it becomes
 * an href or a navigation target.
 */

/** The URL when it parses as http: or https:, otherwise ''. */
export function safeHttpUrl(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  const value = raw.trim()
  if (!value) return ''
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : ''
  } catch {
    return ''
  }
}

export const CVE_ID = /^CVE-\d{4}-\d{4,}$/

/**
 * The link for a CVE. A well-formed ID builds a known page (MSRC for Windows
 * updates, NVD otherwise); anything else falls back to the reported URL,
 * and only when it is http(s).
 */
export function cveHref(id: unknown, reportedUrl?: unknown, source: 'windows' | 'other' = 'other'): string {
  const cve = typeof id === 'string' ? id.trim() : ''
  if (CVE_ID.test(cve)) {
    return source === 'windows'
      ? `https://msrc.microsoft.com/update-guide/vulnerability/${cve}`
      : `https://nvd.nist.gov/vuln/detail/${cve}`
  }
  return safeHttpUrl(reportedUrl)
}

/**
 * An in-app path from a query parameter such as `from=`: only a path on this
 * origin ("/…", not "//host" or "/\\host"), otherwise the fallback.
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

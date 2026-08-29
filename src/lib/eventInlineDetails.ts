/**
 * Inline detail lines for an event row: what a run installed, warned about or
 * failed on, straight from its payload. Shared by the fleet events feed, the
 * dashboard Recent Events widget and the device Events tab so a row reads the
 * same everywhere.
 */

// Payload keys that carry structure/metadata rather than an installed package.
// Everything else with a string value in a success payload is a "name → version" pair.
const RESERVED_PAYLOAD_KEYS = new Set([
  'count', 'errors', 'warnings', 'error_items', 'warning_items', 'failed_items',
  'error_messages', 'warning_messages', 'module_status', 'warning_count', 'error_count',
  'run_type', 'session_id', 'modules', 'modules_processed', 'message', 'summary',
  'items', 'action', 'duration_seconds', 'item_warning_count', 'operational_warning_count',
  'operational_warnings', 'session_installs', 'session_updates', 'session_removals',
])

// Extract human-readable detail lines from a loaded event payload so they can be
// shown inline in the Message column without expanding the raw payload.
// Handles the shapes ReportMate actually emits:
//   Munki:   { errors: "a; b", warnings: "c; d" }         (semicolon-joined string)
//   Cimian:  { warning_items: ["Name"], error_items: [] }  (array of names)
//   Installs:{ failed_items: [{ displayName, error }] }    (array of objects)
//   Generic: { error_messages: [...], warning_messages: [...] }
//   Success: { "Managed Safari": "15.6.1", "ZoomPrefs": "14.1" }  (name → version)
//   Cimian:  { items: [{ name: "Chrome", version: "151.0.7922.170" }] }  (array of objects)
// A line is either a run message (sentence from the client) or an item
// ("Name version"); the flag decides how the row renders it.
export type InlineLine = { text: string; isMessage: boolean }
export const extractInlineDetails = (payload: unknown): { errors: InlineLine[]; warnings: InlineLine[]; successes: string[] } => {
  const errors: InlineLine[] = []
  const warnings: InlineLine[] = []
  const successes: string[] = []
  if (!payload || typeof payload !== 'object') return { errors, warnings, successes }
  const p = payload as Record<string, any>

  const pushString = (target: InlineLine[], val: unknown) => {
    if (typeof val === 'string' && val.trim()) {
      val.split(';').map(s => s.trim()).filter(Boolean).forEach(s => target.push({ text: s, isMessage: true }))
    }
  }
  const pushItems = (target: InlineLine[], val: unknown) => {
    if (!Array.isArray(val)) return
    for (const item of val) {
      if (typeof item === 'string') {
        if (item.trim()) target.push({ text: item.trim(), isMessage: false })
      } else if (item && typeof item === 'object') {
        const name = item.displayName || item.name || ''
        const version = item.version ? ` ${item.version}` : ''
        const detail = item.error || item.warning || ''
        const line = detail ? (name ? `${name}${version}: ${detail}` : detail) : `${name}${version}`
        if (line) target.push({ text: line, isMessage: Boolean(detail) })
      }
    }
  }

  // The Windows installs collector sends its success items as an array of
  // { name, version } objects rather than a flat map, and always includes them
  // even when the summary message is a count. Read them so a multi-package run
  // can still list what it installed.
  if (Array.isArray(p.items)) {
    for (const item of p.items) {
      if (typeof item === 'string') {
        if (item.trim()) successes.push(item.trim())
      } else if (item && typeof item === 'object') {
        const name = String(item.displayName || item.name || '').trim()
        const version = String(item.version || '').trim()
        if (name) successes.push(version ? `${name} ${version}` : name)
      }
    }
  }

  pushString(errors, p.errors)
  pushString(warnings, p.warnings)
  pushItems(errors, p.error_messages)
  pushItems(warnings, p.warning_messages)
  pushItems(errors, p.error_items)
  pushItems(warnings, p.warning_items)
  pushItems(errors, p.failed_items)

  // Success payloads are a flat "package name → version" map — one line each.
  for (const [key, value] of Object.entries(p)) {
    if (RESERVED_PAYLOAD_KEYS.has(key)) continue
    if (typeof value === 'string' && value.trim()) {
      successes.push(`${key} ${value.trim()}`)
    }
  }

  const dedupe = (lines: InlineLine[]) => {
    const seen = new Set<string>()
    return lines.filter(l => (seen.has(l.text) ? false : (seen.add(l.text), true)))
  }
  return {
    errors: dedupe(errors),
    warnings: dedupe(warnings),
    successes: Array.from(new Set(successes)),
  }
}

const payloadCache = new Map<string, unknown>()
const inflight = new Map<string, Promise<unknown>>()

/** Fetch one event's payload, once per session. */
export async function fetchEventPayload(eventId: string): Promise<unknown> {
  if (payloadCache.has(eventId)) return payloadCache.get(eventId)
  const pending = inflight.get(eventId)
  if (pending) return pending
  const promise = fetch(`/api/events/${encodeURIComponent(eventId)}/payload`)
    .then(async response => {
      if (!response.ok) throw new Error(`Payload unavailable (${response.status})`)
      const body = await response.json()
      const payload = body?.payload ?? body
      payloadCache.set(eventId, payload)
      return payload
    })
    .finally(() => inflight.delete(eventId))
  inflight.set(eventId, promise)
  return promise
}

export function cachedEventPayload(eventId: string): unknown {
  return payloadCache.get(eventId)
}

/** Run messages get a mono chip; a bare "Name version" item stays plain text. */
export const inlineLineClass = (line: InlineLine, tone: string) =>
  line.isMessage
    ? `text-xs font-mono px-2.5 py-1.5 rounded bg-gray-100 dark:bg-gray-900/50 break-words ${tone}`
    : `text-sm break-words ${tone}`

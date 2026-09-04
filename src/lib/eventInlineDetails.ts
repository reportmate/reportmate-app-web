import { cleanLogText } from './logText'
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
  'operational_warnings', 'operational_errors', 'session_installs', 'session_updates', 'session_removals',
  'recommendation', 'collection_type', 'collectionType', 'operating_system', 'display_version',
  'version', 'uptime', 'previous_boot_time', 'current_boot_time',
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
export type InlineLine = { text: string; isMessage: boolean; name?: string; version?: string; message?: string }
export const extractInlineDetails = (payload: unknown): { errors: InlineLine[]; warnings: InlineLine[]; successes: string[]; isRemoval: boolean } => {
  const errors: InlineLine[] = []
  const warnings: InlineLine[] = []
  const successes: string[] = []
  if (!payload || typeof payload !== 'object') return { errors, warnings, successes, isRemoval: false }
  const p = payload as Record<string, any>
  // A removal run is a success, but reads in the Removed colour rather than green.
  const isRemoval = String(p.action || '').toLowerCase() === 'remove' || Array.isArray(p.removed_items)

  const pushString = (target: InlineLine[], val: unknown) => {
    if (typeof val === 'string' && val.trim()) {
      cleanLogText(val).split(';').map(s => s.trim()).filter(Boolean).forEach(s => target.push({ text: s, isMessage: true }))
    }
  }
  const pushItems = (target: InlineLine[], val: unknown) => {
    if (!Array.isArray(val)) return
    for (const item of val) {
      if (typeof item === 'string') {
        if (item.trim()) target.push({ text: item.trim(), isMessage: false })
      } else if (item && typeof item === 'object') {
        const name = String(item.displayName || item.name || '').trim()
        const version = String(item.version || '').trim()
        const detail = cleanLogText(item.error || item.warning || item.message)
        const line = detail ? (name ? `${name}${version ? ` ${version}` : ''}: ${detail}` : detail) : `${name}${version ? ` ${version}` : ''}`
        if (line) target.push({ text: line, isMessage: Boolean(detail), name: name || undefined, version: version || undefined, message: detail || undefined })
      }
    }
  }

  // The Windows installs collector sends its success items as an array of
  // { name, version } objects rather than a flat map, and always includes them
  // even when the summary message is a count. Read them so a multi-package run
  // can still list what it installed.
  // `removed_items` is the same shape; a removal run carries its packages there so
  // the row can colour them as a removal rather than an install.
  for (const list of [p.items, p.removed_items, p.installed_items]) {
    if (!Array.isArray(list)) continue
    for (const item of list) {
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
  // Problems the client could not attribute to an item (catalog, manifest,
  // download failures) arrive as operational_* arrays of { message }.
  pushItems(errors, p.operational_errors)
  pushItems(warnings, p.operational_warnings)

  // A client recommendation is a run message: the module is telling the
  // operator something, not naming a package.
  if (typeof p.recommendation === 'string' && p.recommendation.trim()) {
    warnings.push({ text: p.recommendation.trim(), isMessage: true })
  }

  // Success payloads are a flat "package name → version" map — one line each.
  // Only a version-shaped value counts; other strings are context.
  const flatPairs = Object.entries(p).filter(
    ([key, value]) => !RESERVED_PAYLOAD_KEYS.has(key) && !/count$/i.test(key) && typeof value === 'string'
  ) as Array<[string, string]>
  // Munki reports no version for a removal, so its packages arrive as "Name": "".
  // A blank value is only safe to read as a package when every pair is blank —
  // otherwise it is a context field that happens to be empty.
  const allBlank = flatPairs.length > 0 && flatPairs.every(([, value]) => value.trim() === '')
  for (const [key, value] of flatPairs) {
    const trimmed = value.trim()
    if (trimmed === '') { if (allBlank) successes.push(key) }
    else if (/^\d/.test(trimmed)) successes.push(`${key} ${trimmed}`)
  }

  const dedupe = (lines: InlineLine[]) => {
    const seen = new Set<string>()
    return lines.filter(l => (seen.has(l.text) ? false : (seen.add(l.text), true)))
  }
  return {
    errors: dedupe(errors),
    warnings: dedupe(warnings),
    successes: Array.from(new Set(successes)),
    isRemoval,
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
    ? `text-xs font-mono px-2.5 py-1.5 rounded bg-gray-100 dark:bg-gray-900/50 whitespace-pre-wrap break-words ${tone}`
    : `text-sm break-words ${tone}`

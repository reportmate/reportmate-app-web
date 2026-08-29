/**
 * Turn a raw event payload into the sections the Recent Events accordion renders.
 *
 * Event payloads are not uniform: a data-collection event carries a module list, an
 * installs event carries an items array, and a Munki failure carries a single
 * semicolon-joined `errors` string. This module normalises all of them into the
 * same four sections so the row rendering stays declarative.
 */

export interface EventDetailItem {
  name: string
  version?: string
  detail?: string
}

export interface EventDetailGroup {
  key: string
  label: string
  tone: 'neutral' | 'success' | 'warning' | 'error'
  items: EventDetailItem[]
}

export interface EventDetailSummary {
  modules: string[]
  groups: EventDetailGroup[]
  messages: Array<{ tone: 'warning' | 'error' | 'neutral'; text: string }>
  /** Progress lines dropped from the message list, so the count is still honest. */
  suppressedMessageCount: number
  context: Array<{ label: string; value: string }>
  isEmpty: boolean
}

// Munki pipes the raw `installer` command output into the errors string, which is
// mostly percentage ticks. They are noise in a summary but shouldn't vanish silently.
const PROGRESS_LINE = /^installer:(%|PHASE:|STATUS:)/i
const DIVIDER_LINE = /^-{5,}$/

const CONTEXT_LABELS: Record<string, string> = {
  run_type: 'Run type',
  session_id: 'Session',
  duration_seconds: 'Duration',
  collection_type: 'Collection',
  collectionType: 'Collection',
  module_status: 'Status',
  session_installs: 'Installs',
  session_updates: 'Updates',
  session_removals: 'Removals',
  operating_system: 'OS',
  display_version: 'Release',
  version: 'Version',
  uptime: 'Uptime',
  action: 'Action',
}

const ITEM_GROUPS: Array<{ key: string; label: string; tone: EventDetailGroup['tone'] }> = [
  { key: 'items', label: 'Items', tone: 'neutral' },
  { key: 'newlyInstalledItems', label: 'Newly installed', tone: 'success' },
  { key: 'installed_items', label: 'Installed', tone: 'success' },
  { key: 'removed_items', label: 'Removed', tone: 'neutral' },
  { key: 'warning_items', label: 'Warnings', tone: 'warning' },
  { key: 'failed_items', label: 'Failed', tone: 'error' },
]

// Keys that carry structure or context rather than a package. Anything else with a
// string value in a Munki success payload is a "package name -> version" pair: the
// Mac client sends "13 packages installed" as exactly that flat map, so without
// this the accordion had nothing to list under the count.
const RESERVED_KEYS = new Set([
  'count', 'errors', 'warnings', 'error_items', 'warning_items', 'failed_items',
  'error_messages', 'warning_messages', 'module_status', 'warning_count', 'error_count',
  'run_type', 'session_id', 'modules', 'modules_processed', 'message', 'summary',
  'items', 'action', 'duration_seconds', 'item_warning_count', 'operational_warning_count',
  'operational_warnings', 'session_installs', 'session_updates', 'session_removals',
  'collection_type', 'collectionType', 'operating_system', 'display_version', 'version',
  'uptime', 'recommendation', 'previous_boot_time', 'current_boot_time',
  'previous_version', 'current_version', 'newlyInstalledItems', 'installed_items', 'removed_items',
])

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null

/** Split the semicolon-joined strings the clients send, and drop installer progress ticks. */
function splitMessages(raw: unknown): { kept: string[]; suppressed: number } {
  const lines: string[] = Array.isArray(raw)
    ? raw.map(v => String(v))
    : typeof raw === 'string'
      ? raw.split(';')
      : []

  const trimmed = lines.map(l => l.trim()).filter(l => l.length > 0)
  const kept = trimmed.filter(l => !PROGRESS_LINE.test(l) && !DIVIDER_LINE.test(l))
  // A run whose output was nothing but progress still needs to say something.
  if (kept.length === 0 && trimmed.length > 0) {
    return { kept: [trimmed[trimmed.length - 1]], suppressed: trimmed.length - 1 }
  }
  return { kept, suppressed: trimmed.length - kept.length }
}

function normalizeItem(raw: unknown): EventDetailItem | null {
  if (typeof raw === 'string') return raw.trim() ? { name: raw.trim() } : null
  const rec = asRecord(raw)
  if (!rec) return null
  const name = String(rec.name ?? rec.displayName ?? rec.display_name ?? rec.item_name ?? '').trim()
  if (!name) return null
  const version = rec.version ?? rec.installedVersion ?? rec.installed_version
  const detail = rec.error ?? rec.warning ?? rec.message ?? rec.reason ?? rec.pending_reason
  return {
    name,
    version: version ? String(version) : undefined,
    detail: detail ? String(detail) : undefined,
  }
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const rem = seconds % 60
  return rem ? `${mins}m ${rem}s` : `${mins}m`
}

export function summarizeEventPayload(payload: unknown): EventDetailSummary {
  const p = asRecord(payload)
  const empty: EventDetailSummary = {
    modules: [], groups: [], messages: [], suppressedMessageCount: 0, context: [], isEmpty: true,
  }
  if (!p) return empty

  // Modules arrive either as an array or as a comma-joined string.
  const rawModules = p.modules
  const modules = (Array.isArray(rawModules)
    ? rawModules.map(m => String(m))
    : typeof rawModules === 'string'
      ? rawModules.split(',')
      : []
  ).map(m => m.trim()).filter(Boolean)

  const groups: EventDetailGroup[] = []
  for (const { key, label, tone } of ITEM_GROUPS) {
    const raw = p[key]
    if (!Array.isArray(raw)) continue
    const items = raw.map(normalizeItem).filter((i): i is EventDetailItem => i !== null)
    if (items.length) groups.push({ key, label, tone, items })
  }
  const flatInstalled: EventDetailItem[] = []
  for (const [key, value] of Object.entries(p)) {
    if (RESERVED_KEYS.has(key) || typeof value !== 'string' || !value.trim()) continue
    // A package pair is "Name": "version"; anything named like a counter
    // (moduleCount) or whose value is not version-shaped is context, not a package
    if (/count$/i.test(key) || !/^\d/.test(value.trim())) continue
    flatInstalled.push({ name: key, version: value.trim() })
  }
  if (flatInstalled.length && !groups.some(g => g.key === 'installed_items')) {
    groups.push({ key: 'installed_items', label: 'Installed', tone: 'success', items: flatInstalled })
  }

  const messages: EventDetailSummary['messages'] = []
  let suppressedMessageCount = 0
  for (const [key, tone] of [
    ['errors', 'error'], ['error_messages', 'error'],
    ['warnings', 'warning'], ['warning_messages', 'warning'],
    ['recommendation', 'warning'],
  ] as const) {
    const { kept, suppressed } = splitMessages(p[key])
    suppressedMessageCount += suppressed
    for (const text of kept) messages.push({ tone, text })
  }

  const context: EventDetailSummary['context'] = []
  for (const [key, label] of Object.entries(CONTEXT_LABELS)) {
    const value = p[key]
    if (value === undefined || value === null || value === '') continue
    if (key === 'duration_seconds') {
      const seconds = Number(value)
      if (Number.isFinite(seconds)) context.push({ label, value: formatDuration(seconds) })
      continue
    }
    if (typeof value === 'object') continue
    context.push({ label, value: String(value) })
  }

  return {
    modules,
    groups,
    messages,
    suppressedMessageCount,
    context,
    isEmpty: modules.length === 0 && groups.length === 0 && messages.length === 0 && context.length === 0,
  }
}

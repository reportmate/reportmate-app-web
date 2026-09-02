/**
 * Management Logs - Reader Only
 *
 * Both clients survey the platform's management-tool log roots
 * (C:\ProgramData\Managed*\logs on Windows, /Library/Managed * /logs on macOS)
 * and report them as the `logs` section of the management module: per root,
 * the file inventory, the latest session summary, error and warning counts and
 * capped tails of the most relevant logs. The API strips the tails from the
 * device, info and module payloads; /api/device/[serial]/logs/[tool] serves one
 * root with its tails. This reader only normalises the shape.
 */

export interface LogFileEntry {
  name: string
  path: string
  bytes: number
  modified?: string
}

export interface LogSessionSummary {
  sessionId?: string
  status?: string
  startTime?: string
  endTime?: string
  durationSeconds?: number
  runType?: string
  errors?: number
  warnings?: number
}

export interface LogTail {
  file?: string
  lines: string[]
  truncated?: boolean
  bytes?: number
}

export interface LogRoot {
  /** Stable key derived from the directory name: installs, bootstrap, reports, state, encryption, users, utilities, notifications, plus mdm and installer */
  tool: string
  /** Directory display name, e.g. "Managed Installs" */
  name: string
  path: string
  layout?: 'sessions' | 'flat'
  fileCount?: number
  totalBytes?: number
  newestModified?: string
  files: LogFileEntry[]
  latestSession?: LogSessionSummary | null
  /** Relative path of the log the viewer opens first */
  primaryLog?: string
  errorCount?: number
  warningCount?: number
  /** Tails of the root's most relevant logs, primary first; absent until fetched per tool */
  tails: LogTail[]
}

export interface LogsInfo {
  platform?: string
  collectedAt?: string
  moduleVersion?: string
  roots: LogRoot[]
}

function pick(source: any, camel: string, snake?: string): any {
  if (!source || typeof source !== 'object') return undefined
  if (source[camel] !== undefined) return source[camel]
  if (snake && source[snake] !== undefined) return source[snake]
  return undefined
}

function toNumber(value: any): number | undefined {
  if (value === null || value === undefined || value === '') return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

export function normalizeLogRoot(raw: any): LogRoot | null {
  if (!raw || typeof raw !== 'object') return null
  const tool = String(pick(raw, 'tool') ?? '').trim()
  if (!tool) return null

  const files = Array.isArray(raw.files)
    ? raw.files
        .filter((f: any) => f && typeof f === 'object')
        .map((f: any) => ({
          name: String(pick(f, 'name') ?? ''),
          path: String(pick(f, 'path') ?? pick(f, 'name') ?? ''),
          bytes: toNumber(pick(f, 'bytes')) ?? 0,
          modified: pick(f, 'modified'),
        }))
    : []

  const sessionRaw = pick(raw, 'latestSession', 'latest_session')
  const latestSession: LogSessionSummary | null = sessionRaw && typeof sessionRaw === 'object'
    ? {
        sessionId: pick(sessionRaw, 'sessionId', 'session_id'),
        status: pick(sessionRaw, 'status'),
        startTime: pick(sessionRaw, 'startTime', 'start_time'),
        endTime: pick(sessionRaw, 'endTime', 'end_time'),
        durationSeconds: toNumber(pick(sessionRaw, 'durationSeconds', 'duration_seconds')),
        runType: pick(sessionRaw, 'runType', 'run_type'),
        errors: toNumber(pick(sessionRaw, 'errors')),
        warnings: toNumber(pick(sessionRaw, 'warnings')),
      }
    : null

  const tails: LogTail[] = Array.isArray(raw.tails)
    ? raw.tails
        .filter((t: any) => t && typeof t === 'object')
        .map((t: any) => ({
          file: pick(t, 'file'),
          lines: Array.isArray(t.lines) ? t.lines.map((l: any) => String(l)) : [],
          truncated: Boolean(pick(t, 'truncated')),
          bytes: toNumber(pick(t, 'bytes')),
        }))
    : []

  return {
    tool,
    name: String(pick(raw, 'name') ?? tool),
    path: String(pick(raw, 'path') ?? ''),
    layout: pick(raw, 'layout'),
    fileCount: toNumber(pick(raw, 'fileCount', 'file_count')),
    totalBytes: toNumber(pick(raw, 'totalBytes', 'total_bytes')),
    newestModified: pick(raw, 'newestModified', 'newest_modified'),
    files,
    latestSession,
    primaryLog: pick(raw, 'primaryLog', 'primary_log'),
    errorCount: toNumber(pick(raw, 'errorCount', 'error_count')),
    warningCount: toNumber(pick(raw, 'warningCount', 'warning_count')),
    tails,
  }
}

/**
 * Read the management module's logs section. Returns null when the device has
 * never reported it, which the UI renders by omitting the section entirely.
 */
export function extractLogs(modules: any): LogsInfo | null {
  const raw = modules?.management?.logs
  if (!raw || typeof raw !== 'object') return null
  const roots = Array.isArray(raw.roots)
    ? raw.roots.map(normalizeLogRoot).filter((r: LogRoot | null): r is LogRoot => r !== null)
    : []
  return {
    platform: pick(raw, 'platform'),
    collectedAt: pick(raw, 'collectedAt', 'collected_at') ?? pick(raw, 'collectionTimestamp'),
    moduleVersion: pick(raw, 'moduleVersion', 'module_version'),
    roots: orderLogRoots(roots),
  }
}

/**
 * Tab order: the MDM root first, then the management tools in the order the
 * client reported them, then the OS installer log last.
 */
export function orderLogRoots(roots: LogRoot[]): LogRoot[] {
  const rank = (root: LogRoot): number => {
    const tool = root.tool.toLowerCase()
    if (tool === 'mdm') return 0
    if (tool === 'installer') return 2
    return 1
  }
  return roots
    .map((root, index) => ({ root, index }))
    .sort((a, b) => rank(a.root) - rank(b.root) || a.index - b.index)
    .map(({ root }) => root)
}

/** "Managed Installs" -> "Installs"; falls back to the tool key in title case */
export function logRootLabel(root: Pick<LogRoot, 'name' | 'tool'>): string {
  const stripped = (root.name || '').replace(/^Managed\s*/i, '').trim()
  if (stripped) return stripped
  return root.tool.charAt(0).toUpperCase() + root.tool.slice(1)
}

/**
 * The product behind a log root, by platform: the Managed Installs root is
 * Munki on a Mac and Cimian on Windows, Managed State is Outset or StartSet,
 * and so on. Roots no product claims fall back to the directory label.
 */
const PRODUCT_NAMES: Record<string, { mac: string; windows: string }> = {
  installs: { mac: 'Munki', windows: 'Cimian' },
  bootstrap: { mac: 'BootstrapMate', windows: 'BootstrapMate' },
  reports: { mac: 'ReportMate', windows: 'ReportMate' },
  state: { mac: 'Outset', windows: 'StartSet' },
  encryption: { mac: 'Crypt', windows: 'Crypt Escrow' },
  users: { mac: 'ManageUsers', windows: 'ManageUsers' },
  utilities: { mac: 'Utilities', windows: 'Utilities' },
  notifications: { mac: 'swiftDialog', windows: 'csharpDialog' },
  installer: { mac: 'Installer', windows: 'Installer' },
}

export function logProductName(root: Pick<LogRoot, 'name' | 'tool'>, platform?: string): string {
  const tool = root.tool.toLowerCase()
  // The MDM root is named after the agent the client found (Intune, Jamf, ...).
  if (tool === 'mdm') return (root.name || '').trim() || 'MDM'
  const names = PRODUCT_NAMES[tool]
  if (!names) return logRootLabel(root)
  const isWindows = (platform || '').toLowerCase().startsWith('win')
  return isWindows ? names.windows : names.mac
}

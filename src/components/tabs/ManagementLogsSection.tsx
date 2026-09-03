/**
 * Management tab - Logs section
 *
 * Collapsible card, one inner tab per management-tool log root the device
 * reported (Managed Installs, Managed Bootstrap, Managed Reports, ...), and a
 * log picker inside each tab because every tool writes more than one file.
 * The summary comes from the management module's logs section, already on
 * the page; a tool's tails are fetched the first time its tab is opened.
 * Tools the device is not reporting never appear, and a device whose
 * management module has no logs section renders nothing.
 */

'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { CopyButton } from '../ui/CopyButton'
import { logProductName, normalizeLogRoot, type LogFileEntry, type LogRoot, type LogsInfo, type LogTail } from '../../lib/data-processing/modules/logs'

interface ManagementLogsSectionProps {
  serialNumber?: string
  /** The management module's logs section, read by extractLogs; null hides the card */
  logs: LogsInfo | null
}

type TailState =
  | { state: 'loading' }
  | { state: 'loaded'; root: LogRoot }
  | { state: 'error'; message: string }

function formatBytes(bytes?: number): string {
  if (bytes === undefined || bytes === null || !Number.isFinite(bytes)) return ''
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`
}

function formatWhen(value?: string): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

function formatDuration(seconds?: number): string {
  if (seconds === undefined || !Number.isFinite(seconds)) return ''
  if (seconds < 60) return `${Math.round(seconds)}s`
  const minutes = Math.floor(seconds / 60)
  const rest = Math.round(seconds % 60)
  if (minutes < 60) return rest ? `${minutes}m ${rest}s` : `${minutes}m`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m`
}

const ERROR_LINE = /\b(ERROR|ERR|FAULT|CRITICAL|FATAL)\b/
const WARNING_LINE = /\b(WARN|WARNING|WRN)\b/
const DEBUG_LINE = /\b(DEBUG|DBG|VERBOSE|TRACE)\b/

/** Where a line sits in the level vocabulary the convention uses: ERROR, WARN, INFO, DEBUG. */
type LineLevel = 'error' | 'warning' | 'debug' | 'plain'

function lineTone(line: string): LineLevel {
  if (ERROR_LINE.test(line)) return 'error'
  if (WARNING_LINE.test(line)) return 'warning'
  if (DEBUG_LINE.test(line)) return 'debug'
  return 'plain'
}

/**
 * Level filter state. Errors and warnings narrow the view to those levels when
 * either is on; debug lines are hidden unless asked for, so a verbose log reads
 * as its INFO story by default.
 */
interface LevelFilter {
  errors: boolean
  warnings: boolean
  debug: boolean
}

const DEFAULT_LEVEL_FILTER: LevelFilter = { errors: false, warnings: false, debug: false }

function passesLevelFilter(level: LineLevel, filter: LevelFilter): boolean {
  if (level === 'debug') return filter.debug && !filter.errors && !filter.warnings
  if (filter.errors || filter.warnings) {
    return (level === 'error' && filter.errors) || (level === 'warning' && filter.warnings)
  }
  return true
}

function sessionTone(status?: string): string {
  const s = (status || '').toLowerCase()
  if (s === 'completed' || s === 'success' || s === 'succeeded') return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
  if (s === 'running' || s === 'in_progress') return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
  if (s.includes('partial') || s.includes('warn')) return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
  if (s.includes('fail') || s.includes('error') || s === 'abandoned') return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
  return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
}

/**
 * events.jsonl lines are structured records (Cimian, the Munki fork, StartSet
 * all write one JSON object per line). Show the fields a reader scans for and
 * keep the whole record one click away; anything that does not parse is
 * shown as the raw line.
 */
interface JsonlEvent {
  raw: string
  parsed: Record<string, unknown> | null
  timestamp?: string
  level?: string
  eventType?: string
  item?: string
  version?: string
  message?: string
}

function firstString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = obj[key]
    if (typeof value === 'string' && value.trim()) return value
    if (typeof value === 'number') return String(value)
  }
  return undefined
}

function parseJsonlLine(raw: string): JsonlEvent {
  const trimmed = raw.trim()
  if (!trimmed.startsWith('{')) return { raw, parsed: null }
  try {
    const parsed = JSON.parse(trimmed)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { raw, parsed: null }
    const obj = parsed as Record<string, unknown>
    return {
      raw,
      parsed: obj,
      timestamp: firstString(obj, ['timestamp', 'time', 'ts', 'date']),
      level: firstString(obj, ['level', 'severity']),
      eventType: firstString(obj, ['event_type', 'eventType', 'type', 'event']),
      item: firstString(obj, ['package_name', 'packageName', 'item_name', 'itemName', 'name', 'display_name']),
      version: firstString(obj, ['package_version', 'packageVersion', 'target_version', 'version']),
      message: firstString(obj, ['message', 'msg', 'status_reason', 'error']),
    }
  } catch {
    return { raw, parsed: null }
  }
}

/**
 * MDM agent logs are structured lines rather than JSON. Two formats are
 * recognised and shown as event rows like events.jsonl:
 *   CMTrace (Intune Management Extension on Windows):
 *     <![LOG[message]LOG]!><time="HH:mm:ss.fffffff" date="M-d-yyyy" component="X" context="" type="1|2|3" thread="n" file="">
 *   Intune MDM daemon on the Mac:
 *     yyyy-MM-dd HH:mm:ss:SSS | IntuneMDM-Daemon | I|W|E | thread | Logger | message
 */
const CMTRACE_PATTERN = /^<!\[LOG\[([\s\S]*?)\]LOG\]!><time="([^"]*)"\s+date="([^"]*)"\s+component="([^"]*)"(?:\s+context="[^"]*")?\s+type="(\d)"(?:\s+thread="([^"]*)")?(?:\s+file="[^"]*")?>\s*$/
const INTUNE_DAEMON_PATTERN = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}):(\d{3}) \| ([^|]+?) \| ([IWE]) \| ([^|]*?) \| ([^|]*?) \| ([\s\S]*)$/

const CMTRACE_LEVELS: Record<string, string> = { '1': 'INFO', '2': 'WARN', '3': 'ERROR' }
const DAEMON_LEVELS: Record<string, string> = { I: 'INFO', W: 'WARN', E: 'ERROR' }

function parseStructuredLine(raw: string): JsonlEvent {
  const cm = CMTRACE_PATTERN.exec(raw)
  if (cm) {
    const [, message, time, date, component, type, thread] = cm
    const [m, d, y] = date.split('-')
    const iso = y && m && d ? `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T${time.replace(/[+-]\d+$/, '')}` : undefined
    const parsed = { time, date, component, type, thread, message }
    return { raw, parsed, timestamp: iso, level: CMTRACE_LEVELS[type] ?? type, eventType: component, message }
  }
  const dm = INTUNE_DAEMON_PATTERN.exec(raw)
  if (dm) {
    const [, stamp, millis, process, level, thread, logger, message] = dm
    const parsed = { timestamp: `${stamp}.${millis}`, process: process.trim(), level, thread: thread.trim(), logger: logger.trim(), message }
    return { raw, parsed, timestamp: `${stamp.replace(' ', 'T')}.${millis}`, level: DAEMON_LEVELS[level] ?? level, eventType: logger.trim(), message }
  }
  return { raw, parsed: null }
}

/** True when most of the sampled lines are CMTrace or Intune daemon records. */
function isStructuredTail(lines: string[]): boolean {
  const sample = lines.slice(0, 40)
  if (sample.length === 0) return false
  const hits = sample.filter(line => CMTRACE_PATTERN.test(line) || INTUNE_DAEMON_PATTERN.test(line)).length
  return hits * 2 >= sample.length
}

function formatEventTime(value?: string): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function levelTone(level?: string): LineLevel {
  const l = (level || '').toUpperCase()
  if (l.startsWith('ERR') || l === 'FAULT' || l === 'CRITICAL' || l === 'FATAL') return 'error'
  if (l.startsWith('WARN') || l === 'WRN') return 'warning'
  if (l.startsWith('DEBUG') || l === 'DBG' || l === 'VERBOSE' || l === 'TRACE') return 'debug'
  return 'plain'
}

/** Files the viewer can open: the tails, in the order the client sent them (primary first). */
function tailByFile(tails: LogTail[]): Map<string, LogTail> {
  const map = new Map<string, LogTail>()
  for (const tail of tails) if (tail.file) map.set(tail.file, tail)
  return map
}

export const ManagementLogsSection: React.FC<ManagementLogsSectionProps> = ({ serialNumber, logs }) => {
  const [activeTool, setActiveTool] = useState<string | null>(null)
  const [tails, setTails] = useState<Record<string, TailState>>({})
  const [selectedFile, setSelectedFile] = useState<Record<string, string>>({})
  const [filter, setFilter] = useState('')
  const [levelFilter, setLevelFilter] = useState<LevelFilter>(DEFAULT_LEVEL_FILTER)
  const [copied, setCopied] = useState(false)
  // Tools whose tails have been requested for the current serial; results are
  // keyed by tool, so a late response is never applied to the wrong tab.
  const requestedTails = useRef<Set<string>>(new Set())
  // Mirror of the tail states for the fetch effect, which must not re-run on
  // every state change; bumped by Retry and by re-opening a failed tab.
  const tailsRef = useRef<Record<string, TailState>>({})
  tailsRef.current = tails
  const [retryNonce, setRetryNonce] = useState(0)

  // A new device (or a refreshed management module) resets the tool selection
  // and the fetched tails. The reset is keyed on what the survey reported, not
  // on the object identity of `logs`: the parent recomputes that object on
  // every render, and a reset landing between a tail request and its response
  // discarded the response and left the tab on "Loading log..." for good.
  const logsKey = useMemo(
    () => (logs?.roots ?? []).map(r => `${r.tool}:${r.newestModified ?? ''}:${r.fileCount ?? ''}:${r.totalBytes ?? ''}`).join('|'),
    [logs]
  )
  const firstTool = logs && logs.roots.length > 0 ? logs.roots[0].tool : null
  useEffect(() => {
    setTails({})
    requestedTails.current = new Set()
    setActiveTool(firstTool)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialNumber, logsKey])

  // Fetch a tool's tails the first time its tab is opened. A
  // failed fetch is retried when the tab is opened again or Retry is pressed;
  // a transient server error must not stick until a full reload.
  useEffect(() => {
    if (!serialNumber || !activeTool) return
    const previous = tailsRef.current[activeTool]
    if (requestedTails.current.has(activeTool) && previous?.state !== 'error') return
    requestedTails.current.add(activeTool)

    const tool = activeTool
    const serial = serialNumber
    const stillCurrent = () => requestedTails.current.has(tool)
    setTails(prev => ({ ...prev, [tool]: { state: 'loading' } }))
    fetch(`/api/device/${encodeURIComponent(serial)}/logs/${encodeURIComponent(tool)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const result = await response.json()
        const root = normalizeLogRoot(result?.root)
        if (!root) throw new Error('No log data for this tool')
        if (stillCurrent()) setTails(prev => ({ ...prev, [tool]: { state: 'loaded', root } }))
      })
      .catch((error) => {
        if (stillCurrent()) setTails(prev => ({ ...prev, [tool]: { state: 'error', message: error instanceof Error ? error.message : String(error) } }))
      })
  }, [serialNumber, activeTool, retryNonce])

  const roots = useMemo(() => logs?.roots ?? [], [logs])
  const active = useMemo(() => roots.find(r => r.tool === activeTool) ?? null, [roots, activeTool])
  const tailState: TailState | undefined = activeTool ? tails[activeTool] : undefined
  const loadedRoot = tailState?.state === 'loaded' ? tailState.root : null
  const availableTails = useMemo(() => tailByFile(loadedRoot?.tails ?? []), [loadedRoot])
  const currentFile = useMemo(() => {
    if (!activeTool) return null
    const chosen = selectedFile[activeTool]
    if (chosen && availableTails.has(chosen)) return chosen
    const first = loadedRoot?.tails[0]?.file
    return first ?? null
  }, [activeTool, selectedFile, availableTails, loadedRoot])
  const currentTail = currentFile ? availableTails.get(currentFile) ?? null : null
  const tailLines = useMemo(() => currentTail?.lines ?? [], [currentTail])
  // The worst level found in each tailed file, for the dot beside its name.
  const fileTone = useMemo(() => {
    const tones = new Map<string, LineLevel>()
    for (const tail of loadedRoot?.tails ?? []) {
      if (!tail.file) continue
      const jsonl = tail.file.toLowerCase().endsWith('.jsonl')
      let worst: LineLevel = 'plain'
      for (const line of tail.lines ?? []) {
        const level = jsonl ? levelTone(parseJsonlLine(line).level) : lineTone(line)
        if (level === 'error') { worst = 'error'; break }
        if (level === 'warning') worst = 'warning'
      }
      tones.set(tail.file, worst)
    }
    return tones
  }, [loadedRoot])
  const isJsonl = Boolean(currentFile && currentFile.toLowerCase().endsWith('.jsonl'))
  const isJson = Boolean(currentFile && currentFile.toLowerCase().endsWith('.json'))
  const isStructured = useMemo(() => !isJsonl && !isJson && isStructuredTail(tailLines), [isJsonl, isJson, tailLines])
  const showEvents = isJsonl || isStructured
  // Every line is parsed once with its level; the text filter and the level
  // filter then narrow that list, and the event view reuses the parse.
  const classifiedLines = useMemo(() => {
    return tailLines.map(line => {
      const event = isJsonl ? parseJsonlLine(line) : isStructured ? parseStructuredLine(line) : null
      const level: LineLevel = event?.parsed ? levelTone(event.level) : lineTone(line)
      return { line, event, level }
    })
  }, [tailLines, isJsonl, isStructured])
  const levelCounts = useMemo(() => {
    const counts = { error: 0, warning: 0, debug: 0 }
    for (const entry of classifiedLines) {
      if (entry.level !== 'plain') counts[entry.level] += 1
    }
    return counts
  }, [classifiedLines])
  const visibleEntries = useMemo(() => {
    const needle = filter.trim().toLowerCase()
    return classifiedLines.filter(entry =>
      passesLevelFilter(entry.level, levelFilter) && (!needle || entry.line.toLowerCase().includes(needle))
    )
  }, [classifiedLines, filter, levelFilter])
  const visibleLines = useMemo(() => visibleEntries.map(entry => entry.line), [visibleEntries])
  const visibleEvents = useMemo(
    () => (showEvents ? visibleEntries.map(entry => entry.event ?? { raw: entry.line, parsed: null }) : []),
    [showEvents, visibleEntries]
  )
  const filtering = Boolean(filter.trim()) || levelFilter.errors || levelFilter.warnings || levelFilter.debug
  const toggleLevel = (key: keyof LevelFilter) => setLevelFilter(current => ({ ...current, [key]: !current[key] }))
  // A .json tail is one document (session.json, status.json); pretty-print it when it parses whole.
  const prettyJson = useMemo(() => {
    if (!isJson || tailLines.length === 0) return null
    try {
      return JSON.stringify(JSON.parse(tailLines.join('\n')), null, 2)
    } catch {
      return null
    }
  }, [isJson, tailLines])


  if (!logs || roots.length === 0) return null

  const copyTail = () => {
    if (!tailLines.length) return
    navigator.clipboard.writeText(tailLines.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadTail = () => {
    if (!tailLines.length || !active || !currentFile) return
    const blob = new Blob([tailLines.join('\n')], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${serialNumber || 'device'}-${active.tool}-${currentFile.replace(/\//g, '_')}`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  const selectTool = (tool: string) => {
    setActiveTool(tool)
    setFilter('')
    if (tails[tool]?.state === 'error') setRetryNonce(n => n + 1)
  }

  const retryTail = () => setRetryNonce(n => n + 1)

  const selectFile = (file: string) => {
    if (!activeTool) return
    setSelectedFile(prev => ({ ...prev, [activeTool]: file }))
    setFilter('')
  }

  const totalFiles = roots.reduce((n, r) => n + (r.fileCount ?? r.files.length), 0)
  const totalBytes = roots.reduce((n, r) => n + (r.totalBytes ?? 0), 0)
  const filesWithoutTails: LogFileEntry[] = active
    ? active.files.filter(f => !availableTails.has(f.path))
    : []

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Always open: the log viewer is the point of this card, and the MDM root alone is worth the space */}
      <div className="px-6 py-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Management Tools Logs</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Logs collected from the management tools on this device ({roots.length} {roots.length === 1 ? 'tool' : 'tools'}, {totalFiles} files
          {totalBytes > 0 && <>, {formatBytes(totalBytes)}</>}
          {logs.collectedAt && <>, collected {formatWhen(logs.collectedAt)}</>})
        </p>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700">
          {/* Tool tabs - one per reported root, equal widths on a single row that narrows as roots are added.
              Error and warning counts live in the root facts below, not on the tabs. */}
          {roots.length > 1 && (
          <div className="px-6 pt-4 grid grid-flow-col auto-cols-fr gap-2" role="tablist" aria-label="Management tools">
            {roots.map((root) => {
              const isActive = root.tool === activeTool
              return (
                <button
                  key={root.tool}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => selectTool(root.tool)}
                  className={`inline-flex h-9 min-w-0 items-center justify-center px-2 rounded-md text-sm font-medium border transition-colors ${
                    isActive
                      ? 'bg-gray-900 text-white border-gray-900 dark:bg-gray-600 dark:text-white dark:border-gray-500'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className="truncate">{logProductName(root, logs.platform)}</span>
                </button>
              )
            })}
          </div>
          )}

          {active && (
            <div className="p-6 space-y-5">
              {/* Root facts */}
              <div className="flex flex-wrap items-start gap-x-8 gap-y-3">
                <div className="min-w-0">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Path</div>
                  <div className="flex items-center gap-2 min-w-0">
                    <code className="text-xs font-mono text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded break-all">{active.path}</code>
                    <CopyButton value={active.path} />
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Files</div>
                  <div className="text-sm text-gray-900 dark:text-white">
                    {active.fileCount ?? active.files.length}
                    {active.totalBytes !== undefined && <span className="text-gray-500 dark:text-gray-400"> · {formatBytes(active.totalBytes)}</span>}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Last written</div>
                  <div className="text-sm text-gray-900 dark:text-white">{formatWhen(active.newestModified) || 'Unknown'}</div>
                </div>
                {active.latestSession && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Latest run</div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${sessionTone(active.latestSession.status)}`}>
                        {active.latestSession.status || 'unknown'}
                      </span>
                      {active.latestSession.sessionId && <span className="font-mono text-gray-900 dark:text-white">{active.latestSession.sessionId}</span>}
                      {active.latestSession.runType && <span className="text-gray-600 dark:text-gray-400">{active.latestSession.runType}</span>}
                      {active.latestSession.durationSeconds !== undefined && <span className="text-gray-600 dark:text-gray-400">{formatDuration(active.latestSession.durationSeconds)}</span>}
                      {(active.latestSession.errors ?? 0) > 0 && <span className="text-red-600 dark:text-red-400">{active.latestSession.errors} errors</span>}
                      {(active.latestSession.warnings ?? 0) > 0 && <span className="text-amber-600 dark:text-amber-400">{active.latestSession.warnings} warnings</span>}
                    </div>
                  </div>
                )}
                {active.version && (
                  <div className="ml-auto text-right">
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Version</div>
                    <div className="text-sm font-mono text-gray-900 dark:text-white">{active.version}</div>
                  </div>
                )}
              </div>

              {/* Log picker on the left, viewer on the right */}
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(220px,300px)_1fr] gap-4 lg:h-[640px]">
                {/* The picker fills the column: it stretches to the viewer's height and scrolls inside. */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden flex flex-col min-h-0 max-h-[480px] lg:max-h-none lg:h-full">
                  <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">Logs</div>
                  <div className="flex-1 min-h-0 overflow-y-auto">
                  {tailState?.state === 'loaded' ? (
                    <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                      {loadedRoot!.tails.map((tail) => {
                        const entry = active.files.find(f => f.path === tail.file)
                        const isCurrent = tail.file === currentFile
                        return (
                          <li key={tail.file}>
                            <button
                              onClick={() => tail.file && selectFile(tail.file)}
                              className={`w-full text-left px-3 py-2 transition-colors ${isCurrent ? 'bg-gray-100 dark:bg-gray-700' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                            >
                              <div className="flex items-start gap-2 min-w-0">
                                <div className="text-xs font-mono text-gray-900 dark:text-white break-all min-w-0">{tail.file}</div>
                                {fileTone.get(tail.file ?? '') === 'error' && <span className="mt-1 w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" title="Errors in this log" />}
                                {fileTone.get(tail.file ?? '') === 'warning' && <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" title="Warnings in this log" />}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {entry ? formatBytes(entry.bytes) : ''}
                                {entry?.modified ? ` · ${formatWhen(entry.modified)}` : ''}
                              </div>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  ) : (
                    <div className="px-3 py-4 text-xs text-gray-500 dark:text-gray-400">
                      {tailState?.state === 'error' ? `Failed to load: ${tailState.message}` : 'Loading...'}
                    </div>
                  )}
                  {filesWithoutTails.length > 0 && (
                    <div className="border-t border-gray-200 dark:border-gray-700">
                      <div className="px-3 py-1.5 text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase bg-gray-50/60 dark:bg-gray-900/30">Not tailed</div>
                      <ul className="divide-y divide-gray-100 dark:divide-gray-700/50">
                        {filesWithoutTails.map((file) => (
                          <li key={file.path} className="px-3 py-1.5">
                            <div className="text-xs font-mono text-gray-600 dark:text-gray-400 break-all">{file.path}</div>
                            <div className="text-xs text-gray-400 dark:text-gray-500">{formatBytes(file.bytes)}{file.modified ? ` · ${formatWhen(file.modified)}` : ''}</div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  </div>
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden min-w-0 flex flex-col lg:h-full">
                  <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={copyTail}
                        disabled={!tailLines.length}
                        className={`p-2 rounded-md border shadow-sm transition-colors disabled:opacity-50 ${
                          copied
                            ? 'text-green-600 dark:text-green-400 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                        title={copied ? 'Copied' : 'Copy to clipboard'}
                      >
                        {copied ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        )}
                      </button>
                      <button
                        onClick={downloadTail}
                        disabled={!tailLines.length}
                        className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                        title="Download"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                      </button>
                      <input
                        type="text"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        placeholder="Filter lines"
                        className="w-44 px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400"
                      />
                      {!isJson && tailLines.length > 0 && (
                        <div className="flex items-center gap-1.5" role="group" aria-label="Filter by level">
                          <button
                            type="button"
                            onClick={() => toggleLevel('errors')}
                            aria-pressed={levelFilter.errors}
                            disabled={levelCounts.error === 0}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors disabled:opacity-40 disabled:cursor-default ${
                              levelFilter.errors
                                ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800'
                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700'
                            }`}
                            title={levelFilter.errors ? 'Showing errors' : 'Show only errors'}
                          >
                            Errors
                            <span className={`font-mono tabular-nums ${levelFilter.errors ? '' : 'text-gray-400 dark:text-gray-500'}`}>{levelCounts.error}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleLevel('warnings')}
                            aria-pressed={levelFilter.warnings}
                            disabled={levelCounts.warning === 0}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors disabled:opacity-40 disabled:cursor-default ${
                              levelFilter.warnings
                                ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800'
                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700'
                            }`}
                            title={levelFilter.warnings ? 'Showing warnings' : 'Show only warnings'}
                          >
                            Warnings
                            <span className={`font-mono tabular-nums ${levelFilter.warnings ? '' : 'text-gray-400 dark:text-gray-500'}`}>{levelCounts.warning}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleLevel('debug')}
                            aria-pressed={levelFilter.debug}
                            disabled={levelCounts.debug === 0}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors disabled:opacity-40 disabled:cursor-default ${
                              levelFilter.debug
                                ? 'bg-gray-100 text-gray-900 border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600'
                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700'
                            }`}
                            title={levelFilter.debug ? 'Hiding debug lines on next click' : 'Show debug lines'}
                          >
                            Debug
                            <span className={`font-mono tabular-nums ${levelFilter.debug ? '' : 'text-gray-400 dark:text-gray-500'}`}>{levelCounts.debug}</span>
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 min-w-0 truncate">
                      <span className="font-mono">{currentFile || ''}</span>
                      {tailLines.length > 0 && (
                        <span className="ml-2">
                          {filtering ? `${visibleLines.length} of ${tailLines.length} lines` : `last ${tailLines.length} lines`}
                          {currentTail?.truncated ? ', truncated' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {!tailState || tailState.state === 'loading' ? (
                    <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">Loading log...</div>
                  ) : tailState.state === 'error' ? (
                    <div className="p-6 text-center text-sm text-red-600 dark:text-red-400">
                      <div>Failed to load log: {tailState.message}</div>
                      <button
                        onClick={retryTail}
                        className="mt-3 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        Retry
                      </button>
                    </div>
                  ) : tailLines.length === 0 ? (
                    <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">No log lines reported</div>
                  ) : prettyJson !== null && !filter.trim() ? (
                    <pre className="p-4 bg-gray-900 text-gray-100 text-xs font-mono overflow-x-auto max-h-[500px] lg:max-h-none lg:flex-1 lg:min-h-0 overflow-y-auto whitespace-pre-wrap break-all">{prettyJson}</pre>
                  ) : visibleLines.length === 0 ? (
                    <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">No lines match the current filters</div>
                  ) : showEvents ? (
                    <div className="max-h-[500px] lg:max-h-none lg:flex-1 lg:min-h-0 overflow-y-auto divide-y divide-gray-200 dark:divide-gray-700">
                      {visibleEvents.map((event, index) => {
                        if (!event.parsed) {
                          return (
                            <div key={index} className="px-4 py-2 font-mono text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-all">{event.raw}</div>
                          )
                        }
                        const tone = levelTone(event.level)
                        const levelCls = tone === 'error'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          : tone === 'warning'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                            : tone === 'debug'
                              ? 'bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                        return (
                          <details key={index} className="group">
                            <summary className="cursor-pointer list-none px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/40">
                              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                                <span className="font-mono text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatEventTime(event.timestamp)}</span>
                                {event.level && (
                                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold uppercase ${levelCls}`}>{event.level}</span>
                                )}
                                {event.eventType && (
                                  <span className="text-xs text-gray-600 dark:text-gray-400">{event.eventType.replace(/_/g, ' ')}</span>
                                )}
                                {event.item && (
                                  <span className="text-xs font-medium text-gray-900 dark:text-white">
                                    {event.item}
                                    {event.version && <span className="font-normal text-gray-500 dark:text-gray-400"> {event.version}</span>}
                                  </span>
                                )}
                                {event.message && (
                                  <span className="text-xs text-gray-700 dark:text-gray-300 min-w-0 break-words">{event.message}</span>
                                )}
                              </div>
                            </summary>
                            <pre className="mx-4 mb-3 p-3 bg-gray-900 text-gray-100 text-xs font-mono overflow-x-auto rounded whitespace-pre-wrap break-all">{JSON.stringify(event.parsed, null, 2)}</pre>
                          </details>
                        )
                      })}
                    </div>
                  ) : (
                    <pre className="p-4 bg-gray-900 text-gray-100 text-xs font-mono overflow-x-auto max-h-[500px] lg:max-h-none lg:flex-1 lg:min-h-0 overflow-y-auto">
                      {visibleLines.map((line, index) => {
                        const tone = lineTone(line)
                        const cls = tone === 'error' ? 'text-red-300' : tone === 'warning' ? 'text-amber-300' : tone === 'debug' ? 'text-gray-500' : ''
                        return <div key={index} className={`whitespace-pre-wrap ${cls}`}>{line || ' '}</div>
                      })}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
    </div>
  )
}

export default ManagementLogsSection

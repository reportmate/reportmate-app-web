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

function lineTone(line: string): 'error' | 'warning' | 'plain' {
  if (ERROR_LINE.test(line)) return 'error'
  if (WARNING_LINE.test(line)) return 'warning'
  return 'plain'
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

function formatEventTime(value?: string): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function levelTone(level?: string): 'error' | 'warning' | 'plain' {
  const l = (level || '').toUpperCase()
  if (l.startsWith('ERR') || l === 'FAULT' || l === 'CRITICAL' || l === 'FATAL') return 'error'
  if (l.startsWith('WARN') || l === 'WRN') return 'warning'
  return 'plain'
}

/** Files the viewer can open: the tails, in the order the client sent them (primary first). */
function tailByFile(tails: LogTail[]): Map<string, LogTail> {
  const map = new Map<string, LogTail>()
  for (const tail of tails) if (tail.file) map.set(tail.file, tail)
  return map
}

export const ManagementLogsSection: React.FC<ManagementLogsSectionProps> = ({ serialNumber, logs }) => {
  const [expanded, setExpanded] = useState(false)
  const [activeTool, setActiveTool] = useState<string | null>(null)
  const [tails, setTails] = useState<Record<string, TailState>>({})
  const [selectedFile, setSelectedFile] = useState<Record<string, string>>({})
  const [filter, setFilter] = useState('')
  const [copied, setCopied] = useState(false)
  // Tools whose tails have been requested for the current serial; results are
  // keyed by tool, so a late response is never applied to the wrong tab.
  const requestedTails = useRef<Set<string>>(new Set())

  // A new device (or a refreshed management module) resets the tool selection
  // and the fetched tails.
  useEffect(() => {
    setTails({})
    requestedTails.current = new Set()
    setActiveTool(logs && logs.roots.length > 0 ? logs.roots[0].tool : null)
  }, [serialNumber, logs])

  // Fetch a tool's tails the first time its tab is opened while expanded.
  useEffect(() => {
    if (!serialNumber || !activeTool || !expanded) return
    if (requestedTails.current.has(activeTool)) return
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
  }, [serialNumber, activeTool, expanded])

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
  const visibleLines = useMemo(() => {
    const needle = filter.trim().toLowerCase()
    if (!needle) return tailLines
    return tailLines.filter(line => line.toLowerCase().includes(needle))
  }, [tailLines, filter])
  const isJsonl = Boolean(currentFile && currentFile.toLowerCase().endsWith('.jsonl'))
  const isJson = Boolean(currentFile && currentFile.toLowerCase().endsWith('.json'))
  const visibleEvents = useMemo(() => (isJsonl ? visibleLines.map(parseJsonlLine) : []), [isJsonl, visibleLines])
  // A .json tail is one document (session.json, status.json); pretty-print it when it parses whole.
  const prettyJson = useMemo(() => {
    if (!isJson || tailLines.length === 0) return null
    try {
      return JSON.stringify(JSON.parse(tailLines.join('\n')), null, 2)
    } catch {
      return null
    }
  }, [isJson, tailLines])

  const totalErrors = roots.reduce((n, r) => n + (r.errorCount ?? 0), 0)
  const totalWarnings = roots.reduce((n, r) => n + (r.warningCount ?? 0), 0)

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
  }

  const selectFile = (file: string) => {
    if (!activeTool) return
    setSelectedFile(prev => ({ ...prev, [activeTool]: file }))
    setFilter('')
  }

  const filesWithoutTails: LogFileEntry[] = active
    ? active.files.filter(f => !availableTails.has(f.path))
    : []

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Accordion header - the same affordance as the Installs run log */}
      <button
        onClick={() => setExpanded(v => !v)}
        aria-expanded={expanded}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <svg className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-lg font-semibold text-gray-900 dark:text-white">Management Logs</span>
          {!expanded && (
          <span className="hidden sm:flex items-center gap-1.5 ml-2 min-w-0 overflow-hidden">
            {roots.map((root) => (
              <span key={root.tool} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 whitespace-nowrap">
                {logProductName(root, logs.platform)}
                {(root.errorCount ?? 0) > 0 && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                {(root.errorCount ?? 0) === 0 && (root.warningCount ?? 0) > 0 && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
              </span>
            ))}
          </span>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {totalErrors > 0 && <span className="text-xs font-medium text-red-600 dark:text-red-400">{totalErrors} errors</span>}
          {totalWarnings > 0 && <span className="text-xs font-medium text-amber-600 dark:text-amber-400">{totalWarnings} warnings</span>}
          {logs.collectedAt && <span className="hidden md:inline text-xs text-gray-500 dark:text-gray-400">{formatWhen(logs.collectedAt)}</span>}
          <svg className={`w-5 h-5 text-gray-500 transition-transform ${expanded ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          {/* Tool tabs - one per reported root, wraps as the estate grows */}
          <div className="px-6 pt-4 flex flex-wrap gap-2" role="tablist" aria-label="Management tools">
            {roots.map((root) => {
              const isActive = root.tool === activeTool
              const errors = root.errorCount ?? 0
              const warnings = root.warningCount ?? 0
              return (
                <button
                  key={root.tool}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => selectTool(root.tool)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                    isActive
                      ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900 dark:border-white'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700'
                  }`}
                >
                  <span>{logProductName(root, logs.platform)}</span>
                  {errors > 0 && (
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold ${isActive ? 'bg-red-500 text-white' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>{errors}</span>
                  )}
                  {warnings > 0 && (
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold ${isActive ? 'bg-amber-400 text-gray-900' : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'}`}>{warnings}</span>
                  )}
                </button>
              )
            })}
          </div>

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
              </div>

              {/* Log picker on the left, viewer on the right */}
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(220px,300px)_1fr] gap-4">
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden self-start">
                  <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700">Logs</div>
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
                              <div className="text-xs font-mono text-gray-900 dark:text-white break-all">{tail.file}</div>
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
                    <details className="border-t border-gray-200 dark:border-gray-700">
                      <summary className="cursor-pointer px-3 py-2 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        {filesWithoutTails.length} more files
                      </summary>
                      <ul className="max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700/50">
                        {filesWithoutTails.map((file) => (
                          <li key={file.path} className="px-3 py-1.5">
                            <div className="text-xs font-mono text-gray-600 dark:text-gray-400 break-all">{file.path}</div>
                            <div className="text-xs text-gray-400 dark:text-gray-500">{formatBytes(file.bytes)}{file.modified ? ` · ${formatWhen(file.modified)}` : ''}</div>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden min-w-0">
                  <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700">
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
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 min-w-0 truncate">
                      <span className="font-mono">{currentFile || ''}</span>
                      {tailLines.length > 0 && (
                        <span className="ml-2">
                          {filter.trim() ? `${visibleLines.length} of ${tailLines.length} lines` : `last ${tailLines.length} lines`}
                          {currentTail?.truncated ? ', truncated' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {!tailState || tailState.state === 'loading' ? (
                    <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">Loading log...</div>
                  ) : tailState.state === 'error' ? (
                    <div className="p-6 text-center text-sm text-red-600 dark:text-red-400">Failed to load log: {tailState.message}</div>
                  ) : tailLines.length === 0 ? (
                    <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">No log lines reported</div>
                  ) : prettyJson !== null && !filter.trim() ? (
                    <pre className="p-4 bg-gray-900 text-gray-100 text-xs font-mono overflow-x-auto max-h-[500px] overflow-y-auto whitespace-pre-wrap break-all">{prettyJson}</pre>
                  ) : isJsonl ? (
                    <div className="max-h-[500px] overflow-y-auto divide-y divide-gray-200 dark:divide-gray-700">
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
                    <pre className="p-4 bg-gray-900 text-gray-100 text-xs font-mono overflow-x-auto max-h-[500px] overflow-y-auto">
                      {visibleLines.map((line, index) => {
                        const tone = lineTone(line)
                        const cls = tone === 'error' ? 'text-red-300' : tone === 'warning' ? 'text-amber-300' : ''
                        return <div key={index} className={`whitespace-pre-wrap ${cls}`}>{line || ' '}</div>
                      })}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ManagementLogsSection

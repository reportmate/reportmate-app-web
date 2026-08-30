/**
 * System-level outcome of recent managed-software runs on a device.
 *
 * Item problems live on their items in the table; this card carries only what
 * no item can: manifest and catalog retrieval failures, preflight and
 * postflight errors, a run that reported nothing at all. Problems are
 * session-scoped — a later clean run demotes them to "earlier runs" rather
 * than erasing them — and each line is stamped with the session it came from.
 */

import React, { useEffect, useState } from 'react'
import { extractInlineDetails, fetchEventPayload, inlineLineClass, type InlineLine } from '../lib/eventInlineDetails'
import { collectSystemProblems, type SystemProblem } from '../lib/installs/systemProblems'

interface InstallsRunStatusProps {
  serialNumber?: string
  installs: any
}

export function lastRunFailed(installs: any): boolean {
  return collectSystemProblems(installs).latestFailed
}

const formatStamp = (problem: SystemProblem): string | null => {
  if (problem.sessionId) return problem.sessionId
  if (problem.time) {
    const parsed = new Date(problem.time)
    if (!Number.isNaN(parsed.getTime())) return parsed.toLocaleString()
  }
  return null
}

const ProblemLine: React.FC<{ problem: SystemProblem; stamped?: boolean }> = ({ problem, stamped = false }) => {
  const tone = problem.tone === 'error' ? 'text-red-700 dark:text-red-300' : 'text-yellow-700 dark:text-yellow-300'
  const stamp = stamped ? formatStamp(problem) : null
  return (
    <div>
      <div className={inlineLineClass({ text: problem.message, isMessage: true }, tone)}>{problem.message}</div>
      {stamp && <div className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500 font-mono">{stamp}</div>}
    </div>
  )
}

export const InstallsRunStatus: React.FC<InstallsRunStatusProps> = ({ serialNumber, installs }) => {
  const summary = collectSystemProblems(installs)
  const [eventLines, setEventLines] = useState<InlineLine[] | null>(null)

  const currentTone: 'error' | 'warning' | null = summary.latestFailed || summary.current.some(p => p.tone === 'error')
    ? 'error'
    : summary.current.length > 0 ? 'warning' : null
  const showCurrent = currentTone !== null
  const showRecent = summary.recent.length > 0
  const needsEventText = showCurrent && summary.current.length === 0

  // A failed run with no module text (the stale-error sweep blanks it): read the
  // device's latest matching event instead.
  useEffect(() => {
    if (!needsEventText || !serialNumber) return
    let cancelled = false
    const type = currentTone === 'error' ? 'error' : 'warning'
    fetch(`/api/device/${encodeURIComponent(serialNumber)}/modules/events?limit=5&type=${type}`)
      .then(r => (r.ok ? r.json() : null))
      .then(async result => {
        const events: any[] = result?.data || result?.events || []
        const installsEvent = events.find(e => /munki|cimian|install/i.test(String(e.message || '')) || e.moduleId === 'installs' || e.module_id === 'installs') || events[0]
        if (!installsEvent || cancelled) return
        const payload = await fetchEventPayload(String(installsEvent.id))
        if (cancelled) return
        const extracted = extractInlineDetails(payload)
        setEventLines([...extracted.errors, ...extracted.warnings])
      })
      .catch(() => { /* the card still states the outcome without text */ })
    return () => { cancelled = true }
  }, [needsEventText, serialNumber, currentTone])

  if (!showCurrent && !showRecent) return null

  const isError = currentTone === 'error'
  const chrome = showCurrent
    ? isError
      ? 'border-red-200 bg-red-50/60 dark:border-red-900 dark:bg-red-900/20'
      : 'border-yellow-200 bg-yellow-50/60 dark:border-yellow-900 dark:bg-yellow-900/20'
    : 'border-gray-200 bg-gray-50/60 dark:border-gray-700 dark:bg-gray-800/40'
  const badge = showCurrent
    ? isError
      ? { text: 'Last run failed', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' }
      : { text: 'Last run had warnings', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' }
    : { text: 'Earlier runs had problems', className: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200' }

  return (
    <div className={`rounded-lg border p-4 ${chrome}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>
          {badge.text}
        </span>
        {showCurrent && isError && summary.latestItemless && (
          <span className="text-sm text-gray-600 dark:text-gray-400">The run did not complete, so no items were reported.</span>
        )}
        {!showCurrent && showRecent && (
          <span className="text-sm text-gray-600 dark:text-gray-400">The latest run was clean; these are from the last 24 hours.</span>
        )}
      </div>

      {showCurrent && (
        summary.current.length > 0 ? (
          <div className="space-y-1.5">
            {summary.current.map((problem, i) => <ProblemLine key={`c-${i}`} problem={problem} />)}
          </div>
        ) : eventLines && eventLines.length > 0 ? (
          <div className="space-y-1">
            {eventLines.map((line, i) => (
              <div key={`ev-${i}`} className={inlineLineClass(line, isError ? 'text-red-700 dark:text-red-300' : 'text-yellow-700 dark:text-yellow-300')}>{line.text}</div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500 dark:text-gray-400">No message text was reported for this run.</p>
        )
      )}

      {showRecent && (
        <div className={`space-y-1.5 ${showCurrent ? 'mt-3 pt-3 border-t border-gray-200/70 dark:border-gray-700/70' : ''}`}>
          {showCurrent && (
            <div className="text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500">Earlier runs, last 24 hours</div>
          )}
          {summary.recent.map((problem, i) => <ProblemLine key={`r-${i}`} problem={problem} stamped />)}
        </div>
      )}
    </div>
  )
}

export default InstallsRunStatus

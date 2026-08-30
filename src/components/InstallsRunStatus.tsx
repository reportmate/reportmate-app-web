/**
 * System-level problems from the device's managed-software runs.
 *
 * This box exists only for problems no item can carry: manifest and catalog
 * retrieval failures, preflight and postflight errors, a failed run that
 * reported no items. Anything attributable to an item lives on that item in
 * the table and never appears here — when every problem has an item, there is
 * no box at all.
 */

import React, { useEffect, useState } from 'react'
import { extractInlineDetails, fetchEventPayload, type InlineLine } from '../lib/eventInlineDetails'
import { collectSystemProblems, type SystemProblem } from '../lib/installs/systemProblems'
import { itemNameFromMessage } from '../lib/installs/status'
import { formatRelativeTime } from '../lib/time'

interface InstallsRunStatusProps {
  serialNumber?: string
  installs: any
}

export function lastRunFailed(installs: any): boolean {
  return collectSystemProblems(installs).failedWithoutItems
}

const CHIP: Record<'error' | 'warning', string> = {
  error: 'text-xs font-mono px-2.5 py-1.5 rounded bg-gray-100 dark:bg-gray-800 text-red-700 dark:text-red-300 whitespace-pre-wrap break-words',
  warning: 'text-xs font-mono px-2.5 py-1.5 rounded bg-gray-100 dark:bg-gray-800 text-yellow-800 dark:text-yellow-300 whitespace-pre-wrap break-words',
}

export const InstallsRunStatus: React.FC<InstallsRunStatusProps> = ({ serialNumber, installs }) => {
  const summary = collectSystemProblems(installs)
  const [eventLines, setEventLines] = useState<InlineLine[] | null>(null)

  const needsEventText = summary.failedWithoutItems && summary.problems.length === 0

  // A failed run that reported nothing: the module may carry no text either
  // (the stale-error sweep blanks it), so read the latest matching event.
  useEffect(() => {
    if (!needsEventText || !serialNumber) return
    let cancelled = false
    fetch(`/api/device/${encodeURIComponent(serialNumber)}/modules/events?limit=5&type=error`)
      .then(r => (r.ok ? r.json() : null))
      .then(async result => {
        const events: any[] = result?.data || result?.events || []
        const installsEvent = events.find(e => /munki|cimian|install/i.test(String(e.message || '')) || e.moduleId === 'installs' || e.module_id === 'installs') || events[0]
        if (!installsEvent || cancelled) return
        const payload = await fetchEventPayload(String(installsEvent.id))
        if (cancelled) return
        const extracted = extractInlineDetails(payload)
        const systemOnly = (line: InlineLine) =>
          !line.name && !/^installer:/i.test(line.text) && !/^-{3,}/.test(line.text) && itemNameFromMessage(line.text) === null
        setEventLines([...extracted.errors, ...extracted.warnings].filter(systemOnly).slice(0, 10))
      })
      .catch(() => { /* the box still states the outcome without text */ })
    return () => { cancelled = true }
  }, [needsEventText, serialNumber])

  if (summary.problems.length === 0 && !summary.failedWithoutItems) return null

  const isError = summary.failedWithoutItems || summary.problems.some(p => p.tone === 'error')
  const chrome = isError
    ? 'border-red-200 bg-red-50/60 dark:border-red-900 dark:bg-red-900/20'
    : 'border-yellow-400 bg-yellow-100/80 dark:border-yellow-700 dark:bg-yellow-900/30'
  const badge = isError
    ? { text: 'Last run failed', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' }
    : { text: 'Last run warnings', className: 'bg-yellow-200 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-200' }

  const stampParts: string[] = []
  if (summary.sessionId) stampParts.push(summary.sessionId)
  if (summary.time && !Number.isNaN(new Date(summary.time).getTime())) stampParts.push(formatRelativeTime(summary.time))
  const stamp = stampParts.join(' · ')

  return (
    <div className={`rounded-lg border p-4 ${chrome}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>
          {badge.text}
        </span>
        {summary.failedWithoutItems && (
          <span className="text-sm text-gray-600 dark:text-gray-400">The run did not complete, so no items were reported.</span>
        )}
        {stamp && <span className="ml-auto text-[11px] font-mono text-gray-400 dark:text-gray-500">{stamp}</span>}
      </div>

      {summary.problems.length > 0 ? (
        <div className="space-y-1.5">
          {summary.problems.map((problem: SystemProblem, i: number) => (
            <div key={`p-${i}`} className={CHIP[problem.tone]}>{problem.message}</div>
          ))}
        </div>
      ) : eventLines && eventLines.length > 0 ? (
        <div className="space-y-1.5">
          {eventLines.map((line, i) => <div key={`ev-${i}`} className={CHIP.error}>{line.text}</div>)}
        </div>
      ) : null}
    </div>
  )
}

export default InstallsRunStatus

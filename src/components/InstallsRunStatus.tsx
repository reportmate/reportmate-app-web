/**
 * Outcome of the most recent managed-software run on a device.
 *
 * A run that never reached its manifest reports zero items, so the items
 * table alone reads as "nothing assigned" when the truth is "the run failed".
 * This card says which, and shows the run's messages: from the module when
 * the client sent them, else from the device's latest error or warning event,
 * because the stale-error sweep can blank the module strings.
 */

import React, { useEffect, useState } from 'react'
import { extractInlineDetails, fetchEventPayload, inlineLineClass, type InlineLine } from '../lib/eventInlineDetails'

interface InstallsRunStatusProps {
  serialNumber?: string
  installs: any
}

type Outcome = 'error' | 'warning' | null

function splitMessages(raw: unknown): string[] {
  if (typeof raw !== 'string') return []
  return raw.split(/;|\n/).map(s => s.trim()).filter(s => s && !/^-{3,}$/.test(s) && !/^installer:(%|PHASE:|STATUS:)/i.test(s))
}

function runOutcome(installs: any): { outcome: Outcome; errors: string[]; warnings: string[] } {
  const munki = installs?.munki
  const cimian = installs?.cimian
  if (munki) {
    const errors = splitMessages(munki.errors)
    const warnings = splitMessages(munki.warnings)
    const status = String(munki.status || '').toLowerCase()
    const failed = munki.lastRunSuccess === false || munki.lastRunSuccess === 0 || status === 'error' || errors.length > 0
    return { outcome: failed ? 'error' : (warnings.length > 0 || status === 'warning') ? 'warning' : null, errors, warnings }
  }
  if (cimian) {
    const session = Array.isArray(cimian.sessions) ? cimian.sessions[0] : null
    const status = String(session?.status || cimian.status || '').toLowerCase()
    const failed = (session?.failures || 0) > 0 || (session?.packages_failed || 0) > 0 || status === 'failed' || status === 'error'
    const warned = status === 'warning' || (session?.warnings || 0) > 0
    return { outcome: failed ? 'error' : warned ? 'warning' : null, errors: [], warnings: [] }
  }
  return { outcome: null, errors: [], warnings: [] }
}

export function lastRunFailed(installs: any): boolean {
  return runOutcome(installs).outcome === 'error'
}

export const InstallsRunStatus: React.FC<InstallsRunStatusProps> = ({ serialNumber, installs }) => {
  const { outcome, errors, warnings } = runOutcome(installs)
  const [eventLines, setEventLines] = useState<{ errors: InlineLine[]; warnings: InlineLine[] } | null>(null)

  // No text on the module: read it from the device's latest matching event
  useEffect(() => {
    if (!outcome || !serialNumber || errors.length > 0 || warnings.length > 0) return
    let cancelled = false
    const type = outcome === 'error' ? 'error' : 'warning'
    fetch(`/api/device/${encodeURIComponent(serialNumber)}/modules/events?limit=5&type=${type}`)
      .then(r => (r.ok ? r.json() : null))
      .then(async result => {
        const events: any[] = result?.data || result?.events || []
        const installsEvent = events.find(e => /munki|cimian|install/i.test(String(e.message || '')) || e.moduleId === 'installs' || e.module_id === 'installs') || events[0]
        if (!installsEvent || cancelled) return
        const payload = await fetchEventPayload(String(installsEvent.id))
        if (cancelled) return
        const extracted = extractInlineDetails(payload)
        setEventLines({ errors: extracted.errors, warnings: extracted.warnings })
      })
      .catch(() => { /* the card still states the outcome without text */ })
    return () => { cancelled = true }
  }, [outcome, serialNumber, errors.length, warnings.length])

  if (!outcome) return null

  const errorLines: InlineLine[] = errors.length ? errors.map(text => ({ text, isMessage: true })) : (eventLines?.errors ?? [])
  const warningLines: InlineLine[] = warnings.length ? warnings.map(text => ({ text, isMessage: true })) : (eventLines?.warnings ?? [])
  const isError = outcome === 'error'

  return (
    <div className={`rounded-lg border p-4 ${isError ? 'border-red-200 bg-red-50/60 dark:border-red-900 dark:bg-red-900/20' : 'border-yellow-200 bg-yellow-50/60 dark:border-yellow-900 dark:bg-yellow-900/20'}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isError ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'}`}>
          {isError ? 'Last run failed' : 'Last run had warnings'}
        </span>
        {isError && (!installs?.munki?.items || installs.munki.items.length === 0) && (
          <span className="text-sm text-gray-600 dark:text-gray-400">The run did not complete, so no items were reported.</span>
        )}
      </div>
      {(errorLines.length > 0 || warningLines.length > 0) ? (
        <div className="space-y-1">
          {errorLines.map((line, i) => <div key={`e-${i}`} className={inlineLineClass(line, 'text-red-700 dark:text-red-300')}>{line.text}</div>)}
          {warningLines.map((line, i) => <div key={`w-${i}`} className={inlineLineClass(line, 'text-yellow-700 dark:text-yellow-300')}>{line.text}</div>)}
        </div>
      ) : (
        <p className="text-xs text-gray-500 dark:text-gray-400">No message text was reported for this run.</p>
      )}
    </div>
  )
}

export default InstallsRunStatus

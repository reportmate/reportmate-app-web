/**
 * The message cell of an event row. Once the payload is in, the row shows the
 * items themselves (in the kind's colour, run messages as mono chips) instead
 * of a count like "4 warnings"; the summary text remains while loading or when
 * the payload carries no items.
 */

import React, { useEffect, useState } from 'react'
import { extractInlineDetails, fetchEventPayload, cachedEventPayload, inlineLineClass } from '../../eventInlineDetails'

interface EventInlineLinesProps {
  eventId: string
  kind: string
  summary: string
  /** Bundles are collection groupings; they keep their summary. */
  isBundle?: boolean
  /** Fetch the payload for this row; false for rows far down a long list. */
  autoFetch?: boolean
  /** Keep run messages (the mono chips) for the expanded view; list only items. */
  itemsOnly?: boolean
  className?: string
}

const shouldFetch = (kind: string) => ['success', 'warning', 'error'].includes(kind.toLowerCase())

export const EventInlineLines: React.FC<EventInlineLinesProps> = ({ eventId, kind, summary, isBundle = false, autoFetch = true, itemsOnly = false, className = '' }) => {
  const [payload, setPayload] = useState<unknown>(() => cachedEventPayload(eventId))
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isBundle || !autoFetch || !shouldFetch(kind) || payload !== undefined) return
    let cancelled = false
    setLoading(true)
    fetchEventPayload(eventId)
      .then(p => { if (!cancelled) setPayload(p) })
      .catch(() => { if (!cancelled) setPayload(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [eventId, kind, isBundle, autoFetch, payload])

  const extracted = extractInlineDetails(payload)
  const errors = itemsOnly ? extracted.errors.filter(l => !l.isMessage) : extracted.errors
  const warnings = itemsOnly ? extracted.warnings.filter(l => !l.isMessage) : extracted.warnings
  const successes = extracted.successes
  const hasDetails = errors.length > 0 || warnings.length > 0 || successes.length > 0

  if (!hasDetails) {
    return (
      <div className={className}>
        <div className="text-sm text-gray-900 dark:text-white break-words">{summary}</div>
        {loading && <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 italic">Loading details…</div>}
      </div>
    )
  }

  return (
    <div className={`space-y-1 ${className}`}>
      {errors.map((m, i) => (
        <div key={`e-${i}`} className={inlineLineClass(m, 'text-red-700 dark:text-red-300')}>{m.text}</div>
      ))}
      {warnings.map((m, i) => (
        <div key={`w-${i}`} className={inlineLineClass(m, 'text-yellow-700 dark:text-yellow-300')}>{m.text}</div>
      ))}
      {successes.map((m, i) => (
        <div key={`s-${i}`} className="text-sm text-green-700 dark:text-green-300 break-words">{m}</div>
      ))}
    </div>
  )
}

export default EventInlineLines

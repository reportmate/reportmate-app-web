/**
 * Expanded detail body for a Recent Events row.
 *
 * The events list endpoint deliberately omits payloads, so the body fetches
 * /api/events/<id>/payload on first expand and caches it for the session. A bundled
 * row fetches each constituent event and merges the result.
 */

import React, { useEffect, useState } from 'react'
import { summarizeEventPayload, type EventDetailSummary } from '../../eventPayloadDetails'

// Bundles are routine data-collection groupings; a handful of fetches covers them.
const MAX_BUNDLE_FETCHES = 8

const payloadCache = new Map<string, unknown>()

async function fetchPayload(eventId: string): Promise<unknown> {
  if (payloadCache.has(eventId)) return payloadCache.get(eventId)
  const response = await fetch(`/api/events/${encodeURIComponent(eventId)}/payload`)
  if (!response.ok) throw new Error(`Payload unavailable (${response.status})`)
  const body = await response.json()
  const payload = body?.payload ?? body
  payloadCache.set(eventId, payload)
  return payload
}

function mergeSummaries(summaries: EventDetailSummary[]): EventDetailSummary {
  const modules = new Set<string>()
  const groups = new Map<string, EventDetailSummary['groups'][number]>()
  const messages: EventDetailSummary['messages'] = []
  const context = new Map<string, string>()
  let suppressedMessageCount = 0

  for (const summary of summaries) {
    summary.modules.forEach(m => modules.add(m))
    for (const group of summary.groups) {
      const existing = groups.get(group.key)
      if (existing) existing.items.push(...group.items)
      else groups.set(group.key, { ...group, items: [...group.items] })
    }
    for (const message of summary.messages) {
      if (!messages.some(m => m.text === message.text)) messages.push(message)
    }
    suppressedMessageCount += summary.suppressedMessageCount
    summary.context.forEach(({ label, value }) => { if (!context.has(label)) context.set(label, value) })
  }

  const merged = {
    modules: [...modules],
    groups: [...groups.values()],
    messages,
    suppressedMessageCount,
    context: [...context].map(([label, value]) => ({ label, value })),
  }
  return {
    ...merged,
    isEmpty: merged.modules.length === 0 && merged.groups.length === 0 &&
      merged.messages.length === 0 && merged.context.length === 0,
  }
}

const TONE_TEXT: Record<string, string> = {
  neutral: 'text-gray-700 dark:text-gray-300',
  success: 'text-green-700 dark:text-green-400',
  warning: 'text-yellow-700 dark:text-yellow-400',
  error: 'text-red-700 dark:text-red-400',
}

const TONE_DOT: Record<string, string> = {
  neutral: 'bg-gray-400',
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  error: 'bg-red-500',
}

const SectionLabel: React.FC<{ children: React.ReactNode; count?: number }> = ({ children, count }) => (
  <div className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
    {children}
    {count !== undefined && <span className="ml-1.5 font-normal text-gray-400 dark:text-gray-500">{count}</span>}
  </div>
)

export const EventDetails: React.FC<{ eventIds: string[] }> = ({ eventIds }) => {
  const [summary, setSummary] = useState<EventDetailSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  // The parent rebuilds its bundles on every poll, so depend on the ids themselves
  // rather than the array identity — otherwise each poll flashes the skeleton back.
  const idKey = eventIds.join(',')

  useEffect(() => {
    let cancelled = false
    setError(null)
    setSummary(null)

    Promise.all(idKey.split(',').slice(0, MAX_BUNDLE_FETCHES).map(fetchPayload))
      .then(payloads => {
        if (cancelled) return
        setSummary(mergeSummaries(payloads.map(summarizeEventPayload)))
      })
      .catch((e: Error) => { if (!cancelled) setError(e.message) })

    return () => { cancelled = true }
  }, [idKey])

  if (error) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
  }

  if (!summary) {
    return (
      <div className="space-y-2 animate-pulse" aria-label="Loading event details">
        <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-3 w-2/3 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    )
  }

  if (summary.isEmpty) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">No further detail was reported for this event.</p>
  }

  return (
    <div className="space-y-5">
      {summary.modules.length > 0 && (
        <div>
          <SectionLabel count={summary.modules.length}>Modules</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {summary.modules.map(module => (
              <span
                key={module}
                className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 capitalize"
              >
                {module}
              </span>
            ))}
          </div>
        </div>
      )}

      {summary.groups.map(group => (
        <div key={group.key}>
          <SectionLabel count={group.items.length}>{group.label}</SectionLabel>
          <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((item, index) => (
              <li key={`${item.name}-${index}`} className="flex items-baseline gap-2 min-w-0">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 translate-y-[-1px] ${TONE_DOT[group.tone]}`}></span>
                <span className={`text-sm truncate ${TONE_TEXT[group.tone]}`}>{item.name}</span>
                {item.version && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-mono shrink-0">{item.version}</span>
                )}
                {item.detail && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{item.detail}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {/* Munki reports a run's problems as message text, Cimian as item names; both
          render under the same Errors / Warnings labels so a row reads the same
          whichever client produced it. */}
      {(['error', 'warning', 'neutral'] as const).map(tone => {
        const messages = summary.messages.filter(m => m.tone === tone)
        if (messages.length === 0) return null
        const label = tone === 'error' ? 'Errors' : tone === 'warning' ? 'Warnings' : 'Notes'
        return (
          <div key={tone}>
            <SectionLabel count={messages.length}>{label}</SectionLabel>
            <ul className="space-y-1">
              {messages.map((message, index) => (
                <li
                  key={index}
                  className={`text-xs font-mono px-2.5 py-1.5 rounded bg-gray-100 dark:bg-gray-900/50 break-words ${TONE_TEXT[message.tone]}`}
                >
                  {message.text}
                </li>
              ))}
            </ul>
          </div>
        )
      })}
      {summary.suppressedMessageCount > 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {summary.suppressedMessageCount} installer progress {summary.suppressedMessageCount === 1 ? 'line' : 'lines'} hidden
        </p>
      )}

      {summary.context.length > 0 && (
        <dl className="flex flex-wrap gap-x-6 gap-y-1">
          {summary.context.map(({ label, value }) => (
            <div key={label} className="flex items-baseline gap-1.5">
              <dt className="text-xs text-gray-500 dark:text-gray-400">{label}</dt>
              <dd className="text-xs font-medium text-gray-700 dark:text-gray-300 font-mono">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}

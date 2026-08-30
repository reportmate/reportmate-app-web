/**
 * System-level problems from managed-software runs: messages the client could
 * not attribute to any item (manifest and catalog retrieval, preflight and
 * postflight failures, inventory errors). They are session-scoped facts — a
 * later clean run supersedes them but does not erase that they happened — so
 * they are read from the sessions history, not only the latest payload.
 */

import { itemNameFromMessage } from './status'

export interface SystemProblem {
  tone: 'error' | 'warning'
  message: string
  sessionId?: string
  time?: string
}

export interface SystemProblemsSummary {
  /** Problems from the most recent finished session. */
  current: SystemProblem[]
  /** Problems from earlier sessions inside the window, newest first. */
  recent: SystemProblem[]
  /** The most recent session failed outright (errors, or failed status). */
  latestFailed: boolean
  /** The most recent session reported no items at all. */
  latestItemless: boolean
}

const RECENT_WINDOW_MS = 24 * 60 * 60 * 1000
const MAX_SESSIONS = 8

const nameless = (problem: any) => !String(problem?.name || '').trim()
const messageOf = (problem: any) => String(problem?.message || '').trim()

/** Legacy flattened strings: keep only lines that name no item. */
function systemLines(raw: unknown): string[] {
  if (typeof raw !== 'string') return []
  return raw
    .split(/;|\n/)
    .map(s => s.trim())
    .filter(s => s && !/^-{3,}$/.test(s) && !/^installer:/i.test(s) && itemNameFromMessage(s) === null)
}

export function collectSystemProblems(installs: any): SystemProblemsSummary {
  const munki = installs?.munki
  const cimian = installs?.cimian
  const empty: SystemProblemsSummary = { current: [], recent: [], latestFailed: false, latestItemless: false }

  if (munki) {
    const sessions: any[] = Array.isArray(munki.sessions) ? munki.sessions : []
    if (sessions.length > 0) {
      const cutoff = Date.now() - RECENT_WINDOW_MS
      const summary: SystemProblemsSummary = {
        current: [],
        recent: [],
        latestFailed: String(sessions[0]?.status || '').toLowerCase() === 'failed'
          || (sessions[0]?.error_items || []).length > 0,
        latestItemless: !Array.isArray(munki.items) || munki.items.length === 0,
      }
      sessions.slice(0, MAX_SESSIONS).forEach((session, index) => {
        const time = String(session?.end_time || session?.start_time || '')
        if (index > 0 && time && new Date(time).getTime() < cutoff) return
        const sessionId = String(session?.session_id || '')
        for (const [key, tone] of [['error_items', 'error'], ['warning_items', 'warning']] as const) {
          for (const problem of (session?.[key] || []) as any[]) {
            if (!nameless(problem)) continue
            const message = messageOf(problem)
            if (!message) continue
            const target = index === 0 ? summary.current : summary.recent
            if (!target.some(p => p.message === message) && !summary.current.some(p => p.message === message)) {
              target.push({ tone, message, sessionId, time })
            }
          }
        }
      })
      return summary
    }
    // Legacy payload: only the latest run's flattened strings exist.
    const errors = systemLines(munki.errors)
    const warnings = systemLines(munki.warnings)
    const status = String(munki.status || '').toLowerCase()
    return {
      current: [
        ...errors.map(message => ({ tone: 'error' as const, message })),
        ...warnings.map(message => ({ tone: 'warning' as const, message })),
      ],
      recent: [],
      latestFailed: munki.lastRunSuccess === false || munki.lastRunSuccess === 0 || status === 'error'
        || String(munki.errors || '').trim() !== '',
      latestItemless: !Array.isArray(munki.items) || munki.items.length === 0,
    }
  }

  if (cimian) {
    const sessions: any[] = Array.isArray(cimian.sessions) ? cimian.sessions : []
    if (sessions.length === 0) return empty
    const cutoff = Date.now() - RECENT_WINDOW_MS
    const summary: SystemProblemsSummary = {
      current: [],
      recent: [],
      latestFailed: ['failed', 'error'].includes(String(sessions[0]?.status || '').toLowerCase()),
      latestItemless: !Array.isArray(cimian.items) || cimian.items.length === 0,
    }
    sessions.slice(0, MAX_SESSIONS).forEach((session, index) => {
      const time = String(session?.end_time || session?.start_time || '')
      if (index > 0 && time && new Date(time).getTime() < cutoff) return
      const status = String(session?.status || '').toLowerCase()
      if (!['failed', 'error'].includes(status)) return
      // Cimian sessions carry counts rather than message text; the failed
      // session itself is the system-level fact worth surfacing.
      const failures = Number(session?.failures ?? session?.packages_failed ?? 0)
      const message = failures > 0
        ? `Run ${session?.session_id || ''} failed (${failures} failure${failures === 1 ? '' : 's'})`
        : `Run ${session?.session_id || ''} failed`
      const target = index === 0 ? summary.current : summary.recent
      if (!target.some(p => p.message === message) && !summary.current.some(p => p.message === message)) {
        target.push({ tone: 'error', message, sessionId: String(session?.session_id || ''), time })
      }
    })
    return summary
  }

  return empty
}

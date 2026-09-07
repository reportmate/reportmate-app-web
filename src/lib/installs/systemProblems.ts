import { cleanLogText } from '../logText'
/**
 * System-level problems from the most recent managed-software run: messages the
 * client could not attribute to any item (manifest and catalog retrieval,
 * preflight and postflight failures, inventory errors).
 *
 * Only the latest session is read. A run's problems describe the state that run
 * found, and the next run re-derives that state from scratch — so a clean run
 * supersedes what came before it and the box goes away. The run history stays
 * available in the sessions list; it does not belong in a banner that reads as
 * the device's current condition.
 */

import { itemNameFromMessage } from './status'

export interface SystemProblem {
  tone: 'error' | 'warning'
  message: string
  sessionId?: string
  time?: string
}

export interface SystemProblemsSummary {
  /** System-level problems from the latest run. */
  problems: SystemProblem[]
  /** Session the problems came from. */
  sessionId?: string
  time?: string
  /** The latest session failed outright and reported no items at all. */
  failedWithoutItems: boolean
}

const nameless = (problem: any) => !String(problem?.name || '').trim()
const messageOf = (problem: any) => cleanLogText(problem?.message)

/** Legacy flattened strings: keep only lines that name no item. */
function systemLines(raw: unknown): string[] {
  if (typeof raw !== 'string') return []
  return cleanLogText(raw)
    .split(/;|\n/)
    .map(s => s.trim())
    .filter(s => s && !/^-{3,}$/.test(s) && !/^installer:/i.test(s) && itemNameFromMessage(s) === null)
}

export function collectSystemProblems(installs: any): SystemProblemsSummary {
  const munki = installs?.munki
  const cimian = installs?.cimian
  const empty: SystemProblemsSummary = { problems: [], failedWithoutItems: false }

  if (munki) {
    const sessions: any[] = Array.isArray(munki.sessions) ? munki.sessions : []
    if (sessions.length > 0) {
      const session = sessions[0]
      const itemless = !Array.isArray(munki.items) || munki.items.length === 0
      const failedWithoutItems = String(session?.status || '').toLowerCase() === 'failed' && itemless
      const problems: SystemProblem[] = []
      for (const [keys, tone] of [[['error_items', 'errorItems'], 'error'], [['warning_items', 'warningItems'], 'warning']] as const) {
        for (const problem of ((session?.[keys[0]] ?? session?.[keys[1]] ?? []) as any[])) {
          if (!nameless(problem)) continue
          const message = messageOf(problem)
          if (message && !problems.some(p => p.message === message)) problems.push({ tone, message })
        }
      }
      if (problems.length === 0) return { ...empty, failedWithoutItems }
      return {
        problems,
        sessionId: String(session?.session_id || session?.sessionId || ''),
        time: String(session?.end_time || session?.endTime || session?.start_time || session?.startTime || ''),
        failedWithoutItems,
      }
    }
    // Legacy payload: only the latest run's flattened strings exist.
    const errors = systemLines(munki.errors)
    const warnings = systemLines(munki.warnings)
    const status = String(munki.status || '').toLowerCase()
    const failed = munki.lastRunSuccess === false || munki.lastRunSuccess === 0 || status === 'error'
      || String(munki.errors || '').trim() !== ''
    const itemless = !Array.isArray(munki.items) || munki.items.length === 0
    return {
      problems: [
        ...errors.map(message => ({ tone: 'error' as const, message })),
        ...warnings.map(message => ({ tone: 'warning' as const, message })),
      ],
      failedWithoutItems: failed && itemless,
    }
  }

  if (cimian) {
    const sessions: any[] = Array.isArray(cimian.sessions) ? cimian.sessions : []
    if (sessions.length === 0) return empty
    const itemless = !Array.isArray(cimian.items) || cimian.items.length === 0
    const latestFailed = ['failed', 'error'].includes(String(sessions[0]?.status || '').toLowerCase())
    return { ...empty, failedWithoutItems: latestFailed && itemless }
  }

  return empty
}

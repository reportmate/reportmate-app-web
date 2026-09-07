import { collectSystemProblems } from './systemProblems'

// Shapes copied from a live Mac payload: sessions newest-first, run-level
// problems carried as nameless error_items/warning_items, item-level ones
// carrying the item's name.
const catalogFailure = {
  session_id: '2026-09-07-0921',
  status: 'completed',
  start_time: '2026-09-07T09:21:12.715-07:00',
  error_items: [{ message: 'Could not download catalog Production' }],
  warning_items: [{ name: 'Chrome', message: 'Could not process item Chrome for install.' }],
}
const clean = {
  session_id: '2026-09-07-1122',
  status: 'completed',
  start_time: '2026-09-07T11:22:59.398-07:00',
  error_items: [],
  warning_items: [],
}
const items = [{ name: 'Chrome', status: 'installed', installedVersion: '152.0.7977.76' }]

describe('system problems from the latest run', () => {
  it('reports the run-level problems of the latest session', () => {
    const summary = collectSystemProblems({ munki: { sessions: [catalogFailure], items } })
    expect(summary.problems).toEqual([{ tone: 'error', message: 'Could not download catalog Production' }])
    expect(summary.sessionId).toBe('2026-09-07-0921')
    expect(summary.failedWithoutItems).toBe(false)
  })

  it('clears once a clean run supersedes the failed one', () => {
    // The regression this guards: a transient catalog fetch failure left the
    // device badged "Last run failed" for a day, through every clean run after it.
    const summary = collectSystemProblems({ munki: { sessions: [clean, catalogFailure], items } })
    expect(summary.problems).toEqual([])
    expect(summary.failedWithoutItems).toBe(false)
  })

  it('leaves item-attributable problems to the item', () => {
    const onlyItemWarnings = { ...catalogFailure, error_items: [] }
    expect(collectSystemProblems({ munki: { sessions: [onlyItemWarnings], items } }).problems).toEqual([])
  })

  it('flags a failed run that reported no items at all', () => {
    const failed = { ...clean, status: 'failed' }
    expect(collectSystemProblems({ munki: { sessions: [failed], items: [] } }).failedWithoutItems).toBe(true)
    expect(collectSystemProblems({ munki: { sessions: [failed], items } }).failedWithoutItems).toBe(false)
  })

  it('reads the flattened strings of a legacy payload', () => {
    const summary = collectSystemProblems({
      munki: { errors: 'Could not download catalog Production', warnings: '', items },
    })
    expect(summary.problems).toEqual([{ tone: 'error', message: 'Could not download catalog Production' }])
  })
})

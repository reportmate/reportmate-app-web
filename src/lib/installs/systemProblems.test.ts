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

})

// Munki without the structured session reports: no sessions array, no items on
// some client builds, and the run's problems arriving as the semicolon-joined
// strings from ManagedInstallReport.plist. Shape copied from a live device
// running that build.
describe('Munki without structured session reports', () => {
  const legacyClean = { isInstalled: 1, status: 'Active', lastRunSuccess: 1, errors: null, warnings: null, items: [] }

  it('reads the flattened strings of the latest run', () => {
    const summary = collectSystemProblems({
      ...{ munki: { ...legacyClean, errors: 'Could not download catalog Production' } },
    })
    expect(summary.problems).toEqual([{ tone: 'error', message: 'Could not download catalog Production' }])
  })

  it('clears when the next run rewrites the report clean', () => {
    // ManagedInstallReport.plist is rewritten every run, so the legacy payload
    // is inherently the latest run — nothing to supersede, only to not invent.
    expect(collectSystemProblems({ munki: legacyClean }).problems).toEqual([])
    expect(collectSystemProblems({ munki: legacyClean }).failedWithoutItems).toBe(false)
  })

  it('does not call a run that reported errors a run that failed', () => {
    // A client build that collects no items would otherwise turn every error
    // into "the run did not complete, so no items were reported".
    const summary = collectSystemProblems({
      munki: { ...legacyClean, errors: 'Could not download catalog Production' },
    })
    expect(summary.failedWithoutItems).toBe(false)
  })

  it('still reports a run whose own verdict is failure', () => {
    expect(collectSystemProblems({ munki: { ...legacyClean, lastRunSuccess: 0 } }).failedWithoutItems).toBe(true)
    expect(collectSystemProblems({ munki: { ...legacyClean, status: 'error' } }).failedWithoutItems).toBe(true)
  })

  it('keeps warnings out of the error tone', () => {
    const summary = collectSystemProblems({
      munki: { ...legacyClean, warnings: 'Could not retrieve managed_installs manifest' },
    })
    expect(summary.problems).toEqual([{ tone: 'warning', message: 'Could not retrieve managed_installs manifest' }])
  })
})

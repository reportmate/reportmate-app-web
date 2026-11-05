import {
  jsonList, readUpdatesView, updateFlags, updatesApiQuery, updatesCsv, updatesPageQuery, updatesUrlQuery,
  updatesViewRows, updateSearchLabel, updateStateLabel, type UpdateRow,
} from './updates'

const base: UpdateRow = {
  serialNumber: 'TESTSERIAL01', deviceName: 'Device 1', hostname: null, platform: 'Windows', osVersion: null, assetTag: null,
  usage: null, catalog: null, area: null, fleet: null, location: null, room: null, archived: false, inventoryState: null,
  lastSeen: null, collectedAt: null, freshness: 'fresh', collectionValid: true, pendingCount: 1,
  updateKey: 'windows:kb5000001', title: 'Security Update (KB5000001)', kb: 'KB5000001', category: 'Security Updates',
  severity: 'Important', cves: ['CVE-2026-0001'], isSecurity: true, mandatory: false, downloaded: true, rebootRequired: true,
  deferred: null, deferredUntil: null, firstOfferedAt: null, releaseDate: '2026-06-09', installDate: null, version: null,
  buildVersion: null, updateType: null, ageDays: 20, ageSource: 'released', reportedState: 'pending', state: 'pending',
}

it('carries every report filter and the platform to the API, without view or tab state', () => {
  const params = new URLSearchParams({
    tab: 'updates', updates: JSON.stringify(['windows:kb5000001']), cves: JSON.stringify(['CVE-2026-0001']),
    states: 'pending,unknown', securityOnly: 'true', deferred: 'yes', rebootRequired: 'true', minAgeDays: '30',
    freshness: 'fresh', maxAgeHours: '168', search: 'serial', rooms: 'Studio', includeArchived: 'true', sort: 'title',
  })
  const query = new URLSearchParams(updatesApiQuery(params, 'Windows'))
  for (const key of ['updates', 'cves', 'states', 'securityOnly', 'deferred', 'rebootRequired', 'minAgeDays', 'freshness', 'maxAgeHours', 'search', 'rooms', 'includeArchived']) {
    expect(query.get(key)).toBe(params.get(key))
  }
  expect(query.get('platform')).toBe('Windows')
  expect(query.has('tab')).toBe(false)
  expect(query.has('sort')).toBe(false)
  const page = new URLSearchParams(updatesPageQuery(query.toString(), 1000))
  expect(page.get('offset')).toBe('1000')
  expect(page.get('limit')).toBe('1000')
})

it('keeps the tab and unrelated URL state when a filter changes', () => {
  const next = new URLSearchParams(updatesUrlQuery('platform=mac&states=pending', { states: null, securityOnly: 'true' }))
  expect(next.get('tab')).toBe('updates')
  expect(next.get('platform')).toBe('mac')
  expect(next.has('states')).toBe(false)
  expect(next.get('securityOnly')).toBe('true')
})

it('reads selections with punctuation from JSON and ignores malformed values', () => {
  expect(jsonList(new URLSearchParams({ updates: JSON.stringify(['macos:macos 26.5', 'windows:title:driver (1.0, x64)']) }), 'updates'))
    .toEqual(['macos:macos 26.5', 'windows:title:driver (1.0, x64)'])
  expect(jsonList(new URLSearchParams({ updates: '[broken' }), 'updates')).toEqual([])
})

it('sorts unknown values last and keeps device-level rows', () => {
  const none = { ...base, serialNumber: 'TESTSERIAL02', updateKey: null, title: null, kb: null, ageDays: null, state: 'none' as const, reportedState: 'none' }
  const older = { ...base, serialNumber: 'TESTSERIAL03', ageDays: 90 }
  const view = readUpdatesView(new URLSearchParams({ sort: 'ageDays', direction: 'desc' }))
  expect(updatesViewRows([none, base, older], view).map(r => r.serialNumber)).toEqual(['TESTSERIAL03', 'TESTSERIAL01', 'TESTSERIAL02'])
})

it('lists only collected flags', () => {
  expect(updateFlags(base)).toEqual(['Security', 'Downloaded', 'Restart required'])
  expect(updateFlags({ ...base, isSecurity: null, downloaded: null, rebootRequired: null })).toEqual([])
})

it('exports one CSV line per row with update and collection columns', () => {
  const csv = updatesCsv([base], '2026-06-30T00:00:00Z', 'https://example.com/system?tab=updates')
  const lines = csv.split('\r\n')
  expect(lines).toHaveLength(2)
  for (const header of ['Serial Number', 'KB', 'CVEs', 'Restart Required', 'Deferred Until', 'Update Collection Valid', 'Report URL']) expect(lines[0]).toContain(`"${header}"`)
  expect(lines[1]).toContain('"KB5000001"')
  expect(lines[1]).toContain('"CVE-2026-0001"')
})

it('labels the last update search and keeps a missing one as not reported', () => {
  expect(updateSearchLabel(undefined)).toBe('Not reported')
  expect(updateSearchLabel({ status: 'not_reported', error: null, checkedAt: null, freshness: 'unknown' })).toBe('Not reported')
  expect(updateSearchLabel({ status: 'failed', error: 'Timed out', checkedAt: '2026-06-30T00:00:00Z', freshness: 'fresh' })).toBe('Search failed')
  expect(updateSearchLabel({ status: 'succeeded', error: null, checkedAt: '2026-06-30T00:00:00Z', freshness: 'fresh' })).toBe('Succeeded')
  expect(updateSearchLabel({ status: 'succeeded', error: null, checkedAt: '2026-06-01T00:00:00Z', freshness: 'stale' })).toContain('older')
  expect(updateStateLabel('search_failed')).toBe('Search failed')
  expect(updateStateLabel('none')).toBe('No pending updates')
})

it('exports the update search status and error', () => {
  const failed = { ...base, updateKey: null, state: 'search_failed' as const, reportedState: 'search_failed',
    updateSearch: { status: 'failed' as const, error: 'Search timed out', checkedAt: '2026-06-30T00:00:00Z', freshness: 'fresh' as const } }
  const lines = updatesCsv([failed, base], '2026-06-30T00:00:00Z', 'https://example.com/system?tab=updates').split('\r\n')
  for (const header of ['Update Search', 'Update Search Error', 'Update Search Time']) expect(lines[0]).toContain(`"${header}"`)
  expect(lines[1]).toContain('"Search failed"')
  expect(lines[1]).toContain('"Search timed out"')
  expect(lines[2]).toContain('"Not reported"')
})

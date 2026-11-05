import { BACKGROUND_REPORT, taskTime } from './background'
import { EXTENSIONS_REPORT } from './extensions'
import {
  hasReportQuery, itemReportCsv, listParam, readItemView, reportApiQuery, reportUrlQuery, sortRows, type ItemRow,
} from './item-reports'

const row = (fields: Partial<ItemRow>): ItemRow => ({
  serialNumber: 'TESTSERIAL01', deviceName: 'Device A', hostname: null, assetTag: null, platform: 'Windows',
  usage: null, catalog: null, area: null, fleet: null, location: null, room: null, archived: false,
  inventoryState: 'unknown', lastSeen: null, collectedAt: null, freshness: 'unknown', kind: 'task', key: null, name: null,
  ...fields,
})

it('forwards selections, filters and scope but not view state or the tab', () => {
  const params = new URLSearchParams('tab=background&items=%5B%22task%3A%5C%5CVendor%20Task%22%5D&lastRuns=failed&origins=thirdParty&catalogs=Staff&includeArchived=true&sort=lastRunTime&columns=name')
  const query = new URLSearchParams(reportApiQuery(BACKGROUND_REPORT, params, 'Windows'))
  expect(query.get('items')).toBe('["task:\\\\Vendor Task"]')
  expect(query.get('lastRuns')).toBe('failed')
  expect(query.get('catalogs')).toBe('Staff')
  expect(query.get('platform')).toBe('windows')
  for (const key of ['tab', 'sort', 'columns']) expect(query.has(key)).toBe(false)
})

it('maps the global platform filter to the API', () => {
  expect(new URLSearchParams(reportApiQuery(EXTENSIONS_REPORT, new URLSearchParams(), 'all')).get('platform')).toBe('all')
  expect(new URLSearchParams(reportApiQuery(EXTENSIONS_REPORT, new URLSearchParams(), 'macOS')).get('platform')).toBe('macos')
})

it('runs only with selections or a bounded fleet-wide filter', () => {
  expect(hasReportQuery(BACKGROUND_REPORT, new URLSearchParams('origins=thirdParty'))).toBe(false)
  expect(hasReportQuery(BACKGROUND_REPORT, new URLSearchParams('lastRuns=failed'))).toBe(true)
  expect(hasReportQuery(EXTENSIONS_REPORT, new URLSearchParams('signatures=unsigned'))).toBe(true)
  expect(hasReportQuery(EXTENSIONS_REPORT, new URLSearchParams('teamIds=ABCDE12345'))).toBe(true)
  expect(hasReportQuery(EXTENSIONS_REPORT, new URLSearchParams('items=%5B%22helper%3Acom.example.helper%22%5D'))).toBe(true)
})

it('ignores malformed item selections', () => {
  expect(listParam(new URLSearchParams('items=notjson'), 'items')).toEqual([])
  expect(listParam(new URLSearchParams('items=%5B1%2C%22nokind%22%2C%22task%3Ax%22%5D'), 'items')).toEqual(['task:x'])
})

it('keeps the tab and other state when a filter changes', () => {
  const next = new URLSearchParams(reportUrlQuery('extensions', 'platform=mac&signatures=unsigned', { teamIds: 'ABCDE12345', signatures: null }))
  expect(next.get('tab')).toBe('extensions')
  expect(next.get('platform')).toBe('mac')
  expect(next.get('teamIds')).toBe('ABCDE12345')
  expect(next.has('signatures')).toBe(false)
})

it('sorts times chronologically with unknown values last', () => {
  const rows = [row({ name: 'a', lastRunTime: null }), row({ name: 'b', lastRunTime: '2026-01-02T00:00:00Z' }), row({ name: 'c', lastRunTime: '2026-01-01T00:00:00Z' })]
  const view = readItemView(BACKGROUND_REPORT, new URLSearchParams('sort=lastRunTime&direction=desc'))
  expect(sortRows(BACKGROUND_REPORT, rows, view).map(r => r.name)).toEqual(['b', 'c', 'a'])
})

it('exports every column for exactly the given rows and never shows unknown as healthy', () => {
  const csv = itemReportCsv(EXTENSIONS_REPORT, [row({ kind: 'helper', name: '=cmd', signature: 'unknown', platform: 'macOS' })], '2026-01-01T00:00:00Z', 'https://example.com/system?tab=extensions')
  const lines = csv.split('\r\n')
  expect(lines).toHaveLength(2)
  expect(lines[0]).toContain('"Signature"')
  expect(lines[1]).toContain(`"'=cmd"`)
  expect(lines[1]).toContain('"Unknown"')
  expect(lines[1]).not.toContain('"Signed"')
})

it('shows Task Scheduler sentinel times as never or not scheduled', () => {
  expect(taskTime('1999-11-30T00:00:00', 'Never')).toBe('Never')
  expect(taskTime('1899-12-30T00:00:00', 'Not scheduled')).toBe('Not scheduled')
  expect(taskTime('2026-07-14T02:45:50', 'Never')).toBe('2026-07-14T02:45:50')
  expect(taskTime(null, 'Never')).toBeNull()
})

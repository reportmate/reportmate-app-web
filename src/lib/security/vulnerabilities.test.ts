import {
  apiQuery, cveSummaryCsv, detectionDays, detectionsCsv, detectionsQuery, fetchAllRows, filterSummary, listParam, patchQuery,
  sortDetections, sortSummary, sortVulnerabilities, vulnerabilitiesCsv, vulnerabilityHref, VULNERABILITY_PARAMS,
  type CveSummary, type DetectionRow, type VulnerabilityRow,
} from './vulnerabilities'

jest.mock('../data-cache', () => ({ trackedFetch: (...args: unknown[]) => mockFetch(...args) }))
let mockFetch: jest.Mock

const device = { deviceName: 'Device One', platform: 'Windows', assetTag: null, usage: null, catalog: null, area: null, fleet: null,
  location: null, room: null, archived: false, inventoryState: 'checked_out', lastSeen: null, collectedAt: '2026-01-02T00:00:00Z' }
const vuln = (over: Partial<VulnerabilityRow>): VulnerabilityRow => ({ ...device, serialNumber: 'TESTSERIAL01', identifier: 'CVE-2026-1000',
  cve: 'CVE-2026-1000', kbArticle: null, label: 'CVE-2026-1000', source: 'MSRC', status: 'unpatched', severity: null, product: null,
  affectedVersion: null, fixedIn: null, activelyExploited: null, installedDate: null, url: null, freshness: 'fresh', listMayBeIncomplete: false, ...over })

it('reads exact CVE selections from a JSON array and keeps commas inside names', () => {
  const params = new URLSearchParams({ cves: JSON.stringify(['CVE-2026-1000', 'Update, with comma']), statuses: 'unpatched,patched' })
  expect(listParam(params, 'cves')).toEqual(['CVE-2026-1000', 'Update, with comma'])
  expect(listParam(params, 'statuses')).toEqual(['unpatched', 'patched'])
  expect(listParam(new URLSearchParams({ cves: '[broken' }), 'cves')).toEqual([])
})

it('sends only report parameters and the global platform to the API', () => {
  const params = new URLSearchParams({ tab: 'vulnerabilities', sort: 'severity', q: 'x', exploited: 'yes', view: 'devices' })
  const query = new URLSearchParams(apiQuery(params, VULNERABILITY_PARAMS.filter(k => k !== 'view'), 'macOS'))
  expect(Object.fromEntries(query)).toEqual({ exploited: 'yes', platform: 'macOS' })
})

it('defaults the detection window to 30 days and rejects nonsense', () => {
  expect(detectionDays(new URLSearchParams())).toBe(30)
  expect(detectionDays(new URLSearchParams('days=0'))).toBe(0)
  expect(detectionDays(new URLSearchParams('days=-4'))).toBe(30)
  expect(new URLSearchParams(detectionsQuery(new URLSearchParams('vendors=windowsdefender'), 'all')).get('days')).toBe('30')
})

it('keeps the tab and drops empty values when patching the URL', () => {
  expect(patchQuery('platform=mac&statuses=patched', 'threats', { statuses: null, days: '7' })).toBe('platform=mac&tab=threats&days=7')
})

it('only links to known CVE pages or an http(s) reported URL', () => {
  expect(vulnerabilityHref({ cve: 'CVE-2026-1000', url: null, source: 'MSRC' })).toBe('https://msrc.microsoft.com/update-guide/vulnerability/CVE-2026-1000')
  expect(vulnerabilityHref({ cve: 'CVE-2026-1000', url: null, source: 'SOFA' })).toBe('https://nvd.nist.gov/vuln/detail/CVE-2026-1000')
  expect(vulnerabilityHref({ cve: null, url: 'javascript:alert(1)', source: 'MSRC' })).toBe('')
  expect(vulnerabilityHref({ cve: null, url: 'https://example.com/kb', source: 'MSRC' })).toBe('https://example.com/kb')
})

it('sorts exploited first when descending, with unknown between yes and no', () => {
  const rows = [vuln({ identifier: 'A', activelyExploited: false }), vuln({ identifier: 'B', activelyExploited: null }), vuln({ identifier: 'C', activelyExploited: true })]
  expect(sortVulnerabilities(rows, 'exploited', 'desc').map(r => r.identifier)).toEqual(['C', 'B', 'A'])
  expect(sortVulnerabilities(rows, 'severity', 'asc').map(r => r.identifier)).toEqual(['A', 'B', 'C'])
})

it('filters and sorts the CVE summary without refetching', () => {
  const summary: CveSummary[] = [
    { identifier: 'CVE-2026-1', cve: 'CVE-2026-1', kbArticle: null, devices: 2, unpatchedDevices: 2, patchedDevices: 0, activelyExploited: true, severities: [], fixedIn: ['26.2'], products: ['macOS'], platforms: ['macOS'], sources: ['SOFA'] },
    { identifier: 'KB1000', cve: null, kbArticle: 'KB1000', devices: 5, unpatchedDevices: 1, patchedDevices: 4, activelyExploited: false, severities: ['Important'], fixedIn: ['KB1000'], products: ['Example update'], platforms: ['Windows'], sources: ['MSRC'] },
  ]
  expect(filterSummary(summary, 'example').map(r => r.identifier)).toEqual(['KB1000'])
  expect(sortSummary(summary, 'devices', 'desc').map(r => r.identifier)).toEqual(['KB1000', 'CVE-2026-1'])
  expect(sortSummary(summary, null, 'desc')).toBe(summary)
})

it('sorts detections newest first by default, undated last', () => {
  const det = (name: string, lastSeenAt: string | null) => ({ ...device, serialNumber: name, threatName: name, threatId: null, severity: null, vendor: null,
    category: null, status: null, actionTaken: null, detectedAt: lastSeenAt, firstSeenAt: null, lastSeenAt, count: null, path: null, processName: null, user: null }) as DetectionRow
  const rows = [det('old', '2026-01-01T00:00:00Z'), det('undated', null), det('new', '2026-02-01T00:00:00Z')]
  expect(sortDetections(rows, null, 'desc').map(r => r.threatName)).toEqual(['new', 'old', 'undated'])
})

it('exports the not-reported severity as such and never a non-http link', () => {
  const csv = vulnerabilitiesCsv([vuln({ url: 'javascript:alert(1)', cve: null, identifier: 'KB1', kbArticle: 'KB1' })], 'now', 'https://example.com/r')
  expect(csv).toContain('"Not reported"')
  expect(csv).not.toContain('javascript:')
  expect(cveSummaryCsv([], 'now', 'u').split('\r\n')).toHaveLength(1)
  expect(detectionsCsv([], 'now', 'u')).toContain('"Vendor / Product"')
})

it('loads every page and refuses a report that changed while loading', async () => {
  const page = (offset: number, rows: number, total: number) => ({ ok: true, json: async () => ({ generatedAt: 'now', coverage: {}, options: {}, total, limit: 5000, offset,
    rows: Array.from({ length: rows }, (_, i) => ({ serialNumber: `S${offset + i}` })) }) })
  mockFetch = jest.fn().mockResolvedValueOnce(page(0, 5000, 5001)).mockResolvedValueOnce(page(5000, 1, 5001))
  const report = await fetchAllRows('/api', 'platform=all', new AbortController().signal)
  expect(report.rows).toHaveLength(5001)
  expect(new URLSearchParams(mockFetch.mock.calls[1][0].split('?')[1]).get('offset')).toBe('5000')
  mockFetch = jest.fn().mockResolvedValueOnce(page(0, 5000, 5001)).mockResolvedValueOnce(page(5000, 1, 5002))
  await expect(fetchAllRows('/api', '', new AbortController().signal)).rejects.toThrow('changed')
})

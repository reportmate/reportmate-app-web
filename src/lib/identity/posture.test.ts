import {
  columnText, postureApiQuery, postureCsv, posturePageQuery, postureRows, postureUrlQuery, readPostureView,
  type PostureDevice,
} from './posture'

const base = {
  computerName: null, assetTag: null, usage: null, catalog: null, area: null, fleet: null, location: null, room: null,
  archived: false, inventoryState: null, lastSeen: null, identityCollectedAt: null, securityCollectedAt: null,
  identityFreshness: 'fresh' as const, securityFreshness: 'fresh' as const,
  checks: { noLaps: null, noValidPrt: null, autoLogin: null, expiredPssoToken: null, activationLock: null, noRecoveryKey: null },
}
const win = (serial: string, reported: PostureDevice['reported']): PostureDevice => ({ ...base, serialNumber: serial, deviceName: serial, platform: 'Windows', reported })
const mac = (serial: string, reported: PostureDevice['reported']): PostureDevice => ({ ...base, serialNumber: serial, deviceName: serial, platform: 'macOS', reported })

it('sends only report filters to the API and pages from the start', () => {
  const params = new URLSearchParams({ tab: 'posture', views: 'noLaps', sort: 'laps', columns: 'laps', usages: 'shared', includeArchived: 'true' })
  const query = new URLSearchParams(postureApiQuery(params, 'Windows'))
  expect(query.get('views')).toBe('noLaps')
  expect(query.get('platform')).toBe('Windows')
  expect(query.get('usages')).toBe('shared')
  expect(query.has('sort')).toBe(false)
  expect(query.has('tab')).toBe(false)
  expect(new URLSearchParams(posturePageQuery(query.toString(), 500)).get('offset')).toBe('500')
})

it('keeps the tab and unrelated state when a filter changes', () => {
  const next = new URLSearchParams(postureUrlQuery('platform=mac&views=noLaps&sort=laps', { views: null }))
  expect(next.get('tab')).toBe('posture')
  expect(next.get('platform')).toBe('mac')
  expect(next.has('views')).toBe(false)
  expect(next.get('sort')).toBe('laps')
})

it('shows unknown separately from false and not-applicable across platforms', () => {
  expect(columnText(win('W1', { laps: 'not_configured' }), 'laps')).toBe('Not configured')
  expect(columnText(win('W2', {}), 'laps')).toBe('Unknown')
  expect(columnText(win('W3', { autoLogin: false }), 'autoLogin')).toBe('Off')
  expect(columnText(win('W4', {}), 'autoLogin')).toBe('Unknown')
  expect(columnText(mac('M1', {}), 'laps')).toBeNull()
  expect(columnText(mac('M2', { activationLock: 'likely' }), 'activationLock')).toContain('inferred')
  expect(columnText(mac('M3', { recoveryKey: 'present', personalRecoveryKey: true, institutionalRecoveryKey: false }), 'recoveryKey')).toBe('Personal')
})

it('sorts unknown values last in both directions', () => {
  const devices = [win('A', {}), win('B', { laps: 'configured' }), win('C', { laps: 'not_configured' })]
  const asc = readPostureView(new URLSearchParams('columns=laps&sort=laps'), 'Windows')
  expect(postureRows(devices, asc).map(d => d.serialNumber)).toEqual(['B', 'C', 'A'])
  expect(postureRows(devices, { ...asc, direction: 'desc' }).map(d => d.serialNumber)).toEqual(['C', 'B', 'A'])
})

it('offers only the selected platform columns', () => {
  expect(readPostureView(new URLSearchParams('columns=laps,psso'), 'macOS').columns).toEqual(['deviceName', 'psso'])
})

it('exports every posture field in row order with not-applicable marked', () => {
  const csv = postureCsv([mac('M1', { pssoState: 'expired', pssoUsers: [{ username: 'sample', registered: true, tokenExpiration: '2026-01-01T00:00:00Z', token: 'expired' }] }), win('W1', { autoLogin: true })], '2026-06-01T00:00:00Z', 'https://example.com/identity?tab=posture')
  const lines = csv.split('\r\n')
  expect(lines).toHaveLength(3)
  for (const header of ['Serial Number', 'LAPS', 'Platform SSO', 'Quick View: No LAPS', 'Identity Collection Freshness', 'Report URL']) expect(lines[0]).toContain(`"${header}"`)
  expect(lines[1]).toContain('"M1"')
  expect(lines[1]).toContain('Not applicable')
  expect(lines[1]).toContain('sample: expired')
  expect(lines[2]).toContain('"On"')
})

it('keeps an unreported PRT apart from no PRT and no signed-in user', () => {
  expect(columnText(win('W1', {}), 'prt')).toBe('Not reported')
  expect(columnText(win('W2', { prtState: 'not_reported' }), 'prt')).toBe('Not reported')
  expect(columnText(win('W3', { prtState: 'not_available' }), 'prt')).toBe('No user signed in')
  expect(columnText(win('W4', { prtState: 'none' }), 'prt')).toBe('No PRT')
  expect(columnText(win('W5', { prtState: 'expired' }), 'prt')).toBe('Expired')
  expect(columnText(win('W6', { prtState: 'valid', cloudTgt: true, onPremTgt: false }), 'kerberos')).toBe('Cloud TGT Yes · On-prem TGT No')
  expect(columnText(win('W7', { prtState: 'not_available' }), 'kerberos')).toBe('No user signed in')
  expect(columnText(mac('M1', { prtState: 'none' }), 'prt')).toBeNull()
})

it('reports the LAPS policy source and password complexity only when sent', () => {
  expect(columnText(win('W1', { lapsPolicySource: 'gpo' }), 'lapsSource')).toBe('Group Policy')
  expect(columnText(win('W2', { lapsPolicySource: null }), 'lapsSource')).toBe('Not reported')
  expect(columnText(win('W3', {}), 'passwordPolicy')).toContain('Complexity not reported')
  expect(columnText(win('W4', { passwordComplexity: null }), 'passwordPolicy')).toContain('Complexity unknown')
  expect(columnText(win('W5', { passwordComplexity: false }), 'passwordPolicy')).toContain('No complexity')
})

it('sorts not-reported PRT states last', () => {
  const devices = [win('A', {}), win('B', { prtState: 'valid' }), win('C', { prtState: 'none' })]
  const view = readPostureView(new URLSearchParams('columns=prt&sort=prt'), 'Windows')
  expect(postureRows(devices, view).map(d => d.serialNumber)).toEqual(['C', 'B', 'A'])
})

import { extractInstalls } from './installs'

const session = {
  session_id: '2026-08-28-1158',
  start_time: '2026-08-28T11:58:11.4515409-07:00',
  end_time: '2026-08-28T12:02:26.142207-07:00',
  status: 'partial_failure',
  duration_seconds: 254,
}

const item = (name: string, seen: string) => ({
  id: `pkg_${name}`,
  type: 'cimian',
  itemName: name,
  displayName: name,
  itemType: 'managed_installs',
  currentStatus: 'Installed',
  installedVersion: '1.0',
  latestVersion: '1.0',
  lastUpdate: '2026-08-28T12:02:27.4895139-07:00',
  lastAttemptTime: '2026-08-28T12:02:27.4895139-07:00',
  lastAttemptStatus: 'Installed',
  lastSeenInSession: seen,
})

const modules = {
  installs: {
    lastCheckIn: '2026-08-28T12:27:12Z',
    cimian: {
      version: '2026.08.26.1320',
      sessions: [session],
      items: [
        item('ReportMate', '2026-08-28-1158'),
        item('TaskbarUtil', '2026-08-28-1158'),
        item('PowerShell', ''),
        item('Firefox', '2026-08-27-0900'),
      ],
    },
  },
}

describe('Last Run filter with Cimian session-id markers', () => {
  const result = extractInstalls(modules as any) as any
  const byName = (n: string) => result.packages.find((p: any) => p.name === n)

  it('stamps lastUpdate only on items the latest session acted on', () => {
    expect(result.packages.filter((p: any) => p.lastUpdate).map((p: any) => p.name).sort())
      .toEqual(['ReportMate', 'TaskbarUtil'])
  })

  it('resolves the session id to a real timestamp', () => {
    expect(new Date(byName('ReportMate').lastUpdate).getTime()).not.toBeNaN()
  })

  it('leaves items only status-checked this run untouched', () => {
    expect(byName('PowerShell').lastUpdate).toBe('')
  })

  it('ignores markers from an earlier session', () => {
    expect(byName('Firefox').lastUpdate).toBe('')
  })
})

describe('Munki problem installs', () => {
  const munkiDevice = (extra: any) => ({
    installs: {
      munki: {
        startTime: '2026-08-28T20:20:00.000Z',
        endTime: '2026-08-28T20:20:41.000Z',
        items: [
          { id: 'bbedit', name: 'BBEdit', displayName: 'BBEdit', type: 'munki', status: 'install_failed', endTime: '2026-08-28T20:20:41.000Z' },
        ],
        ...extra,
      },
    },
  })

  it('splits the semicolon-joined string the Mac client sends', () => {
    const r = extractInstalls(munkiDevice({
      problemInstalls: 'BBEdit; Microsoft Defender; Microsoft Word',
    }) as any) as any
    expect(r.packages.map((p: any) => p.name).sort())
      .toEqual(['BBEdit', 'Microsoft Defender', 'Microsoft Word'])
  })

  it('prefers problemInstallsArray when present', () => {
    const r = extractInstalls(munkiDevice({
      problemInstalls: 'BBEdit; Microsoft Defender',
      problemInstallsArray: ['BBEdit', 'Microsoft Defender'],
    }) as any) as any
    expect(r.packages.map((p: any) => p.name).sort()).toEqual(['BBEdit', 'Microsoft Defender'])
  })

  it('matches an existing item by display name instead of duplicating it', () => {
    const r = extractInstalls({
      installs: {
        munki: {
          startTime: '2026-08-28T20:20:00.000Z',
          endTime: '2026-08-28T20:20:41.000Z',
          items: [
            { id: 'defender', name: 'Defender', displayName: 'Microsoft Defender', type: 'munki', status: 'install_failed', endTime: '2026-08-28T20:20:41.000Z' },
          ],
          problemInstalls: 'Microsoft Defender',
        },
      },
    } as any) as any
    expect(r.packages.map((p: any) => p.name)).toEqual(['Defender'])
  })

  it('still handles a comma-joined legacy string', () => {
    const r = extractInstalls(munkiDevice({ problemInstalls: 'BBEdit, Firefox' }) as any) as any
    expect(r.packages.map((p: any) => p.name).sort()).toEqual(['BBEdit', 'Firefox'])
  })
})

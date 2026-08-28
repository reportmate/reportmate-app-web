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

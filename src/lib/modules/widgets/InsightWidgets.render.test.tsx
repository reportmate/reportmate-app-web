import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import fixture from '../../dashboard/__fixtures__/insights.json'
import partial from '../../dashboard/__fixtures__/insights-partial.json'
import appUsage from '../../dashboard/__fixtures__/app-usage.json'
import appUsageShared from '../../dashboard/__fixtures__/app-usage-shared.json'
import { linkHref, type InsightLink, type InsightsDocument, type InsightsState } from '../../dashboard/insights'
import { clearCache } from '../../data-cache'
import { AppUsageCard, CheckinGaps, InsightCards, InstallHealthHero, ManagementToolLogs, INSIGHT_CARD_COUNT, compactHours, normalizeLogMessage, type InsightContext } from './InsightWidgets'

const all = Array.from({ length: INSIGHT_CARD_COUNT }, (_, i) => i)
const doc = fixture as unknown as InsightsDocument

const ctx = (insights: Partial<InsightsState>, platformFilter = 'all'): InsightContext => ({
  platformFilter,
  insights: { data: null, loading: false, error: null, pending: new Set(), refresh: jest.fn(), ...insights },
})

/** The grid cards plus the cards with fixed places (revision 4). */
const Dashboard = ({ c, positions = all }: { c: InsightContext; positions?: number[] }) => (
  <>
    <InstallHealthHero ctx={c} />
    <ManagementToolLogs ctx={c} />
    <CheckinGaps ctx={c} />
    <InsightCards ctx={c} positions={positions} />
  </>
)

const hrefs = () => [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href'))

/** Every `link` in a value, skipping the paths given. */
function collectLinks(value: unknown, skip: (path: string[]) => boolean, path: string[] = [], out: InsightLink[] = []) {
  if (skip(path)) return out
  if (Array.isArray(value)) value.forEach((v, i) => collectLinks(v, skip, [...path, String(i)], out))
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if ((k === 'link' || k === 'warningsLink') && v && typeof v === 'object' && 'path' in (v as object)) out.push(v as InsightLink)
      else collectLinks(v, skip, [...path, k], out)
    }
  }
  return out
}

describe('InsightCards', () => {
  it('shows a skeleton per card until the first answer', () => {
    render(<Dashboard c={ctx({ loading: true })} />)
    expect(screen.getAllByTestId('insight-skeleton')).toHaveLength(12)
  })

  it('renders the revision 6 cards from the API fixture', () => {
    render(<Dashboard c={ctx({ data: doc })} />)
    for (const title of [
      'Installs', 'Uptime Overview', 'User Accounts', 'Protection Gaps', 'Management Tools Logs', 'Storage',
      'Check-in Gaps', 'Update Debt', 'Software Risk', 'Expiring Certificates', 'Directory Services', 'Connectivity Problems',
    ]) expect(screen.getByRole('heading', { name: title })).toBeTruthy()
    expect(screen.queryAllByTestId('insight-skeleton')).toHaveLength(0)
  })

  it('links every item where the server says', () => {
    render(<Dashboard c={ctx({ data: doc })} />)
    const rendered = new Set(hrefs())
    // Management Tools Logs links to /management/logs (checked below); Directory
    // Services' extra-admins chip moved to User Accounts
    const expected = collectLinks(fixture.cards, p =>
      p[0] === 'managementToolLogs' || (p[0] === 'directoryServices' && p[1] === 'extraAdmins') ||
      // the trust rows are collapsed until Domain Joined is expanded (tested below)
      (p[0] === 'directoryServices' && p[3] === 'children') ||
      (p[0] === 'userAccounts' && p[1] === 'adminAccounts' && Number(p[2]) >= 5))
    // The MDM agent's own log root is left out on purpose
    const missing = expected.map(linkHref).filter(h => !h.includes('tool=mdm') && !rendered.has(h))
    expect(missing).toEqual([])
  })

  it('shows the full Install Health fields', () => {
    render(<InstallHealthHero ctx={ctx({ data: doc })} />)
    expect(hrefs()).toEqual(expect.arrayContaining([
      '/installs?filter=errors&agent=munki',
      '/installs?filter=warnings&agent=cimian',
      '/installs?filter=pending&agent=munki',
      '/installs?stale=1&agent=cimian',
      '/installs?filter=pending',
    ]))
    expect(screen.getByText('Munki')).toBeTruthy()
    expect(screen.getByText('Cimian')).toBeTruthy()
  })

  it('shows Directory Services with the Identity report classes and no views of its own', () => {
    render(<InsightCards ctx={ctx({ data: doc }, 'macOS')} positions={[0]} />)
    expect(screen.queryByRole('radiogroup')).toBeNull()
    expect(screen.getByText('Cloud Joined')).toBeTruthy()
    // Trust rows are a disclosure under Domain Joined, collapsed by default
    expect(screen.queryByText('Broken')).toBeNull()
    const chevron = screen.getByRole('button', { name: 'Expand Domain Joined' })
    expect(chevron.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(chevron)
    expect(screen.getByRole('button', { name: 'Collapse Domain Joined' }).getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByText('Broken').closest('a')?.getAttribute('href')).toBe('/identity?directory=broken')
    expect(screen.getByText('Domain Joined').closest('a')?.getAttribute('href')).toBe('/identity?directory=domain')
    expect(screen.queryByText(/Domain Joined: /)).toBeNull()
    const swatch = (label: string) =>
      (screen.getByText(label).previousElementSibling as HTMLElement).style.backgroundColor
    expect(swatch('Cloud Joined')).toBe('rgb(16, 185, 129)')
    expect(swatch('Domain Joined')).toBe('rgb(245, 158, 11)')
    expect(swatch('Standard')).toBe('rgb(59, 130, 246)')
    expect(swatch('Unjoined')).toBe('rgb(239, 68, 68)')
    expect(hrefs()).toEqual(expect.arrayContaining([
      '/identity?directory=cloud', '/identity?directory=domain', '/identity?directory=trusted',
      '/identity?directory=unconfirmed', '/identity?directory=broken', '/identity?directory=standard',
      '/identity?directory=unjoined',
    ]))
    expect(hrefs()).not.toContain('/identity?admins=extra')
  })

  it('groups Management Tools Logs messages and leaves out the MDM agent', () => {
    render(<ManagementToolLogs ctx={ctx({ data: doc })} />)
    const rows = screen.getAllByText('Device registration failed for <guid>')
    expect(rows).toHaveLength(1)
    expect(screen.getByText(/Cimian · 9 devices · 23 lines/)).toBeTruthy()
    expect(screen.queryByText('Intune')).toBeNull()
    expect(screen.queryByText(/Enrollment check-in/)).toBeNull()
    expect(screen.getByText('Munki')).toBeTruthy()
  })

  it('strips timestamps, offsets and level tags from log messages', () => {
    expect(normalizeLogMessage('<ts> -<n>:<n> [ERR] Device registration failed for <guid>')).toBe('Device registration failed for <guid>')
    expect(normalizeLogMessage('2026-10-22T14:03:51.721+00:00 ERROR: Disk full')).toBe('Disk full')
    expect(normalizeLogMessage('[WARN] Retrying download')).toBe('Retrying download')
    expect(normalizeLogMessage('Plain message')).toBe('Plain message')
  })

  it('shows a failed card with Retry and renders the rest', () => {
    const refresh = jest.fn()
    render(<Dashboard c={ctx({ data: partial as unknown as InsightsDocument, refresh })} />)
    const retries = screen.getAllByRole('button', { name: 'Retry' })
    expect(retries).toHaveLength(2)
    expect(screen.getByText(/Timed out after 20s/)).toBeTruthy()
    fireEvent.click(retries[0])
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('heading', { name: 'Protection Gaps' })).toBeTruthy()
  })

  it('shows every card as failed with Retry when the first request fails', () => {
    render(<Dashboard c={ctx({ error: 'HTTP 503' })} />)
    expect(screen.getAllByRole('button', { name: 'Retry' })).toHaveLength(12)
  })

  it('keeps every card on its last good data when a refresh fails', () => {
    render(<Dashboard c={ctx({ data: doc, error: 'HTTP 503' })} />)
    expect(screen.queryAllByRole('button', { name: 'Retry' })).toHaveLength(0)
    expect(screen.getByRole('heading', { name: 'Storage' })).toBeTruthy()
  })

  it('shows a card still on its own request as a skeleton (per-card loading)', () => {
    const cards = { ...doc.cards } as Record<string, unknown>
    delete cards.storage
    render(<InsightCards ctx={ctx({ data: { ...doc, cards } as InsightsDocument, pending: new Set(['storage']) })} positions={[6]} />)
    expect(screen.getByTestId('insight-skeleton')).toBeTruthy()
  })
})

describe('the 10-second skeleton limit', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it('replaces a card skeleton with Still loading and Retry after 10 seconds', () => {
    const refresh = jest.fn()
    render(<InsightCards ctx={ctx({ loading: true, refresh })} positions={[0]} />)
    expect(screen.getByTestId('insight-skeleton')).toBeTruthy()
    act(() => { jest.advanceTimersByTime(9_999) })
    expect(screen.queryByTestId('insight-stalled')).toBeNull()
    act(() => { jest.advanceTimersByTime(1) })
    expect(screen.getByText('Still loading…')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('insight-skeleton')).toBeTruthy()
  })
})

describe('AppUsageCard', () => {
  const realFetch = global.fetch
  beforeEach(() => clearCache())
  afterEach(() => { global.fetch = realFetch })

  it('shows the top ten and filters in place with the Usage chips', async () => {
    global.fetch = jest.fn(async (url: string) => ({
      ok: true, status: 200,
      json: async () => (String(url).includes('usages=Shared') ? appUsageShared : appUsage),
    })) as unknown as typeof fetch
    render(<AppUsageCard platformFilter="all" />)
    await waitFor(() => expect(screen.getByText('SampleApp 0')).toBeTruthy())
    expect(screen.getByText('SampleApp 9')).toBeTruthy()
    expect(screen.getByText('1.2k h')).toBeTruthy()
    expect(screen.getByText('Devices')).toBeTruthy()
    expect(screen.getByText('40')).toBeTruthy()
    expect(screen.getByText('SampleApp 0').getAttribute('title')).toBe('SampleApp 0')
    expect(screen.queryByText('SampleApp 10')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Shared' }))
    await waitFor(() => expect(screen.queryByText('SampleApp 9')).toBeNull())
    expect((global.fetch as jest.Mock).mock.calls.at(-1)[0])
      .toBe('/api/v1/dashboard/insights/appUsage?platform=all&days=30&usages=Shared')
    expect(screen.getByRole('button', { name: 'Shared' }).getAttribute('aria-pressed')).toBe('true')
    expect(hrefs()).toContain('/applications/usage/SampleApp%200?days=30&usages=Shared')
  })

  it('shows its error with Retry when the endpoint fails', async () => {
    global.fetch = jest.fn(async () => ({ ok: false, status: 404, json: async () => ({ error: 'Card endpoint not found' }) })) as unknown as typeof fetch
    render(<AppUsageCard platformFilter="macOS" />)
    await waitFor(() => expect(screen.getByText('Not available on this server yet.')).toBeTruthy())
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy()
  })
})

describe('revision 5: Update Debt and Reboot Debt', () => {
  it('puts pending and deferred updates on Update Debt, and only uptime on Reboot Debt', () => {
    render(<InsightCards ctx={ctx({ data: doc })} positions={[5, 8]} />)
    const update = screen.getByRole('heading', { name: 'Update Debt' }).closest('.rounded-xl') as HTMLElement
    const reboot = screen.getByRole('heading', { name: 'Uptime Overview' }).closest('.rounded-xl') as HTMLElement
    const links = (el: HTMLElement) => [...el.querySelectorAll('a[href]')].map(a => a.getAttribute('href'))
    expect(links(update)).toEqual(expect.arrayContaining(['/system?pending=1-5,6-10,10%2B', '/system?deferred=1', '/system?patch=behind']))
    expect(links(reboot)).toEqual(expect.arrayContaining(['/system?uptime=30d%2B', '/system?uptime=2-4w']))
    expect(links(reboot)).not.toContain('/system?deferred=1')
  })

  it('takes pending and deferred from Reboot Debt while the API still sends them there', () => {
    const cards = JSON.parse(JSON.stringify(doc.cards))
    delete cards.updateDebt.pendingUpdates
    delete cards.updateDebt.deferredUpdates
    render(<InsightCards ctx={ctx({ data: { ...doc, cards } })} positions={[5]} />)
    expect(hrefs()).toEqual(expect.arrayContaining(['/system?pending=1-5,6-10,10%2B', '/system?deferred=1']))
  })
})

describe('compactHours', () => {
  it('keeps hours short enough for a narrow column', () => {
    expect(compactHours(950.4)).toBe('950 h')
    expect(compactHours(1200)).toBe('1.2k h')
    expect(compactHours(3000)).toBe('3k h')
    expect(compactHours(12_400)).toBe('12k h')
    expect(compactHours(328_025)).toBe('328k h')
    expect(compactHours(1_240_000)).toBe('1.2M h')
  })
})

describe('cards with bad numbers', () => {
  it('render a dash, never NaN or Infinity', () => {
    const cards = JSON.parse(JSON.stringify(doc.cards))
    cards.rebootDebt.uptime30dPlus.count = NaN
    cards.rebootDebt.uptimeBuckets[0].count = Infinity
    cards.storage.fullest[0].freePct = -3
    cards.storage.devices = 'many'
    cards.updateDebt.pctOnLatest = NaN
    cards.installHealth.withErrors.count = -1
    render(<Dashboard c={ctx({ data: { ...doc, cards } })} />)
    const text = document.body.textContent || ''
    expect(text).not.toMatch(/NaN|Infinity/)
    expect(screen.getAllByText('—').length).toBeGreaterThan(3)
  })
})

describe('revision 6', () => {
  it('shows User Accounts with the Identity report links', () => {
    render(<InsightCards ctx={ctx({ data: doc })} positions={[1]} />)
    expect(screen.getByRole('heading', { name: 'User Accounts' })).toBeTruthy()
    expect(hrefs()).toEqual(expect.arrayContaining([
      '/identity?auth=modern', '/identity?auth=legacy', '/identity?auth=standard', '/identity?admin=admin', '/identity?admin=Intune', '/identity?admins=extra',
    ]))
  })

  it('says a card the server does not have yet is not available', () => {
    const cards = { ...doc.cards, userAccounts: { error: 'Unknown card (HTTP 404)' } }
    render(<InsightCards ctx={ctx({ data: { ...doc, cards } as InsightsDocument })} positions={[1]} />)
    expect(screen.getByText('Not available on this server yet.')).toBeTruthy()
  })

  it('points Management Tools Logs at the Fleet Management Tools report', () => {
    render(<ManagementToolLogs ctx={ctx({ data: doc })} />)
    expect(hrefs()).toEqual(expect.arrayContaining([
      '/management/logs',
      '/management/logs?hours=24&tool=installs&level=error&platform=macOS',
      '/management/logs?hours=24&tool=installs&level=warning&platform=Windows',
      '/management/logs?hours=24&tool=reports&level=error',
      '/management/logs?hours=24&tool=installs&level=error&message=msg000000000',
    ]))
    expect(hrefs().some(h => h?.startsWith('/devices?tool='))).toBe(false)
  })
})

describe('Management Tools Logs links before API #163', () => {
  it('builds /management/logs links when the server still sends /devices?tool=', () => {
    const cards = JSON.parse(JSON.stringify(doc.cards))
    for (const t of cards.managementToolLogs.tools) t.link = { path: '/devices', params: { tool: t.tool, level: 'error' } }
    render(<ManagementToolLogs ctx={ctx({ data: { ...doc, cards } })} />)
    expect(hrefs()).toContain('/management/logs?tool=reports&level=error')
  })
})

describe('zero-count breakdown rows', () => {
  it('hides them in breakdowns and keeps fixed buckets', () => {
    const cards = JSON.parse(JSON.stringify(doc.cards))
    cards.userAccounts.authentication.find((a: { key: string }) => a.key === 'legacy').count = 0
    cards.directoryServices.segments[1].children[1].count = 0
    cards.rebootDebt.uptimeBuckets[0].count = 0
    render(<InsightCards ctx={ctx({ data: { ...doc, cards } })} positions={[0, 1, 8]} />)
    expect(screen.queryByText('Legacy')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Expand Domain Joined' }))
    expect(screen.queryByText('Unconfirmed')).toBeNull()
    expect(screen.getByText('Trusted')).toBeTruthy()
    expect(screen.getByText('Modern')).toBeTruthy()
    expect(screen.getByText('< 1 day')).toBeTruthy()
  })
})

import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import fixture from '../../dashboard/__fixtures__/insights.json'
import partial from '../../dashboard/__fixtures__/insights-partial.json'
import appUsage from '../../dashboard/__fixtures__/app-usage.json'
import appUsageShared from '../../dashboard/__fixtures__/app-usage-shared.json'
import { linkHref, type InsightLink, type InsightsDocument, type InsightsState } from '../../dashboard/insights'
import { clearCache } from '../../data-cache'
import { AppUsageCard, CheckinGaps, InsightCards, InstallHealthHero, ManagementToolLogs, INSIGHT_CARD_COUNT, normalizeLogMessage, type InsightContext } from './InsightWidgets'

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
    expect(screen.getAllByTestId('insight-skeleton')).toHaveLength(11)
  })

  it('renders the revision 5 cards from the API fixture', () => {
    render(<Dashboard c={ctx({ data: doc })} />)
    for (const title of [
      'Installs', 'Reboot Debt', 'Protection Gaps', 'Management Tools Logs', 'Storage',
      'Check-in Gaps', 'Update Debt', 'Software Risk', 'Expiring Certificates', 'Directory Services', 'Connectivity Problems',
    ]) expect(screen.getByRole('heading', { name: title })).toBeTruthy()
    expect(screen.queryAllByTestId('insight-skeleton')).toHaveLength(0)
  })

  it('links every item where the server says', () => {
    render(<Dashboard c={ctx({ data: doc })} />)
    const rendered = new Set(hrefs())
    // Management Tools Logs groups its messages; checked on its own below
    const expected = collectLinks(fixture.cards, p => p[0] === 'managementToolLogs' && p[1] === 'topErrors')
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
    expect(screen.getByText('Domain Joined: Broken')).toBeTruthy()
    const swatch = (label: string) =>
      (screen.getByText(label).previousElementSibling as HTMLElement).style.backgroundColor
    expect(swatch('Cloud Joined')).toBe('rgb(16, 185, 129)')
    expect(swatch('Domain Joined')).toBe('rgb(245, 158, 11)')
    expect(swatch('Standard')).toBe('rgb(59, 130, 246)')
    expect(swatch('Unjoined')).toBe('rgb(239, 68, 68)')
    expect(hrefs()).toEqual(expect.arrayContaining([
      '/identity?directory=cloud', '/identity?directory=domain', '/identity?directory=trusted',
      '/identity?directory=unconfirmed', '/identity?directory=broken', '/identity?directory=standard',
      '/identity?directory=unjoined', '/identity?admins=extra',
    ]))
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
    expect(screen.getAllByRole('button', { name: 'Retry' })).toHaveLength(11)
  })

  it('keeps every card on its last good data when a refresh fails', () => {
    render(<Dashboard c={ctx({ data: doc, error: 'HTTP 503' })} />)
    expect(screen.queryAllByRole('button', { name: 'Retry' })).toHaveLength(0)
    expect(screen.getByRole('heading', { name: 'Storage' })).toBeTruthy()
  })

  it('shows a card still on its own request as a skeleton (per-card loading)', () => {
    const cards = { ...doc.cards } as Record<string, unknown>
    delete cards.storage
    render(<InsightCards ctx={ctx({ data: { ...doc, cards } as InsightsDocument, pending: new Set(['storage']) })} positions={[5]} />)
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
    expect(screen.getByText('1,200 h')).toBeTruthy()
    expect(screen.getAllByText('40 devices').length).toBeGreaterThan(0)
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
    await waitFor(() => expect(screen.getByText(/Card endpoint not found \(HTTP 404\)/)).toBeTruthy())
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy()
  })
})

describe('revision 5: Update Debt and Reboot Debt', () => {
  it('puts pending and deferred updates on Update Debt, and only uptime on Reboot Debt', () => {
    render(<InsightCards ctx={ctx({ data: doc })} positions={[4, 7]} />)
    const update = screen.getByRole('heading', { name: 'Update Debt' }).closest('.rounded-xl') as HTMLElement
    const reboot = screen.getByRole('heading', { name: 'Reboot Debt' }).closest('.rounded-xl') as HTMLElement
    const links = (el: HTMLElement) => [...el.querySelectorAll('a[href]')].map(a => a.getAttribute('href'))
    expect(links(update)).toEqual(expect.arrayContaining(['/system?pending=1-5,6-10,10%2B', '/system?deferred=1', '/system?patch=behind']))
    expect(links(reboot)).toEqual(expect.arrayContaining(['/system?uptime=30d%2B', '/system?uptime=2-4w']))
    expect(links(reboot)).not.toContain('/system?deferred=1')
  })

  it('takes pending and deferred from Reboot Debt while the API still sends them there', () => {
    const cards = JSON.parse(JSON.stringify(doc.cards))
    delete cards.updateDebt.pendingUpdates
    delete cards.updateDebt.deferredUpdates
    render(<InsightCards ctx={ctx({ data: { ...doc, cards } })} positions={[4]} />)
    expect(hrefs()).toEqual(expect.arrayContaining(['/system?pending=1-5,6-10,10%2B', '/system?deferred=1']))
  })
})

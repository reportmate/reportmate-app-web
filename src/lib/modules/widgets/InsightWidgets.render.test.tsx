import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import fixture from '../../dashboard/__fixtures__/insights.json'
import partial from '../../dashboard/__fixtures__/insights-partial.json'
import appUsage from '../../dashboard/__fixtures__/app-usage.json'
import appUsageShared from '../../dashboard/__fixtures__/app-usage-shared.json'
import { linkHref, type InsightLink, type InsightsDocument, type InsightsState } from '../../dashboard/insights'
import { clearCache } from '../../data-cache'
import { AppUsageCard, InsightCards, InstallHealthHero, INSIGHT_CARD_COUNT, type InsightContext } from './InsightWidgets'

const all = Array.from({ length: INSIGHT_CARD_COUNT }, (_, i) => i)
const doc = fixture as unknown as InsightsDocument

const ctx = (insights: Partial<InsightsState>, platformFilter = 'all'): InsightContext => ({
  platformFilter,
  insights: { data: null, loading: false, error: null, pending: new Set(), refresh: jest.fn(), ...insights },
})

/** The grid cards plus Install Health, which has a fixed place in column 1. */
const Dashboard = ({ c, positions = all }: { c: InsightContext; positions?: number[] }) => (
  <>
    <InstallHealthHero ctx={c} />
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

  it('renders the revision 3 cards from the API fixture', () => {
    render(<Dashboard c={ctx({ data: doc })} />)
    for (const title of [
      'Install Health', 'Reboot & Update Debt', 'Protection Gaps', 'Management Tools Errors', 'Storage',
      'Check-in Gaps', 'OS Currency', 'Software Risk', 'Expiring Certificates', 'Directory Join', 'Connectivity Problems',
    ]) expect(screen.getByRole('heading', { name: title })).toBeTruthy()
    expect(screen.queryAllByTestId('insight-skeleton')).toHaveLength(0)
  })

  it('links every item where the server says', () => {
    render(<Dashboard c={ctx({ data: doc })} />)
    const rendered = new Set(hrefs())
    // Directory Join shows one view at a time; the others are checked below
    const expected = collectLinks(fixture.cards, p => p[0] === 'directoryJoin' && p[2] !== undefined && p[2] !== 'all')
    const missing = expected.map(linkHref).filter(h => !rendered.has(h))
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

  it('switches Directory Join between All, Windows and Mac', () => {
    render(<InsightCards ctx={ctx({ data: doc })} positions={[8]} />)
    expect(hrefs()).toContain('/identity?join=entra')
    fireEvent.click(screen.getByRole('radio', { name: 'Mac' }))
    expect(hrefs()).toEqual(expect.arrayContaining(['/identity?directory=psso&platform=macOS', '/identity?admins=extra&platform=macOS']))
    fireEvent.click(screen.getByRole('radio', { name: 'Windows' }))
    expect(hrefs()).toContain('/identity?join=hybrid&platform=Windows')
  })

  it('follows the toolbar platform toggle in Directory Join', () => {
    render(<InsightCards ctx={ctx({ data: doc }, 'macOS')} positions={[8]} />)
    expect(screen.queryByRole('radiogroup')).toBeNull()
    expect(hrefs()).toContain('/identity?directory=unbound&platform=macOS')
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
    render(<InsightCards ctx={ctx({ data: { ...doc, cards } as InsightsDocument, pending: new Set(['storage']) })} positions={[3]} />)
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

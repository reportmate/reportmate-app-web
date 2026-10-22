import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import fixture from '../../dashboard/__fixtures__/insights.json'
import partial from '../../dashboard/__fixtures__/insights-partial.json'
import type { InsightsDocument, InsightsState } from '../../dashboard/insights'
import { AppUsageCard, InsightCards, InstallHealthHero, INSIGHT_CARD_COUNT, type InsightContext } from './InsightWidgets'

const all = Array.from({ length: INSIGHT_CARD_COUNT }, (_, i) => i)

const ctx = (insights: Partial<InsightsState>, platformFilter = 'all'): InsightContext => ({
  platformFilter,
  insights: { data: null, loading: false, error: null, pending: new Set(), refresh: jest.fn(), ...insights },
})

/** The grid cards plus the two with fixed places (column 1 and the events column). */
const Dashboard = ({ c, positions = all }: { c: InsightContext; positions?: number[] }) => (
  <>
    <InstallHealthHero ctx={c} />
    <AppUsageCard ctx={c} />
    <InsightCards ctx={c} positions={positions} />
  </>
)

const hrefs = () => [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href'))

describe('InsightCards', () => {
  it('shows a skeleton per card until the first answer', () => {
    render(<Dashboard c={ctx({ loading: true })} />)
    expect(screen.getAllByTestId('insight-skeleton')).toHaveLength(12)
  })

  it('renders all twelve cards from the fixture', () => {
    render(<Dashboard c={ctx({ data: fixture as unknown as InsightsDocument })} />)
    for (const title of [
      'Reboot & Update Debt', 'Protection Gaps', 'Unmanaged Devices', 'Hardware at Risk',
      'Install Health', 'Check-in Gaps', 'OS Currency', 'Software Risk',
      'Expiring Certificates', 'Local Admin Exposure', 'App Usage', 'Connectivity Problems',
    ]) expect(screen.getByRole('heading', { name: title })).toBeTruthy()
    expect(screen.queryAllByTestId('insight-skeleton')).toHaveLength(0)
  })

  it('links items where the server says', () => {
    render(<Dashboard c={ctx({ data: fixture as unknown as InsightsDocument })} />)
    const links = hrefs()
    expect(links).toEqual(expect.arrayContaining([
      '/system?uptime=30d%2B',
      '/security?firewall=off',
      '/management?enrolled=0',
      '/hardware?arch=Intel',
      '/installs?item=SampleAppA&filter=errors',
      '/events/failures?hours=24&reason=invalid_passphrase',
      '/system?patch=behind',
      '/security?certSearch=Sample+Root+CA&certStatus=expiring',
      '/identity?admins=extra',
      '/device/SAMPLE3',
      '/applications/usage/SampleApp%20Two?days=30',
      '/network?signal=weak',
    ]))
  })

  it('fills the two connectivity links the API leaves unfiltered', () => {
    render(<InsightCards ctx={ctx({ data: fixture as unknown as InsightsDocument })} positions={[9]} />)
    expect(hrefs()).toEqual(expect.arrayContaining(['/network?quality=poor', '/network?vpn=1']))
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

  it('labels fleet-wide numbers when a platform is picked', () => {
    render(<Dashboard c={ctx({ data: fixture as unknown as InsightsDocument }, 'macOS')} positions={[4]} />)
    expect(screen.getByText(/Last 24 hours · All platforms/)).toBeTruthy()
    expect(screen.getByText(/Most used apps .* · All platforms$/)).toBeTruthy()
  })
})

describe('a failed background refresh', () => {
  it('keeps every card showing the last good data', () => {
    render(<Dashboard c={ctx({ data: fixture as unknown as InsightsDocument, error: 'HTTP 503' })} />)
    expect(screen.queryAllByRole('button', { name: 'Retry' })).toHaveLength(0)
    expect(screen.queryAllByTestId('insight-skeleton')).toHaveLength(0)
    expect(screen.getByRole('heading', { name: 'Protection Gaps' })).toBeTruthy()
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

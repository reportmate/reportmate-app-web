import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import fixture from '../../dashboard/__fixtures__/insights.json'
import partial from '../../dashboard/__fixtures__/insights-partial.json'
import type { InsightsDocument, InsightsState } from '../../dashboard/insights'
import { InsightCards, INSIGHT_CARD_COUNT, type InsightContext } from './InsightWidgets'

const all = Array.from({ length: INSIGHT_CARD_COUNT }, (_, i) => i)

const ctx = (insights: Partial<InsightsState>, platformFilter = 'all'): InsightContext => ({
  platformFilter,
  insights: { data: null, loading: false, error: null, refresh: jest.fn(), ...insights },
})

const hrefs = () => [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href'))

describe('InsightCards', () => {
  it('shows a skeleton per card until the first answer', () => {
    render(<InsightCards ctx={ctx({ loading: true })} positions={all} />)
    expect(screen.getAllByTestId('insight-skeleton')).toHaveLength(12)
  })

  it('renders the twelve revision 2 cards from the fixture', () => {
    render(<InsightCards ctx={ctx({ data: fixture as unknown as InsightsDocument })} positions={all} />)
    for (const title of [
      'Reboot & Update Debt', 'Protection Gaps', 'Unmanaged Devices', 'Hardware at Risk',
      'Install Health', 'Check-in Gaps', 'OS Currency', 'Software Risk',
      'Expiring Certificates', 'Local Admin Exposure', 'Unused Software', 'Connectivity Problems',
    ]) expect(screen.getByRole('heading', { name: title })).toBeTruthy()
    expect(screen.queryAllByTestId('insight-skeleton')).toHaveLength(0)
  })

  it('links items where the server says', () => {
    render(<InsightCards ctx={ctx({ data: fixture as unknown as InsightsDocument })} positions={all} />)
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
    render(<InsightCards ctx={ctx({ data: fixture as unknown as InsightsDocument })} positions={[11]} />)
    expect(hrefs()).toEqual(expect.arrayContaining(['/network?quality=poor', '/network?vpn=1']))
  })

  it('shows a failed card with Retry and renders the rest', () => {
    const refresh = jest.fn()
    render(<InsightCards ctx={ctx({ data: partial as unknown as InsightsDocument, refresh })} positions={all} />)
    const retries = screen.getAllByRole('button', { name: 'Retry' })
    expect(retries).toHaveLength(2)
    expect(screen.getByText(/Timed out after 20s/)).toBeTruthy()
    fireEvent.click(retries[0])
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('heading', { name: 'Protection Gaps' })).toBeTruthy()
  })

  it('shows every card as failed with Retry when the first request fails', () => {
    render(<InsightCards ctx={ctx({ error: 'HTTP 503' })} positions={all} />)
    expect(screen.getAllByRole('button', { name: 'Retry' })).toHaveLength(12)
  })

  it('labels fleet-wide numbers when a platform is picked', () => {
    render(<InsightCards ctx={ctx({ data: fixture as unknown as InsightsDocument }, 'macOS')} positions={[5, 10]} />)
    expect(screen.getByText(/Last 24 hours · All platforms/)).toBeTruthy()
    expect(screen.getByText(/rarely opened .* · All platforms$/)).toBeTruthy()
  })
})

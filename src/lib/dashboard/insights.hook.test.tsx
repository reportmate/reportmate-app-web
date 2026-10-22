import { act, renderHook, waitFor } from '@testing-library/react'
import fixture from './__fixtures__/insights.json'
import { INSIGHT_CARD_KEYS, unwrapCard, useDashboardInsights } from './insights'
import { clearCache } from '../data-cache'

const json = (status: number, body: unknown) =>
  ({ ok: status < 400, status, json: async () => body }) as unknown as Response

describe('useDashboardInsights', () => {
  const realFetch = global.fetch
  beforeEach(() => clearCache())
  afterEach(() => { global.fetch = realFetch })

  it('shows a 404 at once, with the reason the server gave', async () => {
    global.fetch = jest.fn(async () => json(404, { error: 'Dashboard insights endpoint not found' })) as unknown as typeof fetch
    const { result } = renderHook(() => useDashboardInsights('all', { perCard: false }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toBeNull()
    expect(result.current.error).toBe('Dashboard insights endpoint not found (HTTP 404)')
  })

  it('loads every card on its own in per-card mode and keeps a failed one as an error', async () => {
    const cards = fixture.cards as Record<string, unknown>
    global.fetch = jest.fn(async (url: string) => {
      const key = decodeURIComponent(String(url).split('/insights/')[1].split('?')[0])
      if (key === 'storage') return json(503, { error: 'Card not available' })
      // The API's envelope; one card answers bare to check that is accepted too
      if (key === 'osCurrency') return json(200, cards[key])
      return json(200, { card: key, platform: 'macOS', includeArchived: false, generatedAt: 'x', data: cards[key] })
    }) as unknown as typeof fetch
    const { result } = renderHook(() => useDashboardInsights('macOS', { perCard: true }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(global.fetch).toHaveBeenCalledTimes(INSIGHT_CARD_KEYS.length)
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe('/api/v1/dashboard/insights/installHealth?platform=macOS')
    const got = result.current.data!.cards as Record<string, unknown>
    expect(got.rebootDebt).toEqual(cards.rebootDebt)
    expect(got.osCurrency).toEqual(cards.osCurrency)
    expect(got.storage).toEqual({ error: 'Card not available (HTTP 503)' })
    expect(result.current.pending.size).toBe(0)
  })

  it('shows the cached cards at once on return', async () => {
    global.fetch = jest.fn(async () => json(200, fixture)) as unknown as typeof fetch
    const first = renderHook(() => useDashboardInsights('all', { perCard: false }))
    await waitFor(() => expect(first.result.current.data).not.toBeNull())
    first.unmount()
    global.fetch = jest.fn(() => new Promise<Response>(() => {})) as unknown as typeof fetch
    const second = renderHook(() => useDashboardInsights('all', { perCard: false }))
    expect(second.result.current.data?.cards.rebootDebt).toEqual(fixture.cards.rebootDebt)
    act(() => second.unmount())
  })
})

describe('unwrapCard', () => {
  it('accepts the section bare or wrapped', () => {
    expect(unwrapCard('x', { a: 1 })).toEqual({ a: 1 })
    expect(unwrapCard('x', { card: 'x', platform: 'all', includeArchived: false, generatedAt: 't', data: { a: 1 } })).toEqual({ a: 1 })
    expect(unwrapCard('x', { card: 'x', data: { error: 'Timed out' } })).toEqual({ error: 'Timed out' })
    expect(unwrapCard('x', { cards: { x: { a: 1 } } })).toEqual({ a: 1 })
    expect(unwrapCard('x', { error: 'nope' })).toEqual({ error: 'nope' })
  })
})

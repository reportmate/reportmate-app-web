import { act, renderHook, waitFor } from '@testing-library/react'
import fixture from './__fixtures__/insights.json'
import legacy from './__fixtures__/insights-legacy.json'
import { INSIGHT_CARD_KEYS, cardFromDocument, unwrapCard, useDashboardInsights, type InsightsDocument } from './insights'
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

describe('old card names', () => {
  const realFetch = global.fetch
  beforeEach(() => clearCache())
  afterEach(() => { global.fetch = realFetch })

  it('reads directoryJoin and managementToolErrors from a combined document', () => {
    const doc = legacy as unknown as InsightsDocument
    const dir = cardFromDocument(doc, 'directoryServices', 'macOS') as { segments: { key: string }[] }
    expect(dir.segments.map(s => s.key)).toEqual(['psso', 'bound', 'unbound'])
    expect(cardFromDocument(doc, 'managementToolLogs', 'all')).toEqual(legacy.cards.managementToolErrors)
  })

  it('falls back to the old per-card endpoint when the new one is a 404', async () => {
    const old = legacy.cards as Record<string, unknown>
    global.fetch = jest.fn(async (url: string) => {
      const key = decodeURIComponent(String(url).split('/insights/')[1].split('?')[0])
      if (key === 'managementToolLogs' || key === 'directoryServices') return json(404, { error: 'Unknown card' })
      const body = old[key]
      return body ? json(200, { card: key, data: body }) : json(404, { error: 'Unknown card' })
    }) as unknown as typeof fetch
    const { result } = renderHook(() => useDashboardInsights('all', { perCard: true }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    const urls = (global.fetch as jest.Mock).mock.calls.map(c => c[0] as string)
    expect(urls).toEqual(expect.arrayContaining([
      '/api/v1/dashboard/insights/managementToolLogs?platform=all',
      '/api/v1/dashboard/insights/managementToolErrors?platform=all',
      '/api/v1/dashboard/insights/directoryJoin?platform=all',
    ]))
    const cards = result.current.data!.cards as Record<string, any>
    expect(cards.managementToolLogs.tools.length).toBeGreaterThan(0)
    expect(cards.directoryServices.segments.map((s: { key: string }) => s.key)).toEqual(['entra', 'domain', 'hybrid', 'workgroup'])
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

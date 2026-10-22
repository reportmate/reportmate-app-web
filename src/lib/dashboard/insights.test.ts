import fixture from './__fixtures__/insights.json'
import { isCardError, linkHref, withDefaultParams, type InsightLink } from './insights'
import { adminsFromParam, isPoorNetworkQuality, lastSeenBucket, lastSeenFromParam, matchesAdmins } from './reportRules'

/** Every `link` object anywhere in a document. */
function collectLinks(value: unknown, out: InsightLink[] = []): InsightLink[] {
  if (Array.isArray(value)) value.forEach(v => collectLinks(v, out))
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (k === 'link') out.push(v as InsightLink)
      else collectLinks(v, out)
    }
  }
  return out
}

describe('linkHref', () => {
  it('joins path and params with literal commas', () => {
    expect(linkHref({ path: '/system', params: { pending: '1-5,6-10,10+' } }))
      .toBe('/system?pending=1-5,6-10,10%2B')
  })
  it('encodes names and omits an empty query', () => {
    expect(linkHref({ path: '/installs', params: { item: 'Sample App', filter: 'errors' } }))
      .toBe('/installs?item=Sample+App&filter=errors')
    expect(linkHref({ path: '/management', params: {} })).toBe('/management')
  })
  it('falls back to the dashboard for a missing link', () => {
    expect(linkHref(undefined)).toBe('/dashboard')
  })
})

describe('withDefaultParams', () => {
  it('fills an unfiltered link and keeps a filtered one', () => {
    expect(withDefaultParams({ path: '/network', params: {} }, '/network', { vpn: '1' }))
      .toEqual({ path: '/network', params: { vpn: '1' } })
    const filtered = { path: '/network', params: { vpn: 'yes' } }
    expect(withDefaultParams(filtered, '/network', { vpn: '1' })).toBe(filtered)
  })
})

describe('the API fixture', () => {
  it('has the twelve API cards', () => {
    expect(Object.keys(fixture.cards)).toHaveLength(12)
    expect(Object.values(fixture.cards).some(isCardError)).toBe(false)
  })
  it('links only to reports that read their parameters', () => {
    const reports = /^\/(system|security|management|management\/logs|hardware|installs|events\/failures|devices|identity|network|device\/[^/]+|applications\/usage\/[^/]+)$/
    for (const link of collectLinks(fixture.cards)) {
      expect(link.path).toMatch(reports)
      for (const v of Object.values(link.params)) expect(typeof v).toBe('string')
    }
  })
})

describe('isPoorNetworkQuality', () => {
  const row = (networkQuality: unknown) => ({ raw: { networkQuality } })
  it('reads the overall rating first', () => {
    expect(isPoorNetworkQuality(row({ rating: 'Low', dlRating: 'High' }))).toBe(true)
    expect(isPoorNetworkQuality(row({ rating: 'High', dlRating: 'Low' }))).toBe(false)
  })
  it('falls back to the download and upload ratings', () => {
    expect(isPoorNetworkQuality(row({ ulRating: 'low' }))).toBe(true)
    expect(isPoorNetworkQuality(row({}))).toBe(false)
    expect(isPoorNetworkQuality({})).toBe(false)
  })
})

describe('lastSeenBucket (/management?lastSeen=)', () => {
  const now = Date.parse('2026-10-22T12:00:00Z')
  const ago = (h: number) => new Date(now - h * 3600000).toISOString()
  it('buckets by age the way the API card does', () => {
    expect(lastSeenBucket(ago(2), now)).toBe('24h')
    expect(lastSeenBucket(ago(24), now)).toBe('1-7d')
    expect(lastSeenBucket(ago(167), now)).toBe('1-7d')
    expect(lastSeenBucket(ago(168), now)).toBe('7d+')
    expect(lastSeenBucket(null, now)).toBe('7d+')
  })
  it('reads only the three parameter values', () => {
    expect(lastSeenFromParam('24h')).toBe('24h')
    expect(lastSeenFromParam('1-7d')).toBe('1-7d')
    expect(lastSeenFromParam('7d+')).toBe('7d+')
    expect(lastSeenFromParam('7d')).toBeNull()
  })
})

describe('matchesAdmins (/identity?admins=)', () => {
  const row = (adminUsers: number) => ({ adminUsers })
  it('keeps admins=extra as more than one', () => {
    expect(matchesAdmins(row(1), 'extra')).toBe(false)
    expect(matchesAdmins(row(2), 'extra')).toBe(true)
  })
  it('matches exact counts, with 4+ meaning four or more', () => {
    expect(matchesAdmins(row(2), '2')).toBe(true)
    expect(matchesAdmins(row(3), '2')).toBe(false)
    expect(matchesAdmins(row(3), '3')).toBe(true)
    expect(matchesAdmins(row(4), '4+')).toBe(true)
    expect(matchesAdmins(row(9), '4+')).toBe(true)
    expect(matchesAdmins(row(3), '4+')).toBe(false)
    expect(matchesAdmins({ summary: { adminUsers: 2 } }, '2')).toBe(true)
  })
  it('reads only known values', () => {
    expect(adminsFromParam('4+')).toBe('4+')
    expect(adminsFromParam('extra')).toBe('extra')
    expect(adminsFromParam('5')).toBeNull()
  })
})

describe('the API fixture links', () => {
  it('uses only admins values the identity report reads', () => {
    for (const link of collectLinks(fixture.cards)) {
      const admins = (link.params as Record<string, string>).admins
      if (admins !== undefined) expect(adminsFromParam(admins)).not.toBeNull()
    }
  })
})

describe('normalizeCard (directoryServices)', () => {
  it('reads the API count named total as devices and keeps the trust children', () => {
    const { normalizeCard } = require('./insights') as typeof import('./insights')
    const card = normalizeCard('directoryServices', {
      total: 916,
      segments: [{ key: 'domain', label: 'Domain Joined', count: 54, link: { path: '/identity', params: { directory: 'domain' } },
        children: [{ key: 'broken', label: 'Broken', count: 4, link: { path: '/identity', params: { directory: 'broken', platform: 'Windows' } } }] }],
    }, 'Windows')
    expect(card.devices).toBe(916)
    expect(card.segments[0].children[0].link.params).toEqual({ directory: 'broken', platform: 'Windows' })
  })
})

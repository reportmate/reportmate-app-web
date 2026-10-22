import fixture from './__fixtures__/insights.json'
import { isCardError, linkHref, withDefaultParams, type InsightLink } from './insights'
import { isPoorNetworkQuality } from './reportRules'

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
  it('has all twelve cards', () => {
    expect(Object.keys(fixture.cards)).toHaveLength(12)
    expect(Object.values(fixture.cards).some(isCardError)).toBe(false)
  })
  it('links only to reports that read their parameters', () => {
    const reports = /^\/(system|security|management|hardware|installs|events\/failures|devices|identity|network|device\/[^/]+|applications\/usage\/[^/]+)$/
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

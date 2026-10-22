import { cveHref, safeHost, safeHttpUrl, safeInternalPath } from './safeUrl'
import { securityInfoUrl, unpatchedCves } from './macSecurityKeys'
import { linkHref } from '../dashboard/insights'

/** Values with a non-web URL scheme, which no link may follow. */
const NON_WEB = ['javascript:x', 'JavaScript:x', ' javascript:x', 'data:text/plain,x', 'file:///tmp/x', 'vbscript:x']

describe('safeHttpUrl', () => {
  it('keeps http and https URLs', () => {
    expect(safeHttpUrl('https://support.apple.com/en-us/100100')).toBe('https://support.apple.com/en-us/100100')
    expect(safeHttpUrl(' http://example.com/a ')).toBe('http://example.com/a')
  })
  it('drops other schemes and anything unparseable', () => {
    for (const v of NON_WEB) expect(safeHttpUrl(v)).toBe('')
    expect(safeHttpUrl('/relative/path')).toBe('')
    expect(safeHttpUrl(undefined)).toBe('')
    expect(safeHttpUrl({ href: 'https://x' })).toBe('')
  })
})

describe('cveHref', () => {
  it('builds the link from a well-formed CVE ID, ignoring the reported URL', () => {
    expect(cveHref('CVE-2026-12345', 'javascript:x')).toBe('https://nvd.nist.gov/vuln/detail/CVE-2026-12345')
    expect(cveHref('CVE-2026-1234', undefined, 'windows')).toBe('https://msrc.microsoft.com/update-guide/vulnerability/CVE-2026-1234')
  })
  it('falls back to the reported URL only when it is http(s)', () => {
    expect(cveHref('APPLE-SA-1', 'https://support.apple.com/x')).toBe('https://support.apple.com/x')
    for (const v of NON_WEB) expect(cveHref('APPLE-SA-1', v)).toBe('')
  })
})

describe('device-reported Mac security links', () => {
  it('only pass http(s) URLs through', () => {
    const security = {
      sofaSecurityReleaseInfo: { security_info: 'javascript:x' },
      sofaUnpatchedCves: [{ cve: 'NOT-A-CVE', url: 'data:text/plain,x' }, { cve: 'CVE-2026-0001', url: 'javascript:x' }],
    }
    expect(securityInfoUrl(security)).toBe('')
    const [bad, good] = unpatchedCves(security)
    expect(bad.url).toBe('')
    expect(good.url).toBe('https://nvd.nist.gov/vuln/detail/CVE-2026-0001')
    expect(securityInfoUrl({ securityReleaseInfo: { securityInfo: 'https://support.apple.com/100100' } }))
      .toBe('https://support.apple.com/100100')
  })
})

describe('safeInternalPath (from=)', () => {
  it('follows only paths on this site', () => {
    expect(safeInternalPath('/applications?type=usage&apps=A', '/x')).toBe('/applications?type=usage&apps=A')
    expect(safeInternalPath('https://other.example/', '/x')).toBe('/x')
    expect(safeInternalPath('//other.example/', '/x')).toBe('/x')
    expect(safeInternalPath('/\\other.example/', '/x')).toBe('/x')
    expect(safeInternalPath('mailto:someone@example.com', '/x')).toBe('/x')
    expect(safeInternalPath('', '/x')).toBe('/x')
    expect(safeInternalPath(null, '/x')).toBe('/x')
  })
  it('rejects any value with a URL scheme', () => {
    for (const v of NON_WEB) expect(safeInternalPath(v, '/x')).toBe('/x')
  })
})

describe('safeHost (ssh:// and vnc:// links)', () => {
  it('accepts IP addresses and host names only', () => {
    expect(safeHost('10.16.2.139')).toBe('10.16.2.139')
    expect(safeHost('fe80::1')).toBe('fe80::1')
    expect(safeHost('[fe80::1]')).toBe('[fe80::1]')
    expect(safeHost('mac-sample.local')).toBe('mac-sample.local')
    expect(safeHost('host.example/path')).toBe('')
    expect(safeHost('user@host')).toBe('')
    expect(safeHost('')).toBe('')
  })
})

describe('linkHref', () => {
  it('only follows in-app paths from the API', () => {
    for (const v of NON_WEB) expect(linkHref({ path: v, params: {} })).toBe('/dashboard')
    expect(linkHref({ path: '//other.example', params: {} })).toBe('/dashboard')
    expect(linkHref({ path: '/security', params: { cve: 'critical' } })).toBe('/security?cve=critical')
  })
})

import { safeHost, safeInternalPath } from './safeUrl'

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
    for (const scheme of ['javascript', 'data', 'file', 'vbscript']) {
      expect(safeInternalPath(`${scheme}:x`, '/x')).toBe('/x')
    }
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

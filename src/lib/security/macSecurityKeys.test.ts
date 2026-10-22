import { firewallAllowSigned, firewallStealthMode, securityReleaseInfo, unpatchedCves } from './macSecurityKeys'

describe('Mac security keys, both spellings', () => {
  it('reads the release info under either name', () => {
    expect(securityReleaseInfo({ securityReleaseInfo: { os_version: '26.4' } })).toEqual({ os_version: '26.4' })
    expect(securityReleaseInfo({ sofaSecurityReleaseInfo: { os_version: '26.4' } })).toEqual({ os_version: '26.4' })
    expect(securityReleaseInfo({})).toEqual({})
  })

  it('reads unpatched CVEs under either name, as objects or bare IDs', () => {
    const objects = [{ cve: 'CVE-2026-0001', actively_exploited: 'true', patched_version: '26.4.1' }]
    expect(unpatchedCves({ sofaUnpatchedCves: objects })[0]).toMatchObject({
      cve: 'CVE-2026-0001', activelyExploited: true, patchedVersion: '26.4.1',
    })
    const bare = unpatchedCves({ unpatchedCVEs: ['CVE-2026-0002', ' ', 'CVE-2026-0003'], securityReleaseInfo: { os_version: '26.4' } })
    expect(bare.map(c => c.cve)).toEqual(['CVE-2026-0002', 'CVE-2026-0003'])
    expect(bare[0]).toMatchObject({ osVersion: '26.4', activelyExploited: false })
    expect(unpatchedCves({})).toEqual([])
  })

  it('reads stealth mode and allow-signed under either name', () => {
    expect(firewallStealthMode({ firewall: { stealthModeEnabled: true } })).toBe(true)
    expect(firewallStealthMode({ firewall: { stealthMode: 1 } })).toBe(true)
    expect(firewallStealthMode({ firewall: { stealthModeEnabled: false } })).toBe(false)
    expect(firewallStealthMode({})).toBe(false)
    expect(firewallAllowSigned({ firewall: { allowSignedEnabled: 'true' } })).toBe(true)
    expect(firewallAllowSigned({ firewall: { allowSignedSoftware: true } })).toBe(true)
    expect(firewallAllowSigned({ firewall: { allowSignedSoftware: 0 } })).toBe(false)
  })
})

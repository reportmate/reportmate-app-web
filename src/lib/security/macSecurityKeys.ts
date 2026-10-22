/**
 * The Mac client spells four security keys differently from what the apps
 * first read. Each reader here accepts both spellings (and the snake_case
 * forms), so the Security tab works with either payload.
 *
 * - `securityReleaseInfo` or `sofaSecurityReleaseInfo`
 * - `unpatchedCVEs` or `sofaUnpatchedCves`; entries may be bare CVE IDs
 * - `firewall.stealthModeEnabled` or `firewall.stealthMode`
 * - `firewall.allowSignedEnabled` or `firewall.allowSignedSoftware`
 */

import { cveHref, safeHttpUrl } from './safeUrl'

type Obj = Record<string, any>

const first = (o: Obj | null | undefined, keys: string[]): any => {
  if (!o || typeof o !== 'object') return undefined
  for (const k of keys) if (o[k] !== undefined && o[k] !== null) return o[k]
  return undefined
}

/** True for `true`, `1` and the strings "true", "1", "yes", "on", "enabled". */
export const truthy = (v: any): boolean =>
  v === true ||
  v === 1 ||
  (typeof v === 'string' && ['true', '1', 'yes', 'on', 'enabled'].includes(v.trim().toLowerCase()))

export function securityReleaseInfo(security: Obj | null | undefined): Obj {
  const v = first(security, [
    'securityReleaseInfo',
    'sofaSecurityReleaseInfo',
    'security_release_info',
    'sofa_security_release_info',
  ])
  return v && typeof v === 'object' ? v : {}
}

/** One unpatched CVE, from an object entry or a bare `CVE-…` string. */
export interface MacCve {
  cve: string
  osVersion: string
  patchedVersion: string
  activelyExploited: boolean
  url: string
}

export function unpatchedCves(security: Obj | null | undefined): MacCve[] {
  const list = first(security, ['unpatchedCVEs', 'sofaUnpatchedCves', 'unpatched_cves', 'sofa_unpatched_cves'])
  if (!Array.isArray(list)) return []
  const release = securityReleaseInfo(security)
  const releaseOs = String(release.os_version ?? release.osVersion ?? '')
  return list
    .map((entry: any): MacCve | null => {
      if (typeof entry === 'string') {
        const id = entry.trim()
        return id ? { cve: id, osVersion: releaseOs, patchedVersion: '', activelyExploited: false, url: cveHref(id) } : null
      }
      if (!entry || typeof entry !== 'object') return null
      return {
        cve: String(entry.cve ?? entry.cve_id ?? entry.cveId ?? entry.id ?? 'Unknown'),
        osVersion: String(entry.os_version ?? entry.osVersion ?? releaseOs),
        patchedVersion: String(entry.patched_version ?? entry.patchedVersion ?? ''),
        activelyExploited: truthy(entry.actively_exploited ?? entry.activelyExploited),
        // Device-reported: only an http(s) URL survives, and a CVE ID builds its own link
        url: cveHref(entry.cve ?? entry.cve_id ?? entry.cveId ?? entry.id, entry.url),
      }
    })
    .filter((c): c is MacCve => c !== null)
}

export const firewallStealthMode = (security: Obj | null | undefined): boolean =>
  truthy(first(security?.firewall, ['stealthModeEnabled', 'stealthMode', 'stealth_mode_enabled', 'stealth_mode']))

export const firewallAllowSigned = (security: Obj | null | undefined): boolean =>
  truthy(first(security?.firewall, ['allowSignedEnabled', 'allowSignedSoftware', 'allow_signed_enabled', 'allow_signed_software']))

/** The release's security notes link, only when it is an http(s) URL. */
export function securityInfoUrl(security: Obj | null | undefined): string {
  const info = securityReleaseInfo(security)
  return safeHttpUrl(info.security_info ?? info.securityInfo)
}

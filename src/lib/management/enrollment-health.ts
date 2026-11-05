/**
 * Enrollment health on the Device Management Service table: compliance, last
 * MDM sync, MDM certificate expiry and the macOS Apple MDM flags. The API
 * sends null for anything the device did not collect; null always reads as
 * unknown, never as healthy, and an unknown value never matches a problem filter.
 */

export type ComplianceState = "compliant" | "non_compliant" | null

export interface EnrollmentHealth {
  complianceState?: ComplianceState
  complianceSource?: "reported" | "policies" | null
  lastMdmSync?: string | null
  mdmCertificateExpires?: string | null
  userApprovedMdm?: boolean | null
  installedFromDep?: boolean | null
  depCapable?: boolean | null
  platform?: string
}

export interface EnrollmentHealthFilters {
  /** `compliance=non_compliant` */
  nonCompliant: boolean
  /** `syncOlderThan=<days>`: last MDM sync older than this many days */
  syncOlderThanDays: number | null
  /** `certExpiring=<days>`: MDM certificate expires within this many days (expired included) */
  certExpiringDays: number | null
}

export const ENROLLMENT_HEALTH_PARAMS = ["compliance", "syncOlderThan", "certExpiring"] as const
export const SYNC_AGE_CHOICES = [1, 7, 30] as const
export const CERT_EXPIRY_DAYS = 30
const DAY = 86_400_000

function positiveInt(value: string | null): number | null {
  if (!value || !/^\d+$/.test(value)) return null
  const n = Number(value)
  return n > 0 && n <= 3650 ? n : null
}

export function parseEnrollmentHealth(params: URLSearchParams): EnrollmentHealthFilters {
  return {
    nonCompliant: params.get("compliance") === "non_compliant",
    syncOlderThanDays: positiveInt(params.get("syncOlderThan")),
    certExpiringDays: positiveInt(params.get("certExpiring")),
  }
}

export function writeEnrollmentHealth(params: URLSearchParams, filters: EnrollmentHealthFilters): void {
  for (const key of ENROLLMENT_HEALTH_PARAMS) params.delete(key)
  if (filters.nonCompliant) params.set("compliance", "non_compliant")
  if (filters.syncOlderThanDays) params.set("syncOlderThan", String(filters.syncOlderThanDays))
  if (filters.certExpiringDays) params.set("certExpiring", String(filters.certExpiringDays))
}

function time(value: string | null | undefined): number | null {
  if (!value) return null
  const t = Date.parse(value)
  return Number.isFinite(t) ? t : null
}

/** Whole days since the last MDM sync; null when unknown or in the future. */
export function syncAgeDays(value: string | null | undefined, now: number): number | null {
  const t = time(value)
  if (t === null || t > now) return null
  return (now - t) / DAY
}

/** Days until the MDM certificate expires (negative once expired); null when unknown. */
export function certDaysLeft(value: string | null | undefined, now: number): number | null {
  const t = time(value)
  return t === null ? null : (t - now) / DAY
}

export function matchesEnrollmentHealth(device: EnrollmentHealth, filters: EnrollmentHealthFilters, now: number): boolean {
  if (filters.nonCompliant && device.complianceState !== "non_compliant") return false
  if (filters.syncOlderThanDays) {
    const age = syncAgeDays(device.lastMdmSync, now)
    if (age === null || age <= filters.syncOlderThanDays) return false
  }
  if (filters.certExpiringDays) {
    const left = certDaysLeft(device.mdmCertificateExpires, now)
    if (left === null || left > filters.certExpiringDays) return false
  }
  return true
}

export function activeEnrollmentHealthCount(filters: EnrollmentHealthFilters): number {
  return (filters.nonCompliant ? 1 : 0) + (filters.syncOlderThanDays ? 1 : 0) + (filters.certExpiringDays ? 1 : 0)
}

export function complianceLabel(state: ComplianceState | undefined): string {
  return state === "compliant" ? "Compliant" : state === "non_compliant" ? "Not compliant" : "Unknown"
}

const isMac = (platform?: string) => /mac|darwin/i.test(platform || "")

/** Apple MDM flags apply to macOS only; Windows reads "Not applicable", a missing Mac value "Unknown". */
export function appleFlagLabel(value: boolean | null | undefined, platform?: string): string {
  if (!isMac(platform)) return "Not applicable"
  return value === true ? "Yes" : value === false ? "No" : "Unknown"
}

export function healthCsvHeaders(): string[] {
  return ["Compliance", "Compliance Source", "Last MDM Sync", "MDM Certificate Expires",
    "User-Approved MDM", "Installed via ADE", "DEP Capable"]
}

export function healthCsvValues(device: EnrollmentHealth): string[] {
  return [
    complianceLabel(device.complianceState),
    device.complianceSource === "reported" ? "Reported by device" : device.complianceSource === "policies" ? "Evaluated policies" : "",
    device.lastMdmSync || "Unknown",
    device.mdmCertificateExpires || "Unknown",
    appleFlagLabel(device.userApprovedMdm, device.platform),
    appleFlagLabel(device.installedFromDep, device.platform),
    appleFlagLabel(device.depCapable, device.platform),
  ]
}

import {
  appleFlagLabel, certDaysLeft, healthCsvValues, matchesEnrollmentHealth, parseEnrollmentHealth, syncAgeDays, writeEnrollmentHealth,
} from "./enrollment-health"

const NOW = Date.parse("2026-01-15T12:00:00Z")
const none = { nonCompliant: false, syncOlderThanDays: null, certExpiringDays: null }

it("round-trips the problem filters through the URL and ignores bad values", () => {
  const filters = parseEnrollmentHealth(new URLSearchParams("compliance=non_compliant&syncOlderThan=7&certExpiring=30"))
  expect(filters).toEqual({ nonCompliant: true, syncOlderThanDays: 7, certExpiringDays: 30 })
  const params = new URLSearchParams("platform=mac")
  writeEnrollmentHealth(params, filters)
  expect(params.toString()).toBe("platform=mac&compliance=non_compliant&syncOlderThan=7&certExpiring=30")
  expect(parseEnrollmentHealth(new URLSearchParams("compliance=yes&syncOlderThan=-1&certExpiring=abc"))).toEqual(none)
})

it("treats missing, invalid and future sync times as unknown", () => {
  expect(syncAgeDays(null, NOW)).toBeNull()
  expect(syncAgeDays("invalid", NOW)).toBeNull()
  expect(syncAgeDays("2026-01-16T00:00:00Z", NOW)).toBeNull()
  expect(syncAgeDays("2026-01-08T12:00:00Z", NOW)).toBe(7)
  expect(certDaysLeft("2026-01-14T12:00:00Z", NOW)).toBe(-1)
})

it("never matches a problem filter on an unknown value", () => {
  const unknown = { complianceState: null, lastMdmSync: null, mdmCertificateExpires: null }
  expect(matchesEnrollmentHealth(unknown, none, NOW)).toBe(true)
  expect(matchesEnrollmentHealth(unknown, { ...none, nonCompliant: true }, NOW)).toBe(false)
  expect(matchesEnrollmentHealth(unknown, { ...none, syncOlderThanDays: 7 }, NOW)).toBe(false)
  expect(matchesEnrollmentHealth(unknown, { ...none, certExpiringDays: 30 }, NOW)).toBe(false)
})

it("matches stale syncs, non-compliance and certificates expiring or expired within the window", () => {
  expect(matchesEnrollmentHealth({ complianceState: "non_compliant" }, { ...none, nonCompliant: true }, NOW)).toBe(true)
  expect(matchesEnrollmentHealth({ complianceState: "compliant" }, { ...none, nonCompliant: true }, NOW)).toBe(false)
  expect(matchesEnrollmentHealth({ lastMdmSync: "2026-01-01T00:00:00Z" }, { ...none, syncOlderThanDays: 7 }, NOW)).toBe(true)
  expect(matchesEnrollmentHealth({ lastMdmSync: "2026-01-14T00:00:00Z" }, { ...none, syncOlderThanDays: 7 }, NOW)).toBe(false)
  expect(matchesEnrollmentHealth({ mdmCertificateExpires: "2026-02-01T00:00:00Z" }, { ...none, certExpiringDays: 30 }, NOW)).toBe(true)
  expect(matchesEnrollmentHealth({ mdmCertificateExpires: "2025-12-01T00:00:00Z" }, { ...none, certExpiringDays: 30 }, NOW)).toBe(true)
  expect(matchesEnrollmentHealth({ mdmCertificateExpires: "2027-01-01T00:00:00Z" }, { ...none, certExpiringDays: 30 }, NOW)).toBe(false)
})

it("labels Apple flags per platform and exports unknowns honestly", () => {
  expect(appleFlagLabel(true, "macOS")).toBe("Yes")
  expect(appleFlagLabel(null, "macOS")).toBe("Unknown")
  expect(appleFlagLabel(null, "Windows")).toBe("Not applicable")
  expect(healthCsvValues({ platform: "macOS" })).toEqual(["Unknown", "", "Unknown", "Unknown", "Unknown", "Unknown", "Unknown"])
})

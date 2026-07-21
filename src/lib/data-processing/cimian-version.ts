/**
 * Cimian client version normalization (AB#3754).
 *
 * The Cimian client stamps its build as a calendar version. The canonical,
 * preferred form is `YYYY.MM.DD.HHMM` — zero-padded, four components — emitted
 * by the client's build tooling (`Directory.Build.props`,
 * `DateTime.ToString("yyyy.MM.dd.HHmm")`), e.g. `2026.07.20.0632`.
 *
 * Two other encodings have historically reached the reported `cimian.version`
 * field from older client builds:
 *
 *   - three-component `YYYY.M.DDHH`   e.g. `2026.7.2006`  (day and hour merged,
 *     no minutes, no zero-padding) — `2026.7.2006` is 2026-07-20 06:00.
 *   - three-component `YYYY.M.D`      e.g. `2026.7.5`     (plain calendar day).
 *
 * All encode a build datetime. This module decodes any of them to a single
 * comparable key and to the canonical `YYYY.MM.DD.HHMM` string, so "is this
 * device behind current?" is a reliable ordered comparison.
 *
 * Why a dedicated normalizer instead of `compareSemanticVersions`: element-wise
 * numeric comparison mis-orders the merged form. `2026.7.2006` parses to
 * `[2026, 7, 2006]` and sorts *newer* than `2026.07.20.0632` -> `[2026, 7, 20, 632]`
 * because `2006 > 20`. That inversion makes the stalest devices look current.
 *
 * Scope: this normalizes the *reported* `cimian.version`, which is always a
 * 4-digit-year calendar stamp. The MSI-legal `YY.M.DDHH` ProductVersion form
 * (e.g. `26.7.2118`, capped because MSI majors are <= 255) lives only in the
 * on-device registry and never enters the reported field, so it is intentionally
 * out of scope here — requiring a 4-digit year also avoids mis-reading ordinary
 * semver like `1.2.3` as a date.
 */

export interface CimianVersion {
  /** The original string as reported. */
  raw: string
  /** Canonical zero-padded form: `YYYY.MM.DD.HHMM`. */
  canonical: string
  /** Sortable numeric key `YYYYMMDDHHMM` (e.g. 202607200632). Monotonic in build time. */
  sortKey: number
  year: number
  month: number
  day: number
  hour: number
  minute: number
}

const YEAR_MIN = 2000
const YEAR_MAX = 2100

const pad2 = (n: number): string => (n < 10 ? `0${n}` : `${n}`)

/**
 * Decode a reported Cimian version string into its build datetime, or `null`
 * if the string is not a recognizable 4-digit-year calendar stamp.
 */
export function normalizeCimianVersion(version: string | null | undefined): CimianVersion | null {
  if (version == null) return null
  const raw = version.trim()
  if (raw === '') return null

  const parts = raw.split('.')
  // Every component must be a run of digits; reject "+commit", "-beta", "windows", etc.
  if (!parts.every(p => /^\d+$/.test(p))) return null

  const nums = parts.map(p => parseInt(p, 10))
  const year = nums[0]
  // Require an explicit 4-digit year in range. This excludes semver (1.2.3),
  // Windows build numbers (10.0.x), Chrome versions (139.0.x), and the 2-digit
  // MSI ProductVersion form.
  if (parts[0].length !== 4 || year < YEAR_MIN || year > YEAR_MAX) return null

  const month = nums[1]
  if (month == null || month < 1 || month > 12) return null

  let day: number
  let hour: number
  let minute: number

  if (parts.length >= 4) {
    // YYYY.MM.DD.HHMM  (the canonical CI stamp)
    day = nums[2]
    const hhmm = nums[3]
    hour = Math.floor(hhmm / 100)
    minute = hhmm % 100
  } else if (parts.length === 3) {
    const third = nums[2]
    if (third <= 31) {
      // YYYY.M.D  — plain calendar day, no time component.
      day = third
      hour = 0
      minute = 0
    } else if (third >= 100) {
      // YYYY.M.DDHH — day and hour merged (older client stamp, minutes dropped).
      day = Math.floor(third / 100)
      hour = third % 100
      minute = 0
    } else {
      // 32..99: not a valid day and not a valid DDHH pair.
      return null
    }
  } else {
    // Fewer than three components (e.g. "2026.7") — not enough to be a build stamp.
    return null
  }

  if (day < 1 || day > 31) return null
  if (hour < 0 || hour > 23) return null
  if (minute < 0 || minute > 59) return null

  const canonical = `${year}.${pad2(month)}.${pad2(day)}.${pad2(hour)}${pad2(minute)}`
  const sortKey = ((((year * 100 + month) * 100 + day) * 100 + hour) * 100) + minute

  return { raw, canonical, sortKey, year, month, day, hour, minute }
}

/**
 * Compare two reported Cimian versions by build time.
 * Returns -1 if `a` is older, 1 if `a` is newer, 0 if equal.
 * Unparseable values sort below any parseable one (and equal to each other).
 */
export function compareCimianVersion(a: string | null | undefined, b: string | null | undefined): number {
  const na = normalizeCimianVersion(a)
  const nb = normalizeCimianVersion(b)
  if (na === null && nb === null) return 0
  if (na === null) return -1
  if (nb === null) return 1
  if (na.sortKey < nb.sortKey) return -1
  if (na.sortKey > nb.sortKey) return 1
  return 0
}

/** True when `version` is strictly older than `current` by build time. */
export function isCimianVersionOlder(
  version: string | null | undefined,
  current: string | null | undefined,
): boolean {
  return compareCimianVersion(version, current) < 0
}

import { csvRow } from "../csv"
import { trackedFetch } from "../data-cache"

/**
 * Fleet configuration profile and managed preference report, under
 * /management?tab=profiles and ?tab=preferences. One row per device and
 * selected identifier: installed, missing (only against a fresh, nonempty
 * management inventory) or unknown.
 */

export const PROFILES_API = "/api/v1/management/profiles"
export const PROFILE_OPTIONS_API = `${PROFILES_API}/filters`
export const PROFILE_STATES = ["installed", "missing", "unknown"] as const
export const PROFILE_SCOPE_KEYS = ["usages", "catalogs", "areas", "fleets", "locations", "rooms", "inventoryStates"] as const
export const PROFILE_PARAMS = ["identifiers", "preferenceKey", "states", "freshness", "maxAgeHours", "search", ...PROFILE_SCOPE_KEYS, "includeArchived"] as const
export const PROFILE_VIEW_PARAMS = ["sort", "direction"] as const
export const MAX_SELECTIONS = 50
const PAGE = 2000

export type ProfileKind = "profile" | "preference"
export type ProfileState = typeof PROFILE_STATES[number]
export type Freshness = "fresh" | "stale" | "unknown"

export interface ProfileRow {
  serialNumber: string
  deviceName: string | null
  platform: string
  assetTag: string | null
  usage: string | null
  catalog: string | null
  area: string | null
  fleet: string | null
  location: string | null
  room: string | null
  archived: boolean
  inventoryState: string | null
  lastSeen: string | null
  collectedAt: string | null
  freshness: Freshness
  inventoryCount: number
  state: ProfileState
  identifier: string
  name: string
  scope: "system" | "user" | "system+user" | "unknown" | null
  user?: string | null
  uuid?: string | null
  version?: string | null
  organization?: string | null
  installDate?: string | null
  source?: string | null
  status?: string | null
  verificationState?: string | null
  removalDisallowed?: boolean | null
  payloadCount?: number | null
  settingCount?: number | null
  values?: { scope: string | null; value: string | null }[] | null
}

export interface ProfilesReport {
  generatedAt: string
  kind: ProfileKind
  queryRequired: boolean
  total: number
  limit: number
  offset: number
  summary: Partial<Record<ProfileState, number>>
  devices: ProfileRow[]
}

export interface ProfileOption { identifier: string; name: string; devices: number; platforms: string[]; keys?: string[] }

export interface ProfileCatalog {
  profiles: ProfileOption[]
  preferences: ProfileOption[]
  options: Record<typeof PROFILE_SCOPE_KEYS[number], string[]>
}

export const kindForTab = (tab: string | null): ProfileKind => tab === "preferences" ? "preference" : "profile"
export const tabForKind = (kind: ProfileKind) => kind === "preference" ? "preferences" : "profiles"

export function listParam(params: URLSearchParams, key: string): string[] {
  const value = params.get(key) || ""
  if (key === "identifiers") {
    if (!value.startsWith("[")) return []
    try {
      const names: unknown = JSON.parse(value)
      return Array.isArray(names) ? names.filter((n): n is string => typeof n === "string" && !!n.trim()).slice(0, MAX_SELECTIONS) : []
    } catch { return [] }
  }
  return value.split(",").map(part => part.trim()).filter(Boolean)
}

/** The API request: report filters plus the global platform; view-only controls never change it. */
export function profilesApiQuery(params: URLSearchParams, kind: ProfileKind, platform: string): string {
  const query = new URLSearchParams({ kind })
  for (const key of PROFILE_PARAMS) {
    const value = params.get(key)?.trim()
    if (value) query.set(key, value)
  }
  if (kind !== "preference") query.delete("preferenceKey")
  query.set("platform", platform)
  return query.toString()
}

/** Keep unrelated URL state (platform, sort); patch values, dropping empties. */
export function profilesUrlQuery(current: string, kind: ProfileKind, patch: Record<string, string | null>): string {
  const params = new URLSearchParams(current)
  params.set("tab", tabForKind(kind))
  for (const [key, value] of Object.entries(patch)) {
    if (value?.trim()) params.set(key, value.trim())
    else params.delete(key)
  }
  return params.toString()
}

/** Selections visible under the global platform: an option observed on that platform, or anywhere for "all". */
export function optionsForPlatform(options: ProfileOption[], platform: string): ProfileOption[] {
  if (platform === "all") return options
  return options.filter(o => o.platforms.length === 0 || o.platforms.some(p => p.toLowerCase() === platform.toLowerCase()))
}

export function stateLabel(state: ProfileState): string {
  return state === "installed" ? "Installed" : state === "missing" ? "Not installed" : "Unknown"
}

export function scopeLabel(scope: ProfileRow["scope"]): string {
  return scope === "system" ? "System" : scope === "user" ? "User" : scope === "system+user" ? "System and user" : "Unknown"
}

export function inventoryLabel(value: string | null): string {
  return value === "checked_out" ? "Checked out" : value === "storage" ? "Storage"
    : value === "decommissioning" ? "Decommissioning" : "Unknown"
}

export const PROFILE_COLUMNS = [
  ["deviceName", "Device"], ["state", "State"], ["name", "Profile"], ["scope", "Scope"],
  ["version", "Version"], ["installDate", "Installed"], ["inventoryState", "Inventory"], ["collectedAt", "Collected"],
] as const
export type ProfileColumn = typeof PROFILE_COLUMNS[number][0]

export interface ProfilesView { sort: ProfileColumn; direction: "asc" | "desc" }

export function readProfilesView(params: URLSearchParams): ProfilesView {
  const sort = PROFILE_COLUMNS.find(([key]) => key === params.get("sort"))?.[0] || "deviceName"
  return { sort, direction: params.get("direction") === "desc" ? "desc" : "asc" }
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" })

function sortValue(row: ProfileRow, column: ProfileColumn): string | null {
  switch (column) {
    case "deviceName": return row.deviceName || row.serialNumber
    case "state": return String(PROFILE_STATES.indexOf(row.state))
    case "name": return row.name || row.identifier
    case "scope": return row.scope ? scopeLabel(row.scope) : null
    case "version": return row.version || null
    case "installDate": return row.installDate || null
    case "inventoryState": return row.inventoryState
    case "collectedAt": return row.collectedAt
  }
}

/** Sorted rows; unknown values always last in either direction. */
export function sortProfileRows(rows: ProfileRow[], view: ProfilesView): ProfileRow[] {
  return [...rows].sort((a, b) => {
    const x = sortValue(a, view.sort)
    const y = sortValue(b, view.sort)
    if (x === null || y === null) return x === y ? collator.compare(a.serialNumber, b.serialNumber) : x === null ? 1 : -1
    const order = collator.compare(x, y)
    return (view.direction === "asc" ? order : -order) || collator.compare(a.serialNumber, b.serialNumber)
  })
}

export function profilesCsv(rows: ProfileRow[], kind: ProfileKind, generatedAt: string, reportUrl: string): string {
  const headers = [
    "Device Name", "Serial Number", "Asset Tag", "Platform", "Inventory State", "Archived in ReportMate",
    "Usage", "Catalog", "Area", "Fleet", "Location", "Room",
    kind === "preference" ? "Preference Domain" : "Profile Identifier", kind === "preference" ? "Domain" : "Profile Name",
    "State", "Scope", "User",
    "Version", "UUID", "Organization", "Install Date", "Source", "Status", "Verification", "Removal Disallowed", "Payload Count",
    "Setting Count", "Preference Values",
    "Management Collection Time", "Collection Freshness", "Last Seen", "Report Generated At", "Report URL",
  ]
  return [csvRow(headers), ...rows.map(row => csvRow([
    row.deviceName, row.serialNumber, row.assetTag, row.platform, inventoryLabel(row.inventoryState), row.archived ? "Yes" : "No",
    row.usage, row.catalog, row.area, row.fleet, row.location, row.room,
    row.identifier, row.name, stateLabel(row.state), row.scope ? scopeLabel(row.scope) : "", row.user,
    row.version, row.uuid, row.organization, row.installDate, row.source, row.status, row.verificationState,
    row.removalDisallowed === true ? "Yes" : row.removalDisallowed === false ? "No" : "", row.payloadCount,
    row.settingCount, (row.values || []).map(v => `${v.scope || "Unknown scope"}: ${v.value ?? ""}`).join("\n"),
    row.collectedAt, row.freshness, row.lastSeen, generatedAt, reportUrl,
  ]))].join("\r\n")
}

/** Every page of a report, checked for consistency while it loads. */
export async function fetchProfilesReport(query: string, signal: AbortSignal,
  onProgress?: (loaded: number, total: number) => void): Promise<ProfilesReport> {
  const rows: ProfileRow[] = []
  let report: ProfilesReport | null = null
  do {
    const params = new URLSearchParams(query)
    params.set("offset", String(rows.length))
    params.set("limit", String(PAGE))
    const response = await trackedFetch(`${PROFILES_API}?${params}`, { cache: "no-store", signal })
    if (!response.ok) throw new Error("The profile report could not be loaded. Please retry.")
    const page: ProfilesReport = await response.json()
    if (!Array.isArray(page.devices) || !Number.isInteger(page.total) || page.total < 0 || page.queryRequired ||
        page.offset !== rows.length || (report && page.total !== report.total)) {
      throw new Error("The report changed while loading. Please retry.")
    }
    if (!report) report = page
    if (page.devices.length === 0 && rows.length < page.total) throw new Error("The report returned an incomplete page. Please retry.")
    rows.push(...page.devices)
    if (rows.length > page.total) throw new Error("The report changed while loading. Please retry.")
    onProgress?.(rows.length, page.total)
  } while (rows.length < report.total)
  signal.throwIfAborted()
  return { ...report, devices: rows }
}

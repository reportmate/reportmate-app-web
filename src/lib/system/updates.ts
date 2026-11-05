import { csvRow } from "../csv"
import { inventoryLabel } from "./services"
import { compareReportValues } from "./services-view"

export const UPDATES_API = "/api/v1/system/updates"
export const UPDATE_OPTIONS_API = `${UPDATES_API}/filters`
export const UPDATES_PAGE_SIZE = 1000

export const UPDATE_STATES = ["pending", "installed", "not_reported", "none", "unknown"] as const
export const UPDATE_SCOPE_KEYS = ["usages", "catalogs", "areas", "fleets", "locations", "rooms", "inventoryStates"] as const
export const UPDATE_PARAMS = [
  "updates", "cves", "states", "securityOnly", "deferred", "rebootRequired", "minAgeDays", "freshness", "maxAgeHours",
  "search", ...UPDATE_SCOPE_KEYS, "includeArchived",
] as const
export const UPDATE_VIEW_PARAMS = ["sort", "direction", "columns"] as const

export type UpdateState = typeof UPDATE_STATES[number]

export interface UpdateRow {
  serialNumber: string
  deviceName: string
  hostname: string | null
  platform: string
  osVersion: string | null
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
  freshness: "fresh" | "stale" | "unknown"
  collectionValid: boolean
  pendingCount: number | null
  updateKey: string | null
  title: string | null
  kb: string | null
  productKey?: string | null
  category: string | null
  severity: string | null
  cves: string[]
  isSecurity: boolean | null
  mandatory: boolean | null
  downloaded: boolean | null
  rebootRequired: boolean | null
  deferred: boolean | null
  deferredUntil: string | null
  firstOfferedAt: string | null
  releaseDate: string | null
  installDate: string | null
  version: string | null
  buildVersion: string | null
  updateType: string | null
  ageDays: number | null
  ageSource: "offered" | "released" | null
  reportedState: string
  state: UpdateState
}

export interface UpdatesReport {
  generatedAt: string
  total: number
  offset: number
  limit: number
  summary: Partial<Record<UpdateState, number>>
  options: Record<typeof UPDATE_SCOPE_KEYS[number], string[]>
  rows: UpdateRow[]
}

export interface UpdateOption {
  key: string
  platform: "windows" | "macos"
  kb: string | null
  title: string | null
  category: string | null
  isSecurity: boolean
  pendingDevices: number
  installedDevices: number
  cves: string[]
}

export interface UpdateCatalog {
  updates: UpdateOption[]
  cves: { cve: string; devices: number }[]
  options: UpdatesReport["options"]
}

export function jsonList(params: URLSearchParams, key: string): string[] {
  const value = params.get(key) || ""
  if (!value.startsWith("[")) return value.split(",").map(v => v.trim()).filter(Boolean)
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string" && !!v.trim()) : []
  } catch { return [] }
}

export function commaList(params: URLSearchParams, key: string): string[] {
  return (params.get(key) || "").split(",").map(v => v.trim()).filter(Boolean)
}

export function updateOptionsQuery(params: URLSearchParams, platform: string): string {
  const query = new URLSearchParams({ platform })
  if (params.get("includeArchived")) query.set("includeArchived", params.get("includeArchived")!)
  return query.toString()
}

export function updatesApiQuery(params: URLSearchParams, platform: string): string {
  const query = new URLSearchParams()
  for (const key of UPDATE_PARAMS) {
    const value = params.get(key)?.trim()
    if (value) query.set(key, value)
  }
  query.set("platform", platform)
  return query.toString()
}

export function updatesPageQuery(query: string, offset = 0): string {
  const params = new URLSearchParams(query)
  params.set("offset", String(offset))
  params.set("limit", String(UPDATES_PAGE_SIZE))
  return params.toString()
}

/** Keep unrelated URL state, such as the platform, when a filter changes. */
export function updatesUrlQuery(current: string, patch: Record<string, string | null>): string {
  const params = new URLSearchParams(current)
  params.set("tab", "updates")
  for (const [key, value] of Object.entries(patch)) {
    if (value?.trim()) params.set(key, value.trim())
    else params.delete(key)
  }
  return params.toString()
}

export function updateStateLabel(state: string): string {
  switch (state) {
    case "pending": return "Pending"
    case "installed": return "Installed"
    case "not_reported": return "Not reported"
    case "none": return "None pending reported"
    case "missing": return "No collection"
    default: return "Unknown"
  }
}

export function updateOptionLabel(option: UpdateOption): string {
  const title = option.title || option.kb || option.key
  return option.kb && !title.includes(option.kb) ? `${option.kb} ${title}` : title
}

export function updateRowKey(row: UpdateRow): string {
  return `${row.serialNumber}|${row.updateKey || ""}|${row.reportedState}`
}

export const UPDATE_COLUMNS = [
  ["deviceName", "Device"], ["serialNumber", "Serial number"], ["assetTag", "Asset tag"], ["platform", "Platform"],
  ["osVersion", "OS version"], ["state", "State"], ["title", "Update"], ["category", "Category"],
  ["severity", "Severity"], ["cves", "CVEs"], ["flags", "Flags"], ["version", "Version"], ["ageDays", "Age (days)"],
  ["deferredUntil", "Deferred until"], ["installDate", "Installed"], ["inventoryState", "Inventory"],
  ["usage", "Usage"], ["catalog", "Catalog"], ["area", "Area"], ["fleet", "Fleet"], ["location", "Location"],
  ["room", "Room"], ["collectedAt", "Update collection"], ["lastSeen", "Last seen"],
] as const
export type UpdateColumn = typeof UPDATE_COLUMNS[number][0]
export interface UpdatesView { sort: UpdateColumn; direction: "asc" | "desc"; columns: UpdateColumn[] }

const defaultColumns: UpdateColumn[] = ["deviceName", "state", "title", "category", "severity", "cves", "flags", "ageDays", "collectedAt"]

export function readUpdatesView(params: URLSearchParams): UpdatesView {
  const requested = params.has("columns") ? (params.get("columns") || "").split(",") : defaultColumns
  const columns = UPDATE_COLUMNS.filter(([key]) => key === "deviceName" || requested.includes(key)).map(([key]) => key)
  const sort = columns.find(key => key === params.get("sort")) || "deviceName"
  return { sort, direction: params.get("direction") === "desc" ? "desc" : "asc", columns }
}

export function updateFlags(row: UpdateRow): string[] {
  return [
    row.isSecurity ? "Security" : null,
    row.mandatory ? "Mandatory" : null,
    row.downloaded === true ? "Downloaded" : null,
    row.rebootRequired ? "Restart required" : null,
    row.deferred ? "Deferred" : null,
  ].filter((v): v is string => !!v)
}

function dateValue(value: string | null): number | null {
  const parsed = value ? Date.parse(value) : NaN
  return Number.isFinite(parsed) ? parsed : null
}

export function updateSortValue(row: UpdateRow, column: UpdateColumn): string | number | null {
  switch (column) {
    case "state": return updateStateLabel(row.state)
    case "title": return row.title || row.kb || null
    case "cves": return row.cves.join(" ") || null
    case "flags": return updateFlags(row).join(" ") || null
    case "ageDays": return row.ageDays
    case "inventoryState": return row.inventoryState ? inventoryLabel(row.inventoryState) : null
    case "deferredUntil": case "installDate": case "collectedAt": case "lastSeen": return dateValue(row[column])
    default: return row[column] || null
  }
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" })
export function updatesViewRows(rows: UpdateRow[], view: UpdatesView): UpdateRow[] {
  return [...rows].sort((a, b) => compareReportValues(updateSortValue(a, view.sort), updateSortValue(b, view.sort), view.direction) ||
    collator.compare(a.serialNumber, b.serialNumber) || collator.compare(a.title || "", b.title || ""))
}

const yesNo = (value: boolean | null) => value === null ? "Not reported" : value ? "Yes" : "No"

export function updatesCsv(rows: UpdateRow[], generatedAt: string, reportUrl: string): string {
  const headers = [
    "Device Name", "Hostname", "Serial Number", "Asset Tag", "Platform", "OS Version", "Inventory State",
    "Archived in ReportMate", "Usage", "Catalog", "Area", "Fleet", "Location", "Room",
    "State", "Last Reported State", "Update", "KB", "Product Key", "Category", "Severity", "CVEs", "Security",
    "Mandatory", "Downloaded", "Restart Required", "Deferred", "Deferred Until", "First Offered", "Released",
    "Installed", "Version", "Build", "Update Type", "Age (Days)", "Age Measured From",
    "Pending Updates Reported", "Update Collection Valid", "Update Collection Time", "Update Collection Freshness",
    "Last Seen", "Report Generated At", "Report URL",
  ]
  return [csvRow(headers), ...rows.map(row => csvRow([
    row.deviceName, row.hostname, row.serialNumber, row.assetTag, row.platform, row.osVersion,
    inventoryLabel(row.inventoryState), row.archived ? "Yes" : "No",
    row.usage, row.catalog, row.area, row.fleet, row.location, row.room,
    updateStateLabel(row.state), updateStateLabel(row.reportedState), row.title, row.kb, row.productKey ?? null,
    row.category, row.severity, row.cves.join(" "), row.updateKey ? yesNo(row.isSecurity) : null,
    row.updateKey ? yesNo(row.mandatory) : null, row.updateKey ? yesNo(row.downloaded) : null,
    row.updateKey ? yesNo(row.rebootRequired) : null, row.updateKey ? yesNo(row.deferred) : null,
    row.deferredUntil, row.firstOfferedAt, row.releaseDate, row.installDate, row.version, row.buildVersion,
    row.updateType, row.ageDays, row.ageSource, row.pendingCount, row.collectionValid ? "Yes" : "No",
    row.collectedAt, row.freshness, row.lastSeen, generatedAt, reportUrl,
  ]))].join("\r\n")
}

import { csvRow } from "../csv"
import { trackedFetch } from "../data-cache"
import { inventoryLabel, SCOPE_KEYS } from "./services"

/** Shared plumbing for the per-item System reports (background items, extensions). */

export type Freshness = "fresh" | "stale" | "unknown"

export interface ItemRow {
  serialNumber: string
  deviceName: string | null
  hostname: string | null
  assetTag: string | null
  platform: string
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
  kind: string
  key: string | null
  name: string | null
  [field: string]: unknown
}

export interface ItemReport {
  generatedAt: string
  queryRequired: boolean
  applicable?: boolean
  total: number
  limit: number
  offset: number
  devicesInScope: number
  devicesWithoutInventory: number
  devicesReporting: number
  summary: Record<string, number>
  rows: ItemRow[]
}

export interface ItemCatalog {
  applicable?: boolean
  items: { kind: string; key: string; label: string | null; devices: number }[]
  options: Partial<Record<typeof SCOPE_KEYS[number], string[]>>
  team?: { value: string; devices: number }[]
}

export type ColumnType = "device" | "time" | "text" | "mono" | "state"

export interface ItemColumn {
  key: string
  label: string
  type: ColumnType
  value: (row: ItemRow) => string | number | null
  /** Item kinds this column describes; other rows show "Not applicable". */
  appliesTo?: string[]
}

export interface ChoiceFilter {
  param: string
  label: string
  /** Prefix of the API summary counter for each choice, e.g. "lastRun". */
  summaryKey?: string
  choices: (readonly [string, string])[]
  /** Choices come from the catalog (e.g. collected team ids) instead of a fixed list. */
  fromCatalog?: "team"
}

export interface ItemReportConfig {
  tab: string
  api: string
  csvName: string
  description: string
  footnote: string
  prompt: string
  kinds: (readonly [string, string])[]
  filters: ChoiceFilter[]
  columns: ItemColumn[]
  defaultColumns: string[]
  /** Filter values that let the report run without item selections. */
  runsWithout: (params: URLSearchParams) => boolean
  macOnly?: boolean
}

export const ROW_PAGE_SIZE = 2000
export const MAX_ROWS = 60000
export const VIEW_PARAMS = ["sort", "direction", "columns"] as const

export function reportParams(config: ItemReportConfig): string[] {
  return ["items", "kinds", ...config.filters.map(f => f.param), "freshness", "maxAgeHours", "search", ...SCOPE_KEYS, "includeArchived"]
}

export function listParam(params: URLSearchParams, key: string): string[] {
  const value = params.get(key) || ""
  if (key === "items") {
    if (!value.startsWith("[")) return []
    try {
      const items: unknown = JSON.parse(value)
      return Array.isArray(items) ? items.filter((item): item is string => typeof item === "string" && item.includes(":")) : []
    } catch { return [] }
  }
  return value.split(",").map(part => part.trim()).filter(Boolean)
}

export function itemValue(kind: string, key: string): string {
  return `${kind}:${key}`
}

export function apiPlatform(platform: string): string {
  return platform === "Windows" ? "windows" : platform === "macOS" ? "macos" : "all"
}

export function hasReportQuery(config: ItemReportConfig, params: URLSearchParams): boolean {
  return listParam(params, "items").length > 0 || config.runsWithout(params)
}

export function reportApiQuery(config: ItemReportConfig, params: URLSearchParams, platform: string): string {
  const query = new URLSearchParams()
  for (const key of reportParams(config)) {
    const value = params.get(key)?.trim()
    if (value) query.set(key, value)
  }
  query.set("platform", apiPlatform(platform))
  query.set("limit", String(ROW_PAGE_SIZE))
  return query.toString()
}

export function optionsApiQuery(params: URLSearchParams, platform: string): string {
  const query = new URLSearchParams({ platform: apiPlatform(platform) })
  for (const key of [...SCOPE_KEYS, "includeArchived"]) {
    const value = params.get(key)
    if (value) query.set(key, value)
  }
  return query.toString()
}

/** Keep unrelated URL state and the active tab when a filter changes. */
export function reportUrlQuery(tab: string, current: string, patch: Record<string, string | null>): string {
  const params = new URLSearchParams(current)
  params.set("tab", tab)
  for (const [key, value] of Object.entries(patch)) {
    if (value?.trim()) params.set(key, value.trim())
    else params.delete(key)
  }
  return params.toString()
}

/** Load every row through bounded pages; a report that shifts between pages is rejected rather than shown partially. */
export async function fetchItemReport(
  api: string, query: string, signal: AbortSignal, onProgress?: (loaded: number, total: number) => void,
): Promise<ItemReport> {
  const rows: ItemRow[] = []
  let first: ItemReport | null = null
  do {
    const params = new URLSearchParams(query)
    params.set("offset", String(rows.length))
    params.set("limit", String(ROW_PAGE_SIZE))
    const response = await trackedFetch(`${api}?${params}`, { cache: "no-store", signal })
    if (!response.ok) throw new Error("The report could not be loaded. Please retry.")
    const page: ItemReport = await response.json()
    if (!Array.isArray(page.rows) || !Number.isInteger(page.total) || page.total < 0 || page.offset !== rows.length ||
        (first !== null && page.total !== first.total)) {
      throw new Error("The report changed while loading. Please retry.")
    }
    if (page.total > MAX_ROWS) throw new Error(`This report has ${page.total.toLocaleString()} rows. Select fewer items or narrow the filters.`)
    if (!first) first = page
    if (page.rows.length === 0 && rows.length < page.total) throw new Error("The report returned an incomplete page. Please retry.")
    rows.push(...page.rows)
    onProgress?.(rows.length, page.total)
  } while (first && !first.queryRequired && rows.length < first.total)
  signal.throwIfAborted()
  if (!first) throw new Error("The report could not be loaded.")
  return { ...first, rows }
}

export interface ItemView { sort: string; direction: "asc" | "desc"; columns: string[] }

export function readItemView(config: ItemReportConfig, params: URLSearchParams): ItemView {
  const requested = params.has("columns") ? (params.get("columns") || "").split(",") : config.defaultColumns
  const columns = config.columns.filter(c => c.key === "deviceName" || requested.includes(c.key)).map(c => c.key)
  return {
    sort: columns.find(key => key === params.get("sort")) || "deviceName",
    direction: params.get("direction") === "desc" ? "desc" : "asc",
    columns,
  }
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" })

function compare(a: string | number | null, b: string | number | null, direction: "asc" | "desc"): number {
  if (a === null || a === "") return b === null || b === "" ? 0 : 1
  if (b === null || b === "") return -1
  const result = typeof a === "number" && typeof b === "number" ? a - b : collator.compare(String(a), String(b))
  return direction === "asc" ? result : -result
}

export function sortRows(config: ItemReportConfig, rows: ItemRow[], view: ItemView): ItemRow[] {
  const column = config.columns.find(c => c.key === view.sort) || config.columns[0]
  const sortValue = (row: ItemRow) => {
    const value = column.value(row)
    if (column.type !== "time" || typeof value !== "string") return value
    const time = Date.parse(value)
    return Number.isFinite(time) ? time : null
  }
  return [...rows].sort((a, b) => compare(sortValue(a), sortValue(b), view.direction) ||
    collator.compare(a.serialNumber || "", b.serialNumber || "") || collator.compare(String(a.name || ""), String(b.name || "")))
}

export function text(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (Array.isArray(value)) return value.map(String).join(" ") || null
  return typeof value === "object" ? JSON.stringify(value) : String(value)
}

export const DEVICE_COLUMNS: ItemColumn[] = [
  { key: "deviceName", label: "Device", type: "device", value: row => row.deviceName || row.serialNumber },
  { key: "serialNumber", label: "Serial number", type: "mono", value: row => row.serialNumber },
  { key: "platform", label: "Platform", type: "text", value: row => row.platform },
]

export const TRAILING_COLUMNS: ItemColumn[] = [
  { key: "inventoryState", label: "Inventory", type: "text", value: row => `${inventoryLabel(row.inventoryState)}${row.archived ? " (archived)" : ""}` },
  { key: "usage", label: "Usage", type: "text", value: row => row.usage },
  { key: "catalog", label: "Catalog", type: "text", value: row => row.catalog },
  { key: "room", label: "Room", type: "text", value: row => row.room },
  { key: "collectedAt", label: "System collection", type: "time", value: row => row.collectedAt },
  { key: "freshness", label: "Collection age", type: "state", value: row => freshnessLabel(row.freshness) },
  { key: "lastSeen", label: "Last seen", type: "time", value: row => row.lastSeen },
]

export function freshnessLabel(value: Freshness | null | undefined): string {
  return value === "fresh" ? "Within maximum age" : value === "stale" ? "Older than maximum age" : "Unknown"
}

/** CSV of exactly the filtered, sorted rows, with every column whether visible or not. */
export function itemReportCsv(config: ItemReportConfig, rows: ItemRow[], generatedAt: string, reportUrl: string): string {
  const headers = [...config.columns.map(c => c.label), "Hostname", "Asset Tag", "Area", "Fleet", "Location", "Report Generated At", "Report URL"]
  return [csvRow(headers), ...rows.map(row => csvRow([
    ...config.columns.map(c => c.appliesTo && !c.appliesTo.includes(row.kind) ? "Not applicable" : c.value(row)), row.hostname, row.assetTag, row.area, row.fleet, row.location, generatedAt, reportUrl,
  ]))].join("\r\n")
}

/**
 * Fleet vulnerability (CVE) and threat detection reports: /security?tab=vulnerabilities
 * and /security?tab=threats. Rows are what clients collected. Windows sends MSRC
 * entries with status and severity, macOS sends SOFA unpatched CVEs with no
 * severity, and only Windows sends individual threat detections. A field that
 * was not collected stays null and reads "Not reported", never a guess.
 */

import { csvRow } from "../csv"
import { trackedFetch } from "../data-cache"
import { safeHttpUrl } from "./safeUrl"

export const VULNERABILITIES_API = "/api/v1/security/vulnerabilities"
export const DETECTIONS_API = "/api/v1/security/detections"
export const SCOPE_KEYS = ["usages", "catalogs", "areas", "fleets", "locations", "rooms", "inventoryStates"] as const
export const VULNERABILITY_PARAMS = ["view", "cves", "statuses", "severities", "exploited", "freshness", "maxAgeHours", "search", ...SCOPE_KEYS, "includeArchived"] as const
export const DETECTION_PARAMS = ["days", "vendors", "categories", "severities", "statuses", "search", ...SCOPE_KEYS, "includeArchived"] as const
/** Client-only view state: sorting and the CVE list text filter. */
export const VIEW_PARAMS = ["sort", "dir", "q"] as const
export const PAGE_SIZE = 5000

export const CVE_STATUSES = ["unpatched", "patched", "unknown"] as const
export const EXPLOITED_CHOICES = [["all", "All"], ["yes", "Actively exploited"], ["no", "Not exploited"], ["unknown", "Not reported"]] as const
export const DAY_CHOICES = [[1, "24 hours"], [7, "7 days"], [30, "30 days"], [90, "90 days"], [0, "All collected"]] as const
export const DEFAULT_DAYS = 30

export type Freshness = "fresh" | "stale" | "unknown"
export type Scope = Record<typeof SCOPE_KEYS[number], string[]>

export interface DeviceFields {
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
}

export interface VulnerabilityRow extends DeviceFields {
  identifier: string
  cve: string | null
  kbArticle: string | null
  label: string | null
  source: string
  status: typeof CVE_STATUSES[number]
  severity: string | null
  product: string | null
  affectedVersion: string | null
  fixedIn: string | null
  activelyExploited: boolean | null
  installedDate: string | null
  url: string | null
  freshness: Freshness
  listMayBeIncomplete: boolean
}

export interface CveSummary {
  identifier: string
  cve: string | null
  kbArticle: string | null
  devices: number
  unpatchedDevices: number
  patchedDevices: number
  activelyExploited: boolean | null
  severities: string[]
  fixedIn: string[]
  products: string[]
  platforms: string[]
  sources: string[]
}

export interface DetectionRow extends DeviceFields {
  threatName: string | null
  threatId: string | null
  severity: string | null
  vendor: string | null
  category: string | null
  status: string | null
  actionTaken: string | null
  detectedAt: string | null
  firstSeenAt: string | null
  lastSeenAt: string | null
  count: number | null
  path: string | null
  processName: string | null
  user: string | null
}

export interface Coverage {
  devices: number
  reporting: number
  notReporting: number
  unknown?: number
  listMayBeIncomplete?: number
  devicesWithDetections?: number
}

export interface PagedReport<T> {
  generatedAt: string
  coverage: Coverage
  options: Scope
  total: number
  limit: number
  offset: number
  rows: T[]
}

export interface SummaryReport {
  generatedAt: string
  coverage: Coverage
  options: Scope
  total: number
  cves: CveSummary[]
}

export interface VulnerabilityCatalog {
  cves: Pick<CveSummary, "identifier" | "cve" | "devices" | "severities" | "activelyExploited">[]
  severities: { value: string; entries: number }[]
  options: Scope
}

export interface DetectionCatalog {
  vendors: { value: string; devices: number }[]
  categories: { value: string; devices: number }[]
  severities: { value: string; devices: number }[]
  statuses: { value: string; devices: number }[]
  options: Scope
}

/** Exact identifiers travel as a JSON array, because update titles can hold commas. */
export function listParam(params: URLSearchParams, key: string): string[] {
  const value = params.get(key) || ""
  if (key === "cves" && value.startsWith("[")) {
    try {
      const names: unknown = JSON.parse(value)
      return Array.isArray(names) ? names.filter((n): n is string => typeof n === "string" && !!n.trim()) : []
    } catch { return [] }
  }
  return value.split(",").map(part => part.trim()).filter(Boolean)
}

/** The API query for the current URL: only report params, the global platform, and no view-only state. */
export function apiQuery(params: URLSearchParams, keys: readonly string[], platform: string, extra: Record<string, string> = {}): string {
  const query = new URLSearchParams()
  for (const key of keys) {
    const value = params.get(key)?.trim()
    if (value) query.set(key, value)
  }
  query.set("platform", platform)
  for (const [key, value] of Object.entries(extra)) query.set(key, value)
  return query.toString()
}

export function vulnerabilityView(params: URLSearchParams): "summary" | "devices" {
  return params.get("view") === "devices" ? "devices" : "summary"
}

export function detectionDays(params: URLSearchParams): number {
  const raw = params.get("days")
  if (raw === null) return DEFAULT_DAYS
  const days = Number(raw)
  return Number.isInteger(days) && days >= 0 && days <= 3650 ? days : DEFAULT_DAYS
}

export function detectionsQuery(params: URLSearchParams, platform: string): string {
  return apiQuery(params, DETECTION_PARAMS.filter(key => key !== "days"), platform, { days: String(detectionDays(params)) })
}

/** Keep the tab and unrelated URL state; drop empty values so defaults stay out of the URL. */
export function patchQuery(current: string, tab: string, patch: Record<string, string | null>): string {
  const params = new URLSearchParams(current)
  params.set("tab", tab)
  for (const [key, value] of Object.entries(patch)) {
    if (value?.trim()) params.set(key, value.trim())
    else params.delete(key)
  }
  return params.toString()
}

export function optionsQuery(params: URLSearchParams, platform: string): string {
  const query = new URLSearchParams({ platform })
  if (params.get("includeArchived")) query.set("includeArchived", params.get("includeArchived")!)
  return query.toString()
}

/** Every page of a bounded, paged report; fails rather than show a report that changed mid-load. */
export async function fetchAllRows<T extends { serialNumber: string }>(
  api: string, query: string, signal: AbortSignal, onProgress?: (loaded: number, total: number) => void,
): Promise<PagedReport<T>> {
  const rows: T[] = []
  let first: PagedReport<T> | null = null
  do {
    const params = new URLSearchParams(query)
    params.set("offset", String(rows.length))
    params.set("limit", String(PAGE_SIZE))
    const response = await trackedFetch(`${api}?${params}`, { cache: "no-store", signal })
    if (!response.ok) throw new Error(response.status === 404 ? "This report is not available on this server yet." : "The report could not be loaded. Please retry.")
    const page: PagedReport<T> = await response.json()
    if (!Array.isArray(page.rows) || !Number.isInteger(page.total) || page.offset !== rows.length || (first && page.total !== first.total)) {
      throw new Error("The report changed while loading. Please retry.")
    }
    if (!first) first = page
    if (page.rows.length === 0 && rows.length < page.total) throw new Error("The report returned an incomplete page. Please retry.")
    rows.push(...page.rows)
    onProgress?.(rows.length, page.total)
  } while (rows.length < first.total)
  if (signal.aborted) throw new DOMException("The report load was cancelled.", "AbortError")
  return { ...first, rows }
}

export const severityLabel = (value: string | null | undefined) => !value || value === "not_reported" ? "Not reported" : value
export const exploitedLabel = (value: boolean | null) => value === true ? "Yes" : value === false ? "No" : "Not reported"
export const statusLabel = (value: string) => value === "unknown" ? "Unknown" : value.charAt(0).toUpperCase() + value.slice(1)
export const inventoryLabel = (value: string | null) => value === "checked_out" ? "Checked out" : value === "storage" ? "Storage"
  : value === "decommissioning" ? "Decommissioning" : "Unknown"
export const deviceHref = (serial: string) => `/device/${encodeURIComponent(serial)}#security`

/** A link for a vulnerability: a known page for a real CVE id, else the collected URL when it is http(s). */
export function vulnerabilityHref(row: Pick<VulnerabilityRow, "cve" | "url" | "source">): string {
  if (row.cve) {
    return row.source === "MSRC" ? `https://msrc.microsoft.com/update-guide/vulnerability/${row.cve}` : `https://nvd.nist.gov/vuln/detail/${row.cve}`
  }
  return safeHttpUrl(row.url)
}

// MARK: - Sorting

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" })

export function compareValues(a: string | number | null, b: string | number | null, dir: "asc" | "desc"): number {
  if (a === null) return b === null ? 0 : 1
  if (b === null) return -1
  const c = typeof a === "number" && typeof b === "number" ? a - b : collator.compare(String(a), String(b))
  return dir === "asc" ? c : -c
}

const time = (value: string | null) => {
  const parsed = value ? Date.parse(value) : NaN
  return Number.isFinite(parsed) ? parsed : null
}
const exploitedRank = (value: boolean | null) => value === true ? 2 : value === false ? 0 : 1

export const VULNERABILITY_COLUMNS = [
  ["identifier", "CVE"], ["severity", "Severity"], ["product", "Affected product"], ["affectedVersion", "Affected version"],
  ["fixedIn", "Fixed in"], ["exploited", "Actively exploited"], ["status", "Status"], ["device", "Device"],
  ["platform", "Platform"], ["collectedAt", "Collected"],
] as const
export type VulnerabilityColumn = typeof VULNERABILITY_COLUMNS[number][0]

export function sortVulnerabilities(rows: VulnerabilityRow[], sort: string | null, dir: "asc" | "desc"): VulnerabilityRow[] {
  const column = (VULNERABILITY_COLUMNS.find(([key]) => key === sort)?.[0] || "identifier") as VulnerabilityColumn
  const value = (row: VulnerabilityRow): string | number | null => {
    switch (column) {
      case "exploited": return exploitedRank(row.activelyExploited)
      case "device": return row.deviceName || row.serialNumber
      case "collectedAt": return time(row.collectedAt)
      default: return row[column] ?? null
    }
  }
  return [...rows].sort((a, b) => compareValues(value(a), value(b), dir) || collator.compare(a.identifier, b.identifier) || collator.compare(a.serialNumber, b.serialNumber))
}

export const SUMMARY_COLUMNS = [
  ["identifier", "CVE"], ["devices", "Devices"], ["unpatchedDevices", "Unpatched"], ["severities", "Severity"],
  ["exploited", "Actively exploited"], ["fixedIn", "Fixed in"], ["products", "Affected product"], ["platforms", "Platform"],
] as const
export type SummaryColumn = typeof SUMMARY_COLUMNS[number][0]

export function filterSummary(rows: CveSummary[], q: string): CveSummary[] {
  const needle = q.trim().toLowerCase()
  if (!needle) return rows
  return rows.filter(row => [row.identifier, row.kbArticle, ...row.products, ...row.fixedIn].some(v => v?.toLowerCase().includes(needle)))
}

export function sortSummary(rows: CveSummary[], sort: string | null, dir: "asc" | "desc"): CveSummary[] {
  const column = SUMMARY_COLUMNS.find(([key]) => key === sort)?.[0] as SummaryColumn | undefined
  if (!column) return rows
  const value = (row: CveSummary): string | number | null => {
    switch (column) {
      case "exploited": return exploitedRank(row.activelyExploited)
      case "severities": case "fixedIn": case "products": case "platforms": return row[column].join(", ") || null
      default: return row[column]
    }
  }
  return [...rows].sort((a, b) => compareValues(value(a), value(b), dir) || collator.compare(a.identifier, b.identifier))
}

export const DETECTION_COLUMNS = [
  ["threatName", "Threat"], ["severity", "Severity"], ["vendor", "Vendor / product"], ["category", "Category"],
  ["status", "Status"], ["lastSeenAt", "Detected"], ["count", "Count"], ["path", "Path"], ["device", "Device"], ["platform", "Platform"],
] as const
export type DetectionColumn = typeof DETECTION_COLUMNS[number][0]

export function sortDetections(rows: DetectionRow[], sort: string | null, dir: "asc" | "desc"): DetectionRow[] {
  const column = (DETECTION_COLUMNS.find(([key]) => key === sort)?.[0] || "lastSeenAt") as DetectionColumn
  const value = (row: DetectionRow): string | number | null => {
    switch (column) {
      case "lastSeenAt": return time(row.lastSeenAt || row.detectedAt)
      case "device": return row.deviceName || row.serialNumber
      default: return row[column] ?? null
    }
  }
  return [...rows].sort((a, b) => compareValues(value(a), value(b), dir) || collator.compare(a.serialNumber, b.serialNumber))
}

/** Sort direction from the URL; each report's default column sorts in its natural direction. */
export function sortDir(params: URLSearchParams, defaultDir: "asc" | "desc"): "asc" | "desc" {
  const dir = params.get("dir")
  return dir === "asc" || dir === "desc" ? dir : defaultDir
}

// MARK: - CSV

const deviceHeaders = ["Device Name", "Serial Number", "Asset Tag", "Platform", "Inventory State", "Archived in ReportMate", "Usage", "Catalog", "Area", "Fleet", "Location", "Room", "Last Seen"]
const deviceCells = (row: DeviceFields) => [row.deviceName, row.serialNumber, row.assetTag, row.platform, inventoryLabel(row.inventoryState),
  row.archived ? "Yes" : "No", row.usage, row.catalog, row.area, row.fleet, row.location, row.room, row.lastSeen]

export function vulnerabilitiesCsv(rows: VulnerabilityRow[], generatedAt: string, reportUrl: string): string {
  const headers = ["CVE", "Update Article", "Reported Identifier", "Source", "Status", "Severity", "Affected Product", "Affected Version",
    "Fixed In", "Actively Exploited", "Installed Date", "Reference URL", "Security Collection Time", "Collection Freshness",
    "List May Be Incomplete", ...deviceHeaders, "Report Generated At", "Report URL"]
  return [csvRow(headers), ...rows.map(row => csvRow([row.cve, row.kbArticle, row.label, row.source, statusLabel(row.status),
    severityLabel(row.severity), row.product, row.affectedVersion, row.fixedIn, exploitedLabel(row.activelyExploited),
    row.installedDate, safeHttpUrl(row.url), row.collectedAt, row.freshness, row.listMayBeIncomplete ? "Yes" : "No",
    ...deviceCells(row), generatedAt, reportUrl]))].join("\r\n")
}

export function cveSummaryCsv(rows: CveSummary[], generatedAt: string, reportUrl: string): string {
  const headers = ["CVE", "Update Article", "Devices", "Unpatched Devices", "Patched Devices", "Severity", "Actively Exploited",
    "Fixed In", "Affected Product", "Platforms", "Sources", "Report Generated At", "Report URL"]
  return [csvRow(headers), ...rows.map(row => csvRow([row.cve || row.identifier, row.kbArticle, row.devices, row.unpatchedDevices,
    row.patchedDevices, row.severities.join("; ") || "Not reported", exploitedLabel(row.activelyExploited), row.fixedIn.join("; "),
    row.products.join("; "), row.platforms.join("; "), row.sources.join("; "), generatedAt, reportUrl]))].join("\r\n")
}

export function detectionsCsv(rows: DetectionRow[], generatedAt: string, reportUrl: string): string {
  const headers = ["Threat", "Threat ID", "Severity", "Vendor / Product", "Category", "Status", "Action Taken", "Detected At",
    "First Seen", "Last Seen", "Count", "Path", "Process", "User", ...deviceHeaders, "Report Generated At", "Report URL"]
  return [csvRow(headers), ...rows.map(row => csvRow([row.threatName, row.threatId, severityLabel(row.severity), row.vendor,
    row.category, row.status, row.actionTaken, row.detectedAt, row.firstSeenAt, row.lastSeenAt, row.count, row.path,
    row.processName, row.user, ...deviceCells(row), generatedAt, reportUrl]))].join("\r\n")
}

export function downloadCsv(csv: string, name: string) {
  const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** This report's address with the global platform made explicit, for links and CSV provenance. */
export function shareableUrl(href: string, platformFilter: string): string {
  const url = new URL(href)
  url.searchParams.set("platform", platformFilter === "Windows" ? "win" : platformFilter === "macOS" ? "mac" : "all")
  return url.toString()
}

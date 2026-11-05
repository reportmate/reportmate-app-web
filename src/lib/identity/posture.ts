import { csvRow } from "../csv"

export const POSTURE_API = "/api/v1/identity/posture"

export const SCOPE_KEYS = ["usages", "catalogs", "areas", "fleets", "locations", "rooms", "inventoryStates"] as const
export const QUICK_VIEWS = [
  ["noLaps", "No LAPS", "Windows"],
  ["autoLogin", "Auto-login on", "Windows"],
  ["expiredPssoToken", "Expired Platform SSO token", "macOS"],
  ["activationLock", "Activation Lock on", "macOS"],
  ["noRecoveryKey", "No FileVault recovery key", "macOS"],
] as const
export type QuickView = typeof QUICK_VIEWS[number][0]
/** Sent to the API; everything else in the URL is view state applied in the browser. */
export const POSTURE_PARAMS = ["views", "freshness", "maxAgeHours", "search", ...SCOPE_KEYS, "includeArchived"] as const
export const POSTURE_VIEW_PARAMS = ["sort", "direction", "columns"] as const

export type Freshness = "fresh" | "stale" | "unknown"
export type Tri = boolean | null

export interface PssoUser { username: string | null; registered: Tri; tokenExpiration: string | null; token: "valid" | "expired" | "not_registered" | "unknown" }

export interface PostureReported {
  laps?: "configured" | "not_configured" | "unknown"
  lapsBackupDirectory?: string | null
  autoLogin?: Tri
  autoLoginStoredPassword?: Tri
  uacEnabled?: Tri
  uacLevel?: string | null
  minPasswordLength?: number | null
  maxPasswordAgeDays?: number | null
  passwordHistoryLength?: number | null
  lockoutThreshold?: number | null
  lockoutDurationMinutes?: number | null
  helloStatus?: string | null
  helloProviders?: string[] | null
  credentialGuard?: Tri
  tpmOwned?: Tri
  tpmReady?: Tri
  failedLoginsLast7Days?: number | null
  pssoState?: "valid" | "expired" | "not_registered" | "no_registered_users" | "unknown"
  pssoProvider?: string | null
  pssoUsers?: PssoUser[]
  secureTokenGranted?: number | null
  secureTokenMissing?: number | null
  bootstrapTokenEscrowed?: Tri
  activationLock?: "on" | "likely" | "off" | "unknown"
  findMy?: Tri
  fileVault?: Tri
  personalRecoveryKey?: Tri
  institutionalRecoveryKey?: Tri
  recoveryKey?: "present" | "none" | "filevault_off" | "unknown"
}

export interface PostureDevice {
  serialNumber: string
  deviceName: string | null
  computerName: string | null
  assetTag: string | null
  platform: string
  usage: string | null
  catalog: string | null
  area: string | null
  fleet: string | null
  location: string | null
  room: string | null
  archived: boolean | null
  inventoryState: string | null
  lastSeen: string | null
  identityCollectedAt: string | null
  securityCollectedAt: string | null
  identityFreshness: Freshness
  securityFreshness: Freshness
  reported: PostureReported
  checks: Record<QuickView, Tri>
  unreadable?: boolean
}

export interface PostureReport {
  generatedAt: string
  maxAgeHours: number
  total: number
  offset: number
  limit: number
  summary: Record<QuickView, number>
  unknown: Record<QuickView, number>
  options: Record<typeof SCOPE_KEYS[number], string[]>
  devices: PostureDevice[]
}

export function listParam(params: URLSearchParams, key: string): string[] {
  return (params.get(key) || "").split(",").map(part => part.trim()).filter(Boolean)
}

export function postureApiQuery(params: URLSearchParams, platform: string): string {
  const query = new URLSearchParams()
  for (const key of POSTURE_PARAMS) {
    const value = params.get(key)?.trim()
    if (value) query.set(key, value)
  }
  query.set("platform", platform)
  return query.toString()
}

export function posturePageQuery(query: string, offset = 0): string {
  const params = new URLSearchParams(query)
  params.set("offset", String(offset))
  params.set("limit", "500")
  return params.toString()
}

/** Keep unrelated URL state, including the global platform. */
export function postureUrlQuery(current: string, patch: Record<string, string | null>): string {
  const params = new URLSearchParams(current)
  params.set("tab", "posture")
  for (const [key, value] of Object.entries(patch)) {
    if (value?.trim()) params.set(key, value.trim())
    else params.delete(key)
  }
  return params.toString()
}

export function inventoryLabel(value: string | null): string {
  return value === "checked_out" ? "Checked out" : value === "storage" ? "Storage"
    : value === "decommissioning" ? "Decommissioning" : "Unknown"
}

export const triLabel = (value: Tri | undefined, yes = "Yes", no = "No") => value === true ? yes : value === false ? no : "Unknown"

const num = (value: number | null | undefined, unit = "") => typeof value === "number" ? `${value}${unit}` : "Unknown"

export function lapsLabel(r: PostureReported): string {
  if (r.laps === "configured") return r.lapsBackupDirectory ? `Configured (${r.lapsBackupDirectory})` : "Configured"
  return r.laps === "not_configured" ? "Not configured" : "Unknown"
}
export function autoLoginLabel(r: PostureReported): string {
  if (r.autoLogin === true) return r.autoLoginStoredPassword ? "On, stored password" : "On"
  return triLabel(r.autoLogin, "On", "Off")
}
export function uacLabel(r: PostureReported): string {
  if (r.uacEnabled === false) return "Off"
  return r.uacLevel || (r.uacEnabled ? "On" : "Unknown")
}
export function passwordPolicyLabel(r: PostureReported): string {
  return `Min length ${num(r.minPasswordLength)} · Lockout after ${num(r.lockoutThreshold)} for ${num(r.lockoutDurationMinutes, " min")}`
}
export function helloLabel(r: PostureReported): string {
  const providers = r.helloProviders == null ? "Providers unknown" : r.helloProviders.length ? r.helloProviders.join(", ") : "No providers"
  return `${r.helloStatus || "Status unknown"} · ${providers}`
}
export function tpmLabel(r: PostureReported): string {
  return r.tpmOwned === true ? (r.tpmReady === false ? "Owned, not ready" : "Owned") : triLabel(r.tpmOwned, "Owned", "Not owned")
}
export function pssoLabel(r: PostureReported): string {
  return { valid: "Registered, tokens valid", expired: "Token expired", not_registered: "Not registered",
    no_registered_users: "Device registered, no users", unknown: "Unknown" }[r.pssoState || "unknown"]
}
export function activationLockLabel(r: PostureReported): string {
  return { on: "On", likely: "Likely on (inferred from Find My)", off: "Off", unknown: "Unknown" }[r.activationLock || "unknown"]
}
export function recoveryKeyLabel(r: PostureReported): string {
  if (r.recoveryKey === "present") return [r.personalRecoveryKey && "Personal", r.institutionalRecoveryKey && "Institutional"].filter(Boolean).join(" + ")
  return { none: "None on device", filevault_off: "FileVault off", unknown: "Unknown" }[r.recoveryKey || "unknown"] || "Unknown"
}
export function secureTokenLabel(r: PostureReported): string {
  return typeof r.secureTokenGranted === "number" ? `${r.secureTokenGranted} granted · ${num(r.secureTokenMissing)} missing` : "Unknown"
}

export const POSTURE_COLUMNS = [
  ["deviceName", "Device", "all"], ["platform", "Platform", "all"], ["inventoryState", "Inventory", "all"],
  ["laps", "LAPS", "Windows"], ["autoLogin", "Auto-login", "Windows"], ["uac", "UAC", "Windows"],
  ["passwordPolicy", "Password policy", "Windows"], ["hello", "Windows Hello", "Windows"],
  ["credentialGuard", "Credential Guard", "Windows"], ["tpm", "TPM ownership", "Windows"],
  ["failedLogins", "Failed sign-ins (7 days)", "Windows"],
  ["psso", "Platform SSO", "macOS"], ["secureToken", "Secure Token", "macOS"], ["bootstrapToken", "Bootstrap Token", "macOS"],
  ["activationLock", "Activation Lock", "macOS"], ["findMy", "Find My", "macOS"], ["recoveryKey", "FileVault recovery key", "macOS"],
  ["identityCollectedAt", "Identity collection", "all"], ["securityCollectedAt", "Security collection", "macOS"],
  ["lastSeen", "Last seen", "all"],
] as const
export type PostureColumn = typeof POSTURE_COLUMNS[number][0]

const DEFAULT_COLUMNS: Record<string, PostureColumn[]> = {
  Windows: ["deviceName", "laps", "autoLogin", "uac", "passwordPolicy", "hello", "credentialGuard", "tpm", "failedLogins", "identityCollectedAt"],
  macOS: ["deviceName", "psso", "secureToken", "bootstrapToken", "activationLock", "findMy", "recoveryKey", "identityCollectedAt", "securityCollectedAt"],
  all: ["deviceName", "platform", "laps", "autoLogin", "psso", "activationLock", "recoveryKey", "inventoryState", "identityCollectedAt"],
}

export function availableColumns(platform: string) {
  return POSTURE_COLUMNS.filter(([, , scope]) => scope === "all" || platform === "all" || scope === platform)
}

export interface PostureView { sort: PostureColumn; direction: "asc" | "desc"; columns: PostureColumn[] }

export function readPostureView(params: URLSearchParams, platform: string): PostureView {
  const available = availableColumns(platform)
  const requested = params.has("columns") ? listParam(params, "columns") : DEFAULT_COLUMNS[platform] || DEFAULT_COLUMNS.all
  const columns = available.filter(([key]) => key === "deviceName" || requested.includes(key)).map(([key]) => key)
  const sort = columns.find(key => key === params.get("sort")) || "deviceName"
  return { sort, direction: params.get("direction") === "desc" ? "desc" : "asc", columns }
}

/** Display text of a column; also its sort key and CSV value. Not-applicable platforms give null. */
export function columnText(device: PostureDevice, column: PostureColumn): string | null {
  const r = device.reported || {}
  const scope = POSTURE_COLUMNS.find(([key]) => key === column)?.[2]
  if (scope && scope !== "all" && scope !== device.platform) return null
  switch (column) {
    case "deviceName": return device.deviceName || device.serialNumber
    case "platform": return device.platform
    case "inventoryState": return inventoryLabel(device.inventoryState)
    case "laps": return lapsLabel(r)
    case "autoLogin": return autoLoginLabel(r)
    case "uac": return uacLabel(r)
    case "passwordPolicy": return passwordPolicyLabel(r)
    case "hello": return helloLabel(r)
    case "credentialGuard": return triLabel(r.credentialGuard, "On", "Off")
    case "tpm": return tpmLabel(r)
    case "failedLogins": return num(r.failedLoginsLast7Days)
    case "psso": return pssoLabel(r)
    case "secureToken": return secureTokenLabel(r)
    case "bootstrapToken": return triLabel(r.bootstrapTokenEscrowed, "Escrowed", "Not escrowed")
    case "activationLock": return activationLockLabel(r)
    case "findMy": return triLabel(r.findMy, "On", "Off")
    case "recoveryKey": return recoveryKeyLabel(r)
    case "identityCollectedAt": return device.identityCollectedAt
    case "securityCollectedAt": return device.securityCollectedAt
    case "lastSeen": return device.lastSeen
  }
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" })
const TIME_COLUMNS: PostureColumn[] = ["identityCollectedAt", "securityCollectedAt", "lastSeen"]

function sortValue(device: PostureDevice, column: PostureColumn): string | number | null {
  const value = columnText(device, column)
  if (TIME_COLUMNS.includes(column)) {
    const time = value ? Date.parse(value) : NaN
    return Number.isFinite(time) ? time : null
  }
  if (column === "failedLogins") return typeof device.reported?.failedLoginsLast7Days === "number" ? device.reported.failedLoginsLast7Days : null
  return value === "Unknown" ? null : value
}

/** Unknown and not-applicable values always sort last, in either direction. */
export function postureRows(devices: PostureDevice[], view: PostureView): PostureDevice[] {
  return [...devices].sort((a, b) => {
    const x = sortValue(a, view.sort), y = sortValue(b, view.sort)
    let result = 0
    if (x === null || y === null) result = x === null ? (y === null ? 0 : 1) : -1
    else {
      const comparison = typeof x === "number" && typeof y === "number" ? x - y : collator.compare(String(x), String(y))
      result = view.direction === "asc" ? comparison : -comparison
    }
    return result || collator.compare(a.serialNumber, b.serialNumber)
  })
}

export function postureCsv(devices: PostureDevice[], generatedAt: string, reportUrl: string): string {
  const headers = [
    "Device Name", "Computer Name", "Serial Number", "Asset Tag", "Platform", "Inventory State", "Archived in ReportMate",
    "Usage", "Catalog", "Area", "Fleet", "Location", "Room",
    ...POSTURE_COLUMNS.filter(([key]) => !["deviceName", "platform", "inventoryState", "identityCollectedAt", "securityCollectedAt", "lastSeen"].includes(key)).map(([, label]) => label),
    "Platform SSO Users", ...QUICK_VIEWS.map(([, label]) => `Quick View: ${label}`),
    "Identity Collection Time", "Identity Collection Freshness", "Security Collection Time", "Security Collection Freshness",
    "Last Seen", "Report Generated At", "Report URL",
  ]
  const postureKeys = POSTURE_COLUMNS.filter(([key]) => !["deviceName", "platform", "inventoryState", "identityCollectedAt", "securityCollectedAt", "lastSeen"].includes(key)).map(([key]) => key)
  return [csvRow(headers), ...devices.map(device => csvRow([
    device.deviceName, device.computerName, device.serialNumber, device.assetTag, device.platform,
    inventoryLabel(device.inventoryState), device.archived ? "Yes" : "No",
    device.usage, device.catalog, device.area, device.fleet, device.location, device.room,
    ...postureKeys.map(key => columnText(device, key) ?? "Not applicable"),
    (device.reported?.pssoUsers || []).map(u => `${u.username || "Unknown user"}: ${u.token}${u.tokenExpiration ? ` (expires ${u.tokenExpiration})` : ""}`).join("\n"),
    ...QUICK_VIEWS.map(([key, , platform]) => platform !== device.platform ? "Not applicable" : triLabel(device.checks?.[key])),
    device.identityCollectedAt, device.identityFreshness, device.securityCollectedAt, device.securityFreshness,
    device.lastSeen, generatedAt, reportUrl,
  ]))].join("\r\n")
}

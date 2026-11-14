import { DEVICE_COLUMNS, TRAILING_COLUMNS, listParam, text, type ItemReportConfig, type ItemRow } from "./item-reports"

export const BACKGROUND_API = "/api/v1/system/background"

const KIND_LABELS: Record<string, string> = { task: "Scheduled task", launchd: "launchd job", loginItem: "Open at Login" }
const LAST_RUN_LABELS: Record<string, string> = {
  succeeded: "Succeeded", failed: "Failed", running: "Running", notRun: "Has not run",
  informational: "Informational", unknown: "Unknown", notApplicable: "Not applicable",
}
const ORIGIN_LABELS: Record<string, string> = { builtIn: "Built in", thirdParty: "Third party", unknown: "Unknown" }
const ENABLED_LABELS: Record<string, string> = { enabled: "Enabled", disabled: "Disabled", unknown: "Unknown" }

function yesNo(value: unknown): string {
  return value === true ? "Yes" : value === false ? "No" : "Not reported"
}

/** Task Scheduler reports 1999-11-30 for a task that never ran and 1899-12-30 when no run is scheduled. */
export function taskTime(value: unknown, sentinel: string): string | null {
  const raw = text(value)
  if (!raw) return null
  const year = Number(raw.slice(0, 4))
  return Number.isFinite(year) && year > 0 && year < 2000 ? sentinel : raw
}

function detail(row: ItemRow): string | null {
  if (row.kind === "task") return text(row.action)
  if (row.kind === "launchd") return [text(row.program), text(row.arguments)].filter(Boolean).join(" ") || null
  return text(row.path) || text(row.bundleId)
}

export const BACKGROUND_REPORT: ItemReportConfig = {
  tab: "background",
  api: BACKGROUND_API,
  csvName: "background-report",
  description: "Scheduled tasks, launchd jobs and Open at Login items across devices.",
  footnote: "Services covers Windows services and the launchd jobs macOS reports as loaded, with running state. This tab covers what Services does not: launchd jobs configured on disk, Open at Login items and Windows scheduled tasks. Rows list reported items only; a device that does not list an item may not have reported it.",
  prompt: "Choose scheduled tasks, launchd jobs or Open at Login items from the Background panel, or show failed scheduled tasks across the fleet.",
  kinds: [["task", "Scheduled tasks"], ["launchd", "launchd jobs"], ["loginItem", "Open at Login"]],
  filters: [
    { param: "enabled", label: "Enabled", summaryKey: "enabledState", choices: Object.entries(ENABLED_LABELS) },
    { param: "lastRuns", label: "Task last result", summaryKey: "lastRun", choices: Object.entries(LAST_RUN_LABELS).filter(([key]) => key !== "notApplicable") },
    { param: "origins", label: "Source", summaryKey: "origin", choices: Object.entries(ORIGIN_LABELS) },
  ],
  columns: [
    ...DEVICE_COLUMNS,
    { key: "kind", label: "Kind", type: "text", value: row => KIND_LABELS[row.kind] || row.kind },
    { key: "name", label: "Item", type: "mono", value: row => text(row.kind === "task" ? row.path : row.name) },
    { key: "enabledState", label: "Enabled", type: "state", value: row => ENABLED_LABELS[String(row.enabledState)] || "Unknown" },
    { key: "state", label: "Reported state", type: "text", value: row => text(row.state) },
    { key: "origin", label: "Source", type: "text", value: row => ORIGIN_LABELS[String(row.origin)] || "Unknown" },
    { key: "lastRun", label: "Last result", type: "state", value: row => LAST_RUN_LABELS[String(row.lastRun)] || "Unknown", appliesTo: ["task"] },
    { key: "lastRunCode", label: "Last result code", type: "mono", value: row => text(row.lastRunCode), appliesTo: ["task"] },
    { key: "lastRunMessage", label: "Last result message", type: "text", value: row => text(row.lastRunMessage), appliesTo: ["task"] },
    { key: "lastRunTime", label: "Last run", type: "time", value: row => taskTime(row.lastRunTime, "Never"), appliesTo: ["task"] },
    { key: "nextRunTime", label: "Next run", type: "time", value: row => taskTime(row.nextRunTime, "Not scheduled"), appliesTo: ["task"] },
    { key: "type", label: "Type", type: "text", value: row => text(row.type) },
    { key: "source", label: "Reported source", type: "text", value: row => text(row.source) },
    { key: "runAtLoad", label: "Run at load", type: "text", value: row => row.kind === "launchd" ? yesNo(row.runAtLoad) : null, appliesTo: ["launchd"] },
    { key: "keepAlive", label: "Keep alive", type: "text", value: row => row.kind === "launchd" ? yesNo(row.keepAlive) : null, appliesTo: ["launchd"] },
    { key: "detail", label: "Program or action", type: "mono", value: detail },
    { key: "username", label: "User", type: "text", value: row => text(row.username) },
    ...TRAILING_COLUMNS,
  ],
  defaultColumns: ["deviceName", "kind", "name", "enabledState", "lastRun", "lastRunTime", "nextRunTime", "origin", "detail", "collectedAt"],
  runsWithout: params => listParam(params, "lastRuns").includes("failed"),
}

import { DEVICE_COLUMNS, TRAILING_COLUMNS, listParam, text, type ItemReportConfig } from "./item-reports"

export const EXTENSIONS_API = "/api/v1/system/extensions"

const KIND_LABELS: Record<string, string> = { systemExtension: "System extension", kernelExtension: "Kernel extension", helper: "Privileged helper" }
const ACTIVATION_LABELS: Record<string, string> = { activated: "Activated", notActivated: "Not activated", unknown: "Unknown" }
const SIGNATURE_LABELS: Record<string, string> = { signed: "Signed", unsigned: "Unsigned", unknown: "Unknown" }
const MANAGED_LABELS: Record<string, string> = { yes: "Managed", no: "Not managed", unknown: "Not reported" }

export const EXTENSIONS_REPORT: ItemReportConfig = {
  tab: "extensions",
  api: EXTENSIONS_API,
  csvName: "extensions-report",
  description: "System extensions, kernel extensions and privileged helper tools across Macs.",
  footnote: "macOS only. Rows list reported items only. Profile management for system extensions is not collected by the current macOS client, so it shows as not reported.",
  prompt: "Choose extensions or helper tools from the Extensions panel, pick a team id, or show extensions that are not activated or helpers that are unsigned.",
  kinds: [["systemExtension", "System extensions"], ["kernelExtension", "Kernel extensions"], ["helper", "Privileged helpers"]],
  filters: [
    { param: "activations", label: "Activation", summaryKey: "activation", choices: Object.entries(ACTIVATION_LABELS) },
    { param: "signatures", label: "Signature", summaryKey: "signature", choices: Object.entries(SIGNATURE_LABELS) },
    { param: "managed", label: "Managed by profile", summaryKey: "managed", choices: Object.entries(MANAGED_LABELS) },
    { param: "teamIds", label: "Team id", choices: [], fromCatalog: "team" },
  ],
  columns: [
    ...DEVICE_COLUMNS,
    { key: "kind", label: "Kind", type: "text", value: row => KIND_LABELS[row.kind] || row.kind },
    { key: "name", label: "Identifier or name", type: "mono", value: row => text(row.name) },
    { key: "version", label: "Version", type: "mono", value: row => text(row.version) },
    { key: "state", label: "Reported state", type: "text", value: row => text(row.state) },
    { key: "activation", label: "Activation", type: "state", value: row => row.activation ? ACTIVATION_LABELS[String(row.activation)] || "Unknown" : null, appliesTo: ["systemExtension"] },
    { key: "teamId", label: "Team id", type: "mono", value: row => text(row.teamId) },
    { key: "signature", label: "Signature", type: "state", value: row => row.signature ? SIGNATURE_LABELS[String(row.signature)] || "Unknown" : null, appliesTo: ["helper"] },
    { key: "managed", label: "Managed by profile", type: "text", value: row => row.managed ? MANAGED_LABELS[String(row.managed)] || "Not reported" : null, appliesTo: ["systemExtension"] },
    { key: "type", label: "Type", type: "text", value: row => text(row.type) },
    { key: "category", label: "Category", type: "text", value: row => text(row.category) },
    { key: "appName", label: "App", type: "text", value: row => text(row.appName) },
    { key: "bundleId", label: "Bundle id", type: "mono", value: row => text(row.bundleId) },
    { key: "loaded", label: "Loaded", type: "text", value: row => row.kind === "kernelExtension" ? (row.loaded === true ? "Yes" : row.loaded === false ? "No" : "Not reported") : null, appliesTo: ["kernelExtension"] },
    { key: "path", label: "Path", type: "mono", value: row => text(row.path) },
    ...TRAILING_COLUMNS,
  ],
  defaultColumns: ["deviceName", "kind", "name", "version", "activation", "teamId", "signature", "managed", "appName", "collectedAt"],
  runsWithout: params => listParam(params, "activations").includes("notActivated") ||
    listParam(params, "signatures").includes("unsigned") || listParam(params, "teamIds").length > 0,
  macOnly: true,
}

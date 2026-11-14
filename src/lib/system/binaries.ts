import { DEVICE_COLUMNS, TRAILING_COLUMNS, listParam, text, type ItemReportConfig } from "./item-reports"

export const BINARIES_API = "/api/v1/system/binaries"

const CATEGORY_LABELS: Record<string, string> = { server: "Servers", database: "Databases", library: "Libraries", runtime: "Runtimes", tool: "Tools" }
const SOURCE_LABELS: Record<string, string> = {
  os: "Operating system", package: "Installed package", homebrew: "Homebrew", macports: "MacPorts",
  developerTools: "Developer tools", chocolatey: "Chocolatey", unknown: "Unknown",
}
const RUNNING_LABELS: Record<string, string> = { yes: "Running", no: "Not running", unknown: "Not reported" }
const VERSION_SOURCE_LABELS: Record<string, string> = {
  binary: "Reported by the binary", fileVersion: "File version resource", package: "Package metadata",
  bundle: "Bundle metadata", notRun: "Not run (not root-owned)",
}

export const BINARIES_REPORT: ItemReportConfig = {
  tab: "binaries",
  api: BINARIES_API,
  csvName: "binaries-report",
  description: "Web servers, databases, TLS libraries, runtimes and tools found on devices, with version, path, source and whether each was running.",
  footnote: "Rows list reported binaries only; a device that does not list one may not have reported it. Running means a process was observed when the System module was collected. A version is left as not reported when the client could not read it safely: macOS runs only root-owned binaries for their version, and Windows reads the file's version resource without running it.",
  prompt: "Choose binaries such as httpd, sshd or openssl from the Binaries panel, pick a category, or show binaries that were running.",
  kinds: [["binary", "Binaries"]],
  filters: [
    { param: "categories", label: "Category", summaryKey: "category", choices: Object.entries(CATEGORY_LABELS) },
    { param: "running", label: "Running", summaryKey: "runningState", choices: Object.entries(RUNNING_LABELS) },
    { param: "sources", label: "Source", summaryKey: "source", choices: Object.entries(SOURCE_LABELS) },
  ],
  columns: [
    ...DEVICE_COLUMNS,
    { key: "name", label: "Binary", type: "mono", value: row => text(row.name) },
    { key: "version", label: "Version", type: "mono", value: row => text(row.version) },
    { key: "runningState", label: "Running", type: "state", value: row => RUNNING_LABELS[String(row.runningState)] || "Not reported" },
    { key: "processCount", label: "Processes", type: "text", value: row => typeof row.processCount === "number" ? row.processCount : null },
    { key: "path", label: "Path", type: "mono", value: row => text(row.path) },
    { key: "resolvedPath", label: "Resolved path", type: "mono", value: row => text(row.resolvedPath) },
    { key: "source", label: "Source", type: "text", value: row => SOURCE_LABELS[String(row.source)] || "Unknown" },
    { key: "package", label: "Package", type: "mono", value: row => text(row.package) },
    { key: "packageVersion", label: "Package version", type: "mono", value: row => text(row.packageVersion) },
    { key: "category", label: "Category", type: "text", value: row => CATEGORY_LABELS[String(row.category)] || text(row.category) },
    { key: "versionSource", label: "Version from", type: "text", value: row => VERSION_SOURCE_LABELS[String(row.versionSource)] || text(row.versionSource) },
    { key: "versionString", label: "Version output", type: "mono", value: row => text(row.versionString) },
    { key: "publisher", label: "Publisher", type: "text", value: row => text(row.publisher) },
    { key: "serviceName", label: "Service", type: "mono", value: row => text(row.serviceName) },
    ...TRAILING_COLUMNS,
  ],
  defaultColumns: ["deviceName", "name", "version", "runningState", "path", "source", "package", "collectedAt"],
  runsWithout: params => listParam(params, "categories").length > 0 ||
    (listParam(params, "running").length === 1 && listParam(params, "running")[0] === "yes"),
}

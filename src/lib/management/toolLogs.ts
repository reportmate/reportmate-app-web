/**
 * Fleet Management Tools Logs report (`/management/logs`): the response shape
 * of GET /api/v1/management/logs/fleet, a tolerant parser for it, the page's
 * URL parameters and the filters applied to the rows.
 *
 * The shape is the API's (reportmate-api #163, dashboard_insights
 * .shape_management_logs): `{hours, platform, filters, generatedAt, tools[],
 * messages[], devices[], devicesTruncated}`. The MDM agent's log root (`mdm`)
 * is dropped here as well, the same rule as the dashboard card.
 */

import { normalizeLogMessage } from "../modules/widgets/InsightWidgets";
import { paramList, toolProductLabel, type ToolLevel } from "../dashboard/reportRules";
import { normalizePlatform } from "../../providers/PlatformFilterProvider";
import { csvCell } from "../csv";

export const TOOL_LOGS_PATH = "/management/logs";
export const TOOL_LOGS_API = "/api/v1/management/logs/fleet";

/** The window selector: 24 hours (default, omitted from the URL) or 7 days. */
export const TOOL_LOG_WINDOWS = [24, 168] as const;
export type ToolLogWindow = (typeof TOOL_LOG_WINDOWS)[number];
export const DEFAULT_TOOL_LOG_WINDOW: ToolLogWindow = 24;

/** The MDM agent's root, excluded from the report like the dashboard card. */
export const EXCLUDED_TOOLS = new Set(["mdm"]);
export const isExcludedTool = (tool: string | null | undefined) =>
  EXCLUDED_TOOLS.has((tool || "").trim().toLowerCase());

export type ToolPlatform = "macOS" | "Windows" | null;

export interface ToolTrendPoint {
  /** UTC hour key, `YYYY-MM-DDTHH`, like levelSummary's keys. */
  hour: string;
  errors: number;
  warnings: number;
}

export interface ToolLogsTool {
  /** Log root key: installs, bootstrap, reports, state, … */
  tool: string;
  /** Product name for this platform (Munki, Cimian, …). */
  name: string;
  platform: ToolPlatform;
  devices: number;
  devicesWithErrors: number;
  devicesWithWarnings: number;
  errorLines: number;
  warningLines: number;
  /** Latest error or warning line in the window (ISO), or null. */
  lastSeen: string | null;
  trend: ToolTrendPoint[];
}

export interface ToolLogsMessage {
  /** The API's stable 12-character id; also the `message=` URL value. */
  id: string;
  /** The normalised message text. */
  message: string;
  tool: string;
  name: string;
  platform: ToolPlatform;
  /** The API lists error messages; older shapes may say otherwise. */
  level: ToolLevel;
  devices: number;
  lines: number;
  lastSeen: string | null;
  sample?: string;
}

export interface ToolLogsDevice {
  serialNumber: string;
  deviceName: string;
  platform: ToolPlatform;
  tool: string;
  name: string;
  errors: number;
  warnings: number;
  lastAt: string | null;
  /** Normalised messages the device logged, when the server sends them. */
  messages?: string[];
}

export interface ToolLogsReport {
  windowHours: number;
  generatedAt: string | null;
  tools: ToolLogsTool[];
  messages: ToolLogsMessage[];
  devices: ToolLogsDevice[];
  /** True when the API stopped at its device limit (1,000). */
  devicesTruncated: boolean;
}

/** The API's message ids: 12 hex characters. */
export const isMessageId = (value: string | null | undefined) => /^[0-9a-f]{12}$/.test((value || "").trim());

// MARK: - Parser

type Raw = Record<string, unknown>;

const obj = (v: unknown): Raw | null =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Raw) : null;
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const pick = (r: Raw, ...keys: string[]): unknown => {
  for (const k of keys) if (r[k] !== undefined && r[k] !== null) return r[k];
  return undefined;
};
const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : 0;
};
const str = (v: unknown): string => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "");

export function toolPlatform(value: unknown): ToolPlatform {
  const p = normalizePlatform(str(value));
  return p === "unknown" ? null : p;
}

/** An ISO time, or a `YYYY-MM-DDTHH` hour key read as that UTC hour. */
export function hourOrIso(value: unknown): string | null {
  const s = str(value).trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}$/.test(s)) return `${s}:00:00Z`;
  return isNaN(Date.parse(s)) ? null : s;
}

const lastOf = (r: Raw, ...keys: string[]) => hourOrIso(pick(r, ...keys, "lastAt", "last_at", "last_hour", "lastHour"));

function parseTrend(v: unknown): ToolTrendPoint[] {
  return arr(v)
    .map(obj)
    .filter((p): p is Raw => !!p && !!str(p.hour))
    .map(p => ({ hour: str(p.hour).slice(0, 13), errors: num(p.errors), warnings: num(p.warnings) }));
}

const levelOf = (v: unknown): ToolLevel => (/^warn/i.test(str(v)) ? "warning" : "error");

/** True when the platform-less key covers the given platform. */
const samePlatform = (a: ToolPlatform, b: ToolPlatform) => !a || !b || a === b;

/**
 * Reads a fleet logs document into the typed shape. Beyond the API's own
 * shape it accepts snake_case keys, hour keys for times, a top-level `trend`
 * of `{tool, platform, hour, errors, warnings}` rows and messages without ids
 * (the normalised text stands in), and drops the MDM root. Anything
 * unreadable yields an empty report rather than throwing.
 */
export function parseToolLogsReport(json: unknown): ToolLogsReport {
  const root = obj(json) ?? {};
  const body = obj(root.data) ?? root;

  const tools: ToolLogsTool[] = arr(pick(body, "tools", "perTool"))
    .map(obj)
    .filter((t): t is Raw => !!t && !!str(t.tool) && !isExcludedTool(str(t.tool)))
    .map(t => {
      const tool = str(t.tool).trim().toLowerCase();
      const platform = toolPlatform(t.platform);
      return {
        tool,
        name: str(t.name) || toolProductLabel(tool, platform),
        platform,
        devices: num(t.devices),
        devicesWithErrors: num(pick(t, "devicesWithErrors", "devices_with_errors")),
        devicesWithWarnings: num(pick(t, "devicesWithWarnings", "devices_with_warnings")),
        errorLines: num(pick(t, "errorLines", "error_lines")),
        warningLines: num(pick(t, "warningLines", "warning_lines")),
        lastSeen: lastOf(t, "lastSeen", "last_seen"),
        trend: parseTrend(t.trend),
      };
    });

  // A separate trend list folds into its tool rows.
  for (const p of arr(body.trend).map(obj)) {
    if (!p || isExcludedTool(str(p.tool)) || !str(p.hour)) continue;
    const tool = str(p.tool).trim().toLowerCase();
    const platform = toolPlatform(p.platform);
    const row = tools.find(t => t.tool === tool && samePlatform(t.platform, platform));
    if (!row) continue;
    const hour = str(p.hour).slice(0, 13);
    const point = row.trend.find(x => x.hour === hour);
    if (point) {
      point.errors += num(p.errors);
      point.warnings += num(p.warnings);
    } else row.trend.push({ hour, errors: num(p.errors), warnings: num(p.warnings) });
  }
  for (const t of tools) t.trend.sort((a, b) => a.hour.localeCompare(b.hour));

  // Messages group by tool, platform, level and normalised text.
  const grouped = new Map<string, ToolLogsMessage>();
  for (const m of arr(pick(body, "messages", "topErrors", "patterns")).map(obj)) {
    if (!m) continue;
    const tool = str(m.tool).trim().toLowerCase();
    const raw = str(m.message);
    if (!tool || !raw.trim() || isExcludedTool(tool)) continue;
    const platform = toolPlatform(m.platform);
    const text = normalizeLogMessage(raw);
    const id = str(m.id).trim() || text;
    const level = m.level === undefined ? "error" : levelOf(m.level);
    const key = `${tool}\u0000${platform ?? ""}\u0000${level}\u0000${id}`;
    const lastSeen = lastOf(m, "lastSeen", "last_seen");
    const prior = grouped.get(key);
    if (prior) {
      prior.devices += num(m.devices);
      prior.lines += num(m.lines);
      if (lastSeen && (!prior.lastSeen || Date.parse(lastSeen) > Date.parse(prior.lastSeen))) prior.lastSeen = lastSeen;
    } else {
      grouped.set(key, {
        id,
        message: text,
        tool,
        name: str(m.name) || toolProductLabel(tool, platform),
        platform,
        level,
        devices: num(m.devices),
        lines: num(m.lines),
        lastSeen,
        sample: str(m.sample) || raw,
      });
    }
  }

  const devices: ToolLogsDevice[] = arr(pick(body, "devices", "results"))
    .map(obj)
    .filter((d): d is Raw => !!d && !!str(pick(d, "serialNumber", "serial_number", "serial")) && !isExcludedTool(str(d.tool)))
    .map(d => {
      const serialNumber = str(pick(d, "serialNumber", "serial_number", "serial"));
      const tool = str(d.tool).trim().toLowerCase();
      const platform = toolPlatform(d.platform);
      const counts = obj(d.counts);
      const messages = arr(d.messages).map(x => str(obj(x)?.message ?? x)).filter(Boolean).map(normalizeLogMessage);
      return {
        serialNumber,
        deviceName: str(pick(d, "deviceName", "device_name", "name")) || serialNumber,
        platform,
        tool,
        name: str(d.toolName) || toolProductLabel(tool, platform),
        errors: num(pick(d, "errors", "errorLines")) || num(counts?.error),
        warnings: num(pick(d, "warnings", "warningLines")) || num(counts?.warning),
        lastAt: lastOf(d, "lastAt", "last_at", "lastSeen"),
        ...(Array.isArray(d.messages) ? { messages } : {}),
      };
    });

  return {
    windowHours: num(pick(body, "hours", "windowHours", "window_hours")) || DEFAULT_TOOL_LOG_WINDOW,
    generatedAt: hourOrIso(pick(body, "generatedAt", "generated_at")),
    tools,
    messages: [...grouped.values()].sort((a, b) => b.devices - a.devices || b.lines - a.lines || a.id.localeCompare(b.id)),
    devices,
    devicesTruncated: body.devicesTruncated === true,
  };
}

/** The API's `{error}` answer (a 200 when a card's query failed), or null. */
export function reportError(json: unknown): string | null {
  const r = obj(json);
  if (!r || r.tools !== undefined) return null;
  return typeof r.error === "string" ? r.error : r.error ? String(r.error) : null;
}

// MARK: - URL parameters

export interface ToolLogsFilters {
  /** Tool keys, `tool=installs,reports`; empty means all. */
  tools: string[];
  level: ToolLevel | null;
  hours: ToolLogWindow;
  /** A message id, `message=` (normalised text is accepted too). */
  message: string;
}

export const EMPTY_TOOL_LOG_FILTERS: ToolLogsFilters = {
  tools: [],
  level: null,
  hours: DEFAULT_TOOL_LOG_WINDOW,
  message: "",
};

/** The parameters this page owns; `platform` belongs to the global toggle. */
export const TOOL_LOG_PARAMS = ["tool", "level", "hours", "message"] as const;

export function parseToolLogsParams(sp: URLSearchParams): ToolLogsFilters {
  const level = (sp.get("level") || "").trim().toLowerCase();
  const hours = Number(sp.get("hours"));
  return {
    tools: [...new Set(paramList(sp.get("tool")).map(t => t.toLowerCase()).filter(t => !isExcludedTool(t)))],
    level: level === "error" || level === "warning" ? level : null,
    hours: hours === 168 ? 168 : DEFAULT_TOOL_LOG_WINDOW,
    message: (sp.get("message") || "").trim(),
  };
}

/** Query string with commas left readable (`tool=installs,reports`). */
export const commaQuery = (qs: string) => qs.replace(/%2C/gi, ",");

/**
 * The page URL's query for these filters: other parameters (platform, from)
 * kept, the owned ones rewritten with defaults omitted.
 */
export function writeToolLogsParams(current: URLSearchParams | string, f: ToolLogsFilters): string {
  const params = new URLSearchParams(current);
  for (const key of TOOL_LOG_PARAMS) params.delete(key);
  if (f.tools.length) params.set("tool", f.tools.join(","));
  if (f.level) params.set("level", f.level);
  if (f.hours !== DEFAULT_TOOL_LOG_WINDOW) params.set("hours", String(f.hours));
  if (f.message) params.set("message", f.message);
  return commaQuery(params.toString());
}

/**
 * The API query, also the cache key's tail. The API takes one tool key and a
 * message id, so several tools, or a message given as text, are narrowed in
 * the browser instead.
 */
export function toolLogsApiQuery(f: ToolLogsFilters, platform: string): string {
  const params = new URLSearchParams({ hours: String(f.hours) });
  if (f.tools.length === 1) params.set("tool", f.tools[0]);
  if (f.level) params.set("level", f.level);
  if (isMessageId(f.message)) params.set("message", f.message.trim());
  const p = normalizePlatform(platform);
  if (p !== "unknown") params.set("platform", p);
  return commaQuery(params.toString());
}

// MARK: - Filtering

/**
 * The message row a `message=` value names: its id, else the exact normalised
 * text, else the text case-insensitively. Restricted to the selected tools
 * when there are any.
 */
export function matchMessage(
  messages: ToolLogsMessage[],
  value: string,
  tools: string[] = [],
): ToolLogsMessage | undefined {
  const v = (value || "").trim();
  if (!v) return undefined;
  const pool = tools.length ? messages.filter(m => tools.includes(m.tool)) : messages;
  const byId = pool.find(m => m.id === v);
  if (byId) return byId;
  const wanted = normalizeLogMessage(v);
  return (
    pool.find(m => m.message === wanted) ??
    pool.find(m => m.message.toLowerCase() === wanted.toLowerCase())
  );
}

const messageEquals = (a: string, b: string) => a === b || a.toLowerCase() === b.toLowerCase();
const messageMatches = (m: ToolLogsMessage, value: string, wanted: string) =>
  m.id === value || messageEquals(m.message, wanted);

const platformVisible = (rowPlatform: ToolPlatform, platform: string) => {
  const p = normalizePlatform(platform);
  return p === "unknown" || !rowPlatform || rowPlatform === p;
};

/**
 * Applies the filters to a report in the browser as well, so the rows match
 * the URL even when the server returns more than asked (or a cached answer
 * from a wider query is on screen).
 */
export function filterToolLogs(report: ToolLogsReport, f: ToolLogsFilters, platform: string): ToolLogsReport {
  const toolOk = (tool: string) => !f.tools.length || f.tools.includes(tool);
  const value = f.message.trim();
  const wanted = value ? normalizeLogMessage(value) : "";
  const tools = report.tools.filter(
    t =>
      toolOk(t.tool) &&
      platformVisible(t.platform, platform) &&
      (f.level !== "error" || t.devicesWithErrors > 0 || t.errorLines > 0) &&
      (f.level !== "warning" || t.devicesWithWarnings > 0 || t.warningLines > 0),
  );
  const messages = report.messages.filter(
    m =>
      toolOk(m.tool) &&
      platformVisible(m.platform, platform) &&
      (!value || messageMatches(m, value, wanted)),
  );
  const devices = report.devices.filter(
    d =>
      toolOk(d.tool) &&
      platformVisible(d.platform, platform) &&
      (f.level !== "error" || d.errors > 0) &&
      (f.level !== "warning" || d.warnings > 0) &&
      // Without per-device messages the server has already narrowed the list.
      (!wanted || !d.messages || d.messages.some(m => messageEquals(m, wanted))),
  );
  return { ...report, tools, messages, devices };
}

// MARK: - Links and export

/** The device page's management tab, opened on this tool's log lines. */
export function deviceLogHref(d: Pick<ToolLogsDevice, "serialNumber" | "tool" | "errors">, level: ToolLevel | null): string {
  const lvl: ToolLevel = level ?? (d.errors > 0 ? "error" : "warning");
  const params = new URLSearchParams({ tab: "management", tool: d.tool, level: lvl });
  return `/device/${encodeURIComponent(d.serialNumber)}?${params.toString()}`;
}

/**
 * The window's trend as evenly spaced buckets ending at `end`: hourly for a
 * day, six-hourly for a week. Hours with no lines are zero.
 */
export function trendBuckets(
  trend: ToolTrendPoint[],
  windowHours: number,
  end: number = Date.now(),
): { errors: number; warnings: number }[] {
  const step = windowHours > 48 ? 6 : 1;
  const count = Math.max(1, Math.ceil(windowHours / step));
  const endHour = Math.floor(end / 3600000);
  const startHour = endHour - count * step + 1;
  const buckets = Array.from({ length: count }, () => ({ errors: 0, warnings: 0 }));
  for (const p of trend) {
    const t = Date.parse(`${p.hour.slice(0, 13)}:00:00Z`);
    if (isNaN(t)) continue;
    const i = Math.floor((Math.floor(t / 3600000) - startHour) / step);
    if (i < 0 || i >= count) continue;
    buckets[i].errors += p.errors;
    buckets[i].warnings += p.warnings;
  }
  return buckets;
}


export function toolLogsDevicesCsv(devices: ToolLogsDevice[]): string {
  const header = ["Device Name", "Serial Number", "Platform", "Tool", "Tool Key", "Errors", "Warnings", "Last At"];
  const rows = devices.map(d =>
    [d.deviceName, d.serialNumber, d.platform ?? "", d.name, d.tool, d.errors, d.warnings, d.lastAt ?? ""].map(csvCell).join(","),
  );
  return [header.join(","), ...rows].join("\n");
}

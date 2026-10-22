/**
 * Dashboard insight widgets: System Health, Security Posture, Management and
 * Hardware. Each card is built from the bulk report its own page reads
 * (/api/v1/system, /security, /management, /hardware), so the numbers match
 * the report a click away. Ported from the native Mac app's InsightWidgets.swift.
 */

"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { normalizePlatform } from "../../../providers/PlatformFilterProvider";

type Row = Record<string, any>;
type ReportKey = "system" | "security" | "management" | "hardware";

const REPORTS: ReportKey[] = ["system", "security", "management", "hardware"];
const REFRESH_MS = 5 * 60 * 1000;

// MARK: - Loading

export interface InsightsState {
  rows: Record<ReportKey, Row[]>;
  loading: Set<ReportKey>;
  errors: Partial<Record<ReportKey, string>>;
}

function extractRows(json: any): Row[] {
  if (Array.isArray(json)) return json;
  for (const key of ["devices", "data", "items", "results"]) {
    if (Array.isArray(json?.[key])) return json[key];
  }
  return [];
}

async function fetchReport(key: ReportKey): Promise<Row[]> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`/api/v1/${key}`, {
        cache: "no-store",
        credentials: "include",
      });
      if (res.ok) return extractRows(await res.json());
      if (res.status < 500 || attempt === 1)
        throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      if (attempt === 1) throw err;
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  return [];
}

/**
 * Loads the four reports two at a time (each bulk report is slow, and four at
 * once has had the gateway answer 503 for the last), one retry on a 5xx or a
 * dropped connection, and refreshes every five minutes.
 */
export function useDashboardInsights(): InsightsState {
  const [state, setState] = useState<InsightsState>({
    rows: { system: [], security: [], management: [], hardware: [] },
    loading: new Set(REPORTS),
    errors: {},
  });
  const active = useRef(true);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: new Set(REPORTS) }));
    const queue = [...REPORTS];
    const worker = async () => {
      while (queue.length && active.current) {
        const key = queue.shift()!;
        try {
          const rows = await fetchReport(key);
          if (!active.current) return;
          setState((s) => {
            const loading = new Set(s.loading);
            loading.delete(key);
            const errors = { ...s.errors };
            delete errors[key];
            return { rows: { ...s.rows, [key]: rows }, loading, errors };
          });
        } catch (err) {
          if (!active.current) return;
          setState((s) => {
            const loading = new Set(s.loading);
            loading.delete(key);
            return {
              ...s,
              loading,
              errors: {
                ...s.errors,
                [key]: err instanceof Error ? err.message : "Failed to load",
              },
            };
          });
        }
      }
    };
    await Promise.all([worker(), worker()]);
  }, []);

  useEffect(() => {
    active.current = true;
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      active.current = false;
      clearInterval(timer);
    };
  }, [load]);

  return state;
}

// MARK: - Row readers (same rules as the report pages and the Mac app)

const boolish = (v: any): boolean => {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string")
    return ["true", "1", "yes"].includes(v.trim().toLowerCase());
  return false;
};
const boolishIfPresent = (v: any): boolean | null => {
  if (v === null || v === undefined) return null;
  if (
    typeof v === "string" &&
    !["true", "false", "1", "0", "yes", "no"].includes(v.trim().toLowerCase())
  )
    return null;
  return boolish(v);
};
const num = (v: any): number => {
  const n =
    typeof v === "number" ? v : typeof v === "string" ? parseFloat(v) : NaN;
  return Number.isFinite(n) ? n : 0;
};
const rowPlatform = (r: Row) =>
  normalizePlatform(r.platform || r.osName || r.operatingSystem || "");

function uptimeSeconds(r: Row): number | null {
  if (typeof r.uptime === "number") return r.uptime;
  const text: string | undefined = r.uptimeString;
  if (!text) return null;
  let total = 0,
    matched = false;
  for (const [unit, factor] of [
    ["d", 86400],
    ["h", 3600],
    ["m", 60],
    ["s", 1],
  ] as const) {
    const m = text.match(new RegExp(`(\\d+)\\s*${unit}\\b`));
    if (m) {
      total += parseInt(m[1], 10) * factor;
      matched = true;
    }
  }
  return matched ? total : null;
}

const UPTIME_BUCKETS = [
  { label: "< 1 day", max: 86400 },
  { label: "1-3 days", max: 259200 },
  { label: "3-7 days", max: 604800 },
  { label: "1-2 weeks", max: 1209600 },
  { label: "2-4 weeks", max: 2592000 },
  { label: "30+ days", max: Infinity },
];

function memoryBytes(r: Row): number {
  const m = r.memory;
  if (m && typeof m === "object") {
    if (typeof m.totalFormatted === "string") {
      const match = m.totalFormatted.match(/(\d+(?:\.\d+)?)\s*GB/i);
      if (match) return parseFloat(match[1]) * 1073741824;
    }
    for (const key of ["physical_memory", "physicalMemory", "totalPhysical"]) {
      if (m[key] !== undefined) return num(m[key]);
    }
    return 0;
  }
  return num(m);
}

function storageBytes(r: Row): { total: number; free: number } {
  const drives: Row[] = Array.isArray(r.storage)
    ? r.storage.filter((d: Row) => d?.isInternal !== false)
    : [];
  return drives.reduce<{ total: number; free: number }>(
    (acc, d) => ({
      total: acc.total + num(d.size ?? d.capacity),
      free: acc.free + num(d.freeSpace ?? d.free ?? d.available ?? d.freeBytes),
    }),
    { total: 0, free: 0 },
  );
}

function processorText(r: Row): string {
  const p = r.processor ?? r.cpu;
  if (typeof p === "string") return p;
  return String(p?.name || p?.model || p?.brand || "");
}

function archFamily(r: Row): string {
  const proc = processorText(r).toLowerCase();
  const p = r.processor ?? r.cpu;
  const arch = String(
    r.architecture || (typeof p === "object" ? p?.architecture : "") || "",
  ).toLowerCase();
  if (rowPlatform(r) === "Windows") {
    return arch.includes("arm") ||
      proc.includes("snapdragon") ||
      proc.includes("qualcomm")
      ? "ARM64"
      : "x64";
  }
  if (arch.includes("arm") || proc.includes("apple")) return "Apple Silicon";
  return !arch && !proc ? "Unknown" : "Intel";
}

function isLaptop(r: Row): boolean {
  const m = String(r.model || "").toLowerCase();
  if (
    [
      "desktop",
      "optiplex",
      "precision",
      "workstation",
      "tower",
      "sff",
      "imac",
      "mac pro",
      "mac studio",
    ].some((w) => m.includes(w))
  )
    return false;
  return [
    "laptop",
    "book",
    "thinkpad",
    "macbook",
    "pavilion",
    "inspiron",
    "latitude",
    "elitebook",
    "probook",
    "yoga",
    "ideapad",
    "surface laptop",
  ].some((w) => m.includes(w));
}

// MARK: - Shared chrome

const TONES = {
  green: {
    icon: "bg-green-100 dark:bg-green-900",
    text: "text-green-600 dark:text-green-400",
    hex: "#10b981",
  },
  yellow: {
    icon: "bg-yellow-100 dark:bg-yellow-900",
    text: "text-yellow-600 dark:text-yellow-400",
    hex: "#eab308",
  },
  orange: {
    icon: "bg-orange-100 dark:bg-orange-900",
    text: "text-orange-600 dark:text-orange-400",
    hex: "#f97316",
  },
  red: {
    icon: "bg-red-100 dark:bg-red-900",
    text: "text-red-600 dark:text-red-400",
    hex: "#ef4444",
  },
  purple: {
    icon: "bg-purple-100 dark:bg-purple-900",
    text: "text-purple-600 dark:text-purple-400",
    hex: "#a855f7",
  },
  teal: {
    icon: "bg-teal-100 dark:bg-teal-900",
    text: "text-teal-600 dark:text-teal-400",
    hex: "#14b8a6",
  },
  blue: {
    icon: "bg-blue-100 dark:bg-blue-900",
    text: "text-blue-600 dark:text-blue-400",
    hex: "#3b82f6",
  },
} as const;
type Tone = keyof typeof TONES;

function InsightCard({
  title,
  subtitle,
  href,
  tone,
  icon,
  loading,
  error,
  empty,
  children,
}: {
  title: string;
  subtitle: string;
  href: string;
  tone: Tone;
  icon: React.ReactNode;
  loading: boolean;
  error?: string;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <Link href={href} className="block">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 ${TONES[tone].icon} rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform`}
            >
              <svg
                className={`w-6 h-6 ${TONES[tone].text}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {icon}
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {subtitle}
              </p>
            </div>
          </div>
        </div>
      </Link>
      <div className="p-6">
        {error && empty ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
        ) : loading && empty ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
          </div>
        ) : empty ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">No data</p>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function ComplianceRow({
  label,
  on,
  total,
}: {
  label: string;
  on: number;
  total: number;
}) {
  const pct = total === 0 ? 0 : on / total;
  const tone: Tone = pct >= 0.9 ? "green" : pct >= 0.7 ? "yellow" : "red";
  return (
    <div>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-900 dark:text-gray-100 flex-1 truncate">
          {label}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
          {on} of {total}
        </span>
        <span
          className={`text-xs font-medium tabular-nums w-10 text-right ${TONES[tone].text}`}
        >
          {Math.round(pct * 100)}%
        </span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct * 100}%`, backgroundColor: TONES[tone].hex }}
        />
      </div>
    </div>
  );
}

function StatChip({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: Tone;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
      <span
        className={`text-sm font-semibold tabular-nums ${value === 0 ? "text-gray-400 dark:text-gray-500" : TONES[tone].text}`}
      >
        {value}
      </span>
      <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
    </span>
  );
}

function Donut({
  data,
  center,
}: {
  data: { label: string; count: number; color: string }[];
  center?: string;
}) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const r = 38,
    c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex items-center gap-4">
      <div className="relative w-24 h-24 shrink-0">
        <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90">
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            strokeWidth="13"
            className="stroke-gray-100 dark:stroke-gray-700"
          />
          {total > 0 &&
            data.map((d) => {
              const len = (d.count / total) * c;
              const el = (
                <circle
                  key={d.label}
                  cx="50"
                  cy="50"
                  r={r}
                  fill="none"
                  stroke={d.color}
                  strokeWidth="13"
                  strokeDasharray={`${len} ${c - len}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += len;
              return el;
            })}
        </svg>
        {center && (
          <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
            {center}
          </span>
        )}
      </div>
      <ul className="flex-1 min-w-0 space-y-1.5">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2 text-sm">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: d.color }}
            />
            <span className="text-gray-900 dark:text-gray-100 truncate flex-1">
              {d.label}
            </span>
            <span className="font-medium tabular-nums text-gray-900 dark:text-gray-100">
              {d.count}
            </span>
            <span className="text-xs text-gray-400 tabular-nums w-9 text-right">
              {total ? `${Math.round((d.count / total) * 100)}%` : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface WidgetProps {
  rows: Row[];
  loading: boolean;
  error?: string;
}

// MARK: - System health

export function SystemHealthWidget({ rows, loading, error }: WidgetProps) {
  const stats = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const r of rows) {
      const s = uptimeSeconds(r);
      if (!s || s <= 0) continue;
      const b = UPTIME_BUCKETS.find((b) => s < b.max)!;
      buckets.set(b.label, (buckets.get(b.label) || 0) + 1);
    }
    return {
      buckets,
      pending: rows.filter((r) => num(r.pendingUpdatesCount) > 0).length,
      deferred: rows.filter((r) => num(r.deferredUpdatesCount) > 0).length,
    };
  }, [rows]);
  const max = Math.max(1, ...stats.buckets.values());
  return (
    <InsightCard
      title="System Health"
      subtitle="Uptime and pending updates"
      href="/system"
      tone="orange"
      loading={loading}
      error={error}
      empty={rows.length === 0}
      icon={
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      }
    >
      <p className="text-[11px] font-semibold tracking-wide text-gray-500 dark:text-gray-400 mb-2">
        UPTIME
      </p>
      <ul className="space-y-1.5">
        {UPTIME_BUCKETS.map((b) => {
          const count = stats.buckets.get(b.label) || 0;
          return (
            <li key={b.label}>
              <Link
                href={`/system`}
                className="flex items-center gap-2 text-sm"
              >
                <span className="w-24 shrink-0 text-gray-900 dark:text-gray-100">
                  {b.label}
                </span>
                <span className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                  <span
                    className="block h-full rounded-full bg-orange-500"
                    style={{ width: `${(count / max) * 100}%` }}
                  />
                </span>
                <span className="w-10 text-right font-medium tabular-nums text-gray-900 dark:text-gray-100">
                  {count}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap gap-2 mt-4">
        <StatChip
          value={stats.pending}
          label="with pending updates"
          tone="yellow"
        />
        <StatChip
          value={stats.deferred}
          label="with deferred updates"
          tone="orange"
        />
      </div>
    </InsightCard>
  );
}

// MARK: - Security posture

export function SecurityPostureWidget({ rows, loading, error }: WidgetProps) {
  const s = useMemo(() => {
    const isWin = (r: Row) => rowPlatform(r) === "Windows";
    const macs = rows.filter((r) => !isWin(r));
    const wins = rows.filter(isWin);
    const protectors = rows.filter(
      (r) => isWin(r) || boolish(r.antivirusEnabled) || !!r.antivirusName,
    );
    const sipRows = macs.filter((r) => boolishIfPresent(r.sipEnabled) !== null);
    const threats = (r: Row) => num(r.activeThreatCount ?? r.detectionCount);
    const expired = (r: Row) =>
      num(r.userExpiredCertCount ?? r.expiredCertCount);
    return {
      total: rows.length,
      encryption: rows.filter((r) => boolish(r.encryptionEnabled)).length,
      firewall: rows.filter((r) => boolish(r.firewallEnabled)).length,
      protectors: protectors.length,
      antivirus: protectors.filter((r) => boolish(r.antivirusEnabled)).length,
      sipTotal: sipRows.length,
      sip: sipRows.filter((r) => boolishIfPresent(r.sipEnabled) === true)
        .length,
      winTotal: wins.length,
      secureBoot: wins.filter((r) => boolish(r.secureBootEnabled)).length,
      withThreats: rows.filter((r) => threats(r) > 0).length,
      expiredCerts: rows.filter((r) => expired(r) > 0).length,
      criticalCves: rows.filter((r) => num(r.criticalCveCount) > 0).length,
    };
  }, [rows]);
  return (
    <InsightCard
      title="Security Posture"
      subtitle="Fleet-wide protections in place"
      href="/security"
      tone="green"
      loading={loading}
      error={error}
      empty={rows.length === 0}
      icon={
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      }
    >
      <div className="space-y-3">
        <ComplianceRow
          label="Disk encryption"
          on={s.encryption}
          total={s.total}
        />
        <ComplianceRow label="Firewall" on={s.firewall} total={s.total} />
        {s.protectors > 0 && (
          <ComplianceRow
            label="Antivirus protection"
            on={s.antivirus}
            total={s.protectors}
          />
        )}
        {s.sipTotal > 0 && (
          <ComplianceRow
            label="System Integrity Protection"
            on={s.sip}
            total={s.sipTotal}
          />
        )}
        {s.winTotal > 0 && (
          <ComplianceRow
            label="Secure Boot"
            on={s.secureBoot}
            total={s.winTotal}
          />
        )}
      </div>
      <div className="flex flex-wrap gap-2 mt-4">
        <StatChip value={s.withThreats} label="with threats" tone="red" />
        <StatChip value={s.expiredCerts} label="expired certs" tone="yellow" />
        <StatChip value={s.criticalCves} label="critical CVEs" tone="orange" />
      </div>
    </InsightCard>
  );
}

// MARK: - Management

export function ManagementInsightWidget({ rows, loading, error }: WidgetProps) {
  const s = useMemo(() => {
    const providers = new Map<string, number>();
    let enrolled = 0;
    for (const r of rows) {
      if (!boolish(r.isEnrolled)) continue;
      enrolled++;
      let p: string = r.provider || "Unknown";
      if (p.startsWith("Microsoft Intune")) p = "Microsoft Intune";
      providers.set(p, (providers.get(p) || 0) + 1);
    }
    const top = [...providers.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 4);
    return { total: rows.length, enrolled, top };
  }, [rows]);
  const max = s.top[0]?.[1] || 1;
  const pct = s.total ? Math.round((s.enrolled / s.total) * 100) : 0;
  return (
    <InsightCard
      title="Management"
      subtitle="MDM enrollment across the fleet"
      href="/management"
      tone="purple"
      loading={loading}
      error={error}
      empty={rows.length === 0}
      icon={
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
        />
      }
    >
      <Donut
        center={`${pct}%`}
        data={[
          { label: "Enrolled", count: s.enrolled, color: TONES.green.hex },
          {
            label: "Not Enrolled",
            count: s.total - s.enrolled,
            color: "#9ca3af",
          },
        ]}
      />
      {s.top.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] font-semibold tracking-wide text-gray-500 dark:text-gray-400 mb-2">
            PROVIDERS
          </p>
          <ul className="space-y-1.5">
            {s.top.map(([name, count]) => (
              <li key={name} className="flex items-center gap-2 text-sm">
                <span className="flex-1 truncate text-gray-900 dark:text-gray-100">
                  {name}
                </span>
                <span
                  className="h-1.5 rounded-full bg-purple-400/50"
                  style={{ width: `${(count / max) * 70}px` }}
                />
                <span className="w-10 text-right font-medium tabular-nums text-gray-900 dark:text-gray-100">
                  {count}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </InsightCard>
  );
}

// MARK: - Hardware

const FAMILY_COLORS: Record<string, string> = {
  "Apple Silicon": "#3b82f6",
  Intel: "#6366f1",
  ARM64: "#14b8a6",
  x64: "#06b6d4",
  Unknown: "#9ca3af",
};

export function HardwareInsightWidget({ rows, loading, error }: WidgetProps) {
  const s = useMemo(() => {
    const families = new Map<string, number>();
    let lowStorage = 0,
      lowMemory = 0,
      laptops = 0;
    for (const r of rows) {
      const f = archFamily(r);
      families.set(f, (families.get(f) || 0) + 1);
      const { total, free } = storageBytes(r);
      if (total > 0 && free > 0 && free / total < 0.1) lowStorage++;
      const mem = memoryBytes(r);
      if (mem > 0 && mem <= 8 * 1073741824) lowMemory++;
      if (isLaptop(r)) laptops++;
    }
    const data = [...families.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([label, count]) => ({
        label,
        count,
        color: FAMILY_COLORS[label] || "#9ca3af",
      }));
    return { count: rows.length, data, lowStorage, lowMemory, laptops };
  }, [rows]);
  return (
    <InsightCard
      title="Hardware"
      subtitle="Architecture, memory and storage"
      href="/hardware"
      tone="teal"
      loading={loading}
      error={error}
      empty={rows.length === 0}
      icon={
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
        />
      }
    >
      <Donut data={s.data} center={String(s.count)} />
      <div className="flex flex-wrap gap-2 mt-4">
        <StatChip value={s.lowStorage} label="under 10% free" tone="red" />
        <StatChip value={s.lowMemory} label="8 GB or less" tone="yellow" />
        <StatChip value={s.laptops} label="laptops" tone="blue" />
      </div>
    </InsightCard>
  );
}

/** The four cards, filtered by the toolbar's platform toggle. */
export function DashboardInsights({
  insights,
  isPlatformVisible,
  className = "",
}: {
  insights: InsightsState;
  isPlatformVisible: (platform: string) => boolean;
  className?: string;
}) {
  const pick = (key: ReportKey) => {
    const rows = insights.rows[key].filter((r) =>
      isPlatformVisible(rowPlatform(r)),
    );
    return {
      rows,
      loading: insights.loading.has(key),
      error: insights.errors[key],
    };
  };
  return (
    <div className={className}>
      <SystemHealthWidget {...pick("system")} />
      <SecurityPostureWidget {...pick("security")} />
      <ManagementInsightWidget {...pick("management")} />
      <HardwareInsightWidget {...pick("hardware")} />
    </div>
  );
}

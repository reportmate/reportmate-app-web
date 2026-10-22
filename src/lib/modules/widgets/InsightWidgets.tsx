/**
 * Dashboard insight cards. docs/DASHBOARD-WIDGETS.md is the contract shared
 * with the Swift and C# apps: the same twelve cards, the same numbers and the
 * same click targets. Each card reads an endpoint its report page already
 * uses, and every number, bar, legend row and chip links to that report with
 * the matching filter set. The classification rules live in
 * src/lib/dashboard/reportRules.ts, which the reports filter with too.
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
import {
  type Row,
  JOIN_LABELS,
  type JoinType,
  SECURITY_PARAM_RULES,
  archFamily,
  boolish,
  boolishIfPresent,
  connectionKind,
  deviceRoom,
  displayCount,
  expiredCerts,
  hasAntivirusProduct,
  hasDeferredUpdates,
  hasExtraAdmins,
  isLaptop,
  isLowMemory,
  isLowStorage,
  isSilentAgent,
  SILENT_AGENT_DAYS,
  isWeakSignal,
  joinType,
  managementProvider,
  num,
  osCurrency,
  pendingBucketKey,
  printerCount,
  rowPlatform,
  securityThreats,
  uptimeBucketKey,
  usageKind,
} from "../../dashboard/reportRules";
import { getDeviceInstallItems, isErrorItem } from "../../installs/status";
import type { InstallStatsData } from "./DashboardStats";

const REFRESH_MS = 5 * 60 * 1000;

// MARK: - Loading

/**
 * One fetch per endpoint, shared by every card that reads it. The order is
 * the load order: the install filters payload is ~17 MB and sometimes answers
 * 502, so it goes last and the cards treat it as optional.
 */
const ENDPOINTS = {
  system: "/api/v1/system",
  security: "/api/v1/security",
  management: "/api/v1/management",
  hardware: "/api/v1/hardware",
  failures: "/api/events/failures?hours=24",
  certs: "/api/v1/security/certificates?status=expiring",
  identity: "/api/v1/identity",
  usage: "/api/v1/applications/usage?days=30",
  network: "/api/v1/network",
  peripherals: "/api/v1/peripherals",
  installFilters: "/api/v1/installs/filters",
} as const;

export type ReportKey = keyof typeof ENDPOINTS;
const REPORTS = Object.keys(ENDPOINTS) as ReportKey[];

export interface InsightsState {
  data: Partial<Record<ReportKey, any>>;
  loading: Set<ReportKey>;
  errors: Partial<Record<ReportKey, string>>;
}

export function extractRows(json: any): Row[] {
  if (Array.isArray(json)) return json;
  for (const key of ["devices", "data", "items", "results"]) {
    if (Array.isArray(json?.[key])) return json[key];
  }
  return [];
}

/** Payloads too heavy to ask for twice: one attempt per load, never retried. */
const NO_RETRY: ReadonlySet<ReportKey> = new Set(["installFilters"]);

async function fetchReport(key: ReportKey): Promise<any> {
  const attempts = NO_RETRY.has(key) ? 1 : 2;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const res = await fetch(ENDPOINTS[key], {
        cache: "no-store",
        credentials: "include",
      });
      if (res.ok) return await res.json();
      if (res.status < 500 || attempt === attempts - 1)
        throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      if (attempt === attempts - 1) throw err;
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  return null;
}

/**
 * Loads every report the cards read, two at a time, with one retry on a 5xx
 * or a dropped connection, and refreshes every five minutes. A refresh keeps
 * the last good payload on screen while it runs and if it fails.
 */
export function useDashboardInsights(): InsightsState {
  const [state, setState] = useState<InsightsState>({
    data: {},
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
          const json = await fetchReport(key);
          if (!active.current) return;
          setState((s) => {
            const loading = new Set(s.loading);
            loading.delete(key);
            const errors = { ...s.errors };
            delete errors[key];
            return { data: { ...s.data, [key]: json }, loading, errors };
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

// MARK: - Layout

export type InsightLayout = "narrow" | "desktop" | "wide";

/** Tracks the `desktop` (1680px) and `wide` (2200px) breakpoints in tailwind.config.ts. */
export function useInsightLayout(): InsightLayout {
  const [layout, setLayout] = useState<InsightLayout>("narrow");
  useEffect(() => {
    const wide = window.matchMedia("(min-width: 2200px)");
    const desktop = window.matchMedia("(min-width: 1680px)");
    const update = () =>
      setLayout(wide.matches ? "wide" : desktop.matches ? "desktop" : "narrow");
    update();
    wide.addEventListener("change", update);
    desktop.addEventListener("change", update);
    return () => {
      wide.removeEventListener("change", update);
      desktop.removeEventListener("change", update);
    };
  }, []);
  return layout;
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
  indigo: {
    icon: "bg-indigo-100 dark:bg-indigo-900",
    text: "text-indigo-600 dark:text-indigo-400",
    hex: "#6366f1",
  },
  gray: {
    icon: "bg-gray-100 dark:bg-gray-700",
    text: "text-gray-600 dark:text-gray-300",
    hex: "#9ca3af",
  },
} as const;
type Tone = keyof typeof TONES;

const ROW_LINK =
  "rounded-md -mx-1.5 px-1.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors";

/** Builds `path?k=v&…`, dropping empty values. */
const href = (path: string, params: Record<string, string | number> = {}) => {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params))
    if (v !== "" && v !== undefined) q.set(k, String(v));
  const s = q.toString();
  return s ? `${path}?${s}` : path;
};

function InsightCard({
  title,
  subtitle,
  link,
  tone,
  icon,
  loading,
  error,
  empty,
  children,
}: {
  title: string;
  subtitle: string;
  link: string;
  tone: Tone;
  icon: React.ReactNode;
  loading: boolean;
  error?: string;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <Link href={link} className="block">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 shrink-0 ${TONES[tone].icon} rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform`}
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
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                {subtitle}
              </p>
            </div>
          </div>
        </div>
      </Link>
      <div className="p-6">
        {error && empty ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Couldn&apos;t load this report ({error}). It retries every five
            minutes.
          </p>
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold tracking-wide text-gray-500 dark:text-gray-400 mb-2 uppercase">
      {children}
    </p>
  );
}

function ComplianceRow({
  label,
  on,
  total,
  link,
}: {
  label: string;
  on: number;
  total: number;
  link: string;
}) {
  const pct = total === 0 ? 0 : on / total;
  const tone: Tone = pct >= 0.9 ? "green" : pct >= 0.7 ? "yellow" : "red";
  return (
    <Link
      href={link}
      className={`block py-0.5 ${ROW_LINK}`}
      title={`${total - on} without ${label.toLowerCase()}`}
    >
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
    </Link>
  );
}

function StatChip({
  value,
  label,
  tone,
  link,
}: {
  value: number;
  label: string;
  tone: Tone;
  link: string;
}) {
  return (
    <Link
      href={link}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors"
    >
      <span
        className={`text-sm font-semibold tabular-nums ${value === 0 ? "text-gray-400 dark:text-gray-500" : TONES[tone].text}`}
      >
        {value}
      </span>
      <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
    </Link>
  );
}

/** A large number with a caption, as a link. */
function BigStat({
  value,
  label,
  tone,
  link,
}: {
  value: number | string;
  label: string;
  tone: Tone;
  link: string;
}) {
  const zero = value === 0;
  return (
    <Link
      href={link}
      className="flex-1 min-w-0 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
    >
      <div
        className={`text-2xl font-semibold tabular-nums ${zero ? "text-gray-400 dark:text-gray-500" : TONES[tone].text}`}
      >
        {value}
      </div>
      <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
        {label}
      </div>
    </Link>
  );
}

interface BarItem {
  label: string;
  count: number;
  link: string;
  detail?: string;
}

/** Labelled horizontal bars, each a link. */
function BarList({
  items,
  color,
  labelWidth = "w-28",
}: {
  items: BarItem[];
  color: string;
  labelWidth?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <ul className="space-y-1">
      {items.map((b) => (
        <li key={b.label}>
          <Link
            href={b.link}
            className={`flex items-center gap-2 text-sm py-0.5 ${ROW_LINK}`}
            title={b.detail ? `${b.label}: ${b.detail}` : b.label}
          >
            <span
              className={`${labelWidth} shrink-0 truncate text-gray-900 dark:text-gray-100`}
            >
              {b.label}
            </span>
            <span className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${(b.count / max) * 100}%`,
                  backgroundColor: color,
                }}
              />
            </span>
            <span className="min-w-12 shrink-0 whitespace-nowrap text-right font-medium tabular-nums text-gray-900 dark:text-gray-100">
              {b.detail ?? b.count}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

interface DonutSlice {
  label: string;
  count: number;
  color: string;
  link: string;
}

function Donut({ data, center }: { data: DonutSlice[]; center?: string }) {
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
      <ul className="flex-1 min-w-0 space-y-0.5">
        {data.map((d) => (
          <li key={d.label}>
            <Link
              href={d.link}
              className={`flex items-center gap-2 text-sm py-0.5 ${ROW_LINK}`}
            >
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
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

const Icon = ({ d }: { d: string }) => (
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
);

const ICONS = {
  gear: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z",
  shield:
    "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  clipboard:
    "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
  chip: "M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z",
  download: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4",
  signal: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  refresh:
    "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
  warning:
    "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
  certificate:
    "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z",
  users:
    "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  apps: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z",
  network:
    "M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0",
};

// MARK: - Card context

/** A device row from the dashboard payload (lastSeen and computed status). */
export interface DashboardDevice {
  status?: string;
  platform?: string;
  lastSeen?: string;
}

export interface InsightContext {
  insights: InsightsState;
  isPlatformVisible: (platform: string) => boolean;
  platformFilter: string;
  installStats: InstallStatsData | null;
  devices: DashboardDevice[];
}

interface Source {
  rows: Row[];
  all: Row[];
  json: any;
  loading: boolean;
  error?: string;
}

function source(ctx: InsightContext, key: ReportKey): Source {
  const json = ctx.insights.data[key];
  const all = extractRows(json);
  return {
    json,
    all,
    rows: all.filter((r) => ctx.isPlatformVisible(rowPlatform(r))),
    loading: ctx.insights.loading.has(key),
    error: ctx.insights.errors[key],
  };
}

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;

// MARK: - 1 System health

const UPTIME_LABELS: Record<string, string> = {
  lt1d: "< 1 day",
  "1-3d": "1-3 days",
  "3-7d": "3-7 days",
  "1-2w": "1-2 weeks",
  "2-4w": "2-4 weeks",
  "30d+": "30+ days",
};

function SystemHealthCard({ ctx }: { ctx: InsightContext }) {
  const src = source(ctx, "system");
  const { rows } = src;
  const s = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const r of rows) {
      const k = uptimeBucketKey(r);
      if (k) buckets.set(k, (buckets.get(k) || 0) + 1);
    }
    return {
      buckets,
      pending: rows.filter((r) => {
        const k = pendingBucketKey(r);
        return !!k && k !== "up-to-date";
      }).length,
      deferred: rows.filter(hasDeferredUpdates).length,
    };
  }, [rows]);
  return (
    <InsightCard
      title="System Health"
      subtitle="Uptime and pending updates"
      link="/system"
      tone="orange"
      loading={src.loading}
      error={src.error}
      empty={rows.length === 0}
      icon={<Icon d={ICONS.gear} />}
    >
      <SectionLabel>Uptime</SectionLabel>
      <BarList
        color={TONES.orange.hex}
        labelWidth="w-24"
        items={Object.entries(UPTIME_LABELS).map(([key, label]) => ({
          label,
          count: s.buckets.get(key) || 0,
          link: href("/system", { uptime: key }),
        }))}
      />
      <div className="flex flex-wrap gap-2 mt-4">
        <StatChip
          value={s.pending}
          label="with pending updates"
          tone="yellow"
          link={href("/system", { pending: "1-5,6-10,10+" })}
        />
        <StatChip
          value={s.deferred}
          label="with deferred updates"
          tone="orange"
          link={href("/system", { deferred: 1 })}
        />
      </div>
    </InsightCard>
  );
}

// MARK: - 2 Security posture

function SecurityPostureCard({ ctx }: { ctx: InsightContext }) {
  const src = source(ctx, "security");
  const { rows } = src;
  const s = useMemo(() => {
    const count = (param: string, value = "off") =>
      rows.filter(SECURITY_PARAM_RULES[param][value]).length;
    const isWin = (r: Row) => rowPlatform(r) === "Windows";
    const sipTotal = rows.filter(
      (r) => !isWin(r) && boolishIfPresent(r.sipEnabled) !== null,
    ).length;
    const winTotal = rows.filter(isWin).length;
    const protectors = rows.filter(hasAntivirusProduct).length;
    return {
      total: rows.length,
      encryption: rows.length - count("encryption"),
      firewall: rows.length - count("firewall"),
      protectors,
      antivirus: protectors - count("antivirus"),
      sipTotal,
      sip: sipTotal - count("sip"),
      winTotal,
      secureBoot: winTotal - count("secureBoot"),
      withThreats: rows.filter((r) => securityThreats(r) > 0).length,
      expiredCerts: rows.filter((r) => expiredCerts(r) > 0).length,
      criticalCves: count("cve", "critical"),
    };
  }, [rows]);
  return (
    <InsightCard
      title="Security Posture"
      subtitle="Fleet-wide protections in place"
      link="/security"
      tone="green"
      loading={src.loading}
      error={src.error}
      empty={rows.length === 0}
      icon={<Icon d={ICONS.shield} />}
    >
      <div className="space-y-2">
        <ComplianceRow
          label="Disk encryption"
          on={s.encryption}
          total={s.total}
          link={href("/security", { encryption: "off" })}
        />
        <ComplianceRow
          label="Firewall"
          on={s.firewall}
          total={s.total}
          link={href("/security", { firewall: "off" })}
        />
        {s.protectors > 0 && (
          <ComplianceRow
            label="Antivirus protection"
            on={s.antivirus}
            total={s.protectors}
            link={href("/security", { antivirus: "off" })}
          />
        )}
        {s.sipTotal > 0 && (
          <ComplianceRow
            label="System Integrity Protection"
            on={s.sip}
            total={s.sipTotal}
            link={href("/security", { sip: "off" })}
          />
        )}
        {s.winTotal > 0 && (
          <ComplianceRow
            label="Secure Boot"
            on={s.secureBoot}
            total={s.winTotal}
            link={href("/security", { secureBoot: "off" })}
          />
        )}
      </div>
      <div className="flex flex-wrap gap-2 mt-4">
        <StatChip
          value={s.withThreats}
          label="with threats"
          tone="red"
          link={href("/security", { threats: 1 })}
        />
        <StatChip
          value={s.expiredCerts}
          label="expired certs"
          tone="yellow"
          link={href("/security", { certs: "expired" })}
        />
        <StatChip
          value={s.criticalCves}
          label="critical CVEs"
          tone="orange"
          link={href("/security", { cve: "critical" })}
        />
      </div>
    </InsightCard>
  );
}

// MARK: - 3 Management

function ManagementCard({ ctx }: { ctx: InsightContext }) {
  const src = source(ctx, "management");
  const { rows } = src;
  const s = useMemo(() => {
    const providers = new Map<string, number>();
    let enrolled = 0;
    for (const r of rows) {
      const p = managementProvider(r);
      if (p !== "Unmanaged") enrolled++;
      providers.set(p, (providers.get(p) || 0) + 1);
    }
    const unmanaged = providers.get("Unmanaged") || 0;
    providers.delete("Unmanaged");
    const top = [...providers.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 4);
    if (unmanaged) top.push(["Unmanaged", unmanaged]);
    return { total: rows.length, enrolled, top };
  }, [rows]);
  const pct = s.total ? Math.round((s.enrolled / s.total) * 100) : 0;
  return (
    <InsightCard
      title="Management"
      subtitle="MDM enrollment across the fleet"
      link="/management"
      tone="purple"
      loading={src.loading}
      error={src.error}
      empty={rows.length === 0}
      icon={<Icon d={ICONS.clipboard} />}
    >
      <Donut
        center={`${pct}%`}
        data={[
          {
            label: "Enrolled",
            count: s.enrolled,
            color: TONES.green.hex,
            link: href("/management", { enrolled: 1 }),
          },
          {
            label: "Not Enrolled",
            count: s.total - s.enrolled,
            color: TONES.gray.hex,
            link: href("/management", { enrolled: 0 }),
          },
        ]}
      />
      {s.top.length > 0 && (
        <div className="mt-4">
          <SectionLabel>Providers</SectionLabel>
          <BarList
            color="rgba(168,85,247,0.55)"
            labelWidth="w-36"
            items={s.top.map(([name, count]) => ({
              label: name,
              count,
              link: href("/management", { provider: name }),
            }))}
          />
        </div>
      )}
    </InsightCard>
  );
}

// MARK: - 4 Hardware

const FAMILY_COLORS: Record<string, string> = {
  "Apple Silicon": "#3b82f6",
  Intel: "#6366f1",
  ARM64: "#14b8a6",
  x64: "#06b6d4",
  Unknown: "#9ca3af",
};

function HardwareCard({ ctx }: { ctx: InsightContext }) {
  const src = source(ctx, "hardware");
  const { rows } = src;
  const s = useMemo(() => {
    const families = new Map<string, number>();
    for (const r of rows) {
      const f = archFamily(r);
      families.set(f, (families.get(f) || 0) + 1);
    }
    const data = [...families.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([label, count]) => ({
        label,
        count,
        color: FAMILY_COLORS[label] || TONES.gray.hex,
        link:
          label === "Unknown"
            ? "/hardware"
            : href("/hardware", { arch: label }),
      }));
    return {
      count: rows.length,
      data,
      lowStorage: rows.filter(isLowStorage).length,
      lowMemory: rows.filter(isLowMemory).length,
      laptops: rows.filter(isLaptop).length,
    };
  }, [rows]);
  return (
    <InsightCard
      title="Hardware"
      subtitle="Architecture, memory and storage"
      link="/hardware"
      tone="teal"
      loading={src.loading}
      error={src.error}
      empty={rows.length === 0}
      icon={<Icon d={ICONS.chip} />}
    >
      <Donut data={s.data} center={String(s.count)} />
      <div className="flex flex-wrap gap-2 mt-4">
        <StatChip
          value={s.lowStorage}
          label="under 10% free"
          tone="red"
          link={href("/hardware", { storage: "low" })}
        />
        <StatChip
          value={s.lowMemory}
          label="8 GB or less"
          tone="yellow"
          link={href("/hardware", { memory: "le8" })}
        />
        <StatChip
          value={s.laptops}
          label="laptops"
          tone="blue"
          link={href("/hardware", { type: "laptop" })}
        />
      </div>
    </InsightCard>
  );
}

// MARK: - 5 Install health

/** The platform an install-filters device belongs to: Cimian is Windows, Munki is macOS. */
const installPlatform = (d: Row): string =>
  d.platform
    ? rowPlatform(d)
    : d.modules?.installs?.cimian
      ? "Windows"
      : "macOS";


function InstallHealthCard({ ctx }: { ctx: InsightContext }) {
  const src = source(ctx, "installFilters");
  const json = src.json;
  const stats = ctx.installStats;
  const pf = ctx.platformFilter;
  const errors = stats
    ? pf === "macOS"
      ? stats.macDevicesWithErrors
      : pf === "Windows"
        ? stats.winDevicesWithErrors
        : stats.devicesWithErrors
    : 0;
  const warnings = stats
    ? pf === "macOS"
      ? stats.macDevicesWithWarnings
      : pf === "Windows"
        ? stats.winDevicesWithWarnings
        : stats.devicesWithWarnings
    : 0;
  const isVisible = ctx.isPlatformVisible;
  const s = useMemo(() => {
    if (!json) return null;
    const failing = new Map<string, number>();
    for (const d of Array.isArray(json.devices) ? json.devices : []) {
      if (d.archived === true || !isVisible(installPlatform(d))) continue;
      const seen = new Set<string>();
      for (const item of getDeviceInstallItems(d)) {
        const name = item.itemName || item.name;
        if (!name || seen.has(name) || !isErrorItem(item)) continue;
        seen.add(name);
        failing.set(name, (failing.get(name) || 0) + 1);
      }
    }
    const stale = (
      Array.isArray(json.staleAgents) ? json.staleAgents : []
    ).filter(
      (a: Row) =>
        isSilentAgent(a) &&
        isVisible(rowPlatform(a) === "Unknown" ? "macOS" : rowPlatform(a)),
    ).length;
    const top = [...failing.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 5);
    return { top, stale };
  }, [json, isVisible]);
  return (
    <InsightCard
      title="Install Health"
      subtitle="Munki and Cimian results"
      link="/installs"
      tone="blue"
      loading={src.loading}
      error={undefined}
      empty={!stats && !s}
      icon={<Icon d={ICONS.download} />}
    >
      <div className="flex gap-2">
        <BigStat
          value={errors}
          label="devices with errors"
          tone="red"
          link={href("/installs", { filter: "errors" })}
        />
        <BigStat
          value={warnings}
          label="devices with warnings"
          tone="yellow"
          link={href("/installs", { filter: "warnings" })}
        />
      </div>
      <div className="mt-4">
        <SectionLabel>Top failing items</SectionLabel>
        {s ? (
          s.top.length ? (
            <BarList
              color={TONES.red.hex}
              labelWidth="w-32"
              items={s.top.map(([name, count]) => ({
                label: name,
                count,
                link: href("/installs", { item: name, filter: "errors" }),
              }))}
            />
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500">
              No failing items
            </p>
          )
        ) : (
          <p className="text-sm text-gray-400 dark:text-gray-500">
            {src.loading
              ? "Loading install details…"
              : "Install details unavailable"}
          </p>
        )}
      </div>
      {s && (
        <div className="flex flex-wrap gap-2 mt-4">
          <StatChip
            value={s.stale}
            label={`agents silent over ${SILENT_AGENT_DAYS} days`}
            tone="orange"
            link={href("/installs", { stale: 1 })}
          />
        </div>
      )}
    </InsightCard>
  );
}

// MARK: - 6 Check-in gaps

const reasonLabel = (r: string) =>
  r ? r.charAt(0).toUpperCase() + r.slice(1).replace(/_/g, " ") : "Unknown";

function CheckInGapsCard({ ctx }: { ctx: InsightContext }) {
  const src = source(ctx, "failures");
  const json = src.json;
  const { devices } = ctx;
  const s = useMemo(() => {
    const counts = json?.counts || {};
    const reasons: Row[] = Array.isArray(json?.summary) ? json.summary : [];
    return {
      rejected: num(counts.rejected),
      retried: num(counts.retried),
      accepted: num(counts.accepted),
      reasons: [...reasons]
        .sort((a, b) => num(b.count) - num(a.count))
        .slice(0, 5),
      stale: devices.filter((d) => d.status === "stale").length,
      missing: devices.filter((d) => d.status === "missing").length,
    };
  }, [json, devices]);
  return (
    <InsightCard
      title="Check-in Gaps"
      subtitle={
        ctx.platformFilter === "all"
          ? "Failed check-ins and silent devices"
          : "Check-ins: all platforms · silent devices: this platform"
      }
      link={href("/events/failures", { hours: 24 })}
      tone="red"
      loading={src.loading}
      error={undefined}
      empty={!json && devices.length === 0}
      icon={<Icon d={ICONS.signal} />}
    >
      {json ? (
        <>
          <SectionLabel>{ctx.platformFilter === "all" ? "Last 24 hours" : "Last 24 hours · All platforms"}</SectionLabel>
          <div className="flex gap-2">
            <BigStat
              value={s.rejected}
              label="rejected"
              tone="red"
              link={href("/events/failures", { hours: 24 })}
            />
            <BigStat
              value={s.retried}
              label="retried"
              tone="yellow"
              link={href("/events/failures", { hours: 24, outcome: "retried" })}
            />
            <BigStat
              value={s.accepted}
              label="repaired"
              tone="blue"
              link={href("/events/failures", {
                hours: 24,
                outcome: "accepted",
              })}
            />
          </div>
          {s.reasons.length > 0 && (
            <div className="mt-4">
              <SectionLabel>Rejection reasons</SectionLabel>
              <BarList
                color={TONES.red.hex}
                labelWidth="w-36"
                items={s.reasons.map((r) => ({
                  label: reasonLabel(r.reason),
                  count: num(r.count),
                  detail: `${num(r.count)}`,
                  link: href("/events/failures", {
                    hours: 24,
                    reason: r.reason,
                  }),
                }))}
              />
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-gray-400 dark:text-gray-500">
          {src.loading
            ? "Loading check-in failures…"
            : "Check-in failures unavailable"}
        </p>
      )}
      <div className="flex flex-wrap gap-2 mt-4">
        <StatChip
          value={s.stale}
          label="silent 1-7 days"
          tone="yellow"
          link={href("/devices", { status: "stale" })}
        />
        <StatChip
          value={s.missing}
          label="silent over 7 days"
          tone="red"
          link={href("/devices", { status: "missing" })}
        />
      </div>
    </InsightCard>
  );
}

// MARK: - 7 OS currency

function OSCurrencyCard({ ctx }: { ctx: InsightContext }) {
  const src = source(ctx, "system");
  const { rows, all } = src;
  const s = useMemo(() => {
    const rules = osCurrency(all);
    const rated = rows.filter(rules.isRated);
    const behindRows = rated.filter(rules.isBehind);
    const lagging = new Map<string, number>();
    for (const r of behindRows) {
      const v = rules.versionKey(r);
      if (v) lagging.set(v, (lagging.get(v) || 0) + 1);
    }
    return {
      rated: rated.length,
      behind: behindRows.length,
      unsupported: rows.filter(rules.isUnsupportedMac).length,
      win10: rows.filter(rules.isWindows10).length,
      lagging: [...lagging.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 3),
    };
  }, [rows, all]);
  const latest = s.rated - s.behind;
  const pct = s.rated ? Math.round((latest / s.rated) * 100) : 0;
  return (
    <InsightCard
      title="OS Currency"
      subtitle="Latest patch per release, as seen in the fleet"
      link="/system"
      tone="indigo"
      loading={src.loading}
      error={src.error}
      empty={rows.length === 0}
      icon={<Icon d={ICONS.refresh} />}
    >
      <Donut
        center={`${pct}%`}
        data={[
          {
            label: "On latest patch",
            count: latest,
            color: TONES.green.hex,
            link: "/system",
          },
          {
            label: "Behind",
            count: s.behind,
            color: TONES.orange.hex,
            link: href("/system", { patch: "behind" }),
          },
        ]}
      />
      {s.lagging.length > 0 && (
        <div className="mt-4">
          <SectionLabel>Most devices behind</SectionLabel>
          <BarList
            color={TONES.orange.hex}
            items={s.lagging.map(([v, count]) => ({
              label: /^\d+\.\d{4,}$/.test(v)
                ? `Windows ${v.replace(".", " build ")}`
                : `macOS ${v}`,
              count,
              link: href("/system", { osVersion: v }),
            }))}
          />
        </div>
      )}
      <div className="flex flex-wrap gap-2 mt-4">
        <StatChip
          value={s.unsupported}
          label="unsupported macOS"
          tone="red"
          link={href("/system", { os: "unsupported" })}
        />
        <StatChip
          value={s.win10}
          label="Windows 10"
          tone="orange"
          link={href("/system", { os: "windows10" })}
        />
      </div>
    </InsightCard>
  );
}

// MARK: - 8 Software risk

function SoftwareRiskCard({ ctx }: { ctx: InsightContext }) {
  const sec = source(ctx, "security");
  const inst = source(ctx, "installFilters");
  const { rows } = sec;
  const isVisible = ctx.isPlatformVisible;
  const json = inst.json;
  const cves = useMemo(
    () => ({
      critical: rows.filter(SECURITY_PARAM_RULES.cve.critical).length,
      exploited: rows.filter(SECURITY_PARAM_RULES.cve.exploited).length,
    }),
    [rows],
  );
  const behind = useMemo(() => {
    if (!json) return null;
    const counts = new Map<string, number>();
    for (const d of Array.isArray(json.devices) ? json.devices : []) {
      if (d.archived === true || !isVisible(installPlatform(d))) continue;
      for (const item of getDeviceInstallItems(d)) {
        const have = String(item.installedVersion || "").trim();
        const want = String(item.latestVersion || "").trim();
        const name = item.itemName || item.name;
        if (name && have && want && have !== want)
          counts.set(name, (counts.get(name) || 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 5);
  }, [json, isVisible]);
  return (
    <InsightCard
      title="Software Risk"
      subtitle="Vulnerable devices and lagging managed items"
      link="/security"
      tone="red"
      loading={sec.loading}
      error={sec.error}
      empty={rows.length === 0}
      icon={<Icon d={ICONS.warning} />}
    >
      <div className="flex gap-2">
        <BigStat
          value={cves.critical}
          label="with critical CVEs"
          tone="red"
          link={href("/security", { cve: "critical" })}
        />
        <BigStat
          value={cves.exploited}
          label="actively exploited"
          tone="orange"
          link={href("/security", { cve: "exploited" })}
        />
      </div>
      <div className="mt-4">
        <SectionLabel>Managed items behind</SectionLabel>
        {behind ? (
          behind.length ? (
            <BarList
              color={TONES.orange.hex}
              labelWidth="w-32"
              items={behind.map(([name, count]) => ({
                label: name,
                count,
                link: href("/installs", { item: name }),
              }))}
            />
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Every managed item is on its latest version
            </p>
          )
        ) : (
          <p className="text-sm text-gray-400 dark:text-gray-500">
            {inst.loading
              ? "Loading install details…"
              : "Install details unavailable"}
          </p>
        )}
      </div>
    </InsightCard>
  );
}

// MARK: - 9 Certificates

const CERT_WINDOW_DAYS = 30;

function CertificatesCard({ ctx }: { ctx: InsightContext }) {
  const certs = source(ctx, "certs");
  const sec = source(ctx, "security");
  const certRows = certs.rows;
  const secRows = sec.rows;
  const s = useMemo(() => {
    const expiring = certRows.filter((c) => {
      const d = num(c.daysUntilExpiry);
      return !boolish(c.isExpired) && d >= 0 && d <= CERT_WINDOW_DAYS;
    });
    const soonest = new Map<string, number>();
    for (const c of [...expiring].sort(
      (a, b) => num(a.daysUntilExpiry) - num(b.daysUntilExpiry),
    )) {
      const cn = String(c.commonName || c.subject || "").trim();
      if (cn && !soonest.has(cn)) soonest.set(cn, num(c.daysUntilExpiry));
    }
    return {
      certCount: expiring.length,
      deviceCount: new Set(expiring.map((c) => c.serialNumber || c.deviceName))
        .size,
      expiredDevices: secRows.filter((r) => expiredCerts(r) > 0).length,
      soonest: [...soonest.entries()].slice(0, 5),
    };
  }, [certRows, secRows]);
  return (
    <InsightCard
      title="Certificates"
      subtitle={`Expiring within ${CERT_WINDOW_DAYS} days`}
      link="/security"
      tone="yellow"
      loading={certs.loading || sec.loading}
      error={certs.error && sec.error ? certs.error : undefined}
      empty={certRows.length === 0 && secRows.length === 0}
      icon={<Icon d={ICONS.certificate} />}
    >
      <div className="flex gap-2">
        {certs.json ? (
          <BigStat
            value={s.certCount}
            label={`certificates on ${plural(s.deviceCount, "device")}`}
            tone="yellow"
            link={href("/security", { certs: "expiring" })}
          />
        ) : (
          <BigStat
            value="–"
            label={certs.loading ? "loading certificates…" : "certificate list unavailable"}
            tone="gray"
            link={href("/security", { certs: "expiring" })}
          />
        )}
        {sec.json ? (
          <BigStat
            value={s.expiredDevices}
            label="devices with expired certs"
            tone="red"
            link={href("/security", { certs: "expired" })}
          />
        ) : (
          <BigStat
            value="–"
            label={sec.loading ? "loading security…" : "security report unavailable"}
            tone="gray"
            link={href("/security", { certs: "expired" })}
          />
        )}
      </div>
      {s.soonest.length > 0 && (
        <div className="mt-4">
          <SectionLabel>Expiring soonest</SectionLabel>
          <ul className="space-y-0.5">
            {s.soonest.map(([cn, days]) => (
              <li key={cn}>
                <Link
                  href={href("/security", {
                    certSearch: cn,
                    certStatus: "expiring",
                  })}
                  className={`flex items-center gap-2 text-sm py-0.5 ${ROW_LINK}`}
                >
                  <span className="flex-1 truncate text-gray-900 dark:text-gray-100">
                    {cn}
                  </span>
                  <span
                    className={`text-xs tabular-nums ${days <= 7 ? TONES.red.text : "text-gray-500 dark:text-gray-400"}`}
                  >
                    {days === 0 ? "today" : plural(Math.round(days), "day")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </InsightCard>
  );
}

// MARK: - 10 Identity

const JOIN_COLORS: Record<JoinType, string> = {
  entra: "#3b82f6",
  domain: "#6366f1",
  hybrid: "#14b8a6",
  workgroup: "#9ca3af",
};

function IdentityCard({ ctx }: { ctx: InsightContext }) {
  const src = source(ctx, "identity");
  const { rows } = src;
  const s = useMemo(() => {
    const joins = new Map<JoinType, number>();
    for (const r of rows) {
      const j = joinType(r);
      joins.set(j, (joins.get(j) || 0) + 1);
    }
    return {
      joins: (Object.keys(JOIN_LABELS) as JoinType[])
        .filter((k) => joins.get(k))
        .map((k) => ({
          label: JOIN_LABELS[k],
          count: joins.get(k) || 0,
          color: JOIN_COLORS[k],
          link: href("/identity", { join: k }),
        })),
      extraAdmins: rows.filter(hasExtraAdmins).length,
      shared: rows.filter((r) => usageKind(r) === "shared").length,
      assigned: rows.filter((r) => usageKind(r) === "assigned").length,
    };
  }, [rows]);
  return (
    <InsightCard
      title="Identity"
      subtitle="Directory join, admins and usage"
      link="/identity"
      tone="purple"
      loading={src.loading}
      error={src.error}
      empty={rows.length === 0}
      icon={<Icon d={ICONS.users} />}
    >
      <Donut data={s.joins} center={String(rows.length)} />
      <div className="flex flex-wrap gap-2 mt-4">
        <StatChip
          value={s.extraAdmins}
          label="with extra local admins"
          tone="orange"
          link={href("/identity", { admins: "extra" })}
        />
        <StatChip
          value={s.shared}
          label="shared"
          tone="blue"
          link={href("/identity", { usage: "shared" })}
        />
        <StatChip
          value={s.assigned}
          label="assigned"
          tone="teal"
          link={href("/identity", { usage: "assigned" })}
        />
      </div>
    </InsightCard>
  );
}

// MARK: - 11 App usage

const MIN_INSTALLS_FOR_LEAST_USED = 10;
const appHref = (name: string) =>
  href(`/applications/usage/${encodeURIComponent(name)}`, { days: 30 });
const hours = (h: number) =>
  h >= 1000 ? `${Math.round(h / 1000)}k h` : `${Math.round(h)} h`;

function AppUsageCard({ ctx }: { ctx: InsightContext }) {
  const src = source(ctx, "usage");
  const apps: Row[] = useMemo(
    () => (Array.isArray(src.json?.applications) ? src.json.applications : []),
    [src.json],
  );
  const s = useMemo(() => {
    const top = [...apps]
      .sort((a, b) => num(b.totalHours) - num(a.totalHours))
      .slice(0, 5);
    const least = apps
      .filter((a) => num(a.installedDeviceCount) >= MIN_INSTALLS_FOR_LEAST_USED)
      .map((a) => ({
        a,
        ratio:
          num(a.activeDeviceCount ?? a.deviceCount) /
          num(a.installedDeviceCount),
      }))
      .sort(
        (x, y) =>
          x.ratio - y.ratio ||
          num(y.a.installedDeviceCount) - num(x.a.installedDeviceCount),
      )
      .slice(0, 5);
    return { top, least };
  }, [apps]);
  return (
    <InsightCard
      title="App Usage"
      subtitle={
        ctx.platformFilter === "all" ? "Last 30 days" : "Last 30 days · All platforms"
      }
      link={href("/applications", { type: "usage", period: 30 })}
      tone="teal"
      loading={src.loading}
      error={src.error}
      empty={apps.length === 0}
      icon={<Icon d={ICONS.apps} />}
    >
      <SectionLabel>Most used</SectionLabel>
      <BarList
        color={TONES.teal.hex}
        labelWidth="w-32"
        items={s.top.map((a) => ({
          label: a.name,
          count: num(a.totalHours),
          detail: hours(num(a.totalHours)),
          link: appHref(a.name),
        }))}
      />
      {s.least.length > 0 && (
        <div className="mt-4">
          <SectionLabel>
            Least used (installed on {MIN_INSTALLS_FOR_LEAST_USED}+ devices)
          </SectionLabel>
          <ul className="space-y-0.5">
            {s.least.map(({ a }) => (
              <li key={a.name}>
                <Link
                  href={appHref(a.name)}
                  className={`flex items-center gap-2 text-sm py-0.5 ${ROW_LINK}`}
                >
                  <span className="flex-1 truncate text-gray-900 dark:text-gray-100">
                    {a.name}
                  </span>
                  <span className="text-xs tabular-nums text-gray-500 dark:text-gray-400">
                    {num(a.activeDeviceCount ?? a.deviceCount)} of{" "}
                    {num(a.installedDeviceCount)} devices
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </InsightCard>
  );
}

// MARK: - 12 Network & peripherals

function NetworkPeripheralsCard({ ctx }: { ctx: InsightContext }) {
  const net = source(ctx, "network");
  const per = source(ctx, "peripherals");
  const netRows = net.rows;
  const perRows = per.rows;
  const n = useMemo(
    () => ({
      wired: netRows.filter((r) => connectionKind(r) === "wired").length,
      wifi: netRows.filter((r) => connectionKind(r) === "wifi").length,
      weak: netRows.filter(isWeakSignal).length,
    }),
    [netRows],
  );
  const p = useMemo(() => {
    const rooms = new Map<string, number>();
    let printers = 0,
      displays = 0;
    for (const r of perRows) {
      const pc = printerCount(r);
      printers += pc;
      displays += displayCount(r);
      const room = deviceRoom(r);
      if (pc && room) rooms.set(room, (rooms.get(room) || 0) + pc);
    }
    return {
      printers,
      displays,
      rooms: [...rooms.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 3),
    };
  }, [perRows]);
  return (
    <InsightCard
      title="Network & Peripherals"
      subtitle="Connections, signal, printers and displays"
      link="/network"
      tone="blue"
      loading={net.loading || per.loading}
      error={net.error && per.error ? net.error : undefined}
      empty={netRows.length === 0 && perRows.length === 0}
      icon={<Icon d={ICONS.network} />}
    >
      {netRows.length > 0 ? (
        <>
          <Donut
            center={String(n.wired + n.wifi)}
            data={[
              {
                label: "Wired",
                count: n.wired,
                color: TONES.indigo.hex,
                link: href("/network", { connection: "wired" }),
              },
              {
                label: "Wi-Fi",
                count: n.wifi,
                color: TONES.teal.hex,
                link: href("/network", { connection: "wifi" }),
              },
            ]}
          />
          <div className="flex flex-wrap gap-2 mt-4">
            <StatChip
              value={n.weak}
              label="weak Wi-Fi signal"
              tone="orange"
              link={href("/network", { signal: "weak" })}
            />
          </div>
        </>
      ) : (
        <p className="text-sm text-gray-400 dark:text-gray-500">
          {net.loading ? "Loading network…" : "Network report unavailable"}
        </p>
      )}
      <div className="mt-4">
        <SectionLabel>Peripherals</SectionLabel>
        {perRows.length > 0 ? (
          <>
            <div className="flex gap-2">
              <BigStat
                value={p.printers}
                label="printers"
                tone="purple"
                link={href("/peripherals", { kind: "printers" })}
              />
              <BigStat
                value={p.displays}
                label="displays"
                tone="blue"
                link={href("/peripherals", { kind: "displays" })}
              />
            </div>
            {p.rooms.length > 0 && (
              <div className="mt-3">
                <BarList
                  color="rgba(168,85,247,0.55)"
                  items={p.rooms.map(([room, count]) => ({
                    label: room,
                    count,
                    detail: plural(count, "printer"),
                    link: href("/peripherals", { kind: "printers", room }),
                  }))}
                />
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-400 dark:text-gray-500">
            {per.loading
              ? "Loading peripherals…"
              : "Peripherals report unavailable"}
          </p>
        )}
      </div>
    </InsightCard>
  );
}

// MARK: - The twelve cards, in spec order

const CARDS: { id: string; Card: React.FC<{ ctx: InsightContext }> }[] = [
  { id: "system-health", Card: SystemHealthCard },
  { id: "security-posture", Card: SecurityPostureCard },
  { id: "management", Card: ManagementCard },
  { id: "hardware", Card: HardwareCard },
  { id: "install-health", Card: InstallHealthCard },
  { id: "check-in-gaps", Card: CheckInGapsCard },
  { id: "os-currency", Card: OSCurrencyCard },
  { id: "software-risk", Card: SoftwareRiskCard },
  { id: "certificates", Card: CertificatesCard },
  { id: "identity", Card: IdentityCard },
  { id: "app-usage", Card: AppUsageCard },
  { id: "network-peripherals", Card: NetworkPeripheralsCard },
];

export const INSIGHT_CARD_COUNT = CARDS.length;

/**
 * Renders the cards at the given positions (0-based, spec order). The layout
 * decides which positions go where; see docs/DASHBOARD-WIDGETS.md.
 */
export function InsightCards({
  ctx,
  positions,
  className = "",
}: {
  ctx: InsightContext;
  positions: number[];
  className?: string;
}) {
  return (
    <div className={className}>
      {positions.map((i) => {
        const { id, Card } = CARDS[i];
        return <Card key={id} ctx={ctx} />;
      })}
    </div>
  );
}

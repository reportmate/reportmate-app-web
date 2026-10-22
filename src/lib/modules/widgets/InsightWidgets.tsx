/**
 * Dashboard insight cards. Every number comes from one cached document,
 * GET /api/v1/dashboard/insights (src/lib/dashboard/insights.ts), and every
 * item links where the server says, so web, Swift and C# open the same
 * filtered report. docs/DASHBOARD-WIDGETS.md is the shared contract.
 */

"use client";

import React, { useEffect, useState } from "react";
import { SKELETON_LIMIT_MS } from "../../data-cache";
import { barWidth, compactHours, countOf, fmtBytes, fmtCount, fmtNumber, fmtPercent, fmtPercentOf, fmtPlural, MISSING } from "../../dashboard/format";
import { DIRECTORY_SERVICE_COLORS } from "../../dashboard/reportRules";
import Link from "next/link";
import {
  APP_USAGE_DAYS,
  type AppUsageCard as AppUsageCardData,
  type CheckinGapsCard,
  type ConnectivityProblemsCard,
  type DirectoryServicesCard,
  type ExpiringCertificatesCard,
  type InsightCardKey,
  type InsightCards as InsightCardData,
  type InsightsState,
  type InstallHealthCard,
  type ManagementToolErrorsCard,
  type OSCurrencyCard,
  type ProtectionGapsCard,
  type RebootDebtCard,
  type SoftwareRiskCard,
  type StorageCard,
  type UserAccountsCard,
  type InsightLink,
  isCardError,
  linkHref,
  useAppUsage,
  withDefaultParams,
} from "../../dashboard/insights";

export { useDashboardInsights } from "../../dashboard/insights";

/** What one card has to show: skeleton, error with Retry, or its section. */
type CardSlot<T> =
  | { status: "loading"; retry: () => void }
  | { status: "error"; error: string; retry: () => void; retrying: boolean }
  | { status: "ready"; data: T };

/** Everything the cards read: the insights state and the platform toggle. */
export interface InsightContext {
  insights: InsightsState;
  platformFilter: string;
}

function slot<K extends InsightCardKey>(
  ctx: InsightContext,
  key: K,
): CardSlot<Exclude<InsightCardData[K], { error: string }>> {
  const { data, loading, error, refresh, pending } = ctx.insights;
  const section = data?.cards?.[key];
  // Per-card loading: a card still on its way shows its skeleton
  if (!section && pending?.has(key)) return { status: "loading", retry: refresh };
  if (!data) {
    if (loading) return { status: "loading", retry: refresh };
    return {
      status: "error",
      error: error || "No answer from the server",
      retry: refresh,
      retrying: loading,
    };
  }
  if (!section || isCardError(section))
    return {
      status: "error",
      error: section && isCardError(section) ? section.error : "Missing from the response",
      retry: refresh,
      retrying: loading,
    };
  return {
    status: "ready",
    data: section as Exclude<InsightCardData[K], { error: string }>,
  };
}

const plural = fmtPlural;

/**
 * Breakdown rows worth showing: a zero-count segment or row says nothing, so
 * it is hidden. Fixed buckets where a zero is information (uptime, storage
 * free space and capacity, protection gaps) don't use this.
 */
const shown = <T,>(rows: T[] | undefined, count: (r: T) => unknown): T[] =>
  (rows ?? []).filter((r) => (countOf(count(r)) ?? 0) > 0);

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
  emerald: {
    icon: "bg-emerald-100 dark:bg-emerald-900",
    text: "text-emerald-600 dark:text-emerald-400",
    hex: "#10b981",
  },
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

function InsightCard({
  title,
  subtitle,
  link,
  tone,
  icon,
  card,
  children,
}: {
  title: string;
  subtitle: string;
  link: string;
  tone: Tone;
  icon: React.ReactNode;
  card: CardSlot<unknown>;
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
        {card.status === "loading" ? (
          <CardSkeleton retry={card.retry} />
        ) : card.status === "error" ? (
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {/HTTP 404/.test(card.error)
                ? "Not available on this server yet."
                : <>Couldn&apos;t load this card: {card.error}</>}
            </p>
            <button
              type="button"
              onClick={card.retry}
              disabled={card.retrying}
              className="shrink-0 px-2.5 py-1 text-xs font-medium rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              {card.retrying ? "Retrying…" : "Retry"}
            </button>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

/**
 * The card's skeleton, for at most SKELETON_LIMIT_MS: after that it says the
 * card is still loading and offers Retry instead of pulsing on indefinitely.
 */
function CardSkeleton({ retry }: { retry: () => void }) {
  const [stalled, setStalled] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setStalled(true), SKELETON_LIMIT_MS);
    return () => clearTimeout(timer);
  }, [attempt]);
  if (stalled)
    return (
      <div className="flex items-center justify-between gap-3" data-testid="insight-stalled">
        <p className="text-sm text-gray-500 dark:text-gray-400">Still loading…</p>
        <button
          type="button"
          onClick={() => {
            setStalled(false);
            setAttempt((a) => a + 1);
            retry();
          }}
          className="shrink-0 px-2.5 py-1 text-xs font-medium rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Retry
        </button>
      </div>
    );
  return (
    <div className="space-y-3 animate-pulse" data-testid="insight-skeleton">
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
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

/** A protection that is off on some devices: "151 of 931", with a bar of the gap. */
function GapRow({
  label,
  count,
  total,
  link,
}: {
  label: string;
  count: number;
  total: number;
  link: string;
}) {
  const pct = barWidth(count, total) / 100;
  const tone: Tone = countOf(count) === null ? "gray" : count === 0 ? "green" : pct >= 0.3 ? "red" : pct >= 0.1 ? "orange" : "yellow";
  return (
    <Link href={link} className={`block py-0.5 ${ROW_LINK}`}>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-900 dark:text-gray-100 flex-1 truncate">
          {label}
        </span>
        <span
          className={`font-medium tabular-nums ${!countOf(count) ? "text-gray-400 dark:text-gray-500" : TONES[tone].text}`}
        >
          {fmtCount(count)}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums w-16 text-right">
          of {fmtCount(total)}
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
        className={`text-sm font-semibold tabular-nums ${!countOf(value) ? "text-gray-400 dark:text-gray-500" : TONES[tone].text}`}
      >
        {fmtCount(value)}
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
  const zero = typeof value === "number" ? !countOf(value) : value === MISSING;
  return (
    <Link
      href={link}
      className="flex-1 min-w-0 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
    >
      <div
        className={`text-2xl font-semibold tabular-nums ${zero ? "text-gray-400 dark:text-gray-500" : TONES[tone].text}`}
      >
        {typeof value === "number" ? fmtCount(value) : value}
      </div>
      <div className="text-xs leading-snug text-gray-600 dark:text-gray-400">
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
  const max = Math.max(1, ...items.map((i) => countOf(i.count) ?? 0));
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
                  width: `${barWidth(b.count, max)}%`,
                  backgroundColor: color,
                }}
              />
            </span>
            <span className="min-w-12 shrink-0 whitespace-nowrap text-right font-medium tabular-nums text-gray-900 dark:text-gray-100">
              {b.detail ?? fmtCount(b.count)}
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
  /** A breakdown shown as a disclosure under this legend row, collapsed by default. */
  children?: Omit<DonutSlice, "children">[];
}

function Donut({ data, center }: { data: DonutSlice[]; center?: string }) {
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const hasDisclosure = data.some((d) => d.children?.length);
  const toggle = (label: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  const total = data.reduce((s, d) => s + (countOf(d.count) ?? 0), 0);
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
              const len = (barWidth(d.count, total) / 100) * c;
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
        {data.map((d) => {
          const expandable = !!d.children?.length;
          const isOpen = open.has(d.label);
          return (
            <li key={d.label}>
              <div className="flex items-center gap-1">
                {expandable ? (
                  <button
                    type="button"
                    onClick={() => toggle(d.label)}
                    aria-expanded={isOpen}
                    aria-label={`${isOpen ? "Collapse" : "Expand"} ${d.label}`}
                    className="w-4 h-4 shrink-0 flex items-center justify-center rounded text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    <svg className={`w-3 h-3 transition-transform ${isOpen ? "rotate-90" : ""}`} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                ) : (
                  hasDisclosure && <span className="w-4 shrink-0" />
                )}
                <Link
                  href={d.link}
                  className={`flex-1 min-w-0 flex items-center gap-2 text-sm py-0.5 ${ROW_LINK}`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: d.color }}
                  />
                  <span className="text-gray-900 dark:text-gray-100 truncate flex-1">
                    {d.label}
                  </span>
                  <span className="font-medium tabular-nums text-gray-900 dark:text-gray-100">
                    {fmtCount(d.count)}
                  </span>
                  <span className="text-xs text-gray-400 tabular-nums w-9 text-right">
                    {fmtPercentOf(d.count, total)}
                  </span>
                </Link>
              </div>
              {expandable && isOpen && (
                <ul className="ml-6 mt-0.5 mb-1 pl-2 space-y-0.5 border-l-2 border-gray-200 dark:border-gray-600">
                  {d.children!.map((c) => (
                    <li key={c.label}>
                      <Link
                        href={c.link}
                        className={`flex items-center gap-2 text-xs py-0.5 ${ROW_LINK}`}
                      >
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                        <span className="flex-1 truncate text-gray-600 dark:text-gray-300">{c.label}</span>
                        <span className="font-medium tabular-nums text-gray-700 dark:text-gray-200">{fmtCount(c.count)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const Icon = ({ d }: { d: string }) => (
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
);

const ICONS = {
  /** The Reports menu's Applications glyph. */
  applications:
    "M19 12.2H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V10.2a2 2 0 00-2-2M5 12.2V10.2a2 2 0 012-2m0 0V6.2a2 2 0 012-2h6a2 2 0 012 2v2M7 8.2h10",
  /** The Reports menu's Identity glyph. */
  identity:
    "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
  /** A drive: two stacked bays with activity lights. */
  disk: "M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01",
  clock: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  /** A directory: an office building. */
  building:
    "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
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

/** Named rows (devices, certificates, apps) with a right-hand detail, each a link. */
function DeviceList({
  items,
}: {
  items: { key: string; name: string; detail: string; link: string; urgent?: boolean }[];
}) {
  return (
    <ul className="space-y-0.5">
      {items.map((i) => (
        <li key={i.key}>
          <Link href={i.link} className={`flex items-center gap-2 text-sm py-0.5 ${ROW_LINK}`}>
            <span className="flex-1 truncate text-gray-900 dark:text-gray-100">{i.name}</span>
            <span
              className={`text-xs tabular-nums whitespace-nowrap ${i.urgent ? TONES.red.text : "text-gray-500 dark:text-gray-400"}`}
            >
              {i.detail}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

// MARK: - Reboot Debt (uptime only; pending and deferred updates are on Update Debt)

export function RebootDebt({ ctx }: { ctx: InsightContext }) {
  const card = slot(ctx, "rebootDebt");
  const d = card.status === "ready" ? card.data : null;
  return (
    <InsightCard
      title="Uptime Overview"
      subtitle="How long devices have been up since their last restart"
      link="/system"
      tone="purple"
      icon={<Icon d={ICONS.clock} />}
      card={card}
    >
      {d && (
        <>
          <div className="flex gap-2">
            <BigStat value={d.uptime30dPlus.count} label="up 30+ days" tone="red" link={linkHref(d.uptime30dPlus.link)} />
            <BigStat value={d.uptime2to4w.count} label="up 2-4 weeks" tone="orange" link={linkHref(d.uptime2to4w.link)} />
          </div>
          {d.uptimeBuckets.length > 0 && (
            <div className="mt-4">
              <SectionLabel>Uptime, all {d.devices} devices</SectionLabel>
              <BarList
                color={TONES.orange.hex}
                labelWidth="w-24"
                items={d.uptimeBuckets.map((b) => ({ label: b.label, count: b.count, link: linkHref(b.link) }))}
              />
            </div>
          )}
        </>
      )}
    </InsightCard>
  );
}

// MARK: - 2 Protection Gaps

function ProtectionGaps({ ctx }: { ctx: InsightContext }) {
  const card = slot(ctx, "protectionGaps");
  const d: ProtectionGapsCard | null = card.status === "ready" ? card.data : null;
  return (
    <InsightCard
      title="Protection Gaps"
      subtitle="Devices missing a protection, worst first"
      link="/security"
      tone="red"
      icon={<Icon d={ICONS.shield} />}
      card={card}
    >
      {d && (
        <>
          <div className="space-y-2">
            {d.gaps.map((g) => (
              <GapRow key={g.key} label={g.label} count={g.count} total={g.total} link={linkHref(g.link)} />
            ))}
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <StatChip value={d.withThreats.count} label="with threats" tone="red" link={linkHref(d.withThreats.link)} />
            <StatChip value={d.criticalCves.count} label="with critical CVEs" tone="orange" link={linkHref(d.criticalCves.link)} />
          </div>
        </>
      )}
    </InsightCard>
  );
}

// MARK: - 5 Install Health (column 1, under Fleet Status)

/** A hero-size figure: the most prominent numbers on the dashboard. */
function HeroStat({
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
      className="flex-1 min-w-0 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
    >
      <div
        className={`text-6xl font-bold leading-none tabular-nums tracking-tight ${!countOf(value) ? "text-gray-400 dark:text-gray-500" : TONES[tone].text}`}
      >
        {fmtCount(value)}
      </div>
      <div className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </div>
    </Link>
  );
}

/**
 * Install Health replaces the Errors and Warnings tiles and sits under Fleet
 * Status, with the headline counts as the biggest numbers on the page.
 */
export function InstallHealthHero({ ctx }: { ctx: InsightContext }) {
  const card = slot(ctx, "installHealth");
  const d: InstallHealthCard | null = card.status === "ready" ? card.data : null;
  const agents = d?.byAgent ?? [];
  return (
    <InsightCard
      title="Installs"
      subtitle="Munki and Cimian results"
      link="/installs"
      tone="emerald"
      icon={<Icon d={ICONS.download} />}
      card={card}
    >
      {d && (
        <>
          <div className="flex gap-3">
            <HeroStat value={d.withErrors.count} label="devices with errors" tone="red" link={linkHref(d.withErrors.link)} />
            <HeroStat value={d.withWarnings.count} label="devices with warnings" tone="yellow" link={linkHref(d.withWarnings.link)} />
          </div>
          {agents.length > 0 && (
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <th className="text-left font-semibold pb-1"></th>
                  <th className="text-right font-semibold pb-1">Errors</th>
                  <th className="text-right font-semibold pb-1">Warnings</th>
                  <th className="text-right font-semibold pb-1">Pending</th>
                  <th className="text-right font-semibold pb-1">Silent</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((a) => (
                  <tr key={a.agent} className="border-t border-gray-100 dark:border-gray-700/60">
                    <td className="py-1 text-gray-900 dark:text-gray-100">
                      <Link href={`/installs?agent=${encodeURIComponent(a.agent)}`} className="hover:underline">
                        {a.name} <span className="text-xs text-gray-400">{fmtCount(a.devices)}</span>
                      </Link>
                    </td>
                    {[
                      { c: a.withErrors.count, l: a.withErrors.link, t: "red" as Tone, title: "devices with errors" },
                      { c: a.withWarnings.count, l: a.withWarnings.link, t: "yellow" as Tone, title: "devices with warnings" },
                      { c: a.pending.devices, l: a.pending.link, t: "blue" as Tone, title: `devices with ${a.pending.items} pending items` },
                      { c: a.silentAgents.count, l: a.silentAgents.link, t: "orange" as Tone, title: "agents silent over 7 days" },
                    ].map((cell, i) => (
                      <td key={i} className="py-1 text-right">
                        <Link
                          href={linkHref(cell.l)}
                          title={`${fmtCount(cell.c)} ${cell.title}`}
                          className={`tabular-nums font-medium hover:underline ${countOf(cell.c) ? TONES[cell.t].text : "text-gray-400 dark:text-gray-500"}`}
                        >
                          {fmtCount(cell.c)}
                        </Link>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="flex flex-wrap gap-2 mt-4">
            <StatChip value={d.errorItems.count} label="error items" tone="red" link={linkHref(d.errorItems.link)} />
            <StatChip value={d.warningItems.count} label="warning items" tone="yellow" link={linkHref(d.warningItems.link)} />
            <StatChip value={d.pending.items} label={`pending on ${plural(d.pending.devices, "device")}`} tone="blue" link={linkHref(d.pending.link)} />
            <StatChip
              value={d.silentAgents.count}
              label={`agents silent over ${d.silentAgents.thresholdDays ?? 7} days`}
              tone="orange"
              link={linkHref(d.silentAgents.link)}
            />
          </div>
          <div className="mt-4">
            <SectionLabel>Top failing items</SectionLabel>
            {shown(d.topFailing, (i) => i.devices).length ? (
              <BarList
                color={TONES.red.hex}
                labelWidth="w-32"
                items={shown(d.topFailing, (i) => i.devices).map((i) => ({ label: i.name, count: i.devices, link: linkHref(i.link) }))}
              />
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500">No failing items</p>
            )}
          </div>
        </>
      )}
    </InsightCard>
  );
}

// MARK: - 6 Check-in Gaps

const reasonLabel = (r: string) =>
  r ? r.charAt(0).toUpperCase() + r.slice(1).replace(/_/g, " ") : "Unknown";

export function CheckinGaps({ ctx }: { ctx: InsightContext }) {
  const card = slot(ctx, "checkinGaps");
  const d: CheckinGapsCard | null = card.status === "ready" ? card.data : null;
  const allPlatforms = ctx.platformFilter !== "all" && d?.checkinsAllPlatforms !== false;
  return (
    <InsightCard
      title="Check-in Gaps"
      subtitle="Failed check-ins and silent devices"
      link={d ? linkHref(d.rejected.link) : "/events/failures"}
      tone="red"
      icon={<Icon d={ICONS.signal} />}
      card={card}
    >
      {d && (
        <>
          <SectionLabel>
            Last {d.hours} hours{allPlatforms ? " · All platforms" : ""}
          </SectionLabel>
          <div className="flex gap-2">
            <BigStat value={d.rejected.count} label="rejected" tone="red" link={linkHref(d.rejected.link)} />
            <BigStat value={d.retried.count} label="retried" tone="yellow" link={linkHref(d.retried.link)} />
            <BigStat value={d.accepted.count} label="repaired" tone="blue" link={linkHref(d.accepted.link)} />
          </div>
          {shown(d.reasons, (r) => r.count).length > 0 && (
            <div className="mt-4">
              <SectionLabel>Rejection reasons</SectionLabel>
              <BarList
                color={TONES.red.hex}
                labelWidth="w-36"
                items={shown(d.reasons, (r) => r.count).map((r) => ({
                  label: reasonLabel(r.reason),
                  count: r.count,
                  detail: `${r.count}`,
                  link: linkHref(r.link),
                }))}
              />
            </div>
          )}
          <div className="flex flex-wrap gap-2 mt-4">
            <StatChip value={d.stale.count} label="silent 1-7 days" tone="yellow" link={linkHref(d.stale.link)} />
            <StatChip value={d.missing.count} label="silent over 7 days" tone="red" link={linkHref(d.missing.link)} />
          </div>
        </>
      )}
    </InsightCard>
  );
}

// MARK: - Update Debt (was OS Currency)

function UpdateDebt({ ctx }: { ctx: InsightContext }) {
  const card = slot(ctx, "updateDebt");
  const d: OSCurrencyCard | null = card.status === "ready" ? card.data : null;
  // Pending and deferred moved here from Reboot Debt; an older API still sends them there
  const reboot = slot(ctx, "rebootDebt");
  const rebootData = reboot.status === "ready" ? reboot.data : null;
  const pending = d?.pendingUpdates ?? rebootData?.pendingUpdates;
  const deferred = d?.deferredUpdates ?? rebootData?.deferredUpdates;
  return (
    <InsightCard
      title="Update Debt"
      subtitle="Devices behind on OS patches and updates"
      link="/system"
      tone="indigo"
      icon={<Icon d={ICONS.refresh} />}
      card={card}
    >
      {d && (
        <>
          <Donut
            center={fmtPercent(d.pctOnLatest)}
            data={[
              { label: "On latest patch", count: d.onLatest, color: TONES.green.hex, link: "/system" },
              { label: "Behind", count: d.behind.count, color: TONES.orange.hex, link: linkHref(d.behind.link) },
            ]}
          />
          {shown(d.lagging, (v) => v.devices).length > 0 && (
            <div className="mt-4">
              <SectionLabel>Most devices behind</SectionLabel>
              <BarList
                color={TONES.orange.hex}
                labelWidth="w-36"
                items={shown(d.lagging, (v) => v.devices).map((v) => ({ label: v.label, count: v.devices, link: linkHref(v.link) }))}
              />
            </div>
          )}
          <div className="flex flex-wrap gap-2 mt-4">
            {pending && (
              <StatChip value={pending.count} label="with pending updates" tone="yellow" link={linkHref(pending.link)} />
            )}
            {deferred && (
              <StatChip value={deferred.count} label="with deferred updates" tone="orange" link={linkHref(deferred.link)} />
            )}
            <StatChip value={d.unsupportedMac.count} label="unsupported macOS" tone="red" link={linkHref(d.unsupportedMac.link)} />
            <StatChip value={d.windows10.count} label="Windows 10" tone="orange" link={linkHref(d.windows10.link)} />
          </div>
        </>
      )}
    </InsightCard>
  );
}

// MARK: - 8 Software Risk

function SoftwareRisk({ ctx }: { ctx: InsightContext }) {
  const card = slot(ctx, "softwareRisk");
  const d: SoftwareRiskCard | null = card.status === "ready" ? card.data : null;
  return (
    <InsightCard
      title="Software Risk"
      subtitle="Vulnerable devices and lagging managed items"
      link="/security"
      tone="red"
      icon={<Icon d={ICONS.warning} />}
      card={card}
    >
      {d && (
        <>
          <div className="flex gap-2">
            <BigStat value={d.criticalCves.count} label="with critical CVEs" tone="red" link={linkHref(d.criticalCves.link)} />
            <BigStat value={d.exploitedCves.count} label="actively exploited" tone="orange" link={linkHref(d.exploitedCves.link)} />
          </div>
          <div className="mt-4">
            <SectionLabel>Managed items behind</SectionLabel>
            {shown(d.itemsBehind, (i) => i.devices).length ? (
              <BarList
                color={TONES.orange.hex}
                labelWidth="w-32"
                items={shown(d.itemsBehind, (i) => i.devices).map((i) => ({ label: i.name, count: i.devices, link: linkHref(i.link) }))}
              />
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500">Every managed item is on its latest version</p>
            )}
          </div>
        </>
      )}
    </InsightCard>
  );
}

// MARK: - 9 Expiring Certificates

function ExpiringCertificates({ ctx }: { ctx: InsightContext }) {
  const card = slot(ctx, "expiringCertificates");
  const d: ExpiringCertificatesCard | null = card.status === "ready" ? card.data : null;
  return (
    <InsightCard
      title="Expiring Certificates"
      subtitle={`Expiring within ${d?.windowDays ?? 30} days, and expired`}
      link="/security"
      tone="yellow"
      icon={<Icon d={ICONS.certificate} />}
      card={card}
    >
      {d && (
        <>
          <div className="flex gap-2">
            <BigStat
              value={d.expiring.certificates}
              label={`expiring on ${plural(d.expiring.devices, "device")}`}
              tone="yellow"
              link={linkHref(d.expiring.link)}
            />
            <BigStat value={d.expiredUser.devices} label="devices with expired user certs" tone="red" link={linkHref(d.expiredUser.link)} />
          </div>
          {d.soonest.length > 0 && (
            <div className="mt-4">
              <SectionLabel>Expiring soonest</SectionLabel>
              <DeviceList
                items={d.soonest.map((c) => ({
                  key: c.commonName,
                  name: c.commonName,
                  detail: c.daysUntilExpiry <= 0 ? "today" : plural(c.daysUntilExpiry, "day"),
                  urgent: c.daysUntilExpiry <= 7,
                  link: linkHref(c.link),
                }))}
              />
            </div>
          )}
        </>
      )}
    </InsightCard>
  );
}

// MARK: - Management Tools Logs

/**
 * A log line reduced to its message: the leading timestamp, UTC offset and
 * level tag go, so `<ts> -<n>:<n> [ERR] Device registration failed` and the
 * same message at another time group together.
 */
export function normalizeLogMessage(message: string): string {
  let m = message.trim();
  for (let i = 0; i < 4; i++) {
    const before = m;
    m = m
      .replace(/^<ts>\s*/i, "")
      .replace(/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?\s*/, "")
      .replace(/^[+-]?(<n>|\d{1,2}):(<n>|\d{2})\s+/, "")
      .replace(/^\[?(ERR|ERROR|WARN|WARNING|INFO|DEBUG|E|W)\]?[:\s]\s*/i, "")
      .replace(/^[-:|]\s*/, "");
    if (m === before) break;
  }
  return m || message.trim();
}

/** Groups the top errors by tool and normalised message, summing devices and lines. */
export function groupToolErrors(errors: ManagementToolErrorsCard["topErrors"]): ManagementToolErrorsCard["topErrors"] {
  const groups = new Map<string, ManagementToolErrorsCard["topErrors"][number]>();
  for (const e of errors) {
    const message = normalizeLogMessage(e.message);
    const key = `${e.tool}\u0000${e.name}\u0000${message}`;
    const prior = groups.get(key);
    if (prior) groups.set(key, { ...prior, devices: prior.devices + e.devices, lines: prior.lines + e.lines });
    else groups.set(key, { ...e, message });
  }
  return [...groups.values()].sort((a, b) => b.devices - a.devices || b.lines - a.lines);
}

/**
 * The Management report's Logs tab (/management?tab=logs) filtered to a tool,
 * level and optionally one normalised message. The card links there rather
 * than to the server's /devices?tool= links (revision 6).
 */
export function toolLogsHref(tool: string, level: "error" | "warning", platform?: string | null, message?: string): string {
  const params = new URLSearchParams({ tab: "logs", tool, level });
  if (platform === "macOS" || platform === "Windows") params.set("platform", platform);
  if (message) params.set("message", message);
  return `/management?${params.toString()}`;
}

/**
 * The server's link when it already points at /management/logs (API #163 on),
 * otherwise the report filtered to the tool and level.
 */
function logsLink(link: InsightLink | undefined, tool: string, level: "error" | "warning", platform?: string | null): string {
  // The API links /management/logs; the Logs tab is /management?tab=logs
  return link?.path === "/management/logs"
    ? linkHref({ path: "/management", params: { tab: "logs", ...link.params } })
    : toolLogsHref(tool, level, platform);
}

/** The MDM agent's own logs (log root `mdm`) are left out; the card is about the management tools. */
const isMdmRoot = (tool: string) => tool.toLowerCase() === "mdm";

export function ManagementToolLogs({ ctx }: { ctx: InsightContext }) {
  const card = slot(ctx, "managementToolLogs");
  const d: ManagementToolErrorsCard | null = card.status === "ready" ? card.data : null;
  const tools = d
    ? d.tools.filter((t) => !isMdmRoot(t.tool) && (t.devicesWithErrors || t.devicesWithWarnings || t.errorLines))
    : [];
  const topErrors = d ? groupToolErrors(d.topErrors.filter((m) => !isMdmRoot(m.tool))).slice(0, 5) : [];
  return (
    <InsightCard
      title="Management Tools Logs"
      subtitle={`Errors and warnings in the tools' logs · last ${d?.windowHours ?? 24} h`}
      link="/management?tab=logs"
      tone="yellow"
      icon={<Icon d={ICONS.shield} />}
      card={card}
    >
      {d && (
        <>
          {tools.length ? (
            <ul className="space-y-0.5">
              <li className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 pb-1">
                <span className="flex-1">Tool</span>
                <span className="w-16 text-right">Errors</span>
                <span className="w-16 text-right">Warnings</span>
                <span className="w-14 text-right">Lines</span>
              </li>
              {tools.slice(0, 8).map((t) => (
                <li key={`${t.tool}:${t.name}`} className="flex items-center gap-2 text-sm">
                  <Link href={logsLink(t.link, t.tool, "error", t.platform)} className={`flex-1 min-w-0 truncate py-0.5 text-gray-900 dark:text-gray-100 ${ROW_LINK}`}>
                    {t.name}
                    {t.platform && <span className="ml-1 text-xs text-gray-400">{t.platform}</span>}
                  </Link>
                  <Link
                    href={logsLink(t.link, t.tool, "error", t.platform)}
                    title={`${fmtCount(t.devicesWithErrors)} of ${fmtCount(t.devices)} devices with errors`}
                    className={`w-16 text-right tabular-nums font-medium hover:underline ${t.devicesWithErrors ? TONES.red.text : "text-gray-400 dark:text-gray-500"}`}
                  >
                    {fmtCount(t.devicesWithErrors)}
                  </Link>
                  <Link
                    href={logsLink(t.warningsLink, t.tool, "warning", t.platform)}
                    title={`${fmtCount(t.devicesWithWarnings)} of ${fmtCount(t.devices)} devices with warnings`}
                    className={`w-16 text-right tabular-nums font-medium hover:underline ${t.devicesWithWarnings ? TONES.yellow.text : "text-gray-400 dark:text-gray-500"}`}
                  >
                    {fmtCount(t.devicesWithWarnings)}
                  </Link>
                  <span className="w-14 text-right text-xs tabular-nums text-gray-500 dark:text-gray-400" title="Error lines">
                    {fmtCount(t.errorLines)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500">No errors or warnings logged</p>
          )}
          {topErrors.length > 0 && (
            <div className="mt-4">
              <SectionLabel>Most common errors</SectionLabel>
              <ul className="space-y-1.5">
                {topErrors.map((m) => (
                  <li key={`${m.tool}:${m.message}`} className="text-sm">
                    <Link href={logsLink(m.link, m.tool, "error", undefined)} className={`block py-0.5 ${ROW_LINK}`} title={m.message}>
                      <span className="block truncate font-mono text-xs text-gray-900 dark:text-gray-100">{m.message}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {m.name} · {plural(m.devices, "device")} · {plural(m.lines, "line")}
                      </span>
                    </Link>
                    {m.sampleDevice && (
                      <Link href={linkHref(m.sampleDevice.link)} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                        Open a device&apos;s log
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </InsightCard>
  );
}

// MARK: - Storage

const gb = fmtBytes;

function Storage({ ctx }: { ctx: InsightContext }) {
  const card = slot(ctx, "storage");
  const d: StorageCard | null = card.status === "ready" ? card.data : null;
  const freeColors = [TONES.red.hex, TONES.orange.hex, TONES.yellow.hex, TONES.green.hex];
  return (
    <InsightCard
      title="Storage"
      subtitle="Free space, low-storage devices and capacity"
      link="/hardware"
      tone="orange"
      icon={<Icon d={ICONS.disk} />}
      card={card}
    >
      {d && (
        <>
          <Donut
            center={fmtCount(d.devices)}
            data={d.freeSpace.map((b, i) => ({
              label: b.label,
              count: b.count,
              color: freeColors[i] ?? TONES.gray.hex,
              link: linkHref(b.link),
            }))}
          />
          <div className="flex flex-wrap gap-2 mt-4">
            <StatChip value={d.lowStorage.count} label="under 10% free" tone="red" link={linkHref(d.lowStorage.link)} />
            {d.lowStorage.byPlatform.length > 1 &&
              shown(d.lowStorage.byPlatform, (p) => p.count).map((p) => (
                <StatChip key={p.platform} value={p.count} label={p.platform} tone="orange" link={linkHref(p.link)} />
              ))}
          </div>
          <div className="mt-4">
            <SectionLabel>Capacity</SectionLabel>
            <BarList
              color={TONES.teal.hex}
              items={d.capacity.map((c) => ({ label: c.label, count: c.count, link: linkHref(c.link) }))}
            />
          </div>
          {d.fullest.length > 0 && (
            <div className="mt-4">
              <SectionLabel>Fullest</SectionLabel>
              <DeviceList
                items={d.fullest.map((f) => ({
                  key: f.serialNumber,
                  name: f.name,
                  detail: `${fmtNumber(f.freePct)}% free · ${gb(f.freeBytes)} of ${gb(f.totalBytes)}`,
                  urgent: (countOf(f.freePct) ?? 100) < 5,
                  link: linkHref(f.link),
                }))}
              />
            </div>
          )}
        </>
      )}
    </InsightCard>
  );
}

// MARK: - Directory Services (the Identity report's classes)

const DIRECTORY_COLORS: Record<string, string> = DIRECTORY_SERVICE_COLORS;

/**
 * Directory Services, with the Identity report's dataset, rules and names:
 * Cloud Joined; Domain Joined (Trusted, Unconfirmed, Broken); Standard;
 * Unjoined. Follows the toolbar's platform toggle; no views of its own.
 */
function DirectoryServices({ ctx }: { ctx: InsightContext }) {
  const card = slot(ctx, "directoryServices");
  const d: DirectoryServicesCard | null = card.status === "ready" ? card.data : null;
  return (
    <InsightCard
      title="Directory Services"
      subtitle="How devices are joined, as the Identity report classifies them"
      link="/identity"
      tone="purple"
      icon={<Icon d={ICONS.building} />}
      card={card}
    >
      {d && (
        <>
          <Donut
            center={fmtCount(d.devices)}
            data={shown(d.segments, (s) => s.count).map((s) => ({
              label: s.label,
              count: s.count,
              color: DIRECTORY_COLORS[s.key] ?? TONES.gray.hex,
              link: linkHref(s.link),
              children: shown(s.children, (c) => c.count).map((c) => ({
                label: c.label,
                count: c.count,
                color: DIRECTORY_COLORS[c.key] ?? TONES.gray.hex,
                link: linkHref(c.link),
              })),
            }))}
          />
          <div className="flex flex-wrap gap-2 mt-4">
            <StatChip value={d.shared.count} label="shared" tone="blue" link={linkHref(d.shared.link)} />
            <StatChip value={d.assigned.count} label="assigned" tone="teal" link={linkHref(d.assigned.link)} />
          </div>
        </>
      )}
    </InsightCard>
  );
}

// MARK: - User Accounts (column 2, under Directory Services)

const AUTH_COLORS: Record<string, string> = {
  modern: "#10b981",
  standard: "#3b82f6",
  legacy: "#f59e0b",
};

/**
 * The Identity report's Authentication donut and Administrator Accounts, plus
 * devices with extra local admins (moved here from Directory Services).
 */
function UserAccounts({ ctx }: { ctx: InsightContext }) {
  const card = slot(ctx, "userAccounts");
  const d: UserAccountsCard | null = card.status === "ready" ? card.data : null;
  return (
    <InsightCard
      title="User Accounts"
      subtitle="Authentication and local administrator accounts"
      link="/identity"
      tone="indigo"
      icon={<Icon d={ICONS.identity} />}
      card={card}
    >
      {d && (
        <>
          <SectionLabel>Authentication</SectionLabel>
          <Donut
            center={fmtCount(d.devices ?? (d as { total?: number }).total)}
            data={shown(d.authentication, (a) => a.count).map((a) => ({
              label: a.label,
              count: a.count,
              color: AUTH_COLORS[a.key] ?? TONES.gray.hex,
              link: linkHref(a.link),
            }))}
          />
          {shown(d.adminAccounts, (a) => a.devices).length > 0 && (
            <div className="mt-4">
              <SectionLabel>Administrator accounts</SectionLabel>
              <BarList
                color={TONES.indigo.hex}
                labelWidth="w-32"
                items={shown(d.adminAccounts, (a) => a.devices).slice(0, 5).map((a) => ({ label: a.name, count: a.devices, link: linkHref(a.link) }))}
              />
            </div>
          )}
          <div className="flex flex-wrap gap-2 mt-4">
            <StatChip value={d.extraAdmins.count} label="devices with extra local admins" tone="orange" link={linkHref(d.extraAdmins.link)} />
          </div>
        </>
      )}
    </InsightCard>
  );
}

// MARK: - App Usage (wide events column, under Recent Events)

/** A row of toggle chips, like Platform Distribution's filter pills. */
function ChipRow({
  label,
  options,
  selected,
  onToggle,
  tone,
}: {
  label: string;
  options: { value: string; devices: number }[];
  selected: string[];
  onToggle: (value: string) => void;
  tone: "purple" | "green";
}) {
  if (!options.length) return null;
  const on =
    tone === "purple"
      ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 ring-1 ring-purple-300 dark:ring-purple-700"
      : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 ring-1 ring-green-300 dark:ring-green-700";
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 w-14 shrink-0">{label}</span>
      {options.map((o) => {
        const isOn = selected.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={isOn}
            title={`${o.devices} devices`}
            onClick={() => onToggle(o.value)}
            className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
              isOn ? on : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            {o.value}
          </button>
        );
      })}
    </div>
  );
}

/** App Usage's columns: name (the rest) | 60px bar | hours | devices. */
const APP_USAGE_ROW = "grid grid-cols-[minmax(0,1fr)_60px_3.75rem_3.5rem] items-center gap-2";

export { compactHours };

/**
 * The ten most-used apps, with Usage and Catalog chips that filter the card
 * in place; each app link carries the filters. Reads its own endpoint.
 */
export function AppUsageCard({ platformFilter }: { platformFilter: string }) {
  const [usages, setUsages] = useState<string[]>([]);
  const [catalogs, setCatalogs] = useState<string[]>([]);
  const state = useAppUsage(platformFilter, usages, catalogs);
  const d = state.data;
  const toggle = (set: React.Dispatch<React.SetStateAction<string[]>>) => (v: string) =>
    set((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v].sort()));
  const cardState: CardSlot<AppUsageCardData> = d
    ? { status: "ready", data: d }
    : state.error && !state.loading
      ? { status: "error", error: state.error, retry: state.refresh, retrying: state.loading }
      : { status: "loading", retry: state.refresh };
  const hours = compactHours;
  return (
    <InsightCard
      title="App Usage"
      subtitle={`Most used apps · last ${d?.days ?? APP_USAGE_DAYS} days`}
      link={d ? linkHref(d.link) : `/applications?type=usage&period=${APP_USAGE_DAYS}`}
      tone="blue"
      icon={<Icon d={ICONS.applications} />}
      card={cardState}
    >
      {d && (
        <>
          <div className="space-y-1.5 mb-4">
            <ChipRow label="Usage" options={d.available.usages} selected={usages} onToggle={toggle(setUsages)} tone="purple" />
            <ChipRow label="Catalog" options={d.available.catalogs} selected={catalogs} onToggle={toggle(setCatalogs)} tone="green" />
            {(usages.length > 0 || catalogs.length > 0) && (
              <button
                type="button"
                onClick={() => {
                  setUsages([]);
                  setCatalogs([]);
                }}
                className="px-2.5 py-0.5 text-xs font-medium text-yellow-700 bg-yellow-50 hover:bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-900/30 dark:hover:bg-yellow-900/50 border border-yellow-200 dark:border-yellow-800 rounded-full"
              >
                Clear filters
              </button>
            )}
          </div>
          {state.error && (
            <p className="mb-2 text-xs text-amber-700 dark:text-amber-300">
              Couldn&apos;t refresh ·{" "}
              <button type="button" onClick={state.refresh} className="underline">Retry</button>
            </p>
          )}
          {d.apps.length ? (
            <ul className={state.loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
              {/* Name takes the width; the bar is a fixed 60px, hours and devices are compact */}
              <li
                aria-hidden="true"
                className={`${APP_USAGE_ROW} pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400`}
              >
                <span>App</span>
                <span />
                <span className="text-right">Hours</span>
                <span className="text-right">Devices</span>
              </li>
              {d.apps.map((a) => {
                const max = Math.max(1, ...d.apps.map((x) => countOf(x.totalHours) ?? 0));
                return (
                  <li key={a.name}>
                    <Link
                      href={linkHref(a.link)}
                      className={`${APP_USAGE_ROW} text-sm py-1 ${ROW_LINK}`}
                    >
                      <span className="truncate text-gray-900 dark:text-gray-100" title={a.name}>{a.name}</span>
                      <span className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                        <span className="block h-full rounded-full" style={{ width: `${barWidth(a.totalHours, max)}%`, backgroundColor: TONES.blue.hex }} />
                      </span>
                      <span
                        className="text-right tabular-nums font-medium text-gray-900 dark:text-gray-100"
                        title={`${fmtCount(a.totalHours)} hours`}
                      >
                        {hours(a.totalHours)}
                      </span>
                      <span className="text-right tabular-nums text-gray-500 dark:text-gray-400" title={`${fmtCount(a.devices)} devices`}>
                        {fmtCount(a.devices)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500">No usage recorded for this selection</p>
          )}
        </>
      )}
    </InsightCard>
  );
}

// MARK: - 12 Connectivity Problems

function ConnectivityProblems({ ctx }: { ctx: InsightContext }) {
  const card = slot(ctx, "connectivityProblems");
  const d: ConnectivityProblemsCard | null = card.status === "ready" ? card.data : null;
  return (
    <InsightCard
      title="Connectivity Problems"
      subtitle="Weak Wi-Fi, poor network quality, VPN"
      link="/network"
      tone="blue"
      icon={<Icon d={ICONS.network} />}
      card={card}
    >
      {d && (
        <div className="grid grid-cols-3 gap-2">
          <BigStat value={d.weakSignal.count} label="weak Wi-Fi signal" tone="orange" link={linkHref(d.weakSignal.link)} />
          <BigStat
            value={d.poorQuality.count}
            label={`poor quality, of ${fmtCount(d.poorQuality.measured)} measured`}
            tone="red"
            link={linkHref(withDefaultParams(d.poorQuality.link, "/network", { quality: "poor" }))}
          />
          <BigStat
            value={d.onVpn.count}
            label="on VPN"
            tone="blue"
            link={linkHref(withDefaultParams(d.onVpn.link, "/network", { vpn: "1" }))}
          />
        </div>
      )}
    </InsightCard>
  );
}

// MARK: - The grid cards, in spec order

// Column 1 (Installs, Management Tools Logs, Check-in Gaps) and App Usage are
// placed by the dashboard; these are the other cards, in revision 5's order:
// column 2's four after New Clients, then column 3's around App Usage.

const CARDS: { id: InsightCardKey; Card: React.FC<{ ctx: InsightContext }> }[] = [
  { id: "directoryServices", Card: DirectoryServices },
  { id: "userAccounts", Card: UserAccounts },
  { id: "connectivityProblems", Card: ConnectivityProblems },
  { id: "protectionGaps", Card: ProtectionGaps },
  { id: "expiringCertificates", Card: ExpiringCertificates },
  { id: "updateDebt", Card: UpdateDebt },
  { id: "storage", Card: Storage },
  { id: "softwareRisk", Card: SoftwareRisk },
  { id: "rebootDebt", Card: RebootDebt },
];

/** One insight card by its key, for layouts that place cards individually. */
export function InsightCardById({ id, ctx }: { id: InsightCardKey; ctx: InsightContext }) {
  const entry = CARDS.find((c) => c.id === id);
  if (entry) return <entry.Card ctx={ctx} />;
  if (id === "installHealth") return <InstallHealthHero ctx={ctx} />;
  if (id === "managementToolLogs") return <ManagementToolLogs ctx={ctx} />;
  if (id === "checkinGaps") return <CheckinGaps ctx={ctx} />;
  return null;
}

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

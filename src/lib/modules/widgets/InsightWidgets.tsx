/**
 * Dashboard insight cards. Every number comes from one cached document,
 * GET /api/v1/dashboard/insights (src/lib/dashboard/insights.ts), and every
 * item links where the server says, so web, Swift and C# open the same
 * filtered report. docs/DASHBOARD-WIDGETS.md is the shared contract.
 */

"use client";

import React, { useEffect, useState } from "react";
import { SKELETON_LIMIT_MS } from "../../data-cache";
import Link from "next/link";
import {
  type CheckinGapsCard,
  type ConnectivityProblemsCard,
  type ExpiringCertificatesCard,
  type HardwareAtRiskCard,
  type InsightCardKey,
  type InsightCards as InsightCardData,
  type InsightsState,
  type InstallHealthCard,
  type LocalAdminExposureCard,
  type OSCurrencyCard,
  type ProtectionGapsCard,
  type RebootDebtCard,
  type SoftwareRiskCard,
  type UnmanagedDevicesCard,
  type UnusedSoftwareCard,
  isCardError,
  linkHref,
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

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;

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
              Couldn&apos;t load this card: {card.error}
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
  const pct = total === 0 ? 0 : count / total;
  const tone: Tone = count === 0 ? "green" : pct >= 0.3 ? "red" : pct >= 0.1 ? "orange" : "yellow";
  return (
    <Link href={link} className={`block py-0.5 ${ROW_LINK}`}>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-900 dark:text-gray-100 flex-1 truncate">
          {label}
        </span>
        <span
          className={`font-medium tabular-nums ${count === 0 ? "text-gray-400 dark:text-gray-500" : TONES[tone].text}`}
        >
          {count}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums w-16 text-right">
          of {total}
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

// MARK: - 1 Reboot & Update Debt

function RebootDebt({ ctx }: { ctx: InsightContext }) {
  const card = slot(ctx, "rebootDebt");
  const d = card.status === "ready" ? card.data : null;
  return (
    <InsightCard
      title="Reboot & Update Debt"
      subtitle="Long uptimes and updates waiting"
      link="/system"
      tone="orange"
      icon={<Icon d={ICONS.refresh} />}
      card={card}
    >
      {d && (
        <>
          <div className="flex gap-2">
            <BigStat value={d.uptime30dPlus.count} label="up 30+ days" tone="red" link={linkHref(d.uptime30dPlus.link)} />
            <BigStat value={d.uptime2to4w.count} label="up 2-4 weeks" tone="orange" link={linkHref(d.uptime2to4w.link)} />
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <StatChip value={d.pendingUpdates.count} label="with pending updates" tone="yellow" link={linkHref(d.pendingUpdates.link)} />
            <StatChip value={d.deferredUpdates.count} label="with deferred updates" tone="orange" link={linkHref(d.deferredUpdates.link)} />
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

// MARK: - 3 Unmanaged Devices

function UnmanagedDevices({ ctx }: { ctx: InsightContext }) {
  const card = slot(ctx, "unmanagedDevices");
  const d: UnmanagedDevicesCard | null = card.status === "ready" ? card.data : null;
  return (
    <InsightCard
      title="Unmanaged Devices"
      subtitle="Not enrolled in MDM"
      link="/management"
      tone="purple"
      icon={<Icon d={ICONS.clipboard} />}
      card={card}
    >
      {d && (
        <>
          <div className="flex gap-2">
            <BigStat value={d.unmanaged.count} label={`unmanaged, ${d.unmanaged.pct}% of ${d.devices}`} tone="red" link={linkHref(d.unmanaged.link)} />
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{d.enrolledPct}% of the fleet is enrolled.</p>
          {d.byPlatform.length > 1 && (
            <div className="mt-4">
              <SectionLabel>By platform</SectionLabel>
              <BarList
                color="rgba(168,85,247,0.55)"
                items={d.byPlatform.map((p) => ({
                  label: p.platform,
                  count: p.count,
                  detail: `${p.count} of ${p.devices}`,
                  link: linkHref(p.link),
                }))}
              />
            </div>
          )}
          <div className="mt-4">
            <SectionLabel>Last seen</SectionLabel>
            <BarList
              color="rgba(168,85,247,0.55)"
              labelWidth="w-36"
              items={d.lastSeen.map((b) => ({ label: b.label, count: b.count, link: linkHref(b.link) }))}
            />
          </div>
          {d.recent.length > 0 && (
            <div className="mt-4">
              <SectionLabel>Most recently seen</SectionLabel>
              <DeviceList items={d.recent.map((r) => ({ key: r.serialNumber, name: r.name, detail: r.platform || "", link: linkHref(r.link) }))} />
            </div>
          )}
        </>
      )}
    </InsightCard>
  );
}

// MARK: - 4 Hardware at Risk

function HardwareAtRisk({ ctx }: { ctx: InsightContext }) {
  const card = slot(ctx, "hardwareAtRisk");
  const d: HardwareAtRiskCard | null = card.status === "ready" ? card.data : null;
  return (
    <InsightCard
      title="Hardware at Risk"
      subtitle="Low storage, low memory, Intel Macs"
      link="/hardware"
      tone="teal"
      icon={<Icon d={ICONS.chip} />}
      card={card}
    >
      {d && (
        <div className="grid grid-cols-3 gap-2">
          <BigStat value={d.lowStorage.count} label="under 10% free" tone="red" link={linkHref(d.lowStorage.link)} />
          <BigStat value={d.lowMemory.count} label="8 GB RAM or less" tone="orange" link={linkHref(d.lowMemory.link)} />
          <BigStat value={d.intelMacs.count} label={`Intel Macs of ${d.intelMacs.macs}`} tone="yellow" link={linkHref(d.intelMacs.link)} />
        </div>
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
        className={`text-6xl font-bold leading-none tabular-nums tracking-tight ${value === 0 ? "text-gray-400 dark:text-gray-500" : TONES[tone].text}`}
      >
        {value}
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
  return (
    <InsightCard
      title="Install Health"
      subtitle="Munki and Cimian results"
      link="/installs"
      tone="blue"
      icon={<Icon d={ICONS.download} />}
      card={card}
    >
      {d && (
        <>
          <div className="flex gap-3">
            <HeroStat value={d.withErrors.count} label="devices with errors" tone="red" link={linkHref(d.withErrors.link)} />
            <HeroStat value={d.withWarnings.count} label="devices with warnings" tone="yellow" link={linkHref(d.withWarnings.link)} />
          </div>
          <div className="mt-5">
            <SectionLabel>Top failing items</SectionLabel>
            {d.topFailing.length ? (
              <BarList
                color={TONES.red.hex}
                labelWidth="w-32"
                items={d.topFailing.map((i) => ({ label: i.name, count: i.devices, link: linkHref(i.link) }))}
              />
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500">No failing items</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <StatChip
              value={d.silentAgents.count}
              label={`agents silent over ${d.silentAgents.thresholdDays} days`}
              tone="orange"
              link={linkHref(d.silentAgents.link)}
            />
          </div>
        </>
      )}
    </InsightCard>
  );
}

// MARK: - 6 Check-in Gaps

const reasonLabel = (r: string) =>
  r ? r.charAt(0).toUpperCase() + r.slice(1).replace(/_/g, " ") : "Unknown";

function CheckinGaps({ ctx }: { ctx: InsightContext }) {
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
          {d.reasons.length > 0 && (
            <div className="mt-4">
              <SectionLabel>Rejection reasons</SectionLabel>
              <BarList
                color={TONES.red.hex}
                labelWidth="w-36"
                items={d.reasons.map((r) => ({
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

// MARK: - 7 OS Currency

function OSCurrency({ ctx }: { ctx: InsightContext }) {
  const card = slot(ctx, "osCurrency");
  const d: OSCurrencyCard | null = card.status === "ready" ? card.data : null;
  return (
    <InsightCard
      title="OS Currency"
      subtitle="Latest patch per release, as the fleet runs it"
      link="/system"
      tone="indigo"
      icon={<Icon d={ICONS.refresh} />}
      card={card}
    >
      {d && (
        <>
          <Donut
            center={`${d.pctOnLatest}%`}
            data={[
              { label: "On latest patch", count: d.onLatest, color: TONES.green.hex, link: "/system" },
              { label: "Behind", count: d.behind.count, color: TONES.orange.hex, link: linkHref(d.behind.link) },
            ]}
          />
          {d.lagging.length > 0 && (
            <div className="mt-4">
              <SectionLabel>Most devices behind</SectionLabel>
              <BarList
                color={TONES.orange.hex}
                labelWidth="w-36"
                items={d.lagging.map((v) => ({ label: v.label, count: v.devices, link: linkHref(v.link) }))}
              />
            </div>
          )}
          <div className="flex flex-wrap gap-2 mt-4">
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
            {d.itemsBehind.length ? (
              <BarList
                color={TONES.orange.hex}
                labelWidth="w-32"
                items={d.itemsBehind.map((i) => ({ label: i.name, count: i.devices, link: linkHref(i.link) }))}
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

// MARK: - 10 Local Admin Exposure

function LocalAdminExposure({ ctx }: { ctx: InsightContext }) {
  const card = slot(ctx, "localAdminExposure");
  const d: LocalAdminExposureCard | null = card.status === "ready" ? card.data : null;
  return (
    <InsightCard
      title="Local Admin Exposure"
      subtitle="Extra local admins and unjoined devices"
      link="/identity"
      tone="purple"
      icon={<Icon d={ICONS.users} />}
      card={card}
    >
      {d && (
        <>
          <div className="flex gap-2">
            <BigStat value={d.extraAdmins.count} label={`with extra local admins, of ${d.devices}`} tone="orange" link={linkHref(d.extraAdmins.link)} />
            <BigStat value={d.workgroup.count} label="not Entra or domain joined" tone="red" link={linkHref(d.workgroup.link)} />
          </div>
          {d.byAdminCount.length > 0 && (
            <div className="mt-4">
              <SectionLabel>Admins per device</SectionLabel>
              <BarList
                color={TONES.orange.hex}
                labelWidth="w-32"
                items={d.byAdminCount.map((b) => ({ label: b.label, count: b.count, link: linkHref(b.link) }))}
              />
            </div>
          )}
          {d.topDevices.length > 0 && (
            <div className="mt-4">
              <SectionLabel>Most admins</SectionLabel>
              <DeviceList items={d.topDevices.map((t) => ({ key: t.serialNumber, name: t.name, detail: plural(t.admins, "admin"), link: linkHref(t.link) }))} />
            </div>
          )}
        </>
      )}
    </InsightCard>
  );
}

// MARK: - 11 App Usage (wide events column, under Recent Events)

const APP_USAGE_TOP = 10;

/** The most-used apps. Sits in the wide events column under Recent Events. */
export function AppUsageCard({ ctx }: { ctx: InsightContext }) {
  const card = slot(ctx, "unusedSoftware");
  const d: UnusedSoftwareCard | null = card.status === "ready" ? card.data : null;
  const hours = (h: number) => (h >= 1000 ? `${Math.round(h / 1000)}k h` : `${Math.round(h)} h`);
  const top = d ? d.mostUsed.slice(0, APP_USAGE_TOP) : [];
  return (
    <InsightCard
      title="App Usage"
      subtitle={`Most used apps · last ${d?.days ?? 30} days${ctx.platformFilter !== "all" ? " · All platforms" : ""}`}
      link={`/applications?type=usage&period=${d?.days ?? 30}`}
      tone="teal"
      icon={<Icon d={ICONS.apps} />}
      card={card}
    >
      {d &&
        (top.length ? (
          <BarList
            color={TONES.teal.hex}
            labelWidth="w-56"
            items={top.map((a) => ({ label: a.name, count: a.totalHours, detail: hours(a.totalHours), link: linkHref(a.link) }))}
          />
        ) : (
          <p className="text-sm text-gray-400 dark:text-gray-500">No usage recorded</p>
        ))}
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
            label={`poor quality, of ${d.poorQuality.measured} measured`}
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

// Install Health and App Usage have fixed places (column 1 and the events
// column); the remaining cards fill the insight columns and grid.

const CARDS: { id: InsightCardKey; Card: React.FC<{ ctx: InsightContext }> }[] = [
  { id: "rebootDebt", Card: RebootDebt },
  { id: "protectionGaps", Card: ProtectionGaps },
  { id: "unmanagedDevices", Card: UnmanagedDevices },
  { id: "hardwareAtRisk", Card: HardwareAtRisk },
  { id: "checkinGaps", Card: CheckinGaps },
  { id: "osCurrency", Card: OSCurrency },
  { id: "softwareRisk", Card: SoftwareRisk },
  { id: "expiringCertificates", Card: ExpiringCertificates },
  { id: "localAdminExposure", Card: LocalAdminExposure },
  { id: "connectivityProblems", Card: ConnectivityProblems },
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

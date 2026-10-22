/**
 * Client side of GET /api/v1/dashboard/insights: the twelve dashboard cards
 * in one cached document. The server (reportmate-api dashboard_insights.py)
 * computes counts and short top-N lists with SQL and attaches a deep link to
 * every item; the cards render those as-is. docs/DASHBOARD-WIDGETS.md is the
 * contract shared with the Swift and C# apps.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const INSIGHTS_REFRESH_MS = 5 * 60 * 1000;

export interface InsightLink {
  path: string;
  params: Record<string, string>;
}

export interface Counted {
  count: number;
  link: InsightLink;
}

export interface KeyedCount extends Counted {
  key: string;
  label: string;
}

export interface CardError {
  error: string;
}

export interface RebootDebtCard {
  devices: number;
  uptime30dPlus: Counted;
  uptime2to4w: Counted;
  pendingUpdates: Counted;
  deferredUpdates: Counted;
  uptimeBuckets: KeyedCount[];
}

export interface ProtectionGapsCard {
  devices: number;
  gaps: (KeyedCount & { total: number })[];
  withThreats: Counted;
  criticalCves: Counted;
}

export interface DeviceItem {
  serialNumber: string;
  name: string;
  platform?: string | null;
  link: InsightLink;
}

export interface UnmanagedDevicesCard {
  devices: number;
  unmanaged: Counted & { pct: number };
  enrolledPct: number;
  byPlatform: (Counted & { platform: string; devices: number })[];
  lastSeen: KeyedCount[];
  recent: (DeviceItem & { lastSeen?: string | null })[];
}

export interface HardwareAtRiskCard {
  devices: number;
  lowStorage: Counted;
  lowMemory: Counted;
  intelMacs: Counted & { macs: number };
}

export interface NamedDevices {
  name: string;
  devices: number;
  link: InsightLink;
}

export interface InstallHealthCard {
  devices: number;
  withErrors: Counted;
  withWarnings: Counted;
  topFailing: NamedDevices[];
  silentAgents: Counted & { thresholdDays: number };
}

export interface CheckinGapsCard {
  hours: number;
  checkinsAllPlatforms?: boolean;
  rejected: Counted;
  retried: Counted;
  accepted: Counted;
  reasons: {
    reason: string;
    count: number;
    devices: number;
    link: InsightLink;
  }[];
  stale: Counted;
  missing: Counted;
}

export interface OSCurrencyCard {
  devices: number;
  rated: number;
  onLatest: number;
  pctOnLatest: number;
  minDevices: number;
  behind: Counted;
  unsupportedMac: Counted;
  windows10: Counted;
  lagging: {
    version: string;
    label: string;
    devices: number;
    link: InsightLink;
  }[];
}

export interface SoftwareRiskCard {
  devices: number;
  criticalCves: Counted;
  exploitedCves: Counted;
  itemsBehind: NamedDevices[];
}

export interface ExpiringCertificatesCard {
  devices: number;
  windowDays: number;
  expiring: { certificates: number; devices: number; link: InsightLink };
  expiredUser: { devices: number; link: InsightLink };
  soonest: {
    commonName: string;
    daysUntilExpiry: number;
    devices: number;
    link: InsightLink;
  }[];
}

export interface LocalAdminExposureCard {
  devices: number;
  extraAdmins: Counted;
  byAdminCount: KeyedCount[];
  topDevices: (DeviceItem & { admins: number })[];
  join: KeyedCount[];
  workgroup: Counted & { byPlatform: { platform: string; count: number }[] };
}

export interface UnusedSoftwareCard {
  days: number;
  minInstalls: number;
  leastUsed: {
    name: string;
    activeDevices: number;
    installedDevices: number;
    usageRate: number;
    link: InsightLink;
  }[];
  mostUsed: {
    name: string;
    totalHours: number;
    activeHours: number;
    activeDevices: number;
    link: InsightLink;
  }[];
}

export interface ConnectivityProblemsCard {
  devices: number;
  weakSignal: Counted;
  poorQuality: Counted & { measured: number };
  onVpn: Counted;
}

export interface InsightCards {
  rebootDebt: RebootDebtCard | CardError;
  protectionGaps: ProtectionGapsCard | CardError;
  unmanagedDevices: UnmanagedDevicesCard | CardError;
  hardwareAtRisk: HardwareAtRiskCard | CardError;
  installHealth: InstallHealthCard | CardError;
  checkinGaps: CheckinGapsCard | CardError;
  osCurrency: OSCurrencyCard | CardError;
  softwareRisk: SoftwareRiskCard | CardError;
  expiringCertificates: ExpiringCertificatesCard | CardError;
  localAdminExposure: LocalAdminExposureCard | CardError;
  unusedSoftware: UnusedSoftwareCard | CardError;
  connectivityProblems: ConnectivityProblemsCard | CardError;
}

export type InsightCardKey = keyof InsightCards;

export interface InsightsDocument {
  generatedAt: string;
  platform: string;
  includeArchived: boolean;
  computeSeconds?: number;
  cards: Partial<InsightCards>;
}

export const isCardError = (card: unknown): card is CardError =>
  !!card && typeof card === "object" && "error" in (card as object);

/** `{path, params}` → `/path?k=v`. Commas stay literal, as the reports write them. */
export function linkHref(link: InsightLink | undefined | null): string {
  if (!link?.path) return "/dashboard";
  const query = new URLSearchParams(link.params || {})
    .toString()
    .replace(/%2C/gi, ",");
  return query ? `${link.path}?${query}` : link.path;
}

/**
 * Fills a link the server left unfiltered with the report filter that now
 * exists for it. The API's Connectivity card links poor quality and VPN to
 * plain /network until it learns `quality=poor` and `vpn=1`.
 */
export function withDefaultParams(
  link: InsightLink | undefined,
  path: string,
  params: Record<string, string>,
): InsightLink {
  if (link && link.path === path && Object.keys(link.params || {}).length > 0)
    return link;
  return { path: link?.path || path, params };
}

export interface InsightsState {
  data: InsightsDocument | null;
  loading: boolean;
  /** The last request's failure; the last good document stays in `data`. */
  error: string | null;
  refresh: () => void;
}

/**
 * One request for every card, re-sent every five minutes and whenever the
 * platform toggle changes. A failed refresh keeps the last good answer for
 * that platform on screen.
 */
export function useDashboardInsights(platform: string): InsightsState {
  const [state, setState] = useState<Omit<InsightsState, "refresh">>({
    data: null,
    loading: true,
    error: null,
  });
  const latest = useRef(0);
  const scope =
    platform === "macOS" || platform === "Windows" ? platform : "all";

  const load = useCallback(async () => {
    const id = ++latest.current;
    setState((s) => ({
      ...s,
      loading: true,
      data: s.data && s.data.platform === scope ? s.data : null,
    }));
    try {
      const res = await fetch(
        `/api/v1/dashboard/insights?platform=${encodeURIComponent(scope)}`,
        { cache: "no-store", credentials: "include" },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as InsightsDocument;
      if (!json || typeof json.cards !== "object")
        throw new Error("Unexpected response");
      if (id === latest.current)
        setState({ data: json, loading: false, error: null });
    } catch (err) {
      if (id === latest.current)
        setState((s) => ({
          data: s.data && s.data.platform === scope ? s.data : null,
          loading: false,
          error: err instanceof Error ? err.message : "Failed to load",
        }));
    }
  }, [scope]);

  useEffect(() => {
    load();
    const timer = setInterval(load, INSIGHTS_REFRESH_MS);
    return () => {
      clearInterval(timer);
      // A request counter, not a DOM ref: bumping it drops answers still in
      // flight for the platform being left.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      latest.current++;
    };
  }, [load]);

  return { ...state, refresh: load };
}

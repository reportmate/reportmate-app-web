/**
 * Client side of GET /api/v1/dashboard/insights: the twelve dashboard cards
 * in one cached document. The server (reportmate-api dashboard_insights.py)
 * computes counts and short top-N lists with SQL and attaches a deep link to
 * every item; the cards render those as-is. docs/DASHBOARD-WIDGETS.md is the
 * contract shared with the Swift and C# apps.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { peekCached, rememberCached, trackedFetch } from "../data-cache";

const insightsUrl = (scope: string) =>
  `/api/v1/dashboard/insights?platform=${encodeURIComponent(scope)}`;

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

export interface NamedDevices {
  name: string;
  devices: number;
  link: InsightLink;
}

/** Install Health's totals; `byAgent` repeats them for Munki and Cimian. */
export interface InstallAgentCounts {
  devices: number;
  withErrors: Counted;
  withWarnings: Counted;
  errorItems: Counted;
  warningItems: Counted;
  pending: { items: number; devices: number; link: InsightLink };
  silentAgents: Counted & { thresholdDays?: number };
}

export interface InstallHealthCard extends InstallAgentCounts {
  topFailing: NamedDevices[];
  byAgent: (InstallAgentCounts & { agent: string; name: string; platform: string })[];
}

export interface CheckinGapsCard {
  hours: number;
  checkinsAllPlatforms?: boolean;
  rejected: Counted;
  retried: Counted;
  accepted: Counted;
  reasons: { reason: string; count: number; devices: number; link: InsightLink }[];
  stale: Counted;
  missing: Counted;
}

/** Update Debt (was OS Currency): patch currency plus pending and deferred updates. */
export interface OSCurrencyCard {
  /** Present from the `updateDebt` key on; read from Reboot Debt before then. */
  pendingUpdates?: Counted;
  deferredUpdates?: Counted;
  devices: number;
  rated: number;
  onLatest: number;
  pctOnLatest: number;
  minDevices: number;
  behind: Counted;
  unsupportedMac: Counted;
  windows10: Counted;
  lagging: { version: string; label: string; devices: number; link: InsightLink }[];
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
  soonest: { commonName: string; daysUntilExpiry: number; devices: number; link: InsightLink }[];
}

export interface ManagementToolErrorsCard {
  windowHours: number;
  tools: {
    tool: string;
    name: string;
    platform?: string | null;
    devices: number;
    devicesWithErrors: number;
    devicesWithWarnings: number;
    errorLines: number;
    warningLines: number;
    link: InsightLink;
    warningsLink: InsightLink;
  }[];
  topErrors: {
    message: string;
    tool: string;
    name: string;
    devices: number;
    lines: number;
    link: InsightLink;
    sampleDevice?: { serialNumber: string; link: InsightLink };
  }[];
}

export interface StorageCard {
  devices: number;
  freeSpace: KeyedCount[];
  lowStorage: Counted & { byPlatform: (Counted & { platform: string })[] };
  capacity: KeyedCount[];
  fullest: (DeviceItem & { freePct: number; freeBytes: number; totalBytes: number })[];
}

export interface DirectoryJoinView {
  devices: number;
  segments: KeyedCount[];
  extraAdmins: Counted;
  shared: Counted;
  assigned: Counted;
}

export interface DirectoryJoinCard {
  views: { all: DirectoryJoinView; windows: DirectoryJoinView; mac: DirectoryJoinView };
}

/** A Directory Services slice; Domain Joined carries Trusted, Unconfirmed and Broken. */
export interface DirectoryServiceSegment extends KeyedCount {
  children?: KeyedCount[];
}

/** The Identity report's Directory Services classes, for the global platform. */
export interface DirectoryServicesCard {
  devices: number;
  segments: DirectoryServiceSegment[];
  extraAdmins: Counted;
  shared: Counted;
  assigned: Counted;
}

export interface ConnectivityProblemsCard {
  devices: number;
  weakSignal: Counted;
  poorQuality: Counted & { measured: number };
  onVpn: Counted;
}

/** App Usage has its own endpoint, filtered by usage and catalog. */
export interface AppUsageCard {
  days: number;
  filters: { usages: string[]; catalogs: string[] };
  available: {
    usages: { value: string; devices: number }[];
    catalogs: { value: string; devices: number }[];
  };
  link: InsightLink;
  apps: {
    name: string;
    totalHours: number;
    activeHours: number;
    devices: number;
    activeDevices: number;
    link: InsightLink;
  }[];
}

export interface InsightCards {
  installHealth: InstallHealthCard | CardError;
  rebootDebt: RebootDebtCard | CardError;
  protectionGaps: ProtectionGapsCard | CardError;
  managementToolLogs: ManagementToolErrorsCard | CardError;
  storage: StorageCard | CardError;
  checkinGaps: CheckinGapsCard | CardError;
  updateDebt: OSCurrencyCard | CardError;
  softwareRisk: SoftwareRiskCard | CardError;
  expiringCertificates: ExpiringCertificatesCard | CardError;
  directoryServices: DirectoryServicesCard | CardError;
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
  // Only an in-app path is followed: never "javascript:", another origin or "//host"
  const path = link?.path;
  if (!path || !path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) return "/dashboard";
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
  /** Every card received so far (from the cache, the document or per-card calls). */
  data: InsightsDocument | null;
  loading: boolean;
  /** The last request's failure; the last good document stays in `data`. */
  error: string | null;
  /** Cards whose own request is still in flight (per-card loading only). */
  pending: ReadonlySet<InsightCardKey>;
  refresh: () => void;
}

/** The API's card keys (reportmate-api dashboard_insights.CARD_KEYS). App Usage is separate. */
export const INSIGHT_CARD_KEYS: InsightCardKey[] = [
  "installHealth",
  "rebootDebt",
  "protectionGaps",
  "managementToolLogs",
  "storage",
  "checkinGaps",
  "updateDebt",
  "softwareRisk",
  "expiringCertificates",
  "directoryServices",
  "connectivityProblems",
];

/**
 * Per-card loading, the default: `GET /api/v1/dashboard/insights/{card}`
 * for every card in parallel, each painted as it lands. Set
 * NEXT_PUBLIC_INSIGHTS_PER_CARD=false to use the combined document instead.
 */
export const INSIGHTS_PER_CARD =
  process.env.NEXT_PUBLIC_INSIGHTS_PER_CARD !== "false";

/**
 * Earlier API names for a card, tried in order when the current one is not
 * deployed yet (404), and read from a combined document that still uses them.
 */
export const CARD_KEY_ALIASES: Partial<Record<InsightCardKey, string[]>> = {
  managementToolLogs: ["managementToolErrors"],
  updateDebt: ["osCurrency"],
  directoryServices: ["directoryJoin"],
};

/**
 * A card section in the current shape. Directory Join's `{views}` becomes the
 * view for the platform asked for; Domain Joined's breakdown may arrive as
 * `children`, `breakdown` or `trust`.
 */
export function normalizeCard(key: string, section: any, scope: string): any {
  if (!section || typeof section !== "object" || isCardError(section)) return section;
  if (key === "directoryServices") {
    let view = section;
    if (section.views && typeof section.views === "object") {
      view = section.views[scope === "macOS" ? "mac" : scope === "Windows" ? "windows" : "all"] ?? section.views.all ?? {};
    }
    return {
      ...view,
      // The API names the count `total` on this card
      devices: view.devices ?? view.total ?? 0,
      segments: (Array.isArray(view.segments) ? view.segments : []).map((seg: any) => ({
        ...seg,
        children: seg.children ?? seg.breakdown ?? seg.trust ?? undefined,
      })),
    };
  }
  return section;
}

/** Reads a card from a combined document under its current or earlier name. */
export function cardFromDocument(doc: InsightsDocument | null | undefined, key: InsightCardKey, scope: string): unknown {
  const cards = (doc?.cards ?? {}) as Record<string, unknown>;
  for (const k of [key, ...(CARD_KEY_ALIASES[key] ?? [])]) {
    if (cards[k] !== undefined) return normalizeCard(key, cards[k], scope);
  }
  return undefined;
}

const cardUrl = (key: string, scope: string) =>
  `/api/v1/dashboard/insights/${encodeURIComponent(key)}?platform=${encodeURIComponent(scope)}`;

/** A failed response as a short reason: the body's `error` when it has one. */
async function failureText(res: Response): Promise<string> {
  try {
    const body = await res.json();
    const text = body?.error || body?.detail || body?.message;
    if (typeof text === "string" && text) return `${text} (HTTP ${res.status})`;
  } catch {
    // not JSON
  }
  return `HTTP ${res.status}`;
}

/**
 * A per-card answer. The API sends `{card, platform, includeArchived,
 * generatedAt, data}`; a bare section or `{cards: {key: …}}` is accepted too.
 */
export function unwrapCard(key: string, body: any): unknown {
  if (body && typeof body === "object") {
    // The API's envelope: {card, platform, includeArchived, generatedAt, data}
    if (typeof body.card === "string" && body.data && typeof body.data === "object")
      return body.data;
    if (body.cards && typeof body.cards === "object" && key in body.cards)
      return body.cards[key];
    if (body.card && typeof body.card === "object") return body.card;
    if (body.data && typeof body.data === "object" && !Array.isArray(body.data))
      return body.data;
  }
  return body;
}

const emptyDocument = (scope: string): InsightsDocument => ({
  generatedAt: new Date().toISOString(),
  platform: scope,
  includeArchived: false,
  cards: {},
});

/**
 * The insight cards for one platform: one document request, or one request
 * per card in parallel (INSIGHTS_PER_CARD). Re-sent every five minutes and
 * when the platform toggle changes. The last answer for the platform shows
 * at once on return; a failed refresh keeps it on screen.
 */
export function useDashboardInsights(
  platform: string,
  options: { perCard?: boolean } = {},
): InsightsState {
  const perCard = options.perCard ?? INSIGHTS_PER_CARD;
  const scope =
    platform === "macOS" || platform === "Windows" ? platform : "all";
  const cached = useCallback(
    () => peekCached<InsightsDocument>(insightsUrl(scope)) ?? null,
    [scope],
  );
  const [state, setState] = useState<Omit<InsightsState, "refresh">>(() => ({
    data: cached(),
    loading: true,
    error: null,
    pending: new Set(),
  }));
  const latest = useRef(0);

  const load = useCallback(async () => {
    const id = ++latest.current;
    const hadCache = peekCached(insightsUrl(scope)) !== undefined;
    setState((s) => ({
      ...s,
      loading: true,
      data: s.data && s.data.platform === scope ? s.data : cached(),
      pending: perCard ? new Set(INSIGHT_CARD_KEYS) : new Set(),
    }));

    if (!perCard) {
      try {
        const res = await trackedFetch(
          insightsUrl(scope),
          { cache: "no-store", credentials: "include" },
          { background: hadCache },
        );
        if (!res.ok) throw new Error(await failureText(res));
        const json = (await res.json()) as InsightsDocument;
        if (!json || typeof json.cards !== "object")
          throw new Error("Unexpected response");
        const cards: Record<string, unknown> = {};
        for (const k of INSIGHT_CARD_KEYS) {
          const c = cardFromDocument(json, k, scope);
          if (c !== undefined) cards[k] = c;
        }
        const normalized = { ...json, cards } as InsightsDocument;
        rememberCached(insightsUrl(scope), normalized);
        if (id === latest.current)
          setState({ data: normalized, loading: false, error: null, pending: new Set() });
      } catch (err) {
        if (id === latest.current)
          setState((s) => ({
            data: s.data && s.data.platform === scope ? s.data : null,
            loading: false,
            error: err instanceof Error ? err.message : "Failed to load",
            pending: new Set(),
          }));
      }
      return;
    }

    // Per card: each lands on its own and the cached document is updated as it does.
    let failures = 0;
    let lastError: string | null = null;
    await Promise.all(
      INSIGHT_CARD_KEYS.map(async (key) => {
        let section: unknown;
        try {
          let res: Response | null = null;
          for (const name of [key, ...(CARD_KEY_ALIASES[key] ?? [])]) {
            res = await trackedFetch(
              cardUrl(name, scope),
              { cache: "no-store", credentials: "include" },
              { background: hadCache },
            );
            if (res.status !== 404) break;
          }
          if (!res || !res.ok) throw new Error(res ? await failureText(res) : "No response");
          section = normalizeCard(key, unwrapCard(key, await res.json()), scope);
          const doc = peekCached<InsightsDocument>(insightsUrl(scope)) ?? emptyDocument(scope);
          rememberCached(insightsUrl(scope), {
            ...doc,
            generatedAt: new Date().toISOString(),
            cards: { ...doc.cards, [key]: section },
          });
        } catch (err) {
          failures++;
          lastError = err instanceof Error ? err.message : "Failed to load";
          // A card already on screen keeps its last answer; a new one shows the error.
          const prior = peekCached<InsightsDocument>(insightsUrl(scope))?.cards?.[key];
          section = prior && !isCardError(prior) ? prior : { error: lastError };
        }
        if (id !== latest.current) return;
        setState((s) => {
          const base = s.data && s.data.platform === scope ? s.data : emptyDocument(scope);
          const pending = new Set(s.pending);
          pending.delete(key);
          return {
            ...s,
            data: { ...base, cards: { ...base.cards, [key]: section } } as InsightsDocument,
            pending,
          };
        });
      }),
    );
    if (id === latest.current)
      setState((s) => ({
        ...s,
        loading: false,
        pending: new Set(),
        error: failures ? lastError : null,
      }));
  }, [scope, perCard, cached]);

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

// MARK: - App Usage

export const APP_USAGE_DAYS = 30;

export const appUsageUrl = (
  platform: string,
  usages: string[],
  catalogs: string[],
  days = APP_USAGE_DAYS,
) => {
  const scope = platform === "macOS" || platform === "Windows" ? platform : "all";
  const params = new URLSearchParams({ platform: scope, days: String(days) });
  if (usages.length) params.set("usages", usages.join(","));
  if (catalogs.length) params.set("catalogs", catalogs.join(","));
  return `/api/v1/dashboard/insights/appUsage?${params.toString().replace(/%2C/gi, ",")}`;
};

export interface AppUsageState {
  data: AppUsageCard | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * The App Usage card for one platform and usage/catalog selection. Each
 * combination is its own cached request; switching chips shows the last
 * answer for that combination at once, or keeps the current one on screen
 * while the new one loads.
 */
export function useAppUsage(
  platform: string,
  usages: string[],
  catalogs: string[],
): AppUsageState {
  const url = appUsageUrl(platform, usages, catalogs);
  const [state, setState] = useState<Omit<AppUsageState, "refresh">>(() => ({
    data: peekCached<AppUsageCard>(url) ?? null,
    loading: true,
    error: null,
  }));
  const latest = useRef(0);

  const load = useCallback(async () => {
    const id = ++latest.current;
    const cached = peekCached<AppUsageCard>(url);
    setState((s) => ({ data: cached ?? s.data, loading: true, error: null }));
    try {
      const res = await trackedFetch(
        url,
        { cache: "no-store", credentials: "include" },
        { background: cached !== undefined },
      );
      if (!res.ok) throw new Error(await failureText(res));
      const section = unwrapCard("appUsage", await res.json());
      if (!section || typeof section !== "object") throw new Error("Unexpected response");
      if (isCardError(section)) throw new Error(section.error);
      rememberCached(url, section);
      if (id === latest.current)
        setState({ data: section as AppUsageCard, loading: false, error: null });
    } catch (err) {
      if (id === latest.current)
        setState((s) => ({
          ...s,
          loading: false,
          error: err instanceof Error ? err.message : "Failed to load",
        }));
    }
  }, [url]);

  useEffect(() => {
    load();
    const timer = setInterval(load, INSIGHTS_REFRESH_MS);
    return () => {
      clearInterval(timer);
      // A request counter, not a DOM ref.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      latest.current++;
    };
  }, [load]);

  return { ...state, refresh: load };
}

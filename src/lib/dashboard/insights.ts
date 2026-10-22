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
  /** Every card received so far (from the cache, the document or per-card calls). */
  data: InsightsDocument | null;
  loading: boolean;
  /** The last request's failure; the last good document stays in `data`. */
  error: string | null;
  /** Cards whose own request is still in flight (per-card loading only). */
  pending: ReadonlySet<InsightCardKey>;
  refresh: () => void;
}

/** The card keys, in spec order. The API's final per-card keys replace these. */
export const INSIGHT_CARD_KEYS: InsightCardKey[] = [
  "rebootDebt",
  "protectionGaps",
  "unmanagedDevices",
  "hardwareAtRisk",
  "installHealth",
  "checkinGaps",
  "osCurrency",
  "softwareRisk",
  "expiringCertificates",
  "localAdminExposure",
  "unusedSoftware",
  "connectivityProblems",
];

/**
 * Per-card loading: `GET /api/v1/dashboard/insights/{card}`, every card in
 * parallel so they paint as they land. Off until the API ships those routes;
 * set NEXT_PUBLIC_INSIGHTS_PER_CARD=true to switch.
 */
export const INSIGHTS_PER_CARD =
  process.env.NEXT_PUBLIC_INSIGHTS_PER_CARD === "true";

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
 * A per-card answer: the section itself, or wrapped as `{card}`, `{data}` or
 * `{cards: {key: …}}`, whichever the API settles on.
 */
export function unwrapCard(key: string, body: any): unknown {
  if (body && typeof body === "object") {
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
        rememberCached(insightsUrl(scope), json);
        if (id === latest.current)
          setState({ data: json, loading: false, error: null, pending: new Set() });
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
          const res = await trackedFetch(
            cardUrl(key, scope),
            { cache: "no-store", credentials: "include" },
            { background: hadCache },
          );
          if (!res.ok) throw new Error(await failureText(res));
          section = unwrapCard(key, await res.json());
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

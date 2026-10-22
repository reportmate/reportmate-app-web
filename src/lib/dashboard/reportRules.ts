/**
 * The classification rules shared by the dashboard insight cards and the
 * report pages they deep-link to. A card counts devices with one of these
 * functions and links to `/<report>?<param>=<value>`; the report reads the
 * parameter and filters with the same function, so the number on the card is
 * the number of rows the report shows. docs/DASHBOARD-WIDGETS.md is the
 * contract for the parameter names.
 */

import { normalizePlatform } from "../../providers/PlatformFilterProvider";
import { getUptimeBucketKey } from "../modules/graphs/UptimeDistributionChart";
import { getPendingUpdatesBucketKey } from "../modules/graphs/PendingUpdatesChart";
import { extractNetwork } from "../data-processing/modules/network";

export type Row = Record<string, any>;

// MARK: - Value readers

export const boolish = (v: any): boolean => {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string")
    return ["true", "1", "yes", "on", "enabled"].includes(
      v.trim().toLowerCase(),
    );
  return false;
};

export const boolishIfPresent = (v: any): boolean | null => {
  if (v === null || v === undefined) return null;
  if (
    typeof v === "string" &&
    ![
      "true",
      "false",
      "1",
      "0",
      "yes",
      "no",
      "on",
      "off",
      "enabled",
      "disabled",
    ].includes(v.trim().toLowerCase())
  )
    return null;
  return boolish(v);
};

export const num = (v: any): number => {
  const n =
    typeof v === "number" ? v : typeof v === "string" ? parseFloat(v) : NaN;
  return Number.isFinite(n) ? n : 0;
};

export const rowPlatform = (r: Row): string =>
  normalizePlatform(r.platform || r.osName || r.operatingSystem || "");

/** Splits a comma-separated query value into its trimmed, non-empty parts. */
export const paramList = (value: string | null | undefined): string[] =>
  (value || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

// MARK: - /system

export const UPTIME_KEYS = [
  "lt1d",
  "1-3d",
  "3-7d",
  "1-2w",
  "2-4w",
  "30d+",
] as const;
export const PENDING_KEYS = ["up-to-date", "1-5", "6-10", "10+"] as const;

export function uptimeSeconds(r: Row): number | null {
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

/** `lt1d` … `30d+`, the same keys the System report's uptime chart uses. */
export const uptimeBucketKey = (r: Row): string | null => {
  const s = uptimeSeconds(r);
  return s && s > 0 ? getUptimeBucketKey(s) : null;
};

/** `up-to-date`, `1-5`, `6-10`, `10+`, as the pending-updates chart buckets them. */
export const pendingBucketKey = (r: Row): string | null =>
  getPendingUpdatesBucketKey(r.pendingUpdatesCount);

export const hasDeferredUpdates = (r: Row): boolean =>
  num(r.deferredUpdatesCount) > 0;

const isMac = (r: Row) => rowPlatform(r) === "macOS";
const isWindows = (r: Row) => rowPlatform(r) === "Windows";

/** "26.3.1 (a)" → [26, 3, 1]. */
const versionParts = (v: string): number[] =>
  (v.match(/^\d+(?:\.\d+)*/)?.[0] || "")
    .split(".")
    .filter(Boolean)
    .map((p) => parseInt(p, 10));

const compareParts = (a: number[], b: number[]): number => {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] || 0) - (b[i] || 0);
    if (d !== 0) return d;
  }
  return 0;
};

/**
 * Release order of a macOS major. Apple went from 15 straight to 26, so
 * "two majors behind 27" is 15, not 25.
 */
const macOrdinal = (major: number): number =>
  major >= 26 ? major - 26 + 16 : major;

/**
 * The "patch train" a device is on and its position on it.
 * macOS: major (26) and the full version. Windows: the build (26200) and the
 * update revision (`featureUpdate`, e.g. 9711).
 */
function patchTrain(r: Row): { train: string; level: number[] } | null {
  if (isMac(r)) {
    const parts = versionParts(String(r.osVersion || ""));
    if (!parts.length) return null;
    return { train: `macOS ${parts[0]}`, level: parts };
  }
  if (isWindows(r)) {
    const build = String(r.buildNumber || "").trim();
    const ubr = num(r.featureUpdate);
    if (!build || !ubr) return null;
    return { train: `Windows build ${build}`, level: [ubr] };
  }
  return null;
}

export interface OSCurrency {
  /** True when a newer patch of the device's own major/build is seen in the fleet. */
  isBehind: (r: Row) => boolean;
  /** macOS more than two majors behind the newest major seen in the fleet. */
  isUnsupportedMac: (r: Row) => boolean;
  isWindows10: (r: Row) => boolean;
  /** Has a patch level the currency rules can judge. */
  isRated: (r: Row) => boolean;
  /** The value `/system?osVersion=` matches for this device. */
  versionKey: (r: Row) => string;
}

/** A version (or major) needs this many devices before it sets the bar. */
export const OS_CURRENCY_MIN_DEVICES = 5;

/**
 * The OS currency rules are relative to the fleet, so pass every row the
 * report has, not a filtered subset. The latest patch of each macOS major
 * (or Windows build) is the highest version at least
 * OS_CURRENCY_MIN_DEVICES devices report, so one beta Mac doesn't put the
 * fleet behind; when no version of a train reaches that, the highest seen
 * counts. "Unsupported" is measured from the newest macOS major that many
 * devices report, with the same fallback.
 */
export function osCurrency(rows: Row[]): OSCurrency {
  const levels = new Map<string, Map<string, { level: number[]; count: number }>>();
  const macMajors = new Map<number, number>();
  for (const r of rows) {
    const t = patchTrain(r);
    if (!t) continue;
    const train = levels.get(t.train) || new Map();
    const key = t.level.join(".");
    const entry = train.get(key) || { level: t.level, count: 0 };
    entry.count++;
    train.set(key, entry);
    levels.set(t.train, train);
    if (isMac(r)) {
      const o = macOrdinal(t.level[0]);
      macMajors.set(o, (macMajors.get(o) || 0) + 1);
    }
  }
  const latest = new Map<string, number[]>();
  for (const [train, entries] of levels) {
    const all = [...entries.values()].sort((x, y) => compareParts(y.level, x.level));
    const pick = all.find((e) => e.count >= OS_CURRENCY_MIN_DEVICES) || all[0];
    latest.set(train, pick.level);
  }
  const majors = [...macMajors.entries()].sort((x, y) => y[0] - x[0]);
  const newestMac =
    (majors.find(([, n]) => n >= OS_CURRENCY_MIN_DEVICES) || majors[0])?.[0] || 0;
  return {
    isBehind: (r) => {
      const t = patchTrain(r);
      const top = t && latest.get(t.train);
      return !!t && !!top && compareParts(t.level, top) < 0;
    },
    isUnsupportedMac: (r) => {
      if (!isMac(r)) return false;
      const major = versionParts(String(r.osVersion || ""))[0];
      return !!major && macOrdinal(major) < newestMac - 2;
    },
    isWindows10: (r) =>
      isWindows(r) && /Windows\s+10\b/i.test(String(r.operatingSystem || "")),
    isRated: (r) => patchTrain(r) !== null,
    versionKey: (r) => {
      if (isMac(r)) return String(r.osVersion || "").replace(/\s*\(.*\)$/, "");
      const name = String(r.operatingSystem || "").match(/Windows\s+(\d+)/);
      return name && r.buildNumber ? `${name[1]}.${r.buildNumber}` : "";
    },
  };
}

// MARK: - /hardware

export function memoryBytes(r: Row): number {
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

export function storageBytes(r: Row): { total: number; free: number } {
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

/** `storage=low`: under 10% of internal storage free. */
export function isLowStorage(r: Row): boolean {
  const { total, free } = storageBytes(r);
  return total > 0 && free > 0 && free / total < 0.1;
}

/** `memory=le8`: 8 GB of memory or less. */
export function isLowMemory(r: Row): boolean {
  const mem = memoryBytes(r);
  return mem > 0 && mem <= 8 * 1073741824;
}

export function processorText(r: Row): string {
  const p = r.processor ?? r.cpu;
  if (typeof p === "string") return p;
  return String(p?.name || p?.model || p?.brand || "");
}

/** `arch=`: Apple Silicon, Intel, ARM64, x64 (or Unknown). */
export function archFamily(r: Row): string {
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

/** `type=laptop`; everything else is `type=desktop`. */
export function isLaptop(r: Row): boolean {
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

// MARK: - /security

export const securityThreats = (r: Row): number =>
  num(r.activeThreatCount ?? r.detectionCount);
export const expiredCerts = (r: Row): number =>
  num(r.userExpiredCertCount ?? r.expiredCertCount);
export const expiringCerts = (r: Row): number => num(r.expiringSoonCertCount);

/** Devices the Antivirus row counts: every Windows device, and Macs that report one. */
export const hasAntivirusProduct = (r: Row): boolean =>
  rowPlatform(r) === "Windows" ||
  boolish(r.antivirusEnabled) ||
  !!r.antivirusName;

/**
 * One predicate per `/security` parameter value. A device "matches" when it
 * is in the group the card counts, e.g. `encryption=off` matches devices
 * without disk encryption.
 */
export const SECURITY_PARAM_RULES: Record<
  string,
  Record<string, (r: Row) => boolean>
> = {
  encryption: { off: (r) => !boolish(r.encryptionEnabled) },
  firewall: { off: (r) => !boolish(r.firewallEnabled) },
  antivirus: {
    off: (r) => hasAntivirusProduct(r) && !boolish(r.antivirusEnabled),
  },
  sip: {
    off: (r) =>
      rowPlatform(r) !== "Windows" && boolishIfPresent(r.sipEnabled) === false,
  },
  secureBoot: {
    off: (r) => rowPlatform(r) === "Windows" && !boolish(r.secureBootEnabled),
  },
  threats: { "1": (r) => securityThreats(r) > 0 },
  certs: {
    expired: (r) => expiredCerts(r) > 0,
    expiring: (r) => expiringCerts(r) > 0,
  },
  cve: {
    critical: (r) => num(r.criticalCveCount) > 0,
    exploited: (r) => num(r.activelyExploitedCveCount) > 0,
  },
};

// MARK: - /management

/** Provider name as the Management card groups it. */
export function managementProvider(r: Row): string {
  if (!boolish(r.isEnrolled)) return "Unmanaged";
  let p: string = r.provider || "Unknown";
  if (p.startsWith("Microsoft Intune")) p = "Microsoft Intune";
  return p;
}

// MARK: - /identity

export type JoinType = "entra" | "domain" | "hybrid" | "workgroup";
export const JOIN_LABELS: Record<JoinType, string> = {
  entra: "Entra joined",
  domain: "Domain joined",
  hybrid: "Hybrid joined",
  workgroup: "Workgroup",
};

/**
 * Join type from the identity row. The Next route already reduces
 * `directoryServices` to `entraJoined` / `domainJoined`; the raw block is read
 * when those are missing.
 */
export function joinType(r: Row): JoinType {
  const ds = r.directoryServices || {};
  const entra =
    r.entraJoined ??
    (boolish(ds.azureAd?.joined) || boolish(ds.azureAd?.isJoined));
  const domain =
    r.domainJoined ??
    (boolish(ds.activeDirectory?.bound) ||
      boolish(ds.activeDirectory?.isDomainJoined));
  if (entra && domain) return "hybrid";
  if (entra) return "entra";
  if (domain) return "domain";
  return "workgroup";
}

/** `admins=extra`: more than one local administrator. */
export const hasExtraAdmins = (r: Row): boolean =>
  num(r.adminUsers ?? r.summary?.adminUsers) > 1;

/** `usage=shared|assigned`, from the inventory usage field. */
export const usageKind = (r: Row): "shared" | "assigned" | null => {
  const u = String(r.usage || "").toLowerCase();
  if (u.includes("shared")) return "shared";
  if (u.includes("assigned")) return "assigned";
  return null;
};

// MARK: - /network

const networkInfoCache = new WeakMap<Row, any>();
/** The network report's reading of a row, via the same extractNetwork. */
export function networkInfo(r: Row): any {
  let info = networkInfoCache.get(r);
  if (!info) {
    info =
      r.networkInfo ||
      extractNetwork({
        id: r.deviceId,
        name: r.deviceName,
        modules: r.raw ? { network: r.raw } : undefined,
      });
    networkInfoCache.set(r, info);
  }
  return info;
}

/** `connection=wired|wifi`, the same substrings the network report's toggle tests. */
export function connectionKind(r: Row): "wired" | "wifi" | null {
  const t = String(networkInfo(r)?.connectionType || "").toLowerCase();
  if (t.includes("ethernet") || t.includes("wired")) return "wired";
  if (t.includes("wireless") || t.includes("wifi") || t.includes("wi-fi"))
    return "wifi";
  return null;
}

export function signalPercent(r: Row): number {
  const value = Number(networkInfo(r)?.signalStrength);
  return Number.isFinite(value) ? value : 0;
}

/** `signal=weak`: the network report's "Poor" bucket (above 0, under 25%). */
export const isWeakSignal = (r: Row): boolean => {
  const s = signalPercent(r);
  return s > 0 && s < 25;
};

// MARK: - /peripherals

export const printerCount = (r: Row): number =>
  Array.isArray(r.printers) ? r.printers.length : 0;
export const displayCount = (r: Row): number =>
  Array.isArray(r.displayDevices) ? r.displayDevices.length : 0;
export const deviceRoom = (r: Row): string =>
  String(r.location || r.room || "").trim();

// MARK: - /installs

/**
 * `stale=1`: an install agent (Munki or Cimian) silent more than this many
 * days. The installs/filters payload's own staleAgentThresholdDays is 1; the
 * dashboard card and the report both use this one instead.
 */
export const SILENT_AGENT_DAYS = 7;

/** An entry of the installs/filters `staleAgents[]` past SILENT_AGENT_DAYS. */
export const isSilentAgent = (a: Row): boolean =>
  num(a.staleDays) > SILENT_AGENT_DAYS;

/** `item=<name>`: the device manages that item (case-insensitive name match). */
export const hasManagedItem = (items: Row[], name: string): boolean => {
  const want = name.trim().toLowerCase();
  return (
    !!want &&
    items.some(
      (i) => String(i?.itemName || i?.name || "").toLowerCase() === want,
    )
  );
};

/**
 * `quality=poor`: the speed test rated the connection Low, read from the raw
 * network block exactly as the API's Connectivity Problems card counts it
 * (`rating`, or the download/upload ratings when there is no overall one).
 */
export function isPoorNetworkQuality(r: Row): boolean {
  const nq = r.raw?.networkQuality;
  if (!nq || typeof nq !== "object") return false;
  const low = (v: any) => String(v ?? "").trim().toLowerCase() === "low";
  const rating = String(nq.rating ?? "").trim();
  if (rating) return low(rating);
  return low(nq.dlRating ?? nq.dl_rating) || low(nq.ulRating ?? nq.ul_rating);
}

// MARK: - Last seen (`/management?lastSeen=`)

export type LastSeenBucket = "24h" | "1-7d" | "7d+";
export const LAST_SEEN_LABELS: Record<LastSeenBucket, string> = {
  "24h": "Seen in the last 24 hours",
  "1-7d": "Seen 1-7 days ago",
  "7d+": "Silent over 7 days",
};

export const lastSeenFromParam = (value: string | null): LastSeenBucket | null =>
  value === "24h" || value === "1-7d" || value === "7d+" ? value : null;

/**
 * The API's Unmanaged Devices buckets: under 24 hours, 24 hours to 7 days,
 * and over 7 days (or never seen) since `lastSeen`.
 */
export function lastSeenBucket(
  lastSeen: string | null | undefined,
  now: number = Date.now(),
): LastSeenBucket {
  const t = lastSeen ? new Date(lastSeen).getTime() : NaN;
  if (!Number.isFinite(t)) return "7d+";
  const hours = (now - t) / 3600000;
  if (hours < 24) return "24h";
  if (hours < 168) return "1-7d";
  return "7d+";
}

// MARK: - Admin count (`/identity?admins=`)

/** `extra` (more than one admin), or an exact count: `2`, `3`, `4+` (four or more). */
export type AdminsParam = "extra" | "2" | "3" | "4+";
export const ADMINS_LABELS: Record<AdminsParam, string> = {
  extra: "More than one admin",
  "2": "2 admins",
  "3": "3 admins",
  "4+": "4 or more admins",
};

export const adminsFromParam = (value: string | null): AdminsParam | null =>
  value === "extra" || value === "2" || value === "3" || value === "4+"
    ? value
    : null;

export function matchesAdmins(r: Row, admins: AdminsParam): boolean {
  const n = num(r.adminUsers ?? r.summary?.adminUsers);
  if (admins === "extra") return n > 1;
  if (admins === "4+") return n >= 4;
  return n === Number(admins);
}

// MARK: - Storage buckets (`/hardware?storage=`, `/hardware?capacity=`)

/** The API's boolean vocabularies (dashboard_insights._TRUE / _FALSE). */
const SQL_TRUE = ["true", "t", "yes", "y", "on", "1"];
const SQL_FALSE = ["false", "f", "no", "n", "off", "0"];
const sqlText = (v: any): string =>
  v === null || v === undefined ? "" : String(v).trim().toLowerCase();
/** `LOWER(x) IN {{TRUE}}`: true, t, yes, y, on or 1 (a JSON true reads as "true"). */
export const sqlTrue = (v: any): boolean => SQL_TRUE.includes(sqlText(v));
const sqlFalse = (v: any): boolean => SQL_FALSE.includes(sqlText(v));

/** A JSON number the SQL `jsonb_typeof(..) = 'number'` test accepts, else null. */
const jsonNumber = (v: any): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

/**
 * Internal storage exactly as the API's storage_devices.sql reduces it: the
 * `storage` list (or `drives` when that is empty), drives whose `isInternal`
 * is not a false word, each drive's `capacity` (or `size` when capacity is
 * missing or 0) and `freeSpace` (or `free_space`), numbers only.
 */
export function internalStorage(r: Row): { total: number; free: number } {
  const list: any[] =
    Array.isArray(r.storage) && r.storage.length > 0
      ? r.storage
      : Array.isArray(r.drives)
        ? r.drives
        : [];
  let total = 0,
    free = 0;
  for (const d of list) {
    if (!d || typeof d !== "object" || Array.isArray(d)) continue;
    if (sqlFalse(d.isInternal)) continue;
    const cap = jsonNumber(d.capacity);
    total += (cap !== null && cap !== 0 ? cap : jsonNumber(d.size)) ?? 0;
    const fs = jsonNumber(d.freeSpace);
    free += (fs !== null && fs !== 0 ? fs : jsonNumber(d.free_space)) ?? 0;
  }
  return { total, free };
}

export const STORAGE_FREE_KEYS = ["lt5", "5-10", "10-20", "20+"] as const;
export type StorageFreeKey = (typeof STORAGE_FREE_KEYS)[number];
export const STORAGE_FREE_LABELS: Record<StorageFreeKey, string> = {
  lt5: "Under 5% free",
  "5-10": "5-10% free",
  "10-20": "10-20% free",
  "20+": "20% or more free",
};

export const STORAGE_CAPACITY_KEYS = ["le256", "512", "1t", "2t+"] as const;
export type StorageCapacityKey = (typeof STORAGE_CAPACITY_KEYS)[number];
export const STORAGE_CAPACITY_LABELS: Record<StorageCapacityKey, string> = {
  le256: "256 GB or less",
  "512": "512 GB",
  "1t": "1 TB",
  "2t+": "2 TB or more",
};

/** Devices the storage card measures: some internal capacity and some free space. */
const measuredStorage = (r: Row) => {
  const s = internalStorage(r);
  return s.total > 0 && s.free > 0 ? s : null;
};

/** `storage=lt5|5-10|10-20|20+`: free space over internal capacity, storage.sql's buckets. */
export function storageFreeBucket(r: Row): StorageFreeKey | null {
  const s = measuredStorage(r);
  if (!s) return null;
  const ratio = s.free / s.total;
  if (ratio < 0.05) return "lt5";
  if (ratio < 0.1) return "5-10";
  if (ratio < 0.2) return "10-20";
  return "20+";
}

/**
 * `storage=low` on the card is lt5 + 5-10 (shape_storage `lowStorage`), i.e.
 * under 10% free, measured the storage.sql way.
 */
export const isLowStorageBucket = (r: Row): boolean => {
  const b = storageFreeBucket(r);
  return b === "lt5" || b === "5-10";
};

/**
 * `capacity=le256|512|1t|2t+`: total internal capacity in decimal bytes with
 * storage.sql's midpoint cut-offs (384 GB, 768 GB, 1.536 TB), so a "512 GB"
 * drive that formats to 494 GB still lands in 512.
 */
export function storageCapacityBucket(r: Row): StorageCapacityKey | null {
  const s = measuredStorage(r);
  if (!s) return null;
  if (s.total < 384e9) return "le256";
  if (s.total < 768e9) return "512";
  if (s.total < 1536e9) return "1t";
  return "2t+";
}

// MARK: - Install agent (`/installs?agent=`)

export const INSTALL_AGENTS = ["munki", "cimian"] as const;
export type InstallAgent = (typeof INSTALL_AGENTS)[number];
export const INSTALL_AGENT_LABELS: Record<InstallAgent, string> = {
  munki: "Munki",
  cimian: "Cimian",
};

export const installAgentFromParam = (value: string | null): InstallAgent | null => {
  const v = (value || "").trim().toLowerCase();
  return v === "munki" || v === "cimian" ? v : null;
};

/**
 * The install agent a device counts under on the Install Health card: Munki
 * on macOS and Cimian on Windows (install_counts.sql splits by platform).
 * When the platform is unknown the agent whose module the device reports
 * decides, Cimian first, as the installs report already falls back.
 */
export function installAgent(r: Row): InstallAgent | null {
  const p = rowPlatform(r);
  if (p === "Windows") return "cimian";
  if (p === "macOS") return "munki";
  const inst = r.modules?.installs;
  if (inst?.cimian) return "cimian";
  if (inst?.munki) return "munki";
  return null;
}

// MARK: - Mac directory (`/identity?directory=`)

export const MAC_DIRECTORY_KEYS = ["psso", "bound", "unbound"] as const;
export type MacDirectory = (typeof MAC_DIRECTORY_KEYS)[number];
export const MAC_DIRECTORY_LABELS: Record<MacDirectory, string> = {
  psso: "Platform SSO / Entra",
  bound: "AD-bound",
  unbound: "Not bound",
};

/**
 * A Mac's directory state as directory_join.sql reads it: Platform SSO
 * registered or Entra joined first, then bound to AD or LDAP, else not bound.
 * Reads the identity route's flattened fields (platformSSORegistered,
 * entraJoined, domainJoined, ldapBound) and falls back to the raw blocks.
 * Null for anything that is not a Mac.
 */
export function macDirectory(r: Row): MacDirectory | null {
  if (rowPlatform(r) !== "macOS") return null;
  const ds = r.directoryServices || r.directory_services || {};
  const az =
    ds.azureAd || ds.azure_ad || ds.entraId || ds.entra_id || ({} as Row);
  const ad = ds.activeDirectory || ds.active_directory || ({} as Row);
  const pssoBlock = r.platformSSOUsers || r.platform_sso_users || {};
  const psso =
    sqlTrue(r.platformSSORegistered) ||
    sqlTrue(pssoBlock.deviceRegistered ?? pssoBlock.device_registered);
  const entra =
    sqlTrue(r.entraJoined) ||
    ["joined", "is_aad_joined", "isAadJoined", "is_entra_joined", "isEntraJoined"].some(
      (k) => sqlTrue(az[k]),
    );
  const domain =
    sqlTrue(r.domainJoined) ||
    sqlTrue(r.adBound) ||
    ["bound", "is_domain_joined", "isDomainJoined"].some((k) => sqlTrue(ad[k]));
  const ldap = sqlTrue(r.ldapBound) || sqlTrue(ds.ldap?.bound);
  if (psso || entra) return "psso";
  if (domain || ldap) return "bound";
  return "unbound";
}

// MARK: - Management tool logs (`/devices?tool=&level=`, `/device/<serial>?tab=management&tool=&level=`)

/** Log root keys the Management Tools card links with. */
export const MANAGEMENT_TOOL_ROOTS = [
  "installs",
  "bootstrap",
  "reports",
  "state",
  "encryption",
  "users",
  "utilities",
  "notifications",
  "installer",
  "mdm",
] as const;
export type ManagementToolRoot = (typeof MANAGEMENT_TOOL_ROOTS)[number];

export const toolRootFromParam = (value: string | null): ManagementToolRoot | null => {
  const v = (value || "").trim().toLowerCase();
  return (MANAGEMENT_TOOL_ROOTS as readonly string[]).includes(v)
    ? (v as ManagementToolRoot)
    : null;
};

export type ToolLevel = "error" | "warning";
export const toolLevelFromParam = (value: string | null): ToolLevel | null => {
  const v = (value || "").trim().toLowerCase();
  return v === "error" || v === "warning" ? v : null;
};

/** The card's window (dashboard_insights.TOOL_WINDOW_HOURS). */
export const TOOL_WINDOW_HOURS = 24;

/** The first UTC hour key inside the window, `YYYY-MM-DDTHH` like levelSummary's keys. */
export function toolWindowStartHour(now: number = Date.now(), hours: number = TOOL_WINDOW_HOURS): string {
  return new Date(now - hours * 3600000).toISOString().slice(0, 13);
}

/**
 * Error and warning lines in a log root's `levelSummary` (stamped at ingest,
 * log_tails.summarize_root) from `sinceHour` on, summed the way
 * management_tool_errors.sql does: `hours` maps an hour key to
 * [errors, warnings], keys compared as text, non-numbers count as 0.
 */
export function levelSummaryCounts(
  summary: any,
  sinceHour: string = toolWindowStartHour(),
): { errors: number; warnings: number } {
  const hours = summary && typeof summary === "object" ? summary.hours : null;
  let errors = 0,
    warnings = 0;
  if (!hours || typeof hours !== "object" || Array.isArray(hours))
    return { errors, warnings };
  for (const [key, value] of Object.entries(hours)) {
    if (key < sinceHour || !Array.isArray(value)) continue;
    errors += jsonNumber(value[0]) !== null ? Math.trunc(value[0]) : 0;
    warnings += jsonNumber(value[1]) !== null ? Math.trunc(value[1]) : 0;
  }
  return { errors, warnings };
}

/** True when the root logged at least one line of `level` inside the window. */
export function rootHasLevelInWindow(
  root: Row | null | undefined,
  level: ToolLevel,
  sinceHour: string = toolWindowStartHour(),
): boolean {
  const c = levelSummaryCounts(root?.levelSummary, sinceHour);
  return level === "error" ? c.errors > 0 : c.warnings > 0;
}

const TOOL_PRODUCT_NAMES: Record<string, [mac: string, windows: string]> = {
  installs: ["Munki", "Cimian"],
  bootstrap: ["BootstrapMate", "BootstrapMate"],
  reports: ["ReportMate", "ReportMate"],
  state: ["Outset", "StartSet"],
  encryption: ["Crypt", "Crypt"],
  users: ["ManageUsers", "ManageUsers"],
  utilities: ["Utilities", "Utilities"],
  notifications: ["swiftDialog", "csharpDialog"],
  installer: ["Installer", "Installer"],
};

/**
 * The product name the card shows for a tool (dashboard_insights.tool_product):
 * per platform when given, both names when the tool differs by platform and
 * no platform is set, and "MDM" for the mdm root.
 */
export function toolProductLabel(tool: string, platform?: string | null): string {
  if (tool === "mdm") return "MDM";
  const names = TOOL_PRODUCT_NAMES[tool];
  if (!names) return tool.charAt(0).toUpperCase() + tool.slice(1);
  const p = normalizePlatform(platform || "");
  if (p === "Windows") return names[1];
  if (p === "macOS") return names[0];
  return names[0] === names[1] ? names[0] : `${names[0]} / ${names[1]}`;
}

// MARK: - Directory Services (`/identity?directory=`), the Identity report's classes

/**
 * The Identity report's Directory Services widget classes, as URL keys. The
 * Domain Joined slice breaks down into Trusted, Unconfirmed and Broken.
 * `psso`, `bound` and `unbound` (Mac directory state) are read separately.
 */
export const DIRECTORY_SERVICE_LABELS = {
  cloud: "Cloud Joined",
  domain: "Domain Joined",
  trusted: "Trusted",
  unconfirmed: "Unconfirmed",
  broken: "Broken",
  standard: "Standard",
  unjoined: "Unjoined",
} as const;
export type DirectoryServiceKey = keyof typeof DIRECTORY_SERVICE_LABELS;

/** `directory=` → the identity widget's label. Takes the key or the label, any case. */
export function directoryServiceFromParam(value: string | null): string | null {
  const v = (value || "").trim().toLowerCase().replace(/[\s_]+/g, "-");
  if (!v) return null;
  for (const [key, label] of Object.entries(DIRECTORY_SERVICE_LABELS)) {
    if (v === key || v === label.toLowerCase().replace(/\s+/g, "-")) return label;
  }
  if (v === "cloud-joined" || v === "entra") return DIRECTORY_SERVICE_LABELS.cloud;
  if (v === "domain-joined") return DIRECTORY_SERVICE_LABELS.domain;
  return null;
}

/** The identity widget's label → its `directory=` key. */
export function directoryServiceToParam(label: string | null): string | null {
  if (!label) return null;
  const hit = Object.entries(DIRECTORY_SERVICE_LABELS).find(([, l]) => l === label);
  return hit ? hit[0] : null;
}

/**
 * Whether an identity row is in a Directory Services class, by the Identity
 * report's own rules: the route's `enrollmentType` (Cloud Joined, Domain
 * Joined, Standard, Unjoined), and for domain-joined devices `trustStatus`
 * (Healthy = Trusted, Broken = Broken, anything else = Unconfirmed).
 */
export function matchesDirectoryService(r: Row, label: string): boolean {
  const domain = r.enrollmentType === "Domain Joined";
  if (label === DIRECTORY_SERVICE_LABELS.broken) return domain && r.trustStatus === "Broken";
  if (label === DIRECTORY_SERVICE_LABELS.trusted) return domain && r.trustStatus === "Healthy";
  if (label === DIRECTORY_SERVICE_LABELS.unconfirmed)
    return domain && r.trustStatus !== "Healthy" && r.trustStatus !== "Broken";
  return r.enrollmentType === label;
}

/**
 * The Identity report's Directory Services colours, by class key. The four
 * top-level classes never share a colour; Domain Joined's trust breakdown
 * has its own scale.
 */
export const DIRECTORY_SERVICE_COLORS: Record<DirectoryServiceKey, string> = {
  cloud: "#10b981",
  domain: "#f59e0b",
  standard: "#3b82f6",
  unjoined: "#ef4444",
  trusted: "#eab308",
  unconfirmed: "#f97316",
  broken: "#ef4444",
};

/** The same colours by the widget's labels, for the identity page. */
export const DIRECTORY_SERVICE_COLORS_BY_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(DIRECTORY_SERVICE_LABELS).map(([key, label]) => [
    label,
    DIRECTORY_SERVICE_COLORS[key as DirectoryServiceKey],
  ]),
);

// MARK: - Authentication and admin accounts (`/identity?auth=`, `?admin=`)

/** The Identity report's Authentication classes, as URL keys. */
export const AUTH_LABELS = { modern: "Modern", legacy: "Legacy", standard: "Standard" } as const;
export type AuthKey = keyof typeof AUTH_LABELS;

/** `auth=` → the identity widget's label; takes the key or the label, any case. */
export function authFromParam(value: string | null): string | null {
  const v = (value || "").trim().toLowerCase();
  const hit = (Object.keys(AUTH_LABELS) as AuthKey[]).find((k) => k === v);
  return hit ? AUTH_LABELS[hit] : null;
}

export function authToParam(label: string | null): string | null {
  const hit = (Object.keys(AUTH_LABELS) as AuthKey[]).find((k) => AUTH_LABELS[k] === label);
  return hit ?? null;
}

/**
 * The Identity report's rule: Modern is Platform SSO or Windows Hello for
 * Business (`authMethod` set); Legacy is AD- or LDAP-bound without it;
 * Standard is neither.
 */
export function matchesAuth(r: Row, label: string): boolean {
  if (label === AUTH_LABELS.modern) return !!r.authMethod;
  if (label === AUTH_LABELS.legacy) return !r.authMethod && !!(r.adBound || r.ldapBound);
  if (label === AUTH_LABELS.standard) return !r.authMethod && !r.adBound && !r.ldapBound;
  return true;
}

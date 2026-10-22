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

/**
 * The OS currency rules are relative to the fleet: the latest patch of each
 * macOS major (or Windows build) is the highest version seen, so pass every
 * row the report has, not a filtered subset.
 */
export function osCurrency(rows: Row[]): OSCurrency {
  const latest = new Map<string, number[]>();
  let newestMac = 0;
  for (const r of rows) {
    const t = patchTrain(r);
    if (!t) continue;
    const prev = latest.get(t.train);
    if (!prev || compareParts(t.level, prev) > 0) latest.set(t.train, t.level);
    if (isMac(r)) newestMac = Math.max(newestMac, macOrdinal(t.level[0]));
  }
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

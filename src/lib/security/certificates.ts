/**
 * Certificate helpers shared by the Security report and the device Security tab.
 *
 * The API stamps every certificate with a `class` at ingest:
 *   - `actionable`     someone has to renew it
 *   - `system-managed` the OS or an agent issues and rotates it
 *   - `trust-store`    OS roots and intermediates
 * The app never classifies certificates itself; it only reads `class`. A
 * certificate with no `class` (stored before stamping) counts as actionable.
 *
 * Stored `status`, `daysUntilExpiry`, `isExpired` and `isExpiringSoon` are
 * frozen at collection time, so per-certificate status is worked out here
 * from `notAfter` against the current time, falling back to the stored
 * fields only when `notAfter` is missing or unreadable.
 */

export type CertClass = "actionable" | "system-managed" | "trust-store";
export type CertStatus = "Valid" | "ExpiringSoon" | "Expired";

/** Days before expiry that count as "expiring soon" (matches the API). */
export const EXPIRING_SOON_DAYS = 30;

/** URL value of the Security report's `certClass` param when system-managed certificates are shown. */
export const CERT_CLASS_ALL = "all";

const KNOWN_CLASSES: CertClass[] = [
  "actionable",
  "system-managed",
  "trust-store",
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCert = Record<string, any>;

export function certClassOf(cert: AnyCert | null | undefined): CertClass {
  const raw = String(cert?.class ?? "")
    .trim()
    .toLowerCase();
  if ((KNOWN_CLASSES as string[]).includes(raw)) return raw as CertClass;
  // Unstamped rows are actionable, as the API, the Mac app and the Windows app
  // all treat them; the class is the API's decision alone.
  return "actionable";
}

export function isActionableCert(cert: AnyCert | null | undefined): boolean {
  return certClassOf(cert) === "actionable";
}

export function certClassLabel(cls: string | null | undefined): string {
  switch ((cls || "").toLowerCase()) {
    case "system-managed":
      return "System-managed";
    case "trust-store":
      return "Trust store";
    default:
      return "Actionable";
  }
}

/** Readable name: the API's displayName, then commonName, then the subject's CN. */
export function certDisplayName(cert: AnyCert): string {
  const name = cert.displayName || cert.commonName || cert.common_name;
  if (name) return String(name);
  const subject = String(cert.subject || "");
  if (subject) {
    const cn = subject
      .split(",")[0]
      ?.replace(/^CN\s*=\s*/i, "")
      .trim();
    if (cn) return cn;
  }
  return "—";
}

export function certIssuerName(cert: AnyCert): string {
  return String(cert.issuerName || cert.issuer || "");
}

function notAfterMillis(cert: AnyCert): number | null {
  const epoch = cert.notAfterEpoch;
  if (typeof epoch === "number" && Number.isFinite(epoch)) return epoch * 1000;
  const raw = cert.notAfter ?? cert.not_after ?? cert.not_valid_after;
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw * 1000 : null;
  const text = String(raw).trim();
  if (/^-?\d{1,15}(\.\d+)?$/.test(text)) return Math.floor(Number(text)) * 1000;
  const parsed = Date.parse(text);
  return Number.isNaN(parsed) ? null : parsed;
}

/** Live status from `notAfter` vs `now`; stored fields only when `notAfter` is unusable. */
export function liveCertStatus(
  cert: AnyCert,
  now: number = Date.now(),
): { status: CertStatus; daysUntilExpiry: number | undefined } {
  const expiresAt = notAfterMillis(cert);
  if (expiresAt !== null) {
    const days = Math.floor((expiresAt - now) / 86_400_000);
    if (days < 0) return { status: "Expired", daysUntilExpiry: days };
    if (days <= EXPIRING_SOON_DAYS)
      return { status: "ExpiringSoon", daysUntilExpiry: days };
    return { status: "Valid", daysUntilExpiry: days };
  }
  const storedDays = cert.daysUntilExpiry ?? cert.days_until_expiry;
  const days = typeof storedDays === "number" ? storedDays : undefined;
  const stored = String(cert.status || "");
  if (stored === "Expired" || cert.isExpired)
    return { status: "Expired", daysUntilExpiry: days };
  if (stored === "ExpiringSoon" || cert.isExpiringSoon)
    return { status: "ExpiringSoon", daysUntilExpiry: days };
  return { status: "Valid", daysUntilExpiry: days };
}

/** Device donut label. */
export type DeviceCertLabel = "Has Expired" | "Expiring Soon" | "Valid";

export interface DeviceCertCounts {
  expiredCertCount: number;
  expiringSoonCertCount: number;
  userExpiredCertCount?: number;
  osRootExpiredCertCount?: number;
  actionableCertCount?: number;
  systemManagedExpiredCertCount?: number;
}

/**
 * Expired certificates on a device for the Security report. The API's
 * `expiredCertCount` is actionable only; with system-managed shown, the
 * system-managed and trust-store expirations are added. Payloads from before
 * the class split (no `actionableCertCount`) keep their old meaning.
 */
export function deviceExpiredCertCount(
  d: DeviceCertCounts,
  includeSystemManaged: boolean,
): number {
  const isClassAware =
    d.actionableCertCount !== undefined && d.actionableCertCount !== null;
  if (!isClassAware) {
    return includeSystemManaged
      ? (d.expiredCertCount ?? 0)
      : (d.userExpiredCertCount ?? d.expiredCertCount ?? 0);
  }
  const actionable = d.expiredCertCount ?? 0;
  if (!includeSystemManaged) return actionable;
  return (
    actionable +
    (d.systemManagedExpiredCertCount ?? 0) +
    (d.osRootExpiredCertCount ?? 0)
  );
}

export function deviceCertLabel(
  d: DeviceCertCounts,
  includeSystemManaged: boolean,
): DeviceCertLabel {
  if (deviceExpiredCertCount(d, includeSystemManaged) > 0) return "Has Expired";
  if ((d.expiringSoonCertCount ?? 0) > 0) return "Expiring Soon";
  return "Valid";
}

export interface CertDeepLink {
  /** Donut filter label from `certs=expired|expiring`, or '' */
  certFilter: "" | DeviceCertLabel;
  /** Certificate search text from `certSearch` */
  certSearch: string;
  /** Certificate search status from `certStatus` */
  certStatus: "all" | "valid" | "expiring" | "expired";
  /** `certClass=all` shows system-managed and trust-store certificates */
  showSystemManaged: boolean;
}

/** Read the Security report's certificate params (dashboard deep links included). */
export function parseCertDeepLink(params: {
  get(name: string): string | null;
}): CertDeepLink {
  const certs = (params.get("certs") || "").toLowerCase();
  const status = (params.get("certStatus") || "").toLowerCase();
  return {
    certFilter:
      certs === "expired"
        ? "Has Expired"
        : certs === "expiring"
          ? "Expiring Soon"
          : "",
    certSearch: params.get("certSearch") || "",
    certStatus:
      status === "valid" || status === "expiring" || status === "expired"
        ? status
        : "all",
    showSystemManaged:
      (params.get("certClass") || "").toLowerCase() === CERT_CLASS_ALL,
  };
}

export interface DeviceCertRow {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cert: Record<string, any>
  certClass: CertClass
  status: CertStatus
  daysUntilExpiry: number | undefined
}

export interface DeviceCertSummary {
  /** Rows shown: actionable only, or every class when system-managed is shown */
  rows: DeviceCertRow[]
  /** Actionable certificates on the device */
  actionableCount: number
  /** System-managed and trust-store certificates (hidden by default) */
  hiddenCount: number
  /** Live status counts over `rows` */
  validCount: number
  expiringCount: number
  expiredCount: number
}

/** Classify and date every certificate on one device for the device Security tab. */
export function summarizeDeviceCertificates(
  certificates: unknown,
  includeSystemManaged: boolean,
  now: number = Date.now(),
): DeviceCertSummary {
  const list = Array.isArray(certificates) ? certificates.filter((c) => c && typeof c === 'object') : []
  const all: DeviceCertRow[] = list.map((cert) => {
    const { status, daysUntilExpiry } = liveCertStatus(cert, now)
    return { cert, certClass: certClassOf(cert), status, daysUntilExpiry }
  })
  const actionableCount = all.filter((r) => r.certClass === 'actionable').length
  const rows = includeSystemManaged ? all : all.filter((r) => r.certClass === 'actionable')
  return {
    rows,
    actionableCount,
    hiddenCount: all.length - actionableCount,
    validCount: rows.filter((r) => r.status === 'Valid').length,
    expiringCount: rows.filter((r) => r.status === 'ExpiringSoon').length,
    expiredCount: rows.filter((r) => r.status === 'Expired').length,
  }
}

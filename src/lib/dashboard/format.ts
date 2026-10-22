/**
 * Number formatting for the dashboard cards. Card numbers come from the API
 * and from devices; a value that is not a finite, non-negative number shows
 * as an em dash instead of "NaN", "Infinity" or a broken bar. Matches the Mac
 * app's formatter.
 */

export const MISSING = "—";

/** The value when it is a finite number of 0 or more, otherwise null. */
export function countOf(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

/** A count with thousands separators, or "—". */
export function fmtCount(value: unknown): string {
  const n = countOf(value);
  return n === null ? MISSING : Math.round(n).toLocaleString("en-US");
}

/** A number with up to `digits` decimals (for percentages such as 1.2), or "—". */
export function fmtNumber(value: unknown, digits = 1): string {
  const n = countOf(value);
  if (n === null) return MISSING;
  return n.toLocaleString("en-US", { maximumFractionDigits: digits });
}

/** "1 device", "12 devices", or "— devices". */
export function fmtPlural(value: unknown, one: string, many = `${one}s`): string {
  const n = countOf(value);
  return `${n === null ? MISSING : fmtCount(n)} ${n === 1 ? one : many}`;
}

/** `part` as a whole percentage of `whole` ("42%"), or "" when it can't be worked out. */
export function fmtPercentOf(part: unknown, whole: unknown): string {
  const p = countOf(part);
  const w = countOf(whole);
  return p === null || !w ? "" : `${Math.round((p / w) * 100)}%`;
}

/** A percentage the API computed (e.g. pctOnLatest), or "—". */
export function fmtPercent(value: unknown): string {
  const n = countOf(value);
  return n === null ? MISSING : `${Math.round(n)}%`;
}

/** A bar width from 0 to 100 for `part` of `max`; 0 for anything unusable. */
export function barWidth(part: unknown, max: unknown): number {
  const p = countOf(part);
  const m = countOf(max);
  if (p === null || !m) return 0;
  return Math.min(100, (p / m) * 100);
}

/** Hours in a narrow column: 950 h, 1.2k h, 328k h, 1.2M h; "—" when not a number. */
export function compactHours(value: unknown): string {
  const n = countOf(value);
  if (n === null) return MISSING;
  if (n < 1000) return `${Math.round(n)} h`;
  if (n < 10_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k h`;
  if (n < 999_500) return `${Math.round(n / 1000)}k h`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M h`;
}

/** Bytes as GB or TB (decimal, as disks are sold), or "—". */
export function fmtBytes(value: unknown): string {
  const n = countOf(value);
  if (n === null) return MISSING;
  return n >= 1e12 ? `${(n / 1e12).toFixed(1)} TB` : `${Math.round(n / 1e9)} GB`;
}

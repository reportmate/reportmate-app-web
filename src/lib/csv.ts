/**
 * CSV cells for every export in the app. Device names, log messages and other
 * device-reported text are untrusted: a value starting with = + - @, a tab or
 * a carriage return would run as a formula when the file is opened in a
 * spreadsheet, so it gets a leading single quote. Every cell is then quoted,
 * with inner quotes doubled.
 */

const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (FORMULA_START.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

/** One CSV line from a row of values. */
export const csvRow = (values: unknown[]): string => values.map(csvCell).join(",");

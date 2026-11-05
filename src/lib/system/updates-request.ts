import { trackedFetch } from "../data-cache"
import { UPDATES_API, updateRowKey, updatesPageQuery, type UpdateRow, type UpdatesReport } from "./updates"

/** Read every row through bounded pages; a report that changes mid-read is an error, never a partial table. */
export async function fetchUpdatesReport(
  query: string,
  signal: AbortSignal,
  onProgress?: (loaded: number, total: number) => void,
): Promise<UpdatesReport> {
  const rows: UpdateRow[] = []
  const seen = new Set<string>()
  let total: number | null = null
  let report: UpdatesReport | null = null
  do {
    const response = await trackedFetch(`${UPDATES_API}?${updatesPageQuery(query, rows.length)}`, { cache: "no-store", signal })
    if (!response.ok) throw new Error("The updates report could not be loaded. Please retry.")
    const page: UpdatesReport = await response.json()
    if (!Array.isArray(page.rows) || !Number.isInteger(page.total) || page.total < 0 ||
        page.offset !== rows.length || (total !== null && page.total !== total)) {
      throw new Error("The report changed while loading. Please retry.")
    }
    total = page.total
    if (!report) report = page
    if (page.rows.length === 0 && rows.length < total) throw new Error("The report returned an incomplete page. Please retry.")
    for (const row of page.rows) {
      const key = updateRowKey(row)
      if (!row.serialNumber || seen.has(key)) throw new Error("The report changed while loading. Please retry.")
      seen.add(key)
      rows.push(row)
    }
    if (rows.length > total) throw new Error("The report changed while loading. Please retry.")
    onProgress?.(rows.length, total)
  } while (rows.length < total)
  signal.throwIfAborted()
  if (!report) throw new Error("The updates report could not be loaded.")
  return { ...report, rows }
}

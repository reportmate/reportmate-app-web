import { trackedFetch } from "../data-cache"
import { POSTURE_API, posturePageQuery, type PostureDevice, type PostureReport } from "./posture"

/** Load every page of the report; a report that changes mid-load is rejected, never stitched. */
export async function fetchPostureReport(
  query: string,
  signal: AbortSignal,
  onProgress?: (loaded: number, total: number) => void,
): Promise<PostureReport> {
  const devices: PostureDevice[] = []
  const serials = new Set<string>()
  let total: number | null = null
  let report: PostureReport | null = null
  do {
    const response = await trackedFetch(`${POSTURE_API}?${posturePageQuery(query, devices.length)}`, { cache: "no-store", signal })
    if (!response.ok) throw new Error("The posture report could not be loaded. Please retry.")
    const page: PostureReport = await response.json()
    if (!Array.isArray(page.devices) || !Number.isInteger(page.total) || page.total < 0 ||
        page.offset !== devices.length || (total !== null && page.total !== total)) {
      throw new Error("The report changed while loading. Please retry.")
    }
    total = page.total
    if (!report) report = page
    if (page.devices.length === 0 && devices.length < total) throw new Error("The report returned an incomplete page. Please retry.")
    for (const device of page.devices) {
      if (!device.serialNumber || serials.has(device.serialNumber)) throw new Error("The report changed while loading. Please retry.")
      serials.add(device.serialNumber)
      devices.push(device)
    }
    if (devices.length > total) throw new Error("The report changed while loading. Please retry.")
    onProgress?.(devices.length, total)
  } while (devices.length < total)
  signal.throwIfAborted()
  if (!report) throw new Error("The posture report could not be loaded.")
  return { ...report, devices }
}

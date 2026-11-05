"use client"

/**
 * Fleet threat detections, /security?tab=threats: one row per collected
 * detection and device, newest first, over a time window (`days`, default
 * 30). Only Windows clients collect individual detections today; devices
 * that do not report them are counted, not treated as clean.
 */

import { useEffect, useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { usePlatformFilterSafe } from "../../providers/PlatformFilterProvider"
import DeviceFilters from "../shared/DeviceFilters"
import { peekCached, rememberCached, trackedFetch } from "../../lib/data-cache"
import {
  DAY_CHOICES, DEFAULT_DAYS, DETECTIONS_API, DETECTION_COLUMNS, DETECTION_PARAMS, VIEW_PARAMS,
  detectionDays, detectionsCsv, detectionsQuery, deviceHref, downloadCsv, fetchAllRows, listParam, optionsQuery,
  patchQuery, severityLabel, shareableUrl, sortDetections, sortDir,
  type Coverage, type DetectionCatalog, type DetectionRow, type PagedReport,
} from "../../lib/security/vulnerabilities"
import { SecurityViewSwitch } from "./SecurityViewSwitch"
import { Choice, Choices, CopyLinkButton, ExportButton, NotReported, RefreshButton, SortHeader, When } from "./ReportParts"

const TAB = "threats"
const emptyOptions = { usages: [], catalogs: [], areas: [], fleets: [], locations: [], rooms: [], inventoryStates: [] }

function DetectionCoverage({ coverage }: { coverage: Coverage }) {
  return <p className="text-xs text-gray-600 dark:text-gray-400">
    {coverage.devices.toLocaleString()} devices in scope: {coverage.reporting.toLocaleString()} report detections
    {coverage.notReporting > 0 && <>, <strong className="font-semibold">{coverage.notReporting.toLocaleString()} do not</strong> (macOS clients report no individual detections; not counted as clean)</>}
    {(coverage.unknown || 0) > 0 && <>, {coverage.unknown!.toLocaleString()} sent a list that could not be read</>}.
    {coverage.devicesWithDetections !== undefined && <> {coverage.devicesWithDetections.toLocaleString()} devices have matching detections.</>}
  </p>
}

export function ThreatsReport() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { platformFilter } = usePlatformFilterSafe()
  const current = searchParams.toString()
  const params = useMemo(() => new URLSearchParams(current), [current])
  const query = detectionsQuery(params, platformFilter)
  const optionsKey = `${DETECTIONS_API}/filters?${optionsQuery(params, platformFilter)}`
  const days = detectionDays(params)
  const [pending, startTransition] = useTransition()
  const [catalog, setCatalog] = useState<DetectionCatalog | null>(null)
  const [report, setReport] = useState<PagedReport<DetectionRow> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState("")
  const [reload, setReload] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const searchValue = params.get("search") || ""
  const [deviceSearch, setDeviceSearch] = useState(searchValue)
  const sort = params.get("sort") || "lastSeenAt"
  const dir = sortDir(params, sort === "lastSeenAt" ? "desc" : "asc")

  useEffect(() => {
    const controller = new AbortController()
    const cached = peekCached<DetectionCatalog>(optionsKey)
    setCatalog(cached || null)
    trackedFetch(optionsKey, { cache: "no-store", signal: controller.signal })
      .then(async response => {
        const body = await response.json()
        if (!response.ok || !Array.isArray(body.vendors)) throw new Error("Available detection selections could not be loaded.")
        if (!controller.signal.aborted) setCatalog(rememberCached(optionsKey, body))
      })
      .catch(err => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Detection selections unavailable") })
    return () => controller.abort()
  }, [optionsKey, reload])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    setProgress("")
    setReport(null)
    fetchAllRows<DetectionRow>(DETECTIONS_API, query, controller.signal, (loaded, total) => {
      if (!controller.signal.aborted) setProgress(`${loaded.toLocaleString()} of ${total.toLocaleString()} rows`)
    })
      .then(body => { if (!controller.signal.aborted) setReport(body) })
      .catch(err => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Detection report unavailable") })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [query, reload])

  const update = (patch: Record<string, string | null>) => {
    const next = patchQuery(current, TAB, patch)
    startTransition(() => router.replace(`/security?${next}`, { scroll: false }))
  }
  useEffect(() => { setDeviceSearch(searchValue) }, [searchValue])
  useEffect(() => {
    if (deviceSearch === searchValue) return
    const timer = setTimeout(() => router.replace(`/security?${patchQuery(current, TAB, { search: deviceSearch })}`, { scroll: false }), 250)
    return () => clearTimeout(timer)
  }, [deviceSearch, searchValue, current, router])

  const toggle = (key: string, value: string) => {
    const selected = listParam(params, key)
    update({ [key]: (selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value]).join(",") })
  }
  const onSort = (column: string) => update({ sort: column === "lastSeenAt" ? null : column, dir: sort === column && dir === "asc" ? "desc" : "asc" })
  const clearAll = () => {
    setDeviceSearch("")
    update(Object.fromEntries([...DETECTION_PARAMS, ...VIEW_PARAMS].map(key => [key, null])))
  }
  const rows = useMemo(() => report ? sortDetections(report.rows, sort, dir) : [], [report, sort, dir])
  const options = catalog?.options || report?.options || emptyOptions
  const activeCount = ["vendors", "categories", "severities", "statuses", "inventoryStates"].reduce((n, key) => n + listParam(params, key).length, 0) +
    (params.has("days") ? 1 : 0) + (params.has("includeArchived") ? 1 : 0)
  const facet = (label: string, key: string, values: { value: string; devices: number }[] | undefined) => (values?.length || 0) > 0 &&
    <Choices label={label}><Choice disabled={pending} active={!params.get(key)} onClick={() => update({ [key]: null })}>All</Choice>
      {values!.map(v => { const value = v.value.toLowerCase(); return <Choice disabled={pending} key={value} active={listParam(params, key).includes(value)} onClick={() => toggle(key, value)}>{severityLabel(v.value)} <span className="opacity-60">{v.devices}</span></Choice> })}</Choices>
  const exportCsv = () => {
    if (!report) return
    try { downloadCsv(detectionsCsv(rows, report.generatedAt, shareableUrl(window.location.href, platformFilter)), "threat-detections") }
    catch { setError("The report could not be exported. Please retry.") }
  }

  return (
    <div className="h-[calc(100vh-4rem)] bg-gray-50 dark:bg-black flex flex-col overflow-hidden">
      <div className="flex-1 page-container px-4 sm:px-6 lg:px-8 py-8 flex flex-col min-h-0">
        <div className="flex-1 bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col min-h-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-start justify-between gap-3">
            <div>
              <SecurityViewSwitch current="threats" />
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Threat detections collected from endpoint protection, including blocked attack surface reduction events.</p>
            </div>
            <div className="flex flex-wrap items-start gap-3">
              <CopyLinkButton platformFilter={platformFilter} onError={setError} />
              <RefreshButton loading={loading || pending} onClick={() => setReload(n => n + 1)} />
              {!loading && report && rows.length > 0 && <ExportButton onClick={exportCsv} detail="CSV of the filtered rows, with all device and detection fields." />}
            </div>
          </div>
          <div className="flex-1 overflow-auto min-h-0" aria-busy={loading}>
            <DeviceFilters filterOptions={{ ...options, statuses: [] }}
              selectedStatuses={[]} onStatusToggle={() => {}}
              selectedUsages={listParam(params, "usages")} onUsageToggle={v => toggle("usages", v)}
              selectedCatalogs={listParam(params, "catalogs")} onCatalogToggle={v => toggle("catalogs", v)}
              selectedAreas={listParam(params, "areas")} onAreaToggle={v => toggle("areas", v)}
              selectedFleets={listParam(params, "fleets")} onFleetToggle={v => toggle("fleets", v)}
              selectedLocations={listParam(params, "locations")} onLocationToggle={v => toggle("locations", v)}
              searchQuery="" onSearchChange={() => {}} onClearAll={clearAll}
              additionalActiveCount={activeCount} expanded={expanded} onToggle={() => setExpanded(v => !v)}>
              <div className="flex flex-wrap gap-x-8 gap-y-4 py-3 mb-4 border-b border-gray-200 dark:border-gray-700">
                {facet("Category", "categories", catalog?.categories)}
                {facet("Severity", "severities", catalog?.severities)}
                {facet("Status", "statuses", catalog?.statuses)}
                <Choices label="Inventory state"><Choice disabled={pending} active={!params.get("inventoryStates")} onClick={() => update({ inventoryStates: null })}>All</Choice>
                  {options.inventoryStates.map(value => <Choice disabled={pending} key={value} active={listParam(params, "inventoryStates").includes(value)} onClick={() => toggle("inventoryStates", value)}>{value === "checked_out" ? "Checked out" : value.charAt(0).toUpperCase() + value.slice(1)}</Choice>)}</Choices>
                <Choices label="Archive"><Choice disabled={pending} active={params.get("includeArchived") === "true"} onClick={() => update({ includeArchived: params.get("includeArchived") === "true" ? null : "true" })}>Include archived</Choice></Choices>
              </div>
            </DeviceFilters>
            {error && <div role="alert" className="mx-6 my-4 p-3 text-sm text-red-800 dark:text-red-200 bg-red-50 dark:bg-red-900/20 rounded-lg">{error}<button type="button" className="underline ml-2" onClick={() => setReload(n => n + 1)}>Retry</button></div>}
            <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-start justify-between gap-4">
              <div className="flex flex-wrap items-start gap-x-8 gap-y-3">
                <Choices label="Detected within">{DAY_CHOICES.map(([value, label]) => <Choice disabled={pending} key={value} active={days === value} onClick={() => update({ days: value === DEFAULT_DAYS ? null : String(value) })}>{label}</Choice>)}</Choices>
                <Choices label="Vendor / product"><Choice disabled={pending} active={!params.get("vendors")} onClick={() => update({ vendors: null })}>All</Choice>
                  {(catalog?.vendors || []).map(v => { const value = v.value.toLowerCase(); return <Choice disabled={pending} key={value} active={listParam(params, "vendors").includes(value)} onClick={() => toggle("vendors", value)}>{severityLabel(v.value)} <span className="opacity-60">{v.devices}</span></Choice> })}</Choices>
                <div className="flex items-end gap-3 self-end">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{loading ? "Loading…" : report ? `${rows.length.toLocaleString()} detections` : ""}</span>
                  <input type="search" aria-label="Search devices" placeholder="Search devices…" value={deviceSearch} onChange={e => setDeviceSearch(e.target.value)} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm text-gray-900 dark:text-white" />
                </div>
              </div>
              {report && <DetectionCoverage coverage={report.coverage} />}
            </div>
            {loading ? <div role="status" className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">Loading threat detections…{progress && ` ${progress}`}</div>
              : report && <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead><tr>{DETECTION_COLUMNS.map(([key, label]) => <SortHeader key={key} label={label} column={key} sort={sort} dir={dir} onSort={onSort} disabled={pending} />)}</tr></thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-sm text-gray-900 dark:text-gray-100">
                  {rows.length === 0 && <tr><td colSpan={DETECTION_COLUMNS.length} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">No collected detections match these filters{days ? " in this window" : ""}.</td></tr>}
                  {rows.map((row, index) => <tr key={`${row.serialNumber}-${index}`} className="align-top hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3 min-w-[200px] max-w-sm">{row.threatName || <NotReported />}{row.actionTaken && <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Action: {row.actionTaken}</div>}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{row.severity || <NotReported />}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{row.vendor || <NotReported />}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{row.category || <NotReported />}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{row.status || <NotReported />}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><When value={row.lastSeenAt || row.detectedAt} />
                      {row.firstSeenAt && row.firstSeenAt !== (row.lastSeenAt || row.detectedAt) && <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">First <When value={row.firstSeenAt} /></div>}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{row.count ?? <NotReported>1 event</NotReported>}</td>
                    <td className="px-4 py-3 min-w-[220px] max-w-md"><span className="font-mono text-xs break-all">{row.path || <NotReported />}</span>
                      {row.processName && <div className="font-mono text-xs text-gray-500 dark:text-gray-400 mt-1 break-all">Process: {row.processName}</div>}</td>
                    <td className="px-4 py-3 min-w-[180px]">
                      <Link href={deviceHref(row.serialNumber)} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">{row.deviceName || row.serialNumber}</Link>
                      <div className="font-mono text-xs text-gray-500 dark:text-gray-400 mt-1">{row.serialNumber}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{row.platform}</td>
                  </tr>)}
                </tbody>
              </table>}
          </div>
          <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">Last collected detections. A detection without a readable time is left out of a time window. Blocked attack surface reduction events show protection working, not an infection.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

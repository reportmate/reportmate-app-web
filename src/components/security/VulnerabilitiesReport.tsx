"use client"

/**
 * Fleet vulnerabilities, /security?tab=vulnerabilities. The CVE summary
 * (view=summary, the default) lists each collected CVE with distinct device
 * counts; choosing one drills into the device rows (view=devices). All state
 * is in the URL; `platform` belongs to the global toggle.
 */

import { useEffect, useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { usePlatformFilterSafe } from "../../providers/PlatformFilterProvider"
import DeviceFilters from "../shared/DeviceFilters"
import { ServiceSelectionCloud } from "../system/ServiceSelectionCloud"
import { peekCached, rememberCached, trackedFetch } from "../../lib/data-cache"
import {
  CVE_STATUSES, EXPLOITED_CHOICES, SUMMARY_COLUMNS, VIEW_PARAMS, VULNERABILITIES_API, VULNERABILITY_COLUMNS, VULNERABILITY_PARAMS,
  apiQuery, cveSummaryCsv, deviceHref, downloadCsv, exploitedLabel, fetchAllRows, filterSummary, listParam, optionsQuery,
  patchQuery, severityLabel, shareableUrl, sortDir, sortSummary, sortVulnerabilities, statusLabel, vulnerabilitiesCsv,
  vulnerabilityHref, vulnerabilityView,
  type Coverage, type CveSummary, type PagedReport, type SummaryReport, type VulnerabilityCatalog, type VulnerabilityRow,
} from "../../lib/security/vulnerabilities"
import { SecurityViewSwitch } from "./SecurityViewSwitch"
import { Choice, Choices, CopyLinkButton, ExportButton, NotReported, RefreshButton, SortHeader, When } from "./ReportParts"

const TAB = "vulnerabilities"
const emptyOptions = { usages: [], catalogs: [], areas: [], fleets: [], locations: [], rooms: [], inventoryStates: [] }

function Exploited({ value }: { value: boolean | null }) {
  if (value === true) return <span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">Yes</span>
  return value === false ? <span className="text-gray-600 dark:text-gray-300">No</span> : <NotReported />
}

export function CoverageNote({ coverage }: { coverage: Coverage }) {
  return <p className="text-xs text-gray-600 dark:text-gray-400">
    {coverage.devices.toLocaleString()} devices in scope: {coverage.reporting.toLocaleString()} report a CVE list
    {coverage.notReporting > 0 && <>, <strong className="font-semibold">{coverage.notReporting.toLocaleString()} do not</strong> (coverage unknown, not counted as clean)</>}
    {(coverage.unknown || 0) > 0 && <>, {coverage.unknown!.toLocaleString()} sent a list that could not be read</>}.
    {(coverage.listMayBeIncomplete || 0) > 0 && <> {coverage.listMayBeIncomplete!.toLocaleString()} macOS devices reached the client&apos;s 50-entry limit, so their lists may be incomplete.</>}
  </p>
}

export function VulnerabilitiesReport() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { platformFilter } = usePlatformFilterSafe()
  const current = searchParams.toString()
  const params = useMemo(() => new URLSearchParams(current), [current])
  const view = vulnerabilityView(params)
  const query = apiQuery(params, VULNERABILITY_PARAMS.filter(k => k !== "view"), platformFilter, view === "summary" ? { view: "summary" } : {})
  const optionsKey = `${VULNERABILITIES_API}/filters?${optionsQuery(params, platformFilter)}`
  const [pending, startTransition] = useTransition()
  const [catalog, setCatalog] = useState<VulnerabilityCatalog | null>(null)
  const [summary, setSummary] = useState<SummaryReport | null>(null)
  const [report, setReport] = useState<PagedReport<VulnerabilityRow> | null>(null)
  const [loading, setLoading] = useState(true)
  const [optionsLoading, setOptionsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState("")
  const [reload, setReload] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const searchValue = params.get("search") || ""
  const [deviceSearch, setDeviceSearch] = useState(searchValue)
  const qValue = params.get("q") || ""
  const [cveSearch, setCveSearch] = useState(qValue)
  const selectedCves = listParam(params, "cves")
  const sort = params.get("sort")
  const dir = sortDir(params, view === "summary" ? "desc" : "asc")

  useEffect(() => {
    const controller = new AbortController()
    const cached = peekCached<VulnerabilityCatalog>(optionsKey)
    setCatalog(cached || null)
    setOptionsLoading(!cached)
    trackedFetch(optionsKey, { cache: "no-store", signal: controller.signal })
      .then(async response => {
        const body = await response.json()
        if (!response.ok || !Array.isArray(body.cves)) throw new Error("Available CVE selections could not be loaded.")
        if (!controller.signal.aborted) setCatalog(rememberCached(optionsKey, body))
      })
      .catch(err => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "CVE selections unavailable") })
      .finally(() => { if (!controller.signal.aborted) setOptionsLoading(false) })
    return () => controller.abort()
  }, [optionsKey, reload])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    setProgress("")
    const run = async () => {
      try {
        if (view === "summary") {
          const key = `${VULNERABILITIES_API}?${query}`
          const cached = peekCached<SummaryReport>(key)
          if (cached) setSummary(cached)
          const response = await trackedFetch(key, { cache: "no-store", signal: controller.signal })
          const body = await response.json()
          if (!response.ok || !Array.isArray(body.cves)) throw new Error(response.status === 404 ? "This report is not available on this server yet." : "The CVE summary could not be loaded. Please retry.")
          if (!controller.signal.aborted) setSummary(rememberCached(key, body))
        } else {
          setReport(null)
          const body = await fetchAllRows<VulnerabilityRow>(VULNERABILITIES_API, query, controller.signal, (loaded, total) => {
            if (!controller.signal.aborted) setProgress(`${loaded.toLocaleString()} of ${total.toLocaleString()} rows`)
          })
          if (!controller.signal.aborted) setReport(body)
        }
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Vulnerability report unavailable")
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    run()
    return () => controller.abort()
  }, [query, view, reload])

  const update = (patch: Record<string, string | null>) => {
    const next = patchQuery(current, TAB, patch)
    startTransition(() => router.replace(`/security?${next}`, { scroll: false }))
  }
  useEffect(() => { setDeviceSearch(searchValue) }, [searchValue])
  useEffect(() => { setCveSearch(qValue) }, [qValue])
  useEffect(() => {
    if (deviceSearch === searchValue && cveSearch === qValue) return
    const timer = setTimeout(() => router.replace(`/security?${patchQuery(current, TAB, { search: deviceSearch, q: cveSearch })}`, { scroll: false }), 250)
    return () => clearTimeout(timer)
  }, [deviceSearch, searchValue, cveSearch, qValue, current, router])

  const toggle = (key: string, value: string) => {
    const selected = listParam(params, key)
    update({ [key]: (selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value]).join(",") })
  }
  const chooseCves = (values: string[]) => update({ cves: values.length ? JSON.stringify(values) : null })
  const toggleCve = (value: string) => chooseCves(selectedCves.includes(value) ? selectedCves.filter(v => v !== value) : [...selectedCves, value])
  const drill = (identifier: string) => update({ view: "devices", cves: JSON.stringify([identifier]), sort: null, dir: null, q: null })
  const setView = (next: "summary" | "devices") => update({ view: next === "summary" ? null : next, sort: null, dir: null })
  const onSort = (column: string) => update({ sort: column, dir: sort === column && dir === "asc" ? "desc" : "asc" })
  const clearAll = () => {
    setDeviceSearch("")
    setCveSearch("")
    update(Object.fromEntries([...VULNERABILITY_PARAMS.filter(k => k !== "view"), ...VIEW_PARAMS].map(key => [key, null])))
  }

  const summaryRows = useMemo(() => summary ? sortSummary(filterSummary(summary.cves, qValue), sort, dir) : [], [summary, qValue, sort, dir])
  const deviceRows = useMemo(() => report ? sortVulnerabilities(report.rows, sort, dir) : [], [report, sort, dir])
  const data = view === "summary" ? summary : report
  const options = catalog?.options || data?.options || emptyOptions
  const exploited = params.get("exploited") || "all"
  const freshness = params.get("freshness") || "all"
  const age = params.get("maxAgeHours") || "168"
  const activeCount = selectedCves.length + listParam(params, "statuses").length + listParam(params, "severities").length +
    listParam(params, "inventoryStates").length + (exploited !== "all" ? 1 : 0) + (freshness !== "all" ? 1 : 0) +
    (params.has("maxAgeHours") ? 1 : 0) + (params.has("includeArchived") ? 1 : 0)

  const exportCsv = () => {
    try {
      const url = shareableUrl(window.location.href, platformFilter)
      if (view === "summary" && summary) downloadCsv(cveSummaryCsv(summaryRows, summary.generatedAt, url), "cve-summary")
      else if (report) downloadCsv(vulnerabilitiesCsv(deviceRows, report.generatedAt, url), "vulnerabilities-report")
    } catch { setError("The report could not be exported. Please retry.") }
  }
  const visibleCount = view === "summary" ? summaryRows.length : deviceRows.length

  return (
    <div className="h-[calc(100vh-4rem)] bg-gray-50 dark:bg-black flex flex-col overflow-hidden">
      <div className="flex-1 page-container px-4 sm:px-6 lg:px-8 py-8 flex flex-col min-h-0">
        <div className="flex-1 bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col min-h-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-start justify-between gap-3">
            <div>
              <SecurityViewSwitch current="vulnerabilities" />
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">CVEs collected on each device: Windows security updates and macOS unpatched CVEs.</p>
            </div>
            <div className="flex flex-wrap items-start gap-3">
              <CopyLinkButton platformFilter={platformFilter} onError={setError} />
              <RefreshButton loading={loading || pending} onClick={() => setReload(n => n + 1)} />
              {!loading && data && visibleCount > 0 && <ExportButton onClick={exportCsv} detail={view === "summary" ? "CSV of the CVEs shown, in this order." : "CSV of the filtered rows, with all device and collection fields."} />}
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
              <div className="space-y-4 py-3 mb-4 border-b border-gray-200 dark:border-gray-700">
                <ServiceSelectionCloud label="CVEs" loading={optionsLoading} selected={selectedCves} onToggle={toggleCve} onSelect={chooseCves}
                  options={(catalog?.cves || []).map(c => ({ value: c.identifier, label: c.identifier, devices: c.devices }))} />
                <div className="flex flex-wrap gap-x-8 gap-y-4">
                  <Choices label="Status"><Choice disabled={pending} active={!params.get("statuses")} onClick={() => update({ statuses: null })}>All</Choice>
                    {CVE_STATUSES.map(s => <Choice disabled={pending} key={s} active={listParam(params, "statuses").includes(s)} onClick={() => toggle("statuses", s)}>{statusLabel(s)}</Choice>)}</Choices>
                  <Choices label="Severity"><Choice disabled={pending} active={!params.get("severities")} onClick={() => update({ severities: null })}>All</Choice>
                    {(catalog?.severities || []).map(s => { const value = s.value.toLowerCase(); return <Choice disabled={pending} key={value} active={listParam(params, "severities").includes(value)} onClick={() => toggle("severities", value)}>{severityLabel(s.value)}</Choice> })}</Choices>
                  <Choices label="Actively exploited">{EXPLOITED_CHOICES.map(([value, label]) => <Choice disabled={pending} key={value} active={exploited === value} onClick={() => update({ exploited: value === "all" ? null : value })}>{label}</Choice>)}</Choices>
                  <Choices label="Security collection age">{([["all", "All"], ["fresh", "Within maximum age"], ["stale", "Older"], ["unknown", "Unknown"]] as const).map(([value, label]) => <Choice disabled={pending} key={value} active={freshness === value} onClick={() => update({ freshness: value === "all" ? null : value })}>{label}</Choice>)}</Choices>
                  <Choices label="Maximum collection age">{[...new Set(["24", "168", "720", age])].map(value => <Choice disabled={pending} key={value} active={age === value} onClick={() => update({ maxAgeHours: value === "168" ? null : value })}>{value === "24" ? "24 hours" : value === "168" ? "7 days" : value === "720" ? "30 days" : `${value} hours`}</Choice>)}</Choices>
                  <Choices label="Inventory state"><Choice disabled={pending} active={!params.get("inventoryStates")} onClick={() => update({ inventoryStates: null })}>All</Choice>
                    {options.inventoryStates.map(value => <Choice disabled={pending} key={value} active={listParam(params, "inventoryStates").includes(value)} onClick={() => toggle("inventoryStates", value)}>{value === "checked_out" ? "Checked out" : value.charAt(0).toUpperCase() + value.slice(1)}</Choice>)}</Choices>
                  <Choices label="Archive"><Choice disabled={pending} active={params.get("includeArchived") === "true"} onClick={() => update({ includeArchived: params.get("includeArchived") === "true" ? null : "true" })}>Include archived</Choice></Choices>
                </div>
              </div>
            </DeviceFilters>
            {selectedCves.length > 0 && <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center gap-2">
              {selectedCves.map(cve => <button type="button" key={cve} onClick={() => toggleCve(cve)} title={`Remove ${cve}`} className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800">{cve}<span aria-hidden="true">×</span></button>)}
              <button type="button" onClick={() => chooseCves([])} className="text-xs text-red-600 dark:text-red-400 hover:underline ml-2">Clear CVEs</button>
            </div>}
            {error && <div role="alert" className="mx-6 my-4 p-3 text-sm text-red-800 dark:text-red-200 bg-red-50 dark:bg-red-900/20 rounded-lg">{error}<button type="button" className="underline ml-2" onClick={() => setReload(n => n + 1)}>Retry</button></div>}
            <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div role="group" aria-label="View" className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 p-0.5">
                  {([["summary", "CVE summary"], ["devices", "Device rows"]] as const).map(([key, label]) =>
                    <button key={key} type="button" aria-pressed={view === key} onClick={() => setView(key)} disabled={pending}
                      className={`px-3 py-1 text-sm rounded-md ${view === key ? "bg-blue-600 text-white" : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"}`}>{label}</button>)}
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">{loading && !data ? "Loading…" : data ? view === "summary"
                  ? `${summaryRows.length.toLocaleString()} CVEs${summaryRows.length !== summary!.total ? ` of ${summary!.total.toLocaleString()}` : ""}`
                  : `${deviceRows.length.toLocaleString()} rows` : ""}</span>
                {view === "summary" && <input type="search" aria-label="Filter CVEs" placeholder="Filter CVEs…" value={cveSearch} onChange={e => setCveSearch(e.target.value)} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm text-gray-900 dark:text-white" />}
                <input type="search" aria-label="Search devices" placeholder="Search devices…" value={deviceSearch} onChange={e => setDeviceSearch(e.target.value)} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm text-gray-900 dark:text-white" />
              </div>
              {data && <CoverageNote coverage={data.coverage} />}
            </div>
            {loading && !data ? <div role="status" className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">Loading vulnerability report…{progress && ` ${progress}`}</div>
              : view === "summary" ? summary && <SummaryTable rows={summaryRows} sort={sort || ""} dir={dir} onSort={onSort} onDrill={drill} pending={pending} />
              : report && <DeviceRowsTable rows={deviceRows} sort={sort || "identifier"} dir={dir} onSort={onSort} pending={pending} />}
          </div>
          <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">Last collected state. Severity shows only what the client collected; macOS entries carry none. Windows rows without a CVE id are pending security updates, identified by their update article.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function SummaryTable({ rows, sort, dir, onSort, onDrill, pending }: {
  rows: CveSummary[]; sort: string; dir: "asc" | "desc"; onSort: (c: string) => void; onDrill: (id: string) => void; pending: boolean
}) {
  return <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
    <thead><tr>{SUMMARY_COLUMNS.map(([key, label]) => <SortHeader key={key} label={label} column={key} sort={sort} dir={dir} onSort={onSort} disabled={pending} />)}</tr></thead>
    <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-sm text-gray-900 dark:text-gray-100">
      {rows.length === 0 && <tr><td colSpan={SUMMARY_COLUMNS.length} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">No collected CVEs match these filters.</td></tr>}
      {rows.map(row => <tr key={row.identifier} className="align-top hover:bg-gray-50 dark:hover:bg-gray-700/30">
        <td className="px-4 py-3 whitespace-nowrap">
          <button type="button" onClick={() => onDrill(row.identifier)} className="font-mono text-blue-600 dark:text-blue-400 hover:underline" title="Show the devices reporting this">{row.identifier}</button>
          {!row.cve && <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Pending update, no CVE id</div>}
        </td>
        <td className="px-4 py-3 whitespace-nowrap">{row.devices.toLocaleString()}</td>
        <td className="px-4 py-3 whitespace-nowrap">{row.unpatchedDevices.toLocaleString()}{row.patchedDevices > 0 && <div className="text-xs text-gray-500 dark:text-gray-400">{row.patchedDevices.toLocaleString()} patched</div>}</td>
        <td className="px-4 py-3 whitespace-nowrap">{row.severities.length ? row.severities.join(", ") : <NotReported />}</td>
        <td className="px-4 py-3 whitespace-nowrap"><Exploited value={row.activelyExploited} /></td>
        <td className="px-4 py-3 font-mono text-xs">{row.fixedIn.length ? row.fixedIn.join(", ") : <NotReported />}</td>
        <td className="px-4 py-3 min-w-[200px] max-w-md">{row.products.length ? row.products.join("; ") : <NotReported />}</td>
        <td className="px-4 py-3 whitespace-nowrap">{row.platforms.join(", ")}</td>
      </tr>)}
    </tbody>
  </table>
}

function DeviceRowsTable({ rows, sort, dir, onSort, pending }: {
  rows: VulnerabilityRow[]; sort: string; dir: "asc" | "desc"; onSort: (c: string) => void; pending: boolean
}) {
  return <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
    <thead><tr>{VULNERABILITY_COLUMNS.map(([key, label]) => <SortHeader key={key} label={label} column={key} sort={sort} dir={dir} onSort={onSort} disabled={pending} />)}</tr></thead>
    <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-sm text-gray-900 dark:text-gray-100">
      {rows.length === 0 && <tr><td colSpan={VULNERABILITY_COLUMNS.length} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">No collected CVEs match these filters.</td></tr>}
      {rows.map((row, index) => {
        const href = vulnerabilityHref(row)
        return <tr key={`${row.serialNumber}-${row.identifier}-${index}`} className="align-top hover:bg-gray-50 dark:hover:bg-gray-700/30">
          <td className="px-4 py-3 whitespace-nowrap">
            {href ? <a href={href} target="_blank" rel="noopener noreferrer" className="font-mono text-blue-600 dark:text-blue-400 hover:underline">{row.identifier}</a> : <span className="font-mono">{row.identifier}</span>}
            {!row.cve && row.label && <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{row.label}</div>}
          </td>
          <td className="px-4 py-3 whitespace-nowrap">{row.severity || <NotReported />}</td>
          <td className="px-4 py-3 min-w-[200px] max-w-md">{row.product || <NotReported />}</td>
          <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{row.affectedVersion || <NotReported />}</td>
          <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{row.fixedIn || <NotReported />}</td>
          <td className="px-4 py-3 whitespace-nowrap" title={exploitedLabel(row.activelyExploited)}><Exploited value={row.activelyExploited} /></td>
          <td className="px-4 py-3 whitespace-nowrap">{statusLabel(row.status)}{row.installedDate && <div className="text-xs text-gray-500 dark:text-gray-400"><When value={row.installedDate} /></div>}</td>
          <td className="px-4 py-3 min-w-[180px]">
            <Link href={deviceHref(row.serialNumber)} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">{row.deviceName || row.serialNumber}</Link>
            <div className="font-mono text-xs text-gray-500 dark:text-gray-400 mt-1">{row.serialNumber}</div>
          </td>
          <td className="px-4 py-3 whitespace-nowrap">{row.platform}</td>
          <td className="px-4 py-3 whitespace-nowrap"><When value={row.collectedAt} />
            <div className={`text-xs mt-1 ${row.freshness === "fresh" ? "text-gray-500 dark:text-gray-400" : "text-amber-700 dark:text-amber-300"}`}>{row.freshness === "fresh" ? "Within maximum age" : row.freshness === "stale" ? "Older than maximum age" : "Collection age unknown"}</div>
            {row.listMayBeIncomplete && <div className="text-xs text-amber-700 dark:text-amber-300 mt-1">List may be incomplete</div>}
          </td>
        </tr>
      })}
    </tbody>
  </table>
}

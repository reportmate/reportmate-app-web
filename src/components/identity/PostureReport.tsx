"use client"

import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react"
import { ExportCsvButton } from "../ui/ExportCsvButton"
import { ReportLoading, type LoadCount } from "../ui/LoadingProgress"
import { useRouter, useSearchParams } from "next/navigation"
import { usePlatformFilterSafe } from "../../providers/PlatformFilterProvider"
import DeviceFilters from "../shared/DeviceFilters"
import { ReportAccordion } from "../system/ReportAccordion"
import { IdentityViewSwitch } from "./IdentityViewSwitch"
import { PostureTable } from "./PostureTable"
import { fetchPostureReport } from "../../lib/identity/posture-request"
import {
  POSTURE_PARAMS, POSTURE_VIEW_PARAMS, QUICK_VIEWS, availableColumns, inventoryLabel, listParam, postureApiQuery,
  postureCsv, postureRows, postureUrlQuery, readPostureView, type PostureColumn, type PostureReport as Report,
} from "../../lib/identity/posture"

const actionButton = "px-4 py-2 text-sm rounded-lg transition-colors whitespace-nowrap font-medium flex items-center gap-2 disabled:opacity-50"
const secondaryAction = `${actionButton} bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white`
const emptyOptions = { usages: [], catalogs: [], areas: [], fleets: [], locations: [], rooms: [], inventoryStates: [] }
const hoursLabel = (value: string) => value === "24" ? "24 hours" : value === "168" ? "7 days" : value === "720" ? "30 days" : `${value} hours`

function Choice({ active, onClick, children, disabled }: { active: boolean; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return <button type="button" aria-pressed={active} onClick={onClick} disabled={disabled}
    className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${active
      ? "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-700"
      : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"}`}>{children}</button>
}

function Choices({ label, children }: { label: string; children: ReactNode }) {
  return <div role="group" aria-label={label}><h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">{label}</h3><div className="flex flex-wrap gap-2">{children}</div></div>
}

export function PostureReport() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { platformFilter } = usePlatformFilterSafe()
  const current = searchParams.toString()
  const params = new URLSearchParams(current)
  const query = postureApiQuery(params, platformFilter)
  const [pending, startTransition] = useTransition()
  const [data, setData] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reload, setReload] = useState(0)
  const [selectionsExpanded, setSelectionsExpanded] = useState(false)
  const [reportExpanded, setReportExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const [loadProgress, setLoadProgress] = useState<LoadCount | null>(null)
  const searchValue = params.get("search") || ""
  const [deviceSearch, setDeviceSearch] = useState(searchValue)
  const view = useMemo(() => readPostureView(new URLSearchParams(current), platformFilter), [current, platformFilter])
  const rows = useMemo(() => data ? postureRows(data.devices, view) : [], [data, view])
  const options = data?.options || emptyOptions
  const selectedViews = listParam(params, "views")
  const quickViews = QUICK_VIEWS.filter(([, , platform]) => platformFilter === "all" || platformFilter === platform)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setLoadProgress(null)
    setError(null)
    const run = async () => {
      try {
        const body = await fetchPostureReport(query, controller.signal, (loaded, total) => {
          if (!controller.signal.aborted) setLoadProgress({ loaded, total, unit: "devices" })
        })
        if (!controller.signal.aborted) setData(body)
      } catch (err) {
        if (!controller.signal.aborted) { setData(null); setError(err instanceof Error ? err.message : "Posture report unavailable") }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    run()
    return () => controller.abort()
  }, [query, reload])

  useEffect(() => { setDeviceSearch(searchValue) }, [searchValue])
  useEffect(() => {
    if (deviceSearch === searchValue) return
    const timer = setTimeout(() => router.replace(`/identity?${postureUrlQuery(current, { search: deviceSearch })}`, { scroll: false }), 250)
    return () => clearTimeout(timer)
  }, [deviceSearch, searchValue, current, router])

  const update = (patch: Record<string, string | null>) => startTransition(() => router.push(`/identity?${postureUrlQuery(current, patch)}`, { scroll: false }))
  const toggle = (key: string, value: string) => {
    const selected = listParam(params, key)
    update({ [key]: (selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value]).join(",") })
  }
  const clearAll = () => {
    setDeviceSearch("")
    update(Object.fromEntries([...POSTURE_PARAMS, ...POSTURE_VIEW_PARAMS].map(key => [key, null])))
  }
  const sortColumn = (column: PostureColumn) => update({ sort: column, direction: view.sort === column && view.direction === "asc" ? "desc" : "asc" })
  const toggleColumn = (column: PostureColumn) => {
    const columns = view.columns.includes(column) ? view.columns.filter(key => key !== column) : [...view.columns, column]
    update({ columns: columns.join(","), ...(columns.includes(view.sort) ? {} : { sort: null, direction: null }) })
  }
  const shareUrl = () => {
    const url = new URL(window.location.href)
    url.searchParams.set("platform", platformFilter === "Windows" ? "win" : platformFilter === "macOS" ? "mac" : "all")
    return url
  }
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl().toString())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { setError("Could not copy the link. Copy this page's address instead.") }
  }
  const exportCsv = () => {
    if (!data) return
    try {
      const blob = new Blob(["﻿", postureCsv(rows, data.generatedAt, shareUrl().toString())], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `identity-posture-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      setError("The report could not be exported. Please retry.")
    }
  }
  const age = params.get("maxAgeHours") || "168"
  const freshness = params.get("freshness") || "all"
  const activeCount = listParam(params, "inventoryStates").length + listParam(params, "rooms").length +
    (params.has("freshness") ? 1 : 0) + (params.has("maxAgeHours") ? 1 : 0) + (params.has("includeArchived") ? 1 : 0)
  const selectionsActive = listParam(params, "rooms").length + listParam(params, "inventoryStates").length + (params.get("includeArchived") === "true" ? 1 : 0)
  const reportActive = activeCount - selectionsActive

  return (
    <div className="h-[calc(100vh-4rem)] bg-gray-50 dark:bg-black flex flex-col overflow-hidden">
      <div className="flex-1 page-container px-4 sm:px-6 lg:px-8 py-8 flex flex-col min-h-0">
        <div className="flex-1 bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col min-h-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-start justify-between gap-3">
            <div><IdentityViewSwitch current="posture" /><p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Sign-in and recovery posture each device last reported.</p></div>
            <div className="flex flex-wrap items-start gap-3">
              <button type="button" onClick={copyLink} disabled={pending} title="Copy a shareable link to this exact report" className={copied ? `${actionButton} bg-emerald-600 hover:bg-emerald-700 text-white` : secondaryAction}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={copied ? "M5 13l4 4L19 7" : "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"} /></svg>
                {copied ? "Link Copied" : "Copy Link"}
              </button>
              <button type="button" onClick={() => setReload(n => n + 1)} disabled={loading || pending} className={secondaryAction}>
                <svg className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                Refresh
              </button>
              {!loading && data && rows.length > 0 && <ExportCsvButton onClick={exportCsv} disabled={pending} details="CSV includes every posture field, including hidden columns, for the filtered devices in this order." />}
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
              additionalActiveCount={selectionsActive} expanded={selectionsExpanded} onToggle={() => setSelectionsExpanded(v => !v)}
              trailing={<div className="flex flex-wrap gap-x-8 gap-y-4">
                {options.rooms.length > 0 && <Choices label="Room">{options.rooms.map(value => <Choice disabled={pending} key={value} active={listParam(params, "rooms").includes(value)} onClick={() => toggle("rooms", value)}>{value}</Choice>)}</Choices>}
                <Choices label="Inventory state"><Choice disabled={pending} active={!params.get("inventoryStates")} onClick={() => update({ inventoryStates: null })}>All</Choice>{options.inventoryStates.map(value => <Choice disabled={pending} key={value} active={listParam(params, "inventoryStates").includes(value)} onClick={() => toggle("inventoryStates", value)}>{inventoryLabel(value)}</Choice>)}</Choices>
                <Choices label="Archive"><Choice disabled={pending} active={params.get("includeArchived") === "true"} onClick={() => update({ includeArchived: params.get("includeArchived") === "true" ? null : "true" })}>Include archived</Choice></Choices>
              </div>} />
            <ReportAccordion label="Posture" activeCount={reportActive} expanded={reportExpanded} onToggle={() => setReportExpanded(v => !v)}>
              <div className="flex flex-wrap gap-x-8 gap-y-4">
                <Choices label="Identity collection age">{([["all", "All"], ["fresh", "Within maximum age"], ["stale", "Older"], ["unknown", "Unknown"]] as const).map(([value, label]) => <Choice disabled={pending} key={value} active={freshness === value} onClick={() => update({ freshness: value === "all" ? null : value })}>{label}</Choice>)}</Choices>
                <Choices label="Maximum collection age">{[...new Set(["24", "168", "720", age])].map(value => <Choice disabled={pending} key={value} active={age === value} onClick={() => update({ maxAgeHours: value === "168" ? null : value })}>{hoursLabel(value)}</Choice>)}</Choices>
              </div>
            </ReportAccordion>
            {error && <div role="alert" className="mx-6 my-4 p-3 text-sm text-red-800 dark:text-red-200 bg-red-50 dark:bg-red-900/20 rounded-lg">{error}<button type="button" className="underline ml-2" onClick={() => setReload(n => n + 1)}>Retry</button></div>}
            <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3"><span className="text-sm text-gray-600 dark:text-gray-400">{loading ? "Updating report…" : data ? `${rows.length.toLocaleString()} devices` : ""}</span><input type="search" aria-label="Search devices" placeholder="Search devices…" value={deviceSearch} onChange={e => setDeviceSearch(e.target.value)} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm text-gray-900 dark:text-white" /></div>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Quick views">
                <Choice disabled={pending} active={selectedViews.length === 0} onClick={() => update({ views: null })}>All devices</Choice>
                {quickViews.map(([key, label]) => <Choice disabled={pending} key={key} active={selectedViews.includes(key)} onClick={() => toggle("views", key)}>
                  {label}{data && ` ${data.summary[key] ?? 0}`}{data && (data.unknown[key] ?? 0) > 0 && <span className="text-gray-500 dark:text-gray-400"> · {data.unknown[key]} unknown</span>}
                </Choice>)}
              </div>
            </div>
            <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700">
              <details className="text-sm text-gray-600 dark:text-gray-300"><summary className="cursor-pointer py-1">Columns</summary>
                <div className="flex flex-wrap gap-2 mt-2" aria-label="Visible columns">{availableColumns(platformFilter).filter(([key]) => key !== "deviceName").map(([key, label]) => <Choice disabled={pending} key={key} active={view.columns.includes(key)} onClick={() => toggleColumn(key)}>{label}</Choice>)}
                  <button type="button" className="text-xs text-blue-600 dark:text-blue-400 hover:underline" disabled={pending} onClick={() => update({ columns: null, sort: null, direction: null })}>Reset columns</button>
                </div>
              </details>
            </div>
            {loading ? <ReportLoading message="Loading posture report…" count={loadProgress} resetKey={reload} onRetry={() => setReload(n => n + 1)} />
              : data && <PostureTable devices={rows} view={view} onSort={sortColumn} pending={pending} />}
          </div>
          <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">Last collected local state. Quick views count only collection within the maximum age; older, missing or unreadable collection is unknown, never compliant. Recovery key shows whether a FileVault key exists on the device, not whether it is escrowed. Activation Lock marked likely is inferred from Find My.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

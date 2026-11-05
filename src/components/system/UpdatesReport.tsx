"use client"

import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { usePlatformFilterSafe } from "../../providers/PlatformFilterProvider"
import DeviceFilters from "../shared/DeviceFilters"
import { SystemViewSwitch } from "./SystemViewSwitch"
import { ServiceSelectionCloud } from "./ServiceSelectionCloud"
import { UpdatesTable } from "./UpdatesTable"
import { peekCached, rememberCached, trackedFetch } from "../../lib/data-cache"
import { inventoryLabel } from "../../lib/system/services"
import { fetchUpdatesReport } from "../../lib/system/updates-request"
import {
  UPDATE_COLUMNS, UPDATE_OPTIONS_API, UPDATE_PARAMS, UPDATE_STATES, UPDATE_VIEW_PARAMS, commaList, jsonList,
  readUpdatesView, updateOptionLabel, updateOptionsQuery, updateStateLabel, updatesApiQuery, updatesCsv,
  updatesUrlQuery, updatesViewRows, type UpdateCatalog, type UpdateColumn, type UpdatesReport as Report,
} from "../../lib/system/updates"

const actionButton = "px-4 py-2 text-sm rounded-lg transition-colors whitespace-nowrap font-medium flex items-center gap-2 disabled:opacity-50"
const secondaryAction = `${actionButton} bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white`
const emptyOptions = { usages: [], catalogs: [], areas: [], fleets: [], locations: [], rooms: [], inventoryStates: [] }

function Choice({ active, onClick, children, disabled }: { active: boolean; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return <button type="button" aria-pressed={active} onClick={onClick} disabled={disabled}
    className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${active
      ? "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-700"
      : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"}`}>{children}</button>
}

function Choices({ label, children }: { label: string; children: ReactNode }) {
  return <div role="group" aria-label={label}><h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">{label}</h3><div className="flex flex-wrap gap-2">{children}</div></div>
}

const hoursLabel = (value: string) => value === "24" ? "24 hours" : value === "168" ? "7 days" : value === "720" ? "30 days" : `${value} hours`

export function UpdatesReport() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { platformFilter } = usePlatformFilterSafe()
  const current = searchParams.toString()
  const params = new URLSearchParams(current)
  const query = updatesApiQuery(params, platformFilter)
  const optionsKey = `${UPDATE_OPTIONS_API}?${updateOptionsQuery(params, platformFilter)}`
  const [pending, startTransition] = useTransition()
  const [data, setData] = useState<Report | null>(null)
  const view = useMemo(() => readUpdatesView(new URLSearchParams(current)), [current])
  const rows = useMemo(() => data ? updatesViewRows(data.rows, view) : [], [data, view])
  const [catalog, setCatalog] = useState<UpdateCatalog | null>(null)
  const [loading, setLoading] = useState(true)
  const [optionsLoading, setOptionsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [optionsError, setOptionsError] = useState<string | null>(null)
  const [reload, setReload] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const [loadProgress, setLoadProgress] = useState("")
  const searchValue = params.get("search") || ""
  const [deviceSearch, setDeviceSearch] = useState(searchValue)
  const selectedUpdates = jsonList(params, "updates")
  const selectedCves = jsonList(params, "cves")
  const options = catalog?.options || emptyOptions
  const hasSelection = selectedUpdates.length > 0 || selectedCves.length > 0

  useEffect(() => {
    const controller = new AbortController()
    const cached = peekCached<UpdateCatalog>(optionsKey)
    setCatalog(cached || null)
    setOptionsLoading(!cached)
    setOptionsError(null)
    const run = async () => {
      try {
        const response = await trackedFetch(optionsKey, { cache: "no-store", signal: controller.signal })
        const body = await response.json()
        if (!response.ok || !Array.isArray(body.updates) || !Array.isArray(body.cves)) throw new Error("Available update selections could not be loaded.")
        if (!controller.signal.aborted) setCatalog(rememberCached(optionsKey, body))
      } catch (err) {
        if (!controller.signal.aborted) setOptionsError(err instanceof Error ? err.message : "Update selections unavailable")
      } finally {
        if (!controller.signal.aborted) setOptionsLoading(false)
      }
    }
    run()
    return () => controller.abort()
  }, [optionsKey, reload])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setLoadProgress("")
    setError(null)
    setData(null)
    const run = async () => {
      try {
        const body = await fetchUpdatesReport(query, controller.signal, (loaded, total) => {
          if (!controller.signal.aborted) setLoadProgress(`${loaded.toLocaleString()} of ${total.toLocaleString()} rows`)
        })
        if (!controller.signal.aborted) setData(body)
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Updates report unavailable")
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
    const timer = setTimeout(() => router.replace(`/system?${updatesUrlQuery(current, { search: deviceSearch })}`, { scroll: false }), 250)
    return () => clearTimeout(timer)
  }, [deviceSearch, searchValue, current, router])

  const update = (patch: Record<string, string | null>) => {
    startTransition(() => router.push(`/system?${updatesUrlQuery(current, patch)}`, { scroll: false }))
  }
  const toggle = (key: string, value: string) => {
    const selected = commaList(params, key)
    update({ [key]: (selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value]).join(",") })
  }
  const chooseList = (key: "updates" | "cves", values: string[]) => update({ [key]: values.length ? JSON.stringify(values) : null })
  const toggleList = (key: "updates" | "cves", value: string) => {
    const selected = jsonList(params, key)
    chooseList(key, selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value])
  }
  const clearAll = () => {
    setDeviceSearch("")
    update(Object.fromEntries([...UPDATE_PARAMS, ...UPDATE_VIEW_PARAMS].map(key => [key, null])))
  }
  const sortColumn = (column: UpdateColumn) => update({ sort: column, direction: view.sort === column && view.direction === "asc" ? "desc" : "asc" })
  const toggleColumn = (column: UpdateColumn) => {
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
      const blob = new Blob(["﻿", updatesCsv(rows, data.generatedAt, shareUrl().toString())], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `updates-report-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      setError("The report could not be exported. Please retry.")
    }
  }
  const age = params.get("maxAgeHours") || "24"
  const freshness = params.get("freshness") || "all"
  const deferred = params.get("deferred") || "all"
  const minAge = params.get("minAgeDays") || "0"
  const activeCount = selectedUpdates.length + selectedCves.length + commaList(params, "states").length +
    commaList(params, "inventoryStates").length + ["securityOnly", "rebootRequired", "deferred", "minAgeDays", "freshness", "maxAgeHours", "includeArchived"].filter(k => params.has(k)).length
  const updateLabels = new Map((catalog?.updates || []).map(option => [option.key, updateOptionLabel(option)]))
  const chips = [
    ...selectedUpdates.map(key => ({ key: `u-${key}`, label: updateLabels.get(key) || key.replace(/^(windows|macos):(title:)?/, ""), clear: () => toggleList("updates", key) })),
    ...selectedCves.map(cve => ({ key: `c-${cve}`, label: cve, clear: () => toggleList("cves", cve) })),
  ]

  return (
    <div className="h-[calc(100vh-4rem)] bg-gray-50 dark:bg-black flex flex-col overflow-hidden">
      <div className="flex-1 page-container px-4 sm:px-6 lg:px-8 py-8 flex flex-col min-h-0">
        <div className="flex-1 bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col min-h-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-start justify-between gap-3">
            <div><SystemViewSwitch current="updates" /><p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Pending and installed operating system updates across devices.</p></div>
            <div className="flex flex-wrap items-start gap-3">
              <button type="button" onClick={copyLink} disabled={pending} title="Copy a shareable link to this exact report" className={copied ? `${actionButton} bg-emerald-600 hover:bg-emerald-700 text-white` : secondaryAction}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={copied ? "M5 13l4 4L19 7" : "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"} /></svg>
                {copied ? "Link Copied" : "Copy Link"}
              </button>
              <button type="button" onClick={() => setReload(n => n + 1)} disabled={loading || pending} className={secondaryAction}>
                <svg className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                Refresh
              </button>
              {!loading && data && rows.length > 0 && <div className="flex flex-col items-start gap-1 max-w-xs"><button type="button" onClick={exportCsv} disabled={pending} aria-describedby="updates-export-details" title="Export all fields for the filtered rows" className={`${actionButton} bg-emerald-600 hover:bg-emerald-700 text-white`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Export CSV
              </button><p id="updates-export-details" className="text-xs text-gray-500 dark:text-gray-400">CSV includes every update and inventory field, including hidden columns, for the filtered rows in this order.</p></div>}
            </div>
          </div>
          <div className="flex-1 overflow-auto min-h-0" aria-busy={loading}>
            <DeviceFilters filterOptions={{ ...options, statuses: [] }}
              selectedStatuses={[]} onStatusToggle={() => {}}
              selectedUsages={commaList(params, "usages")} onUsageToggle={v => toggle("usages", v)}
              selectedCatalogs={commaList(params, "catalogs")} onCatalogToggle={v => toggle("catalogs", v)}
              selectedAreas={commaList(params, "areas")} onAreaToggle={v => toggle("areas", v)}
              selectedFleets={commaList(params, "fleets")} onFleetToggle={v => toggle("fleets", v)}
              selectedLocations={commaList(params, "locations")} onLocationToggle={v => toggle("locations", v)}
              searchQuery="" onSearchChange={() => {}} onClearAll={clearAll}
              additionalActiveCount={activeCount} expanded={expanded} onToggle={() => setExpanded(v => !v)}>
              <div className="space-y-4 py-3 mb-4 border-b border-gray-200 dark:border-gray-700">
                <div className="grid gap-6 lg:grid-cols-2">
                  <ServiceSelectionCloud label="Updates" loading={optionsLoading} selected={selectedUpdates}
                    options={(catalog?.updates || []).map(option => ({ value: option.key, label: `${updateOptionLabel(option)}${platformFilter === "all" ? ` (${option.platform === "windows" ? "Windows" : "macOS"})` : ""}`, devices: option.pendingDevices + option.installedDevices }))}
                    onToggle={value => toggleList("updates", value)} onSelect={values => chooseList("updates", values)} />
                  <ServiceSelectionCloud label="CVEs" loading={optionsLoading} selected={selectedCves}
                    options={(catalog?.cves || []).map(option => ({ value: option.cve, label: option.cve, devices: option.devices }))}
                    onToggle={value => toggleList("cves", value)} onSelect={values => chooseList("cves", values)} />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Counts are devices reporting the update pending or installed. CVEs come from pending Windows updates; macOS does not report CVEs.</p>
                <div className="flex flex-wrap gap-x-8 gap-y-4">
                  <Choices label="Update type">
                    <Choice disabled={pending} active={params.get("securityOnly") === "true"} onClick={() => update({ securityOnly: params.get("securityOnly") === "true" ? null : "true" })}>Security only</Choice>
                    <Choice disabled={pending} active={params.get("rebootRequired") === "true"} onClick={() => update({ rebootRequired: params.get("rebootRequired") === "true" ? null : "true" })}>Restart required</Choice>
                  </Choices>
                  <Choices label="Deferred (macOS)">{([["all", "All"], ["yes", "Deferred"], ["no", "Not deferred"]] as const).map(([value, label]) => <Choice disabled={pending} key={value} active={deferred === value} onClick={() => update({ deferred: value === "all" ? null : value })}>{label}</Choice>)}</Choices>
                  <Choices label="Pending at least">{[...new Set(["0", "7", "30", "90", minAge])].map(value => <Choice disabled={pending} key={value} active={minAge === value} onClick={() => update({ minAgeDays: value === "0" ? null : value })}>{value === "0" ? "Any age" : `${value} days`}</Choice>)}</Choices>
                  <Choices label="Update collection age">{([["all", "All"], ["fresh", "Within maximum age"], ["stale", "Older"], ["unknown", "Unknown"]] as const).map(([value, label]) => <Choice disabled={pending} key={value} active={freshness === value} onClick={() => update({ freshness: value === "all" ? null : value })}>{label}</Choice>)}</Choices>
                  <Choices label="Maximum collection age">{[...new Set(["24", "168", "720", age])].map(value => <Choice disabled={pending} key={value} active={age === value} onClick={() => update({ maxAgeHours: value === "24" ? null : value })}>{hoursLabel(value)}</Choice>)}</Choices>
                  <Choices label="Inventory state"><Choice disabled={pending} active={!params.get("inventoryStates")} onClick={() => update({ inventoryStates: null })}>All</Choice>{options.inventoryStates.map(value => <Choice disabled={pending} key={value} active={commaList(params, "inventoryStates").includes(value)} onClick={() => toggle("inventoryStates", value)}>{inventoryLabel(value)}</Choice>)}</Choices>
                  <Choices label="Archive"><Choice disabled={pending} active={params.get("includeArchived") === "true"} onClick={() => update({ includeArchived: params.get("includeArchived") === "true" ? null : "true" })}>Include archived</Choice></Choices>
                </div>
              </div>
            </DeviceFilters>
            {chips.length > 0 && <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center gap-2">
              {chips.map(chip => <button type="button" key={chip.key} onClick={chip.clear} title={`Remove ${chip.label}`} className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800">{chip.label}<span aria-hidden="true">×</span></button>)}
              <button type="button" onClick={clearAll} className="text-xs text-red-600 dark:text-red-400 hover:underline ml-2">Clear selections</button>
            </div>}
            {(error || optionsError) && <div role="alert" className="mx-6 my-4 p-3 text-sm text-red-800 dark:text-red-200 bg-red-50 dark:bg-red-900/20 rounded-lg">{error || optionsError}<button type="button" className="underline ml-2" onClick={() => setReload(n => n + 1)}>Retry</button></div>}
            <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3"><span className="text-sm text-gray-600 dark:text-gray-400">{loading ? "Updating report…" : data ? `${rows.length.toLocaleString()} rows across ${new Set(rows.map(r => r.serialNumber)).size.toLocaleString()} devices` : ""}</span><input type="search" aria-label="Search devices" placeholder="Search devices…" value={deviceSearch} onChange={e => setDeviceSearch(e.target.value)} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm text-gray-900 dark:text-white" /></div>
              <div className="flex flex-wrap gap-2" aria-label="Update state filters"><Choice disabled={pending} active={!params.get("states")} onClick={() => update({ states: null })}>All states</Choice>
                {UPDATE_STATES.filter(state => hasSelection ? state !== "none" : state !== "installed" && state !== "not_reported").map(state => <Choice disabled={pending} key={state} active={commaList(params, "states").includes(state)} onClick={() => toggle("states", state)}>{updateStateLabel(state)}{data ? ` ${data.summary[state] || 0}` : ""}</Choice>)}</div>
            </div>
            <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-start justify-between gap-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-2xl">{hasSelection
                ? "Each device in scope shows the selected updates as pending or installed. Not reported means the update is in neither the pending list nor the recent install history, which is not proof it is missing."
                : "One row per device and pending update. Devices with an empty pending list show once as None pending reported; clients send an empty list both when nothing is pending and when the update search failed."}</p>
              <details className="text-sm text-gray-600 dark:text-gray-300 max-w-xl"><summary className="cursor-pointer py-1">Columns</summary>
                <div className="flex flex-wrap gap-2 mt-2" aria-label="Visible columns">{UPDATE_COLUMNS.filter(([key]) => key !== "deviceName").map(([key, label]) => <Choice disabled={pending} key={key} active={view.columns.includes(key)} onClick={() => toggleColumn(key)}>{label}</Choice>)}
                  <button type="button" className="text-xs text-blue-600 dark:text-blue-400 hover:underline" disabled={pending} onClick={() => update({ columns: null, sort: null, direction: null })}>Reset columns</button>
                </div>
              </details>
            </div>
            {loading ? <div role="status" className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">Loading updates report…{loadProgress && ` ${loadProgress}`}</div>
              : data && <UpdatesTable rows={rows} view={view} onSort={sortColumn} pending={pending} />}
          </div>
          <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">Last collected local state. Stale, missing or malformed collection is Unknown. Age is days since macOS first offered the update, or since the Windows update was released.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

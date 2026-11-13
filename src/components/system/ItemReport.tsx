"use client"

import Link from "next/link"
import { ExportCsvButton } from "../ui/ExportCsvButton"
import { ReportLoading, type LoadCount } from "../ui/LoadingProgress"
import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { usePlatformFilterSafe } from "../../providers/PlatformFilterProvider"
import DeviceFilters from "../shared/DeviceFilters"
import { SystemViewSwitch, type SystemTab } from "./SystemViewSwitch"
import { ServiceSelectionCloud } from "./ServiceSelectionCloud"
import { peekCached, rememberCached, trackedFetch } from "../../lib/data-cache"
import { formatExactTime, formatRelativeTime } from "../../lib/time"
import { inventoryLabel } from "../../lib/system/services"
import {
  VIEW_PARAMS, apiPlatform, fetchItemReport, hasReportQuery, itemReportCsv, itemValue, listParam, optionsApiQuery,
  readItemView, reportApiQuery, reportParams, reportUrlQuery, sortRows,
  type ItemCatalog, type ItemColumn, type ItemReport as Report, type ItemReportConfig, type ItemRow,
} from "../../lib/system/item-reports"

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

function Cell({ row, column }: { row: ItemRow; column: ItemColumn }) {
  if (column.appliesTo && !column.appliesTo.includes(row.kind)) return <span className="text-gray-400">Not applicable</span>
  const value = column.value(row)
  if (column.type === "device") return <>
    <Link href={`/device/${encodeURIComponent(row.serialNumber)}?tab=system`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">{value}</Link>
    {row.hostname && row.hostname !== row.deviceName && <div className="text-xs mt-1 text-gray-600 dark:text-gray-400">{row.hostname}</div>}
    <div className="font-mono text-xs text-gray-500 dark:text-gray-400 mt-1">{row.serialNumber}</div>
  </>
  if (value === null || value === "") return <span className="text-gray-400">{column.type === "time" ? "Unknown" : column.type === "state" ? "Not applicable" : "Not reported"}</span>
  if (column.type === "time") {
    const time = Date.parse(String(value))
    return Number.isFinite(time) ? <time dateTime={String(value)} title={formatExactTime(String(value))}>{formatRelativeTime(String(value))}</time> : <span>{value}</span>
  }
  if (column.type === "state") {
    const label = String(value)
    const color = /^(Failed|Disabled|Not activated|Unsigned)$/.test(label) ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
      : /^(Succeeded|Enabled|Activated|Signed|Within maximum age|Running)$/.test(label) ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
      : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
    return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>{label}</span>
  }
  return <span className={column.type === "mono" ? "font-mono text-xs break-all" : ""}>{value}</span>
}

export function ItemReport({ config }: { config: ItemReportConfig }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { platformFilter } = usePlatformFilterSafe()
  const current = searchParams.toString()
  const params = useMemo(() => new URLSearchParams(current), [current])
  const notApplicable = !!config.macOnly && platformFilter === "Windows"
  const query = reportApiQuery(config, params, platformFilter)
  const optionsKey = `${config.api}/filters?${optionsApiQuery(params, platformFilter)}`
  const hasQuery = hasReportQuery(config, params) && !notApplicable
  const [pending, startTransition] = useTransition()
  const [data, setData] = useState<Report | null>(null)
  const [catalog, setCatalog] = useState<ItemCatalog | null>(null)
  const [loading, setLoading] = useState(hasQuery)
  const [optionsLoading, setOptionsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [optionsError, setOptionsError] = useState<string | null>(null)
  const [reload, setReload] = useState(0)
  const [expanded, setExpanded] = useState(!hasQuery)
  const [copied, setCopied] = useState(false)
  const [progress, setProgress] = useState<LoadCount | null>(null)
  const searchValue = params.get("search") || ""
  const [deviceSearch, setDeviceSearch] = useState(searchValue)
  const view = useMemo(() => readItemView(config, params), [config, params])
  const rows = useMemo(() => data ? sortRows(config, data.rows, view) : [], [config, data, view])
  const selected = listParam(params, "items")
  const kinds = listParam(params, "kinds")
  const options = { ...emptyOptions, ...(catalog?.options || {}) }
  const columns = view.columns.map(key => config.columns.find(c => c.key === key)!).filter(Boolean)

  useEffect(() => {
    if (notApplicable) { setOptionsLoading(false); return }
    const controller = new AbortController()
    const cached = peekCached<ItemCatalog>(optionsKey)
    setCatalog(cached || null)
    setOptionsLoading(!cached)
    setOptionsError(null)
    const run = async () => {
      try {
        const response = await trackedFetch(optionsKey, { cache: "no-store", signal: controller.signal })
        const body = await response.json()
        if (!response.ok || !Array.isArray(body.items)) throw new Error("Available report selections could not be loaded.")
        if (!controller.signal.aborted) setCatalog(rememberCached(optionsKey, body))
      } catch (err) {
        if (!controller.signal.aborted) setOptionsError(err instanceof Error ? err.message : "Report selections unavailable")
      } finally {
        if (!controller.signal.aborted) setOptionsLoading(false)
      }
    }
    run()
    return () => controller.abort()
  }, [optionsKey, reload, notApplicable])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(hasQuery)
    setProgress(null)
    setError(null)
    setData(null)
    if (!hasQuery) return () => controller.abort()
    const run = async () => {
      try {
        const body = await fetchItemReport(config.api, query, controller.signal, (loaded, total) => {
          if (!controller.signal.aborted) setProgress({ loaded, total, unit: "rows" })
        })
        if (!controller.signal.aborted) setData(body)
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Report unavailable")
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    run()
    return () => controller.abort()
  }, [config.api, query, reload, hasQuery])

  useEffect(() => { setDeviceSearch(searchValue) }, [searchValue])
  useEffect(() => {
    if (deviceSearch === searchValue) return
    const timer = setTimeout(() => router.replace(`/system?${reportUrlQuery(config.tab, current, { search: deviceSearch })}`, { scroll: false }), 250)
    return () => clearTimeout(timer)
  }, [deviceSearch, searchValue, current, router, config.tab])

  const update = (patch: Record<string, string | null>) => {
    const next = reportUrlQuery(config.tab, current, patch)
    startTransition(() => router.push(`/system?${next}`, { scroll: false }))
  }
  const toggle = (key: string, value: string) => {
    const values = listParam(params, key)
    update({ [key]: (values.includes(value) ? values.filter(v => v !== value) : [...values, value]).join(",") })
  }
  const chooseItems = (values: string[]) => update({ items: values.length ? JSON.stringify(values) : null })
  const toggleItem = (value: string) => chooseItems(selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value])
  const clearAll = () => {
    setDeviceSearch("")
    update(Object.fromEntries([...reportParams(config), ...VIEW_PARAMS].map(key => [key, null])))
  }
  const sortColumn = (key: string) => update({ sort: key, direction: view.sort === key && view.direction === "asc" ? "desc" : "asc" })
  const toggleColumn = (key: string) => {
    const next = view.columns.includes(key) ? view.columns.filter(k => k !== key) : [...view.columns, key]
    update({ columns: next.join(","), ...(next.includes(view.sort) ? {} : { sort: null, direction: null }) })
  }
  const shareUrl = () => {
    const url = new URL(window.location.href)
    url.searchParams.set("platform", apiPlatform(platformFilter) === "windows" ? "win" : apiPlatform(platformFilter) === "macos" ? "mac" : "all")
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
      const blob = new Blob(["﻿", itemReportCsv(config, rows, data.generatedAt, shareUrl().toString())], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${config.csvName}-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch { setError("The report could not be exported. Please retry.") }
  }

  const itemOptions = (catalog?.items || []).filter(item => kinds.length === 0 || kinds.includes(item.kind))
    .map(item => ({ value: itemValue(item.kind, item.key), label: item.key, devices: item.devices }))
  const kindLabel = (kind: string) => config.kinds.find(([key]) => key === kind)?.[1] || kind
  const age = params.get("maxAgeHours") || "24"
  const freshness = params.get("freshness") || "all"
  const activeCount = selected.length + kinds.length + config.filters.reduce((n, f) => n + listParam(params, f.param).length, 0) +
    listParam(params, "inventoryStates").length + (params.has("freshness") ? 1 : 0) + (params.has("maxAgeHours") ? 1 : 0) + (params.has("includeArchived") ? 1 : 0)
  const summaryCount = (summaryKey: string | undefined, value: string) => data && summaryKey ? ` ${data.summary[`${summaryKey}:${value}`] || 0}` : ""

  return (
    <div className="h-[calc(100vh-4rem)] bg-gray-50 dark:bg-black flex flex-col overflow-hidden">
      <div className="flex-1 page-container px-4 sm:px-6 lg:px-8 py-8 flex flex-col min-h-0">
        <div className="flex-1 bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col min-h-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-start justify-between gap-3">
            <div><SystemViewSwitch current={config.tab as SystemTab} /><p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{config.description}</p></div>
            {!notApplicable && <div className="flex flex-wrap items-start gap-3">
              <button type="button" onClick={copyLink} disabled={pending} title="Copy a shareable link to this exact report" className={copied ? `${actionButton} bg-emerald-600 hover:bg-emerald-700 text-white` : secondaryAction}>
                {copied ? "Link Copied" : "Copy Link"}
              </button>
              <button type="button" onClick={() => setReload(n => n + 1)} disabled={loading || pending} className={secondaryAction}>Refresh</button>
              {!loading && data && rows.length > 0 && <ExportCsvButton onClick={exportCsv} disabled={pending} details="CSV includes every column, including hidden ones, for the filtered and sorted rows." />}
            </div>}
          </div>
          {notApplicable ? <div role="status" className="flex-1 px-6 py-12 text-center text-gray-500 dark:text-gray-400">
            <p className="font-medium">Not applicable to Windows.</p>
            <p className="text-sm mt-2">System extensions, kernel extensions and privileged helper tools exist only on macOS. Switch the platform filter to macOS or All to see this report.</p>
          </div> : <div className="flex-1 overflow-auto min-h-0" aria-busy={loading}>
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
                {config.kinds.length > 1 && <Choices label="Item kinds"><Choice disabled={pending} active={kinds.length === 0} onClick={() => update({ kinds: null })}>All</Choice>{config.kinds.map(([value, label]) => <Choice disabled={pending} key={value} active={kinds.includes(value)} onClick={() => toggle("kinds", value)}>{label}</Choice>)}</Choices>}
                <ServiceSelectionCloud label="Items" options={itemOptions} selected={selected} onToggle={toggleItem} onSelect={chooseItems} loading={optionsLoading} />
                <div className="flex flex-wrap gap-x-8 gap-y-4">
                  {config.filters.map(filter => {
                    const choices = filter.fromCatalog ? (catalog?.[filter.fromCatalog] || []).map(entry => [entry.value, `${entry.value} (${entry.devices})`] as const) : filter.choices
                    if (choices.length === 0) return null
                    return <Choices key={filter.param} label={filter.label}><Choice disabled={pending} active={!params.get(filter.param)} onClick={() => update({ [filter.param]: null })}>All</Choice>
                      {choices.map(([value, label]) => <Choice disabled={pending} key={value} active={listParam(params, filter.param).includes(value)} onClick={() => toggle(filter.param, value)}>{label}{summaryCount(filter.summaryKey, value)}</Choice>)}</Choices>
                  })}
                  <Choices label="System collection age">{([["all", "All"], ["fresh", "Within maximum age"], ["stale", "Older"], ["unknown", "Unknown"]] as const).map(([value, label]) => <Choice disabled={pending} key={value} active={freshness === value} onClick={() => update({ freshness: value === "all" ? null : value })}>{label}</Choice>)}</Choices>
                  <Choices label="Maximum collection age">{[...new Set(["24", "168", "720", age])].map(value => <Choice disabled={pending} key={value} active={age === value} onClick={() => update({ maxAgeHours: value === "24" ? null : value })}>{value === "24" ? "24 hours" : value === "168" ? "7 days" : value === "720" ? "30 days" : `${value} hours`}</Choice>)}</Choices>
                  <Choices label="Inventory state"><Choice disabled={pending} active={!params.get("inventoryStates")} onClick={() => update({ inventoryStates: null })}>All</Choice>{options.inventoryStates.map(value => <Choice disabled={pending} key={value} active={listParam(params, "inventoryStates").includes(value)} onClick={() => toggle("inventoryStates", value)}>{inventoryLabel(value)}</Choice>)}</Choices>
                  <Choices label="Archive"><Choice disabled={pending} active={params.get("includeArchived") === "true"} onClick={() => update({ includeArchived: params.get("includeArchived") === "true" ? null : "true" })}>Include archived</Choice></Choices>
                </div>
              </div>
            </DeviceFilters>
            {selected.length > 0 && <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center gap-2">
              {selected.map(value => {
                const [kind, ...rest] = value.split(":")
                return <button type="button" key={value} onClick={() => toggleItem(value)} title={`Remove ${rest.join(":")}`} className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800"><span className="opacity-70">{kindLabel(kind)}</span>{rest.join(":")}<span aria-hidden="true">×</span></button>
              })}
              <button type="button" onClick={clearAll} className="text-xs text-red-600 dark:text-red-400 hover:underline ml-2">Clear selections</button>
            </div>}
            {(error || optionsError) && <div role="alert" className="mx-6 my-4 p-3 text-sm text-red-800 dark:text-red-200 bg-red-50 dark:bg-red-900/20 rounded-lg">{error || optionsError}<button type="button" className="underline ml-2" onClick={() => setReload(n => n + 1)}>Retry</button></div>}
            {hasQuery && <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-gray-600 dark:text-gray-400">{loading ? "Updating report…" : data ? `${rows.length.toLocaleString()} rows on ${data.devicesReporting.toLocaleString()} devices` : ""}</span>
                {data && data.devicesWithoutInventory > 0 && <span className="text-xs text-amber-700 dark:text-amber-300">{data.devicesWithoutInventory.toLocaleString()} of {data.devicesInScope.toLocaleString()} devices in scope have no usable inventory for this report; their items are unknown.</span>}
                <input type="search" aria-label="Search devices" placeholder="Search devices…" value={deviceSearch} onChange={e => setDeviceSearch(e.target.value)} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm text-gray-900 dark:text-white" />
              </div>
              <details className="text-sm text-gray-600 dark:text-gray-300 max-w-xl"><summary className="cursor-pointer py-1">Columns</summary>
                <div className="flex flex-wrap gap-2 mt-2" aria-label="Visible columns">{config.columns.filter(c => c.key !== "deviceName").map(c => <Choice disabled={pending} key={c.key} active={view.columns.includes(c.key)} onClick={() => toggleColumn(c.key)}>{c.label}</Choice>)}
                  <button type="button" className="text-xs text-blue-600 dark:text-blue-400 hover:underline" disabled={pending} onClick={() => update({ columns: null, sort: null, direction: null })}>Reset columns</button>
                </div>
              </details>
            </div>}
            {!hasQuery ? <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"><p className="font-medium">{config.prompt}</p><p className="text-sm mt-2">Selections list only values devices have reported. Results update as you select.</p></div>
              : loading ? <ReportLoading message="Loading report…" count={progress} resetKey={reload} onRetry={() => setReload(n => n + 1)} />
              : data && <div className="overflow-x-auto"><table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/50"><tr>{columns.map(column => {
                  const active = view.sort === column.key
                  return <th key={column.key} scope="col" aria-sort={active ? (view.direction === "asc" ? "ascending" : "descending") : "none"} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                    <button type="button" onClick={() => sortColumn(column.key)} disabled={pending} className="inline-flex items-center gap-1 uppercase tracking-wider hover:text-gray-900 dark:hover:text-white">{column.label}<span aria-hidden="true">{active ? view.direction === "asc" ? "↑" : "↓" : "↕"}</span></button>
                  </th>
                })}</tr></thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-sm text-gray-900 dark:text-gray-100">
                  {rows.length === 0 && <tr><td colSpan={columns.length} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">No reported items match these filters.</td></tr>}
                  {rows.map((row, index) => <tr key={`${row.serialNumber}-${row.kind}-${row.key}-${index}`} className="align-top hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    {columns.map(column => <td key={column.key} className={`px-4 py-3 ${column.type === "mono" ? "min-w-[200px] max-w-md" : column.type === "device" ? "min-w-[190px]" : "whitespace-nowrap"}`}><Cell row={row} column={column} /></td>)}
                  </tr>)}
                </tbody>
              </table></div>}
          </div>}
          <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">{config.footnote}{config.tab === "background" && <> <Link href={`/system?${reportUrlQuery("services", "", {})}`} className="text-blue-600 dark:text-blue-400 hover:underline">Open Services</Link></>}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

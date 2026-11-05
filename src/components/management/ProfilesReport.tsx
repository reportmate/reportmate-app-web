"use client"

import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { usePlatformFilterSafe } from "../../providers/PlatformFilterProvider"
import DeviceFilters from "../shared/DeviceFilters"
import { ServiceSelectionCloud } from "../system/ServiceSelectionCloud"
import { ManagementShieldIcon, ManagementViewSwitch } from "./ManagementViewSwitch"
import { ProfilesTable } from "./ProfilesTable"
import { peekCached, rememberCached, trackedFetch } from "../../lib/data-cache"
import {
  MAX_SELECTIONS, PROFILE_OPTIONS_API, PROFILE_PARAMS, PROFILE_STATES, PROFILE_VIEW_PARAMS,
  fetchProfilesReport, inventoryLabel, listParam, optionsForPlatform, profilesApiQuery, profilesCsv,
  profilesUrlQuery, readProfilesView, sortProfileRows, stateLabel,
  type ProfileCatalog, type ProfileColumn, type ProfileKind, type ProfilesReport as Report,
} from "../../lib/management/profiles"

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

const platformParam = (platform: string) => platform === "Windows" ? "win" : platform === "macOS" ? "mac" : "all"

/** /management?tab=profiles (configuration profiles, both platforms) and ?tab=preferences (macOS managed preferences). */
export function ProfilesReport({ kind }: { kind: ProfileKind }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { platformFilter } = usePlatformFilterSafe()
  const current = searchParams.toString()
  const params = useMemo(() => new URLSearchParams(current), [current])
  const query = profilesApiQuery(params, kind, platformFilter)
  const includeArchived = params.get("includeArchived") === "true"
  const optionsKey = `${PROFILE_OPTIONS_API}${includeArchived ? "?includeArchived=true" : ""}`
  const identifiers = listParam(params, "identifiers")
  const hasQuery = identifiers.length > 0
  const view = useMemo(() => readProfilesView(params), [params])
  const [pending, startTransition] = useTransition()
  const [data, setData] = useState<Report | null>(null)
  const [catalog, setCatalog] = useState<ProfileCatalog | null>(null)
  const [loading, setLoading] = useState(hasQuery)
  const [optionsLoading, setOptionsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [optionsError, setOptionsError] = useState<string | null>(null)
  const [reload, setReload] = useState(0)
  const [expanded, setExpanded] = useState(!hasQuery)
  const [copied, setCopied] = useState(false)
  const [loadProgress, setLoadProgress] = useState("")
  const searchValue = params.get("search") || ""
  const [deviceSearch, setDeviceSearch] = useState(searchValue)
  const rows = useMemo(() => data ? sortProfileRows(data.devices, view) : [], [data, view])
  const noun = kind === "preference" ? "preference domains" : "profiles"
  const allOptions = (kind === "preference" ? catalog?.preferences : catalog?.profiles) || []
  const visibleOptions = optionsForPlatform(allOptions, platformFilter)
  const labelFor = (identifier: string) => allOptions.find(o => o.identifier === identifier)?.name || identifier
  const preferenceKey = params.get("preferenceKey") || ""
  const availableKeys = kind === "preference"
    ? [...new Set(allOptions.filter(o => identifiers.includes(o.identifier)).flatMap(o => o.keys || []))].sort((a, b) => a.localeCompare(b))
    : []
  const options = catalog?.options || emptyOptions

  useEffect(() => {
    const controller = new AbortController()
    const cached = peekCached<ProfileCatalog>(optionsKey)
    setCatalog(cached || null)
    setOptionsLoading(!cached)
    setOptionsError(null)
    const run = async () => {
      try {
        const response = await trackedFetch(optionsKey, { cache: "no-store", signal: controller.signal })
        const body = await response.json()
        if (!response.ok || !Array.isArray(body.profiles) || !Array.isArray(body.preferences)) throw new Error("Available profile selections could not be loaded.")
        if (!controller.signal.aborted) setCatalog(rememberCached(optionsKey, body))
      } catch (err) {
        if (!controller.signal.aborted) setOptionsError(err instanceof Error ? err.message : "Profile selections unavailable")
      } finally {
        if (!controller.signal.aborted) setOptionsLoading(false)
      }
    }
    run()
    return () => controller.abort()
  }, [optionsKey, reload])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(hasQuery)
    setLoadProgress("")
    setError(null)
    setData(null)
    if (!hasQuery) return () => controller.abort()
    const run = async () => {
      try {
        const body = await fetchProfilesReport(query, controller.signal, (loaded, total) => {
          if (!controller.signal.aborted) setLoadProgress(`${loaded.toLocaleString()} of ${total.toLocaleString()} rows`)
        })
        if (!controller.signal.aborted) setData(body)
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Profile report unavailable")
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    run()
    return () => controller.abort()
  }, [query, reload, hasQuery])

  useEffect(() => { setDeviceSearch(searchValue) }, [searchValue])
  useEffect(() => {
    if (deviceSearch === searchValue) return
    const timer = setTimeout(() => router.replace(`/management?${profilesUrlQuery(current, kind, { search: deviceSearch })}`, { scroll: false }), 250)
    return () => clearTimeout(timer)
  }, [deviceSearch, searchValue, current, kind, router])

  const update = (patch: Record<string, string | null>) => {
    const next = profilesUrlQuery(current, kind, patch)
    if (listParam(new URLSearchParams(next), "identifiers").length === 0) setExpanded(true)
    startTransition(() => router.push(`/management?${next}`, { scroll: false }))
  }
  const toggle = (key: string, value: string) => {
    const selected = listParam(params, key)
    update({ [key]: (selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value]).join(",") })
  }
  const choose = (values: string[]) => {
    const limited = values.slice(0, MAX_SELECTIONS)
    if (values.length > MAX_SELECTIONS) setError(`Select at most ${MAX_SELECTIONS} ${noun}; the first ${MAX_SELECTIONS} were kept.`)
    update({ identifiers: limited.length ? JSON.stringify(limited) : null, preferenceKey: null })
  }
  const toggleIdentifier = (value: string) => choose(identifiers.includes(value) ? identifiers.filter(v => v !== value) : [...identifiers, value])
  const clearAll = () => {
    setDeviceSearch("")
    update(Object.fromEntries([...PROFILE_PARAMS, ...PROFILE_VIEW_PARAMS].map(key => [key, null])))
  }
  const sortColumn = (column: ProfileColumn) => update({ sort: column, direction: view.sort === column && view.direction === "asc" ? "desc" : "asc" })
  const shareUrl = () => {
    const url = new URL(window.location.href)
    url.searchParams.set("platform", platformParam(platformFilter))
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
      const blob = new Blob(["﻿", profilesCsv(rows, kind, data.generatedAt, shareUrl().toString())], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${kind === "preference" ? "managed-preferences" : "configuration-profiles"}-report-${new Date().toISOString().slice(0, 10)}.csv`
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
  const activeCount = identifiers.length + listParam(params, "states").length + listParam(params, "inventoryStates").length +
    (preferenceKey ? 1 : 0) + (params.has("freshness") ? 1 : 0) + (params.has("maxAgeHours") ? 1 : 0) + (includeArchived ? 1 : 0)

  return (
    <div className="h-[calc(100vh-4rem)] bg-gray-50 dark:bg-black flex flex-col overflow-hidden">
      <div className="flex-1 page-container px-4 sm:px-6 lg:px-8 py-8 flex flex-col min-h-0">
        <div className="flex-1 bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col min-h-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-3"><ManagementShieldIcon /><ManagementViewSwitch current={kind === "preference" ? "preferences" : "profiles"} /></div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{kind === "preference"
                ? "macOS managed preference domains across devices, with the value of a chosen key."
                : "Configuration profiles on macOS and policy profiles on Windows across devices."}</p>
            </div>
            <div className="flex flex-wrap items-start gap-3">
              <button type="button" onClick={copyLink} disabled={pending} title="Copy a shareable link to this exact report" className={copied ? `${actionButton} bg-emerald-600 hover:bg-emerald-700 text-white` : secondaryAction}>
                {copied ? "Link Copied" : "Copy Link"}
              </button>
              <button type="button" onClick={() => setReload(n => n + 1)} disabled={loading || pending} className={secondaryAction}>Refresh</button>
              {!loading && data && rows.length > 0 && <button type="button" onClick={exportCsv} disabled={pending} title="Export every field for the filtered rows" className={`${actionButton} bg-emerald-600 hover:bg-emerald-700 text-white`}>Export CSV</button>}
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
                <ServiceSelectionCloud label={kind === "preference" ? "Preference domains" : "Profiles"}
                  options={visibleOptions.map(o => ({ value: o.identifier, label: o.name, devices: o.devices }))}
                  selected={identifiers} onToggle={toggleIdentifier} onSelect={choose} loading={optionsLoading} />
                {kind === "preference" && identifiers.length > 0 && <Choices label="Preference key">
                  <Choice disabled={pending} active={!preferenceKey} onClick={() => update({ preferenceKey: null })}>None</Choice>
                  {availableKeys.slice(0, 200).map(key => <Choice disabled={pending} key={key} active={preferenceKey.toLowerCase() === key.toLowerCase()} onClick={() => update({ preferenceKey: key })}>{key}</Choice>)}
                </Choices>}
                <div className="flex flex-wrap gap-x-8 gap-y-4">
                  <Choices label="Management collection age">{([["all", "All"], ["fresh", "Within maximum age"], ["stale", "Older"], ["unknown", "Unknown"]] as const).map(([value, label]) => <Choice disabled={pending} key={value} active={freshness === value} onClick={() => update({ freshness: value === "all" ? null : value })}>{label}</Choice>)}</Choices>
                  <Choices label="Maximum collection age">{[...new Set(["24", "168", "720", age])].map(value => <Choice disabled={pending} key={value} active={age === value} onClick={() => update({ maxAgeHours: value === "24" ? null : value })}>{value === "24" ? "24 hours" : value === "168" ? "7 days" : value === "720" ? "30 days" : `${value} hours`}</Choice>)}</Choices>
                  <Choices label="Inventory state"><Choice disabled={pending} active={!params.get("inventoryStates")} onClick={() => update({ inventoryStates: null })}>All</Choice>{options.inventoryStates.map(value => <Choice disabled={pending} key={value} active={listParam(params, "inventoryStates").includes(value)} onClick={() => toggle("inventoryStates", value)}>{inventoryLabel(value)}</Choice>)}</Choices>
                  <Choices label="Archive"><Choice disabled={pending} active={includeArchived} onClick={() => update({ includeArchived: includeArchived ? null : "true" })}>Include archived</Choice></Choices>
                </div>
              </div>
            </DeviceFilters>
            {identifiers.length > 0 && <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center gap-2">
              {identifiers.map(id => <button type="button" key={id} onClick={() => toggleIdentifier(id)} title={`Remove ${id}`} className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800">{labelFor(id)}<span aria-hidden="true">×</span></button>)}
              {preferenceKey && <button type="button" onClick={() => update({ preferenceKey: null })} className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800">Key: {preferenceKey}<span aria-hidden="true">×</span></button>}
              <button type="button" onClick={clearAll} className="text-xs text-red-600 dark:text-red-400 hover:underline ml-2">Clear selections</button>
            </div>}
            {(error || optionsError) && <div role="alert" className="mx-6 my-4 p-3 text-sm text-red-800 dark:text-red-200 bg-red-50 dark:bg-red-900/20 rounded-lg">{error || optionsError}<button type="button" className="underline ml-2" onClick={() => setReload(n => n + 1)}>Retry</button></div>}
            {hasQuery && <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3"><span className="text-sm text-gray-600 dark:text-gray-400">{loading ? "Updating report…" : data ? `${rows.length.toLocaleString()} rows` : ""}</span><input type="search" aria-label="Search devices" placeholder="Search devices…" value={deviceSearch} onChange={e => setDeviceSearch(e.target.value)} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm text-gray-900 dark:text-white" /></div>
              <div className="flex flex-wrap gap-2" aria-label="Profile state filters"><Choice disabled={pending} active={!params.get("states")} onClick={() => update({ states: null })}>All states</Choice>{PROFILE_STATES.map(state => <Choice disabled={pending} key={state} active={listParam(params, "states").includes(state)} onClick={() => toggle("states", state)}>{stateLabel(state)}{data ? ` ${data.summary[state] || 0}` : ""}</Choice>)}</div>
            </div>}
            {!hasQuery ? <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"><p className="font-medium">Choose {noun} from Selections to build your report.</p><p className="text-sm mt-2">Pick collected {noun} to see which devices have them, which lack them, and which are unknown.</p></div>
              : loading ? <div role="status" className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">Loading report…{loadProgress && ` ${loadProgress}`}</div>
              : data && <ProfilesTable rows={rows} kind={kind} view={view} onSort={sortColumn} pending={pending} />}
          </div>
          <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">Last collected management state. Not installed is shown only when the device reported a management inventory within the maximum age; otherwise the row is unknown. A selection is evaluated only on platforms that report it.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

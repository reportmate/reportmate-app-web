"use client"

/**
 * Fleet Management Tools Logs report, the Logs tab of /management (?tab=logs)
 * (docs/DASHBOARD-WIDGETS.md, revision 6): per tool, common messages and
 * devices with error and warning lines over a 24-hour or 7-day window. Every
 * filter lives in the URL (URL_STATE_CONVENTIONS.md); `platform` belongs to
 * the global toggle.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { usePlatformFilterSafe } from "../../providers/PlatformFilterProvider"
import { cachedAt, peekCached, rememberCached, trackedFetch } from "../../lib/data-cache"
import { RefreshErrorBanner } from "../ui/RefreshErrorBanner"
import { SkeletonTimeout } from "../ui/SkeletonTimeout"
import { CopyButton } from "../ui/CopyButton"
import { formatExactTime, formatRelativeTime } from "../../lib/time"
import { fmtCount } from "../../lib/dashboard/format"
import { toolProductLabel } from "../../lib/dashboard/reportRules"
import {
  DEFAULT_TOOL_LOG_WINDOW,
  EMPTY_TOOL_LOG_FILTERS,
  TOOL_LOGS_API,
  commaQuery,
  deviceLogHref,
  filterToolLogs,
  isMessageId,
  matchMessage,
  parseToolLogsParams,
  parseToolLogsReport,
  reportError,
  toolLogsApiQuery,
  toolLogsDevicesCsv,
  trendBuckets,
  writeToolLogsParams,
  type ToolLogWindow,
  type ToolLogsFilters,
  type ToolLogsReport as Report,
  type ToolLogsTool,
} from "../../lib/management/toolLogs"
import { ManagementShieldIcon, ManagementViewSwitch } from "./ManagementViewSwitch"

export const NOT_DEPLOYED = "Not available on this server yet"

// MARK: - Sorting

type Dir = "asc" | "desc"
type SortValue = string | number

function useSort<K extends string>(initial: K, initialDir: Dir = "desc") {
  const [column, setColumn] = useState<K>(initial)
  const [dir, setDir] = useState<Dir>(initialDir)
  const toggle = (c: K, firstDir: Dir = "desc") => {
    if (c === column) setDir(d => (d === "asc" ? "desc" : "asc"))
    else {
      setColumn(c)
      setDir(firstDir)
    }
  }
  return { column, dir, toggle }
}

function sortRows<T>(rows: T[], value: (row: T) => SortValue, dir: Dir): T[] {
  const sign = dir === "asc" ? 1 : -1
  return [...rows].sort((a, b) => {
    const x = value(a), y = value(b)
    const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y))
    return c * sign
  })
}

const timeValue = (iso: string | null) => (iso ? Date.parse(iso) || 0 : 0)

function SortHeader<K extends string>({
  label, column, sort, firstDir = "desc", align = "left", className = "",
}: {
  label: string
  column: K
  sort: { column: K; dir: Dir; toggle: (c: K, firstDir?: Dir) => void }
  firstDir?: Dir
  align?: "left" | "right"
  className?: string
}) {
  const active = sort.column === column
  return (
    <th
      scope="col"
      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
      className={`px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700 ${align === "right" ? "text-right" : "text-left"} ${className}`}
    >
      <button
        type="button"
        onClick={() => sort.toggle(column, firstDir)}
        className={`inline-flex items-center gap-1 uppercase tracking-wider hover:text-gray-900 dark:hover:text-white select-none ${align === "right" ? "flex-row-reverse" : ""}`}
      >
        {label}
        {active && (
          <svg className={`w-3 h-3 ${sort.dir === "asc" ? "rotate-180" : ""}`} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        )}
      </button>
    </th>
  )
}

// MARK: - Pieces

function When({ iso }: { iso: string | null }) {
  if (!iso) return <span className="text-gray-400">—</span>
  return <span title={formatExactTime(iso)}>{formatRelativeTime(iso)}</span>
}

const PLATFORM_LABEL = (p: string | null) => (p === "macOS" ? "macOS" : p === "Windows" ? "Windows" : "Both")

/** Errors (red) and warnings (amber) per bucket across the window. */
export function Sparkline({ tool, windowHours, end }: { tool: ToolLogsTool; windowHours: number; end: number }) {
  const buckets = trendBuckets(tool.trend, windowHours, end)
  const max = Math.max(1, ...buckets.map(b => Math.max(b.errors, b.warnings)))
  const w = 96, h = 24
  const x = (i: number) => (buckets.length === 1 ? w / 2 : (i * w) / (buckets.length - 1))
  const y = (v: number) => h - 2 - (v / max) * (h - 4)
  const line = (key: "errors" | "warnings") => buckets.map((b, i) => `${x(i).toFixed(1)},${y(b[key]).toFixed(1)}`).join(" ")
  const total = buckets.reduce((s, b) => s + b.errors + b.warnings, 0)
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label={`${tool.name} trend: ${total} lines over the window`}
      data-testid="tool-trend"
    >
      <polyline points={line("warnings")} fill="none" strokeWidth={1.5} className="stroke-amber-500 dark:stroke-amber-400" />
      <polyline points={line("errors")} fill="none" strokeWidth={1.5} className="stroke-red-500 dark:stroke-red-400" />
    </svg>
  )
}

function Segmented<T extends string | number>({
  label, value, options, onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden text-sm">
      {options.map(o => (
        <button
          key={String(o.value)}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 transition-colors ${
            o.value === value
              ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
              : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Section({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
      <div className="px-6 py-3 bg-white dark:bg-gray-800">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
        {subtitle && <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </section>
  )
}

const Empty = ({ cols, text }: { cols: number; text: string }) => (
  <tr>
    <td colSpan={cols} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">{text}</td>
  </tr>
)

function TableSkeleton() {
  return (
    <div className="animate-pulse" data-testid="tool-logs-skeleton">
      {[0, 1, 2].map(s => (
        <div key={s} className="border-b border-gray-200 dark:border-gray-700">
          <div className="px-6 py-3"><div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded" /></div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {[0, 1, 2, 3].map(r => (
              <div key={r} className="px-6 py-3 flex gap-8">
                <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

const td = "px-3 py-2 text-sm text-gray-900 dark:text-white"
const tdNum = `${td} text-right tabular-nums`

// MARK: - Report

export function ToolLogsReport() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const { platformFilter } = usePlatformFilterSafe()

  const [filters, setFilters] = useState<ToolLogsFilters>(() =>
    parseToolLogsParams(new URLSearchParams(searchParams.toString())),
  )
  const query = toolLogsApiQuery(filters, platformFilter)
  const cacheKey = `${TOOL_LOGS_API}?${query}`

  const [data, setData] = useState<Report | null>(() => peekCached<Report>(cacheKey) ?? null)
  const dataRef = useRef(data)
  dataRef.current = data
  const [error, setError] = useState<string | null>(null)
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  // URL → state when the URL changes to something this page did not write;
  // state → URL with router.replace, defaults omitted, other params kept.
  const lastUrlRef = useRef(commaQuery(searchParams.toString()))
  useEffect(() => {
    const current = commaQuery(searchParams.toString())
    if (current === lastUrlRef.current) return
    lastUrlRef.current = current
    setFilters(parseToolLogsParams(new URLSearchParams(current)))
  }, [searchParams])

  useEffect(() => {
    const currentQs = commaQuery(window.location.search.replace(/^\?/, ""))
    const next = writeToolLogsParams(currentQs, filters)
    if (next === currentQs) return
    lastUrlRef.current = next
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false })
  }, [filters, pathname, router])

  useEffect(() => {
    let cancelled = false
    const cached = peekCached<Report>(cacheKey)
    if (cached) setData(cached)
    setError(null)
    const run = async () => {
      try {
        const response = await trackedFetch(
          cacheKey,
          { cache: "no-store", credentials: "include", headers: { "Cache-Control": "no-cache" } },
          { background: !!(cached || dataRef.current) },
        )
        if (!response.ok) {
          throw new Error(response.status === 404 ? NOT_DEPLOYED : `Tool logs API failed: ${response.status}`)
        }
        const body = await response.json()
        const failed = reportError(body)
        if (failed) throw new Error(failed)
        const report = parseToolLogsReport(body)
        if (cancelled) return
        setData(rememberCached(cacheKey, report))
        setRefreshError(null)
      } catch (err) {
        if (cancelled) return
        const message = err instanceof Error ? err.message : String(err)
        // Keep the last rows on screen when a refresh fails.
        if (cached || dataRef.current) setRefreshError(message)
        else setError(message)
      } finally {
        if (!cancelled) setRetrying(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [cacheKey, reloadKey])

  const retry = () => {
    setRetrying(true)
    setError(null)
    setReloadKey(k => k + 1)
  }

  const view = useMemo(() => (data ? filterToolLogs(data, filters, platformFilter) : null), [data, filters, platformFilter])
  const selectedMessage = data && filters.message ? matchMessage(data.messages, filters.message, filters.tools) : undefined

  // A message named by its text (older links) becomes its id once the report
  // knows it, so the API narrows the devices to it.
  const textMessageId = filters.message && !isMessageId(filters.message) && selectedMessage && isMessageId(selectedMessage.id)
    ? selectedMessage.id
    : null
  useEffect(() => {
    if (textMessageId) setFilters(f => ({ ...f, message: textMessageId }))
  }, [textMessageId])
  const windowHours = filters.hours
  const end = data?.generatedAt ? Date.parse(data.generatedAt) || Date.now() : Date.now()

  const toolSort = useSort<"name" | "platform" | "devErr" | "devWarn" | "errLines" | "warnLines" | "last">("devErr")
  const msgSort = useSort<"message" | "tool" | "devices" | "lines" | "last">("devices")
  const devSort = useSort<"device" | "tool" | "errors" | "warnings" | "last">("errors")

  const tools = view
    ? sortRows(view.tools, t => {
        switch (toolSort.column) {
          case "name": return t.name.toLowerCase()
          case "platform": return PLATFORM_LABEL(t.platform)
          case "devErr": return t.devicesWithErrors
          case "devWarn": return t.devicesWithWarnings
          case "errLines": return t.errorLines
          case "warnLines": return t.warningLines
          case "last": return timeValue(t.lastSeen)
        }
      }, toolSort.dir)
    : []
  const messages = view
    ? sortRows(view.messages, m => {
        switch (msgSort.column) {
          case "message": return m.message.toLowerCase()
          case "tool": return m.name.toLowerCase()
          case "devices": return m.devices
          case "lines": return m.lines
          case "last": return timeValue(m.lastSeen)
        }
      }, msgSort.dir)
    : []
  const devices = view
    ? sortRows(view.devices, d => {
        switch (devSort.column) {
          case "device": return d.deviceName.toLowerCase()
          case "tool": return d.name.toLowerCase()
          case "errors": return d.errors
          case "warnings": return d.warnings
          case "last": return timeValue(d.lastAt)
        }
      }, devSort.dir)
    : []

  const update = (patch: Partial<ToolLogsFilters>) => setFilters(f => ({ ...f, ...patch }))
  const toggleTool = (tool: string) =>
    setFilters(f => ({ ...f, tools: f.tools.length === 1 && f.tools[0] === tool ? [] : [tool], message: "" }))
  const selectMessage = (id: string, tool: string) =>
    setFilters(f => (f.message === id ? { ...f, message: "" } : { ...f, message: id, tools: [tool] }))

  const toolLabel = (tool: string) => {
    const p = platformFilter === "macOS" || platformFilter === "Windows" ? platformFilter : null
    return toolProductLabel(tool, p)
  }
  const pills = [
    ...filters.tools.map(t => ({
      key: `tool=${t}`,
      label: `Tool: ${toolLabel(t)}`,
      clear: () => update({ tools: filters.tools.filter(x => x !== t), message: "" }),
    })),
    ...(filters.level ? [{ key: "level", label: filters.level === "error" ? "Errors only" : "Warnings only", clear: () => update({ level: null }) }] : []),
    ...(filters.hours !== DEFAULT_TOOL_LOG_WINDOW ? [{ key: "hours", label: "Last 7 days", clear: () => update({ hours: DEFAULT_TOOL_LOG_WINDOW }) }] : []),
    ...(filters.message ? [{ key: "message", label: `Message: ${selectedMessage?.message ?? filters.message}`, clear: () => update({ message: "" }) }] : []),
  ]

  const exportCsv = () => {
    const blob = new Blob([toolLogsDevicesCsv(devices)], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `management-tools-logs-${new Date().toISOString().split("T")[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const windowLabel = windowHours === 168 ? "7 days" : "24 hours"

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-black">
      <div className="page-container px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          {/* Title */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <ManagementShieldIcon />
                  <ManagementViewSwitch current="logs" />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Error and warning lines from the management tools over the last {windowLabel}
                  {view ? ` · ${fmtCount(view.devices.length)} devices` : ""}. The MDM agent is not included.
                </p>
                <RefreshErrorBanner
                  error={refreshError}
                  updatedAt={cachedAt(cacheKey) || null}
                  retrying={retrying}
                  onRetry={retry}
                  className="mt-2 w-fit"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Segmented<ToolLogWindow>
                  label="Window"
                  value={filters.hours}
                  options={[{ value: 24, label: "24h" }, { value: 168, label: "7d" }]}
                  onChange={hours => update({ hours })}
                />
                <Segmented<"all" | "error" | "warning">
                  label="Level"
                  value={filters.level ?? "all"}
                  options={[{ value: "all", label: "All" }, { value: "error", label: "Errors" }, { value: "warning", label: "Warnings" }]}
                  onChange={v => update({ level: v === "all" ? null : v })}
                />
                <button
                  type="button"
                  onClick={exportCsv}
                  disabled={!view}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                  title="Export the devices below to CSV"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export to CSV
                </button>
              </div>
            </div>
          </div>

          {/* Filters Active */}
          {pills.length > 0 && (
            <div className="px-6 py-3 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 flex items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2 text-sm text-yellow-800 dark:text-yellow-200 min-w-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="font-medium">Filters Active</span>
                {view && data && (
                  <span className="text-yellow-700 dark:text-yellow-300">
                    Showing {view.devices.length} of {data.devices.length} devices
                  </span>
                )}
                {pills.map(pill => (
                  <span key={pill.key} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-800/40 text-yellow-800 dark:text-yellow-200 border border-yellow-300 dark:border-yellow-700 max-w-xs">
                    <span className="truncate" title={pill.label}>{pill.label}</span>
                    <button
                      type="button"
                      onClick={pill.clear}
                      className="hover:text-yellow-950 dark:hover:text-white"
                      aria-label={`Remove filter ${pill.label}`}
                      title="Remove filter"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setFilters(EMPTY_TOOL_LOG_FILTERS)}
                className="px-3 py-1.5 text-sm rounded-lg bg-yellow-600 hover:bg-yellow-700 text-white transition-colors flex items-center gap-2 font-medium flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear all
              </button>
            </div>
          )}

          {!view ? (
            <SkeletonTimeout error={error} onRetry={retry}>
              <TableSkeleton />
            </SkeletonTimeout>
          ) : (
            <>
              <Section title="Per tool" subtitle="Click a tool to filter the messages and devices to it.">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <SortHeader label="Tool" column="name" sort={toolSort} firstDir="asc" />
                      <SortHeader label="Platform" column="platform" sort={toolSort} firstDir="asc" />
                      <SortHeader label="Devices w/ errors" column="devErr" sort={toolSort} align="right" />
                      <SortHeader label="Devices w/ warnings" column="devWarn" sort={toolSort} align="right" />
                      <SortHeader label="Error lines" column="errLines" sort={toolSort} align="right" />
                      <SortHeader label="Warning lines" column="warnLines" sort={toolSort} align="right" />
                      <SortHeader label="Last seen" column="last" sort={toolSort} />
                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700">Trend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {tools.length === 0 ? (
                      <Empty cols={8} text="No management tool logged errors or warnings in this window." />
                    ) : (
                      tools.map(t => {
                        const selected = filters.tools.includes(t.tool)
                        return (
                          <tr
                            key={`${t.tool}:${t.platform ?? ""}`}
                            onClick={() => toggleTool(t.tool)}
                            className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 ${selected ? "bg-yellow-50/60 dark:bg-yellow-900/10" : ""}`}
                          >
                            <td className={td}>
                              <button type="button" className="font-medium text-left hover:underline" aria-pressed={selected} onClick={e => { e.stopPropagation(); toggleTool(t.tool) }}>
                                {t.name}
                              </button>
                              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 font-mono">{t.tool}</span>
                            </td>
                            <td className={td}>{PLATFORM_LABEL(t.platform)}</td>
                            <td className={tdNum}>{fmtCount(t.devicesWithErrors)}</td>
                            <td className={tdNum}>{fmtCount(t.devicesWithWarnings)}</td>
                            <td className={`${tdNum} ${t.errorLines ? "text-red-700 dark:text-red-400" : ""}`}>{fmtCount(t.errorLines)}</td>
                            <td className={`${tdNum} ${t.warningLines ? "text-amber-700 dark:text-amber-400" : ""}`}>{fmtCount(t.warningLines)}</td>
                            <td className={td}><When iso={t.lastSeen} /></td>
                            <td className={td}><Sparkline tool={t} windowHours={windowHours} end={end} /></td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </Section>

              <Section title="Common error messages" subtitle="The same message on many devices counts once. Click one to list the devices that logged it.">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <SortHeader label="Message" column="message" sort={msgSort} firstDir="asc" className="w-1/2" />
                      <SortHeader label="Tool" column="tool" sort={msgSort} firstDir="asc" />
                      <SortHeader label="Devices" column="devices" sort={msgSort} align="right" />
                      <SortHeader label="Lines" column="lines" sort={msgSort} align="right" />
                      <SortHeader label="Last seen" column="last" sort={msgSort} />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {messages.length === 0 ? (
                      <Empty cols={5} text={filters.message ? "No message in this window matches the filter." : "No messages in this window."} />
                    ) : (
                      messages.map(m => {
                        const selected = !!selectedMessage && selectedMessage.id === m.id
                        return (
                          <tr key={`${m.tool}:${m.platform ?? ""}:${m.level}:${m.id}`} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${selected ? "bg-yellow-50/60 dark:bg-yellow-900/10" : ""}`}>
                            <td className={`${td} max-w-xl`}>
                              <button
                                type="button"
                                onClick={() => selectMessage(m.id, m.tool)}
                                aria-pressed={selected}
                                title={m.sample || m.message}
                                className="flex items-start gap-2 text-left w-full hover:underline"
                              >
                                <span className={`mt-1 inline-block w-2 h-2 rounded-full flex-shrink-0 ${m.level === "error" ? "bg-red-500" : "bg-amber-500"}`} aria-label={m.level} />
                                <span className="font-mono text-xs break-words">{m.message}</span>
                              </button>
                            </td>
                            <td className={td}>{m.name}</td>
                            <td className={tdNum}>{fmtCount(m.devices)}</td>
                            <td className={tdNum}>{fmtCount(m.lines)}</td>
                            <td className={td}><When iso={m.lastSeen} /></td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </Section>

              <Section
                title={filters.message ? "Devices that logged this message" : "Devices"}
                subtitle={
                  <>
                    {filters.message ? <span className="font-mono">{selectedMessage?.message ?? filters.message}</span> : "Each row opens the device's Management tab on this tool's log lines."}
                    {view.devicesTruncated && (
                      <span className="block mt-1 text-amber-700 dark:text-amber-300" data-testid="devices-truncated">
                        Showing the first {fmtCount(data?.devices.length ?? view.devices.length)} devices. Narrow by tool, level or message to see the rest.
                      </span>
                    )}
                  </>
                }
              >
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <SortHeader label="Device" column="device" sort={devSort} firstDir="asc" />
                      <SortHeader label="Tool" column="tool" sort={devSort} firstDir="asc" />
                      <SortHeader label="Errors" column="errors" sort={devSort} align="right" />
                      <SortHeader label="Warnings" column="warnings" sort={devSort} align="right" />
                      <SortHeader label="Last at" column="last" sort={devSort} />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {devices.length === 0 ? (
                      <Empty cols={5} text="No devices match these filters." />
                    ) : (
                      devices.map(d => {
                        const href = deviceLogHref(d, filters.level)
                        return (
                          <tr key={`${d.serialNumber}:${d.tool}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className={`${td} max-w-64`}>
                              <Link href={href} className="group block min-w-0" title={d.deviceName}>
                                <div className="font-medium truncate group-hover:text-gray-700 dark:group-hover:text-gray-200">{d.deviceName}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 font-mono inline-flex items-center gap-0.5">
                                  {d.serialNumber}
                                  <CopyButton value={d.serialNumber} size="sm" />
                                </div>
                              </Link>
                            </td>
                            <td className={td}><Link href={href} className="hover:underline">{d.name}</Link></td>
                            <td className={`${tdNum} ${d.errors ? "text-red-700 dark:text-red-400" : ""}`}>{fmtCount(d.errors)}</td>
                            <td className={`${tdNum} ${d.warnings ? "text-amber-700 dark:text-amber-400" : ""}`}>{fmtCount(d.warnings)}</td>
                            <td className={td}><When iso={d.lastAt} /></td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </Section>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

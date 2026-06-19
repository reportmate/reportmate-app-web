"use client"

export const dynamic = 'force-dynamic'

import React, { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import { formatRelativeTime } from "@/src/lib/time"
import { CollapsibleSection } from "@/src/components/ui/CollapsibleSection"

interface DeviceRow {
  serialNumber: string
  deviceName: string
  usage: string | null
  catalog: string | null
  location: string | null
  room: string | null
  department: string | null
  area: string | null
  fleet: string | null
  assetTag: string | null
  totalSeconds: number
  totalHours: number
  launchCount: number
  userCount: number
  users: string[]
  appVariants: string[]
  appVariantCount: number
  firstUsed: string | null
  lastUsed: string | null
}

interface ApiResponse {
  status: string
  appPattern: string
  days: number
  devices: DeviceRow[]
  summary: {
    deviceCount: number
    totalUsageHours: number
    totalLaunches: number
    uniqueUsers: number
  }
  filters: {
    usages: string[]
    catalogs: string[]
    locations: string[]
  }
  lastUpdated: string
}

type SortColumn = 'deviceName' | 'location' | 'usage' | 'catalog' | 'area' | 'totalHours' | 'launchCount' | 'userCount' | 'lastUsed'

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0m'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export default function ApplicationUsageByDevicePage() {
  const params = useParams<{ appName: string }>()
  const searchParams = useSearchParams()
  const appName = decodeURIComponent(params.appName)

  // Back link honors ?from= if supplied (drill-down convention); otherwise
  // returns to the bare Applications page.
  const fromParam = searchParams.get('from')
  const backHref = fromParam || '/applications'
  const backLabel = fromParam ? '← Back to Report' : '← Applications'

  const [days, setDays] = useState<number>(parseInt(searchParams.get('days') || '30', 10))
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [sortColumn, setSortColumn] = useState<SortColumn>('totalHours')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [linkCopied, setLinkCopied] = useState(false)
  const [widgetsExpanded, setWidgetsExpanded] = useState(true)
  const [metric, setMetric] = useState<'hours' | 'launches'>('launches')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const qs = new URLSearchParams({ app: appName, days: String(days) })
        const usages = searchParams.get('usages')
        const catalogs = searchParams.get('catalogs')
        const locations = searchParams.get('locations')
        if (usages) qs.set('usages', usages)
        if (catalogs) qs.set('catalogs', catalogs)
        if (locations) qs.set('locations', locations)

        const res = await fetch(`/api/v1/applications/usage/by-device?${qs.toString()}`, {
          cache: 'no-store',
        })
        if (!res.ok) {
          throw new Error(`Request failed: ${res.status}`)
        }
        const json = (await res.json()) as ApiResponse
        if (!cancelled) setData(json)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [appName, days, searchParams])

  // Aggregates for the Widgets section. Computed from the per-device rows we
  // already have so this stays a single-request page.
  const aggregates = useMemo(() => {
    const devices = data?.devices ?? []
    const valueOf = (d: DeviceRow) => metric === 'hours' ? d.totalHours : d.launchCount
    const grandTotal = devices.reduce((s, d) => s + valueOf(d), 0) || 1

    const isUnknown = (k: string | null | undefined) => {
      if (!k) return true
      const v = k.trim().toLowerCase()
      return v === '' || v === 'unknown' || v === 'null' || v === 'n/a'
    }

    const sumBy = (keyFn: (d: DeviceRow) => string | null): Array<[string, number]> => {
      const m = new Map<string, number>()
      for (const d of devices) {
        const raw = keyFn(d)
        if (isUnknown(raw)) continue
        const k = raw as string
        m.set(k, (m.get(k) ?? 0) + valueOf(d))
      }
      return [...m.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
    }

    const byLocation = sumBy(d => d.location).slice(0, 10)
    const byCatalog = sumBy(d => d.catalog)
    const byUsage = sumBy(d => d.usage)
    const byArea = sumBy(d => d.area || d.department).slice(0, 10)
    const byFleet = sumBy(d => d.fleet)

    // Distribution: histogram bins (units depend on metric)
    const binDefs = metric === 'hours'
      ? [
          { label: '0–10h', min: 0, max: 10 },
          { label: '10–50h', min: 10, max: 50 },
          { label: '50–100h', min: 50, max: 100 },
          { label: '100–250h', min: 100, max: 250 },
          { label: '250h+', min: 250, max: Infinity },
        ]
      : [
          { label: '0–10', min: 0, max: 10 },
          { label: '10–50', min: 10, max: 50 },
          { label: '50–250', min: 50, max: 250 },
          { label: '250–1000', min: 250, max: 1000 },
          { label: '1000+', min: 1000, max: Infinity },
        ]
    const bins = binDefs.map(b => ({ ...b, count: 0 }))
    for (const d of devices) {
      const v = valueOf(d)
      const bin = bins.find(b => v >= b.min && v < b.max)
      if (bin) bin.count += 1
    }

    return { grandTotal, byLocation, byCatalog, byUsage, byArea, byFleet, bins }
  }, [data, metric])

  const fmtVal = (v: number) => metric === 'hours' ? `${v.toFixed(0)}h` : v.toLocaleString()
  const metricLabel = metric === 'hours' ? 'Hours' : 'Launches'

  const palette = ['#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#ec4899', '#06b6d4', '#84cc16', '#ef4444']

  const sortedDevices = useMemo(() => {
    if (!data?.devices) return []
    const rows = [...data.devices]
    rows.sort((a, b) => {
      let cmp = 0
      switch (sortColumn) {
        case 'deviceName':
          cmp = (a.deviceName || '').localeCompare(b.deviceName || '')
          break
        case 'location':
          cmp = (a.location || '').localeCompare(b.location || '')
          break
        case 'usage':
          cmp = (a.usage || '').localeCompare(b.usage || '')
          break
        case 'catalog':
          cmp = (a.catalog || '').localeCompare(b.catalog || '')
          break
        case 'area':
          cmp = ((a.area || a.department || '')).localeCompare(b.area || b.department || '')
          break
        case 'totalHours':
          cmp = a.totalHours - b.totalHours
          break
        case 'launchCount':
          cmp = a.launchCount - b.launchCount
          break
        case 'userCount':
          cmp = a.userCount - b.userCount
          break
        case 'lastUsed':
          cmp = (a.lastUsed || '').localeCompare(b.lastUsed || '')
          break
      }
      return sortDirection === 'asc' ? cmp : -cmp
    })
    return rows
  }, [data, sortColumn, sortDirection])

  const toggleSort = (col: SortColumn) => {
    if (sortColumn === col) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(col)
      setSortDirection(col === 'deviceName' || col === 'location' ? 'asc' : 'desc')
    }
  }

  const sortArrow = (col: SortColumn) =>
    sortColumn === col ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''

  const exportCSV = () => {
    if (!sortedDevices.length) return
    const header = ['Usage', 'Catalog', 'Area', 'Location', 'Device', 'Serial', 'Asset Tag', 'Hours', 'Launches', 'Users', 'Variants', 'First Used', 'Last Used']
    const rows = sortedDevices.map(d => [
      d.usage || '',
      d.catalog || '',
      d.area || d.department || '',
      d.location || '',
      d.deviceName,
      d.serialNumber,
      d.assetTag || '',
      d.totalHours.toFixed(2),
      d.launchCount,
      d.users.join('; '),
      d.appVariants.join('; '),
      d.firstUsed || '',
      d.lastUsed || '',
    ])
    const csv = [header, ...rows]
      .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const safeName = appName.replace(/[^a-zA-Z0-9]/g, '-')
    a.href = url
    a.download = `${safeName}-by-device-${days}d.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="h-[calc(100vh-4rem)] bg-gray-50 dark:bg-black flex flex-col overflow-hidden">
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-4 sm:pb-8 pt-4 sm:pt-8 flex flex-col min-h-0">
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col min-h-0 overflow-hidden">

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Link
                  href={backHref}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
                >
                  {backLabel}
                </Link>
                <span className="text-gray-400">/</span>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate" title={appName}>
                  {appName}
                </h2>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {data
                  ? `${data.summary.deviceCount} devices · ${data.summary.totalUsageHours.toLocaleString()} hours · ${data.summary.totalLaunches.toLocaleString()} launches · ${data.summary.uniqueUsers} unique users`
                  : 'Loading per-device usage...'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-600 dark:text-gray-400">Period:</label>
              <select
                value={days}
                onChange={(e) => setDays(parseInt(e.target.value, 10))}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={45}>Last 45 days</option>
                <option value={90}>Last 90 days</option>
                <option value={180}>Last 180 days</option>
                <option value={365}>Last year</option>
                <option value={548}>Last 18 months</option>
              </select>
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(window.location.href)
                    setLinkCopied(true)
                    setTimeout(() => setLinkCopied(false), 1500)
                  } catch (err) {
                    console.warn('Clipboard write failed:', err)
                  }
                }}
                title="Copy a shareable link to this exact view"
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors whitespace-nowrap ${
                  linkCopied
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white'
                }`}
              >
                {linkCopied ? 'Link Copied' : 'Copy Link'}
              </button>
              {sortedDevices.length > 0 && (
                <button
                  onClick={exportCSV}
                  className="px-3 py-1.5 text-sm text-white rounded-lg bg-green-600 hover:bg-green-700 transition-colors whitespace-nowrap"
                >
                  Export CSV
                </button>
              )}
            </div>
          </div>

          {/* Widgets accordion — global stats for this app across all devices */}
          {!loading && !error && data && data.devices.length > 0 && (
            <div className="border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setWidgetsExpanded(prev => !prev)}
                className="w-full flex items-center justify-between px-6 py-3 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Widgets</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Aggregate stats across {data.summary.deviceCount} {data.summary.deviceCount === 1 ? 'device' : 'devices'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => setMetric('launches')}
                      className={`px-3 py-1 ${metric === 'launches' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >
                      Launches
                    </button>
                    <button
                      onClick={() => setMetric('hours')}
                      className={`px-3 py-1 ${metric === 'hours' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >
                      Hours
                    </button>
                  </div>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${widgetsExpanded ? 'rotate-90' : 'rotate-180'}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
              <CollapsibleSection expanded={widgetsExpanded}>
                <div className="px-6 pb-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {/* Row 1: By Usage | By Catalog | Distribution */}

                  {/* By Usage Type */}
                  {aggregates.byUsage.length > 0 && (
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-gray-50/50 dark:bg-gray-900/30">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{metricLabel} by Usage Type</h3>
                      <div className="flex h-4 rounded overflow-hidden bg-gray-200 dark:bg-gray-700">
                        {aggregates.byUsage.map(([name, val], i) => (
                          <div
                            key={name}
                            style={{
                              width: `${(val / aggregates.grandTotal) * 100}%`,
                              backgroundColor: palette[i % palette.length],
                            }}
                            title={`${name}: ${fmtVal(val)}`}
                          />
                        ))}
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1">
                        {aggregates.byUsage.map(([name, val], i) => (
                          <div key={name} className="flex items-center gap-2 text-xs">
                            <span
                              className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
                              style={{ backgroundColor: palette[i % palette.length] }}
                            />
                            <span className="truncate text-gray-700 dark:text-gray-300" title={name}>{name}</span>
                            <span className="ml-auto tabular-nums text-gray-500">
                              {fmtVal(val)} ({((val / aggregates.grandTotal) * 100).toFixed(0)}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* By Catalog */}
                  {aggregates.byCatalog.length > 0 && (
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-gray-50/50 dark:bg-gray-900/30">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{metricLabel} by Catalog</h3>
                      <div className="flex h-4 rounded overflow-hidden bg-gray-200 dark:bg-gray-700">
                        {aggregates.byCatalog.map(([name, val], i) => (
                          <div
                            key={name}
                            style={{
                              width: `${(val / aggregates.grandTotal) * 100}%`,
                              backgroundColor: palette[i % palette.length],
                            }}
                            title={`${name}: ${fmtVal(val)}`}
                          />
                        ))}
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1">
                        {aggregates.byCatalog.map(([name, val], i) => (
                          <div key={name} className="flex items-center gap-2 text-xs">
                            <span
                              className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
                              style={{ backgroundColor: palette[i % palette.length] }}
                            />
                            <span className="truncate text-gray-700 dark:text-gray-300" title={name}>{name}</span>
                            <span className="ml-auto tabular-nums text-gray-500">
                              {fmtVal(val)} ({((val / aggregates.grandTotal) * 100).toFixed(0)}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Device Distribution (histogram by metric bucket) */}
                  {aggregates.bins.some(b => b.count > 0) && (
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-gray-50/50 dark:bg-gray-900/30">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                        Device {metricLabel} Distribution
                      </h3>
                      {(() => {
                        const max = Math.max(...aggregates.bins.map(b => b.count), 1)
                        return (
                          <div className="space-y-1.5">
                            {aggregates.bins.map(b => (
                              <div key={b.label} className="flex items-center gap-2 text-xs">
                                <div className="w-20 text-gray-700 dark:text-gray-300">{b.label}</div>
                                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded h-3 overflow-hidden">
                                  <div className="h-full bg-purple-500" style={{ width: `${(b.count / max) * 100}%` }} />
                                </div>
                                <div className="w-28 text-right tabular-nums whitespace-nowrap text-gray-700 dark:text-gray-300">
                                  {b.count.toLocaleString()} {b.count === 1 ? 'device' : 'devices'}
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      })()}
                    </div>
                  )}

                  {/* Row 2: By Fleet | By Area | By Location */}

                  {/* By Fleet */}
                  {aggregates.byFleet.length > 0 && (
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-gray-50/50 dark:bg-gray-900/30">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{metricLabel} by Fleet</h3>
                      <div className="flex h-4 rounded overflow-hidden bg-gray-200 dark:bg-gray-700">
                        {aggregates.byFleet.map(([name, val], i) => (
                          <div
                            key={name}
                            style={{
                              width: `${(val / aggregates.grandTotal) * 100}%`,
                              backgroundColor: palette[i % palette.length],
                            }}
                            title={`${name}: ${fmtVal(val)}`}
                          />
                        ))}
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1">
                        {aggregates.byFleet.map(([name, val], i) => (
                          <div key={name} className="flex items-center gap-2 text-xs">
                            <span
                              className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
                              style={{ backgroundColor: palette[i % palette.length] }}
                            />
                            <span className="truncate text-gray-700 dark:text-gray-300" title={name}>{name}</span>
                            <span className="ml-auto tabular-nums text-gray-500">
                              {fmtVal(val)} ({((val / aggregates.grandTotal) * 100).toFixed(0)}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* By Area (top 10) */}
                  {aggregates.byArea.length > 0 && (
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-gray-50/50 dark:bg-gray-900/30">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                        {metricLabel} by Area <span className="text-xs font-normal text-gray-500">(top 10)</span>
                      </h3>
                      {(() => {
                        const max = aggregates.byArea[0][1] || 1
                        return (
                          <div className="grid grid-cols-[minmax(0,max-content)_1fr_auto] gap-x-2 gap-y-1.5 items-center text-xs">
                            {aggregates.byArea.map(([name, val]) => (
                              <React.Fragment key={name}>
                                <div className="whitespace-nowrap text-gray-700 dark:text-gray-300" title={name}>{name}</div>
                                <div className="bg-gray-200 dark:bg-gray-700 rounded h-3 overflow-hidden">
                                  <div className="h-full bg-emerald-500" style={{ width: `${(val / max) * 100}%` }} />
                                </div>
                                <div className="text-right tabular-nums whitespace-nowrap text-gray-700 dark:text-gray-300">
                                  {fmtVal(val)}
                                </div>
                              </React.Fragment>
                            ))}
                          </div>
                        )
                      })()}
                    </div>
                  )}

                  {/* By Location (top 10) */}
                  {aggregates.byLocation.length > 0 && (
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-gray-50/50 dark:bg-gray-900/30">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                        {metricLabel} by Location <span className="text-xs font-normal text-gray-500">(top 10)</span>
                      </h3>
                      {(() => {
                        const max = aggregates.byLocation[0][1] || 1
                        return (
                          <div className="grid grid-cols-[minmax(0,max-content)_1fr_auto] gap-x-2 gap-y-1.5 items-center text-xs">
                            {aggregates.byLocation.map(([name, val]) => (
                              <React.Fragment key={name}>
                                <div className="whitespace-nowrap text-gray-700 dark:text-gray-300" title={name}>{name}</div>
                                <div className="bg-gray-200 dark:bg-gray-700 rounded h-3 overflow-hidden">
                                  <div className="h-full bg-blue-500" style={{ width: `${(val / max) * 100}%` }} />
                                </div>
                                <div className="text-right tabular-nums whitespace-nowrap text-gray-700 dark:text-gray-300">
                                  {fmtVal(val)}
                                </div>
                              </React.Fragment>
                            ))}
                          </div>
                        )
                      })()}
                    </div>
                  )}
                </div>
              </CollapsibleSection>
            </div>
          )}

          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-gray-500 dark:text-gray-400">
                Loading per-device usage for {appName}...
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-16 text-red-600 dark:text-red-400">
                {error}
              </div>
            ) : sortedDevices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400">
                <p className="font-medium">No usage data found</p>
                <p className="text-sm mt-1">No device has used {appName} in the last {days} days.</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
                  <tr>
                    <th
                      className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none"
                      onClick={() => toggleSort('usage')}
                    >
                      Usage{sortArrow('usage')}
                    </th>
                    <th
                      className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none"
                      onClick={() => toggleSort('catalog')}
                    >
                      Catalog{sortArrow('catalog')}
                    </th>
                    <th
                      className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none"
                      onClick={() => toggleSort('area')}
                    >
                      Area{sortArrow('area')}
                    </th>
                    <th
                      className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none"
                      onClick={() => toggleSort('location')}
                    >
                      Location{sortArrow('location')}
                    </th>
                    <th
                      className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none"
                      onClick={() => toggleSort('deviceName')}
                    >
                      Device{sortArrow('deviceName')}
                    </th>
                    <th
                      className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none"
                      onClick={() => toggleSort('totalHours')}
                    >
                      Total Time{sortArrow('totalHours')}
                    </th>
                    <th
                      className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none"
                      onClick={() => toggleSort('launchCount')}
                    >
                      Launches{sortArrow('launchCount')}
                    </th>
                    <th
                      className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none"
                      onClick={() => toggleSort('userCount')}
                    >
                      Users{sortArrow('userCount')}
                    </th>
                    <th
                      className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none"
                      onClick={() => toggleSort('lastUsed')}
                    >
                      Last Used{sortArrow('lastUsed')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {sortedDevices.map((d) => (
                    <tr key={d.serialNumber} className="hover:bg-blue-50 dark:hover:bg-blue-900/10">
                      <td className="px-4 lg:px-6 py-3 text-sm text-gray-900 dark:text-white">
                        {d.usage || '-'}
                      </td>
                      <td className="px-4 lg:px-6 py-3 text-sm text-gray-900 dark:text-white">
                        {d.catalog || '-'}
                      </td>
                      <td className="px-4 lg:px-6 py-3 text-sm text-gray-900 dark:text-white">
                        {d.area || d.department || '-'}
                      </td>
                      <td className="px-4 lg:px-6 py-3 text-sm text-gray-900 dark:text-white">
                        {d.location || '-'}
                      </td>
                      <td className="px-4 lg:px-6 py-3">
                        <Link
                          href={`/device/${encodeURIComponent(d.serialNumber)}`}
                          className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                          title={d.serialNumber}
                        >
                          {d.deviceName}
                        </Link>
                        {d.appVariantCount > 1 && (
                          <div className="text-xs text-gray-400 dark:text-gray-500" title={d.appVariants.join(', ')}>
                            {d.appVariantCount} variants
                          </div>
                        )}
                      </td>
                      <td className="px-4 lg:px-6 py-3">
                        <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                          {formatDuration(d.totalSeconds)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {d.totalHours.toFixed(1)} hours
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-3 text-sm text-gray-900 dark:text-white">
                        {d.launchCount.toLocaleString()}
                      </td>
                      <td className="px-4 lg:px-6 py-3 text-sm text-gray-900 dark:text-white" title={d.users.join(', ')}>
                        {d.userCount}
                      </td>
                      <td className="px-4 lg:px-6 py-3 text-sm text-gray-900 dark:text-white">
                        {d.lastUsed ? formatRelativeTime(d.lastUsed) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

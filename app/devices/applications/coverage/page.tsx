"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { formatRelativeTime } from "../../../../src/lib/time"

interface DarkDevice {
  serialNumber: string
  deviceName: string
  platform: string | null
  osName: string | null
  lastSeen: string | null
  usage: string | null
  catalog: string | null
  location: string | null
  lastUsageDate: string | null
  daysSinceUsage: number | null
  totalHoursEver: number
  rowCount: number
  bucket: 'dark' | 'never'
}

interface CollectionHealth {
  summary: {
    totalDevices: number
    healthy: number
    stale: number
    dark: number
    never: number
    freshDays: number
    staleDays: number
  }
  byPlatform: Record<string, { healthy: number; stale: number; dark: number; never: number; total: number }>
  darkDevices: DarkDevice[]
}

type SortColumn = 'bucket' | 'deviceName' | 'platform' | 'usage' | 'location' | 'lastSeen' | 'lastUsage' | 'daysDark'
type SortDir = 'asc' | 'desc'

export default function CoveragePage() {
  const searchParams = useSearchParams()
  const fromParam = searchParams.get('from')
  const backHref = fromParam || '/devices/applications?type=usage'

  const [data, setData] = useState<CollectionHealth | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'dark' | 'never'>('all')
  const [platformFilter, setPlatformFilter] = useState<string>('all')
  const [sortCol, setSortCol] = useState<SortColumn>('daysDark')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  useEffect(() => {
    let cancelled = false
    fetch('/api/devices/applications/collection-health?freshDays=7&staleDays=30')
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(d => {
        if (cancelled) return
        if (d.error) { setError(d.error); return }
        setData({ summary: d.summary, byPlatform: d.byPlatform || {}, darkDevices: d.darkDevices || [] })
      })
      .catch(e => !cancelled && setError(e.message))
    return () => { cancelled = true }
  }, [])

  const platforms = useMemo(() => {
    if (!data) return []
    return Object.keys(data.byPlatform).sort()
  }, [data])

  const rows = useMemo(() => {
    if (!data) return []
    let list = data.darkDevices
    if (filter !== 'all') list = list.filter(d => d.bucket === filter)
    if (platformFilter !== 'all') list = list.filter(d => (d.platform || 'Unknown') === platformFilter)
    const dir = sortDir === 'asc' ? 1 : -1
    return [...list].sort((a, b) => {
      const cmp = (x: string | number | null, y: string | number | null) => {
        if (x === null && y === null) return 0
        if (x === null) return 1
        if (y === null) return -1
        if (typeof x === 'number' && typeof y === 'number') return x - y
        return String(x).localeCompare(String(y))
      }
      switch (sortCol) {
        case 'bucket':      return dir * cmp(a.bucket, b.bucket)
        case 'deviceName':  return dir * cmp(a.deviceName || a.serialNumber, b.deviceName || b.serialNumber)
        case 'platform':    return dir * cmp(a.platform, b.platform)
        case 'usage':       return dir * cmp(a.usage, b.usage)
        case 'location':    return dir * cmp(a.location, b.location)
        case 'lastSeen':    return dir * cmp(a.lastSeen, b.lastSeen)
        case 'lastUsage':   return dir * cmp(a.lastUsageDate, b.lastUsageDate)
        case 'daysDark':    return dir * cmp(a.daysSinceUsage, b.daysSinceUsage)
      }
    })
  }, [data, filter, platformFilter, sortCol, sortDir])

  const toggleSort = (col: SortColumn) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir(col === 'daysDark' ? 'desc' : 'asc') }
  }

  const exportCsv = () => {
    if (!data) return
    const header = ['Status','Serial','Device','Platform','OS','Usage','Catalog','Location','LastSeen','LastUsage','DaysSinceUsage','TotalHoursEver']
    const escape = (v: unknown) => {
      const s = v == null ? '' : String(v)
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const lines = [header.join(',')]
    rows.forEach(r => lines.push([
      r.bucket, r.serialNumber, r.deviceName, r.platform, r.osName,
      r.usage, r.catalog, r.location, r.lastSeen, r.lastUsageDate,
      r.daysSinceUsage, r.totalHoursEver
    ].map(escape).join(',')))
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `usage-coverage-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const sortIndicator = (col: SortColumn) => {
    if (sortCol !== col) return null
    return (
      <svg className={`w-3.5 h-3.5 inline-block ml-1 transition-transform ${sortDir === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    )
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-black">
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Back link */}
        <div className="mb-4">
          <Link
            href={backHref}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
          >
            ← {fromParam ? 'Back to Usage Report' : 'Applications'}
          </Link>
        </div>

        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-4">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Usage Data Coverage</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Per-device collection health for application usage telemetry. Devices in the <b>dark</b> and <b>never</b> buckets aren&rsquo;t contributing to fleet utilization numbers.
              </p>
            </div>
            {data && (
              <button
                onClick={exportCsv}
                className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-gray-900 dark:text-white font-medium"
              >
                Export CSV
              </button>
            )}
          </div>

          {/* Summary stats */}
          {data && (
            <div className="mt-5 grid grid-cols-2 md:grid-cols-5 gap-3">
              <SummaryStat label="Total devices" value={data.summary.totalDevices} tone="neutral" />
              <SummaryStat label={`Healthy (last ${data.summary.freshDays}d)`} value={data.summary.healthy} tone="ok" />
              <SummaryStat label={`Stale (${data.summary.freshDays}–${data.summary.staleDays}d)`} value={data.summary.stale} tone="warn" />
              <SummaryStat label={`Dark (>${data.summary.staleDays}d)`} value={data.summary.dark} tone="alert" />
              <SummaryStat label="Never collected" value={data.summary.never} tone="critical" />
            </div>
          )}

          {/* Per-platform breakdown */}
          {data && Object.keys(data.byPlatform).length > 0 && (
            <div className="mt-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">By platform</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(data.byPlatform).sort().map(([plat, c]) => (
                  <div key={plat} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900 dark:text-white">{plat}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{c.total} devices</span>
                    </div>
                    <div className="mt-2 flex gap-3 text-xs">
                      <span className="text-emerald-700 dark:text-emerald-400">✓ {c.healthy}</span>
                      <span className="text-yellow-700 dark:text-yellow-400">◐ {c.stale}</span>
                      <span className="text-orange-700 dark:text-orange-400">● {c.dark}</span>
                      <span className="text-red-700 dark:text-red-400">✗ {c.never}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 px-6 py-4 mb-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <label className="text-gray-600 dark:text-gray-400">Bucket:</label>
            <select
              value={filter}
              onChange={e => setFilter(e.target.value as 'all' | 'dark' | 'never')}
              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All non-healthy</option>
              <option value="dark">Dark only</option>
              <option value="never">Never only</option>
            </select>
          </div>
          {platforms.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <label className="text-gray-600 dark:text-gray-400">Platform:</label>
              <select
                value={platformFilter}
                onChange={e => setPlatformFilter(e.target.value)}
                className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All</option>
                {platforms.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          )}
          <div className="text-sm text-gray-500 dark:text-gray-400 ml-auto">
            {data ? `${rows.length} of ${data.darkDevices.length} devices` : ''}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {error && (
            <div className="p-6 text-center text-red-600 dark:text-red-400 text-sm">{error}</div>
          )}
          {!error && !data && (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm">Loading…</div>
          )}
          {data && rows.length === 0 && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
              No devices match the current filter.
            </div>
          )}
          {data && rows.length > 0 && (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300">
                  <tr>
                    <Th col="bucket" onClick={toggleSort} active={sortCol} indicator={sortIndicator}>Status</Th>
                    <Th col="deviceName" onClick={toggleSort} active={sortCol} indicator={sortIndicator}>Device</Th>
                    <Th col="platform" onClick={toggleSort} active={sortCol} indicator={sortIndicator}>Platform</Th>
                    <Th col="usage" onClick={toggleSort} active={sortCol} indicator={sortIndicator}>Usage</Th>
                    <Th col="location" onClick={toggleSort} active={sortCol} indicator={sortIndicator}>Location</Th>
                    <Th col="lastSeen" onClick={toggleSort} active={sortCol} indicator={sortIndicator}>Last seen</Th>
                    <Th col="lastUsage" onClick={toggleSort} active={sortCol} indicator={sortIndicator}>Last usage</Th>
                    <Th col="daysDark" onClick={toggleSort} active={sortCol} indicator={sortIndicator} align="right">Days dark</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {rows.map(dev => (
                    <tr key={dev.serialNumber} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          dev.bucket === 'never'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'
                            : 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200'
                        }`}>
                          {dev.bucket}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/device/${dev.serialNumber}`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
                          {dev.deviceName || dev.serialNumber}
                        </Link>
                        <div className="text-[11px] text-gray-500 dark:text-gray-500 font-mono">{dev.serialNumber}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-700 dark:text-gray-300">{dev.platform || '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-700 dark:text-gray-300">{dev.usage || '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-700 dark:text-gray-300">{dev.location || '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-700 dark:text-gray-300" suppressHydrationWarning>
                        {dev.lastSeen ? formatRelativeTime(dev.lastSeen) : '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-700 dark:text-gray-300">
                        {dev.lastUsageDate || 'never'}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap text-gray-700 dark:text-gray-300 font-mono">
                        {dev.daysSinceUsage !== null ? `${dev.daysSinceUsage}d` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SummaryStat({ label, value, tone }: { label: string; value: number; tone: 'neutral' | 'ok' | 'warn' | 'alert' | 'critical' }) {
  const colors = {
    neutral:  'text-gray-900 dark:text-white',
    ok:       'text-emerald-700 dark:text-emerald-400',
    warn:     'text-yellow-700 dark:text-yellow-400',
    alert:    'text-orange-700 dark:text-orange-400',
    critical: 'text-red-700 dark:text-red-400',
  }[tone]
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
      <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${colors}`}>{value.toLocaleString()}</div>
    </div>
  )
}

function Th({
  col, onClick, active, indicator, align = 'left', children,
}: {
  col: SortColumn
  onClick: (c: SortColumn) => void
  active: SortColumn
  indicator: (c: SortColumn) => React.ReactNode
  align?: 'left' | 'right'
  children: React.ReactNode
}) {
  return (
    <th
      className={`px-4 py-3 ${align === 'right' ? 'text-right' : 'text-left'} text-xs font-semibold uppercase tracking-wider cursor-pointer select-none hover:bg-blue-100 dark:hover:bg-blue-900/40 ${active === col ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}
      onClick={() => onClick(col)}
    >
      {children}
      {indicator(col)}
    </th>
  )
}

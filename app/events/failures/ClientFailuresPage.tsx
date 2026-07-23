"use client"

export const dynamic = 'force-dynamic'

import React, { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { formatRelativeTime, formatExactTime } from "../../../src/lib/time"
import { Search, X } from 'lucide-react'

interface IngestFailure {
  id: number
  ts: string | null
  failureType: string
  reason: string
  detail: string | null
  statusCode: number | null
  endpoint: string | null
  clientIp: string | null
  userAgent: string | null
  serialNumber: string | null
  deviceUuid: string | null
  deviceName: string | null
  platform: string | null
  clientVersion: string | null
}

interface ReasonSummary {
  reason: string
  count: number
  devices: number
  lastSeen: string | null
}

const REASON_LABELS: Record<string, string> = {
  invalid_passphrase: 'Wrong passphrase',
  invalid_api_key: 'Wrong API key',
  invalid_bearer_token: 'Rejected bearer token',
  invalid_internal_secret: 'Wrong internal secret',
  missing_credentials: 'No credentials',
  insufficient_scope: 'Missing scope',
  malformed_json: 'Malformed JSON',
  invalid_payload: 'Invalid payload',
  empty_serial: 'Empty serial',
  sentinel_serial: 'Placeholder serial',
  short_serial: 'Serial too short',
  hostname_serial: 'Hostname as serial',
  letters_only_serial: 'Hostname-like serial',
}

const HOURS_OPTIONS = [
  { value: 24, label: 'Last 24 hours' },
  { value: 168, label: 'Last 7 days' },
  { value: 720, label: 'Last 30 days' },
]

function reasonLabel(reason: string): string {
  return REASON_LABELS[reason] || reason
}

function reasonBadgeClass(failureType: string): string {
  return failureType === 'auth'
    ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'
}

export default function ClientFailuresPage() {
  const [failures, setFailures] = useState<IngestFailure[]>([])
  const [summary, setSummary] = useState<ReasonSummary[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hours, setHours] = useState(168)
  const [reasonFilter, setReasonFilter] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchFailures = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: '500', hours: String(hours) })
      if (reasonFilter) params.append('reason', reasonFilter)
      const resp = await fetch(`/api/events/failures?${params.toString()}`)
      if (!resp.ok) {
        throw new Error(`Request failed with status ${resp.status}`)
      }
      const data = await resp.json()
      setFailures(Array.isArray(data.failures) ? data.failures : [])
      setSummary(Array.isArray(data.summary) ? data.summary : [])
      setTotal(typeof data.total === 'number' ? data.total : 0)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load failures')
    } finally {
      setLoading(false)
    }
  }, [hours, reasonFilter])

  useEffect(() => {
    setLoading(true)
    fetchFailures()
    const interval = setInterval(fetchFailures, 30000)
    return () => clearInterval(interval)
  }, [fetchFailures])

  const filteredFailures = useMemo(() => {
    if (!searchQuery.trim()) return failures
    const q = searchQuery.trim().toLowerCase()
    return failures.filter(f =>
      (f.serialNumber || '').toLowerCase().includes(q) ||
      (f.deviceName || '').toLowerCase().includes(q) ||
      (f.clientIp || '').toLowerCase().includes(q) ||
      (f.reason || '').toLowerCase().includes(q)
    )
  }, [failures, searchQuery])

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-gray-50 dark:bg-black overflow-hidden">
      <div className="flex-1 flex flex-col min-h-0 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-8">

        {/* Summary chips */}
        {summary.length > 0 && (
          <div className="flex flex-wrap gap-2 pb-4">
            <button
              onClick={() => setReasonFilter(null)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                reasonFilter === null
                  ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900 dark:border-white'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700'
              }`}
            >
              All ({total})
            </button>
            {summary.map(s => (
              <button
                key={s.reason}
                onClick={() => setReasonFilter(reasonFilter === s.reason ? null : s.reason)}
                title={s.lastSeen ? `Last seen ${formatRelativeTime(s.lastSeen)} — ${s.devices} device(s)` : undefined}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                  reasonFilter === s.reason
                    ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900 dark:border-white'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700'
                }`}
              >
                {reasonLabel(s.reason)} ({s.count})
              </button>
            ))}
          </div>
        )}

        {/* Table */}
        <div className="flex flex-col flex-1 min-h-0 bg-white dark:bg-gray-800 rounded-t-xl shadow-sm border-l border-r border-t border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Header with controls */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Failed Check-ins
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Devices that reached the server but were rejected — the answer to &quot;installed but never appeared&quot;
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <select
                value={hours}
                onChange={(e) => setHours(parseInt(e.target.value, 10))}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {HOURS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search serial, name, IP..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 w-full sm:w-64"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Body */}
          {loading ? (
            <div className="flex-1 flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center py-16">
              <div className="text-center">
                <p className="text-red-600 dark:text-red-400 font-medium mb-2">Error loading failed check-ins</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
              </div>
            </div>
          ) : filteredFailures.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-16">
              <div className="text-center px-6">
                <div className="w-16 h-16 mx-auto mb-4 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  No failed check-ins
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
                  Every device that reached the server in this window was accepted.
                  A machine that is missing entirely never contacted the server — check
                  its local logs under C:\ProgramData\ManagedReports\logs.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Device</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Detail</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Client</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredFailures.map(f => (
                    <tr key={f.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400" title={f.ts ? formatExactTime(f.ts) : undefined}>
                        {f.ts ? formatRelativeTime(f.ts) : 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {f.deviceName || f.serialNumber || <span className="text-gray-400 italic">unidentified</span>}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                          {f.serialNumber && f.deviceName ? f.serialNumber : f.clientIp || ''}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${reasonBadgeClass(f.failureType)}`}>
                          {reasonLabel(f.reason)}
                        </span>
                        {f.statusCode && (
                          <span className="ml-2 text-xs text-gray-400">{f.statusCode}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 max-w-md">
                        <span className="line-clamp-2">{f.detail || '—'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                        <div>{f.platform || 'Unknown'}{f.clientVersion ? ` · v${f.clientVersion}` : ''}</div>
                        <div className="font-mono">{f.clientIp || ''}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>
              {filteredFailures.length} of {total} rejected check-in{total === 1 ? '' : 's'} shown
            </span>
            <Link href="/events" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
              ← Events feed
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

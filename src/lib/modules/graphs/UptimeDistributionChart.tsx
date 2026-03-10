/**
 * Uptime Distribution Chart Component
 * Horizontal bar chart showing fleet uptime distribution in buckets
 * Useful for identifying devices that need rebooting
 */

'use client'

import React, { useMemo } from 'react'

interface SystemDevice {
  uptime?: number | null
  deviceName?: string
}

interface UptimeDistributionChartProps {
  devices: SystemDevice[]
  loading?: boolean
  selectedBuckets?: string[]
  onBucketToggle?: (bucket: string) => void
}

interface UptimeBucket {
  label: string
  key: string
  min: number  // seconds
  max: number  // seconds
  count: number
  percentage: number
  color: string
  isSelected: boolean
}

const BUCKET_DEFS = [
  { label: '< 1 day',     key: 'lt1d',   min: 0,         max: 86400,      color: '#10b981' }, // green
  { label: '1-3 days',    key: '1-3d',   min: 86400,     max: 259200,     color: '#22c55e' }, // green-500
  { label: '3-7 days',    key: '3-7d',   min: 259200,    max: 604800,     color: '#84cc16' }, // lime
  { label: '1-2 weeks',   key: '1-2w',   min: 604800,    max: 1209600,    color: '#eab308' }, // yellow
  { label: '2-4 weeks',   key: '2-4w',   min: 1209600,   max: 2592000,    color: '#f97316' }, // orange
  { label: '30+ days',    key: '30d+',   min: 2592000,   max: Infinity,   color: '#ef4444' }, // red
]

export function UptimeDistributionChart({ devices, loading = false, selectedBuckets = [], onBucketToggle }: UptimeDistributionChartProps) {
  const buckets = useMemo((): UptimeBucket[] => {
    if (!devices || devices.length === 0) return []

    const devicesWithUptime = devices.filter(d => d.uptime != null && d.uptime > 0)
    if (devicesWithUptime.length === 0) return []

    return BUCKET_DEFS.map(def => {
      const count = devicesWithUptime.filter(d => d.uptime! >= def.min && d.uptime! < def.max).length
      return {
        ...def,
        count,
        percentage: Math.round((count / devicesWithUptime.length) * 100),
        isSelected: selectedBuckets.length === 0 || selectedBuckets.includes(def.key),
      }
    }).filter(b => b.count > 0)
  }, [devices, selectedBuckets])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="w-10 h-10 border-2 border-gray-200 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (buckets.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-gray-500 dark:text-gray-400">No uptime data available</div>
    )
  }

  const maxCount = Math.max(...buckets.map(b => b.count))

  return (
    <div className="space-y-2">
      {buckets.map(bucket => (
        <button
          key={bucket.key}
          onClick={() => onBucketToggle?.(bucket.key)}
          className={`w-full flex items-center gap-3 px-2 py-1.5 rounded-lg transition-all hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
            !bucket.isSelected ? 'opacity-40' : ''
          }`}
        >
          <span className="w-20 text-xs text-gray-600 dark:text-gray-400 text-right flex-shrink-0">{bucket.label}</span>
          <div className="flex-1 flex items-center gap-2">
            <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.max((bucket.count / maxCount) * 100, 4)}%`,
                  backgroundColor: bucket.isSelected ? bucket.color : '#9ca3af',
                }}
              />
            </div>
            <span className="text-xs font-semibold text-gray-900 dark:text-white w-8 text-right">{bucket.count}</span>
          </div>
        </button>
      ))}
    </div>
  )
}

/** Classify an uptime (seconds) into a bucket key */
export function getUptimeBucketKey(uptimeSeconds: number | null | undefined): string | null {
  if (uptimeSeconds == null || uptimeSeconds <= 0) return null
  for (const def of BUCKET_DEFS) {
    if (uptimeSeconds >= def.min && uptimeSeconds < def.max) return def.key
  }
  return null
}

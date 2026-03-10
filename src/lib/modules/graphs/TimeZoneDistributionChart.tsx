/**
 * Time Zone Distribution Chart Component
 * Horizontal bar chart showing geographic spread of fleet by time zone
 */

'use client'

import React, { useMemo } from 'react'

interface SystemDevice {
  timeZone?: string | null
}

interface TimeZoneDistributionChartProps {
  devices: SystemDevice[]
  loading?: boolean
  selectedTimeZones?: string[]
  onTimeZoneToggle?: (tz: string) => void
}

interface TimeZoneData {
  timeZone: string
  shortLabel: string
  count: number
  percentage: number
  color: string
  isSelected: boolean
}

const TZ_COLORS = [
  '#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316',
]

/** Shorten a timezone name for display */
function shortenTZ(tz: string): string {
  // "Eastern Standard Time" -> "Eastern"
  // "Pacific Standard Time" -> "Pacific"
  // "(UTC-05:00) Eastern Time (US & Canada)" -> "Eastern"
  const match = tz.match(/(?:\(UTC[^)]*\)\s*)?(\w+)/)
  if (match) {
    const first = match[1]
    if (first === 'Eastern' || first === 'Pacific' || first === 'Central' || first === 'Mountain') return first
  }
  // "America/Toronto" -> "Toronto"
  if (tz.includes('/')) return tz.split('/').pop() || tz
  // Fallback: truncate
  return tz.length > 20 ? tz.slice(0, 20) + '...' : tz
}

export function TimeZoneDistributionChart({ devices, loading = false, selectedTimeZones = [], onTimeZoneToggle }: TimeZoneDistributionChartProps) {
  const tzData = useMemo((): TimeZoneData[] => {
    if (!devices || devices.length === 0) return []

    const counts: Record<string, number> = {}
    devices.forEach(d => {
      if (d.timeZone) {
        counts[d.timeZone] = (counts[d.timeZone] || 0) + 1
      }
    })

    const total = Object.values(counts).reduce((a, b) => a + b, 0)
    if (total === 0) return []

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10) // Top 10 time zones
      .map(([tz, count], idx) => ({
        timeZone: tz,
        shortLabel: shortenTZ(tz),
        count,
        percentage: Math.round((count / total) * 100),
        color: TZ_COLORS[idx % TZ_COLORS.length],
        isSelected: selectedTimeZones.length === 0 || selectedTimeZones.includes(tz),
      }))
  }, [devices, selectedTimeZones])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="w-10 h-10 border-2 border-gray-200 border-t-purple-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (tzData.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-gray-500 dark:text-gray-400">No time zone data available</div>
    )
  }

  const maxCount = Math.max(...tzData.map(t => t.count))

  return (
    <div className="space-y-2">
      {tzData.map(item => (
        <button
          key={item.timeZone}
          onClick={() => onTimeZoneToggle?.(item.timeZone)}
          title={item.timeZone}
          className={`w-full flex items-center gap-3 px-2 py-1.5 rounded-lg transition-all hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
            !item.isSelected ? 'opacity-40' : ''
          }`}
        >
          <span className="w-20 text-xs text-gray-600 dark:text-gray-400 text-right flex-shrink-0 truncate">{item.shortLabel}</span>
          <div className="flex-1 flex items-center gap-2">
            <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.max((item.count / maxCount) * 100, 4)}%`,
                  backgroundColor: item.isSelected ? item.color : '#9ca3af',
                }}
              />
            </div>
            <span className="text-xs font-semibold text-gray-900 dark:text-white w-8 text-right">{item.count}</span>
          </div>
        </button>
      ))}
    </div>
  )
}

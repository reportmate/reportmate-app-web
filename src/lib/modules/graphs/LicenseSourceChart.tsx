/**
 * License Source Chart Component
 * SVG donut showing Windows license source distribution (Firmware/KMS/MAK/Volume/Retail)
 */

'use client'

import React, { useMemo } from 'react'

interface SystemDevice {
  licenseSource?: string | null
  hasFirmwareLicense?: boolean | null
  platform?: string
}

interface LicenseSourceChartProps {
  devices: SystemDevice[]
  loading?: boolean
  selectedSources?: string[]
  onSourceToggle?: (source: string) => void
}

interface SourceData {
  source: string
  count: number
  percentage: number
  color: string
  isSelected: boolean
}

const SOURCE_COLORS: Record<string, string> = {
  'OEM_DM': '#10b981',         // green - Firmware/OEM
  'RETAIL': '#3b82f6',          // blue
  'VOLUME_MAK': '#f59e0b',     // amber
  'VOLUME_KMS': '#8b5cf6',     // violet
  'VOLUME_KMS_R2': '#6366f1',  // indigo
  'OEM': '#22c55e',            // green-500
  'OEM_SLP': '#14b8a6',        // teal
  'OEM_COA': '#06b6d4',        // cyan
  'OEM_COA_NSLP': '#0ea5e9',   // sky
  'UNKNOWN': '#9ca3af',        // gray
}

const DEFAULT_COLORS = ['#ec4899', '#f97316', '#84cc16', '#a855f7']

/** Human-readable label for license source code */
function formatSource(source: string): string {
  const labels: Record<string, string> = {
    'OEM_DM': 'Firmware (OEM)',
    'RETAIL': 'Retail',
    'VOLUME_MAK': 'Volume MAK',
    'VOLUME_KMS': 'Volume KMS',
    'VOLUME_KMS_R2': 'Volume KMS R2',
    'OEM': 'OEM',
    'OEM_SLP': 'OEM SLP',
    'OEM_COA': 'OEM COA',
    'OEM_COA_NSLP': 'OEM COA NSLP',
  }
  return labels[source] || source
}

export function LicenseSourceChart({ devices, loading = false, selectedSources = [], onSourceToggle }: LicenseSourceChartProps) {
  const sourceData = useMemo((): SourceData[] => {
    if (!devices || devices.length === 0) return []

    // Only Windows devices
    const windowsDevices = devices.filter(d => d.platform === 'Windows' && d.licenseSource)
    if (windowsDevices.length === 0) return []

    const counts: Record<string, number> = {}
    windowsDevices.forEach(d => {
      const src = d.licenseSource || 'Unknown'
      counts[src] = (counts[src] || 0) + 1
    })

    const total = Object.values(counts).reduce((a, b) => a + b, 0)
    if (total === 0) return []

    let colorIdx = 0
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([source, count]) => ({
        source,
        count,
        percentage: Math.round((count / total) * 100),
        color: SOURCE_COLORS[source] || DEFAULT_COLORS[colorIdx++ % DEFAULT_COLORS.length],
        isSelected: selectedSources.length === 0 || selectedSources.includes(source),
      }))
  }, [devices, selectedSources])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="w-10 h-10 border-2 border-gray-200 border-t-amber-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (sourceData.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-gray-500 dark:text-gray-400">No license data available</div>
    )
  }

  const size = 140
  const strokeWidth = 28
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const total = sourceData.reduce((s, d) => s + d.count, 0)
  let offset = 0

  return (
    <div className="flex items-center gap-4">
      <div className="flex-shrink-0">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {sourceData.map(item => {
            const dashLength = (item.count / total) * circumference
            const segment = (
              <circle
                key={item.source}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={item.isSelected ? item.color : '#d1d5db'}
                strokeWidth={strokeWidth}
                strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                strokeDashoffset={-offset}
                className="cursor-pointer transition-opacity duration-200 hover:opacity-80"
                onClick={() => onSourceToggle?.(item.source)}
                style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
              />
            )
            offset += dashLength
            return segment
          })}
          <text x="50%" y="46%" textAnchor="middle" className="fill-gray-900 dark:fill-white text-xl font-bold">{total}</text>
          <text x="50%" y="60%" textAnchor="middle" className="fill-gray-500 dark:fill-gray-400 text-[10px]">licensed</text>
        </svg>
      </div>
      <div className="flex-1 space-y-1.5 min-w-0">
        {sourceData.map(item => (
          <button
            key={item.source}
            onClick={() => onSourceToggle?.(item.source)}
            className={`w-full flex items-center gap-2 px-2 py-1 rounded-md text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${
              !item.isSelected ? 'opacity-40' : ''
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
            <span className="text-xs text-gray-700 dark:text-gray-300 truncate flex-1">{formatSource(item.source)}</span>
            <span className="text-xs font-semibold text-gray-900 dark:text-white">{item.count}</span>
            <span className="text-[10px] text-gray-400">{item.percentage}%</span>
          </button>
        ))}
      </div>
    </div>
  )
}

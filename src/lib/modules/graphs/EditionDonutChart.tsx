/**
 * Edition Donut Chart Component
 * Shows distribution of OS editions (Enterprise, Pro, Education, Home, etc.)
 * Interactive: clicking a segment toggles filtering
 */

'use client'

import React, { useMemo } from 'react'

interface SystemDevice {
  edition?: string | null
  platform?: string
  operatingSystem?: string
}

interface EditionDonutChartProps {
  devices: SystemDevice[]
  loading?: boolean
  selectedEditions?: string[]
  onEditionToggle?: (edition: string) => void
}

interface EditionData {
  edition: string
  count: number
  percentage: number
  color: string
  isSelected: boolean
}

const EDITION_COLORS: Record<string, string> = {
  'Enterprise': '#6366f1',   // indigo
  'Pro': '#3b82f6',          // blue
  'Education': '#8b5cf6',    // violet
  'Home': '#10b981',         // emerald
  'Professional': '#3b82f6', // blue
  'Standard': '#f59e0b',     // amber
}

const DEFAULT_COLORS = ['#06b6d4', '#f97316', '#84cc16', '#ec4899', '#14b8a6', '#a855f7']

export function EditionDonutChart({ devices, loading = false, selectedEditions = [], onEditionToggle }: EditionDonutChartProps) {
  const editionData = useMemo((): EditionData[] => {
    if (!devices || devices.length === 0) return []

    // Edition is a Windows concept - exclude macOS devices entirely
    const windowsDevices = devices.filter(d => {
      const platform = d.platform?.toLowerCase() || d.operatingSystem?.toLowerCase() || ''
      return !platform.includes('macos') && !platform.includes('mac os') && !platform.includes('darwin')
    })

    const counts: Record<string, number> = {}
    windowsDevices.forEach(d => {
      const edition = d.edition || 'Unknown'
      if (edition && edition !== 'Unknown') {
        counts[edition] = (counts[edition] || 0) + 1
      }
    })

    const total = Object.values(counts).reduce((a, b) => a + b, 0)
    if (total === 0) return []

    let colorIdx = 0
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([edition, count]) => ({
        edition,
        count,
        percentage: Math.round((count / total) * 100),
        color: EDITION_COLORS[edition] || DEFAULT_COLORS[colorIdx++ % DEFAULT_COLORS.length],
        isSelected: selectedEditions.length === 0 || selectedEditions.includes(edition),
      }))
  }, [devices, selectedEditions])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="w-10 h-10 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (editionData.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-gray-500 dark:text-gray-400">No edition data available</div>
    )
  }

  // SVG donut
  const size = 140
  const strokeWidth = 28
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <div className="flex items-center gap-4">
      <div className="flex-shrink-0">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {editionData.map((item) => {
            const dashLength = (item.count / devices.filter(d => (d.edition || (d.platform === 'macOS' ? 'macOS' : 'Unknown')) !== 'Unknown').length) * circumference
            const segment = (
              <circle
                key={item.edition}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={item.isSelected ? item.color : '#d1d5db'}
                strokeWidth={strokeWidth}
                strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                strokeDashoffset={-offset}
                className="cursor-pointer transition-opacity duration-200 hover:opacity-80"
                onClick={() => onEditionToggle?.(item.edition)}
                style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
              />
            )
            offset += dashLength
            return segment
          })}
          <text x="50%" y="46%" textAnchor="middle" className="fill-gray-900 dark:fill-white text-xl font-bold">{editionData.reduce((s, d) => s + d.count, 0)}</text>
          <text x="50%" y="60%" textAnchor="middle" className="fill-gray-500 dark:fill-gray-400 text-[10px]">devices</text>
        </svg>
      </div>
      <div className="flex-1 space-y-1.5 min-w-0">
        {editionData.map(item => (
          <button
            key={item.edition}
            onClick={() => onEditionToggle?.(item.edition)}
            className={`w-full flex items-center gap-2 px-2 py-1 rounded-md text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${
              !item.isSelected ? 'opacity-40' : ''
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
            <span className="text-xs text-gray-700 dark:text-gray-300 truncate flex-1">{item.edition}</span>
            <span className="text-xs font-semibold text-gray-900 dark:text-white">{item.count}</span>
            <span className="text-[10px] text-gray-400">{item.percentage}%</span>
          </button>
        ))}
      </div>
    </div>
  )
}

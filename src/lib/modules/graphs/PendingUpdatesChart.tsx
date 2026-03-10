/**
 * Pending Updates Distribution Chart
 * Shows how many devices have 0, 1-5, 6-10, 10+ pending updates
 * Useful for patch compliance visibility at fleet level
 */

'use client'

import React, { useMemo } from 'react'

interface SystemDevice {
  pendingUpdatesCount?: number
  platform?: string
}

interface PendingUpdatesChartProps {
  devices: SystemDevice[]
  loading?: boolean
  selectedBuckets?: string[]
  onBucketToggle?: (bucket: string) => void
}

interface BucketData {
  key: string
  label: string
  count: number
  percentage: number
  color: string
  isSelected: boolean
}

const BUCKET_DEFS: { key: string; label: string; min: number; max: number; color: string }[] = [
  { key: 'up-to-date', label: 'Up to date', min: 0, max: 0, color: '#10b981' },
  { key: '1-5', label: '1-5 pending', min: 1, max: 5, color: '#f59e0b' },
  { key: '6-10', label: '6-10 pending', min: 6, max: 10, color: '#f97316' },
  { key: '10+', label: '10+ pending', min: 11, max: Infinity, color: '#ef4444' },
]

export function getPendingUpdatesBucketKey(count: number | null | undefined): string | null {
  if (count == null) return null
  for (const b of BUCKET_DEFS) {
    if (count >= b.min && count <= b.max) return b.key
  }
  return null
}

export function PendingUpdatesChart({ devices, loading = false, selectedBuckets = [], onBucketToggle }: PendingUpdatesChartProps) {
  const bucketData = useMemo((): BucketData[] => {
    if (!devices || devices.length === 0) return []

    // Only count devices that have a pendingUpdatesCount
    const withUpdates = devices.filter(d => d.pendingUpdatesCount != null)
    if (withUpdates.length === 0) return []

    const counts: Record<string, number> = {}
    BUCKET_DEFS.forEach(b => { counts[b.key] = 0 })

    withUpdates.forEach(d => {
      const c = d.pendingUpdatesCount!
      for (const b of BUCKET_DEFS) {
        if (c >= b.min && c <= b.max) {
          counts[b.key]++
          break
        }
      }
    })

    const total = withUpdates.length

    return BUCKET_DEFS
      .filter(b => counts[b.key] > 0)
      .map(b => ({
        key: b.key,
        label: b.label,
        count: counts[b.key],
        percentage: Math.round((counts[b.key] / total) * 100),
        color: b.color,
        isSelected: selectedBuckets.length === 0 || selectedBuckets.includes(b.key),
      }))
  }, [devices, selectedBuckets])

  const maxCount = useMemo(() => Math.max(...bucketData.map(b => b.count), 1), [bucketData])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="w-10 h-10 border-2 border-gray-200 border-t-green-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (bucketData.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-gray-500 dark:text-gray-400 text-sm">No update data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {bucketData.map(bucket => {
        const barWidth = Math.max((bucket.count / maxCount) * 100, 2)
        const isActive = bucket.isSelected
        return (
          <button
            key={bucket.key}
            onClick={() => onBucketToggle?.(bucket.key)}
            className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all duration-200 text-left ${
              !isActive ? 'opacity-30' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
            } ${selectedBuckets.includes(bucket.key) ? 'ring-2 ring-offset-1 ring-blue-400 dark:ring-blue-500 dark:ring-offset-gray-800' : ''}`}
          >
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300 w-24 text-right shrink-0 truncate">
              {bucket.label}
            </span>
            <div className="flex-1 flex items-center gap-2">
              <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${barWidth}%`,
                    backgroundColor: bucket.color,
                    opacity: isActive ? 1 : 0.3,
                  }}
                />
              </div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-8 text-right">
                {bucket.count}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}

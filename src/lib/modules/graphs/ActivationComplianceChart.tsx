/**
 * Activation Compliance Chart Component
 * SVG donut showing Activated vs Not Activated devices (Windows)
 * or Up to Date vs Pending Updates (Mac)
 */

'use client'

import React, { useMemo } from 'react'

interface SystemDevice {
  activationStatus?: boolean | null
  platform?: string
}

interface ActivationComplianceChartProps {
  devices: SystemDevice[]
  loading?: boolean
  selectedStatuses?: string[]
  onStatusToggle?: (status: string) => void
}

interface StatusData {
  label: string
  count: number
  percentage: number
  color: string
  isSelected: boolean
}

export function ActivationComplianceChart({ devices, loading = false, selectedStatuses = [], onStatusToggle }: ActivationComplianceChartProps) {
  const statusData = useMemo((): StatusData[] => {
    if (!devices || devices.length === 0) return []

    // Only Windows devices have activation status
    const windowsDevices = devices.filter(d => d.platform === 'Windows' && d.activationStatus !== undefined && d.activationStatus !== null)
    if (windowsDevices.length === 0) return []

    const activated = windowsDevices.filter(d => d.activationStatus === true).length
    const notActivated = windowsDevices.length - activated
    const total = windowsDevices.length

    const result: StatusData[] = []
    if (activated > 0) {
      result.push({
        label: 'Activated',
        count: activated,
        percentage: Math.round((activated / total) * 100),
        color: '#10b981', // green
        isSelected: selectedStatuses.length === 0 || selectedStatuses.includes('Activated'),
      })
    }
    if (notActivated > 0) {
      result.push({
        label: 'Not Activated',
        count: notActivated,
        percentage: Math.round((notActivated / total) * 100),
        color: '#ef4444', // red
        isSelected: selectedStatuses.length === 0 || selectedStatuses.includes('Not Activated'),
      })
    }
    return result
  }, [devices, selectedStatuses])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="w-10 h-10 border-2 border-gray-200 border-t-green-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (statusData.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-gray-500 dark:text-gray-400">No activation data available</div>
    )
  }

  const size = 140
  const strokeWidth = 28
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const total = statusData.reduce((s, d) => s + d.count, 0)
  let offset = 0

  return (
    <div className="flex items-center gap-4">
      <div className="flex-shrink-0">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {statusData.map(item => {
            const dashLength = (item.count / total) * circumference
            const segment = (
              <circle
                key={item.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={item.isSelected ? item.color : '#d1d5db'}
                strokeWidth={strokeWidth}
                strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                strokeDashoffset={-offset}
                className="cursor-pointer transition-opacity duration-200 hover:opacity-80"
                onClick={() => onStatusToggle?.(item.label)}
                style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
              />
            )
            offset += dashLength
            return segment
          })}
          <text x="50%" y="46%" textAnchor="middle" className="fill-gray-900 dark:fill-white text-xl font-bold">
            {statusData.find(s => s.label === 'Activated')?.percentage || 0}%
          </text>
          <text x="50%" y="60%" textAnchor="middle" className="fill-gray-500 dark:fill-gray-400 text-[10px]">activated</text>
        </svg>
      </div>
      <div className="flex-1 space-y-1.5 min-w-0">
        {statusData.map(item => (
          <button
            key={item.label}
            onClick={() => onStatusToggle?.(item.label)}
            className={`w-full flex items-center gap-2 px-2 py-1 rounded-md text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${
              !item.isSelected ? 'opacity-40' : ''
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
            <span className="text-xs text-gray-700 dark:text-gray-300 truncate flex-1">{item.label}</span>
            <span className="text-xs font-semibold text-gray-900 dark:text-white">{item.count}</span>
            <span className="text-[10px] text-gray-400">{item.percentage}%</span>
          </button>
        ))}
      </div>
    </div>
  )
}

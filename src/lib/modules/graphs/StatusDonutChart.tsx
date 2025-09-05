/**
 * Status Donut Chart Component
 * Displays device status distribution (active, stale, missing) as a donut chart
 */

import React from 'react'
import { useRouter } from 'next/navigation'

interface Device {
  deviceId: string
  serialNumber: string  
  name: string
  model?: string
  os?: string
  lastSeen: string
  status: 'active' | 'stale' | 'missing' | 'warning' | 'error' | 'offline'
  uptime?: string
  location?: string
  ipAddress?: string
  ipAddressV4?: string
  ipAddressV6?: string
  macAddress?: string
  totalEvents: number
  lastEventTime: string
  architecture?: string
  processor?: string
  memory?: string
}

interface StatusDonutChartProps {
  devices: Device[]
  loading: boolean
}

interface StatusData {
  status: string
  count: number
  percentage: number
  color: string
  displayName: string
}

// Status colors and display names
const STATUS_CONFIG = {
  active: { 
    color: '#10b981', // emerald-500
    displayName: 'Active'
  },
  stale: { 
    color: '#f59e0b', // amber-500
    displayName: 'Stale'
  },
  missing: { 
    color: '#6b7280', // gray-500
    displayName: 'Missing'
  },
  warning: { 
    color: '#f97316', // orange-500
    displayName: 'Warning'
  },
  error: { 
    color: '#ef4444', // red-500
    displayName: 'Error'
  },
  offline: { 
    color: '#6b7280', // gray-500
    displayName: 'Offline'
  }
}

const processStatusData = (devices: Device[]): StatusData[] => {
  if (devices.length === 0) return []

  const statusCounts: { [key: string]: number } = {}
  
  // Count devices by status
  devices.forEach(device => {
    const status = device.status || 'missing'
    statusCounts[status] = (statusCounts[status] || 0) + 1
  })

  // Convert to array with percentages
  return Object.entries(statusCounts).map(([status, count]) => ({
    status,
    count,
    percentage: Math.round((count / devices.length) * 100),
    color: STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.color || '#6b7280',
    displayName: STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.displayName || status
  })).sort((a, b) => b.count - a.count) // Sort by count descending
}

export const StatusDonutChart: React.FC<StatusDonutChartProps> = ({ devices, loading }) => {
  const router = useRouter()

  // Debug logging
  console.log('[STATUS DONUT CHART] Rendering with:', {
    devicesCount: devices.length,
    loading,
    deviceStatuses: devices.length > 0 ? devices.reduce((acc, d) => {
      acc[d.status] = (acc[d.status] || 0) + 1
      return acc
    }, {} as Record<string, number>) : {},
    hasDevicesWithStatus: devices.filter(d => d.status).length
  })

  // Show loading state with a beautiful animated donut
  if (loading && devices.length === 0) {
    return (
      <div className="space-y-6">
        {/* Animated Loading Donut */}
        <div className="flex items-center justify-center">
          <div className="relative">
            {/* Outer rotating ring */}
            <div className="w-48 h-48 rounded-full border-4 border-gray-200 dark:border-gray-700">
              <div className="w-full h-full rounded-full border-4 border-transparent border-t-blue-500 border-r-blue-400 animate-spin"></div>
            </div>
            
            {/* Inner circle with content */}
            <div className="absolute inset-6 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-sm">
              <div className="text-center">
                <div className="w-8 h-8 mx-auto mb-2 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  Loading
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Devices
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Loading skeleton for legend */}
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-2">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" style={{ width: `${80 + (i * 20)}px` }}></div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div className="h-3 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading device status data...</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 mx-auto mb-4 border-4 border-gray-200 dark:border-gray-700 rounded-full">
              <div className="w-full h-full rounded-full border-4 border-transparent border-t-emerald-500 border-r-emerald-400 animate-spin"></div>
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Updating status data...</p>
        </div>
      </div>
    )
  }

  if (devices.length === 0) {
    console.log('[STATUS DONUT CHART] No devices found, showing empty state')
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
            No devices found
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Devices will appear here when they report in
          </p>
        </div>
      </div>
    )
  }

  const statusData = processStatusData(devices)

  const handleSegmentClick = (status: string) => {
    // Navigate to devices page with status filter
    router.push(`/devices?status=${encodeURIComponent(status)}`)
  }

  // Simple donut chart using CSS conic-gradient - more reliable than SVG
  const generateConicGradient = (data: StatusData[]) => {
    let cumulativePercentage = 0
    const gradientStops: string[] = []

    data.forEach((item, index) => {
      const startPercent = cumulativePercentage
      const endPercent = cumulativePercentage + item.percentage
      
      gradientStops.push(`${item.color} ${startPercent}% ${endPercent}%`)
      cumulativePercentage = endPercent
    })

    return `conic-gradient(${gradientStops.join(', ')})`
  }

  return (
    <div className="space-y-6">
      {/* CSS-based Donut Chart */}
      <div className="flex items-center justify-center">
        <div className="relative">
          <div 
            className="w-48 h-48 rounded-full cursor-pointer hover:scale-105 transition-transform duration-200"
            style={{
              background: generateConicGradient(statusData),
              transform: 'rotate(-90deg)' // Start from top
            }}
            onClick={() => router.push('/devices')}
            title="Click to view all devices"
          >
            {/* Inner white circle to create donut effect */}
            <div className="absolute inset-6 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center">
              <div className="text-center" style={{ transform: 'rotate(90deg)' }}>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {devices.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {devices.length === 1 ? 'Device' : 'Devices'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="space-y-3">
        {statusData.map((item) => (
          <div 
            key={item.status}
            className="flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors"
            onClick={() => handleSegmentClick(item.status)}
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {item.displayName}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {item.count}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-500 min-w-[3rem] text-right">
                {item.percentage}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

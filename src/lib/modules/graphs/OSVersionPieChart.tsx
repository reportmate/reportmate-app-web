/**
 * OS Version Combined Chart Component
 * Donut chart + bar chart with drill-down capability and synchronized filtering
 * Color gradient: newer versions = green, older versions = red (temperature gauge)
 */

'use client'

import { useRouter } from 'next/navigation'
import React, { useState, useMemo, useCallback } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
interface Device {
  deviceId: string
  serialNumber: string
  name: string
  platform?: string
  os?: string
  modules?: {
    system?: {
      operatingSystem?: {
        name?: string
        version?: string
        build?: string
        displayVersion?: string
        featureUpdate?: string
      }
    }
  }
  osVersion?: {
    name?: string
    version?: string
    build?: string
    displayVersion?: string
    featureUpdate?: string
  }
}

interface OSVersionPieChartProps {
  devices: Device[]
  loading: boolean
  osType: 'macOS' | 'Windows'
}

interface VersionDataPoint {
  name: string
  displayName: string
  sortKey: number
  value: number
  color: string
  children?: VersionDataPoint[]
  parentName?: string
}

// Temperature gradient: green (newest) -> yellow -> orange -> red (oldest)
const getTemperatureColor = (index: number, total: number): string => {
  if (total <= 1) return '#10B981' // Single item = green
  
  // Normalize index to 0-1 range (0 = newest = green, 1 = oldest = red)
  const ratio = index / (total - 1)
  
  // Color stops: green -> lime -> yellow -> orange -> red
  const colors = [
    { r: 16, g: 185, b: 129 },   // #10B981 - Emerald (newest)
    { r: 132, g: 204, b: 22 },   // #84CC16 - Lime
    { r: 234, g: 179, b: 8 },    // #EAB308 - Yellow
    { r: 249, g: 115, b: 22 },   // #F97316 - Orange
    { r: 239, g: 68, b: 68 },    // #EF4444 - Red (oldest)
  ]
  
  // Find which segment we're in
  const segment = ratio * (colors.length - 1)
  const startIdx = Math.floor(segment)
  const endIdx = Math.min(startIdx + 1, colors.length - 1)
  const t = segment - startIdx
  
  // Interpolate between colors
  const r = Math.round(colors[startIdx].r + (colors[endIdx].r - colors[startIdx].r) * t)
  const g = Math.round(colors[startIdx].g + (colors[endIdx].g - colors[startIdx].g) * t)
  const b = Math.round(colors[startIdx].b + (colors[endIdx].b - colors[startIdx].b) * t)
  
  return `rgb(${r}, ${g}, ${b})`
}

// Lighten a color for child slices
const lightenColor = (color: string, percent: number): string => {
  // Handle rgb format
  const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
  if (rgbMatch) {
    const r = Math.min(255, parseInt(rgbMatch[1]) + Math.round(2.55 * percent))
    const g = Math.min(255, parseInt(rgbMatch[2]) + Math.round(2.55 * percent))
    const b = Math.min(255, parseInt(rgbMatch[3]) + Math.round(2.55 * percent))
    return `rgb(${r}, ${g}, ${b})`
  }
  // Handle hex format
  const num = parseInt(color.replace('#', ''), 16)
  const amt = Math.round(2.55 * percent)
  const R = Math.min(255, (num >> 16) + amt)
  const G = Math.min(255, ((num >> 8) & 0x00FF) + amt)
  const B = Math.min(255, (num & 0x0000FF) + amt)
  return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`
}

// Process devices into hierarchical version data
// Mac: Donut shows point releases (15.4, 26.2), drill to patches (15.4.0, 15.4.1)
// Windows: Donut shows display version (24H2, 25H2), bars show full version (11.26200.7462.0)
const processVersionsHierarchical = (devices: Device[], osType: 'macOS' | 'Windows'): VersionDataPoint[] => {
  if (devices.length === 0) return []

  // Map: groupKey -> { count, sortKey, displayName, children }
  const versionGroups: Map<string, { 
    count: number
    sortKey: number
    displayName: string
    children: Map<string, { count: number; sortKey: number; displayName: string }>
  }> = new Map()

  devices.forEach(device => {
    const platformLower = device.platform?.toLowerCase() || ''
    const osName = device.modules?.system?.operatingSystem?.name?.toLowerCase() || 
                   device.osVersion?.name?.toLowerCase() || 
                   device.os?.toLowerCase() || ''

    const isTargetPlatform = osType === 'macOS'
      ? (platformLower === 'macos' || osName.includes('mac') || osName.includes('darwin'))
      : (platformLower === 'windows' || osName.includes('windows'))

    if (!isTargetPlatform) return

    const osInfo = device.osVersion || device.modules?.system?.operatingSystem
    if (!osInfo?.version) return

    if (osType === 'macOS') {
      // macOS: Group by major.minor (e.g., 15.4, 26.2), drill to full version
      const versionMatch = osInfo.version.match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?/)
      if (!versionMatch) return

      const major = parseInt(versionMatch[1])
      const minor = parseInt(versionMatch[2] || '0')
      const patch = parseInt(versionMatch[3] || '0')
      
      const groupKey = `${major}.${minor}` // Donut shows 15.4, 26.2
      const childKey = `${major}.${minor}.${patch}` // Bars/drill shows 15.4.0, 15.4.1
      const sortKey = major * 10000 + minor * 100 + patch

      if (!versionGroups.has(groupKey)) {
        versionGroups.set(groupKey, { 
          count: 0, 
          sortKey: major * 10000 + minor * 100,
          displayName: groupKey,
          children: new Map() 
        })
      }
      const group = versionGroups.get(groupKey)!
      group.count++
      
      if (!group.children.has(childKey)) {
        group.children.set(childKey, { count: 0, sortKey, displayName: childKey })
      }
      group.children.get(childKey)!.count++

    } else {
      // Windows: Group by Major.Build (e.g. 11.26200), drill to full version
      const nameMatch = osInfo.name?.match(/Windows\s+(\d+)/)
      const windowsVersion = nameMatch ? nameMatch[1] : '11'
      const majorNum = parseInt(windowsVersion)
      
      // Extract build number from version string (e.g., "10.0.26200" -> 26200)
      const versionParts = osInfo.version?.split('.') || []
      const build = versionParts[2] || osInfo.build || '0'
      const buildNum = parseInt(build)
      
      // Feature update from API
      const featureUpdate = (osInfo as any).featureUpdate || '0'
      const featureNum = parseInt(featureUpdate)
      
      // Group key: 11.26200 (MarketingMajor.Build)
      const groupKey = `${windowsVersion}.${build}`
      
      // Child key: 11.26200.1 (MarketingMajor.Build.Feature)
      const childKey = `${windowsVersion}.${build}.${featureNum > 0 ? featureNum : '0'}`
      
      // Sort key: higher = newer (based on build and feature numbers)
      const groupSortKey = majorNum * 100000 + buildNum
      const childSortKey = majorNum * 100000000 + buildNum * 1000 + featureNum

      if (!versionGroups.has(groupKey)) {
        versionGroups.set(groupKey, { 
          count: 0, 
          sortKey: groupSortKey,
          displayName: groupKey,
          children: new Map() 
        })
      }
      const group = versionGroups.get(groupKey)!
      group.count++
      
      if (!group.children.has(childKey)) {
        group.children.set(childKey, { count: 0, sortKey: childSortKey, displayName: childKey })
      }
      group.children.get(childKey)!.count++
    }
  })

  // Sort groups by sortKey (newest first = highest sortKey)
  const sortedGroups = Array.from(versionGroups.entries())
    .sort((a, b) => b[1].sortKey - a[1].sortKey)

  // Assign colors based on position (index 0 = newest = green)
  const result: VersionDataPoint[] = sortedGroups.map(([key, data], index) => {
    const color = getTemperatureColor(index, sortedGroups.length)
    
    // Sort children by sortKey (newest first)
    const sortedChildren = Array.from(data.children.entries())
      .sort((a, b) => b[1].sortKey - a[1].sortKey)
    
    const children: VersionDataPoint[] = sortedChildren.map(([childKey, childData], childIndex) => ({
      name: childKey,
      displayName: childData.displayName,
      sortKey: childData.sortKey,
      value: childData.count,
      color: lightenColor(color, 5 + childIndex * 10),
      parentName: data.displayName
    }))

    return {
      name: key,
      displayName: data.displayName,
      sortKey: data.sortKey,
      value: data.count,
      color,
      children
    }
  })

  return result
}

// Custom tooltip component
const CustomTooltip = ({ active, payload, total }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    const percentage = total > 0 ? Math.round((data.value / total) * 100) : 0
    return (
      <div className="bg-white dark:bg-gray-800 px-2 py-1 shadow-lg rounded border border-gray-200 dark:border-gray-700 text-xs">
        <p className="font-medium text-gray-900 dark:text-white">{data.displayName || data.name}</p>
        <p className="text-gray-600 dark:text-gray-400">
          {data.value} ({percentage}%)
        </p>
      </div>
    )
  }
  return null
}

export const OSVersionPieChart: React.FC<OSVersionPieChartProps> = ({ devices, loading, osType }) => {
  const router = useRouter()
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  const versionData = useMemo(() => processVersionsHierarchical(devices, osType), [devices, osType])

  // Get donut data - show groups, or children when drilled down
  const donutData = useMemo(() => {
    if (selectedGroup) {
      const parent = versionData.find(d => d.name === selectedGroup)
      return parent?.children || []
    }
    return versionData
  }, [versionData, selectedGroup])

  // Get bar data - always show granular versions, filtered by selected group
  const barData = useMemo(() => {
    if (selectedGroup) {
      const parent = versionData.find(d => d.name === selectedGroup)
      return parent?.children || []
    }
    // Show groups (top level) when not drilled down
    return versionData
  }, [versionData, selectedGroup])

  const total = useMemo(() => {
    if (selectedGroup) {
      const parent = versionData.find(d => d.name === selectedGroup)
      return parent?.value || 0
    }
    return versionData.reduce((sum, item) => sum + item.value, 0)
  }, [versionData, selectedGroup])

  const maxBarCount = useMemo(() => Math.max(...barData.map(item => item.value), 1), [barData])

  const handleDonutClick = useCallback((entry: VersionDataPoint) => {
    if (!selectedGroup && entry.children && entry.children.length > 0) {
      setSelectedGroup(entry.name)
    } else {
      // Navigate to filtered view for leaf nodes
      router.push(`/devices/system?osVersion=${encodeURIComponent(entry.name)}`)
    }
  }, [selectedGroup, router])

  const handleBarClick = useCallback((entry: VersionDataPoint) => {
    // If clicking a group bar (top level), drill down
    if (!selectedGroup && entry.children && entry.children.length > 0) {
      setSelectedGroup(entry.name)
    } else {
      // Navigate to filtered view for leaf nodes or groups with no children
      router.push(`/devices/system?osVersion=${encodeURIComponent(entry.name)}`)
    }
  }, [selectedGroup, router])

  const handleBack = useCallback(() => {
    setSelectedGroup(null)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (versionData.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-500 dark:text-gray-400 text-sm">No {osType} devices found</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Back button when drilled down */}
      {selectedGroup && (
        <button
          onClick={handleBack}
          className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mb-2"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          All versions
        </button>
      )}

      {/* Combined layout: Donut on left, Bars on right */}
      <div className="flex gap-4 items-start">
        {/* Donut Chart - larger */}
        <div className="w-36 h-36 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={donutData}
                cx="50%"
                cy="50%"
                innerRadius={36}
                outerRadius={58}
                paddingAngle={2}
                dataKey="value"
                onClick={(_, index) => handleDonutClick(donutData[index])}
                style={{ cursor: !selectedGroup ? 'pointer' : 'default' }}
              >
                {donutData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    stroke={entry.color}
                    strokeWidth={1}
                    opacity={
                      hoveredItem && 
                      hoveredItem !== entry.name && 
                      hoveredItem !== entry.displayName &&
                      !entry.children?.some(c => c.name === hoveredItem || c.displayName === hoveredItem)
                        ? 0.4 
                        : 1
                    }
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip total={total} />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart - fills remaining space */}
        <div className="flex-1 overflow-y-auto max-h-40 space-y-1 no-scrollbar">
          {barData.map((item) => {
            const itemTotal = selectedGroup ? total : versionData.reduce((s, v) => s + v.value, 0)
            const percentage = itemTotal > 0 ? Math.round((item.value / itemTotal) * 100) : 0
            const barWidth = (item.value / maxBarCount) * 100
            const isHovered = hoveredItem === item.name || hoveredItem === item.displayName
            
            return (
              <div 
                key={item.name}
                className={`flex items-center gap-2 py-0.5 px-1 rounded cursor-pointer transition-all ${
                  isHovered ? 'bg-gray-100 dark:bg-gray-700' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
                onClick={() => handleBarClick(item)}
                onMouseEnter={() => setHoveredItem(item.name)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <div className="w-28 text-xs font-medium text-gray-700 dark:text-gray-300 truncate tabular-nums" title={item.displayName}>
                  {item.displayName}
                </div>
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded h-5 relative overflow-hidden">
                  <div 
                    className="h-full rounded transition-all duration-300 flex items-center justify-end pr-1"
                    style={{ 
                      width: `${Math.max(barWidth, 15)}%`, 
                      backgroundColor: item.color,
                      minWidth: item.value > 0 ? '24px' : '0px'
                    }}
                  >
                    <span className="text-[10px] font-medium text-white drop-shadow-sm">
                      {item.value}
                    </span>
                  </div>
                </div>
                <div className="w-10 text-xs text-gray-500 dark:text-gray-400 text-right tabular-nums">
                  {percentage}%
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

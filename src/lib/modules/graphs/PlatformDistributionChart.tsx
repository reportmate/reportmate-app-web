/**
 * Platform Distribution Chart Component
 * Interactive expandable platform cards with drill-down into catalog/usage/department
 * and fleet age indicators per platform.
 */

import React, { useState, useEffect, useCallback } from 'react'
import { getDevicePlatform } from '../../../providers/PlatformFilterProvider'

interface Device {
  deviceId: string
  serialNumber: string
  name: string
  model?: string
  os?: string
  platform?: string
  lastSeen: string
  status: string
  createdAt?: string
  department?: string
  location?: string
  catalog?: string
  usage?: string
  modules?: {
    system?: {
      operatingSystem?: {
        name: string
        version: string
        build: string
        architecture: string
        displayVersion?: string
        edition?: string
      }
    }
    hardware?: {
      processor?: {
        architecture: string
        name: string
        manufacturer: string
      }
    }
    inventory?: {
      catalog?: string
      usage?: string
      department?: string
      location?: string
    }
  }
}

interface PlatformDistributionChartProps {
  devices: Device[]
  loading: boolean
  filters?: {
    architecture?: string[]
    catalog?: string[]
    usage?: string[]
  }
  onFilterChange?: (filters: any) => void
}

interface AgeStats {
  averageAgeDays: number
  newestDate: string | null
  oldestDate: string | null
  devicesWithAge: number
  totalDevices: number
}

interface PlatformStats {
  platform: 'Windows' | 'macOS' | 'Linux' | 'Unknown'
  count: number
  percentage: number
  color: string
  architectures: { [key: string]: number }
  catalogs: { [key: string]: number }
  usages: { [key: string]: number }
  departments: { [key: string]: number }
  ageStats: AgeStats
}

interface UsageStats {
  usage: string
  count: number
  percentage: number
  architectures: { [key: string]: number }
  catalogs: { [key: string]: number }
  departments: { [key: string]: number }
}

// Helper function to detect platform from device
const detectPlatform = (device: Device): 'Windows' | 'macOS' | 'Linux' | 'Unknown' => {
  const result = getDevicePlatform(device)
  if (result === 'macOS') return 'macOS'
  if (result === 'Windows') return 'Windows'
  return 'Unknown'
}

// Helper function to get architecture from device
const getArchitecture = (device: Device): string => {
  // Try hardware module first
  const hwArch = device.modules?.hardware?.processor?.architecture
  if (hwArch) return normalizeArchitecture(hwArch)

  // Try system module
  const sysArch = device.modules?.system?.operatingSystem?.architecture
  if (sysArch) return normalizeArchitecture(sysArch)

  return 'Unknown'
}

// Helper function to normalize architecture names
const normalizeArchitecture = (arch: string): string => {
  if (!arch) return 'Unknown'
  
  const normalized = arch.toLowerCase().trim()
  
  // Normalize common architecture variations - check specific strings first
  if (normalized === 'arm x64 processor') return 'arm64'
  if (normalized.includes('arm64') || normalized.includes('aarch64')) return 'arm64'
  if (normalized.includes('arm') && normalized.includes('64')) return 'arm64'
  if (normalized === '64-bit' || normalized.includes('x64') || normalized.includes('amd64') || normalized.includes('x86_64')) return 'x64'
  if (normalized.includes('x86') && !normalized.includes('64')) return 'x86'
  if (normalized.includes('ia64')) return 'IA64'
  
  // Return original if no normalization needed
  return arch
}

// Helper function to get catalog from device
const getCatalog = (device: Device): string => {
  return device.catalog || device.modules?.inventory?.catalog || 'Unknown'
}

// Helper function to get usage from device
const getUsage = (device: Device): string => {
  return device.usage || device.modules?.inventory?.usage || 'Unknown'
}

// Helper function to get department from device
const getDepartment = (device: Device): string => {
  return device.department || device.modules?.inventory?.department || 'Unknown'
}

// Process platform distribution data
const processPlatformData = (devices: Device[], filters?: any): PlatformStats[] => {
  let filteredDevices = devices

  // Apply filters
  if (filters?.architecture?.length > 0) {
    filteredDevices = filteredDevices.filter(device => 
      filters.architecture.includes(getArchitecture(device))
    )
  }
  if (filters?.catalog?.length > 0) {
    filteredDevices = filteredDevices.filter(device => 
      filters.catalog.includes(getCatalog(device))
    )
  }
  if (filters?.usage?.length > 0) {
    filteredDevices = filteredDevices.filter(device => 
      filters.usage.includes(getUsage(device))
    )
  }

  const platformColors = {
    Windows: '#0078d4',
    macOS: '#007aff',
    Linux: '#fd7e14',
    Unknown: '#6c757d'
  }

  const emptyAgeStats: AgeStats = {
    averageAgeDays: 0, newestDate: null, oldestDate: null,
    devicesWithAge: 0, totalDevices: 0
  }

  // Initialize platform stats
  const platformCounts: { [key: string]: PlatformStats } = {}
  const platforms: ('Windows' | 'macOS' | 'Linux' | 'Unknown')[] = ['Windows', 'macOS', 'Linux', 'Unknown']
  // Track age timestamps per platform for computing stats in a second pass
  const ageDates: { [key: string]: number[] } = {}

  platforms.forEach(platform => {
    platformCounts[platform] = {
      platform,
      count: 0,
      percentage: 0,
      color: platformColors[platform],
      architectures: {},
      catalogs: {},
      usages: {},
      departments: {},
      ageStats: { ...emptyAgeStats }
    }
    ageDates[platform] = []
  })

  const now = Date.now()

  // Single pass: count devices by platform and collect all metadata
  filteredDevices.forEach(device => {
    const platform = detectPlatform(device)
    const architecture = getArchitecture(device)
    const catalog = getCatalog(device)
    const usage = getUsage(device)
    const department = getDepartment(device)
    const stats = platformCounts[platform]

    stats.count++
    
    if (architecture !== 'Unknown') {
      stats.architectures[architecture] = (stats.architectures[architecture] || 0) + 1
    }
    if (catalog !== 'Unknown') {
      stats.catalogs[catalog] = (stats.catalogs[catalog] || 0) + 1
    }
    if (usage !== 'Unknown') {
      stats.usages[usage] = (stats.usages[usage] || 0) + 1
    }
    if (department !== 'Unknown') {
      stats.departments[department] = (stats.departments[department] || 0) + 1
    }

    // Collect creation dates for age calculation
    const createdAt = device.createdAt
    if (createdAt) {
      const ts = new Date(createdAt).getTime()
      if (!isNaN(ts)) {
        ageDates[platform].push(ts)
      }
    }
  })

  // Compute age stats per platform
  platforms.forEach(platform => {
    const dates = ageDates[platform]
    const stats = platformCounts[platform]
    stats.ageStats.totalDevices = stats.count
    stats.ageStats.devicesWithAge = dates.length

    if (dates.length > 0) {
      const newest = Math.max(...dates)
      const oldest = Math.min(...dates)
      const totalAgeDays = dates.reduce((sum, ts) => sum + (now - ts) / 86400000, 0)
      stats.ageStats.averageAgeDays = totalAgeDays / dates.length
      stats.ageStats.newestDate = new Date(newest).toISOString()
      stats.ageStats.oldestDate = new Date(oldest).toISOString()
    }
  })

  // Calculate percentages based on known platforms only (excluding Unknown)
  const knownDevices = filteredDevices.filter(device => detectPlatform(device) !== 'Unknown')
  const totalKnownDevices = knownDevices.length
  
  Object.values(platformCounts).forEach(stats => {
    if (stats.platform !== 'Unknown') {
      stats.percentage = totalKnownDevices > 0 ? Math.round((stats.count / totalKnownDevices) * 100) : 0
    }
  })

  return Object.values(platformCounts)
    .filter(stats => stats.count > 0 && stats.platform !== 'Unknown')
    .sort((a, b) => b.count - a.count)
}

// Process usage-pivoted data for single-platform mode
const processUsageData = (devices: Device[], filters?: any): UsageStats[] => {
  let filteredDevices = devices

  if (filters?.architecture?.length > 0) {
    filteredDevices = filteredDevices.filter(device =>
      filters.architecture.includes(getArchitecture(device))
    )
  }
  if (filters?.catalog?.length > 0) {
    filteredDevices = filteredDevices.filter(device =>
      filters.catalog.includes(getCatalog(device))
    )
  }

  const usageCounts: { [key: string]: UsageStats } = {}

  filteredDevices.forEach(device => {
    const usage = getUsage(device)
    const architecture = getArchitecture(device)
    const catalog = getCatalog(device)
    const department = getDepartment(device)

    if (!usageCounts[usage]) {
      usageCounts[usage] = {
        usage,
        count: 0,
        percentage: 0,
        architectures: {},
        catalogs: {},
        departments: {}
      }
    }

    const stats = usageCounts[usage]
    stats.count++

    if (architecture !== 'Unknown') {
      stats.architectures[architecture] = (stats.architectures[architecture] || 0) + 1
    }
    if (catalog !== 'Unknown') {
      stats.catalogs[catalog] = (stats.catalogs[catalog] || 0) + 1
    }
    if (department !== 'Unknown') {
      stats.departments[department] = (stats.departments[department] || 0) + 1
    }
  })

  const total = filteredDevices.length
  Object.values(usageCounts).forEach(stats => {
    stats.percentage = total > 0 ? Math.round((stats.count / total) * 100) : 0
  })

  return Object.values(usageCounts).sort((a, b) => b.count - a.count)
}

// Sub-component: horizontal drill-down bar used inside expanded cards
// Platform icon SVGs - paths match PlatformToggle.tsx exactly
const PlatformIcon: React.FC<{ platform: string; className?: string }> = ({ platform, className = 'w-6 h-6' }) => {
  if (platform === 'Macintosh') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
      </svg>
    )
  }
  if (platform === 'Windows') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z"/>
      </svg>
    )
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <circle cx="12" cy="12" r="9" strokeWidth="1.5" />
    </svg>
  )
}

const DrillDownBar: React.FC<{ label: string; count: number; total: number }> = ({ label, count, total }) => {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-40 flex-shrink-0 text-gray-600 dark:text-gray-400 truncate" title={label}>{label}</span>
      <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-300 bg-purple-800" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right tabular-nums text-gray-500 dark:text-gray-400">{count}</span>
    </div>
  )
}

// Sub-component: collapsible section inside an expanded platform card
const DrillDownSection: React.FC<{ title: string; data: { [key: string]: number }; total: number }> = ({ title, data, total }) => {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1])
  if (entries.length === 0) return null
  return (
    <div>
      <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">{title}</h5>
      <div className="space-y-1">
        {entries.map(([label, count]) => (
          <DrillDownBar key={label} label={label} count={count} total={total} />
        ))}
      </div>
    </div>
  )
}

export const PlatformDistributionChart: React.FC<PlatformDistributionChartProps> = ({ 
  devices, 
  loading, 
  filters,
  onFilterChange 
}) => {
  const [platformStats, setPlatformStats] = useState<PlatformStats[]>([])
  const [usageStats, setUsageStats] = useState<UsageStats[]>([])
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null)
  const [expandedUsage, setExpandedUsage] = useState<string | null>(null)
  const [availableFilters, setAvailableFilters] = useState({
    architectures: [] as string[],
    catalogs: [] as string[],
    usages: [] as string[]
  })

  // Detect single-platform mode (global platform filter active)
  const singlePlatformMode = platformStats.length === 1

  useEffect(() => {
    if (loading || devices.length === 0) {
      setPlatformStats([])
      setUsageStats([])
      return
    }

    const stats = processPlatformData(devices, filters)
    setPlatformStats(stats)

    // When single platform, also compute usage-pivoted data
    if (stats.length === 1) {
      setUsageStats(processUsageData(devices, filters))
    } else {
      setUsageStats([])
    }

    const architectures = new Set<string>()
    const catalogs = new Set<string>()
    const usages = new Set<string>()

    devices.forEach(device => {
      const arch = getArchitecture(device)
      if (arch !== 'Unknown') architectures.add(arch)
      const catalog = getCatalog(device)
      if (catalog !== 'Unknown') catalogs.add(catalog)
      const usage = getUsage(device)
      if (usage !== 'Unknown') usages.add(usage)
    })

    setAvailableFilters({
      architectures: Array.from(architectures).sort(),
      catalogs: Array.from(catalogs).sort(),
      usages: Array.from(usages).sort()
    })
  }, [devices, loading, filters])

  const handleFilterChange = useCallback((filterType: string, value: string, checked: boolean) => {
    if (!onFilterChange) return
    const newFilter = checked ? [value] : []
    onFilterChange({ ...filters, [filterType]: newFilter })
  }, [onFilterChange, filters])

  const toggleExpand = useCallback((platform: string) => {
    setExpandedPlatform(prev => (prev === platform ? null : platform))
  }, [])

  const toggleUsageExpand = useCallback((usage: string) => {
    setExpandedUsage(prev => (prev === usage ? null : usage))
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map(i => (
          <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3 animate-pulse">
            <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full" />
            <div className="h-3 w-2/3 bg-gray-100 dark:bg-gray-800 rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (devices.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500 dark:text-gray-400 mb-2">No devices found</div>
        <p className="text-sm text-gray-600 dark:text-gray-400">Platform distribution will appear when devices are detected</p>
      </div>
    )
  }

  const hasActiveFilters = (filters?.architecture?.length ?? 0) > 0 || (filters?.catalog?.length ?? 0) > 0 || (filters?.usage?.length ?? 0) > 0

  // Single-platform mode: show usage breakdown as primary bars
  if (singlePlatformMode && usageStats.length > 0) {
    const platform = platformStats[0]
    const displayName = platform.platform === 'macOS' ? 'Macintosh' : platform.platform
    const totalDevices = platform.count

    return (
      <div className="space-y-3">
        {/* Platform context header */}
        <div className="flex items-center gap-2 pb-1">
          <div className="text-gray-400 dark:text-gray-500">
            <PlatformIcon platform={displayName} className="w-5 h-5" />
          </div>
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {displayName} — {totalDevices} {totalDevices === 1 ? 'device' : 'devices'} — by Usage
          </span>
        </div>

        {/* Usage cards */}
        {usageStats.map(stats => {
          const isExpanded = expandedUsage === stats.usage

          return (
            <div key={stats.usage} className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden transition-shadow hover:shadow-md">
              <button
                onClick={() => toggleUsageExpand(stats.usage)}
                className="w-full text-left px-4 py-3 flex items-center gap-3 group hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors cursor-pointer"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-base font-semibold text-gray-900 dark:text-white">{stats.usage}</span>
                    <span className="text-sm text-gray-400 dark:text-gray-500">{stats.percentage}%</span>
                  </div>
                  <div className="mt-1.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 bg-purple-800"
                      style={{ width: `${stats.percentage}%` }}
                    />
                  </div>
                </div>

                <div className="flex-shrink-0 flex items-center gap-3">
                  <span className="font-semibold text-lg tabular-nums text-gray-900 dark:text-white">{stats.count}</span>
                </div>

                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isExpanded && (
                <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-4 bg-gray-50/50 dark:bg-gray-800/50 space-y-4">
                  <DrillDownSection title="Architecture" data={stats.architectures} total={stats.count} />
                  <DrillDownSection title="Catalog" data={stats.catalogs} total={stats.count} />
                  <DrillDownSection title="Department" data={stats.departments} total={stats.count} />
                </div>
              )}
            </div>
          )
        })}

        {/* Filter pills — no Usage filter in single-platform mode (Usage is already the primary axis) */}
        {onFilterChange && (availableFilters.catalogs.length > 0 || availableFilters.architectures.length > 0) && (
          <div className="pt-2 space-y-2">
            {availableFilters.catalogs.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 w-14 flex-shrink-0">Catalog</span>
                {availableFilters.catalogs.slice(0, 6).map(catalog => {
                  const isSelected = filters?.catalog?.includes(catalog) || false
                  return (
                    <button
                      key={catalog}
                      onClick={() => handleFilterChange('catalog', catalog, !isSelected)}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 ring-1 ring-green-300 dark:ring-green-700'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {catalog}
                    </button>
                  )
                })}
              </div>
            )}
            {availableFilters.architectures.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 w-14 flex-shrink-0">Arch</span>
                {availableFilters.architectures.map(arch => {
                  const isSelected = filters?.architecture?.includes(arch) || false
                  return (
                    <button
                      key={arch}
                      onClick={() => handleFilterChange('architecture', arch, !isSelected)}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 ring-1 ring-blue-300 dark:ring-blue-700'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {arch}
                    </button>
                  )
                })}
              </div>
            )}
            {hasActiveFilters && (
              <div className="pt-1">
                <button
                  onClick={() => onFilterChange({})}
                  className="px-2.5 py-0.5 text-xs font-medium text-yellow-700 bg-yellow-50 hover:bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-900/30 dark:hover:bg-yellow-900/50 border border-yellow-200 dark:border-yellow-800 rounded-full transition-colors"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Platform cards */}
      {platformStats.map(stats => {
        const isExpanded = expandedPlatform === stats.platform
        const displayName = stats.platform === 'macOS' ? 'Macintosh' : stats.platform

        return (
          <div key={stats.platform} className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden transition-shadow hover:shadow-md">
            {/* Card header - always visible, clickable to expand */}
            <button
              onClick={() => toggleExpand(stats.platform)}
              className="w-full text-left px-4 py-3 flex items-center gap-3 group hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors cursor-pointer"
            >
              {/* Platform icon */}
              <div className="flex-shrink-0 text-gray-400 dark:text-gray-500">
                <PlatformIcon platform={displayName} className="w-7 h-7" />
              </div>

              {/* Platform name + count */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-base font-semibold text-gray-900 dark:text-white">{displayName}</span>
                  <span className="text-sm text-gray-400 dark:text-gray-500">{stats.percentage}%</span>
                </div>

                {/* Percentage bar */}
                <div className="mt-1.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 bg-purple-800"
                    style={{ width: `${stats.percentage}%` }}
                  />
                </div>
              </div>

              {/* Device count - prominent */}
              <div className="flex-shrink-0 flex items-center gap-3">
                <span className="font-semibold text-lg tabular-nums text-gray-900 dark:text-white">{stats.count}</span>
              </div>

              {/* Expand chevron */}
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Expanded drill-down */}
            {isExpanded && (
              <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-4 bg-gray-50/50 dark:bg-gray-800/50 space-y-4">
                {/* Architecture breakdown */}
                <DrillDownSection title="Architecture" data={stats.architectures} total={stats.count} />

                {/* Usage breakdown */}
                <DrillDownSection title="Usage" data={stats.usages} total={stats.count} />

                {/* Catalog breakdown */}
                <DrillDownSection title="Catalog" data={stats.catalogs} total={stats.count} />

                {/* Department breakdown */}
                <DrillDownSection title="Department" data={stats.departments} total={stats.count} />
              </div>
            )}
          </div>
        )
      })}

      {/* Filter pills row */}
      {onFilterChange && (availableFilters.usages.length > 0 || availableFilters.catalogs.length > 0 || availableFilters.architectures.length > 0) && (
        <div className="pt-2 space-y-2">
          {/* Usage pills */}
          {availableFilters.usages.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 w-14 flex-shrink-0">Usage</span>
              {availableFilters.usages.slice(0, 6).map(usage => {
                const isSelected = filters?.usage?.includes(usage) || false
                return (
                  <button
                    key={usage}
                    onClick={() => handleFilterChange('usage', usage, !isSelected)}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 ring-1 ring-purple-300 dark:ring-purple-700'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {usage}
                  </button>
                )
              })}
            </div>
          )}

          {/* Catalog pills */}
          {availableFilters.catalogs.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 w-14 flex-shrink-0">Catalog</span>
              {availableFilters.catalogs.slice(0, 6).map(catalog => {
                const isSelected = filters?.catalog?.includes(catalog) || false
                return (
                  <button
                    key={catalog}
                    onClick={() => handleFilterChange('catalog', catalog, !isSelected)}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 ring-1 ring-green-300 dark:ring-green-700'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {catalog}
                  </button>
                )
              })}
            </div>
          )}

          {/* Architecture pills */}
          {availableFilters.architectures.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 w-14 flex-shrink-0">Arch</span>
              {availableFilters.architectures.map(arch => {
                const isSelected = filters?.architecture?.includes(arch) || false
                return (
                  <button
                    key={arch}
                    onClick={() => handleFilterChange('architecture', arch, !isSelected)}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 ring-1 ring-blue-300 dark:ring-blue-700'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {arch}
                  </button>
                )
              })}
            </div>
          )}

          {/* Clear filters */}
          {hasActiveFilters && (
            <div className="pt-1">
              <button
                onClick={() => onFilterChange({})}
                className="px-2.5 py-0.5 text-xs font-medium text-yellow-700 bg-yellow-50 hover:bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-900/30 dark:hover:bg-yellow-900/50 border border-yellow-200 dark:border-yellow-800 rounded-full transition-colors"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default PlatformDistributionChart

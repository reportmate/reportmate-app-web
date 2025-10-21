/**
 * Platform Distribution Chart Component
 * Displays Windows vs macOS distribution with filters
 */

import React, { useState, useEffect } from 'react'

interface Device {
  deviceId: string
  serialNumber: string
  name: string
  model?: string
  os?: string
  platform?: string  // Fast API platform detection
  lastSeen: string
  status: string  // Made flexible to handle API response variations
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

interface PlatformStats {
  platform: 'Windows' | 'macOS' | 'Linux' | 'Unknown'
  count: number
  percentage: number
  color: string
  architectures: { [key: string]: number }
  catalogs: { [key: string]: number }
  usages: { [key: string]: number }
}

// Helper function to detect platform from device
const detectPlatform = (device: Device): 'Windows' | 'macOS' | 'Linux' | 'Unknown' => {
  // CRITICAL FIX: Always trust the API platform field - it's already correctly detected
  if (device.platform) {
    const platformLower = device.platform.toLowerCase()
    if (platformLower === 'windows') return 'Windows'
    if (platformLower === 'macos') return 'macOS'
    if (platformLower === 'linux') return 'Linux'
  }
  
  // Fallback: Check system module OS info (for devices with detailed data)
  const systemOS = device.modules?.system?.operatingSystem?.name?.toLowerCase()
  if (systemOS) {
    if (systemOS.includes('windows')) return 'Windows'
    if (systemOS.includes('mac') || systemOS.includes('darwin')) return 'macOS'
    if (systemOS.includes('linux')) return 'Linux'
  }

  // Fallback: Check legacy OS field
  const os = device.os?.toLowerCase()
  if (os) {
    if (os.includes('windows')) return 'Windows'
    if (os.includes('mac') || os.includes('darwin')) return 'macOS'
    if (os.includes('linux')) return 'Linux'
  }

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
  return device.modules?.inventory?.catalog || 'Unknown'
}

// Helper function to get usage from device
const getUsage = (device: Device): string => {
  return device.modules?.inventory?.usage || 'Unknown'
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

  const platformCounts: { [key: string]: PlatformStats } = {}
  const platformColors = {
    Windows: '#0078d4',
    macOS: '#007aff',
    Linux: '#fd7e14',
    Unknown: '#6c757d'
  }

  // Initialize platform stats
  const platforms: ('Windows' | 'macOS' | 'Linux' | 'Unknown')[] = ['Windows', 'macOS', 'Linux', 'Unknown']
  platforms.forEach(platform => {
    platformCounts[platform] = {
      platform,
      count: 0,
      percentage: 0,
      color: platformColors[platform],
      architectures: {},
      catalogs: {},
      usages: {}
    }
  })

  // Count devices by platform and collect metadata
  filteredDevices.forEach(device => {
    const platform = detectPlatform(device)
    const architecture = getArchitecture(device)
    const catalog = getCatalog(device)
    const usage = getUsage(device)

    platformCounts[platform].count++
    
    // Track architectures
    if (architecture !== 'Unknown') {
      platformCounts[platform].architectures[architecture] = 
        (platformCounts[platform].architectures[architecture] || 0) + 1
    }
    
    // Track catalogs
    if (catalog !== 'Unknown') {
      platformCounts[platform].catalogs[catalog] = 
        (platformCounts[platform].catalogs[catalog] || 0) + 1
    }
    
    // Track usage
    if (usage !== 'Unknown') {
      platformCounts[platform].usages[usage] = 
        (platformCounts[platform].usages[usage] || 0) + 1
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

  // Return only platforms with devices, sorted by count, and exclude "Unknown" platforms
  return Object.values(platformCounts)
    .filter(stats => stats.count > 0 && stats.platform !== 'Unknown')
    .sort((a, b) => b.count - a.count)
}

export const PlatformDistributionChart: React.FC<PlatformDistributionChartProps> = ({ 
  devices, 
  loading, 
  filters,
  onFilterChange 
}) => {
  const [platformStats, setPlatformStats] = useState<PlatformStats[]>([])
  const [availableFilters, setAvailableFilters] = useState({
    architectures: [] as string[],
    catalogs: [] as string[],
    usages: [] as string[]
  })

  useEffect(() => {
    if (loading || devices.length === 0) {
      setPlatformStats([])
      return
    }

    // Process platform data
    const stats = processPlatformData(devices, filters)
    setPlatformStats(stats)

    // Extract available filter options from all devices
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

  const handleFilterChange = (filterType: string, value: string, checked: boolean) => {
    if (!onFilterChange) return

    const currentFilter = (filters as any)?.[filterType] || []
    const newFilter = checked 
      ? [...currentFilter, value]
      : currentFilter.filter((v: string) => v !== value)

    onFilterChange({
      ...filters,
      [filterType]: newFilter
    })
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  if (devices.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500 dark:text-gray-400 mb-2">
          No devices found
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Platform distribution will appear when devices are detected
        </p>
      </div>
    )
  }

  const totalDevices = platformStats.reduce((sum, stats) => sum + stats.count, 0)
  const maxCount = Math.max(...platformStats.map(stats => stats.count))

  return (
    <div className="space-y-6">
      {/* Platform Distribution Chart with Side Filters */}
      <div className="flex gap-6">
        {/* Chart Section */}
        <div className="flex-1 space-y-3">
          {platformStats.map((stats, index) => {
            const barWidth = maxCount > 0 ? (stats.count / maxCount) * 100 : 0
            
            return (
              <div key={stats.platform} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: stats.color }}
                    ></div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {stats.platform}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {stats.count} devices ({stats.percentage}%)
                  </div>
                </div>
                
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-6 relative overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                    style={{ 
                      width: `${barWidth}%`, 
                      backgroundColor: stats.color,
                      minWidth: stats.count > 0 ? '8px' : '0px'
                    }}
                  >
                    <span className="text-xs font-medium text-white">
                      {stats.count}
                    </span>
                  </div>
                </div>
                
                {/* Platform Details */}
                <div className="ml-7 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                  {Object.keys(stats.architectures).length > 0 && (
                    <div>
                      <span className="font-medium">Architectures:</span>{' '}
                      {Object.entries(stats.architectures)
                        .map(([arch, count]) => `${arch} (${count})`)
                        .join(', ')}
                    </div>
                  )}
                  {Object.keys(stats.catalogs).length > 0 && (
                    <div>
                      <span className="font-medium">Catalogs:</span>{' '}
                      {Object.entries(stats.catalogs)
                        .slice(0, 3)
                        .map(([catalog, count]) => `${catalog} (${count})`)
                        .join(', ')}
                      {Object.keys(stats.catalogs).length > 3 && (
                        <span> +{Object.keys(stats.catalogs).length - 3} more</span>
                      )}
                    </div>
                  )}
                  {Object.keys(stats.usages).length > 0 && (
                    <div>
                      <span className="font-medium">Usage:</span>{' '}
                      {Object.entries(stats.usages)
                        .slice(0, 3)
                        .map(([usage, count]) => `${usage} (${count})`)
                        .join(', ')}
                      {Object.keys(stats.usages).length > 3 && (
                        <span> +{Object.keys(stats.usages).length - 3} more</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Filter Controls - Right Side */}
        {onFilterChange && (availableFilters.architectures.length > 0 || availableFilters.catalogs.length > 0 || availableFilters.usages.length > 0) && (
          <div className="w-64 flex-shrink-0 space-y-4">
            
            {/* Usage Filter */}
            {availableFilters.usages.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Usage</h4>
                <div className="flex flex-wrap gap-2">
                  {availableFilters.usages.slice(0, 6).map(usage => {
                    const isSelected = filters?.usage?.includes(usage) || false
                    return (
                      <button
                        key={usage}
                        onClick={() => handleFilterChange('usage', usage, !isSelected)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 border border-purple-200 dark:border-purple-700'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {usage}
                      </button>
                    )
                  })}
                  {availableFilters.usages.length > 6 && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                      +{availableFilters.usages.length - 6} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Catalog Filter */}
            {availableFilters.catalogs.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Catalog</h4>
                <div className="flex flex-wrap gap-2">
                  {availableFilters.catalogs.slice(0, 6).map(catalog => {
                    const isSelected = filters?.catalog?.includes(catalog) || false
                    return (
                      <button
                        key={catalog}
                        onClick={() => handleFilterChange('catalog', catalog, !isSelected)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border border-green-200 dark:border-green-700'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {catalog}
                      </button>
                    )
                  })}
                  {availableFilters.catalogs.length > 6 && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                      +{availableFilters.catalogs.length - 6} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Architecture Filter */}
            {availableFilters.architectures.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Architecture</h4>
                <div className="flex flex-wrap gap-2">
                  {availableFilters.architectures.map(arch => {
                    const isSelected = filters?.architecture?.includes(arch) || false
                    return (
                      <button
                        key={arch}
                        onClick={() => handleFilterChange('architecture', arch, !isSelected)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-700'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {arch}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default PlatformDistributionChart

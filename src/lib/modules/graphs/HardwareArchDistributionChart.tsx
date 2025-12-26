/**
 * Hardware Architecture Distribution Chart Component
 * Displays distribution of CPU architectures (ARM64, x64, x86, etc.)
 */

import React, { useState, useEffect } from 'react'

interface Device {
  deviceId: string
  serialNumber: string
  name: string
  model?: string
  os?: string
  platform?: string  // API platform detection
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
        cores?: number
        maxSpeed?: number
      }
      manufacturer?: string
      model?: string
    }
    inventory?: {
      catalog?: string
      usage?: string
    }
  }
}

interface HardwareArchDistributionChartProps {
  devices: Device[]
  loading: boolean
  filters?: {
    platform?: string[]
    manufacturer?: string[]
    catalog?: string[]
    usage?: string[]
  }
  onFilterChange?: (filters: any) => void
}

interface ArchStats {
  architecture: string
  count: number
  percentage: number
  color: string
  platforms: { [key: string]: number }
  manufacturers: { [key: string]: number }
  catalogs: { [key: string]: number }
  usages: { [key: string]: number }
  processorNames: { [key: string]: number }
}

// Helper function to detect platform from device
const detectPlatform = (device: Device): string | null => {
  // CRITICAL FIX: Trust the API platform field - it's already correctly detected
  if (device.platform) {
    const platformLower = device.platform.toLowerCase()
    if (platformLower === 'windows') return 'Windows'
    if (platformLower === 'macos') return 'macOS'
    if (platformLower === 'linux') return 'Linux'
  }
  
  const systemOS = device.modules?.system?.operatingSystem?.name?.toLowerCase()
  if (systemOS) {
    if (systemOS.includes('windows')) return 'Windows'
    if (systemOS.includes('mac') || systemOS.includes('darwin')) return 'macOS'
    if (systemOS.includes('linux')) return 'Linux'
  }

  const os = device.os?.toLowerCase()
  if (os) {
    if (os.includes('windows')) return 'Windows'
    if (os.includes('mac') || os.includes('darwin')) return 'macOS'
    if (os.includes('linux')) return 'Linux'
  }

  // NO FAKE DATA - Return null for unknown platforms
  return null
}

// Helper function to get architecture from device
const getArchitecture = (device: Device): string => {
  // Try hardware module first (most specific)
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
  
  // Normalize common architecture variations
  if (normalized.includes('arm64') || normalized.includes('aarch64')) return 'ARM64'
  if (normalized.includes('arm') && normalized.includes('64')) return 'ARM64'
  if (normalized.includes('x64') || normalized.includes('amd64') || normalized.includes('x86_64')) return 'x64'
  if (normalized.includes('x86') && !normalized.includes('64')) return 'x86'
  if (normalized.includes('ia64')) return 'IA64'
  
  // Return original if no normalization needed
  return arch
}

// Helper function to get processor manufacturer
const getProcessorManufacturer = (device: Device): string => {
  const manufacturer = device.modules?.hardware?.processor?.manufacturer
  if (manufacturer) return manufacturer

  // Try to infer from processor name
  const processorName = device.modules?.hardware?.processor?.name?.toLowerCase()
  if (processorName) {
    if (processorName.includes('intel')) return 'Intel'
    if (processorName.includes('amd')) return 'AMD'
    if (processorName.includes('qualcomm') || processorName.includes('snapdragon')) return 'Qualcomm'
    if (processorName.includes('apple')) return 'Apple'
    if (processorName.includes('arm')) return 'ARM'
  }

  return 'Unknown'
}

// Helper function to get catalog from device
const getCatalog = (device: Device): string => {
  return device.modules?.inventory?.catalog || 'Unknown'
}

// Helper function to get usage from device
const getUsage = (device: Device): string => {
  return device.modules?.inventory?.usage || 'Unknown'
}

// Helper function to clean processor name for display
const cleanProcessorName = (name: string): string => {
  if (!name) return 'Unknown'
  
  // Remove common suffixes and clean up
  return name
    .replace(/@ \d+\.\d+\s*GHz/gi, '') // Remove frequency
    .replace(/\d+-core/gi, '') // Remove core count
    .replace(/CPU/gi, '')
    .replace(/Processor/gi, '')
    .trim()
    .substring(0, 50) // Limit length
}

// Process architecture distribution data
const processArchitectureData = (devices: Device[], filters?: any): ArchStats[] => {
  let filteredDevices = devices

  // Apply filters
  if (filters?.platform?.length > 0) {
    filteredDevices = filteredDevices.filter(device => 
      filters.platform.includes(detectPlatform(device))
    )
  }
  if (filters?.manufacturer?.length > 0) {
    filteredDevices = filteredDevices.filter(device => 
      filters.manufacturer.includes(getProcessorManufacturer(device))
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

  const archCounts: { [key: string]: ArchStats } = {}
  const archColors = {
    'ARM64': '#28a745',
    'x64': '#007bff',
    'AMD64': '#007bff',
    'x86': '#6c757d',
    'ARM': '#17a2b8',
    'Unknown': '#6c757d'
  }

  // Count devices by architecture and collect metadata
  filteredDevices.forEach(device => {
    const architecture = getArchitecture(device)
    const platform = detectPlatform(device)
    const manufacturer = getProcessorManufacturer(device)
    const catalog = getCatalog(device)
    const usage = getUsage(device)
    const processorName = cleanProcessorName(device.modules?.hardware?.processor?.name || '')

    if (!archCounts[architecture]) {
      archCounts[architecture] = {
        architecture,
        count: 0,
        percentage: 0,
        color: archColors[architecture as keyof typeof archColors] || '#6c757d',
        platforms: {},
        manufacturers: {},
        catalogs: {},
        usages: {},
        processorNames: {}
      }
    }

    archCounts[architecture].count++
    
    // Track platforms
    if (platform) {
      archCounts[architecture].platforms[platform] = 
        (archCounts[architecture].platforms[platform] || 0) + 1
    }
    
    // Track manufacturers
    if (manufacturer !== 'Unknown') {
      archCounts[architecture].manufacturers[manufacturer] = 
        (archCounts[architecture].manufacturers[manufacturer] || 0) + 1
    }
    
    // Track catalogs
    if (catalog !== 'Unknown') {
      archCounts[architecture].catalogs[catalog] = 
        (archCounts[architecture].catalogs[catalog] || 0) + 1
    }
    
    // Track usage
    if (usage !== 'Unknown') {
      archCounts[architecture].usages[usage] = 
        (archCounts[architecture].usages[usage] || 0) + 1
    }

    // Track processor names
    if (processorName !== 'Unknown') {
      archCounts[architecture].processorNames[processorName] = 
        (archCounts[architecture].processorNames[processorName] || 0) + 1
    }
  })

  // Calculate percentages
  const totalDevices = filteredDevices.length
  Object.values(archCounts).forEach(stats => {
    stats.percentage = totalDevices > 0 ? Math.round((stats.count / totalDevices) * 100) : 0
  })

  // Return sorted by count
  return Object.values(archCounts)
    .filter(stats => stats.count > 0)
    .sort((a, b) => b.count - a.count)
}

export const HardwareArchDistributionChart: React.FC<HardwareArchDistributionChartProps> = ({ 
  devices, 
  loading, 
  filters,
  onFilterChange 
}) => {
  const [archStats, setArchStats] = useState<ArchStats[]>([])
  const [availableFilters, setAvailableFilters] = useState({
    platforms: [] as string[],
    manufacturers: [] as string[],
    catalogs: [] as string[],
    usages: [] as string[]
  })

  useEffect(() => {
    if (loading || devices.length === 0) {
      setArchStats([])
      return
    }

    // Process architecture data
    const stats = processArchitectureData(devices, filters)
    setArchStats(stats)

    // Extract available filter options from all devices
    const platforms = new Set<string>()
    const manufacturers = new Set<string>()
    const catalogs = new Set<string>()
    const usages = new Set<string>()

    devices.forEach(device => {
      const platform = detectPlatform(device)
      if (platform) platforms.add(platform)
      
      const manufacturer = getProcessorManufacturer(device)
      if (manufacturer !== 'Unknown') manufacturers.add(manufacturer)
      
      const catalog = getCatalog(device)
      if (catalog !== 'Unknown') catalogs.add(catalog)
      
      const usage = getUsage(device)
      if (usage !== 'Unknown') usages.add(usage)
    })

    setAvailableFilters({
      platforms: Array.from(platforms).sort(),
      manufacturers: Array.from(manufacturers).sort(),
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
          Architecture distribution will appear when devices are detected
        </p>
      </div>
    )
  }

  const totalDevices = archStats.reduce((sum, stats) => sum + stats.count, 0)
  const maxCount = Math.max(...archStats.map(stats => stats.count))

  return (
    <div className="space-y-6">
      {/* Architecture Distribution Chart */}
      <div className="space-y-3">
        {archStats.map((stats, index) => {
          const barWidth = maxCount > 0 ? (stats.count / maxCount) * 100 : 0
          
          return (
            <div key={stats.architecture} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: stats.color }}
                  ></div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {stats.architecture}
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
              
              {/* Architecture Details */}
              <div className="ml-7 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                {Object.keys(stats.platforms).length > 0 && (
                  <div>
                    <span className="font-medium">Platforms:</span>{' '}
                    {Object.entries(stats.platforms)
                      .map(([platform, count]) => `${platform} (${count})`)
                      .join(', ')}
                  </div>
                )}
                {Object.keys(stats.manufacturers).length > 0 && (
                  <div>
                    <span className="font-medium">Manufacturers:</span>{' '}
                    {Object.entries(stats.manufacturers)
                      .map(([manufacturer, count]) => `${manufacturer} (${count})`)
                      .join(', ')}
                  </div>
                )}
                {Object.keys(stats.processorNames).length > 0 && (
                  <div>
                    <span className="font-medium">Top Processors:</span>{' '}
                    {Object.entries(stats.processorNames)
                      .sort(([, a], [, b]) => (b as number) - (a as number))
                      .slice(0, 2)
                      .map(([name, count]) => `${name} (${count})`)
                      .join(', ')}
                    {Object.keys(stats.processorNames).length > 2 && (
                      <span> +{Object.keys(stats.processorNames).length - 2} more</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Filter Controls */}
      {onFilterChange && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
          
          {/* Platform Filter */}
          {availableFilters.platforms.length > 0 && (
            <div>
              <div className="flex flex-wrap gap-2">
                {availableFilters.platforms.map(platform => {
                  const isSelected = filters?.platform?.includes(platform) || false
                  return (
                    <button
                      key={platform}
                      onClick={() => handleFilterChange('platform', platform, !isSelected)}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-700'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {platform}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Manufacturer Filter */}
          {availableFilters.manufacturers.length > 0 && (
            <div>
              <div className="flex flex-wrap gap-2">
                {availableFilters.manufacturers.map(manufacturer => {
                  const isSelected = filters?.manufacturer?.includes(manufacturer) || false
                  return (
                    <button
                      key={manufacturer}
                      onClick={() => handleFilterChange('manufacturer', manufacturer, !isSelected)}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border border-green-200 dark:border-green-700'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {manufacturer}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Catalog Filter */}
          {availableFilters.catalogs.length > 0 && (
            <div>
              <div className="flex flex-wrap gap-2">
                {availableFilters.catalogs.slice(0, 4).map(catalog => {
                  const isSelected = filters?.catalog?.includes(catalog) || false
                  return (
                    <button
                      key={catalog}
                      onClick={() => handleFilterChange('catalog', catalog, !isSelected)}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-700'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {catalog}
                    </button>
                  )
                })}
                {availableFilters.catalogs.length > 4 && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                    +{availableFilters.catalogs.length - 4} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Usage Filter */}
          {availableFilters.usages.length > 0 && (
            <div>
              <div className="flex flex-wrap gap-2">
                {availableFilters.usages.slice(0, 4).map(usage => {
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
                {availableFilters.usages.length > 4 && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                    +{availableFilters.usages.length - 4} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default HardwareArchDistributionChart

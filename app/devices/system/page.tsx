"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { formatRelativeTime } from "../../../src/lib/time"
import { OSVersionPieChart } from "../../../src/lib/modules/graphs/OSVersionPieChart"
import { useDeviceData } from "../../../src/hooks/useDeviceData"
import { usePlatformFilterSafe, normalizePlatform } from "../../../src/providers/PlatformFilterProvider"

interface SystemDevice {
  id: string
  deviceId: string
  deviceName: string
  serialNumber: string
  assetTag?: string
  lastSeen: string
  collectedAt: string
  usage?: string
  catalog?: string
  location?: string
  operatingSystem: string
  osVersion: string | null
  buildNumber: string | null
  uptime: number | null
  bootTime: string | null
  servicesCount: number
  updatesCount: number
  tasksCount: number
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      {/* Main Content Skeleton */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          {/* Title Section Skeleton */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="animate-pulse">
                <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
              <div className="animate-pulse">
                <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            </div>
          </div>

          {/* Analytics Charts Skeleton */}
          <div className="px-6 py-6 border-b border-gray-200 dark:border-gray-700">
            <div className="space-y-6">
              {/* OS Version Charts Skeleton */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Windows Chart Skeleton */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3 animate-pulse">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg"></div>
                      <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="max-h-64 space-y-3">
                      {/* Show 4 bar skeletons to match new height */}
                      {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="flex items-center gap-3 p-2 rounded-lg animate-pulse">
                          <div className="w-32 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                          <div className="flex-1 flex items-center gap-3">
                            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-6"></div>
                            <div className="w-12 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* macOS Chart Skeleton */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3 animate-pulse">
                      <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-lg"></div>
                      <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="text-center py-8">
                      <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded mx-auto animate-pulse"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Search Section Skeleton */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="animate-pulse">
              <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            </div>
          </div>

          {/* Table Skeleton */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3">
                    <div className="h-4 w-16 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
                  </th>
                  <th className="px-6 py-3">
                    <div className="h-4 w-24 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
                  </th>
                  <th className="px-6 py-3">
                    <div className="h-4 w-16 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
                  </th>
                  <th className="px-6 py-3">
                    <div className="h-4 w-16 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
                  </th>
                  <th className="px-6 py-3">
                    <div className="h-4 w-16 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
                  </th>
                  <th className="px-6 py-3">
                    <div className="h-4 w-20 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {[...Array(8)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4">
                      <div className="animate-pulse">
                        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-1"></div>
                        <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="animate-pulse">
                        <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-1"></div>
                        <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="animate-pulse">
                        <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="animate-pulse">
                        <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="animate-pulse">
                        <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="animate-pulse">
                        <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  
  if (days > 0) {
    return `${days}d ${hours}h`
  } else if (hours > 0) {
    return `${hours}h ${mins}m`
  } else {
    return `${mins}m`
  }
}

function SystemPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { platformFilter: globalPlatformFilter, isPlatformVisible } = usePlatformFilterSafe()
  const [loading, setLoading] = useState(true)
  const [systems, setSystems] = useState<SystemDevice[]>([])
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const osVersionFilter = searchParams.get('osVersion') // Get OS version filter from URL

  const [platformFilter, setPlatformFilter] = useState('all')
  const [activationFilter, setActivationFilter] = useState('all')
  const [firmwareLicenseFilter, setFirmwareLicenseFilter] = useState('all')
  
  // Loading progress state (for progress bar)
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 })
  const [loadingMessage, setLoadingMessage] = useState<string>('')
  
  // Filters accordion state
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [selectedUsages, setSelectedUsages] = useState<string[]>([])
  const [selectedCatalogs, setSelectedCatalogs] = useState<string[]>([])
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [selectedEditions, setSelectedEditions] = useState<string[]>([])
  const [selectedActivationStatus, setSelectedActivationStatus] = useState<string[]>([])
  const [selectedLicenseType, setSelectedLicenseType] = useState<string[]>([])
  
  // Widgets accordion state
  const [widgetsExpanded, setWidgetsExpanded] = useState(true)
  
  // Sorting state
  const [sortColumn, setSortColumn] = useState<'device' | 'os' | 'version' | 'uptime' | 'lastSeen'>('device')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  
  const handleSort = (column: typeof sortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  // Toggle functions for filters
  const toggleUsage = (usage: string) => {
    setSelectedUsages(prev => 
      prev.includes(usage) ? prev.filter(u => u !== usage) : [...prev, usage]
    )
  }
  
  const toggleCatalog = (catalog: string) => {
    setSelectedCatalogs(prev => 
      prev.includes(catalog) ? prev.filter(c => c !== catalog) : [...prev, catalog]
    )
  }
  
  const toggleLocation = (location: string) => {
    setSelectedLocations(prev => 
      prev.includes(location) ? prev.filter(l => l !== location) : [...prev, location]
    )
  }
  
  const toggleEdition = (edition: string) => {
    setSelectedEditions(prev => 
      prev.includes(edition) ? prev.filter(e => e !== edition) : [...prev, edition]
    )
  }
  
  const toggleActivationStatus = (status: string) => {
    setSelectedActivationStatus(prev => 
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    )
  }
  
  const toggleLicenseType = (type: string) => {
    setSelectedLicenseType(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    )
  }
  
  const clearAllFilters = () => {
    setSelectedUsages([])
    setSelectedCatalogs([])
    setSelectedLocations([])
    setSelectedEditions([])
    setSelectedActivationStatus([])
    setSelectedLicenseType([])
    setPlatformFilter('all')
    setActivationFilter('all')
    setFirmwareLicenseFilter('all')
    setSearchQuery('')
    if (osVersionFilter) router.push('/devices/system')
  }
  
  const totalActiveFilters = selectedUsages.length + selectedCatalogs.length + selectedLocations.length + 
    selectedEditions.length + selectedActivationStatus.length + selectedLicenseType.length +
    (platformFilter !== 'all' ? 1 : 0) + (activationFilter !== 'all' ? 1 : 0) + (firmwareLicenseFilter !== 'all' ? 1 : 0) +
    (osVersionFilter ? 1 : 0)

  // Use the new hook to get both devices data (with inventory) and system module data
  const { devices, moduleData: systemModuleData, devicesLoading, moduleLoading, error } = useDeviceData({
    includeModuleData: true,
    moduleType: 'system'
  })

  useEffect(() => {
    console.log('[SystemPage] Hook data:', {
      devices: devices.length,
      systemModuleData: systemModuleData.length,
      devicesLoading,
      moduleLoading,
      error
    })
  }, [devices, systemModuleData, devicesLoading, moduleLoading, error])

  useEffect(() => {
    // Set the systems from the module data when it's available
    if (systemModuleData && systemModuleData.length > 0) {
      console.log('[SystemPage] Setting systems from module data:', systemModuleData.length, 'items')
      setSystems(systemModuleData)
      setLoading(false)
    } else if (!moduleLoading && systemModuleData.length === 0) {
      console.log('[SystemPage] No system module data available')
      setLoading(false)
    }
  }, [systemModuleData, moduleLoading])
  
  useEffect(() => {
    // Progress tracking for loading state
    let progressInterval: NodeJS.Timeout | null = null
    
    if (moduleLoading) {
      setLoading(true)
      
      // Start progress tracking
      let progress = 0
      setLoadingProgress({ current: 0, total: 100 })
      setLoadingMessage('Fetching system data...')
      
      progressInterval = setInterval(() => {
        if (progress < 85) {
          progress += 5
          setLoadingMessage('Loading operating system information...')
        } else if (progress < 95) {
          progress += 1
          setLoadingMessage('Processing system details...')
        } else {
          progress += 0.1
          setLoadingMessage('Finalizing data...')
        }
        progress = Math.min(progress, 99.9)
        setLoadingProgress({ current: Math.floor(progress), total: 100 })
      }, 200)
    } else if (!moduleLoading) {
      // Data loaded - clear progress and hide loading
      if (progressInterval) clearInterval(progressInterval)
      setLoadingProgress({ current: 100, total: 100 })
      setLoadingMessage('Complete!')
      setTimeout(() => {
        setLoading(false)
      }, 300)
    }
    
    return () => {
      if (progressInterval) clearInterval(progressInterval)
    }
  }, [moduleLoading])

  // Get unique operating systems for filtering
  const operatingSystems = Array.from(new Set(
    systems.map(s => s.operatingSystem).filter(Boolean)
  )).sort()

  // Extract unique filter options from devices (inventory data)
  const filterOptions = {
    usages: Array.from(new Set(
      devices.map(d => d.modules?.inventory?.usage).filter(Boolean)
    )).sort() as string[],
    catalogs: Array.from(new Set(
      devices.map(d => d.modules?.inventory?.catalog).filter(Boolean)
    )).sort() as string[],
    locations: Array.from(new Set(
      devices.map(d => d.modules?.inventory?.location).filter(Boolean)
    )).sort() as string[],
    editions: Array.from(new Set(
      systems.map(s => {
        // Parse edition from operatingSystem string (e.g., "Windows 11 Enterprise 24H2" -> "Enterprise")
        const parts = (s.operatingSystem || '').split(' ')
        if (parts.length >= 3 && parts[0] === 'Windows') {
          // Find the edition part (skip "Windows 11" and the last part if it's a version like "24H2")
          const lastPart = parts[parts.length - 1]
          const isVersion = /^\d{2}H\d$/.test(lastPart) // matches "24H2", "23H1", etc.
          if (isVersion && parts.length >= 4) {
            return parts.slice(2, -1).join(' ') // "Enterprise", "Pro", etc.
          } else if (!isVersion && parts.length >= 3) {
            return parts.slice(2).join(' ')
          }
        }
        return null
      }).filter(Boolean)
    )).sort() as string[]
  }

  // Filter systems
  const filteredSystems = systems.filter(s => {
    // Find the corresponding device from the main devices API to get inventory data
    const deviceFromMainAPI = devices.find(d => 
      d.deviceId === s.deviceId || 
      d.serialNumber === s.serialNumber
    )
    const inventory = deviceFromMainAPI?.modules?.inventory
    
    if (platformFilter !== 'all') {
      if (s.operatingSystem !== platformFilter) return false
    }
    
    // Filter by activation status (dropdown) - NOT AVAILABLE in lean bulk endpoint
    // Activation data only available on individual device API calls
    if (activationFilter !== 'all') {
      // Skip filter - data not available in lean endpoint
    }
    
    // Filter by activation status (chips) - NOT AVAILABLE in lean bulk endpoint
    if (selectedActivationStatus.length > 0) {
      // Skip filter - data not available in lean endpoint
    }
    
    // Filter by firmware license (dropdown) - NOT AVAILABLE in lean bulk endpoint
    if (firmwareLicenseFilter !== 'all') {
      // Skip filter - data not available in lean endpoint
    }
    
    // Filter by license type (chips) - NOT AVAILABLE in lean bulk endpoint
    if (selectedLicenseType.length > 0) {
      // Skip filter - data not available in lean endpoint
    }
    
    // Filter by edition (chips) - parse from operatingSystem string
    if (selectedEditions.length > 0) {
      const parts = (s.operatingSystem || '').split(' ')
      let edition = ''
      if (parts.length >= 3 && parts[0] === 'Windows') {
        const lastPart = parts[parts.length - 1]
        const isVersion = /^\d{2}H\d$/.test(lastPart)
        if (isVersion && parts.length >= 4) {
          edition = parts.slice(2, -1).join(' ')
        } else if (!isVersion && parts.length >= 3) {
          edition = parts.slice(2).join(' ')
        }
      }
      if (!selectedEditions.includes(edition)) return false
    }
    
    // URL-based OS Version filter
    if (osVersionFilter) {
      const decodedFilter = decodeURIComponent(osVersionFilter)
      
      // Check for Windows Group (e.g., "Windows 11")
      if (decodedFilter.startsWith('Windows ')) {
        const osName = s.operatingSystem || ''
        // Handle "Windows 10" vs "Windows 11"
        if (!osName.includes(decodedFilter)) return false
      } 
      else {
        // Try strict match on normalized version
        const sysVersion = s.osVersion || ''
        
        // Construct the Windows chart keys to match against from flat fields
        let windowsChildKey = ''
        let windowsGroupKey = ''
        const osName = s.operatingSystem || ''
        const nameMatch = osName.match(/Windows\s+(\d+)/)
        if (nameMatch) {
          const windowsVersion = nameMatch[1]
          const build = s.buildNumber || '0'
          windowsGroupKey = `${windowsVersion}.${build}`
          windowsChildKey = `${windowsVersion}.${build}.0`
        }

        // Match Logic:
        // 1. Exact match version (Mac full version e.g. 15.4.1)
        // 2. Exact match windows chart key (e.g. 11.26200.1)
        // 3. Exact match windows group key (e.g. 11.26200)
        // 4. Starts with (Mac group e.g. 15.4 matches 15.4.1)
        
        const matchesWindowKey = windowsChildKey === decodedFilter
        const matchesWindowGroup = windowsGroupKey === decodedFilter
        const matchesVersion = sysVersion === decodedFilter
        const matchesGroup = sysVersion.startsWith(`${decodedFilter}.`)
        
        if (!matchesWindowKey && !matchesWindowGroup && !matchesVersion && !matchesGroup) return false
      }
    }

    // Inventory-based filters
    if (selectedUsages.length > 0 && !selectedUsages.includes(inventory?.usage || '')) return false
    if (selectedCatalogs.length > 0 && !selectedCatalogs.includes(inventory?.catalog || '')) return false
    if (selectedLocations.length > 0 && !selectedLocations.includes(inventory?.location || '')) return false
    
    return true
  })

  // Process system info for each device using extractSystem
  const processedSystems = filteredSystems.map(systemDevice => {
    // Find the corresponding device from the main devices API to get the proper name
    const deviceFromMainAPI = devices.find(d => 
      d.deviceId === systemDevice.deviceId || 
      d.serialNumber === systemDevice.serialNumber
    )
    
    // Debug logging to verify device name mapping
    if (deviceFromMainAPI && deviceFromMainAPI.name !== systemDevice.deviceName) {
          }
    
    // Create system info directly from flat API fields (no raw needed)
    const systemInfo = {
      operatingSystem: systemDevice.operatingSystem,
      osVersion: systemDevice.osVersion,
      osBuild: systemDevice.buildNumber,
      uptime: systemDevice.uptime,
      lastBootTime: systemDevice.bootTime,
      servicesCount: systemDevice.servicesCount,
      updatesCount: systemDevice.updatesCount,
      tasksCount: systemDevice.tasksCount
    }
    
    return {
      ...systemDevice,
      // Use the device name from the main API if available, fallback to system module data
      deviceName: deviceFromMainAPI?.name || systemDevice.deviceName,
      // Include assetTag from inventory data if available
      assetTag: deviceFromMainAPI?.modules?.inventory?.assetTag,
      systemInfo
    }
  })

  // Create devices formatted for OS Version Widget from systems data
  // Uses flat fields from lean API response (no raw needed)
  const devicesForOSWidget = systems.map(sys => {
    // Detect platform from OS name
    const osName = sys.operatingSystem?.toLowerCase() || ''
    let platform = 'Unknown'
    if (osName.includes('windows') || osName.includes('microsoft')) {
      platform = 'Windows'
    } else if (osName.includes('macos') || osName.includes('mac os') || osName.includes('darwin')) {
      platform = 'macOS'
    }
    
    // Parse OS name to extract edition (e.g., "Windows 11 Enterprise 24H2" -> "Enterprise")
    const nameParts = sys.operatingSystem?.split(' ') || []
    const edition = nameParts.length > 2 ? nameParts.slice(2, -1).join(' ') : undefined
    const displayVersion = nameParts.length > 2 ? nameParts[nameParts.length - 1] : undefined
    
    return {
      deviceId: sys.deviceId,
      serialNumber: sys.serialNumber,
      name: sys.deviceName,
      lastSeen: sys.lastSeen,
      status: 'active',
      totalEvents: 0,
      lastEventTime: sys.lastSeen,
      platform: platform,
      // Map flat OS data to the format expected by OSVersionBarChart
      osVersion: {
        name: sys.operatingSystem,
        version: sys.osVersion,
        build: sys.buildNumber,
        edition: edition,
        displayVersion: displayVersion
      },
      modules: {
        system: {
          operatingSystem: {
            name: sys.operatingSystem,
            version: sys.osVersion,
            build: sys.buildNumber,
            edition: edition,
            displayVersion: displayVersion
          }
        }
      }
    }
  })

  // Apply search filter after processing (so we search the correct device names)
  const searchFilteredSystems = processedSystems.filter(sys => {
    // Global platform filter first
    if (globalPlatformFilter) {
      const platform = normalizePlatform(sys.operatingSystem)
      if (!isPlatformVisible(platform)) {
        return false
      }
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      return (
        sys.deviceName?.toLowerCase().includes(query) ||
        sys.serialNumber?.toLowerCase().includes(query)
      )
    }
    return true
  }).sort((a, b) => {
    let aValue: string | number, bValue: string | number
    switch (sortColumn) {
      case 'device':
        aValue = a.deviceName?.toLowerCase() || ''
        bValue = b.deviceName?.toLowerCase() || ''
        return sortDirection === 'asc' ? String(aValue).localeCompare(String(bValue)) : String(bValue).localeCompare(String(aValue))
      case 'os':
        aValue = a.operatingSystem?.toLowerCase() || ''
        bValue = b.operatingSystem?.toLowerCase() || ''
        return sortDirection === 'asc' ? String(aValue).localeCompare(String(bValue)) : String(bValue).localeCompare(String(aValue))
      case 'version':
        aValue = a.osVersion?.toLowerCase() || ''
        bValue = b.osVersion?.toLowerCase() || ''
        return sortDirection === 'asc' ? String(aValue).localeCompare(String(bValue)) : String(bValue).localeCompare(String(aValue))
      case 'uptime':
        aValue = a.uptime || 0
        bValue = b.uptime || 0
        return sortDirection === 'asc' ? Number(aValue) - Number(bValue) : Number(bValue) - Number(aValue)
      case 'lastSeen':
        aValue = a.lastSeen || ''
        bValue = b.lastSeen || ''
        return sortDirection === 'asc' ? String(aValue).localeCompare(String(bValue)) : String(bValue).localeCompare(String(aValue))
    }
    return 0
  })

  if (loading) {
    return <LoadingSkeleton />
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Operating System Information</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  OS versions, activation status, and system uptime {searchFilteredSystems.length} devices
                </p>
              </div>
              <div className="flex items-center gap-4">
                {/* Platform Filter */}
                <select
                  value={platformFilter}
                  onChange={(e) => setPlatformFilter(e.target.value)}
                  className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-1.5"
                >
                  <option value="all">All Operating Systems</option>
                  {operatingSystems.map(os => (
                    <option key={os} value={os}>{os}</option>
                  ))}
                </select>
                
                {/* Export to CSV Button */}
                <button
                  onClick={() => {
                    // Build CSV from filtered data only
                    const headers = ['Device Name', 'Serial Number', 'Asset Tag', 'Operating System', 'Version', 'Build', 'Edition', 'Uptime', 'Boot Time', 'Last Seen']
                    const rows = searchFilteredSystems.map(s => {
                      const uptimeStr = s.uptime ? `${Math.floor(s.uptime / 86400)}d ${Math.floor((s.uptime % 86400) / 3600)}h` : ''
                      return [
                        s.deviceName || '',
                        s.serialNumber || '',
                        s.assetTag || '',
                        s.operatingSystem || '',
                        s.osVersion || '',
                        s.buildNumber || '',
                        (() => {
                          const parts = (s.operatingSystem || '').split(' ')
                          if (parts.length >= 3 && parts[0] === 'Windows') {
                            const lastPart = parts[parts.length - 1]
                            const isVersion = /^\d{2}H\d$/.test(lastPart)
                            if (isVersion && parts.length >= 4) return parts.slice(2, -1).join(' ')
                            return parts.slice(2).join(' ')
                          }
                          return ''
                        })(),
                        uptimeStr,
                        s.bootTime || '',
                        s.lastSeen || ''
                      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
                    })
                    
                    const csv = [headers.join(','), ...rows].join('\n')
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                    const url = URL.createObjectURL(blob)
                    const link = document.createElement('a')
                    link.href = url
                    link.download = `system-report-${new Date().toISOString().split('T')[0]}.csv`
                    document.body.appendChild(link)
                    link.click()
                    document.body.removeChild(link)
                    URL.revokeObjectURL(url)
                  }}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                  title="Export filtered devices to CSV"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export CSV
                </button>
              </div>
            </div>
          </div>

          {/* Widgets Accordion - OS Version Charts */}
          <div className={widgetsExpanded ? '' : 'border-b border-gray-200 dark:border-gray-700'}>
            {/* Widgets Accordion Header */}
            <button
              onClick={() => setWidgetsExpanded(!widgetsExpanded)}
              className="w-full px-6 py-3 flex items-center justify-between bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Widgets</span>
              </div>
              <svg 
                className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${widgetsExpanded ? 'rotate-90' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          
          {/* Widgets Content - Collapsible */}
          {widgetsExpanded && (
            <div className="px-6 py-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              {/* OS Version Charts - Side by Side with Pie Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Windows OS Version Pie Chart */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z"/>
                        </svg>
                      </div>
                      <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Windows Versions</h2>
                    </div>
                  </div>
                  <div className="px-3 py-2">
                    <OSVersionPieChart devices={devicesForOSWidget as any} loading={loading || moduleLoading} osType="Windows" />
                  </div>
                </div>
                
                {/* macOS OS Version Pie Chart */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-red-500 dark:text-red-300" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                        </svg>
                      </div>
                      <h2 className="text-sm font-semibold text-gray-900 dark:text-white">macOS Versions</h2>
                    </div>
                  </div>
                  <div className="px-3 py-2">
                    <OSVersionPieChart devices={devicesForOSWidget as any} loading={loading || moduleLoading} osType="macOS" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filters Accordion Section */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Selections</span>
                {totalActiveFilters > 0 && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                    {totalActiveFilters} active
                  </span>
                )}
              </div>
              <svg 
                className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${filtersExpanded ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {filtersExpanded && (
              <div className="px-6 pb-4 space-y-4">
                {/* OS Version Filter - NEW */}
                {osVersionFilter && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">OS Version</div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => router.push('/devices/system')}
                        className="px-3 py-1 text-xs font-medium rounded-full border transition-colors bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700 flex items-center gap-1 group"
                      >
                        {decodeURIComponent(osVersionFilter)}
                        <svg className="w-3 h-3 group-hover:text-blue-600 dark:group-hover:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Edition Filter - NEW */}
                {filterOptions.editions.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Edition</div>
                    <div className="flex flex-wrap gap-2">
                      {filterOptions.editions.map(edition => (
                        <button
                          key={edition}
                          onClick={() => toggleEdition(edition)}
                          className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                            selectedEditions.includes(edition)
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700'
                              : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                          }`}
                        >
                          {edition}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Activation Status Filter - NEW */}
                <div>
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Activation Status</div>
                  <div className="flex flex-wrap gap-2">
                    {['Activated', 'Not Activated'].map(status => (
                      <button
                        key={status}
                        onClick={() => toggleActivationStatus(status)}
                        className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                          selectedActivationStatus.includes(status)
                            ? status === 'Activated' 
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700'
                            : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* License Type Filter - NEW */}
                <div>
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">OEM License</div>
                  <div className="flex flex-wrap gap-2">
                    {['Has OEM License', 'No OEM License'].map(type => (
                      <button
                        key={type}
                        onClick={() => toggleLicenseType(type)}
                        className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                          selectedLicenseType.includes(type)
                            ? type === 'Has OEM License'
                              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                              : 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                            : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                        }`}
                        title={type === 'Has OEM License' 
                          ? 'Has usable firmware-embedded (UEFI/BIOS) Pro/Enterprise license' 
                          : 'No usable OEM license - may lose activation when migrating from AD to Entra ID'}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Usage Filter */}
                {filterOptions.usages.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Usage</div>
                    <div className="flex flex-wrap gap-2">
                      {filterOptions.usages.map(usage => (
                        <button
                          key={usage}
                          onClick={() => toggleUsage(usage)}
                          className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                            selectedUsages.includes(usage)
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700'
                              : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                          }`}
                        >
                          {usage}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Catalog Filter */}
                {filterOptions.catalogs.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Catalog</div>
                    <div className="flex flex-wrap gap-2">
                      {filterOptions.catalogs.map(catalog => (
                        <button
                          key={catalog}
                          onClick={() => toggleCatalog(catalog)}
                          className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                            selectedCatalogs.includes(catalog)
                              ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-200 border-teal-300 dark:border-teal-700'
                              : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                          }`}
                        >
                          {catalog}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Location Filter */}
                {filterOptions.locations.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Location</div>
                    <div className="flex flex-wrap gap-2">
                      {filterOptions.locations.map(location => (
                        <button
                          key={location}
                          onClick={() => toggleLocation(location)}
                          className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                            selectedLocations.includes(location)
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700'
                              : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                          }`}
                        >
                          {location}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Clear All Selections */}
                {totalActiveFilters > 0 && (
                  <div className="pt-2">
                    <button
                      onClick={clearAllFilters}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                    >
                      Clear all selections
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Search Section */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search by device name or serial number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              {(totalActiveFilters > 0 || searchQuery) && (
                <button
                  onClick={clearAllFilters}
                  className="px-4 py-2 text-sm font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border border-yellow-300 dark:border-yellow-700 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors whitespace-nowrap"
                >
                  Clear Selections
                </button>
              )}
            </div>
          </div>

          <div className="overflow-auto max-h-[calc(100vh-24rem)]">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
                <tr>
                  <th 
                    onClick={() => handleSort('device')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none"
                  >
                    <div className="flex items-center gap-1">
                      Device
                      {sortColumn === 'device' && (
                        <svg className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('os')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none"
                  >
                    <div className="flex items-center gap-1">
                      Operating System
                      {sortColumn === 'os' && (
                        <svg className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('version')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none"
                  >
                    <div className="flex items-center gap-1">
                      Version
                      {sortColumn === 'version' && (
                        <svg className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('uptime')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none"
                  >
                    <div className="flex items-center gap-1">
                      Uptime
                      {sortColumn === 'uptime' && (
                        <svg className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('lastSeen')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none"
                  >
                    <div className="flex items-center gap-1">
                      Last Seen
                      {sortColumn === 'lastSeen' && (
                        <svg className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {error ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 mb-4 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <p className="text-base font-medium text-gray-900 dark:text-white mb-2">Failed to load system data</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{error}</p>
                        <button 
                          onClick={() => window.location.reload()} 
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          Try Again
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : searchFilteredSystems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.50 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">No system records found</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">No system records match your current search.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  searchFilteredSystems.map((sys) => (
                    <tr key={sys.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 max-w-56">
                        <Link 
                          href={`/device/${sys.deviceId}#system`}
                          className="group block min-w-0"
                          title={sys.deviceName || 'Unknown Device'}
                        >
                          <div className="text-sm font-medium text-purple-600 group-hover:text-purple-800 dark:text-purple-400 dark:group-hover:text-purple-300 truncate">{sys.deviceName}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">
                            {sys.serialNumber}
                            {sys.assetTag ? ` | ${sys.assetTag}` : ''}
                          </div>
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-900 dark:text-white font-medium">
                              {sys.systemInfo?.operatingSystem || sys.operatingSystem || 'Unknown'}
                            </span>
                          </div>
                          <div className="text-gray-500 dark:text-gray-400">
                            {sys.osVersion || null}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm space-y-1">
                          {sys.buildNumber ? (
                            <div className="text-gray-900 dark:text-white">
                              {sys.buildNumber}
                            </div>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          {sys.uptime ? (
                            <div className="text-gray-900 dark:text-white">
                              {formatUptime(sys.uptime)}
                            </div>
                          ) : (
                            <div className="text-gray-500 dark:text-gray-400">Unknown</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {sys.lastSeen ? formatRelativeTime(sys.lastSeen) : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SystemPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-black animate-pulse"></div>}>
      <SystemPageContent />
    </Suspense>
  )
}

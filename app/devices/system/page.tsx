"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { formatRelativeTime } from "../../../src/lib/time"
import { DevicePageNavigation } from "../../../src/components/navigation/DevicePageNavigation"
import { extractSystem } from "../../../src/lib/data-processing/modules/system"
import { OSVersionWidget } from "../../../src/lib/modules/widgets/OSVersionWidget"
import { useDeviceData } from "../../../src/hooks/useDeviceData"

interface SystemDevice {
  id: string
  deviceId: string
  deviceName: string
  serialNumber: string
  lastSeen: string
  collectedAt: string
  operatingSystem: string
  osVersion: string | null
  buildNumber: string | null
  uptime: number | null
  bootTime: string | null
  raw: any
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      {/* Header Skeleton */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <div className="animate-pulse">
                <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-5 h-5 bg-purple-200 dark:bg-purple-800 rounded animate-pulse"></div>
                <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
            </div>
            <div className="flex items-center gap-2 animate-pulse">
              <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </div>
        </div>
      </header>

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
  const [loading, setLoading] = useState(true)
  const [systems, setSystems] = useState<SystemDevice[]>([])
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [platformFilter, setPlatformFilter] = useState('all')

  // Use the new hook to get both devices data (with inventory) and system module data
  const { devices, moduleData: systemModuleData, devicesLoading, moduleLoading, error } = useDeviceData({
    includeModuleData: true,
    moduleType: 'system'
  })

  useEffect(() => {
    // Set the systems from the module data when it's available
    if (systemModuleData && systemModuleData.length > 0) {
      setSystems(systemModuleData)
      setLoading(false)
    }
  }, [systemModuleData])

  useEffect(() => {
    // Handle loading state based on module loading
    setLoading(moduleLoading)
  }, [moduleLoading])

  // Get unique operating systems for filtering
  const operatingSystems = Array.from(new Set(
    systems.map(s => s.operatingSystem).filter(Boolean)
  )).sort()

  // Filter systems
  const filteredSystems = systems.filter(s => {
    if (platformFilter !== 'all') {
      if (s.operatingSystem !== platformFilter) return false
    }
    
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
      console.log(`[SYSTEM PAGE] Device name mapping: "${systemDevice.deviceName}" -> "${deviceFromMainAPI.name}"`)
    }
    
    // Create a device object in the format expected by extractSystem
    const deviceData = {
      id: systemDevice.deviceId,
      name: deviceFromMainAPI?.name || systemDevice.deviceName,
      modules: systemDevice.raw ? { system: systemDevice.raw } : undefined
    }
    
    const systemInfo = extractSystem(deviceData)
    
    return {
      ...systemDevice,
      // Use the device name from the main API if available, fallback to system module data
      deviceName: deviceFromMainAPI?.name || systemDevice.deviceName,
      // Include assetTag from inventory data if available
      assetTag: deviceFromMainAPI?.modules?.inventory?.assetTag,
      systemInfo
    }
  })

  // Apply search filter after processing (so we search the correct device names)
  const searchFilteredSystems = processedSystems.filter(sys => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      return (
        sys.deviceName?.toLowerCase().includes(query) ||
        sys.serialNumber?.toLowerCase().includes(query)
      )
    }
    return true
  })

  if (loading) {
    return <LoadingSkeleton />
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black">
        <header className="bg-white dark:bg-gray-900 border-b">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Dashboard
            </Link>
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">System</h1>
          </div>
        </header>
        
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Error Loading System</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <Link href="/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-sm font-medium hidden sm:inline">Dashboard</span>
              </Link>
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
              <div className="flex items-center gap-3 min-w-0">
                <svg className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">System</h1>
              </div>
            </div>

            {/* Right side - Navigation */}
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              {/* Navigation */}
              <div className="hidden lg:flex">
                <DevicePageNavigation className="flex items-center gap-2" />
              </div>

              {/* Mobile Navigation */}
              <div className="lg:hidden">
                <DevicePageNavigation className="flex items-center gap-2" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Operating System Information • {searchFilteredSystems.length} devices</h2>
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
              </div>
            </div>
          </div>

          {/* Analytics Charts Section */}
          <div className="px-6 py-6 border-b border-gray-200 dark:border-gray-700">
            <div className="space-y-6">
              {/* OS Version Charts - Side by Side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <OSVersionWidget devices={devices as any} loading={devicesLoading} osType="Windows" />
                <OSVersionWidget devices={devices as any} loading={devicesLoading} osType="macOS" />
              </div>
            </div>
          </div>

          {/* Search Section */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
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
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr className="sticky top-0 z-20 bg-gray-50 dark:bg-gray-700">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700">Device</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700">Operating System</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700">Version</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700">Uptime</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700">Locale</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700">Last Seen</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {searchFilteredSystems.length === 0 ? (
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link 
                          href={`/device/${sys.deviceId}#system`}
                          className="flex items-center hover:text-purple-600 dark:hover:text-purple-400"
                        >
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{sys.deviceName}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {sys.serialNumber}
                              {sys.assetTag ? ` | ${sys.assetTag}` : ''}
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="text-gray-900 dark:text-white font-medium">
                            {sys.systemInfo.operatingSystem.name || sys.operatingSystem || 'Unknown'}
                          </div>
                          <div className="text-gray-500 dark:text-gray-400">
                            {sys.systemInfo.operatingSystem.displayVersion || sys.systemInfo.operatingSystem.version || sys.osVersion || null}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm space-y-1">
                          {sys.systemInfo.operatingSystem.build || sys.buildNumber ? (
                            <div className="text-gray-900 dark:text-white">
                              {sys.systemInfo.operatingSystem.build || sys.buildNumber}
                              {sys.systemInfo.operatingSystem.featureUpdate ? `.${sys.systemInfo.operatingSystem.featureUpdate}` : ''}
                            </div>
                          ) : null}
                          {sys.systemInfo.operatingSystem.edition ? (
                            <div className="text-gray-500 dark:text-gray-400">
                              {sys.systemInfo.operatingSystem.edition}
                            </div>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          {sys.raw?.uptimeString ? (
                            <div className="text-gray-900 dark:text-white">
                              {sys.raw.uptimeString}
                            </div>
                          ) : sys.uptime ? (
                            <div className="text-gray-900 dark:text-white">
                              {formatUptime(sys.uptime)}
                            </div>
                          ) : (
                            <div className="text-gray-500 dark:text-gray-400">Unknown</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {sys.systemInfo.operatingSystem.locale || 'Unknown'}
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

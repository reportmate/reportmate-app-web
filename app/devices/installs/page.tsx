'use client'

export const dynamic = 'force-dynamic'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { DevicePageNavigation } from '../../../src/components/navigation/DevicePageNavigation'

interface InstallRecord {
  id: string
  deviceId: string
  deviceName: string
  serialNumber: string
  lastSeen?: string
  status?: string
  installs?: {
    cimian?: { 
      version?: string
      status?: string
      isInstalled?: boolean
      items?: Array<{
        name: string
        version: string
        status: string
        last_update?: string
      }>
    }
    munki?: { 
      version?: string
      status?: string
      isInstalled?: boolean
      items?: Array<{
        name: string
        version: string
        status: string
        last_update?: string
      }>
    }
  }
  raw?: {
    cimian?: { version?: string }
    munki?: { version?: string }
    system_profiler?: {
      SPHardwareDataType?: Array<{
        machine_model?: string
        platform_UUID?: string
      }>
    }
    inventory?: {
      deviceName?: string
      assetTag?: string
      serialNumber?: string
    }
  }
  packages?: Array<{
    name: string
    version: string
    status: string
    last_update?: string
  }>
  hasError?: boolean
  error?: string
}

interface PackageGroup {
  name: string
  totalCount: number
  versions: PackageVersion[]
  expanded: boolean
}

interface PackageVersion {
  version: string
  count: number
}

function getDevicePlatform(install: InstallRecord): string {
  const machineModel = install.raw?.system_profiler?.SPHardwareDataType?.[0]?.machine_model || ''
  if (machineModel.toLowerCase().includes('mac')) {
    return 'Macintosh'
  }
  return 'Windows'
}

function getStatusBadgeColor(status: string): string {
  switch (status?.toLowerCase()) {
    case 'installed':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    case 'warning':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
    case 'error':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    case 'removed':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
  }
}

function formatDateTime(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  } catch {
    return 'Invalid Date'
  }
}

function InstallsPageContent() {
  const [installs, setInstalls] = useState<InstallRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [platformFilter, setPlatformFilter] = useState<string | null>(null)
  const [versionFilter, setVersionFilter] = useState<{type: string | null, version: string | null}>({type: null, version: null})
  
  // Package selection state
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null)
  const [selectedPackageVersion, setSelectedPackageVersion] = useState<string | null>(null)
  const [expandedPackages, setExpandedPackages] = useState<Set<string>>(new Set())

  // Progress tracking state
  const [loadingProgress, setLoadingProgress] = useState<{
    current: number
    total: number
    currentBatch: number
    totalBatches: number
    status: string
  } | null>(null)

  useEffect(() => {
    let progressInterval: NodeJS.Timeout | null = null
    
    async function fetchInstalls() {
      try {
        console.log('[PROGRESS] Starting fetch...')
        
        // First, get the actual device count dynamically
        setLoadingProgress({
          current: 0,
          total: 0,
          currentBatch: 0,
          totalBatches: 0,
          status: 'Fetching device count...'
        })
        
        // Get actual device count from API
        const apiBaseUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
          ? `http://localhost:${window.location.port}` 
          : 'https://reportmate-api.azurewebsites.net'
        
        const devicesResponse = await fetch(`${apiBaseUrl}/api/devices`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'User-Agent': 'ReportMate-Frontend/1.0'
          }
        })
        
        if (!devicesResponse.ok) {
          throw new Error('Failed to fetch device count')
        }
        
        const devicesData = await devicesResponse.json()
        const actualDeviceCount = Array.isArray(devicesData) ? devicesData.length : 0
        
        console.log('[PROGRESS] Device count response:', { 
          isArray: Array.isArray(devicesData), 
          count: actualDeviceCount,
          firstFew: Array.isArray(devicesData) ? devicesData.slice(0, 3) : devicesData 
        })
        
        // If no devices locally, fall back to production API for testing
        if (actualDeviceCount === 0 && typeof window !== 'undefined' && window.location.hostname === 'localhost') {
          console.log('[PROGRESS] No devices locally, trying production API...')
          const prodResponse = await fetch('https://reportmate-api.azurewebsites.net/api/devices', {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache',
              'User-Agent': 'ReportMate-Frontend/1.0'
            }
          })
          
          if (prodResponse.ok) {
            const prodData = await prodResponse.json()
            const prodDeviceCount = Array.isArray(prodData) ? prodData.length : 0
            console.log('[PROGRESS] Production API returned', prodDeviceCount, 'devices')
            
            if (prodDeviceCount > 0) {
              // Use production device count but still call local API for consistency
              const batchSize = 10
              const actualBatches = Math.ceil(prodDeviceCount / batchSize)
              
              console.log(`[PROGRESS] Using production count: ${prodDeviceCount} devices, ${actualBatches} batches`)
              
              setLoadingProgress({
                current: 0,
                total: prodDeviceCount,
                currentBatch: 0,
                totalBatches: actualBatches,
                status: 'Connecting to API...'
              })
              
              // Continue with the rest using production count
              let currentProgress = 0
              let currentBatch = 0
              
              progressInterval = setInterval(() => {
                currentProgress = Math.min(currentProgress + 12, prodDeviceCount - 5)
                currentBatch = Math.min(Math.floor(currentProgress / batchSize) + 1, actualBatches)
                
                setLoadingProgress(prev => {
                  if (!prev) return null
                  return {
                    current: currentProgress,
                    total: prodDeviceCount,
                    currentBatch: currentBatch,
                    totalBatches: actualBatches,
                    status: `Processing batch ${currentBatch}/${actualBatches}...`
                  }
                })
              }, 1200)
              
              // Make the API call (still use local for consistency)
              console.log('[PROGRESS] Making local API call...')
              const response = await fetch('/api/devices/installs')
              if (!response.ok) throw new Error('Failed to fetch installs')
              
              const data = await response.json()
              
              // Clear interval and show final results
              if (progressInterval) {
                clearInterval(progressInterval)
                progressInterval = null
              }
              
              // Get final device count from API response
              const finalDeviceCount = (data.data || []).length
              const finalBatches = Math.ceil(finalDeviceCount / batchSize)
              
              console.log('[PROGRESS] API completed, final device count:', finalDeviceCount, 'batches:', finalBatches)
              
              // Show completion with real numbers
              setLoadingProgress({
                current: finalDeviceCount || prodDeviceCount,
                total: prodDeviceCount,
                currentBatch: finalBatches || actualBatches,
                totalBatches: actualBatches,
                status: 'Processing complete!'
              })
              
              if (data.success && data.data) {
                // Process the API response data structure
                const processedInstalls = data.data.map((device: any) => {
                  const packages: Array<{name: string, version: string, status: string, last_update?: string}> = []
                  
                  if (device.installs?.cimian?.items) {
                    device.installs.cimian.items.forEach((item: any) => {
                      packages.push({
                        name: item.itemName || 'Unknown Package',
                        version: item.latestVersion || item.currentVersion || '1.0.0',
                        status: item.currentStatus || 'Unknown',
                        last_update: item.lastUpdate
                      })
                    })
                  }
                  
                  return {
                    ...device,
                    packages
                  }
                })
                
                setInstalls(processedInstalls)
                console.log('[PROGRESS] Final installs data processed:', processedInstalls.length, 'devices')
              }
              
              setLoading(false)
              setLoadingProgress(null)
              return
            }
          }
        }
        
        const batchSize = 10
        const actualBatches = Math.ceil(actualDeviceCount / batchSize)
        
        console.log(`[PROGRESS] Discovered ${actualDeviceCount} devices, ${actualBatches} batches`)
        
        setLoadingProgress({
          current: 0,
          total: actualDeviceCount,
          currentBatch: 0,
          totalBatches: actualBatches,
          status: 'Connecting to API...'
        })
        
        // Start realistic progress simulation
        let currentProgress = 0
        let currentBatch = 0
        
        progressInterval = setInterval(() => {
          currentProgress = Math.min(currentProgress + 12, actualDeviceCount - 5) // Progress in chunks
          currentBatch = Math.min(Math.floor(currentProgress / batchSize) + 1, actualBatches)
          
          setLoadingProgress(prev => {
            if (!prev) return null
            return {
              current: currentProgress,
              total: actualDeviceCount,
              currentBatch: currentBatch,
              totalBatches: actualBatches,
              status: `Processing batch ${currentBatch}/${actualBatches}...`
            }
          })
        }, 1200) // Update every 1.2 seconds to match typical API timing
        
        // Make the API call
        console.log('[PROGRESS] Making API call...')
        const response = await fetch('/api/devices/installs')
        if (!response.ok) throw new Error('Failed to fetch installs')
        
        const data = await response.json()
        
        // Clear interval and show final results
        if (progressInterval) {
          clearInterval(progressInterval)
          progressInterval = null
        }
        
        // Get final device count from API response
        const finalDeviceCount = (data.data || []).length
        const finalBatches = Math.ceil(finalDeviceCount / batchSize)
        
        console.log('[PROGRESS] API completed, final device count:', finalDeviceCount, 'batches:', finalBatches)
        
        // Show completion with real numbers
        setLoadingProgress({
          current: finalDeviceCount,
          total: finalDeviceCount,
          currentBatch: finalBatches,
          totalBatches: finalBatches,
          status: 'Processing complete!'
        })
        
        if (data.success && data.data) {
          // Process the API response data structure
          const processedInstalls = data.data.map((device: any) => {
            // Extract packages from both Cimian and Munki installs
            const packages: Array<{name: string, version: string, status: string, last_update?: string}> = []
            
            // Add Cimian packages
            if (device.installs?.cimian?.items) {
              device.installs.cimian.items.forEach((item: any) => {
                packages.push({
                  name: item.name || 'Unknown Package',
                  version: item.version || 'Unknown',
                  status: item.status || 'unknown',
                  last_update: item.last_update || item.lastUpdate
                })
              })
            }
            
            // Add Munki packages
            if (device.installs?.munki?.items) {
              device.installs.munki.items.forEach((item: any) => {
                packages.push({
                  name: item.name || 'Unknown Package',
                  version: item.version || 'Unknown',
                  status: item.status || 'unknown',
                  last_update: item.last_update || item.lastUpdate
                })
              })
            }
            
            return {
              id: device.deviceId || device.serialNumber || Math.random().toString(),
              deviceId: device.deviceId || device.serialNumber || 'unknown',
              deviceName: device.deviceName || 'Unknown Device',
              serialNumber: device.serialNumber || 'Unknown',
              lastSeen: device.lastSeen,
              status: device.status,
              installs: device.installs,
              raw: device.raw,
              packages: packages,
              hasError: device.hasError,
              error: device.error
            }
          })

          console.log('Processed installs data:', processedInstalls.length, 'devices')
          setInstalls(processedInstalls)
        } else {
          console.warn('[INSTALLS PAGE] API returned non-success or no data')
          setInstalls([])
        }
        
        // Clear progress after showing completion briefly
        setTimeout(() => {
          console.log('[PROGRESS] Clearing progress state')
          setLoadingProgress(null)
        }, 1500)
        
      } catch (error) {
        console.error('Error fetching installs:', error)
        setInstalls([])
        if (progressInterval) {
          clearInterval(progressInterval)
          progressInterval = null
        }
        setLoadingProgress(null)
      } finally {
        setLoading(false)
      }
    }

    fetchInstalls()
    
    // Cleanup function
    return () => {
      if (progressInterval) {
        clearInterval(progressInterval)
      }
    }
  }, [])

  // Create package groups from all installs
  const packageGroups: PackageGroup[] = (() => {
    const groups: Record<string, Record<string, number>> = {}
    
    installs.forEach(install => {
      const platform = getDevicePlatform(install)
      if (platformFilter && platform !== platformFilter) return
      
      install.packages?.forEach(pkg => {
        if (!groups[pkg.name]) {
          groups[pkg.name] = {}
        }
        if (!groups[pkg.name][pkg.version]) {
          groups[pkg.name][pkg.version] = 0
        }
        groups[pkg.name][pkg.version]++
      })
    })

    return Object.entries(groups)
      .map(([name, versions]) => ({
        name,
        totalCount: Object.values(versions).reduce((sum, count) => sum + count, 0),
        versions: Object.entries(versions)
          .map(([version, count]) => ({ version, count }))
          .sort((a, b) => {
            // Sort versions numerically where possible
            const parseVersion = (v: string) => v.split('.').map(n => parseInt(n) || 0)
            const vA = parseVersion(a.version)
            const vB = parseVersion(b.version)
            
            for (let i = 0; i < Math.max(vA.length, vB.length); i++) {
              const partA = vA[i] || 0
              const partB = vB[i] || 0
              if (partB !== partA) return partB - partA
            }
            return 0
          }),
        expanded: expandedPackages.has(name)
      }))
      .sort((a, b) => b.totalCount - a.totalCount)
  })()

  // Get filtered packages for a specific device
  function getFilteredPackagesForDevice(install: InstallRecord) {
    if (!install.packages) return []
    
    return install.packages.filter(pkg => {
      // Package filter
      if (selectedPackage && pkg.name !== selectedPackage) return false
      if (selectedPackageVersion && pkg.version !== selectedPackageVersion) return false
      
      // Status filter - now supports multiple statuses
      if (statusFilter.length > 0) {
        const hasErrorStatus = statusFilter.includes('error') && 
          (pkg.status?.toLowerCase().includes('error') || pkg.status?.toLowerCase().includes('failed'))
        const hasWarningStatus = statusFilter.includes('warning') && 
          (pkg.status?.toLowerCase().includes('warning') || pkg.status?.toLowerCase().includes('pending'))
        
        if (!hasErrorStatus && !hasWarningStatus) return false
      }
      
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchesPackage = pkg.name?.toLowerCase().includes(query)
        const matchesDevice = install.raw?.inventory?.deviceName?.toLowerCase().includes(query) ||
                             install.deviceName?.toLowerCase().includes(query) || 
                             install.serialNumber?.toLowerCase().includes(query)
        if (!matchesPackage && !matchesDevice) return false
      }
      
      return true
    })
  }

  // Filter installs based on all criteria
  const filteredInstalls = installs.filter(install => {
    // Platform filter
    if (platformFilter && getDevicePlatform(install) !== platformFilter) return false
    
    // Version filter (Primate)
    if (versionFilter.type && versionFilter.version) {
      if (versionFilter.type === 'cimian') {
        const cimianVersion = install.installs?.cimian?.version || install.raw?.cimian?.version
        if (cimianVersion !== versionFilter.version) return false
      } else if (versionFilter.type === 'munki') {
        const munkiVersion = install.installs?.munki?.version || install.raw?.munki?.version
        if (munkiVersion !== versionFilter.version) return false
      }
    }
    
    // Only include devices that have filtered packages
    const filteredPackages = getFilteredPackagesForDevice(install)
    return filteredPackages.length > 0
  })

  function handlePlatformFilter(platform: string) {
    if (platformFilter === platform) {
      setPlatformFilter(null)
    } else {
      setPlatformFilter(platform)
    }
  }

  function handleVersionFilter(type: string, version: string) {
    if (versionFilter.type === type && versionFilter.version === version) {
      setVersionFilter({type: null, version: null})
    } else {
      setVersionFilter({type, version})
    }
  }

  function selectPackageVersion(packageName: string, version?: string) {
    if (selectedPackage === packageName && selectedPackageVersion === version) {
      setSelectedPackage(null)
      setSelectedPackageVersion(null)
    } else {
      setSelectedPackage(packageName)
      setSelectedPackageVersion(version || null)
    }
  }

  function togglePackageExpansion(packageName: string) {
    const newExpanded = new Set(expandedPackages)
    if (newExpanded.has(packageName)) {
      newExpanded.delete(packageName)
    } else {
      newExpanded.add(packageName)
    }
    setExpandedPackages(newExpanded)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left side - Logo and Title */}
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <Link
                href="/dashboard"
                className="flex items-center gap-1 sm:gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-xs sm:text-sm font-medium hidden sm:inline">Dashboard</span>
              </Link>
              <div className="h-4 sm:h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-lg">
                  <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-lg font-semibold text-emerald-600 dark:text-emerald-400 truncate">
                    Installs Report
                  </h1>
                </div>
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

      {/* Main Content - Split Layout */}
      <div className="flex h-[calc(100vh-64px)]">
        {/* Left Panel - Package Groups (33%) */}
        <div className="w-1/3 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
          <div className="p-4">
            {/* Platform Filter */}
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl mb-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handlePlatformFilter('Windows')}
                  className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                    platformFilter === 'Windows'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  Windows
                </button>
                <button
                  onClick={() => handlePlatformFilter('Macintosh')}
                  className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                    platformFilter === 'Macintosh'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  Macintosh
                </button>
              </div>
            </div>

            {/* Error and Warning Stats Cards */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {/* Error Stats Card */}
              <button
                onClick={() => {
                  if (statusFilter.includes('error')) {
                    setStatusFilter(statusFilter.filter(s => s !== 'error'))
                  } else {
                    setStatusFilter([...statusFilter, 'error'])
                  }
                }}
                className={`bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border transition-colors hover:shadow-md ${
                  statusFilter.includes('error')
                    ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-red-200 dark:hover:border-red-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-red-600 dark:text-red-400">
                      {installs.filter(install => 
                        install.packages && install.packages.some(pkg => 
                          pkg.status && pkg.status.toLowerCase().includes('error') || 
                          pkg.status && pkg.status.toLowerCase().includes('failed')
                        )
                      ).length}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Errors</p>
                  </div>
                </div>
              </button>

              {/* Warning Stats Card */}
              <button
                onClick={() => {
                  if (statusFilter.includes('warning')) {
                    setStatusFilter(statusFilter.filter(s => s !== 'warning'))
                  } else {
                    setStatusFilter([...statusFilter, 'warning'])
                  }
                }}
                className={`bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border transition-colors hover:shadow-md ${
                  statusFilter.includes('warning')
                    ? 'border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-yellow-200 dark:hover:border-yellow-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-yellow-600 dark:text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-yellow-600 dark:text-yellow-400">
                      {installs.filter(install => 
                        install.packages && install.packages.some(pkg => 
                          pkg.status && pkg.status.toLowerCase().includes('warning') || 
                          pkg.status && pkg.status.toLowerCase().includes('pending')
                        )
                      ).length}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Warnings</p>
                  </div>
                </div>
              </button>
            </div>

            {/* Primate Version Filters */}
            <div className="mb-4">
              
              {/* Cimian Versions */}
              <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-3">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  Cimian
                </h4>
                <div className="space-y-2">
                  {(() => {
                    const cimianVersions = installs
                      .filter(install => getDevicePlatform(install) === 'Windows')
                      .map(install => install.installs?.cimian?.version || install.raw?.cimian?.version)
                      .filter((version): version is string => Boolean(version))
                      .reduce((acc: Record<string, number>, version: string) => {
                        acc[version] = (acc[version] || 0) + 1
                        return acc
                      }, {})
                    
                    // Sort by version (newest first) - parse date from version string
                    const sortedVersions = Object.entries(cimianVersions)
                      .sort(([versionA], [versionB]) => {
                        // Try to parse date from version format like "2025.09.08.2242"
                        const parseVersionDate = (version: string) => {
                          const parts = version.split('.')
                          if (parts.length >= 3) {
                            const year = parseInt(parts[0]) || 0
                            const month = parseInt(parts[1]) || 0
                            const day = parseInt(parts[2]) || 0
                            const time = parts[3] ? parseInt(parts[3]) : 0
                            return new Date(year, month - 1, day, Math.floor(time / 100), time % 100).getTime()
                          }
                          return 0
                        }
                        return parseVersionDate(versionB) - parseVersionDate(versionA)
                      })
                      .slice(0, 8) // Show top 8 versions
                    
                    const maxCount = Math.max(...Object.values(cimianVersions), 0)
                    
                    return sortedVersions.length > 0 ? sortedVersions.map(([version, count]) => {
                      const percentage = maxCount > 0 ? ((count as number) / maxCount) * 100 : 0
                      const isActive = versionFilter.type === 'cimian' && versionFilter.version === version
                      return (
                        <button
                          key={version}
                          onClick={() => {
                            if (isActive) {
                              setVersionFilter({type: null, version: null})
                            } else {
                              setVersionFilter({type: 'cimian', version})
                            }
                          }}
                          className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all duration-200 ${
                            isActive
                              ? 'bg-blue-50 border border-blue-200 dark:bg-blue-900/30 dark:border-blue-700'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                          }`}
                        >
                          <div className="w-36 text-xs text-gray-600 dark:text-gray-400 text-left" title={version}>
                            {version}
                          </div>
                          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                            <div 
                              className={`h-4 rounded-full flex items-center justify-end pr-2 transition-all duration-300 ${
                                isActive 
                                  ? 'bg-gradient-to-r from-blue-400 to-blue-500' 
                                  : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500'
                              }`}
                              style={{ 
                                width: `${percentage}%`, 
                                minWidth: (count as number) > 0 ? '20px' : '0px' 
                              }}
                            >
                              <span className="text-xs font-extrabold text-white">
                                {count}
                              </span>
                            </div>
                          </div>
                        </button>
                      )
                    }) : !loading ? (
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
                        No Cimian versions found
                      </div>
                    ) : null
                  })()}
                </div>
              </div>

              {/* Munki Versions */}
              <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  Munki
                </h4>
                <div className="space-y-2">
                  {(() => {
                    const munkiVersions = installs
                      .filter(install => getDevicePlatform(install) === 'Macintosh')
                      .map(install => install.installs?.munki?.version || install.raw?.munki?.version)
                      .filter((version): version is string => Boolean(version))
                      .reduce((acc: Record<string, number>, version: string) => {
                        acc[version] = (acc[version] || 0) + 1
                        return acc
                      }, {})
                    
                    // Sort by version string (newest first) - simple string comparison for Munki versions
                    const sortedVersions = Object.entries(munkiVersions)
                      .sort(([versionA], [versionB]) => versionB.localeCompare(versionA, undefined, { numeric: true }))
                      .slice(0, 8) // Show top 8 versions
                    
                    const maxCount = Math.max(...Object.values(munkiVersions), 0)
                    
                    return sortedVersions.length > 0 ? sortedVersions.map(([version, count]) => {
                      const percentage = maxCount > 0 ? ((count as number) / maxCount) * 100 : 0
                      const isActive = versionFilter.type === 'munki' && versionFilter.version === version
                      return (
                        <button
                          key={version}
                          onClick={() => {
                            if (isActive) {
                              setVersionFilter({type: null, version: null})
                            } else {
                              setVersionFilter({type: 'munki', version})
                            }
                          }}
                          className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all duration-200 ${
                            isActive
                              ? 'bg-green-50 border border-green-200 dark:bg-green-900/30 dark:border-green-700'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                          }`}
                        >
                          <div className="w-36 text-xs text-gray-600 dark:text-gray-400 text-left" title={version}>
                            {version}
                          </div>
                          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                            <div 
                              className={`h-4 rounded-full flex items-center justify-end pr-2 transition-all duration-300 ${
                                isActive 
                                  ? 'bg-gradient-to-r from-green-400 to-green-500' 
                                  : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500'
                              }`}
                              style={{ 
                                width: `${percentage}%`, 
                                minWidth: (count as number) > 0 ? '20px' : '0px' 
                              }}
                            >
                              <span className="text-xs font-extrabold text-white">
                                {count}
                              </span>
                            </div>
                          </div>
                        </button>
                      )
                    }) : !loading ? (
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
                        No Munki versions found
                      </div>
                    ) : null
                  })()}
                </div>
              </div>
            </div>

            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Managed Packages</h3>
            
            {loading ? (
              <div className="space-y-4">
                {/* Loading skeleton for packages */}
                <div className="space-y-2">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="animate-pulse border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1">
                          <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                          <div>
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-1"></div>
                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                          </div>
                        </div>
                        <div className="w-8 h-5 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                {packageGroups.map((group) => (
                  <div key={group.name} className="border border-gray-200 dark:border-gray-600 rounded-lg">
                    {/* Package Header */}
                    <button
                      onClick={() => {
                        selectPackageVersion(group.name);
                        togglePackageExpansion(group.name);
                      }}
                      className={`w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg ${
                        selectedPackage === group.name ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <svg 
                          className={`w-4 h-4 text-gray-400 transition-transform ${group.expanded ? 'rotate-90' : ''}`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{group.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{group.totalCount} installations</div>
                        </div>
                      </div>
                      <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">
                        {group.totalCount}
                      </span>
                    </button>

                    {/* Version List */}
                    {group.expanded && (
                      <div className="border-t border-gray-200 dark:border-gray-600">
                        {group.versions.map((version) => (
                          <button
                            key={version.version}
                            onClick={() => selectPackageVersion(group.name, version.version)}
                            className={`w-full flex items-center justify-between p-2 pl-8 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                              selectedPackage === group.name && selectedPackageVersion === version.version 
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100' 
                                : ''
                            }`}
                          >
                            <span className="text-sm text-gray-700 dark:text-gray-300 truncate font-mono">{version.version}</span>
                            <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">
                              {version.count}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Content - Installs Table (67%) */}
        <div className="w-2/3 bg-white dark:bg-gray-800 overflow-hidden">
          <div className="h-full flex flex-col">
            {/* Content Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {selectedPackage ? `${selectedPackage} Installations` : 'All Package Installations'}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {(() => {
                      const totalPackages = filteredInstalls.flatMap(install => getFilteredPackagesForDevice(install)).length;
                      return `${totalPackages} package installations`;
                    })()}
                    {selectedPackage && selectedPackageVersion && ` • Version ${selectedPackageVersion}`}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {/* Search Input */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Search packages & devices..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="block w-64 pl-10 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        <svg className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Active Filters Indicator */}
            {(versionFilter.type && versionFilter.version) || platformFilter || selectedPackage ? (
              <div className="px-6 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
                      </svg>
                      <span className="text-sm font-medium text-blue-900 dark:text-blue-200">Active filters:</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {platformFilter && (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200">
                          Platform: {platformFilter}
                        </span>
                      )}
                      {selectedPackage && (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200">
                          Package: {selectedPackage}
                          {selectedPackageVersion && ` v${selectedPackageVersion}`}
                        </span>
                      )}
                      {versionFilter.type && versionFilter.version && (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200">
                          {versionFilter.type === 'cimian' ? 'Cimian' : 'Munki'} v{versionFilter.version}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setVersionFilter({type: null, version: null});
                      setPlatformFilter(null);
                      setSelectedPackage(null);
                      setSelectedPackageVersion(null);
                    }}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                  >
                    Clear all filters
                  </button>
                </div>
              </div>
            ) : null}
            
            {/* Filter Row */}
            <div className="border-b border-gray-200 dark:border-gray-600 px-4 lg:px-6 py-3 bg-gray-50 dark:bg-gray-700">
              <nav className="flex flex-wrap gap-2">
                {(() => {
                  // Calculate counts based on currently visible/filtered data
                  const allPackages = filteredInstalls.flatMap(install => getFilteredPackagesForDevice(install))
                  const installedCount = allPackages.filter((pkg: any) => pkg.status?.toLowerCase() === 'installed').length
                  const pendingCount = allPackages.filter((pkg: any) => pkg.status?.toLowerCase() === 'pending').length
                  const warningCount = allPackages.filter((pkg: any) => pkg.status?.toLowerCase() === 'warning').length
                  const errorCount = allPackages.filter((pkg: any) => pkg.status?.toLowerCase() === 'error').length
                  const removedCount = allPackages.filter((pkg: any) => pkg.status?.toLowerCase() === 'removed').length
                  
                  const filters = [
                    { key: 'all', label: 'All', count: allPackages.length },
                    { key: 'installed', label: 'Installed', count: installedCount },
                    { key: 'pending', label: 'Pending', count: pendingCount },
                    { key: 'warning', label: 'Warning', count: warningCount },
                    { key: 'error', label: 'Error', count: errorCount },
                    { key: 'removed', label: 'Removed', count: removedCount },
                  ]

                  return filters.map((filter) => {
                    const isActive = filter.key === 'all' ? statusFilter.length === 0 : statusFilter.includes(filter.key)
                    
                    return (
                      <button
                        key={filter.key}
                        onClick={() => {
                          if (filter.key === 'all') {
                            setStatusFilter([])
                          } else {
                            setStatusFilter(prev => 
                              prev.includes(filter.key) 
                                ? prev.filter(f => f !== filter.key)
                                : [...prev, filter.key]
                            )
                          }
                        }}
                        className={`${
                          isActive
                            ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-600'
                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-500'
                        } px-3 py-1.5 border rounded-lg text-sm font-medium flex items-center gap-2 transition-colors`}
                      >
                        <span className="hidden lg:inline">{filter.label}</span>
                        <span className="lg:hidden">{filter.key === 'all' ? 'All' : filter.label}</span>
                        <span className={`${
                          isActive 
                            ? 'bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200'
                            : 'bg-gray-200 text-gray-700 dark:bg-gray-500 dark:text-gray-200'
                        } inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ml-1`}>
                          {filter.count}
                        </span>
                      </button>
                    )
                  })
                })()}
              </nav>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                  <tr>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Package
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Device
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Version
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Last Update
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Primate
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                  {loading ? (
                    loadingProgress ? (
                      <tr>
                        <td colSpan={6} className="px-4 lg:px-6 py-8">
                          <div className="flex flex-col items-center gap-4">
                            <div className="flex items-center gap-3">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                Loading Install Reports
                              </span>
                            </div>
                            
                            <div className="w-full max-w-md space-y-3">
                              <div className="flex justify-center text-xs text-gray-600 dark:text-gray-400">
                                <span>Progress: {loadingProgress.current}/{loadingProgress.total} devices</span>
                              </div>
                              
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                                <div 
                                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300 ease-out flex items-center justify-end pr-2"
                                  style={{ 
                                    width: `${loadingProgress.total > 0 ? (loadingProgress.current / loadingProgress.total) * 100 : 0}%`,
                                    minWidth: loadingProgress.current > 0 ? '12px' : '0px'
                                  }}
                                >
                                  {loadingProgress.total > 0 && (
                                    <span className="text-xs font-extrabold text-white">
                                      {Math.round((loadingProgress.current / loadingProgress.total) * 100)}%
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              {/* Visual batch indicators */}
                              <div className="flex justify-center gap-1 mt-4">
                                {Array.from({ length: loadingProgress.totalBatches }).map((_, index) => (
                                  <div
                                    key={index}
                                    className={`w-2 h-2 rounded-full transition-all duration-200 ${
                                      index < loadingProgress.currentBatch
                                        ? 'bg-green-500'
                                        : index === loadingProgress.currentBatch - 1
                                        ? 'bg-blue-500 animate-pulse'
                                        : 'bg-gray-300 dark:bg-gray-600'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      Array.from({ length: 10 }).map((_, index) => (
                        <tr key={index} className="animate-pulse">
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                          </td>
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                          </td>
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                          </td>
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                          </td>
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                          </td>
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                          </td>
                        </tr>
                      ))
                    )
                  ) : filteredInstalls.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 lg:px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">No installations found</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              {searchQuery 
                                ? `No results match "${searchQuery}"`
                                : 'Try adjusting your filters or search criteria'
                              }
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredInstalls.flatMap(install => {
                      const packages = getFilteredPackagesForDevice(install);
                      return packages.map((pkg: any, pkgIndex: number) => (
                        <tr key={`${install.id}-${pkgIndex}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {pkg.name || 'Unknown Package'}
                            </div>
                          </td>
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                            <Link 
                              href={`/devices/${install.id}`}
                              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                            >
                              {install.raw?.inventory?.deviceName || install.deviceName || install.serialNumber || 'Unknown Device'}
                            </Link>
                            <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                              {install.serialNumber}
                            </div>
                          </td>
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-900 dark:text-white font-mono">
                              {pkg.version || 'Unknown'}
                            </span>
                          </td>
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(pkg.status)}`}>
                              {pkg.status || 'Unknown'}
                            </span>
                          </td>
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {pkg.last_update ? formatDateTime(pkg.last_update) : 'Never'}
                          </td>
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {(() => {
                                const platform = getDevicePlatform(install);
                                if (platform === 'Windows') {
                                  const cimianVersion = install.installs?.cimian?.version || install.raw?.cimian?.version;
                                  return cimianVersion ? cimianVersion : 'Unknown';
                                } else if (platform === 'Macintosh') {
                                  const munkiVersion = install.installs?.munki?.version || install.raw?.munki?.version;
                                  return munkiVersion ? munkiVersion : 'Unknown';
                                }
                                return 'Unknown';
                              })()}
                            </span>
                          </td>
                        </tr>
                      ));
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InstallsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-black animate-pulse"></div>}>
      <InstallsPageContent />
    </Suspense>
  )
}

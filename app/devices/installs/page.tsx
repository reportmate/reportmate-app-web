"use client"

import { useState, useEffect, Suspense, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { DevicePageNavigation } from '../../../src/components/navigation/DevicePageNavigation'
import { formatRelativeTime } from '../../../src/lib/time'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

interface FilterOptions {
  managedInstalls: string[]
  otherInstalls: string[]
  totalManagedInstalls: number
  totalOtherInstalls: number
  usages: string[]
  catalogs: string[]
  rooms: string[]
  fleets: string[]
  platforms: string[]
  devicesWithData: number
}

interface InstallRecord {
  id: string
  deviceId: string
  deviceName: string
  serialNumber: string
  assetTag?: string
  lastSeen: string
  name: string
  version?: string
  status?: string
  source?: string
  usage?: string
  catalog?: string
  room?: string
  fleet?: string
  platform?: string
  raw?: any
}

function InstallsPageContent() {
  const [installs, setInstalls] = useState<InstallRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [filtersLoading, setFiltersLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 })
  const [loadingMessage, setLoadingMessage] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filtersExpanded, setFiltersExpanded] = useState(true)
  const [devices, setDevices] = useState<any[]>([])
  const [isConfigReport, setIsConfigReport] = useState(false)
  const [configReportData, setConfigReportData] = useState<any[]>([])
  const [selectedManifest, setSelectedManifest] = useState<string>('')
  const [selectedSoftwareRepo, setSelectedSoftwareRepo] = useState<string>('')
  const [selectedMunkiVersion, setSelectedMunkiVersion] = useState<string>('')
  const [selectedCimianVersion, setSelectedCimianVersion] = useState<string>('')
  const [hasGeneratedReport, setHasGeneratedReport] = useState(false)
  const [reportProgress, setReportProgress] = useState(0)
  
  // Sorting state for config report
  const [sortColumn, setSortColumn] = useState<string>('deviceName')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  
  // Filter state
  const [selectedInstalls, setSelectedInstalls] = useState<string[]>([])
  const [selectedUsages, setSelectedUsages] = useState<string[]>([])
  const [selectedCatalogs, setSelectedCatalogs] = useState<string[]>([])
  const [selectedRooms, setSelectedRooms] = useState<string[]>([])
  const [selectedFleets, setSelectedFleets] = useState<string[]>([])
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  
  // Track last applied filters to detect changes for smart button text
  const [lastAppliedFilters, setLastAppliedFilters] = useState<{
    installs: string[]
    usages: string[]
    catalogs: string[]
    rooms: string[]
    fleets: string[]
    platforms: string[]
  }>({ installs: [], usages: [], catalogs: [], rooms: [], fleets: [], platforms: [] })
  
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    managedInstalls: [],
    otherInstalls: [],
    totalManagedInstalls: 0,
    totalOtherInstalls: 0,
    usages: [],
    catalogs: [],
    rooms: [],
    fleets: [],
    platforms: [],
    devicesWithData: 0
  })

  // Filter toggle functions
  const toggleInstall = (install: string) => {
    setSelectedInstalls(prev => 
      prev.includes(install) 
        ? prev.filter(s => s !== install)
        : [...prev, install]
    )
  }

  const toggleUsage = (usage: string) => {
    setSelectedUsages(prev => 
      prev.includes(usage.toLowerCase()) 
        ? prev.filter(u => u !== usage.toLowerCase())
        : [...prev, usage.toLowerCase()]
    )
  }

  const toggleCatalog = (catalog: string) => {
    setSelectedCatalogs(prev => 
      prev.includes(catalog.toLowerCase()) 
        ? prev.filter(c => c !== catalog.toLowerCase())
        : [...prev, catalog.toLowerCase()]
    )
  }

  const toggleRoom = (room: string) => {
    setSelectedRooms(prev => 
      prev.includes(room) 
        ? prev.filter(r => r !== room)
        : [...prev, room]
    )
  }

  const toggleFleet = (fleet: string) => {
    setSelectedFleets(prev => 
      prev.includes(fleet) 
        ? prev.filter(f => f !== fleet)
        : [...prev, fleet]
    )
  }

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    )
  }

  const clearAllFilters = () => {
    setSelectedInstalls([])
    setSelectedUsages([])
    setSelectedCatalogs([])
    setSelectedRooms([])
    setSelectedFleets([])
    setSelectedPlatforms([])
  }

  // Fetch filter options
  const fetchFilterOptions = useCallback(async () => {
    let progressInterval: NodeJS.Timeout | null = null
    try {
      setFiltersLoading(true)
      setError(null) // Clear any previous errors
      
      // Check if we have cached data in sessionStorage
      const cachedData = sessionStorage.getItem('installs-filter-options')
      const cachedTimestamp = sessionStorage.getItem('installs-filter-timestamp')
      const cacheExpiry = 5 * 60 * 1000 // 5 minutes
      
      if (cachedData && cachedTimestamp) {
        const age = Date.now() - parseInt(cachedTimestamp)
        if (age < cacheExpiry) {
          console.log('[INSTALLS PAGE] Using cached filter data (age:', Math.round(age / 1000), 'seconds)')
          const data = JSON.parse(cachedData)
          
          setFilterOptions(data)
          
          if (data.devices && Array.isArray(data.devices)) {
            setDevices(data.devices)
          }
          
          setLoadingMessage('Loaded from cache')
          setLoadingProgress({ current: data.devicesWithData || 0, total: data.devicesWithData || 0 })
          setFiltersLoading(false)
          return
        } else {
          console.log('[INSTALLS PAGE] Cache expired (age:', Math.round(age / 1000), 'seconds), fetching fresh data')
        }
      }
      
      // Show loading state without specific numbers initially
      setLoadingProgress({ current: 0, total: 0 })
      
      // Start fetching - we'll simulate progress with estimated device count
      let progress = 0
      const estimatedTotal = 234 // Estimated device count (will be replaced with actual)
      
      progressInterval = setInterval(() => {
        // Progress quickly to 85%, then slow down dramatically, but keep moving
        if (progress < Math.floor(estimatedTotal * 0.85)) {
          progress += 5 // Fast progress to 85% (0-6 seconds)
          setLoadingMessage('Fetching device data...')
        } else if (progress < Math.floor(estimatedTotal * 0.95)) {
          progress += 1 // Medium slow progress from 85% to 95%
          setLoadingMessage('Processing devices...')
        } else if (progress < Math.floor(estimatedTotal * 0.995)) {
          progress += 0.5 // Very slow progress from 95% to 99.5%, keeps moving but never reaches 100%
          setLoadingMessage('Caching device data...')
        }
        setLoadingProgress({ current: Math.floor(progress), total: estimatedTotal })
      }, 200)
      
      const response = await fetch('/api/devices/installs/filters', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      
      if (!response.ok) {
        console.error('[INSTALLS PAGE] Filters API failed:', response.status, response.statusText)
        throw new Error(`API returned ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format from filters API')
      }
      
      // Clear the progress interval
      if (progressInterval) {
        clearInterval(progressInterval)
        progressInterval = null
      }
      
      // Get the actual device count from the response
      const actualDeviceCount = data.devicesWithData || 0
      
      setFilterOptions(data)
      
      // Extract device data from same response (no second API call needed)
      if (data.devices && Array.isArray(data.devices)) {
        setDevices(data.devices)
        console.log('[INSTALLS PAGE] Loaded', data.devices.length, 'devices with installs data from single API call')
        
        // Debug: Check Cimian versions
        const cimianCount = data.devices.filter((d: any) => d.modules?.installs?.cimian?.version).length
        console.log('[INSTALLS PAGE] Devices with Cimian version:', cimianCount)
        
        if (cimianCount > 0) {
          const sample = data.devices.find((d: any) => d.modules?.installs?.cimian?.version)
          console.log('[INSTALLS PAGE] Sample Cimian version:', sample?.modules?.installs?.cimian?.version)
        }
      }
      
      // Cache the data in sessionStorage for 5 minutes
      try {
        sessionStorage.setItem('installs-filter-options', JSON.stringify(data))
        sessionStorage.setItem('installs-filter-timestamp', Date.now().toString())
        console.log('[INSTALLS PAGE] Cached filter data for future page loads')
      } catch (e) {
        console.warn('[INSTALLS PAGE] Failed to cache data in sessionStorage:', e)
      }
      
      // Set progress to complete with actual device count
      setLoadingMessage('Complete!')
      setLoadingProgress({ current: actualDeviceCount, total: actualDeviceCount })
      console.log('[INSTALLS PAGE] Filter options loaded successfully:', {
        managedInstalls: data.managedInstalls?.length || 0,
        usages: data.usages?.length || 0,
        catalogs: data.catalogs?.length || 0,
        rooms: data.rooms?.length || 0,
        devicesWithData: actualDeviceCount,
        devicesLoaded: data.devices?.length || 0,
        loadTime: 'fresh from API'
      })
    } catch (error) {
      console.error('[INSTALLS PAGE] Error fetching filter options:', error)
      setError(error instanceof Error ? error.message : 'Failed to load filter options. Please check API connectivity.')
      setLoadingProgress({ current: 0, total: 0 })
    } finally {
      if (progressInterval) {
        clearInterval(progressInterval)
      }
      setFiltersLoading(false)
    }
  }, [])

  // Generate report function
  const handleGenerateReport = async () => {
    if (selectedInstalls.length === 0) {
      setError('Please select at least one install to generate the report.')
      return
    }

    let progressInterval: NodeJS.Timeout | null = null

    try {
      setLoading(true)
      setError(null)
      setReportProgress(0)
      setLoadingMessage('Initializing request...')
      
      // Collapse filters and clear search when generating report
      setFiltersExpanded(false)
      setSearchQuery('')

      // Simulate progress for the long-running API call
      progressInterval = setInterval(() => {
        setReportProgress(prev => {
          // Fast start, then slow down
          const increment = prev < 30 ? 2 : prev < 60 ? 0.5 : prev < 85 ? 0.2 : 0.05
          const next = Math.min(prev + increment, 95)
          
          // Update messages based on progress stages to give feedback
          if (next < 20) setLoadingMessage('Querying device database...')
          else if (next < 40) setLoadingMessage('Retrieving install records...')
          else if (next < 60) setLoadingMessage('Processing device data...')
          else if (next < 80) setLoadingMessage('Filtering results...')
          else setLoadingMessage('Finalizing report...')
          
          return next
        })
      }, 200)

      const params = new URLSearchParams()
      selectedInstalls.forEach(install => params.append('installs', install))
      selectedUsages.forEach(usage => params.append('usages', usage))
      selectedCatalogs.forEach(catalog => params.append('catalogs', catalog))
      selectedRooms.forEach(room => params.append('rooms', room))
      selectedFleets.forEach(fleet => params.append('fleets', fleet))
      selectedPlatforms.forEach(platform => params.append('platforms', platform))

      const response = await fetch(`/api/devices/installs?${params}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (Array.isArray(data)) {
        setInstalls(data)
        setHasGeneratedReport(true)
      } else {
        console.error('API returned non-array data:', data)
        if (data.error || data.message) {
          setError(data.error || data.message)
        } else {
          setError('Received invalid data format from API')
        }
        setInstalls([])
      }
      
      // Save current filters as "last applied" for smart button detection
      setLastAppliedFilters({
        installs: [...selectedInstalls],
        usages: [...selectedUsages],
        catalogs: [...selectedCatalogs],
        rooms: [...selectedRooms],
        fleets: [...selectedFleets],
        platforms: [...selectedPlatforms]
      })
    } catch (error) {
      console.error('Error generating installs report:', error)
      setError(error instanceof Error ? error.message : 'Unknown error occurred')
    } finally {
      if (progressInterval) clearInterval(progressInterval)
      setReportProgress(100)
      setLoadingMessage('Complete!')
      // Small delay to show 100% before hiding
      setTimeout(() => {
        setLoading(false)
      }, 500)
    }
  }

  // Detect if current filters differ from last applied (for smart button text)
  const filtersChanged = useMemo(() => {
    if (installs.length === 0) return false
    
    const arraysEqual = (a: string[], b: string[]) => {
      if (a.length !== b.length) return false
      const sortedA = [...a].sort()
      const sortedB = [...b].sort()
      return sortedA.every((val, idx) => val === sortedB[idx])
    }
    
    return !arraysEqual(selectedInstalls, lastAppliedFilters.installs) ||
           !arraysEqual(selectedUsages, lastAppliedFilters.usages) ||
           !arraysEqual(selectedCatalogs, lastAppliedFilters.catalogs) ||
           !arraysEqual(selectedRooms, lastAppliedFilters.rooms) ||
           !arraysEqual(selectedFleets, lastAppliedFilters.fleets) ||
           !arraysEqual(selectedPlatforms, lastAppliedFilters.platforms)
  }, [selectedInstalls, selectedUsages, selectedCatalogs, selectedRooms, selectedFleets, selectedPlatforms, lastAppliedFilters, installs.length])
  
  // Config Report handler
  const handleConfigReport = async () => {
    try {
      setLoading(true)
      setError(null)
      setFiltersExpanded(false)
      setSearchQuery('')
      
      // Process devices to extract config data
      const configData = devices.map(device => {
        const cimianConfig = device.modules?.installs?.cimian
        const munkiConfig = device.modules?.installs?.munki
        
        // Prefer Cimian over Munki
        const config = cimianConfig || munkiConfig
        const isCimian = !!cimianConfig
        
        // Get most recent session
        const sessions = config?.sessions || []
        const latestSession = sessions.length > 0 ? sessions[0] : null
        
        return {
          deviceId: device.deviceId,
          serialNumber: device.serialNumber,
          deviceName: device.modules?.inventory?.deviceName || device.serialNumber,
          usage: device.modules?.inventory?.usage || 'Unknown',
          catalog: device.modules?.inventory?.catalog || 'Unknown',
          room: device.modules?.inventory?.location || 'Unknown',
          fleet: device.modules?.inventory?.fleet || 'Unknown',
          lastSeen: device.lastSeen,
          // Config data
          configType: isCimian ? 'Cimian' : (munkiConfig ? 'Munki' : 'None'),
          clientIdentifier: config?.config?.ClientIdentifier || config?.config?.clientIdentifier || 'N/A',
          softwareRepoUrl: config?.config?.SoftwareRepoURL || config?.config?.softwareRepoUrl || 'N/A',
          version: config?.version || 'N/A',
          lastSessionStatus: latestSession?.status || 'N/A',
          totalPackagesManaged: latestSession?.totalPackagesManaged || 0
        }
      }).filter(d => d.configType !== 'None')
      
      setConfigReportData(configData)
      setIsConfigReport(true)
      setInstalls([]) // Clear regular installs report
    } catch (error) {
      console.error('Error generating config report:', error)
      setError(error instanceof Error ? error.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }
  
  // Reset report handler
  const handleResetReport = () => {
    setInstalls([])
    setHasGeneratedReport(false)
    setConfigReportData([])
    setIsConfigReport(false)
    setSelectedManifest('')
    setSelectedSoftwareRepo('')
    setSelectedMunkiVersion('')
    setSelectedCimianVersion('')
    setSortColumn('deviceName')
    setSortDirection('asc')
    setLastAppliedFilters({ installs: [], usages: [], catalogs: [], rooms: [], fleets: [], platforms: [] })
    setSearchQuery('')
  }
  
  // Sort handler for config report
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }
  
  // Filter and sort config report data
  const filteredConfigData = useMemo(() => {
    let filtered = [...configReportData]
    
    // Filter by selected manifest
    if (selectedManifest) {
      filtered = filtered.filter(device => device.clientIdentifier === selectedManifest)
    }
    
    // Filter by selected software repo
    if (selectedSoftwareRepo) {
      filtered = filtered.filter(device => device.softwareRepoUrl === selectedSoftwareRepo)
    }
    
    // Filter by selected Munki version
    if (selectedMunkiVersion) {
      filtered = filtered.filter(device => device.configType === 'Munki' && device.version === selectedMunkiVersion)
    }
    
    // Filter by selected Cimian version
    if (selectedCimianVersion) {
      filtered = filtered.filter(device => device.configType === 'Cimian' && device.version === selectedCimianVersion)
    }
    
    // Sort data
    filtered.sort((a, b) => {
      let aVal = a[sortColumn]
      let bVal = b[sortColumn]
      
      // Handle different data types
      if (typeof aVal === 'string') aVal = aVal.toLowerCase()
      if (typeof bVal === 'string') bVal = bVal.toLowerCase()
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
    
    return filtered
  }, [configReportData, selectedManifest, selectedSoftwareRepo, selectedMunkiVersion, selectedCimianVersion, sortColumn, sortDirection])
  
  // Filter installs based on search query
  const filteredInstalls = useMemo(() => {
    if (!searchQuery) return installs
    
    const lowerQuery = searchQuery.toLowerCase()
    
    return installs.filter(install => 
      install.deviceName?.toLowerCase().includes(lowerQuery) ||
      install.serialNumber?.toLowerCase().includes(lowerQuery) ||
      install.name?.toLowerCase().includes(lowerQuery) ||
      install.version?.toLowerCase().includes(lowerQuery) ||
      install.source?.toLowerCase().includes(lowerQuery) ||
      // Add support for "Name - Version" search from widget clicks
      `${install.name} - ${install.version || 'Unknown'}`.toLowerCase().includes(lowerQuery)
    )
  }, [installs, searchQuery])

  useEffect(() => {
    fetchFilterOptions()
  }, [fetchFilterOptions])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
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
                {/* Installs Icon - Emerald color and correct path */}
                <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                    Installs Report
                  </h1>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <div className="hidden lg:flex">
                <DevicePageNavigation className="flex items-center gap-2" />
              </div>
              <div className="lg:hidden">
                <DevicePageNavigation className="flex items-center gap-2" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4 sm:pb-8 pt-2 sm:pt-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-16 z-40 bg-white dark:bg-gray-800 rounded-t-xl">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {isConfigReport ? 'Config Report' : 'Installs Report'} {(isConfigReport ? configReportData.length : filteredInstalls.length) > 0 && `(${isConfigReport ? configReportData.length : filteredInstalls.length})`}
                {(searchQuery || selectedInstalls.length > 0 || selectedUsages.length > 0 || selectedCatalogs.length > 0 || selectedRooms.length > 0 || selectedFleets.length > 0 || selectedPlatforms.length > 0) && installs.length > 0 && (
                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
                    (filtered)
                  </span>
                )}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {isConfigReport
                  ? `Showing configuration details for ${configReportData.length} devices with Cimian or Munki`
                  : installs.length === 0 
                    ? hasGeneratedReport
                      ? 'No install records found matching your criteria.'
                      : 'Select managed installs from the filters to generate your report, or click "Config Report" to view all device configurations'
                    : `Showing ${filteredInstalls.length} of ${installs.length} install records`
                }
              </p>
            </div>

            {/* Action Buttons in Header */}
            <div className="flex items-center gap-4">
              {/* Generate Report Button with Loading Spinner */}
              <div className="flex items-center gap-3">
                {/* Clear All Selections Button - Show when selections are active and NO report loaded */}
                {(selectedInstalls.length > 0 || selectedUsages.length > 0 || selectedCatalogs.length > 0 || selectedRooms.length > 0 || selectedFleets.length > 0 || selectedPlatforms.length > 0) && !loading && installs.length === 0 && configReportData.length === 0 && (
                  <button
                    onClick={clearAllFilters}
                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded-lg transition-colors whitespace-nowrap font-medium"
                  >
                    Clear All Selections
                  </button>
                )}
                
                {/* Generate Report Button - Show when filters are selected */}
                {!loading && selectedInstalls.length > 0 && (
                  <button
                    onClick={handleGenerateReport}
                    disabled={selectedInstalls.length === 0}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors whitespace-nowrap font-medium"
                  >
                    {filtersChanged ? 'Update Report' : 'Generate Report'}
                  </button>
                )}
                
                {/* Config Report Button - Show when NO filters selected, NO report loaded, and data is loaded */}
                {!loading && !filtersLoading && selectedInstalls.length === 0 && installs.length === 0 && configReportData.length === 0 && (
                  <button
                    onClick={handleConfigReport}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors whitespace-nowrap font-medium flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Config Report
                  </button>
                )}

                {/* Reset Button - Show after report is generated */}
                {(installs.length > 0 || configReportData.length > 0) && !loading && (
                  <button
                    onClick={handleResetReport}
                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded-lg transition-colors whitespace-nowrap font-medium flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Reset Report
                  </button>
                )}
              </div>

              {/* Export CSV Button */}
              {(filteredInstalls.length > 0 || configReportData.length > 0) && (
                <button
                  onClick={() => {
                    if (isConfigReport) {
                      // Export config report CSV
                      const csvContent = [
                        ['Device Name', 'Serial Number', 'System', 'Manifest', 'Repo', 'Version', 'Last Session Status', 'Managed Items'].join(','),
                        ...filteredConfigData.map(device => [
                          device.deviceName,
                          device.serialNumber,
                          device.configType,
                          device.clientIdentifier,
                          device.softwareRepoUrl,
                          device.version,
                          device.lastSessionStatus,
                          device.totalPackagesManaged
                        ].map(field => `\"${String(field).replace(/\"/g, '\"\"')}\"`).join(','))
                      ].join('\\n')
                      
                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
                      const link = document.createElement('a')
                      link.href = URL.createObjectURL(blob)
                      link.download = `config-report-${new Date().toISOString().split('T')[0]}.csv`
                      link.click()
                    } else {
                      // Export installs report CSV
                      const csvContent = [
                        ['Device Name', 'Serial Number', 'Install', 'Version', 'Status', 'Usage', 'Catalog', 'Room', 'Fleet', 'Platform', 'Last Seen'].join(','),
                        ...filteredInstalls.map(install => [
                          install.deviceName,
                          install.serialNumber,
                          install.name,
                          install.version || '',
                          install.status || '',
                          install.usage || '',
                          install.catalog || '',
                          install.room || '',
                          install.fleet || '',
                          install.platform || '',
                          install.lastSeen
                        ].map(field => `\"${String(field).replace(/\"/g, '\"\"')}\"`).join(','))
                      ].join('\\n')
                      
                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
                      const link = document.createElement('a')
                      link.href = URL.createObjectURL(blob)
                      link.download = `installs-report-${new Date().toISOString().split('T')[0]}.csv`
                      link.click()
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-colors whitespace-nowrap font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export CSV
                </button>
              )}
            </div>
          </div>

          {/* Error Display */}
          {error && !filtersLoading && (
            <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg dark:bg-red-900 dark:border-red-700 dark:text-red-200 flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={() => {
                  setError(null)
                  fetchFilterOptions()
                }}
                className="ml-4 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {/* Top Cards - Always Visible */}
          <div className="px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            
            {/* Top Row: Manifests + Software Repo + Munki + Cimian */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
              
              {/* First Column: Manifest Distribution (1/4 width) */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Manifests
                </h3>
                <div className="h-40 overflow-y-auto space-y-3">
                  {(() => {
                    console.log('[MANIFEST WIDGET] Total devices:', devices?.length || 0)
                    
                    // Show loading state if no devices loaded yet
                    if (!devices || devices.length === 0) {
                      return (
                        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                          Loading...
                        </div>
                      )
                    }
                    
                    // Collect manifests from Cimian ClientIdentifier
                    const manifestCounts: Record<string, { count: number; devices: any[] }> = {}
                    
                    devices.forEach((device: any) => {
                      // Check Cimian ClientIdentifier (the manifest path)
                      const cimianManifest = device?.modules?.installs?.cimian?.config?.ClientIdentifier
                      if (cimianManifest) {
                        if (!manifestCounts[cimianManifest]) {
                          manifestCounts[cimianManifest] = { count: 0, devices: [] }
                        }
                        manifestCounts[cimianManifest].count++
                        manifestCounts[cimianManifest].devices.push(device)
                      }
                      
                      // Also check Munki manifest if available
                      const munkiManifest = device?.modules?.installs?.munki?.manifest
                      if (munkiManifest && munkiManifest !== cimianManifest) {
                        if (!manifestCounts[munkiManifest]) {
                          manifestCounts[munkiManifest] = { count: 0, devices: [] }
                        }
                        manifestCounts[munkiManifest].count++
                        manifestCounts[munkiManifest].devices.push(device)
                      }
                    })
                    
                    const manifestEntries = Object.entries(manifestCounts).sort(([,a], [,b]) => b.count - a.count)
                    
                    console.log('[MANIFEST WIDGET] Total manifests:', manifestEntries.length)
                    
                    if (manifestEntries.length === 0) {
                      return (
                        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                          No manifests found
                        </div>
                      )
                    }
                    
                    const totalDevicesWithManifests = Object.values(manifestCounts).reduce((sum, data) => sum + data.count, 0)
                    
                    return manifestEntries.map(([manifest, data]) => {
                      const percentage = totalDevicesWithManifests > 0 ? Math.round((data.count / totalDevicesWithManifests) * 100) : 0
                      const isSelected = selectedManifest === manifest
                      return (
                        <div key={manifest}>
                          <div className="flex items-center justify-between mb-1">
                            <button
                              onClick={() => {
                                if (isConfigReport) {
                                  setSelectedManifest(isSelected ? '' : manifest)
                                } else {
                                  const deviceSerials = data.devices.map((d: any) => d.serialNumber)
                                  console.log('Generate report for manifest:', manifest, deviceSerials)
                                }
                              }}
                              className={`text-sm font-medium truncate transition-colors ${
                                isSelected 
                                  ? 'text-purple-600 dark:text-purple-400 font-bold' 
                                  : 'text-gray-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400'
                              }`}
                            >
                              {isSelected && '✓ '}{manifest}
                            </button>
                            <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                              {data.count}
                            </span>
                          </div>
                          <div 
                            onClick={() => {
                              if (isConfigReport) {
                                setSelectedManifest(isSelected ? '' : manifest)
                              } else {
                                const deviceSerials = data.devices.map((d: any) => d.serialNumber)
                                console.log('Generate report for manifest:', manifest, deviceSerials)
                              }
                            }}
                            className={`w-full rounded-full h-2 cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-purple-300 dark:bg-purple-800'
                                : 'bg-gray-200 dark:bg-gray-600 hover:bg-purple-200 dark:hover:bg-purple-700'
                            }`}
                          >
                            <div 
                              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      )
                    })
                  })()}
                </div>
              </div>

              {/* Second Column: Software Repo Widget (1/4 width) */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Software Repos
                </h3>
                <div className="h-40 overflow-y-auto space-y-3">
                  {(() => {
                    if (!devices || devices.length === 0) {
                      return (
                        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                          Loading...
                        </div>
                      )
                    }
                    
                    const repoCounts: Record<string, number> = {}
                    devices.forEach((d: any) => {
                      const repoUrl = d.modules?.installs?.cimian?.config?.SoftwareRepoURL || d.modules?.installs?.munki?.config?.softwareRepoUrl
                      if (repoUrl) {
                        repoCounts[repoUrl] = (repoCounts[repoUrl] || 0) + 1
                      }
                    })
                    
                    const repoEntries = Object.entries(repoCounts).sort(([,a], [,b]) => b - a)
                    
                    if (repoEntries.length === 0) {
                      return (
                        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                          No software repos found
                        </div>
                      )
                    }
                    
                    const totalDevicesWithRepos = Object.values(repoCounts).reduce((sum, count) => sum + count, 0)
                    
                    return repoEntries.map(([repo, count]) => {
                      const percentage = totalDevicesWithRepos > 0 ? Math.round((count / totalDevicesWithRepos) * 100) : 0
                      const repoDisplay = repo.replace(/^https?:\/\//, '').split('/')[0]
                      const isSelected = selectedSoftwareRepo === repo
                      return (
                        <div key={repo}>
                          <div className="flex items-center justify-between mb-1">
                            <button
                              onClick={() => {
                                if (isConfigReport) {
                                  setSelectedSoftwareRepo(isSelected ? '' : repo)
                                }
                              }}
                              className={`text-sm font-medium truncate transition-colors ${
                                isSelected 
                                  ? 'text-blue-600 dark:text-blue-400 font-bold' 
                                  : 'text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400'
                              }`}
                              title={repo}
                            >
                              {isSelected && '✓ '}{repoDisplay}
                            </button>
                            <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                              {count}
                            </span>
                          </div>
                          <div 
                            onClick={() => {
                              if (isConfigReport) {
                                setSelectedSoftwareRepo(isSelected ? '' : repo)
                              }
                            }}
                            className={`w-full rounded-full h-2 cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-blue-300 dark:bg-blue-800'
                                : 'bg-gray-200 dark:bg-gray-600 hover:bg-blue-200 dark:hover:bg-blue-700'
                            }`}
                          >
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      )
                    })
                  })()}
                </div>
              </div>

              {/* COMMENTED OUT: Error + Warning Cards 
              <div className="space-y-4">
                {devices.length > 0 ? (
                  <>
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                            {devices.filter((d: any) => d.modules?.installs?.cimian?.items?.some((item: any) => item.currentStatus?.toLowerCase().includes('error') || item.currentStatus?.toLowerCase().includes('failed'))).length}
                          </p>
                          <p className="text-sm text-red-700 dark:text-red-300">Errors</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                            {devices.filter((d: any) => d.modules?.installs?.cimian?.items?.some((item: any) => item.currentStatus?.toLowerCase().includes('warning') || item.currentStatus?.toLowerCase().includes('pending'))).length}
                          </p>
                          <p className="text-sm text-yellow-700 dark:text-yellow-300">Warnings</p>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-gray-400">-</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Errors</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-gray-400">-</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Warnings</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
              */}

              {/* Third Column: Munki Version Distribution (1/4 width) */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Munki Versions
                </h3>
                <div className="h-40 overflow-y-auto space-y-2">
                  {(() => {
                    console.log('[MUNKI WIDGET] Total devices:', devices?.length || 0)
                    
                    // Show loading state if no devices loaded yet
                    if (!devices || devices.length === 0) {
                      return (
                        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                          Loading...
                        </div>
                      )
                    }
                    
                    const munkiDevices = (devices || []).filter((d: any) => {
                      const hasMunki = d?.modules?.installs?.munki?.version
                      return hasMunki
                    })
                    
                    console.log('[MUNKI WIDGET] Devices with Munki:', munkiDevices.length)
                    
                    if (munkiDevices.length === 0) {
                      return (
                        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                          No Munki installations found
                        </div>
                      )
                    }
                    
                    const versionGroups = Object.entries(
                      munkiDevices.reduce((acc: Record<string, { count: number; devices: any[] }>, device: any) => {
                        const version = device.modules.installs.munki.version || 'Unknown'
                        if (!acc[version]) {
                          acc[version] = { count: 0, devices: [] }
                        }
                        acc[version].count++
                        acc[version].devices.push(device)
                        return acc
                      }, {})
                    ).sort(([,a], [,b]) => b.count - a.count)
                    
                    return versionGroups.map(([version, data]) => {
                      const total = munkiDevices.length
                      const percentage = total > 0 ? Math.round((data.count / total) * 100) : 0
                      const isSelected = selectedMunkiVersion === version
                      return (
                        <div key={version}>
                          <div className="flex items-center justify-between mb-1">
                            <button
                              onClick={() => {
                                if (isConfigReport) {
                                  setSelectedMunkiVersion(isSelected ? '' : version)
                                } else {
                                  const deviceSerials = data.devices.map((d: any) => d.serialNumber)
                                  console.log('Generate report for Munki version:', version, deviceSerials)
                                }
                              }}
                              className={`text-sm font-medium truncate transition-colors ${
                                isSelected 
                                  ? 'text-blue-600 dark:text-blue-400 font-bold' 
                                  : 'text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400'
                              }`}
                            >
                              {isSelected && '✓ '}{version}
                            </button>
                            <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                              {data.count} ({percentage}%)
                            </span>
                          </div>
                          <div
                            onClick={() => {
                              if (isConfigReport) {
                                setSelectedMunkiVersion(isSelected ? '' : version)
                              } else {
                                const deviceSerials = data.devices.map((d: any) => d.serialNumber)
                                console.log('Generate report for Munki version:', version, deviceSerials)
                              }
                            }}
                            className={`w-full rounded-full h-2 cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-blue-300 dark:bg-blue-800'
                                : 'bg-gray-200 dark:bg-gray-600 hover:bg-blue-200 dark:hover:bg-blue-700'
                            }`}
                          >
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      )
                    })
                  })()}
                </div>
              </div>

              {/* Fourth Column: Cimian Version Distribution (1/4 width) */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Cimian Versions
                </h3>
                <div className="h-40 overflow-y-auto space-y-2">
                  {(() => {
                    console.log('[CIMIAN WIDGET] Total devices:', devices?.length || 0)
                    
                    // Show loading state if no devices loaded yet
                    if (!devices || devices.length === 0) {
                      return (
                        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                          Loading...
                        </div>
                      )
                    }
                    
                    const cimianDevices = (devices || []).filter((d: any) => {
                      const hasCimian = d?.modules?.installs?.cimian?.version
                      if (hasCimian) {
                        console.log('[CIMIAN WIDGET] Found device with Cimian:', d.serialNumber, d.modules.installs.cimian.version)
                      }
                      return hasCimian
                    })
                    
                    console.log('[CIMIAN WIDGET] Devices with Cimian:', cimianDevices.length)
                    
                    if (cimianDevices.length === 0) {
                      return (
                        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                          No Cimian installations found
                        </div>
                      )
                    }
                    
                    const versionGroups = Object.entries(
                      cimianDevices.reduce((acc: Record<string, { count: number; devices: any[] }>, device: any) => {
                        const version = device.modules.installs.cimian.version || 'Unknown'
                        if (!acc[version]) {
                          acc[version] = { count: 0, devices: [] }
                        }
                        acc[version].count++
                        acc[version].devices.push(device)
                        return acc
                      }, {})
                    ).sort(([,a], [,b]) => b.count - a.count)
                    
                    console.log('[CIMIAN WIDGET] Version groups:', versionGroups.length, 'versions')
                    
                    return versionGroups.map(([version, data]) => {
                      const total = cimianDevices.length
                      const percentage = total > 0 ? Math.round((data.count / total) * 100) : 0
                      const isSelected = selectedCimianVersion === version
                      return (
                        <div key={version}>
                          <div className="flex items-center justify-between mb-1">
                            <button
                              onClick={() => {
                                if (isConfigReport) {
                                  setSelectedCimianVersion(isSelected ? '' : version)
                                } else {
                                  const deviceSerials = data.devices.map((d: any) => d.serialNumber)
                                  console.log('Generate report for Cimian version:', version, deviceSerials)
                                }
                              }}
                              className={`text-sm font-medium truncate transition-colors ${
                                isSelected 
                                  ? 'text-emerald-600 dark:text-emerald-400 font-bold' 
                                  : 'text-gray-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400'
                              }`}
                            >
                              {isSelected && '✓ '}{version}
                            </button>
                            <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                              {data.count} ({percentage}%)
                            </span>
                          </div>
                          <div
                            onClick={() => {
                              if (isConfigReport) {
                                setSelectedCimianVersion(isSelected ? '' : version)
                              } else {
                                const deviceSerials = data.devices.map((d: any) => d.serialNumber)
                                console.log('Generate report for Cimian version:', version, deviceSerials)
                              }
                            }}
                            className={`w-full rounded-full h-2 cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-emerald-300 dark:bg-emerald-800'
                                : 'bg-gray-200 dark:bg-gray-600 hover:bg-emerald-200 dark:hover:bg-emerald-700'
                            }`}
                          >
                            <div 
                              className="bg-emerald-600 h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      )
                    })
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* Search Input - Always visible when not loading */}
          {!filtersLoading && (
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="relative max-w-md">
                <input
                  type="text"
                  placeholder={filtersExpanded ? "Search filters..." : "Search installs, devices, versions..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 pl-10 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
                <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          )}

          {/* Status Overview Cards - Show only when report generated */}
          {installs.length > 0 && (
            <div className="px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              
              {/* Version Distribution Charts */}
              <div className="grid grid-cols-1 gap-6">
                
                {/* Install Items Version Distribution */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Install Item(s) Versions
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(
                      installs
                        .filter(install => install.source === 'cimian' || install.source === 'munki')
                        .reduce((acc: Record<string, { count: number; version: string }>, install) => {
                          const key = `${install.name} - ${install.version || 'Unknown'}`
                          if (!acc[key]) {
                            acc[key] = { count: 0, version: install.version || 'Unknown' }
                          }
                          acc[key].count++
                          return acc
                        }, {})
                    )
                    .sort(([keyA,a], [keyB,b]) => {
                      // Sort by version (latest first), then by count
                      const versionCompare = b.version.localeCompare(a.version, undefined, { numeric: true, sensitivity: 'base' })
                      return versionCompare !== 0 ? versionCompare : b.count - a.count
                    })
                    .slice(0, 10)
                    .map(([itemVersion, data]) => {
                      const percentage = Math.round((data.count / installs.filter(i => i.source === 'cimian' || i.source === 'munki').length) * 100)
                      const isSelected = searchQuery === itemVersion
                      return (
                        <div 
                          key={itemVersion} 
                          className={`flex items-center cursor-pointer p-2 rounded-lg transition-colors ${
                            isSelected 
                              ? 'bg-emerald-50 dark:bg-emerald-900/20 ring-1 ring-emerald-500' 
                              : 'hover:bg-gray-100 dark:hover:bg-gray-600'
                          }`}
                          onClick={() => setSearchQuery(isSelected ? '' : itemVersion)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-sm font-medium truncate ${
                                isSelected ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-900 dark:text-white'
                              }`}>
                                {itemVersion}
                              </span>
                              <span className={`text-sm ${
                                isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'
                              }`}>
                                {data.count} ({percentage}%)
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                              <div 
                                className="bg-emerald-600 h-2 rounded-full transition-all duration-300" 
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    {installs.filter(i => i.source === 'cimian' || i.source === 'munki').length === 0 && (
                      <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                        No install items found
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filter Clouds Section */}
          {!filtersLoading && filtersExpanded && (
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700">
              <div className="space-y-4">
                
                {/* Inventory Filter Sections - Top */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  
                  {/* Usage Filter */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Usage {selectedUsages.length > 0 && `(${selectedUsages.length} selected)`}
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {(filterOptions.usages || []).map(usage => (
                        <button
                          key={usage}
                          onClick={() => toggleUsage(usage)}
                          className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                            selectedUsages.includes(usage.toLowerCase())
                              ? 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-600'
                              : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-500'
                          }`}
                        >
                          {usage}
                        </button>
                      ))}
                      {(!filterOptions.usages || filterOptions.usages.length === 0) && (
                        <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                          No usage data available
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Catalog Filter */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Catalog {selectedCatalogs.length > 0 && `(${selectedCatalogs.length} selected)`}
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {(filterOptions.catalogs || []).map(catalog => (
                        <button
                          key={catalog}
                          onClick={() => toggleCatalog(catalog)}
                          className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                            selectedCatalogs.includes(catalog.toLowerCase())
                              ? 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-900 dark:text-teal-200 dark:border-teal-600'
                              : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-500'
                          }`}
                        >
                          {catalog}
                        </button>
                      ))}
                      {(!filterOptions.catalogs || filterOptions.catalogs.length === 0) && (
                        <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                          No catalog data available
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Fleet Filter */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Fleet {selectedFleets.length > 0 && `(${selectedFleets.length} selected)`}
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {(filterOptions.fleets || []).map(fleet => (
                        <button
                          key={fleet}
                          onClick={() => toggleFleet(fleet)}
                          className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                            selectedFleets.includes(fleet)
                              ? 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900 dark:text-orange-200 dark:border-orange-600'
                              : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-500'
                          }`}
                        >
                          {fleet}
                        </button>
                      ))}
                      {(!filterOptions.fleets || filterOptions.fleets.length === 0) && (
                        <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                          No fleet data available
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Platform Filter */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Platform {selectedPlatforms.length > 0 && `(${selectedPlatforms.length} selected)`}
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {(filterOptions.platforms || []).map(platform => (
                        <button
                          key={platform}
                          onClick={() => togglePlatform(platform)}
                          className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                            selectedPlatforms.includes(platform)
                              ? 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-600'
                              : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-500'
                          }`}
                        >
                          {platform}
                        </button>
                      ))}
                      {(!filterOptions.platforms || filterOptions.platforms.length === 0) && (
                        <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                          No platform data available
                        </span>
                      )}
                    </div>
                  </div>

                </div>

                {/* Room Filter Cloud - Full Width with Dynamic Height */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Room {selectedRooms.length > 0 && `(${selectedRooms.length} selected)`}
                    </h3>
                  </div>
                  <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-800">
                    <div className="flex flex-wrap gap-1">
                      {(filterOptions.rooms || [])
                        .filter(room => room.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map(room => (
                        <button
                          key={room}
                          onClick={() => toggleRoom(room)}
                          className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                            selectedRooms.includes(room)
                              ? 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-200 dark:border-green-600'
                              : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-500'
                          }`}
                        >
                          {room}
                        </button>
                      ))}
                      {(!filterOptions.rooms || filterOptions.rooms.length === 0) && (
                        <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                          No room data available
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Installs Filter Cloud - Dynamic Height showing ALL installs */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Installs {selectedInstalls.length > 0 && `(${selectedInstalls.length} selected)`}
                    </h3>
                  </div>
                  <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-800">
                    <div className="flex flex-wrap gap-1">
                      
                      {/* Managed Installs - Show ALL */}
                      {(filterOptions.managedInstalls || [])
                        .filter((name: string) => name.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((install: string) => (
                        <button
                          key={install}
                          onClick={() => toggleInstall(install)}
                          className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                            selectedInstalls.includes(install)
                              ? 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-200 dark:border-green-600'
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 dark:hover:bg-gray-700'
                          }`}
                        >
                          {install}
                        </button>
                      ))}
                      
                      {/* Other Installs - Show ALL */}
                      {(filterOptions.otherInstalls || [])
                        .filter((name: string) => name.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((install: string) => (
                        <button
                          key={install}
                          onClick={() => toggleInstall(install)}
                          className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                            selectedInstalls.includes(install)
                              ? 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-200 dark:border-green-600'
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 dark:hover:bg-gray-700'
                          }`}
                        >
                          {install}
                        </button>
                      ))}
                      
                      {((!filterOptions.managedInstalls || filterOptions.managedInstalls.length === 0) && (!filterOptions.otherInstalls || filterOptions.otherInstalls.length === 0)) && (
                        <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                          No installs data available
                        </span>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}



          {/* Report Generation Loading State */}
          {loading && (
            <div className="px-6 py-12 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="max-w-lg mx-auto">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="mb-6 relative">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
                  </div>
                  
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Generating Report
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 max-w-xs mx-auto">
                    {loadingMessage}
                  </p>
                  
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${reportProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-400 mt-3">
                    Processing data for {filterOptions.devicesWithData || 'all'} devices...
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {filtersLoading && (
            <div className="px-6 py-8">
              <div className="max-w-md mx-auto">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {loadingMessage || 'Loading managed installs data from all devices...'}
                  </p>
                  {loadingProgress.total > 0 && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {loadingProgress.total > 100 
                        ? `${loadingProgress.current} / ${loadingProgress.total}`
                        : `${loadingProgress.current} / ${loadingProgress.total}`
                      }
                    </p>
                  )}
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-emerald-600 h-3 rounded-full transition-all duration-300 ease-out"
                    style={{ 
                      width: loadingProgress.total > 0
                        ? `${(loadingProgress.current / loadingProgress.total) * 100}%`
                        : '0%'
                    }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                  {loadingProgress.total > 0 
                    ? (
                      <>
                        {Math.round((loadingProgress.current / loadingProgress.total) * 100)}% complete
                        {loadingMessage && <span className="text-emerald-600 dark:text-emerald-400 font-medium ml-2">• {loadingMessage}</span>}
                        {loadingProgress.total > 100 && <span className="ml-2">• {loadingProgress.total} devices</span>}
                      </>
                    )
                    : 'First load may take 60-90 seconds'
                  }
                </p>
              </div>
            </div>
          )}

          {/* Results Section - Regular Installs Table */}
          {installs.length > 0 && !isConfigReport && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Device</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Install</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Version</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Last Seen</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredInstalls.map((install) => (
                    <tr key={install.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <Link
                            href={`/device/${install.serialNumber}`}
                            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {install.deviceName}
                          </Link>
                          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                            <span>{install.serialNumber}</span>
                            {install.assetTag && (
                              <>
                                <span className="text-gray-300 dark:text-gray-600">•</span>
                                <span>{install.assetTag}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">{install.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">{install.version || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          install.status === 'installed' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : install.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {(install.status || 'Unknown').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">{formatRelativeTime(install.lastSeen)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Config Report Table */}
          {filteredConfigData.length > 0 && isConfigReport && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th 
                      onClick={() => handleSort('deviceName')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Device {sortColumn === 'deviceName' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      onClick={() => handleSort('configType')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      System {sortColumn === 'configType' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      onClick={() => handleSort('clientIdentifier')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Manifest {sortColumn === 'clientIdentifier' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      onClick={() => handleSort('softwareRepoUrl')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Repo {sortColumn === 'softwareRepoUrl' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      onClick={() => handleSort('version')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Version {sortColumn === 'version' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      onClick={() => handleSort('lastSessionStatus')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Last Session {sortColumn === 'lastSessionStatus' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      onClick={() => handleSort('totalPackagesManaged')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Managed Items {sortColumn === 'totalPackagesManaged' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredConfigData.map((device) => (
                    <tr key={device.deviceId} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <Link 
                            href={`/device/${device.serialNumber}`}
                            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {device.deviceName}
                          </Link>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{device.serialNumber}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          device.configType === 'Cimian'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        }`}>
                          {device.configType}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-white font-mono max-w-xs truncate" title={device.clientIdentifier}>
                          {device.clientIdentifier}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-white font-mono max-w-xs truncate" title={device.softwareRepoUrl}>
                          {device.softwareRepoUrl}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">{device.version}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          device.lastSessionStatus === 'success' || device.lastSessionStatus === 'complete'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : device.lastSessionStatus === 'partial_failure'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            : device.lastSessionStatus === 'running'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {device.lastSessionStatus.toUpperCase().replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{device.totalPackagesManaged}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Empty State - Only show when not loading and no installs */}
          {!filtersLoading && installs.length === 0 && configReportData.length === 0 && null}
        </div>
      </div>
    </div>
  )
}

export default function InstallsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading installs...</p>
        </div>
      </div>
    }>
      <InstallsPageContent />
    </Suspense>
  )
}
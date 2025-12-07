"use client"

import { useState, useEffect, Suspense, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { DevicePageNavigation } from '../../../src/components/navigation/DevicePageNavigation'
import { formatRelativeTime } from '../../../src/lib/time'
import { categorizeDevicesByInstallStatus } from '../../../src/hooks/useInstallsData'
import { calculateDeviceStatus } from '../../../src/lib/data-processing'

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
  
  // Sorting state for status tables (errors/warnings items)
  const [errorTableSort, setErrorTableSort] = useState<{ column: string; direction: 'asc' | 'desc' }>({ column: 'count', direction: 'desc' })
  const [warningTableSort, setWarningTableSort] = useState<{ column: string; direction: 'asc' | 'desc' }>({ column: 'count', direction: 'desc' })
  const [pendingTableSort, setPendingTableSort] = useState<{ column: string; direction: 'asc' | 'desc' }>({ column: 'count', direction: 'desc' })
  
  // Status filter state - items filter (errors, warnings from Items tables)
  const [itemsStatusFilter, setItemsStatusFilter] = useState<'all' | 'errors' | 'warnings' | 'pending'>('all')
  // Device status filter (active, stale, missing)
  const [deviceStatusFilter, setDeviceStatusFilter] = useState<'all' | 'active' | 'stale' | 'missing'>('all')
  const searchParams = useSearchParams()
  
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
      
      // Get estimated device count from dashboard cache or SWR cache
      let estimatedTotal = 0
      try {
        // Try dashboard SWR cache first (most accurate if user came from dashboard)
        const dashboardCache = sessionStorage.getItem('dashboard-data')
        if (dashboardCache) {
          const dashData = JSON.parse(dashboardCache)
          if (dashData.devices?.length) {
            estimatedTotal = dashData.devices.length
            console.log('[INSTALLS PAGE] Using device count from dashboard cache:', estimatedTotal)
          }
        }
        // Try previous installs cache if no dashboard data
        if (estimatedTotal === 0) {
          const prevInstallsCache = sessionStorage.getItem('installs-filter-options')
          if (prevInstallsCache) {
            const prevData = JSON.parse(prevInstallsCache)
            if (prevData.devicesWithData) {
              estimatedTotal = prevData.devicesWithData
              console.log('[INSTALLS PAGE] Using device count from previous installs cache:', estimatedTotal)
            }
          }
        }
      } catch (e) {
        console.log('[INSTALLS PAGE] Could not read cached device count')
      }
      
      // If we still don't have a count, fetch it quickly from devices API
      if (estimatedTotal === 0) {
        try {
          const countResponse = await fetch('/api/devices', { 
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' }
          })
          if (countResponse.ok) {
            const countData = await countResponse.json()
            if (countData.devices?.length) {
              estimatedTotal = countData.devices.length
              console.log('[INSTALLS PAGE] Got device count from API:', estimatedTotal)
            }
          }
        } catch (e) {
          console.log('[INSTALLS PAGE] Could not fetch device count, using fallback')
        }
      }
      
      // Fallback if all else fails
      if (estimatedTotal === 0) {
        estimatedTotal = 100 // Conservative fallback
      }
      
      // Start fetching - we'll simulate progress with the actual device count
      let progress = 0
      let slowdownPhase = 0 // Track how long we've been in the slowdown phase
      
      progressInterval = setInterval(() => {
        // Progress quickly to 85%, then slow down dramatically, but keep moving
        if (progress < Math.floor(estimatedTotal * 0.85)) {
          progress += Math.ceil(estimatedTotal / 40) // Scale progress speed with device count
          setLoadingMessage('Fetching device data...')
        } else if (progress < Math.floor(estimatedTotal * 0.95)) {
          progress += Math.ceil(estimatedTotal / 200) // Medium slow progress from 85% to 95%
          setLoadingMessage('Processing devices...')
        } else {
          // Very slow progress from 95%+, but never stop completely
          slowdownPhase++
          // Asymptotic approach - gets slower and slower but always moves
          const increment = Math.max(0.1, (estimatedTotal * 0.05) / (slowdownPhase + 10))
          progress += increment
          setLoadingMessage('Caching device data...')
        }
        // Cap at 99.9% - the final jump to 100% happens when data actually arrives
        progress = Math.min(progress, estimatedTotal * 0.999)
        setLoadingProgress({ current: Math.floor(progress), total: estimatedTotal })
      }, 200)
      
      // Add timeout to prevent infinite waiting (2 minutes max)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 120000)
      
      const response = await fetch('/api/devices/installs/filters', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        },
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      // Clear the progress interval immediately after response arrives
      // (before JSON parsing which can be slow for large payloads)
      if (progressInterval) {
        clearInterval(progressInterval)
        progressInterval = null
      }
      
      if (!response.ok) {
        console.error('[INSTALLS PAGE] Filters API failed:', response.status, response.statusText)
        throw new Error(`API returned ${response.status}: ${response.statusText}`)
      }

      setLoadingMessage('Parsing response...')
      const data = await response.json()
      
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format from filters API')
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
      
      // Set filtersLoading to false immediately after successful processing
      // This ensures the UI updates even if sessionStorage caching fails
      setFiltersLoading(false)
      
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
  
  // Reset report handler - clears report data but keeps filter selections
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
    setItemsStatusFilter('all')
    setDeviceStatusFilter('all')
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

  // Handle URL filter parameter (from dashboard click-through)
  useEffect(() => {
    const filterParam = searchParams.get('filter')
    if (filterParam === 'errors' || filterParam === 'warnings' || filterParam === 'pending') {
      setItemsStatusFilter(filterParam as 'errors' | 'warnings' | 'pending')
      // Collapse regular filters when viewing status-filtered view
      setFiltersExpanded(false)
    } else {
      setItemsStatusFilter('all')
    }
  }, [searchParams])

  // Categorize devices by install status (for filtered views)
  const { devicesWithErrors, devicesWithWarnings, devicesWithPending } = useMemo(() => {
    return categorizeDevicesByInstallStatus(devices)
  }, [devices])

  // Calculate device status counts (Active/Stale/Missing)
  // When items filter is active with a search query, show counts for devices with that specific item
  const deviceStatusCounts = useMemo(() => {
    const counts = { active: 0, stale: 0, missing: 0 }
    
    // If we have a specific item selected (searchQuery + itemsStatusFilter), count only those devices
    if (searchQuery && itemsStatusFilter !== 'all') {
      // Get devices that have this item with the matching status
      let relevantDevices: any[] = []
      if (itemsStatusFilter === 'errors') {
        relevantDevices = devicesWithErrors.filter((device: any) => {
          const cimianItems = device?.modules?.installs?.cimian?.items || []
          return cimianItems.some((item: any) => {
            const itemName = (item.itemName || item.name || '').toLowerCase()
            const status = item.currentStatus?.toLowerCase() || ''
            return itemName === searchQuery.toLowerCase() && 
                   (status.includes('error') || status.includes('failed') || status.includes('problem') || status === 'install-error')
          })
        })
      } else if (itemsStatusFilter === 'warnings') {
        relevantDevices = devicesWithWarnings.filter((device: any) => {
          const cimianItems = device?.modules?.installs?.cimian?.items || []
          return cimianItems.some((item: any) => {
            const itemName = (item.itemName || item.name || '').toLowerCase()
            const status = item.currentStatus?.toLowerCase() || ''
            return itemName === searchQuery.toLowerCase() && 
                   (status.includes('warning') || status === 'needs-attention' || status === 'managed-update-available')
          })
        })
      } else if (itemsStatusFilter === 'pending') {
        relevantDevices = devicesWithPending.filter((device: any) => {
          const cimianItems = device?.modules?.installs?.cimian?.items || []
          return cimianItems.some((item: any) => {
            const itemName = (item.itemName || item.name || '').toLowerCase()
            const status = item.currentStatus?.toLowerCase() || ''
            return itemName === searchQuery.toLowerCase() && 
                   (status.includes('will-be-installed') || status.includes('update-available') || 
                    status.includes('update_available') || status.includes('will-be-removed') || 
                    status.includes('pending') || status.includes('scheduled'))
          })
        })
      }
      
      relevantDevices.forEach((device: any) => {
        const status = calculateDeviceStatus(device.lastSeen)
        if (status === 'active') counts.active++
        else if (status === 'stale') counts.stale++
        else counts.missing++
      })
    } else {
      // Default: count all devices
      devices.forEach((device: any) => {
        const status = calculateDeviceStatus(device.lastSeen)
        if (status === 'active') counts.active++
        else if (status === 'stale') counts.stale++
        else counts.missing++
      })
    }
    return counts
  }, [devices, devicesWithErrors, devicesWithWarnings, devicesWithPending, searchQuery, itemsStatusFilter])

  // Check if we have any Munki or Cimian installations
  const hasMunkiInstalls = useMemo(() => {
    return devices.some((d: any) => d?.modules?.installs?.munki?.version)
  }, [devices])

  const hasCimianInstalls = useMemo(() => {
    return devices.some((d: any) => d?.modules?.installs?.cimian?.version)
  }, [devices])

  // Get filtered devices based on all filters (items status, device status, inventory, and search)
  const statusFilteredDevices = useMemo(() => {
    let filtered = devices
    
    // Filter by items status (errors/warnings/pending from install items)
    if (itemsStatusFilter === 'errors') filtered = devicesWithErrors
    else if (itemsStatusFilter === 'warnings') filtered = devicesWithWarnings
    else if (itemsStatusFilter === 'pending') filtered = devicesWithPending
    
    // Filter by device status (active/stale/missing)
    if (deviceStatusFilter !== 'all') {
      filtered = filtered.filter((device: any) => {
        const status = calculateDeviceStatus(device.lastSeen)
        return status === deviceStatusFilter
      })
    }
    
    // Filter by inventory filters (usage, catalog, fleet, platform, room)
    if (selectedUsages.length > 0) {
      filtered = filtered.filter((device: any) => {
        const usage = device.modules?.inventory?.usage?.toLowerCase() || ''
        return selectedUsages.some(u => usage.includes(u.toLowerCase()))
      })
    }
    if (selectedCatalogs.length > 0) {
      filtered = filtered.filter((device: any) => {
        const catalog = device.modules?.inventory?.catalog?.toLowerCase() || ''
        return selectedCatalogs.some(c => catalog.includes(c.toLowerCase()))
      })
    }
    if (selectedFleets.length > 0) {
      filtered = filtered.filter((device: any) => {
        const fleet = device.modules?.inventory?.fleet?.toLowerCase() || ''
        return selectedFleets.some(f => fleet.toLowerCase().includes(f.toLowerCase()))
      })
    }
    if (selectedPlatforms.length > 0) {
      filtered = filtered.filter((device: any) => {
        const platform = device.modules?.inventory?.platform?.toLowerCase() || device.platform?.toLowerCase() || ''
        return selectedPlatforms.some(p => platform.includes(p.toLowerCase()))
      })
    }
    if (selectedRooms.length > 0) {
      filtered = filtered.filter((device: any) => {
        const room = device.modules?.inventory?.location?.toLowerCase() || ''
        return selectedRooms.some(r => room.includes(r.toLowerCase()))
      })
    }
    
    // Filter by selected installs (pills) if present
    if (selectedInstalls.length > 0) {
      filtered = filtered.filter((device: any) => {
        const cimianItems = device.modules?.installs?.cimian?.items || []
        return cimianItems.some((item: any) => {
          const itemName = item.itemName || item.name || ''
          if (!selectedInstalls.includes(itemName)) return false
          
          // If we have an items status filter, the selected item must have that status
          if (itemsStatusFilter !== 'all') {
            const status = item.currentStatus?.toLowerCase() || ''
            if (itemsStatusFilter === 'errors') {
              return status.includes('error') || status.includes('failed') || status === 'needs_reinstall'
            } else if (itemsStatusFilter === 'warnings') {
              return status.includes('warning') || status === 'needs-attention' || status === 'managed-update-available'
            } else if (itemsStatusFilter === 'pending') {
              return status.includes('will-be-installed') || status.includes('update-available') || 
                     status.includes('update_available') || status.includes('will-be-removed') || 
                     status.includes('pending') || status.includes('scheduled')
            }
          }
          return true
        })
      })
    }
    
    // Filter by search query if present
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase()
      filtered = filtered.filter((device: any) => {
        // Check if device name or serial matches
        const deviceName = device.modules?.inventory?.deviceName?.toLowerCase() || ''
        const serial = device.serialNumber?.toLowerCase() || ''
        if (deviceName.includes(lowerQuery) || serial.includes(lowerQuery)) return true
        
        // Check if any affected packages match the search AND have the filtered status
        const cimianItems = device.modules?.installs?.cimian?.items || []
        return cimianItems.some((item: any) => {
          const itemName = (item.itemName || item.name || '').toLowerCase()
          if (!itemName.includes(lowerQuery)) return false
          
          // If we have an items status filter, the searched item must have that status
          if (itemsStatusFilter !== 'all') {
            const status = item.currentStatus?.toLowerCase() || ''
            if (itemsStatusFilter === 'errors') {
              return status.includes('error') || status.includes('failed') || status === 'needs_reinstall'
            } else if (itemsStatusFilter === 'warnings') {
              return status.includes('warning') || status === 'needs-attention' || status === 'managed-update-available'
            } else if (itemsStatusFilter === 'pending') {
              return status.includes('will-be-installed') || status.includes('update-available') || 
                     status.includes('update_available') || status.includes('will-be-removed') || 
                     status.includes('pending') || status.includes('scheduled')
            }
          }
          return true
        })
      })
    }
    
    return filtered
  }, [itemsStatusFilter, deviceStatusFilter, devices, devicesWithErrors, devicesWithWarnings, devicesWithPending, searchQuery, selectedInstalls, selectedUsages, selectedCatalogs, selectedFleets, selectedPlatforms, selectedRooms])

  // Aggregate items with errors across all devices
  const itemsWithErrors = useMemo(() => {
    const errorItems: Record<string, { name: string; count: number; devices: string[] }> = {}
    
    // Exclude archived devices from counts
    devices.forEach((device: any) => {
      if (device.archived === true) return // Skip archived devices
      
      const cimianItems = device?.modules?.installs?.cimian?.items || []
      cimianItems.forEach((item: any) => {
        // Check for error statuses
        const status = item.currentStatus?.toLowerCase() || ''
        if (status.includes('error') || status.includes('failed') || status.includes('problem') || status === 'install-error') {
          const itemName = item.itemName || item.name || 'Unknown'
          if (!errorItems[itemName]) {
            errorItems[itemName] = { name: itemName, count: 0, devices: [] }
          }
          errorItems[itemName].count++
          errorItems[itemName].devices.push(device.serialNumber || device.deviceId)
        }
      })
    })
    
    const items = Object.values(errorItems)
    
    // Sort based on current sort settings
    return items.sort((a, b) => {
      if (errorTableSort.column === 'name') {
        return errorTableSort.direction === 'asc' 
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name)
      }
      // Default to count
      return errorTableSort.direction === 'asc' 
        ? a.count - b.count 
        : b.count - a.count
    })
  }, [devices, errorTableSort])

  // Aggregate items with warnings across all devices
  // Note: Warnings are DIFFERENT from Pending - warnings indicate issues, pending indicates scheduled changes
  const itemsWithWarnings = useMemo(() => {
    const warningItems: Record<string, { name: string; count: number; devices: string[] }> = {}
    
    // Exclude archived devices from counts
    devices.forEach((device: any) => {
      if (device.archived === true) return // Skip archived devices
      
      const cimianItems = device?.modules?.installs?.cimian?.items || []
      cimianItems.forEach((item: any) => {
        // Check for warning statuses ONLY (not pending statuses)
        const status = item.currentStatus?.toLowerCase() || ''
        if (status.includes('warning') || status === 'needs-attention' || status === 'managed-update-available') {
          const itemName = item.itemName || item.name || 'Unknown'
          if (!warningItems[itemName]) {
            warningItems[itemName] = { name: itemName, count: 0, devices: [] }
          }
          warningItems[itemName].count++
          warningItems[itemName].devices.push(device.serialNumber || device.deviceId)
        }
      })
    })
    
    const items = Object.values(warningItems)
    
    // Sort based on current sort settings
    return items.sort((a, b) => {
      if (warningTableSort.column === 'name') {
        return warningTableSort.direction === 'asc' 
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name)
      }
      // Default to count
      return warningTableSort.direction === 'asc' 
        ? a.count - b.count 
        : b.count - a.count
    })
  }, [devices, warningTableSort])

  // Aggregate items with pending status across all devices
  const itemsWithPending = useMemo(() => {
    const pendingItems: Record<string, { name: string; count: number; devices: string[] }> = {}
    
    // Exclude archived devices from counts
    devices.forEach((device: any) => {
      if (device.archived === true) return // Skip archived devices
      
      const cimianItems = device?.modules?.installs?.cimian?.items || []
      cimianItems.forEach((item: any) => {
        // Check for pending statuses - scheduled installations, updates, removals
        const status = item.currentStatus?.toLowerCase() || ''
        // Include: will-be-installed, update-available, will-be-removed, pending-*, *-pending, update_available
        if (status.includes('will-be-installed') || 
            status.includes('update-available') || status.includes('update_available') ||
            status.includes('will-be-removed') || 
            status.includes('pending') ||
            status.includes('scheduled')) {
          const itemName = item.itemName || item.name || 'Unknown'
          if (!pendingItems[itemName]) {
            pendingItems[itemName] = { name: itemName, count: 0, devices: [] }
          }
          pendingItems[itemName].count++
          pendingItems[itemName].devices.push(device.serialNumber || device.deviceId)
        }
      })
    })
    
    const items = Object.values(pendingItems)
    
    // Sort based on current sort settings
    return items.sort((a, b) => {
      if (pendingTableSort.column === 'name') {
        return pendingTableSort.direction === 'asc' 
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name)
      }
      // Default to count
      return pendingTableSort.direction === 'asc' 
        ? a.count - b.count 
        : b.count - a.count
    })
  }, [devices, pendingTableSort])

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
                {isConfigReport ? 'Device Configuration Report' : 'Managed Software Update Report'} {(isConfigReport ? configReportData.length : filteredInstalls.length) > 0 && `(${isConfigReport ? configReportData.length : filteredInstalls.length})`}
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
                      : 'Select packages from filters below to generate an items report, or click "Config Report" to view device configurations'
                    : `Showing ${filteredInstalls.length} of ${installs.length} install records across devices`
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
            
            {/* Loading Progress Bar - Always at top */}
            {filtersLoading && (
              <div className="mb-6">
                <div className="max-w-2xl mx-auto">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {loadingMessage || 'Loading managed installs data from all devices...'}
                    </p>
                    {loadingProgress.total > 0 && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {loadingProgress.current} / {loadingProgress.total}
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
                      ? `${Math.round((loadingProgress.current / loadingProgress.total) * 100)}% complete`
                      : 'First load may take 60-90 seconds'
                    }
                  </p>
                </div>
              </div>
            )}

            {/* Items Tables - Errors, Warnings, Pending (Above config widgets) - Only show tables with data and NOT in config report mode */}
            {!isConfigReport && (itemsWithErrors.length > 0 || itemsWithWarnings.length > 0 || itemsWithPending.length > 0) && (
              <div className={`grid grid-cols-1 gap-6 mb-6 ${
                [itemsWithErrors.length > 0, itemsWithWarnings.length > 0, itemsWithPending.length > 0].filter(Boolean).length === 3
                  ? 'lg:grid-cols-3'
                  : [itemsWithErrors.length > 0, itemsWithWarnings.length > 0, itemsWithPending.length > 0].filter(Boolean).length === 2
                    ? 'lg:grid-cols-2'
                    : 'lg:grid-cols-1'
              }`}>
                
                {/* Items with Errors Table - Only show if has errors */}
                {itemsWithErrors.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                  <div 
                    className="flex items-center justify-between mb-4 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => {
                      if (itemsStatusFilter === 'errors' && !searchQuery) {
                        setItemsStatusFilter('all')
                      } else {
                        setSearchQuery('')
                        setItemsStatusFilter('errors')
                      }
                    }}
                    title="Click to show all devices with errors"
                  >
                    <h3 className={`text-lg font-medium flex items-center gap-2 ${itemsStatusFilter === 'errors' && !searchQuery ? 'text-red-700 dark:text-red-300' : 'text-gray-900 dark:text-white'}`}>
                      <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Items with Errors
                    </h3>
                    <span className="text-sm font-semibold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full">
                      {itemsWithErrors.reduce((sum, item) => sum + item.count, 0)} total
                    </span>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {filtersLoading ? (
                      <div className="space-y-2 animate-pulse">
                        <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded"></div>
                        <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded w-3/4"></div>
                        <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded w-5/6"></div>
                      </div>
                    ) : (
                      <table className="w-full">
                        <thead className="sticky top-0 bg-gray-100 dark:bg-gray-600 z-10">
                          <tr>
                            <th 
                              className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
                              onClick={() => setErrorTableSort(prev => ({
                                column: 'name',
                                direction: prev.column === 'name' && prev.direction === 'asc' ? 'desc' : 'asc'
                              }))}
                            >
                              <div className="flex items-center gap-1">
                                Item Name
                                {errorTableSort.column === 'name' && (
                                  <svg className={`w-3 h-3 transition-transform ${errorTableSort.direction === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                  </svg>
                                )}
                              </div>
                            </th>
                            <th 
                              className="px-4 py-2 text-right text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
                              onClick={() => setErrorTableSort(prev => ({
                                column: 'count',
                                direction: prev.column === 'count' && prev.direction === 'desc' ? 'asc' : 'desc'
                              }))}
                            >
                              <div className="flex items-center justify-end gap-1">
                                Count
                                {errorTableSort.column === 'count' && (
                                  <svg className={`w-3 h-3 transition-transform ${errorTableSort.direction === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                  </svg>
                                )}
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                          {itemsWithErrors.map((item, idx) => {
                              const isSelected = searchQuery === item.name && itemsStatusFilter === 'errors'
                              return (
                              <tr 
                                key={item.name} 
                                className={`cursor-pointer transition-colors ${
                                  isSelected 
                                    ? 'bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60' 
                                    : 'hover:bg-gray-100 dark:hover:bg-gray-600'
                                }`}
                                onClick={() => {
                                  if (isSelected) {
                                    setSearchQuery('')
                                    setItemsStatusFilter('all')
                                  } else {
                                    setSearchQuery(item.name)
                                    setItemsStatusFilter('errors')
                                  }
                                }}
                              >
                                <td className={`px-4 py-2 text-sm truncate max-w-[200px] ${isSelected ? 'text-red-700 dark:text-red-300 font-semibold' : 'text-gray-900 dark:text-white'}`} title={item.name}>
                                  {item.name}
                                </td>
                                <td className="px-4 py-2 text-sm text-right font-semibold text-red-600 dark:text-red-400">
                                  {item.count}
                                </td>
                              </tr>
                            )})
                          }
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
                )}

                {/* Items with Warnings Table - Only show if has warnings */}
                {itemsWithWarnings.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                  <div 
                    className="flex items-center justify-between mb-4 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => {
                      if (itemsStatusFilter === 'warnings' && !searchQuery) {
                        setItemsStatusFilter('all')
                      } else {
                        setSearchQuery('')
                        setItemsStatusFilter('warnings')
                      }
                    }}
                    title="Click to show all devices with warnings"
                  >
                    <h3 className={`text-lg font-medium flex items-center gap-2 ${itemsStatusFilter === 'warnings' && !searchQuery ? 'text-amber-700 dark:text-amber-300' : 'text-gray-900 dark:text-white'}`}>
                      <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Items with Warnings
                    </h3>
                    <span className="text-sm font-semibold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                      {itemsWithWarnings.reduce((sum, item) => sum + item.count, 0)} total
                    </span>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {filtersLoading ? (
                      <div className="space-y-2 animate-pulse">
                        <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded"></div>
                        <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded w-3/4"></div>
                        <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded w-5/6"></div>
                      </div>
                    ) : (
                      <table className="w-full">
                        <thead className="sticky top-0 bg-gray-100 dark:bg-gray-600 z-10">
                          <tr>
                            <th 
                              className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
                              onClick={() => setWarningTableSort(prev => ({
                                column: 'name',
                                direction: prev.column === 'name' && prev.direction === 'asc' ? 'desc' : 'asc'
                              }))}
                            >
                              <div className="flex items-center gap-1">
                                Item Name
                                {warningTableSort.column === 'name' && (
                                  <svg className={`w-3 h-3 transition-transform ${warningTableSort.direction === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                  </svg>
                                )}
                              </div>
                            </th>
                            <th 
                              className="px-4 py-2 text-right text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
                              onClick={() => setWarningTableSort(prev => ({
                                column: 'count',
                                direction: prev.column === 'count' && prev.direction === 'desc' ? 'asc' : 'desc'
                              }))}
                            >
                              <div className="flex items-center justify-end gap-1">
                                Count
                                {warningTableSort.column === 'count' && (
                                  <svg className={`w-3 h-3 transition-transform ${warningTableSort.direction === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                  </svg>
                                )}
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                          {itemsWithWarnings.map((item, idx) => {
                              const isSelected = searchQuery === item.name && itemsStatusFilter === 'warnings'
                              return (
                              <tr 
                                key={item.name} 
                                className={`cursor-pointer transition-colors ${
                                  isSelected 
                                    ? 'bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-900/60' 
                                    : 'hover:bg-gray-100 dark:hover:bg-gray-600'
                                }`}
                                onClick={() => {
                                  if (isSelected) {
                                    setSearchQuery('')
                                    setItemsStatusFilter('all')
                                  } else {
                                    setSearchQuery(item.name)
                                    setItemsStatusFilter('warnings')
                                  }
                                }}
                              >
                                <td className={`px-4 py-2 text-sm truncate max-w-[200px] ${isSelected ? 'text-amber-700 dark:text-amber-300 font-semibold' : 'text-gray-900 dark:text-white'}`} title={item.name}>
                                  {item.name}
                                </td>
                                <td className="px-4 py-2 text-sm text-right font-semibold text-amber-600 dark:text-amber-400">
                                  {item.count}
                                </td>
                              </tr>
                            )})
                          }
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
                )}

                {/* Items with Pending Table - Only show if has pending */}
                {itemsWithPending.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                  <div 
                    className="flex items-center justify-between mb-4 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => {
                      if (itemsStatusFilter === 'pending' && !searchQuery) {
                        setItemsStatusFilter('all')
                      } else {
                        setSearchQuery('')
                        setItemsStatusFilter('pending')
                      }
                    }}
                    title="Click to show all devices with pending updates"
                  >
                    <h3 className={`text-lg font-medium flex items-center gap-2 ${itemsStatusFilter === 'pending' && !searchQuery ? 'text-cyan-700 dark:text-cyan-300' : 'text-gray-900 dark:text-white'}`}>
                      <svg className="w-5 h-5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Items with Pending
                    </h3>
                    <span className="text-sm font-semibold text-cyan-600 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-900/30 px-2 py-0.5 rounded-full">
                      {itemsWithPending.reduce((sum, item) => sum + item.count, 0)} total
                    </span>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {filtersLoading ? (
                      <div className="space-y-2 animate-pulse">
                        <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded"></div>
                        <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded w-3/4"></div>
                        <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded w-5/6"></div>
                      </div>
                    ) : (
                      <table className="w-full">
                        <thead className="sticky top-0 bg-gray-100 dark:bg-gray-600 z-10">
                          <tr>
                            <th 
                              className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
                              onClick={() => setPendingTableSort(prev => ({
                                column: 'name',
                                direction: prev.column === 'name' && prev.direction === 'asc' ? 'desc' : 'asc'
                              }))}
                            >
                              <div className="flex items-center gap-1">
                                Item Name
                                {pendingTableSort.column === 'name' && (
                                  <svg className={`w-3 h-3 transition-transform ${pendingTableSort.direction === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                  </svg>
                                )}
                              </div>
                            </th>
                            <th 
                              className="px-4 py-2 text-right text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
                              onClick={() => setPendingTableSort(prev => ({
                                column: 'count',
                                direction: prev.column === 'count' && prev.direction === 'desc' ? 'asc' : 'desc'
                              }))}
                            >
                              <div className="flex items-center justify-end gap-1">
                                Count
                                {pendingTableSort.column === 'count' && (
                                  <svg className={`w-3 h-3 transition-transform ${pendingTableSort.direction === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                  </svg>
                                )}
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                          {itemsWithPending.map((item, idx) => {
                              const isSelected = searchQuery === item.name && itemsStatusFilter === 'pending'
                              return (
                              <tr 
                                key={item.name} 
                                className={`cursor-pointer transition-colors ${
                                  isSelected 
                                    ? 'bg-cyan-100 dark:bg-cyan-900/40 hover:bg-cyan-200 dark:hover:bg-cyan-900/60' 
                                    : 'hover:bg-gray-100 dark:hover:bg-gray-600'
                                }`}
                                onClick={() => {
                                  if (isSelected) {
                                    setSearchQuery('')
                                    setItemsStatusFilter('all')
                                  } else {
                                    setSearchQuery(item.name)
                                    setItemsStatusFilter('pending')
                                  }
                                }}
                              >
                                <td className={`px-4 py-2 text-sm truncate max-w-[200px] ${isSelected ? 'text-cyan-700 dark:text-cyan-300 font-semibold' : 'text-gray-900 dark:text-white'}`} title={item.name}>
                                  {item.name}
                                </td>
                                <td className="px-4 py-2 text-sm text-right font-semibold text-cyan-600 dark:text-cyan-400">
                                  {item.count}
                                </td>
                              </tr>
                            )})
                          }
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
                )}
              </div>
            )}
            
            {/* Config Widgets Row: Software Repos + Munki (conditional) + Cimian (conditional) + Manifests */}
            {/* Hide when items status filter is active (errors/warnings/pending from items tables) */}
            {itemsStatusFilter === 'all' && (
            <div className={`grid grid-cols-1 gap-6 ${
              hasMunkiInstalls && hasCimianInstalls 
                ? 'lg:grid-cols-4' 
                : hasMunkiInstalls || hasCimianInstalls 
                  ? 'lg:grid-cols-3' 
                  : 'lg:grid-cols-2'
            }`}>
              
              {/* First Column: Software Repo Widget */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Software Repos
                </h3>
                <div className="h-40 overflow-y-auto space-y-3">
                  {(() => {
                    if (filtersLoading || !devices || devices.length === 0) {
                      return (
                        <div className="space-y-3 animate-pulse">
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-2/3"></div>
                              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-8"></div>
                            </div>
                            <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded w-full"></div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
                              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-8"></div>
                            </div>
                            <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded w-3/4"></div>
                          </div>
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
                                // Auto-activate Config Report if not already in it
                                if (!isConfigReport) {
                                  handleConfigReport()
                                }
                                setSelectedSoftwareRepo(isSelected ? '' : repo)
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
                              // Auto-activate Config Report if not already in it
                              if (!isConfigReport) {
                                handleConfigReport()
                              }
                              setSelectedSoftwareRepo(isSelected ? '' : repo)
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

              {/* Second Column: Munki Version Distribution - Only show if there are Munki installations */}
              {hasMunkiInstalls && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Munki Versions
                </h3>
                <div className="h-40 overflow-y-auto space-y-2">
                  {(() => {
                    console.log('[MUNKI WIDGET] Total devices:', devices?.length || 0)
                    
                    if (filtersLoading || !devices || devices.length === 0) {
                      return (
                        <div className="space-y-3 animate-pulse">
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/3"></div>
                              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-16"></div>
                            </div>
                            <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded w-full"></div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/4"></div>
                              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-12"></div>
                            </div>
                            <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded w-2/3"></div>
                          </div>
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
                    ).sort(([versionA], [versionB]) => {
                      if (versionA === 'Unknown') return 1
                      if (versionB === 'Unknown') return -1
                      return versionB.localeCompare(versionA, undefined, { numeric: true, sensitivity: 'base' })
                    })
                    
                    return versionGroups.map(([version, data]) => {
                      const total = munkiDevices.length
                      const percentage = total > 0 ? Math.round((data.count / total) * 100) : 0
                      const isSelected = selectedMunkiVersion === version
                      return (
                        <div key={version}>
                          <div className="flex items-center justify-between mb-1">
                            <button
                              onClick={() => {
                                // Auto-activate Config Report if not already in it
                                if (!isConfigReport) {
                                  handleConfigReport()
                                }
                                setSelectedMunkiVersion(isSelected ? '' : version)
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
                              // Auto-activate Config Report if not already in it
                              if (!isConfigReport) {
                                handleConfigReport()
                              }
                              setSelectedMunkiVersion(isSelected ? '' : version)
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
              )}

              {/* Third Column: Cimian Version Distribution - Only show if there are Cimian installations */}
              {hasCimianInstalls && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Cimian Versions
                </h3>
                <div className="h-40 overflow-y-auto space-y-2">
                  {(() => {
                    console.log('[CIMIAN WIDGET] Total devices:', devices?.length || 0)
                    
                    if (filtersLoading || !devices || devices.length === 0) {
                      return (
                        <div className="space-y-3 animate-pulse">
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/3"></div>
                              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-16"></div>
                            </div>
                            <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded w-full"></div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/4"></div>
                              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-12"></div>
                            </div>
                            <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded w-2/3"></div>
                          </div>
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
                    ).sort(([versionA], [versionB]) => {
                      if (versionA === 'Unknown') return 1
                      if (versionB === 'Unknown') return -1
                      return versionB.localeCompare(versionA, undefined, { numeric: true, sensitivity: 'base' })
                    })
                    
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
                                // Auto-activate Config Report if not already in it
                                if (!isConfigReport) {
                                  handleConfigReport()
                                }
                                setSelectedCimianVersion(isSelected ? '' : version)
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
                              // Auto-activate Config Report if not already in it
                              if (!isConfigReport) {
                                handleConfigReport()
                              }
                              setSelectedCimianVersion(isSelected ? '' : version)
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
              )}

              {/* Fourth Column: Manifest Distribution */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Manifests
                </h3>
                <div className="h-40 overflow-y-auto space-y-3">
                  {(() => {
                    console.log('[MANIFEST WIDGET] Total devices:', devices?.length || 0)
                    
                    if (filtersLoading || !devices || devices.length === 0) {
                      return (
                        <div className="space-y-3 animate-pulse">
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-2/3"></div>
                              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-8"></div>
                            </div>
                            <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded w-full"></div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
                              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-8"></div>
                            </div>
                            <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded w-3/4"></div>
                          </div>
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
                                // Auto-activate Config Report if not already in it
                                if (!isConfigReport) {
                                  handleConfigReport()
                                }
                                setSelectedManifest(isSelected ? '' : manifest)
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
                              // Auto-activate Config Report if not already in it
                              if (!isConfigReport) {
                                handleConfigReport()
                              }
                              setSelectedManifest(isSelected ? '' : manifest)
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
            </div>
            )}

          </div>

          {/* Search Input - Always visible when not loading */}
          {!filtersLoading && (
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-md">
                  <input
                    type="text"
                    placeholder={filtersExpanded ? "Search filters..." : "Search installs, devices, versions..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 pl-10 pr-10 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                  <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      title="Clear search"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                {/* Clear Filter(s) Button - Show when items status filter or device status filter is active */}
                {(itemsStatusFilter !== 'all' || deviceStatusFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setItemsStatusFilter('all')
                      setDeviceStatusFilter('all')
                      setSearchQuery('')
                    }}
                    className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Clear Filter(s)
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Device Status Filter Tabs - Active/Stale/Missing - Show when report is generated OR when items status filter is active */}
          {!filtersLoading && (installs.length > 0 || itemsStatusFilter !== 'all') && (
            <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-gray-600 dark:text-gray-400 mr-2">Device Status:</span>
                <button
                  onClick={() => setDeviceStatusFilter(deviceStatusFilter === 'active' ? 'all' : 'active')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors flex items-center gap-1.5 ${
                    deviceStatusFilter === 'active'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-600 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-green-900/50 dark:hover:text-green-400'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  Active ({deviceStatusCounts.active})
                </button>
                <button
                  onClick={() => setDeviceStatusFilter(deviceStatusFilter === 'stale' ? 'all' : 'stale')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors flex items-center gap-1.5 ${
                    deviceStatusFilter === 'stale'
                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-yellow-50 hover:text-yellow-600 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-yellow-900/50 dark:hover:text-yellow-400'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                  Stale ({deviceStatusCounts.stale})
                </button>
                <button
                  onClick={() => setDeviceStatusFilter(deviceStatusFilter === 'missing' ? 'all' : 'missing')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors flex items-center gap-1.5 ${
                    deviceStatusFilter === 'missing'
                      ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-red-900/50 dark:hover:text-red-400'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  Missing ({deviceStatusCounts.missing})
                </button>
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
                
                {/* Inventory Filter Sections - Top - Only show filters that have data */}
                {((filterOptions.usages && filterOptions.usages.length > 0) ||
                  (filterOptions.catalogs && filterOptions.catalogs.length > 0) ||
                  (filterOptions.fleets && filterOptions.fleets.length > 0) ||
                  (filterOptions.platforms && filterOptions.platforms.length > 0)) && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  
                  {/* Usage Filter - Only show if data exists */}
                  {filterOptions.usages && filterOptions.usages.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Usage {selectedUsages.length > 0 && `(${selectedUsages.length} selected)`}
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {filterOptions.usages.map(usage => (
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
                    </div>
                  </div>
                  )}

                  {/* Catalog Filter - Only show if data exists */}
                  {filterOptions.catalogs && filterOptions.catalogs.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Catalog {selectedCatalogs.length > 0 && `(${selectedCatalogs.length} selected)`}
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {filterOptions.catalogs.map(catalog => (
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
                    </div>
                  </div>
                  )}

                  {/* Fleet Filter - Only show if data exists */}
                  {filterOptions.fleets && filterOptions.fleets.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Fleet {selectedFleets.length > 0 && `(${selectedFleets.length} selected)`}
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {filterOptions.fleets.map(fleet => (
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
                    </div>
                  </div>
                  )}

                  {/* Platform Filter - Only show if data exists */}
                  {filterOptions.platforms && filterOptions.platforms.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Platform {selectedPlatforms.length > 0 && `(${selectedPlatforms.length} selected)`}
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {filterOptions.platforms.map(platform => (
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
                    </div>
                  </div>
                  )}

                </div>
                )}

                {/* Room Filter Cloud - Only show if data exists AND search matches */}
                {filterOptions.rooms && filterOptions.rooms.length > 0 && 
                 filterOptions.rooms.filter(room => room.toLowerCase().includes(searchQuery.toLowerCase())).length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Room {selectedRooms.length > 0 && `(${selectedRooms.length} selected)`}
                    </h3>
                  </div>
                  <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-800">
                    <div className="flex flex-wrap gap-1">
                      {filterOptions.rooms
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
                    </div>
                  </div>
                </div>
                )}

                {/* Installs Filter Cloud - Dynamic Height showing ALL installs */}
                {/* Hide when items status filter is active (showing all errors/warnings/pending) */}
                {itemsStatusFilter === 'all' && (
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
                )}

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

          {/* Results Section - Regular Installs Table */}
          {installs.length > 0 && !isConfigReport && (
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
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
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
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

          {/* Status-Filtered Devices Table - Shows when errors or warnings filter is active */}
          {itemsStatusFilter !== 'all' && !filtersLoading && statusFilteredDevices.length > 0 && (
            <div className="px-6 py-4">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  {itemsStatusFilter === 'errors' ? (
                    <>
                      <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Devices with Install Errors ({statusFilteredDevices.length})
                    </>
                  ) : itemsStatusFilter === 'warnings' ? (
                    <>
                      <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Devices with Warnings ({statusFilteredDevices.length})
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      Devices with Pending Updates ({statusFilteredDevices.length})
                    </>
                  )}
                  {searchQuery && (
                    <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                      - filtered by "{searchQuery}"
                    </span>
                  )}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {searchQuery 
                    ? `Showing devices with "${searchQuery}" packages that have ${itemsStatusFilter === 'errors' ? 'errors' : itemsStatusFilter === 'warnings' ? 'warnings' : 'pending updates'}.`
                    : itemsStatusFilter === 'errors' 
                      ? 'These devices have one or more packages with failed installations or errors.'
                      : itemsStatusFilter === 'warnings'
                        ? 'These devices have packages with warnings that need attention.'
                        : 'These devices have packages with pending updates.'}
                </p>
              </div>
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Device
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {itemsStatusFilter === 'errors' ? 'Failed Packages' : itemsStatusFilter === 'warnings' ? 'Warning Packages' : 'Pending Packages'}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Last Seen
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {statusFilteredDevices.map((device: any) => {
                      const cimianItems = device.modules?.installs?.cimian?.items || []
                      
                      // First filter by status type
                      let statusFilteredItems = itemsStatusFilter === 'errors'
                        ? cimianItems.filter((item: any) => {
                            const status = item.currentStatus?.toLowerCase() || ''
                            return status.includes('error') || status.includes('failed') || status === 'needs_reinstall'
                          })
                        : itemsStatusFilter === 'warnings'
                          ? cimianItems.filter((item: any) => {
                              const status = item.currentStatus?.toLowerCase() || ''
                              return status.includes('warning') || status === 'needs-attention' || status === 'managed-update-available'
                            })
                          : cimianItems.filter((item: any) => {
                              const status = item.currentStatus?.toLowerCase() || ''
                              return status.includes('will-be-installed') || status.includes('update-available') || 
                                     status.includes('update_available') || status.includes('will-be-removed') || 
                                     status.includes('pending') || status.includes('scheduled')
                            })
                      
                      // Then filter by search query if present
                      const affectedPackages = searchQuery
                        ? statusFilteredItems.filter((item: any) => {
                            const itemName = (item.itemName || item.name || '').toLowerCase()
                            return itemName.includes(searchQuery.toLowerCase())
                          })
                        : statusFilteredItems
                      
                      // Skip this device if no packages match after search filter
                      if (affectedPackages.length === 0) return null
                      
                      return (
                        <tr key={device.serialNumber} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="px-6 py-4">
                            <div>
                              <Link href={`/device/${device.serialNumber}`} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
                                {device.modules?.inventory?.deviceName || device.serialNumber}
                              </Link>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {device.serialNumber}
                                {device.modules?.inventory?.assetTag && (
                                  <span className="ml-2 text-gray-400 dark:text-gray-500">• {device.modules.inventory.assetTag}</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                              {affectedPackages.slice(0, 5).map((pkg: any, idx: number) => (
                                <span 
                                  key={idx}
                                  className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${
                                    itemsStatusFilter === 'errors'
                                      ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                                      : itemsStatusFilter === 'warnings'
                                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300'
                                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                                  }`}
                                  title={`${pkg.itemName}: ${pkg.currentStatus}`}
                                >
                                  {pkg.itemName}
                                </span>
                              ))}
                              {affectedPackages.length > 5 && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  +{affectedPackages.length - 5} more
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {formatRelativeTime(device.lastSeen)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Link 
                              href={`/device/${device.serialNumber}?tab=installs`}
                              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              View Details
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty state for status filter when no devices match */}
          {itemsStatusFilter !== 'all' && !filtersLoading && statusFilteredDevices.length === 0 && (
            <div className="px-6 py-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-green-100 dark:bg-green-900/30">
                <svg className="w-8 h-8 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {itemsStatusFilter === 'errors' ? 'No Install Errors!' : itemsStatusFilter === 'warnings' ? 'No Warnings!' : 'No Pending Updates!'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {itemsStatusFilter === 'errors' 
                  ? 'All devices have successful installations. Great job keeping everything running smoothly!'
                  : itemsStatusFilter === 'warnings'
                    ? 'No packages have warnings. Everything looks good!'
                    : 'All managed packages are up to date across your fleet.'}
              </p>
            </div>
          )}
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
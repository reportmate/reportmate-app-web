"use client"

import { useState, useEffect, Suspense, useMemo, useCallback, useTransition } from 'react'
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
  const [filtersExpanded, setFiltersExpanded] = useState(false) // Collapsed by default since Config Report is default view
  const [devices, setDevices] = useState<any[]>([])
  const [isPending, startTransition] = useTransition() // For non-blocking state updates
  const [isConfigReport, setIsConfigReport] = useState(false)
  const [configReportData, setConfigReportData] = useState<any[]>([])
  const [selectedManifest, setSelectedManifest] = useState<string>('')
  const [selectedSoftwareRepo, setSelectedSoftwareRepo] = useState<string>('')
  const [selectedMunkiVersion, setSelectedMunkiVersion] = useState<string>('')
  const [selectedCimianVersion, setSelectedCimianVersion] = useState<string>('')
  const [hasGeneratedReport, setHasGeneratedReport] = useState(false)
  const [reportProgress, setReportProgress] = useState(0)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false) // Track when user is selecting installs for a report
  
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
  // Install status filter (installed, pending, warnings, errors, removed)
  const [installStatusFilter, setInstallStatusFilter] = useState<'all' | 'installed' | 'pending' | 'warnings' | 'errors' | 'removed'>('all')
  // Widgets accordion state
  const [widgetsExpanded, setWidgetsExpanded] = useState(true)
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
      
      // NOTE: sessionStorage caching DISABLED - was causing 60+ second UI freeze
      // due to JSON.stringify/parse of massive device data (10MB+)
      // Always fetch fresh data for now
      
      // Show loading state without specific numbers initially
      setLoadingProgress({ current: 0, total: 0 })
      
      // Get estimated device count from a quick API call
      let estimatedTotal = 0
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
      
      // Set progress to 100% and hide skeleton IMMEDIATELY after response arrives
      // This happens BEFORE JSON parsing to ensure UI updates right away
      setLoadingMessage('Processing...')
      setLoadingProgress({ current: estimatedTotal, total: estimatedTotal })
      setFiltersLoading(false)
      
      if (!response.ok) {
        console.error('[INSTALLS PAGE] Filters API failed:', response.status, response.statusText)
        throw new Error(`API returned ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format from filters API')
      }
      
      // Get the actual device count from the response
      const actualDeviceCount = data.devicesWithData || 0
      
      setFilterOptions(data)
      
      // Extract device data from same response (no second API call needed)
      // Use startTransition to make this non-blocking - allows UI to update while processing
      if (data.devices && Array.isArray(data.devices)) {
        startTransition(() => {
          setDevices(data.devices)
        })
        console.log('[INSTALLS PAGE] Loaded', data.devices.length, 'devices with installs data from single API call')
      }
      
      // DISABLED: sessionStorage caching - the full devices data is too large (10MB+)
      // and JSON.stringify blocks the main thread for 30+ seconds
      // The API response is fast enough that caching isn't worth the UI freeze
      // If caching is needed in the future, use IndexedDB with async operations
      
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
      // Ignore abort errors - these happen when component unmounts or dev server reloads
      if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('abort'))) {
        console.log('[INSTALLS PAGE] Request aborted (likely dev server reload or navigation)')
        return
      }
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
      
      // Reset post-generation filters to show all results initially
      setDeviceStatusFilter('all')
      setInstallStatusFilter('all')

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
        setFiltersExpanded(true) // Auto-expand filters after report generation
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
  
  // Helper function to classify item status
  const classifyItemStatus = (item: any): 'installed' | 'pending' | 'error' | 'warning' | 'removed' => {
    const status = item.currentStatus?.toLowerCase() || ''
    
    // Check for errors first
    if (status.includes('error') || status.includes('failed') || status === 'needs_reinstall') {
      return 'error'
    }
    // Check for warnings
    if (status.includes('warning') || status === 'needs-attention' || status === 'managed-update-available') {
      return 'warning'
    }
    // Check for pending removals (separate from other pending)
    if (status.includes('will-be-removed') || status.includes('removal-requested')) {
      return 'removed'
    }
    // Check for other pending statuses
    if (status.includes('will-be-installed') || status.includes('update-available') || 
        status.includes('update_available') || status.includes('pending') || status.includes('scheduled')) {
      return 'pending'
    }
    // Everything else is installed
    return 'installed'
  }

  // Config Report handler - now the default view
  const handleConfigReport = useCallback(async () => {
    if (devices.length === 0) return // Guard against empty devices
    
    try {
      setLoading(true)
      setError(null)
      setFiltersExpanded(false)
      setSearchQuery('')
      
      // Process devices to extract config data with item counts
      const configData = devices.map(device => {
        const cimianConfig = device.modules?.installs?.cimian
        const munkiConfig = device.modules?.installs?.munki
        
        // Prefer Cimian over Munki
        const config = cimianConfig || munkiConfig
        const isCimian = !!cimianConfig
        
        // Get items and count by status
        const items = config?.items || []
        let installedCount = 0
        let pendingCount = 0
        let errorCount = 0
        let warningCount = 0
        let removedCount = 0
        
        items.forEach((item: any) => {
          const classification = classifyItemStatus(item)
          switch (classification) {
            case 'installed': installedCount++; break
            case 'pending': pendingCount++; break
            case 'error': errorCount++; break
            case 'warning': warningCount++; break
            case 'removed': removedCount++; break
          }
        })
        
        // Get most recent session
        const sessions = config?.sessions || []
        const latestSession = sessions.length > 0 ? sessions[0] : null
        
        return {
          deviceId: device.deviceId,
          serialNumber: device.serialNumber,
          deviceName: device.modules?.inventory?.deviceName || device.serialNumber,
          assetTag: device.modules?.inventory?.assetTag || '',
          usage: device.modules?.inventory?.usage || 'Unknown',
          catalog: device.modules?.inventory?.catalog || 'Unknown',
          room: device.modules?.inventory?.location || 'Unknown',
          location: device.modules?.inventory?.location || 'Unknown',
          fleet: device.modules?.inventory?.fleet || 'Unknown',
          platform: device.modules?.inventory?.platform || device.modules?.system?.operatingSystem?.platform || device.platform || 'Unknown',
          lastSeen: device.lastSeen,
          // Config data
          configType: isCimian ? 'Cimian' : (munkiConfig ? 'Munki' : 'None'),
          clientIdentifier: config?.config?.ClientIdentifier || config?.config?.clientIdentifier || 'N/A',
          softwareRepoUrl: config?.config?.SoftwareRepoURL || config?.config?.softwareRepoUrl || 'N/A',
          version: config?.version || 'N/A',
          lastSessionStatus: latestSession?.status || 'N/A',
          totalPackagesManaged: items.length,
          // Item counts by status
          installedCount,
          pendingCount,
          errorCount,
          warningCount,
          removedCount
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
  }, [devices])
  
  // Reset report handler - returns to default config report view
  const handleResetReport = () => {
    setInstalls([])
    setHasGeneratedReport(false)
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
    setInstallStatusFilter('all')
    // Clear selected filters
    setSelectedInstalls([])
    setSelectedUsages([])
    setSelectedCatalogs([])
    setSelectedRooms([])
    setSelectedFleets([])
    setSelectedPlatforms([])
    // Go to Generate Report view with filters expanded
    setIsGeneratingReport(true)
    setFiltersExpanded(true)
    setIsConfigReport(false)
    setConfigReportData([])
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
    
    // Apply device status filter (Active/Stale/Missing based on lastSeen)
    if (deviceStatusFilter !== 'all') {
      const now = new Date()
      filtered = filtered.filter(device => {
        if (!device.lastSeen) return deviceStatusFilter === 'missing'
        const lastSeenDate = new Date(device.lastSeen)
        const hoursSinceLastSeen = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60 * 60)
        
        if (deviceStatusFilter === 'active') return hoursSinceLastSeen <= 24
        if (deviceStatusFilter === 'stale') return hoursSinceLastSeen > 24 && hoursSinceLastSeen <= 168
        if (deviceStatusFilter === 'missing') return hoursSinceLastSeen > 168
        return true
      })
    }
    
    // Apply install status filter (Installed/Pending/Warnings/Errors/Removed)
    if (installStatusFilter !== 'all') {
      filtered = filtered.filter(device => {
        if (installStatusFilter === 'installed') return (device.installedCount || 0) > 0
        if (installStatusFilter === 'pending') return (device.pendingCount || 0) > 0
        if (installStatusFilter === 'warnings') return (device.warningCount || 0) > 0
        if (installStatusFilter === 'errors') return (device.errorCount || 0) > 0
        if (installStatusFilter === 'removed') return (device.removedCount || 0) > 0
        return true
      })
    }
    
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
    
    // Filter by inventory filters (usage, catalog, fleet, platform, room)
    if (selectedUsages.length > 0) {
      filtered = filtered.filter(device => {
        const usage = device.usage?.toLowerCase() || ''
        return selectedUsages.some(u => usage.includes(u.toLowerCase()))
      })
    }
    if (selectedCatalogs.length > 0) {
      filtered = filtered.filter(device => {
        const catalog = device.catalog?.toLowerCase() || ''
        return selectedCatalogs.some(c => catalog.includes(c.toLowerCase()))
      })
    }
    if (selectedFleets.length > 0) {
      filtered = filtered.filter(device => {
        const fleet = device.fleet?.toLowerCase() || ''
        return selectedFleets.some(f => fleet.toLowerCase().includes(f.toLowerCase()))
      })
    }
    if (selectedPlatforms.length > 0) {
      filtered = filtered.filter(device => {
        const platform = device.platform?.toLowerCase() || ''
        return selectedPlatforms.some(p => platform.includes(p.toLowerCase()))
      })
    }
    if (selectedRooms.length > 0) {
      filtered = filtered.filter(device => {
        const room = device.location?.toLowerCase() || ''
        return selectedRooms.some(r => room.includes(r.toLowerCase()))
      })
    }
    
    // Apply search query filter (search by device name, serial, or asset tag)
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase()
      filtered = filtered.filter(device => {
        const deviceName = device.deviceName?.toLowerCase() || ''
        const serial = device.serialNumber?.toLowerCase() || ''
        const assetTag = device.assetTag?.toLowerCase() || ''
        return deviceName.includes(lowerQuery) || serial.includes(lowerQuery) || assetTag.includes(lowerQuery)
      })
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
  }, [configReportData, deviceStatusFilter, installStatusFilter, selectedManifest, selectedSoftwareRepo, selectedMunkiVersion, selectedCimianVersion, selectedUsages, selectedCatalogs, selectedFleets, selectedPlatforms, selectedRooms, searchQuery, sortColumn, sortDirection])
  
  // Filter installs based on search query AND inventory filters AND device status AND install status
  const filteredInstalls = useMemo(() => {
    let filtered = installs
    
    // Apply device status filter (Active/Stale/Missing based on lastSeen)
    if (deviceStatusFilter !== 'all') {
      const now = new Date()
      filtered = filtered.filter(install => {
        if (!install.lastSeen) return deviceStatusFilter === 'missing'
        const lastSeenDate = new Date(install.lastSeen)
        const hoursSinceLastSeen = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60 * 60)
        
        if (deviceStatusFilter === 'active') {
          return hoursSinceLastSeen <= 24 // Active = seen in last 24 hours
        } else if (deviceStatusFilter === 'stale') {
          return hoursSinceLastSeen > 24 && hoursSinceLastSeen <= 168 // Stale = 1-7 days
        } else if (deviceStatusFilter === 'missing') {
          return hoursSinceLastSeen > 168 // Missing = not seen in 7+ days
        }
        return true
      })
    }
    
    // Apply install status filter (Installed/Pending/Warnings/Errors/Removed)
    // For generate report mode, filter by status field
    if (installStatusFilter !== 'all') {
      filtered = filtered.filter(install => {
        const status = (install.status || '').toLowerCase()
        if (installStatusFilter === 'installed') {
          return status.includes('installed') || status === 'present'
        }
        if (installStatusFilter === 'pending') {
          return status.includes('pending') || status.includes('will-be-installed') || status.includes('update-available') || status.includes('scheduled')
        }
        if (installStatusFilter === 'warnings') {
          return status.includes('warning') || status === 'needs-attention' || status === 'managed-update-available'
        }
        if (installStatusFilter === 'errors') {
          return status.includes('error') || status.includes('failed') || status === 'needs_reinstall'
        }
        if (installStatusFilter === 'removed') {
          return status.includes('removed') || status.includes('will-be-removed') || status.includes('removal')
        }
        return true
      })
    }
    
    // Apply search query filter
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase()
      filtered = filtered.filter(install => 
        install.deviceName?.toLowerCase().includes(lowerQuery) ||
        install.serialNumber?.toLowerCase().includes(lowerQuery) ||
        install.name?.toLowerCase().includes(lowerQuery) ||
        install.version?.toLowerCase().includes(lowerQuery) ||
        install.source?.toLowerCase().includes(lowerQuery) ||
        // Add support for "Name - Version" search from widget clicks
        `${install.name} - ${install.version || 'Unknown'}`.toLowerCase().includes(lowerQuery)
      )
    }
    
    // Apply Usage filter
    if (selectedUsages.length > 0) {
      filtered = filtered.filter(install => 
        install.usage && selectedUsages.includes(install.usage.toLowerCase())
      )
    }
    
    // Apply Catalog filter
    if (selectedCatalogs.length > 0) {
      filtered = filtered.filter(install => 
        install.catalog && selectedCatalogs.includes(install.catalog.toLowerCase())
      )
    }
    
    // Apply Fleet filter
    if (selectedFleets.length > 0) {
      filtered = filtered.filter(install => 
        install.fleet && selectedFleets.includes(install.fleet)
      )
    }
    
    // Apply Platform filter
    if (selectedPlatforms.length > 0) {
      filtered = filtered.filter(install => 
        install.platform && selectedPlatforms.includes(install.platform)
      )
    }
    
    // Apply Location filter
    if (selectedRooms.length > 0) {
      filtered = filtered.filter(install => 
        install.room && selectedRooms.includes(install.room)
      )
    }
    
    return filtered
  }, [installs, searchQuery, selectedUsages, selectedCatalogs, selectedFleets, selectedPlatforms, selectedRooms, deviceStatusFilter, installStatusFilter])

  useEffect(() => {
    fetchFilterOptions()
  }, [fetchFilterOptions])

  // Auto-load Config Report when devices are loaded (default view)
  // Use setTimeout to defer processing and allow UI to render first
  useEffect(() => {
    if (devices.length > 0 && !isConfigReport && configReportData.length === 0 && !hasGeneratedReport && itemsStatusFilter === 'all') {
      // Defer to next frame to allow UI to update first
      const timeoutId = setTimeout(() => {
        handleConfigReport()
      }, 0)
      return () => clearTimeout(timeoutId)
    }
  }, [devices.length, isConfigReport, configReportData.length, hasGeneratedReport, itemsStatusFilter, handleConfigReport])

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
  // Counts should reflect data with OTHER filters applied (not deviceStatusFilter itself)
  // This makes the counts dynamic - showing what would match if you clicked that status
  const deviceStatusCounts = useMemo(() => {
    const counts = { active: 0, stale: 0, missing: 0 }
    const now = new Date()
    
    // If we're in config report mode with data, count from configReportData with other filters applied
    if (isConfigReport && configReportData.length > 0) {
      // Apply all filters EXCEPT deviceStatusFilter to get the base data
      let dataToCount = [...configReportData]
      
      // Apply install status filter
      if (installStatusFilter !== 'all') {
        dataToCount = dataToCount.filter(device => {
          if (installStatusFilter === 'installed') return (device.installedCount || 0) > 0
          if (installStatusFilter === 'pending') return (device.pendingCount || 0) > 0
          if (installStatusFilter === 'warnings') return (device.warningCount || 0) > 0
          if (installStatusFilter === 'errors') return (device.errorCount || 0) > 0
          if (installStatusFilter === 'removed') return (device.removedCount || 0) > 0
          return true
        })
      }
      
      // Apply manifest filter
      if (selectedManifest) {
        dataToCount = dataToCount.filter(device => device.clientIdentifier === selectedManifest)
      }
      
      // Apply software repo filter
      if (selectedSoftwareRepo) {
        dataToCount = dataToCount.filter(device => device.softwareRepoUrl === selectedSoftwareRepo)
      }
      
      // Apply Munki version filter
      if (selectedMunkiVersion) {
        dataToCount = dataToCount.filter(device => device.configType === 'Munki' && device.version === selectedMunkiVersion)
      }
      
      // Apply Cimian version filter
      if (selectedCimianVersion) {
        dataToCount = dataToCount.filter(device => device.configType === 'Cimian' && device.version === selectedCimianVersion)
      }
      
      // Apply inventory filters
      if (selectedUsages.length > 0) {
        dataToCount = dataToCount.filter(device => {
          const usage = device.usage?.toLowerCase() || ''
          return selectedUsages.some(u => usage.includes(u.toLowerCase()))
        })
      }
      if (selectedCatalogs.length > 0) {
        dataToCount = dataToCount.filter(device => {
          const catalog = device.catalog?.toLowerCase() || ''
          return selectedCatalogs.some(c => catalog.includes(c.toLowerCase()))
        })
      }
      if (selectedFleets.length > 0) {
        dataToCount = dataToCount.filter(device => {
          const fleet = device.fleet?.toLowerCase() || ''
          return selectedFleets.some(f => fleet.toLowerCase().includes(f.toLowerCase()))
        })
      }
      if (selectedPlatforms.length > 0) {
        dataToCount = dataToCount.filter(device => {
          const platform = device.platform?.toLowerCase() || ''
          return selectedPlatforms.some(p => platform.includes(p.toLowerCase()))
        })
      }
      if (selectedRooms.length > 0) {
        dataToCount = dataToCount.filter(device => {
          const room = device.location?.toLowerCase() || ''
          return selectedRooms.some(r => room.includes(r.toLowerCase()))
        })
      }
      
      // Now count device statuses from the filtered data
      dataToCount.forEach(device => {
        if (!device.lastSeen) {
          counts.missing++
          return
        }
        const lastSeenDate = new Date(device.lastSeen)
        const hoursSinceLastSeen = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60 * 60)
        
        if (hoursSinceLastSeen <= 24) counts.active++
        else if (hoursSinceLastSeen <= 168) counts.stale++
        else counts.missing++
      })
      return counts
    }
    
    // If we have a generated report with installs, count from those with other filters applied
    if (installs.length > 0) {
      // Apply all filters EXCEPT deviceStatusFilter
      let installsToCount = [...installs]
      
      // Apply install status filter
      if (installStatusFilter !== 'all') {
        installsToCount = installsToCount.filter(install => {
          const status = (install.status || '').toLowerCase()
          if (installStatusFilter === 'installed') {
            return status.includes('installed') || status === 'present'
          }
          if (installStatusFilter === 'pending') {
            return status.includes('pending') || status.includes('will-be-installed') || status.includes('update-available') || status.includes('scheduled')
          }
          if (installStatusFilter === 'warnings') {
            return status.includes('warning') || status === 'needs-attention' || status === 'managed-update-available'
          }
          if (installStatusFilter === 'errors') {
            return status.includes('error') || status.includes('failed') || status === 'needs_reinstall'
          }
          if (installStatusFilter === 'removed') {
            return status.includes('removed') || status.includes('will-be-removed') || status.includes('removal')
          }
          return true
        })
      }
      
      // Apply search query filter
      if (searchQuery) {
        const lowerQuery = searchQuery.toLowerCase()
        installsToCount = installsToCount.filter(install => 
          install.deviceName?.toLowerCase().includes(lowerQuery) ||
          install.serialNumber?.toLowerCase().includes(lowerQuery) ||
          install.name?.toLowerCase().includes(lowerQuery) ||
          install.version?.toLowerCase().includes(lowerQuery) ||
          install.source?.toLowerCase().includes(lowerQuery) ||
          `${install.name} - ${install.version || 'Unknown'}`.toLowerCase().includes(lowerQuery)
        )
      }
      
      // Apply inventory filters
      if (selectedUsages.length > 0) {
        installsToCount = installsToCount.filter(install => 
          install.usage && selectedUsages.includes(install.usage.toLowerCase())
        )
      }
      if (selectedCatalogs.length > 0) {
        installsToCount = installsToCount.filter(install => 
          install.catalog && selectedCatalogs.includes(install.catalog.toLowerCase())
        )
      }
      if (selectedFleets.length > 0) {
        installsToCount = installsToCount.filter(install => 
          install.fleet && selectedFleets.includes(install.fleet)
        )
      }
      if (selectedPlatforms.length > 0) {
        installsToCount = installsToCount.filter(install => 
          install.platform && selectedPlatforms.includes(install.platform)
        )
      }
      if (selectedRooms.length > 0) {
        installsToCount = installsToCount.filter(install => 
          install.room && selectedRooms.includes(install.room)
        )
      }
      
      // Get unique devices from filtered installs
      const deviceLastSeen = new Map<string, string>()
      installsToCount.forEach(install => {
        const existing = deviceLastSeen.get(install.serialNumber)
        if (!existing || (install.lastSeen && install.lastSeen > existing)) {
          deviceLastSeen.set(install.serialNumber, install.lastSeen || '')
        }
      })
      
      deviceLastSeen.forEach((lastSeen) => {
        if (!lastSeen) {
          counts.missing++
          return
        }
        const lastSeenDate = new Date(lastSeen)
        const hoursSinceLastSeen = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60 * 60)
        
        if (hoursSinceLastSeen <= 24) counts.active++
        else if (hoursSinceLastSeen <= 168) counts.stale++
        else counts.missing++
      })
      return counts
    }
    
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
  }, [installs, devices, devicesWithErrors, devicesWithWarnings, devicesWithPending, searchQuery, itemsStatusFilter, isConfigReport, configReportData, installStatusFilter, selectedManifest, selectedSoftwareRepo, selectedMunkiVersion, selectedCimianVersion, selectedUsages, selectedCatalogs, selectedFleets, selectedPlatforms, selectedRooms])

  // Calculate install status counts (Installed/Pending/Warnings/Errors/Removed)
  // Counts should reflect data with OTHER filters applied (not installStatusFilter itself)
  // This makes the counts dynamic - showing what would match if you clicked that status
  const installStatusCounts = useMemo(() => {
    const counts = { installed: 0, pending: 0, warnings: 0, errors: 0, removed: 0 }
    
    // Use configReportData for config report mode (sum up count fields)
    if (isConfigReport && configReportData.length > 0) {
      // Apply all filters EXCEPT installStatusFilter to get the base data
      let dataToCount = [...configReportData]
      const now = new Date()
      
      // Apply device status filter
      if (deviceStatusFilter !== 'all') {
        dataToCount = dataToCount.filter(device => {
          if (!device.lastSeen) return deviceStatusFilter === 'missing'
          const lastSeenDate = new Date(device.lastSeen)
          const hoursSinceLastSeen = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60 * 60)
          
          if (deviceStatusFilter === 'active') return hoursSinceLastSeen <= 24
          if (deviceStatusFilter === 'stale') return hoursSinceLastSeen > 24 && hoursSinceLastSeen <= 168
          if (deviceStatusFilter === 'missing') return hoursSinceLastSeen > 168
          return true
        })
      }
      
      // Apply manifest filter
      if (selectedManifest) {
        dataToCount = dataToCount.filter(device => device.clientIdentifier === selectedManifest)
      }
      
      // Apply software repo filter
      if (selectedSoftwareRepo) {
        dataToCount = dataToCount.filter(device => device.softwareRepoUrl === selectedSoftwareRepo)
      }
      
      // Apply Munki version filter
      if (selectedMunkiVersion) {
        dataToCount = dataToCount.filter(device => device.configType === 'Munki' && device.version === selectedMunkiVersion)
      }
      
      // Apply Cimian version filter
      if (selectedCimianVersion) {
        dataToCount = dataToCount.filter(device => device.configType === 'Cimian' && device.version === selectedCimianVersion)
      }
      
      // Apply inventory filters
      if (selectedUsages.length > 0) {
        dataToCount = dataToCount.filter(device => {
          const usage = device.usage?.toLowerCase() || ''
          return selectedUsages.some(u => usage.includes(u.toLowerCase()))
        })
      }
      if (selectedCatalogs.length > 0) {
        dataToCount = dataToCount.filter(device => {
          const catalog = device.catalog?.toLowerCase() || ''
          return selectedCatalogs.some(c => catalog.includes(c.toLowerCase()))
        })
      }
      if (selectedFleets.length > 0) {
        dataToCount = dataToCount.filter(device => {
          const fleet = device.fleet?.toLowerCase() || ''
          return selectedFleets.some(f => fleet.toLowerCase().includes(f.toLowerCase()))
        })
      }
      if (selectedPlatforms.length > 0) {
        dataToCount = dataToCount.filter(device => {
          const platform = device.platform?.toLowerCase() || ''
          return selectedPlatforms.some(p => platform.includes(p.toLowerCase()))
        })
      }
      if (selectedRooms.length > 0) {
        dataToCount = dataToCount.filter(device => {
          const room = device.location?.toLowerCase() || ''
          return selectedRooms.some(r => room.includes(r.toLowerCase()))
        })
      }
      
      // Now sum up counts from the filtered data
      dataToCount.forEach(item => {
        counts.installed += item.installedCount || 0
        counts.pending += item.pendingCount || 0
        counts.warnings += item.warningCount || 0
        counts.errors += item.errorCount || 0
        counts.removed += item.removedCount || 0
      })
    } else if (installs.length > 0) {
      // Apply all filters EXCEPT installStatusFilter
      let installsToCount = [...installs]
      const now = new Date()
      
      // Apply device status filter
      if (deviceStatusFilter !== 'all') {
        installsToCount = installsToCount.filter(install => {
          if (!install.lastSeen) return deviceStatusFilter === 'missing'
          const lastSeenDate = new Date(install.lastSeen)
          const hoursSinceLastSeen = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60 * 60)
          
          if (deviceStatusFilter === 'active') return hoursSinceLastSeen <= 24
          if (deviceStatusFilter === 'stale') return hoursSinceLastSeen > 24 && hoursSinceLastSeen <= 168
          if (deviceStatusFilter === 'missing') return hoursSinceLastSeen > 168
          return true
        })
      }
      
      // Apply search query filter
      if (searchQuery) {
        const lowerQuery = searchQuery.toLowerCase()
        installsToCount = installsToCount.filter(install => 
          install.deviceName?.toLowerCase().includes(lowerQuery) ||
          install.serialNumber?.toLowerCase().includes(lowerQuery) ||
          install.name?.toLowerCase().includes(lowerQuery) ||
          install.version?.toLowerCase().includes(lowerQuery) ||
          install.source?.toLowerCase().includes(lowerQuery) ||
          `${install.name} - ${install.version || 'Unknown'}`.toLowerCase().includes(lowerQuery)
        )
      }
      
      // Apply inventory filters
      if (selectedUsages.length > 0) {
        installsToCount = installsToCount.filter(install => 
          install.usage && selectedUsages.includes(install.usage.toLowerCase())
        )
      }
      if (selectedCatalogs.length > 0) {
        installsToCount = installsToCount.filter(install => 
          install.catalog && selectedCatalogs.includes(install.catalog.toLowerCase())
        )
      }
      if (selectedFleets.length > 0) {
        installsToCount = installsToCount.filter(install => 
          install.fleet && selectedFleets.includes(install.fleet)
        )
      }
      if (selectedPlatforms.length > 0) {
        installsToCount = installsToCount.filter(install => 
          install.platform && selectedPlatforms.includes(install.platform)
        )
      }
      if (selectedRooms.length > 0) {
        installsToCount = installsToCount.filter(install => 
          install.room && selectedRooms.includes(install.room)
        )
      }
      
      // For generate report mode, count by status field
      installsToCount.forEach(item => {
        const status = (item.status || '').toLowerCase()
        if (status.includes('installed') || status === 'present') {
          counts.installed++
        } else if (status.includes('pending') || status.includes('will-be-installed') || status.includes('update-available') || status.includes('scheduled')) {
          counts.pending++
        } else if (status.includes('warning') || status === 'needs-attention' || status === 'managed-update-available') {
          counts.warnings++
        } else if (status.includes('error') || status.includes('failed') || status === 'needs_reinstall') {
          counts.errors++
        } else if (status.includes('removed') || status.includes('will-be-removed') || status.includes('removal')) {
          counts.removed++
        }
      })
    }
    return counts
  }, [installs, configReportData, isConfigReport, deviceStatusFilter, searchQuery, selectedManifest, selectedSoftwareRepo, selectedMunkiVersion, selectedCimianVersion, selectedUsages, selectedCatalogs, selectedFleets, selectedPlatforms, selectedRooms])

  // Compute available filter options from the current report data (installs array)
  // Only show filter values that actually exist in the report
  const reportFilterOptions = useMemo(() => {
    if (installs.length === 0) {
      return { usages: [], catalogs: [], fleets: [], platforms: [], rooms: [] }
    }
    
    const usages = new Set<string>()
    const catalogs = new Set<string>()
    const fleets = new Set<string>()
    const platforms = new Set<string>()
    const rooms = new Set<string>()
    
    installs.forEach(install => {
      if (install.usage) usages.add(install.usage)
      if (install.catalog) catalogs.add(install.catalog)
      if (install.fleet) fleets.add(install.fleet)
      if (install.platform) platforms.add(install.platform)
      if (install.room) rooms.add(install.room)
    })
    
    return {
      usages: Array.from(usages).sort(),
      catalogs: Array.from(catalogs).sort(),
      fleets: Array.from(fleets).sort(),
      platforms: Array.from(platforms).sort(),
      rooms: Array.from(rooms).sort()
    }
  }, [installs])

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
                {/* <div className="min-w-0">
                  <h1 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                    Installs Report
                  </h1>
                </div> */}
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
            <div className="flex items-center gap-4 flex-1 min-w-0">
              {/* Back to Config Report Button - Shows when in Generate Report mode, loading report, or after report generated */}
              {(isGeneratingReport || loading || (hasGeneratedReport && installs.length > 0)) && (
                <button
                  onClick={() => {
                    // Go back to Config Report (default view)
                    setIsGeneratingReport(false)
                    setFiltersExpanded(false)
                    setSelectedInstalls([])
                    handleConfigReport()
                  }}
                  className="p-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors flex items-center justify-center flex-shrink-0"
                  title="Back to Config Report"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
              )}
              <div className="flex-shrink-0">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Managed Software Update Reporting
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {isGeneratingReport
                    ? 'Select items from the list below, then click Generate Report'
                    : isConfigReport
                      ? 'View device configurations, drill down by status, or generate targeted reports using filters'
                      : installs.length === 0 
                        ? hasGeneratedReport
                          ? 'No install records found matching your criteria.'
                          : 'Select items from filters to generate an items report'
                        : 'Filtered install records across selected devices and criteria'
                  }
                </p>
              </div>
              
              {/* Loading Progress - Inline with title */}
              {filtersLoading && (
                <div className="flex-1 min-w-0 ml-6 hidden sm:block">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 truncate">
                          {loadingMessage || 'Loading managed installs data...'}
                        </p>
                        {loadingProgress.total > 0 && (
                          <p className="text-xs text-gray-500 dark:text-gray-500 ml-2 flex-shrink-0">
                            {loadingProgress.current}/{loadingProgress.total}
                          </p>
                        )}
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-emerald-600 h-2 rounded-full transition-all duration-300 ease-out"
                          style={{ 
                            width: loadingProgress.total > 0
                              ? `${(loadingProgress.current / loadingProgress.total) * 100}%`
                              : '0%'
                          }}
                        ></div>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                      {loadingProgress.total > 0 
                        ? `${Math.round((loadingProgress.current / loadingProgress.total) * 100)}%`
                        : ''
                      }
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons in Header */}
            <div className="flex items-center gap-3">
              {/* Generate Report Button - Hidden during initial loading, expands filters if no installs selected */}
              {!loading && !filtersLoading && (
                <>
                  {/* "New Report" button when report has been generated */}
                  {hasGeneratedReport && installs.length > 0 && (
                    <button
                      onClick={() => {
                        // Reset to generate report mode
                        setFiltersExpanded(true)
                        setIsConfigReport(false)
                        setInstalls([])
                        setHasGeneratedReport(false)
                        setIsGeneratingReport(true)
                        setItemsStatusFilter('all') // Reset items status filter
                        setSearchQuery('') // Clear search box
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors whitespace-nowrap font-medium flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      New Report
                    </button>
                  )}
                  {/* Blue Generate/Update Report button */}
                  {!(hasGeneratedReport && installs.length > 0) && (
                    <button
                      onClick={() => {
                        if (selectedInstalls.length === 0) {
                          // No installs selected - expand filters, hide widgets, show items filter cloud
                          setFiltersExpanded(true)
                          setIsConfigReport(false)
                          setInstalls([])
                          setIsGeneratingReport(true) // Enter generate report mode
                          setItemsStatusFilter('all') // Reset items status filter
                          setSearchQuery('') // Clear search box
                        } else {
                          // Installs selected - generate the report
                          setIsGeneratingReport(false) // Exit generate report mode
                          setIsConfigReport(false) // Ensure config report view is off
                          handleGenerateReport()
                        }
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors whitespace-nowrap font-medium flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {selectedInstalls.length > 0 
                        ? (filtersChanged ? 'Update Report' : 'Generate Report')
                        : 'Generate Report'
                      }
                    </button>
                  )}
                </>
              )}

              {/* Export CSV Button - Only show after report is generated, hide during loading */}
              {!loading && !filtersLoading && (filteredInstalls.length > 0 || (isConfigReport && configReportData.length > 0)) && (
                <button
                  onClick={() => {
                    if (isConfigReport) {
                      // Export config report CSV with new columns
                      const csvContent = [
                        ['Device Name', 'Serial Number', 'Asset Tag', 'System', 'Version', 'Manifest', 'Repo', 'Total Items', 'Installed', 'Pending', 'Errors', 'Warnings', 'Removed', 'Last Seen'].join(','),
                        ...filteredConfigData.map(device => [
                          device.deviceName,
                          device.serialNumber,
                          device.assetTag || '',
                          device.configType,
                          device.version,
                          device.clientIdentifier,
                          device.softwareRepoUrl,
                          device.totalPackagesManaged,
                          device.installedCount,
                          device.pendingCount,
                          device.errorCount,
                          device.warningCount,
                          device.removedCount,
                          device.lastSeen
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
          <div className={`bg-white dark:bg-gray-800 ${filtersLoading ? 'rounded-b-xl' : ''}`}>
            
            {/* Mobile Loading Progress - Only on small screens */}
            {filtersLoading && (
              <div className="px-6 py-4 sm:hidden border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {loadingMessage || 'Loading...'}
                  </p>
                  {loadingProgress.total > 0 && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {loadingProgress.current}/{loadingProgress.total}
                    </p>
                  )}
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-emerald-600 h-2 rounded-full transition-all duration-300 ease-out"
                    style={{ 
                      width: loadingProgress.total > 0
                        ? `${(loadingProgress.current / loadingProgress.total) * 100}%`
                        : '0%'
                    }}
                  ></div>
                </div>
              </div>
            )}

            {/* Skeleton Loading State - Shows full page structure while loading */}
            {filtersLoading && (
              <div className="animate-pulse">
                {/* Skeleton Widgets Accordion Header */}
                <div className="border-b border-gray-200 dark:border-gray-700">
                  <div className="w-full px-6 py-3 flex items-center justify-between bg-white dark:bg-gray-800">
                    <div className="flex items-center gap-2">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                    </div>
                    <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </div>
                </div>

                {/* Skeleton Widgets Content - 3 Tables Row */}
                <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <div className="px-6 py-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Skeleton Items with Errors Table */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 bg-red-200 dark:bg-red-900/50 rounded-full"></div>
                          <div className="h-5 bg-gray-200 dark:bg-gray-600 rounded w-28"></div>
                        </div>
                        <div className="h-5 bg-red-100 dark:bg-red-900/30 rounded w-14"></div>
                      </div>
                      <div className="space-y-2">
                        {[...Array(4)].map((_, i) => (
                          <div key={i} className="flex justify-between items-center py-1">
                            <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-24"></div>
                            <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-8"></div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Skeleton Items with Warnings Table */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 bg-amber-200 dark:bg-amber-900/50 rounded-full"></div>
                          <div className="h-5 bg-gray-200 dark:bg-gray-600 rounded w-32"></div>
                        </div>
                        <div className="h-5 bg-amber-100 dark:bg-amber-900/30 rounded w-14"></div>
                      </div>
                      <div className="space-y-2">
                        {[...Array(4)].map((_, i) => (
                          <div key={i} className="flex justify-between items-center py-1">
                            <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-32"></div>
                            <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-8"></div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Skeleton Items with Pending Table */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 bg-cyan-200 dark:bg-cyan-900/50 rounded-full"></div>
                          <div className="h-5 bg-gray-200 dark:bg-gray-600 rounded w-32"></div>
                        </div>
                        <div className="h-5 bg-cyan-100 dark:bg-cyan-900/30 rounded w-14"></div>
                      </div>
                      <div className="space-y-2">
                        {[...Array(4)].map((_, i) => (
                          <div key={i} className="flex justify-between items-center py-1">
                            <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-28"></div>
                            <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-8"></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Skeleton Config Widgets Row - Software Repos, Cimian Versions, Manifests */}
                  <div className="px-6 py-4 grid grid-cols-1 lg:grid-cols-3 gap-6 border-t border-gray-200 dark:border-gray-700">
                    {/* Skeleton Software Repos */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                      <div className="h-5 bg-gray-200 dark:bg-gray-600 rounded w-28 mb-4"></div>
                      <div className="space-y-3">
                        {[...Array(2)].map((_, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-full"></div>
                            <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-10"></div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Skeleton Cimian Versions */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                      <div className="h-5 bg-gray-200 dark:bg-gray-600 rounded w-32 mb-4"></div>
                      <div className="space-y-3">
                        {[...Array(4)].map((_, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-purple-200 dark:bg-purple-900/30 rounded-full"></div>
                            <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-16"></div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Skeleton Manifests */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                      <div className="h-5 bg-gray-200 dark:bg-gray-600 rounded w-20 mb-4"></div>
                      <div className="space-y-3">
                        {[...Array(4)].map((_, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-full"></div>
                            <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-8"></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Skeleton Filters Accordion */}
                <div className="border-b border-gray-200 dark:border-gray-700">
                  <div className="w-full px-6 py-3 flex items-center justify-between bg-white dark:bg-gray-800">
                    <div className="flex items-center gap-2">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-14"></div>
                    </div>
                    <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </div>
                </div>

                {/* Skeleton Search Bar */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-md">
                      <div className="w-full h-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                    </div>
                  </div>
                </div>

                {/* Skeleton Table */}
                <div className="overflow-x-auto max-h-[calc(100vh-400px)] overflow-y-auto rounded-b-xl">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    {/* Table Header - Matches actual Config Report table */}
                    <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Device
                        </th>
                        <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          #
                        </th>
                        <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" title="Installed">
                          <svg className="w-4 h-4 mx-auto text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </th>
                        <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" title="Pending">
                          <svg className="w-4 h-4 mx-auto text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </th>
                        <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" title="Errors">
                          <svg className="w-4 h-4 mx-auto text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </th>
                        <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" title="Warnings">
                          <svg className="w-4 h-4 mx-auto text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </th>
                        <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" title="Removed">
                          <svg className="w-4 h-4 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Manifest / Repo
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Last Seen
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Version
                        </th>
                      </tr>
                    </thead>
                    {/* Skeleton Rows */}
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                      {[...Array(12)].map((_, i) => (
                        <tr key={i}>
                          {/* Device column */}
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1.5">
                              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-28"></div>
                              <div className="flex items-center gap-2">
                                <div className="h-3 bg-gray-100 dark:bg-gray-600 rounded w-20"></div>
                                <div className="h-3 bg-gray-100 dark:bg-gray-600 rounded w-14"></div>
                              </div>
                            </div>
                          </td>
                          {/* # column */}
                          <td className="px-2 py-3">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-6 mx-auto"></div>
                          </td>
                          {/* Installed column */}
                          <td className="px-2 py-3">
                            <div className="h-4 bg-green-100 dark:bg-green-900/30 rounded w-6 mx-auto"></div>
                          </td>
                          {/* Pending column */}
                          <td className="px-2 py-3">
                            <div className="h-4 bg-cyan-100 dark:bg-cyan-900/30 rounded w-6 mx-auto"></div>
                          </td>
                          {/* Errors column */}
                          <td className="px-2 py-3">
                            <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-6 mx-auto"></div>
                          </td>
                          {/* Warnings column */}
                          <td className="px-2 py-3">
                            <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-6 mx-auto"></div>
                          </td>
                          {/* Removed column */}
                          <td className="px-2 py-3">
                            <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-6 mx-auto"></div>
                          </td>
                          {/* Manifest / Repo column */}
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1.5">
                              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-44"></div>
                              <div className="h-2.5 bg-gray-100 dark:bg-gray-600 rounded w-36"></div>
                            </div>
                          </td>
                          {/* Last Seen column */}
                          <td className="px-3 py-3">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                          </td>
                          {/* Version column */}
                          <td className="px-3 py-3">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Widgets Accordion - Collapsible section for Items with Errors/Warnings/Pending and Config Widgets */}
            {isConfigReport && !isGeneratingReport && (
              itemsWithErrors.length > 0 || itemsWithWarnings.length > 0 || itemsWithPending.length > 0 ||
              (itemsStatusFilter === 'all' && configReportData.length > 0)
            ) && (
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
            )}

              {/* Widgets Content - Collapsible */}
              {widgetsExpanded && isConfigReport && !isGeneratingReport && (
                itemsWithErrors.length > 0 || itemsWithWarnings.length > 0 || itemsWithPending.length > 0 ||
                (itemsStatusFilter === 'all' && configReportData.length > 0)
              ) && (
              <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            {/* Items Tables - Errors, Warnings, Pending (Above config widgets) - Only show in config report mode */}
            {(itemsWithErrors.length > 0 || itemsWithWarnings.length > 0 || itemsWithPending.length > 0) && (
              <div className={`px-6 py-4 grid grid-cols-1 gap-6 ${
                [itemsWithErrors.length > 0, itemsWithWarnings.length > 0, itemsWithPending.length > 0].filter(Boolean).length === 3
                  ? 'lg:grid-cols-3'
                  : [itemsWithErrors.length > 0, itemsWithWarnings.length > 0, itemsWithPending.length > 0].filter(Boolean).length === 2
                    ? 'lg:grid-cols-2'
                    : 'lg:grid-cols-1'
              }`}>
                
                {/* Items with Errors Table - Only show if has errors */}
                {itemsWithErrors.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
                  <div 
                    className="flex items-center justify-between mb-4 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => {
                      if (itemsStatusFilter === 'errors' && !searchQuery) {
                        setItemsStatusFilter('all')
                        setFiltersExpanded(false)
                      } else {
                        setSearchQuery('')
                        setItemsStatusFilter('errors')
                        setFiltersExpanded(true)
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
                        <thead className="sticky top-0 bg-gray-50 dark:bg-gray-600 z-10">
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
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
                  <div 
                    className="flex items-center justify-between mb-4 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => {
                      if (itemsStatusFilter === 'warnings' && !searchQuery) {
                        setItemsStatusFilter('all')
                        setFiltersExpanded(false)
                      } else {
                        setSearchQuery('')
                        setItemsStatusFilter('warnings')
                        setFiltersExpanded(true)
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
                        <thead className="sticky top-0 bg-gray-50 dark:bg-gray-600 z-10">
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
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
                  <div 
                    className="flex items-center justify-between mb-4 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => {
                      if (itemsStatusFilter === 'pending' && !searchQuery) {
                        setItemsStatusFilter('all')
                        setFiltersExpanded(false)
                      } else {
                        setSearchQuery('')
                        setItemsStatusFilter('pending')
                        setFiltersExpanded(true)
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
                        <thead className="sticky top-0 bg-gray-50 dark:bg-gray-600 z-10">
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
            {/* Only show when items status filter is 'all' (not filtering by errors/warnings/pending) */}
            {itemsStatusFilter === 'all' && (
            <div className={`px-6 py-4 grid grid-cols-1 gap-6 ${
              hasMunkiInstalls && hasCimianInstalls 
                ? 'lg:grid-cols-4' 
                : hasMunkiInstalls || hasCimianInstalls 
                  ? 'lg:grid-cols-3' 
                  : 'lg:grid-cols-2'
            }`}>
              
              {/* First Column: Software Repo Widget */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
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
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
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
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
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
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
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
              )}

          </div>

          {/* Status Overview Cards - Show only when report generated */}
          {installs.length > 0 && (
            <div className="px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              
              {/* Version Distribution Charts - Separate box per unique item name */}
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Install Item(s) Versions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {(() => {
                  // Group installs by unique item name first
                  const managedInstalls = installs.filter(install => install.source === 'cimian' || install.source === 'munki')
                  const itemsByName: Record<string, { versions: Record<string, number>; total: number }> = {}
                  
                  managedInstalls.forEach(install => {
                    const itemName = install.name
                    const version = install.version || 'Unknown'
                    
                    if (!itemsByName[itemName]) {
                      itemsByName[itemName] = { versions: {}, total: 0 }
                    }
                    if (!itemsByName[itemName].versions[version]) {
                      itemsByName[itemName].versions[version] = 0
                    }
                    itemsByName[itemName].versions[version]++
                    itemsByName[itemName].total++
                  })
                  
                  // Sort items by total count (most devices first)
                  return Object.entries(itemsByName)
                    .sort(([,a], [,b]) => b.total - a.total)
                    .map(([itemName, data]) => {
                      const sortedVersions = Object.entries(data.versions)
                        .sort(([vA,], [vB,]) => vB.localeCompare(vA, undefined, { numeric: true, sensitivity: 'base' }))
                      
                      return (
                        <div 
                          key={itemName} 
                          className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate" title={itemName}>
                              {itemName}
                            </h4>
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 whitespace-nowrap">
                              {data.total} device{data.total !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="space-y-2">
                            {sortedVersions.map(([version, count]) => {
                              const percentage = Math.round((count / data.total) * 100)
                              const searchKey = `${itemName} - ${version}`
                              const isSelected = searchQuery === searchKey
                              return (
                                <div 
                                  key={version}
                                  className={`cursor-pointer p-2 rounded transition-colors ${
                                    isSelected 
                                      ? 'bg-emerald-50 dark:bg-emerald-900/20 ring-1 ring-emerald-500' 
                                      : 'hover:bg-gray-100 dark:hover:bg-gray-600'
                                  }`}
                                  onClick={() => setSearchQuery(isSelected ? '' : searchKey)}
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <span className={`text-xs font-medium ${
                                      isSelected ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-700 dark:text-gray-300'
                                    }`}>
                                      v{version}
                                    </span>
                                    <span className={`text-xs ${
                                      isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'
                                    }`}>
                                      {count} ({percentage}%)
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 dark:bg-gray-500 rounded-full h-1.5">
                                    <div 
                                      className="bg-emerald-600 h-1.5 rounded-full transition-all duration-300" 
                                      style={{ width: `${percentage}%` }}
                                    ></div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })
                })()}
                {installs.filter(i => i.source === 'cimian' || i.source === 'munki').length === 0 && (
                  <div className="col-span-full text-center py-4 text-gray-500 dark:text-gray-400">
                    No install items found
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Filters Accordion - Hide when in generate report mode since items are already expanded */}
          {!filtersLoading && !isGeneratingReport && (
            <div className={filtersExpanded || (hasGeneratedReport && installs.length > 0) ? '' : 'border-b border-gray-200 dark:border-gray-700'}>
              {/* Accordion Header */}
              <button
                onClick={() => setFiltersExpanded(!filtersExpanded)}
                className="w-full px-6 py-3 flex items-center justify-between bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Filters
                  </span>
                  {(selectedInstalls.length > 0 || selectedUsages.length > 0 || selectedCatalogs.length > 0 || selectedRooms.length > 0 || selectedFleets.length > 0 || selectedPlatforms.length > 0) && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                      {selectedInstalls.length + selectedUsages.length + selectedCatalogs.length + selectedRooms.length + selectedFleets.length + selectedPlatforms.length} active
                    </span>
                  )}
                </div>
                <svg 
                  className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${filtersExpanded ? 'rotate-90' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}

          {/* Filter Clouds Section - Show when expanded OR in generate report mode */}
          {!filtersLoading && (filtersExpanded || isGeneratingReport) && (
            <div className={`px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 ${isGeneratingReport && !loading && installs.length === 0 && !hasGeneratedReport ? 'rounded-b-xl' : ''}`}>
              <div className="space-y-4">

                {/* Items Filter Cloud - Show when in Generate Report mode - ABOVE inventory filters */}
                {isGeneratingReport && (filterOptions.managedInstalls?.length > 0 || filterOptions.otherInstalls?.length > 0) && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Items {selectedInstalls.length > 0 && `(${selectedInstalls.length} selected)`}
                    </h3>
                    {selectedInstalls.length > 0 && (
                      <button
                        onClick={() => setSelectedInstalls([])}
                        className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        Clear selection
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[...(filterOptions.managedInstalls || []), ...(filterOptions.otherInstalls || [])]
                      .filter(install => install.toLowerCase().includes(searchQuery.toLowerCase()))
                      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
                      .map(install => (
                        <button
                          key={install}
                          onClick={() => toggleInstall(install)}
                          className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                            selectedInstalls.includes(install)
                              ? 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-200 dark:border-green-600'
                              : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-500'
                          }`}
                        >
                          {install}
                        </button>
                      ))}
                  </div>
                </div>
                )}

                {/* Inventory Filter Sections - Show from report data when report exists, otherwise from all data */}
                {(() => {
                  // Use report-specific filters when report is generated, otherwise use all filter options
                  // Show filters when: has report data, OR is generating report, OR is in config report mode
                  if (installs.length === 0 && !isGeneratingReport && !isConfigReport) return null
                  
                  const activeFilters = installs.length > 0 ? reportFilterOptions : filterOptions
                  const hasAnyFilter = (activeFilters.usages?.length > 0) ||
                    (activeFilters.catalogs?.length > 0) ||
                    (activeFilters.fleets?.length > 0) ||
                    (activeFilters.platforms?.length > 0)
                  
                  if (!hasAnyFilter) return null
                  
                  return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  
                  {/* Usage Filter - Only show if data exists */}
                  {activeFilters.usages && activeFilters.usages.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Usage {selectedUsages.length > 0 && `(${selectedUsages.length} selected)`}
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {activeFilters.usages.map((usage: string) => (
                        <button
                          key={usage}
                          onClick={() => toggleUsage(usage)}
                          className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
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
                  {activeFilters.catalogs && activeFilters.catalogs.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Catalog {selectedCatalogs.length > 0 && `(${selectedCatalogs.length} selected)`}
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {activeFilters.catalogs.map((catalog: string) => (
                        <button
                          key={catalog}
                          onClick={() => toggleCatalog(catalog)}
                          className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
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
                  {activeFilters.fleets && activeFilters.fleets.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Fleet {selectedFleets.length > 0 && `(${selectedFleets.length} selected)`}
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {activeFilters.fleets.map((fleet: string) => (
                        <button
                          key={fleet}
                          onClick={() => toggleFleet(fleet)}
                          className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
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
                  {activeFilters.platforms && activeFilters.platforms.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Platform {selectedPlatforms.length > 0 && `(${selectedPlatforms.length} selected)`}
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {activeFilters.platforms.map((platform: string) => (
                        <button
                          key={platform}
                          onClick={() => togglePlatform(platform)}
                          className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
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
                  )
                })()}

                {/* Locations Filter Cloud - Only show if report data exists AND has locations */}
                {(() => {
                  // Only show locations when there's report data
                  if (installs.length === 0 && !isGeneratingReport) return null
                  
                  const activeRooms = installs.length > 0 ? reportFilterOptions.rooms : filterOptions.rooms
                  const filteredRooms = activeRooms?.filter((room: string) => room.toLowerCase().includes(searchQuery.toLowerCase())) || []
                  
                  if (filteredRooms.length === 0) return null
                  
                  return (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Locations {selectedRooms.length > 0 && `(${selectedRooms.length} selected)`}
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-1">
                      {filteredRooms.map((room: string) => (
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
                  )
                })()}

                {/* Device Status and Install Status Filters - Only show after report is generated */}
                {!isGeneratingReport && (installs.length > 0 || (isConfigReport && configReportData.length > 0)) && (
                <div className="flex flex-col md:flex-row gap-8 pt-4">
                  {/* Device Status Filter */}
                  <div className="pb-2">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Device Status
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      <button
                        onClick={() => setDeviceStatusFilter(deviceStatusFilter === 'active' ? 'all' : 'active')}
                        className={`px-3 py-1.5 text-xs rounded-full border transition-colors flex items-center gap-1.5 ${
                          deviceStatusFilter === 'active'
                            ? 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-200 dark:border-green-600'
                            : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-500'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        Active ({deviceStatusCounts.active})
                      </button>
                      <button
                        onClick={() => setDeviceStatusFilter(deviceStatusFilter === 'stale' ? 'all' : 'stale')}
                        className={`px-3 py-1.5 text-xs rounded-full border transition-colors flex items-center gap-1.5 ${
                          deviceStatusFilter === 'stale'
                            ? 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-600'
                            : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-500'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                        Stale ({deviceStatusCounts.stale})
                      </button>
                      <button
                        onClick={() => setDeviceStatusFilter(deviceStatusFilter === 'missing' ? 'all' : 'missing')}
                        className={`px-3 py-1.5 text-xs rounded-full border transition-colors flex items-center gap-1.5 ${
                          deviceStatusFilter === 'missing'
                            ? 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-200 dark:border-red-600'
                            : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-500'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        Missing ({deviceStatusCounts.missing})
                      </button>
                    </div>
                  </div>

                  {/* Install Status Filter - Hide when items widget filter (errors/warnings/pending) is active */}
                  {itemsStatusFilter === 'all' && (
                  <div className="pb-2">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Install Status
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      <button
                        onClick={() => setInstallStatusFilter(installStatusFilter === 'installed' ? 'all' : 'installed')}
                        className={`px-3 py-1.5 text-xs rounded-full border transition-colors flex items-center gap-1.5 ${
                          installStatusFilter === 'installed'
                            ? 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-200 dark:border-green-600'
                            : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-500'
                        }`}
                      >
                        <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Installed ({installStatusCounts.installed})
                      </button>
                      <button
                        onClick={() => setInstallStatusFilter(installStatusFilter === 'pending' ? 'all' : 'pending')}
                        className={`px-3 py-1.5 text-xs rounded-full border transition-colors flex items-center gap-1.5 ${
                          installStatusFilter === 'pending'
                            ? 'bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-900 dark:text-cyan-200 dark:border-cyan-600'
                            : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-500'
                        }`}
                      >
                        <svg className="w-3 h-3 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Pending ({installStatusCounts.pending})
                      </button>
                      <button
                        onClick={() => setInstallStatusFilter(installStatusFilter === 'warnings' ? 'all' : 'warnings')}
                        className={`px-3 py-1.5 text-xs rounded-full border transition-colors flex items-center gap-1.5 ${
                          installStatusFilter === 'warnings'
                            ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900 dark:text-amber-200 dark:border-amber-600'
                            : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-500'
                        }`}
                      >
                        <svg className="w-3 h-3 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Warnings ({installStatusCounts.warnings})
                      </button>
                      <button
                        onClick={() => setInstallStatusFilter(installStatusFilter === 'errors' ? 'all' : 'errors')}
                        className={`px-3 py-1.5 text-xs rounded-full border transition-colors flex items-center gap-1.5 ${
                          installStatusFilter === 'errors'
                            ? 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-200 dark:border-red-600'
                            : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-500'
                        }`}
                      >
                        <svg className="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Errors ({installStatusCounts.errors})
                      </button>
                      <button
                        onClick={() => setInstallStatusFilter(installStatusFilter === 'removed' ? 'all' : 'removed')}
                        className={`px-3 py-1.5 text-xs rounded-full border transition-colors flex items-center gap-1.5 ${
                          installStatusFilter === 'removed'
                            ? 'bg-gray-200 text-gray-800 border-gray-400 dark:bg-gray-600 dark:text-gray-200 dark:border-gray-500'
                            : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-500'
                        }`}
                      >
                        <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Removed ({installStatusCounts.removed})
                      </button>
                    </div>
                  </div>
                  )}
                </div>
                )}

              </div>
            </div>
          )}

          {/* Search Input - Below Filters, connected to the table */}
          {!filtersLoading && (
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-md">
                  <input
                    type="text"
                    placeholder="Search installs, devices, versions..."
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
                {/* Clear Filter(s) Button - Show when any filter is active */}
                {(searchQuery || itemsStatusFilter !== 'all' || deviceStatusFilter !== 'all' || installStatusFilter !== 'all' || selectedUsages.length > 0 || selectedCatalogs.length > 0 || selectedFleets.length > 0 || selectedPlatforms.length > 0 || selectedRooms.length > 0 || selectedManifest || selectedSoftwareRepo || selectedMunkiVersion || selectedCimianVersion) && (
                  <button
                    onClick={() => {
                      setItemsStatusFilter('all')
                      setDeviceStatusFilter('all')
                      setInstallStatusFilter('all')
                      setSearchQuery('')
                      clearAllFilters()
                      setSelectedManifest('')
                      setSelectedSoftwareRepo('')
                      setSelectedMunkiVersion('')
                      setSelectedCimianVersion('')
                    }}
                    className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Clear Filter(s)
                  </button>
                )}
                {/* Reset Report Button - Only show for generated reports when NO widget filters are active */}
                {hasGeneratedReport && installs.length > 0 && !loading && itemsStatusFilter === 'all' && !selectedManifest && !selectedSoftwareRepo && !selectedMunkiVersion && !selectedCimianVersion && (
                  <button
                    onClick={handleResetReport}
                    className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white text-sm rounded-lg transition-colors whitespace-nowrap font-medium flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Reset Report
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Report Generation Loading State */}
          {loading && (
            <div className="px-6 py-8 bg-white dark:bg-gray-800 rounded-b-xl">
              <div className="max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {loadingMessage}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {Math.round(reportProgress)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${reportProgress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Processing {selectedInstalls.length} item{selectedInstalls.length !== 1 ? 's' : ''} across {filterOptions.devicesWithData || 'all'} devices
                </p>
              </div>
            </div>
          )}

          {/* No Results Message - Show when report generated but no results */}
          {!loading && hasGeneratedReport && installs.length === 0 && !isConfigReport && (
            <div className="px-6 py-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 20a8 8 0 100-16 8 8 0 000 16z" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No install records found</h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                No devices have the selected items installed. Try selecting different items or adjusting your filters.
              </p>
              <button
                onClick={() => {
                  // Go back to generate report mode with filters expanded
                  setHasGeneratedReport(false)
                  setIsGeneratingReport(true)
                  setFiltersExpanded(true)
                  setItemsStatusFilter('all') // Reset items status filter
                  setSearchQuery('') // Clear search box
                }}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
              >
                Try different items
              </button>
            </div>
          )}

          {/* Results Section - Regular Installs Table */}
          {installs.length > 0 && !isConfigReport && (
            <div className="overflow-hidden rounded-b-xl">
              <div className="overflow-x-auto max-h-[calc(100vh-280px)] overflow-y-auto">
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
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            : install.status === 'error' || install.status === 'failed'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            : install.status === 'warning'
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
            </div>
          )}

          {/* Config Report Table - Default View - Hide when items filter is active or in generate report mode */}
          {!isGeneratingReport && filteredConfigData.length > 0 && isConfigReport && itemsStatusFilter === 'all' && (
            <div className="overflow-x-auto max-h-[calc(100vh-280px)] overflow-y-auto rounded-b-xl">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
                  <tr>
                    <th 
                      onClick={() => handleSort('deviceName')}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Device {sortColumn === 'deviceName' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      onClick={() => handleSort('totalPackagesManaged')}
                      className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      # {sortColumn === 'totalPackagesManaged' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      onClick={() => handleSort('installedCount')}
                      className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                      title="Installed"
                    >
                      <svg className="w-4 h-4 mx-auto text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </th>
                    <th 
                      onClick={() => handleSort('pendingCount')}
                      className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                      title="Pending"
                    >
                      <svg className="w-4 h-4 mx-auto text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </th>
                    <th 
                      onClick={() => handleSort('errorCount')}
                      className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                      title="Errors"
                    >
                      <svg className="w-4 h-4 mx-auto text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </th>
                    <th 
                      onClick={() => handleSort('warningCount')}
                      className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                      title="Warnings"
                    >
                      <svg className="w-4 h-4 mx-auto text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </th>
                    <th 
                      onClick={() => handleSort('removedCount')}
                      className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                      title="Removed"
                    >
                      <svg className="w-4 h-4 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </th>
                    <th 
                      onClick={() => handleSort('clientIdentifier')}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Manifest / Repo {sortColumn === 'clientIdentifier' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      onClick={() => handleSort('lastSeen')}
                      className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Last Seen {sortColumn === 'lastSeen' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      onClick={() => handleSort('version')}
                      className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Version {sortColumn === 'version' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredConfigData.map((device) => (
                    <tr key={device.deviceId} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <Link 
                            href={`/device/${device.serialNumber}`}
                            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {device.deviceName}
                          </Link>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {device.serialNumber}
                            {device.assetTag && <span className="ml-2 text-gray-400">• {device.assetTag}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-center">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{device.totalPackagesManaged}</div>
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-center">
                        {device.installedCount > 0 ? (
                          <span className="text-sm font-medium text-green-600 dark:text-green-400">{device.installedCount}</span>
                        ) : (
                          <span className="text-sm text-gray-300 dark:text-gray-600">-</span>
                        )}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-center">
                        {device.pendingCount > 0 ? (
                          <span className="text-sm font-medium text-cyan-600 dark:text-cyan-400">{device.pendingCount}</span>
                        ) : (
                          <span className="text-sm text-gray-300 dark:text-gray-600">-</span>
                        )}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-center">
                        {device.errorCount > 0 ? (
                          <span className="text-sm font-medium text-red-600 dark:text-red-400">{device.errorCount}</span>
                        ) : (
                          <span className="text-sm text-gray-300 dark:text-gray-600">-</span>
                        )}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-center">
                        {device.warningCount > 0 ? (
                          <span className="text-sm font-medium text-amber-600 dark:text-amber-400">{device.warningCount}</span>
                        ) : (
                          <span className="text-sm text-gray-300 dark:text-gray-600">-</span>
                        )}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-center">
                        {device.removedCount > 0 ? (
                          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{device.removedCount}</span>
                        ) : (
                          <span className="text-sm text-gray-300 dark:text-gray-600">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <div className="text-sm text-gray-900 dark:text-white font-mono truncate max-w-[280px]" title={device.clientIdentifier}>
                            {device.clientIdentifier}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate max-w-[280px]" title={device.softwareRepoUrl}>
                            {device.softwareRepoUrl}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">{formatRelativeTime(device.lastSeen)}</div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">{device.version}</div>
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
            <div className="bg-white dark:bg-gray-800 rounded-b-xl overflow-hidden">
              <div className="px-6 py-4">
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
              <div className="overflow-x-auto max-h-[calc(100vh-280px)] overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Device
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {itemsStatusFilter === 'errors' ? 'Failed Packages' : itemsStatusFilter === 'warnings' ? 'Warning Packages' : 'Pending Packages'}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Manifest / Repo
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Last Seen
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
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
                          <td className="px-4 py-3">
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
                          <td className="px-4 py-3">
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
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                              <div className="text-sm text-gray-900 dark:text-white font-mono truncate max-w-[200px]" title={device.modules?.installs?.cimian?.config?.ClientIdentifier || device.modules?.installs?.munki?.config?.ClientIdentifier || '-'}>
                                {device.modules?.installs?.cimian?.config?.ClientIdentifier || device.modules?.installs?.munki?.config?.ClientIdentifier || '-'}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate max-w-[200px]" title={device.modules?.installs?.cimian?.config?.SoftwareRepoURL || device.modules?.installs?.munki?.config?.SoftwareRepoURL || ''}>
                                {device.modules?.installs?.cimian?.config?.SoftwareRepoURL || device.modules?.installs?.munki?.config?.SoftwareRepoURL || ''}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {formatRelativeTime(device.lastSeen)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
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
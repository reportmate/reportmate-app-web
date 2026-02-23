"use client"

// Force dynamic rendering and disable caching for applications page
export const dynamic = 'force-dynamic'

import { useEffect, useState, Suspense, useMemo } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { formatRelativeTime } from "../../../src/lib/time"
import { PlatformBadge } from '../../../src/components/ui/PlatformBadge'
import { usePlatformFilterSafe } from '../../../src/providers/PlatformFilterProvider'
import { CollapsibleSection } from '../../../src/components/ui/CollapsibleSection'
import { useScrollCollapse } from '../../../src/hooks/useScrollCollapse'

interface ApplicationItem {
  id: string
  deviceId: string
  deviceName: string
  serialNumber: string
  lastSeen: string
  collectedAt: string
  // Application-specific fields
  name: string
  version: string
  vendor: string
  publisher: string
  category: string
  installDate?: string
  size?: number
  path?: string
  architecture: string
  bundleId?: string
  // Device inventory fields for filtering
  usage?: string
  catalog?: string
  location?: string
  room?: string
  fleet?: string
  assetTag?: string
  platform?: string
  raw?: any
}

// Utilization-specific interfaces
interface UtilizationApp {
  name: string
  totalSeconds: number
  totalHours: number
  launchCount: number
  deviceCount: number
  userCount: number
  lastUsed: string | null
  firstUsed: string | null
  devices: string[]
  users: string[]
  isSingleUser: boolean
}

interface TopUser {
  username: string
  totalSeconds: number
  totalHours: number
  launchCount: number
  appsUsed: number
  devicesUsed: number
}

interface SingleUserApp {
  name: string
  totalHours: number
}

interface UnusedApp {
  name: string
  deviceCount: number
  daysSinceUsed: number
}

interface UtilizationSummary {
  totalAppsTracked: number
  totalUsageHours: number
  totalLaunches: number
  uniqueUsers: number
  uniqueDevices: number
  singleUserAppCount: number
  unusedAppCount: number
}

// Version distribution data structure from API
interface VersionDevice {
  serialNumber: string
  deviceName: string
  location: string | null
  catalog: string | null
  lastSeen: string | null
}

interface VersionInfo {
  count: number
  devices: VersionDevice[]
}

interface AppVersionDistribution {
  versions: { [version: string]: VersionInfo }
  totalDevices: number
}

interface VersionDistribution {
  [appName: string]: AppVersionDistribution
}

interface UtilizationData {
  status: string
  applications: UtilizationApp[]
  topUsers: TopUser[]
  singleUserApps: SingleUserApp[]
  unusedApps: UnusedApp[]
  versionDistribution?: VersionDistribution
  summary: UtilizationSummary
  filters: {
    days: number
    applicationNames: string[]
    usages: string[]
    catalogs: string[]
    locations: string[]
    minHours: number | null
    minLaunches: number | null
  }
  lastUpdated: string
}

interface FilterOptions {
  applicationNames: string[]
  usages: string[]
  catalogs: string[]
  rooms: string[]
  fleets: string[]
  locations: string[]
  devicesWithData: number
}

interface VersionAnalysis {
  [appName: string]: {
    [version: string]: number
  }
}

// Format duration from seconds to human readable
function formatDuration(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return '0m'
  
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  
  if (hours === 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}

// Ultra-robust application name normalization based on real-world data patterns
function normalizeAppName(appName: string): string {
  if (!appName || typeof appName !== 'string') return ''
  
  let normalized = appName.trim()
  if (!normalized) return ''
  
  // Step 1: Remove placeholder/junk entries
  if (normalized.includes('${{') || normalized.includes('}}')) return ''
  if (normalized === 'Unknown' || normalized === 'N/A') return ''
  
  // Step 2: Handle specific product lines first (before generic patterns)
  
  // Microsoft Visual C++ Redistributables - consolidate all versions
  if (normalized.match(/Microsoft Visual C\+\+ \d{4}/i)) {
    return 'Microsoft Visual C++ Redistributable'
  }
  
  // Microsoft .NET components - aggressive consolidation
  if (normalized.startsWith('Microsoft.NET') || normalized.includes('Microsoft ASP.NET Core')) {
    if (normalized.includes('Workload')) return 'Microsoft .NET Workload'
    if (normalized.includes('Sdk') || normalized.includes('SDK')) return 'Microsoft .NET SDK'
    if (normalized.includes('ASP.NET Core')) return 'Microsoft ASP.NET Core'
    if (normalized.includes('Runtime') || normalized.includes('AppHost') || 
        normalized.includes('Targeting Pack') || normalized.includes('Host FX Resolver')) {
      return 'Microsoft .NET Runtime'
    }
    return 'Microsoft .NET'
  }
  
  // Microsoft Visual Studio Tools
  if (normalized.includes('Microsoft Visual Studio Tools')) {
    return 'Microsoft Visual Studio Tools'
  }
  
  // Office 365 / Microsoft 365
  if (normalized.match(/Microsoft (365|Office 365)/i)) {
    return 'Microsoft 365'
  }
  
  // Kinect Language Packs - consolidate all language variants
  if (normalized.match(/Kinect for Windows Speech Recognition Language Pack/i)) {
    return 'Kinect for Windows Speech Recognition Language Pack'
  }
  
  // Microsoft Language Packs (general pattern)
  if (normalized.match(/Microsoft.*Language Pack/i)) {
    return 'Microsoft Language Pack'
  }
  
  // Kits Configuration Installer
  if (normalized.match(/Kits Configuration Installer/i)) {
    return 'Kits Configuration Installer'
  }
  
  // VRS/VR related software
  if (normalized.match(/Kofax VRS/i)) {
    return 'Kofax VRS'
  }
  
  // Adobe products - normalize across versions
  if (normalized.startsWith('Adobe ')) {
    const product = normalized.match(/Adobe ([A-Za-z\s]+)/)?.[1]?.split(/\s+/)[0]
    if (product && product !== 'AIR') return `Adobe ${product}`
  }
  
  // 7-Zip versions - consolidate all versions
  if (normalized.match(/^7-Zip/i)) {
    return '7-Zip'
  }
  
  // Chrome versions
  if (normalized.match(/Google Chrome|Chrome/i)) {
    return 'Google Chrome'
  }
  
  // Firefox versions
  if (normalized.match(/Mozilla Firefox|Firefox/i)) {
    return 'Mozilla Firefox'
  }
  
  // AMD components
  if (normalized.startsWith('AMD ') && (normalized.includes('Driver') || normalized.includes('Chipset'))) {
    if (normalized.includes('Chipset')) return 'AMD Chipset Software'
    return 'AMD Drivers'
  }
  
  // SOLIDWORKS components
  if (normalized.includes('SOLIDWORKS')) {
    if (normalized.includes('3DEXPERIENCE')) return '3DEXPERIENCE for SOLIDWORKS'
    return 'SOLIDWORKS'
  }
  
  // HP components
  if (normalized.startsWith('HP ') || normalized.includes('HP ')) {
    return 'HP Software'
  }
  
  // Step 3: Generic version number removal (more aggressive)
  
  // Remove version numbers at the end
  normalized = normalized
    // Version patterns: 1.2.3, v1.2, 2024, 2024.1, 20.5.278, etc.
    .replace(/\s+v?\d+(\.\d+)*(\.\d+)*(\.\d+)*$/i, '')
    .replace(/\s+\d{4}(\.\d+)*$/i, '') // Year versions
    .replace(/\s+-\s+\d+(\.\d+)*$/i, '') // Dash versions
    .replace(/\s+\(\d+(\.\d+)*(\.\d+)*\)$/i, '') // Parentheses versions
    .replace(/\s+build\s+\d+/i, '') // Build numbers
    .replace(/\s+\d+(\.\d+)*(\.\d+)*(\.\d+)*$/i, '') // Direct versions
    
  // Remove version patterns in the middle (more aggressive)
  normalized = normalized
    .replace(/\s+\d{4}\.\d{2}-\d+/i, '') // Anaconda-style versions: 2025.06-0
    .replace(/\s+\d{1,2}\.\d+\.\d+/i, '') // Standard versions: 10.3.1.3
    .replace(/\s+\d{4}/i, '') // Year versions in middle
    .replace(/\s+v\d+(\.\d+)*/i, '') // v-prefixed versions
  
  // Step 4: Remove architecture and platform info (more aggressive)
  normalized = normalized
    .replace(/\s+(x64|x86|64-bit|32-bit|amd64|i386)$/i, '')
    .replace(/\s+\((x64|x86|64-bit|32-bit|amd64|i386)\)$/i, '')
    .replace(/\s+\(Python\s+[\d\.]+\s+(64-bit|32-bit)\)$/i, '')
    .replace(/\s+\(git\s+[a-f0-9]+\)$/i, '') // Git commit hashes
    .replace(/\s+\([^)]*bit[^)]*\)/i, '') // Any parentheses with "bit"
    .replace(/\s+\([^)]*\d+\.\d+\.\d+[^)]*\)/i, '') // Any parentheses with version numbers
  
  // Step 5: Remove Microsoft-specific runtime suffixes
  normalized = normalized
    .replace(/\s+(Additional Runtime|Minimum Runtime|Redistributable|Shared Framework|Targeting Pack|AppHost Pack|Host FX Resolver|Hosting Support)$/i, '')
    .replace(/\s+-\s+(en-us|x64|x86|\d+(\.\d+)*)$/i, '') // Language codes and versions with dashes
  
  // Step 6: Remove common application suffixes
  normalized = normalized
    .replace(/\s+(Desktop|App|Application|Software|Program|Tool|Suite|Client|Server)$/i, '')
    .replace(/\s+(Pro|Professional|Standard|Basic|Free|Premium|Enterprise|Business|Personal|Home|Student|Education)$/i, '')
    .replace(/\s+(Trial|Beta|Alpha|RC|Release|Final|Portable|Standalone)$/i, '')
  
  // Step 7: Remove update/version info in the middle
  normalized = normalized
    .replace(/\s+Update\s+\d+/i, '') // "Update 1", "Update 2024", etc.
    .replace(/\s+SP\d+/i, '') // Service packs
    .replace(/\s+Patch\s+\d+/i, '') // Patches
  
  // Step 8: Handle specific patterns
  
  // Remove language indicators
  normalized = normalized.replace(/\s+-\s+en-us$/i, '')
  
  // Clean up common words that add no value
  normalized = normalized
    .replace(/\s+for\s+Windows$/i, '')
    .replace(/\s+for\s+Microsoft\s+Windows$/i, '')
    .replace(/\s+Windows\s+Edition$/i, '')
  
  // Step 9: Final cleanup
  normalized = normalized
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/\s*-\s*$/, '') // Remove trailing dashes
    .replace(/^\s*-\s*/, '') // Remove leading dashes
    .trim()
    .replace(/\s+$/, '') // Remove trailing space
    .replace(/^\s+/, '') // Remove leading space
  
  // Step 10: Handle empty results
  if (!normalized || normalized.length < 2) return ''
  
  return normalized
}

// Filter function to exclude junk/system applications (more aggressive)
function shouldIncludeApplication(appName: string): boolean {
  if (!appName || typeof appName !== 'string') return false
  
  const trimmed = appName.trim()
  if (!trimmed) return false
  
  // Exclude placeholder entries
  if (trimmed.includes('${{') || trimmed.includes('}}')) return false
  if (trimmed === 'Unknown' || trimmed === 'N/A') return false
  
  // Exclude system/development noise (but keep user-facing apps)
  const excludePatterns = [
    // Microsoft development components
    /^Microsoft\.NET\.Workload\./i,
    /^Microsoft\.NET\.Sdk\./i,
    /^Windows Software Development Kit/i,
    /^Microsoft Visual Studio Installer$/i,
    
    // Windows system updates (keep main apps but exclude patches)
    /Update for Windows/i,
    /Security Update for Microsoft/i,
    /^KB\d+/i, // Windows KB updates
    
    // System components and installers
    /^64 Bit HP CIO Components Installer/i,
    /^1394 OHCI Compliant Host Controller/i,
    
    // AVG system components
    /^AVG.*Helper$/i,
    /^AVG.*Browser$/i,
    
    // AVerMedia components (keep main app, exclude technical components)
    /^AVerMedia.*HD Series/i,
    /^AVerMedia RECentral$/i, // This might be the main app, so be careful
    
    // Development tools (unless they're major IDEs)
    /Microsoft Visual C\+\+ \d{4} x\d{2} (Additional|Minimum) Runtime/i,
    /Microsoft .NET (Runtime|AppHost Pack|Targeting Pack|Host FX Resolver) - [\d\.]+ \(x\d+/i,
    /Microsoft ASP.NET Core [\d\.]+ (Shared Framework|Targeting Pack) \(x\d+/i,
    
    // Empty or placeholder entries
    /^\$\{\{.*\}\}$/i,
    /^Unknown$/i,
    /^N\/A$/i,
    /^\s*$/
  ]
  
  return !excludePatterns.some(pattern => pattern.test(trimmed))
}

function ApplicationsPageContent() {
  const [applications, setApplications] = useState<ApplicationItem[]>([])
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    applicationNames: [],
    usages: [],
    catalogs: [],
    rooms: [],
    fleets: [],
    locations: [],
    devicesWithData: 0
  })
  const [loading, setLoading] = useState(false)
  const [filtersLoading, setFiltersLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 })
  const [loadingMessage, setLoadingMessage] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [filtersExpanded, setFiltersExpanded] = useState(true)
  const [widgetsExpanded, setWidgetsExpanded] = useState(false)

  const { tableContainerRef, effectiveFiltersExpanded, effectiveWidgetsExpanded } = useScrollCollapse(
    { filters: filtersExpanded, widgets: widgetsExpanded },
    { enabled: !loading }
  )
  const [sortColumn, setSortColumn] = useState<'device' | 'application' | 'version' | 'vendor' | 'usage' | 'catalog' | 'location'>('device')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const { platformFilter, isPlatformVisible } = usePlatformFilterSafe()
  
  // Utilization report state (unified report - includes both inventory and usage data)
  const [utilizationData, setUtilizationData] = useState<UtilizationData | null>(null)
  const [utilizationDays, setUtilizationDays] = useState<number>(30)
  const [utilizationSortColumn, setUtilizationSortColumn] = useState<'name' | 'totalHours' | 'launchCount' | 'deviceCount' | 'userCount' | 'lastUsed'>('totalHours')
  const [utilizationSortDirection, setUtilizationSortDirection] = useState<'asc' | 'desc'>('desc')
  
  // Report type: 'usage' for full usage analytics, 'versions' for version distribution only
  const [reportType, setReportType] = useState<'usage' | 'versions' | null>(null)
  
  // Report mode: 'has' shows devices WITH the app, 'missing' shows devices WITHOUT
  const [reportMode, setReportMode] = useState<'has' | 'missing'>('has')
  
  // All devices from filters API (for computing missing devices)
  const [allDevices, setAllDevices] = useState<Array<{
    serialNumber: string
    name: string
    usage?: string
    catalog?: string
    location?: string
    room?: string
  }>>([])
  
  // Device table sorting state (for version distribution device list)
  const [deviceTableSortColumn, setDeviceTableSortColumn] = useState<'deviceName' | 'serialNumber' | 'application' | 'version' | 'location' | 'catalog' | 'lastSeen'>('deviceName')
  const [deviceTableSortDirection, setDeviceTableSortDirection] = useState<'asc' | 'desc'>('asc')
  
  // Missing devices table sorting state
  const [missingTableSortColumn, setMissingTableSortColumn] = useState<'deviceName' | 'serialNumber' | 'location' | 'catalog'>('deviceName')
  const [missingTableSortDirection, setMissingTableSortDirection] = useState<'asc' | 'desc'>('asc')
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedApplications, setSelectedApplications] = useState<string[]>([])
  const [selectedUsages, setSelectedUsages] = useState<string[]>([])
  const [selectedCatalogs, setSelectedCatalogs] = useState<string[]>([])
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [selectedRooms, setSelectedRooms] = useState<string[]>([])
  const [selectedFleets, setSelectedFleets] = useState<string[]>([])
  const [selectedVersions, setSelectedVersions] = useState<string[]>([])
  
  // Track last applied filters to detect changes
  const [lastAppliedFilters, setLastAppliedFilters] = useState<string>('')
  
  const searchParams = useSearchParams()

  // Initialize search query and filters from URL parameters
  useEffect(() => {
    try {
      const urlSearch = searchParams.get('search')
      if (urlSearch) {
        setSearchQuery(urlSearch)
      }
      
      const urlApp = searchParams.get('application')
      if (urlApp) {
        setSelectedApplications([urlApp])
      }

      const urlUsage = searchParams.get('usage')
      if (urlUsage && ['assigned', 'shared'].includes(urlUsage.toLowerCase())) {
        setSelectedUsages([urlUsage.toLowerCase()])
      }

      const urlCatalog = searchParams.get('catalog')
      if (urlCatalog && ['curriculum', 'staff', 'faculty', 'kiosk'].includes(urlCatalog.toLowerCase())) {
        setSelectedCatalogs([urlCatalog.toLowerCase()])
      }

      const urlRoom = searchParams.get('room')
      if (urlRoom) {
        setSelectedRooms([urlRoom])
      }
    } catch (e) {
      console.warn('Failed to get search params:', e)
    }
  }, [searchParams])

  // Load ALL applications data on mount with progressive loading
  useEffect(() => {
    const fetchAllData = async () => {
      let progressInterval: NodeJS.Timeout | null = null
      try {
        setFiltersLoading(true)
        setLoading(true)
        setError(null)
        
        // Check if we have cached data in sessionStorage
        const cachedData = sessionStorage.getItem('applications-all-data')
        const cachedTimestamp = sessionStorage.getItem('applications-all-timestamp')
        const cacheExpiry = 5 * 60 * 1000 // 5 minutes
        
        if (cachedData && cachedTimestamp) {
          const age = Date.now() - parseInt(cachedTimestamp)
          if (age < cacheExpiry) {
                        const data = JSON.parse(cachedData)
            
            setFilterOptions({
              applicationNames: data.applicationNames || [],
              usages: data.usages || [],
              catalogs: data.catalogs || [],
              locations: data.locations || [],
              rooms: data.rooms || [],
              fleets: data.fleets || [],
              devicesWithData: data.devices?.length || 0
            })
            
            // Don't auto-load applications from cache - let user filter first
                        
            setLoadingMessage('Loaded from cache')
            setLoadingProgress({ current: data.devices?.length || 0, total: data.devices?.length || 0 })
            setFiltersLoading(false)
            setLoading(false)
            return
          } else {
                      }
        }
        
        // Show loading state without specific numbers initially
        setLoadingProgress({ current: 0, total: 0 })
        setLoadingMessage('Fetching device count...')
        
        // Fetch actual device count - no hardcoded fallbacks
        let estimatedTotal = 0
        const countResponse = await fetch('/api/devices', {
          cache: 'no-store',
          credentials: 'include',
          headers: { 'Cache-Control': 'no-cache' }
        })
        if (countResponse.ok) {
          const countData = await countResponse.json()
          estimatedTotal = countData.devices?.length || 0
        }
        
        if (estimatedTotal === 0) {
          setError('Unable to fetch device count. Please refresh the page.')
          setLoading(false)
          setFiltersLoading(false)
          return
        }
        
        // Start fetching - progress with actual device count
        let progress = 0
        
        // Sample device serial numbers with realistic app counts for progress messages
        const sampleDevices = [
          { serial: '74J10W2', apps: 143 },
          { serial: '77BQKQ3', apps: 372 },
          { serial: '8073GT3', apps: 361 },
          { serial: '87BQKQ3', apps: 370 },
          { serial: '8LCX9Z2', apps: 105 },
          { serial: '8LD0BZ2', apps: 36 },
          { serial: '8LDW9Z2', apps: 36 },
          { serial: '97BQKQ3', apps: 370 },
          { serial: 'B7BQKQ3', apps: 367 },
          { serial: 'B9DVN23', apps: 96 },
          { serial: 'C5BQKQ3', apps: 318 },
          { serial: 'C7BQKQ3', apps: 345 },
          { serial: 'CT8M0Q2', apps: 327 },
          { serial: 'CT8Q0Q2', apps: 271 },
          { serial: 'CT9Q0Q2', apps: 341 },
          { serial: 'CTBP0Q2', apps: 345 },
          { serial: 'CTDN0Q2', apps: 460 },
          { serial: 'CTDP0Q2', apps: 351 },
          { serial: 'CTDQ0Q2', apps: 342 },
          { serial: 'CTDR0Q2', apps: 342 },
          { serial: 'D1FZFK3', apps: 164 },
          { serial: 'D5BQKQ3', apps: 364 },
          { serial: 'D7C10R3', apps: 190 },
          { serial: 'F5BQKQ3', apps: 151 },
          { serial: 'F7C10R3', apps: 191 },
          { serial: 'G5BQKQ3', apps: 348 },
          { serial: 'H5BQKQ3', apps: 357 },
          { serial: 'J3RDDV2', apps: 220 },
          { serial: 'J5BQKQ3', apps: 362 },
          { serial: 'JRCWCV2', apps: 113 },
          { serial: 'JRD3DV2', apps: 119 },
          { serial: 'JRF7DV2', apps: 78 },
          { serial: 'GD7DPY2', apps: 256 },
          { serial: 'GM0MB0JQ', apps: 40 },
          { serial: 'GM0MB0JS', apps: 74 },
          { serial: 'HVQ0Z93', apps: 21 },
          { serial: 'MJ071W8M', apps: 148 }
        ]
        let deviceIndex = 0
        
        progressInterval = setInterval(() => {
          // Progress quickly to 85%, then slow down dramatically, but keep moving
          if (progress < Math.floor(estimatedTotal * 0.85)) {
            progress += 5 // Fast progress to 85% (0-6 seconds)
            // Show device-specific messages with app counts during processing
            if (deviceIndex < sampleDevices.length) {
              const device = sampleDevices[deviceIndex]
              setLoadingMessage(`Processing ${device.apps} apps from device ${device.serial}`)
              deviceIndex++
            }
          } else if (progress < Math.floor(estimatedTotal * 0.95)) {
            progress += 1 // Medium slow progress from 85% to 95%
            if (deviceIndex < sampleDevices.length) {
              const device = sampleDevices[deviceIndex]
              setLoadingMessage(`Processing ${device.apps} apps from device ${device.serial}`)
              deviceIndex++
            }
          } else if (progress < Math.floor(estimatedTotal * 0.995)) {
            progress += 0.5 // Very slow progress from 95% to 99.5%, keeps moving but never reaches 100%
            if (deviceIndex < sampleDevices.length) {
              const device = sampleDevices[deviceIndex]
              setLoadingMessage(`Processing ${device.apps} apps from device ${device.serial}`)
              deviceIndex++
            }
          }
          setLoadingProgress({ current: Math.floor(progress), total: estimatedTotal })
        }, 200)
        
        const response = await fetch('/api/devices/applications/filters', {
          cache: 'no-store',
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        })
        
        if (!response.ok) {
          console.error('[APPLICATIONS PAGE] Filters API failed:', response.status, response.statusText)
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
        const actualDeviceCount = data.devices?.length || 0
        
        // Use inventory filters directly from API response (already extracted from applications data)
        const usages = data.usages || []
        const catalogs = data.catalogs || []
        const locations = data.locations || []
        const rooms = data.rooms || []
        const fleets = data.fleets || []
        
        
        setFilterOptions({
          applicationNames: data.applicationNames || [],
          usages,
          catalogs,
          locations,
          rooms,
          fleets,
          devicesWithData: actualDeviceCount
        })
        
        // Store all devices for computing missing report
        if (data.devices && Array.isArray(data.devices)) {
          setAllDevices(data.devices.map((d: any) => ({
            serialNumber: d.serialNumber,
            name: d.name || d.serialNumber,
            usage: d.usage,
            catalog: d.catalog,
            location: d.location,
            room: d.room || d.location
          })))
        }
        
        // Set progress to complete and show UI immediately
        setLoadingMessage('Complete!')
        setLoadingProgress({ current: actualDeviceCount, total: actualDeviceCount })
        setFiltersLoading(false)
        setLoading(false)
        
                        
      } catch (error) {
        console.error('[APPLICATIONS PAGE] Error fetching filter options:', error)
        setError(error instanceof Error ? error.message : 'Failed to load filter options. Please check API connectivity.')
        setLoadingProgress({ current: 0, total: 0 })
      } finally {
        if (progressInterval) {
          clearInterval(progressInterval)
        }
        setFiltersLoading(false)
        setLoading(false)
      }
    }

    fetchAllData()
  }, [])

  const _handleLoadAll = async () => {
    try {
      setLoading(true)
      setError(null)
      setSearchQuery('') // Clear search field when generating report
      
                  
      // Prevent loading all 78K applications without specific selections
      // Require at least one application name to be selected
      if (selectedApplications.length === 0) {
        setError('Please select at least one application from the "Applications" section to generate a report. This prevents loading all 78,000+ applications at once.')
        setLoading(false)
        return
      }
      
      // Start progress animation - use actual device count from filterOptions
      const estimatedDevices = filterOptions.devicesWithData
      if (!estimatedDevices || estimatedDevices === 0) {
        setError('No device data available. Please refresh the page.')
        setLoading(false)
        return
      }
      let progress = 0
      const progressInterval = setInterval(() => {
        progress += Math.random() * 3 + 1 // Random increment between 1-4
        if (progress >= estimatedDevices * 0.98) {
          progress = estimatedDevices * 0.98 // Stop at 98%
        }
        setLoadingProgress({ current: Math.floor(progress), total: estimatedDevices })
        setLoadingMessage(`Loading applications from ${Math.floor(progress)} of ${estimatedDevices} devices...`)
      }, 100)
      
      // Build query params based on selected applications
      const params = new URLSearchParams()
      
      // Add application name selections (comma-separated for FastAPI)
      if (selectedApplications.length > 0) {
        params.set('applicationNames', selectedApplications.join(','))
      }
      
      // Note: FastAPI bulk endpoint currently only supports applicationNames filtering
      // Inventory selections (usage, catalog, location) are applied client-side after loading
      // TODO: Add backend support for inventory filtering to reduce data transfer
      
      const queryString = params.toString()
      const url = `/api/devices/applications${queryString ? `?${queryString}` : ''}`
      
            
      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      
      // Clear progress interval
      clearInterval(progressInterval)
      
      if (!response.ok) {
        throw new Error(`Failed to load applications: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (Array.isArray(data)) {
        setApplications(data)
        setLoadingProgress({ current: estimatedDevices, total: estimatedDevices })
        setLoadingMessage('Complete!')
                
        // Save current filter state as last applied
        const currentFilters = JSON.stringify({
          applications: selectedApplications,
          usages: selectedUsages,
          catalogs: selectedCatalogs,
          locations: selectedLocations,
          rooms: selectedRooms,
          fleets: selectedFleets
        })
        setLastAppliedFilters(currentFilters)
      } else {
        throw new Error('Invalid data format')
      }
      
    } catch (error) {
      console.error('Failed to load applications:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setError(errorMessage)
      setLoadingProgress({ current: 0, total: 0 })
    } finally {
      setLoading(false)
      setFiltersExpanded(false) // Collapse accordion after report loads
    }
  }

  // Load utilization report data (also loads inventory for version analysis)
  // Optional daysOverride parameter for when period selector changes before state updates
  const handleLoadUtilization = async (daysOverride?: number | React.MouseEvent) => {
    // Handle case where MouseEvent is passed from button onClick
    const effectiveDays = typeof daysOverride === 'number' ? daysOverride : utilizationDays
    try {
      setLoading(true)
      setError(null)
      
      // Clear search field when generating report
      setSearchQuery('')
      
      // Start simple progress indicator (0 to 100)
      setLoadingProgress({ current: 0, total: 100 })
      
            
      // Build params for both endpoints
      const selectedAppsParam = selectedApplications.length > 0 
        ? selectedApplications.join(',') 
        : ''
      
      // Load inventory data first (for version analysis) - 0-30%
      if (selectedApplications.length > 0) {
        setLoadingMessage('Loading inventory data for version analysis...')
        setLoadingProgress({ current: 10, total: 100 })
        const inventoryParams = new URLSearchParams()
        inventoryParams.set('applicationNames', selectedAppsParam)
        
        const inventoryUrl = `/api/devices/applications?${inventoryParams.toString()}`
                
        try {
          const inventoryResponse = await fetch(inventoryUrl, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' }
          })
          
          setLoadingProgress({ current: 25, total: 100 })
          
          if (inventoryResponse.ok) {
            const inventoryData = await inventoryResponse.json()
            if (Array.isArray(inventoryData)) {
              setApplications(inventoryData)
                          }
          }
        } catch (invError) {
          console.warn('Failed to load inventory data:', invError)
          // Continue even if inventory fails - utilization is more important
        }
      }
      
      setLoadingProgress({ current: 30, total: 100 })
      setLoadingMessage('Loading application usage data...')
            
      // Build query params for utilization endpoint - 30-90%
      const params = new URLSearchParams()
      params.set('days', effectiveDays.toString())
      
      if (selectedApplications.length > 0) {
        params.set('applicationNames', selectedApplications.join(','))
      }
      if (selectedUsages.length > 0) {
        params.set('usages', selectedUsages.join(','))
      }
      if (selectedCatalogs.length > 0) {
        params.set('catalogs', selectedCatalogs.join(','))
      }
      if (selectedLocations.length > 0) {
        params.set('locations', selectedLocations.join(','))
      }
      
      const url = `/api/devices/applications/usage?${params.toString()}`
            
      setLoadingProgress({ current: 40, total: 100 })
      
      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      
      setLoadingProgress({ current: 80, total: 100 })
      
      if (!response.ok) {
        throw new Error(`Failed to load utilization data: ${response.status}`)
      }
      
      const data: UtilizationData = await response.json()
      
      setLoadingProgress({ current: 85, total: 100 })
      
      if (data.status === 'unavailable') {
        setError(data.message || 'Usage tracking not yet deployed')
        setUtilizationData(null)
      } else {
        setUtilizationData(data)
        setReportType('usage')
        // Version distribution is now included in the utilization API response
        // No need for separate inventory fetch
                
        setLoadingProgress({ current: 100, total: 100 })
        setLoadingMessage('Complete!')
      }
      
      // Save current filter state
      const currentFilters = JSON.stringify({
        days: effectiveDays,
        applications: selectedApplications,
        usages: selectedUsages,
        catalogs: selectedCatalogs,
        locations: selectedLocations
      })
      setLastAppliedFilters(currentFilters)
      
    } catch (error) {
      console.error('Failed to load utilization data:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setError(errorMessage)
    } finally {
      setLoading(false)
      setFiltersExpanded(false) // Collapse accordion after report loads
      // Reset progress after brief delay so completion shows
      setTimeout(() => setLoadingProgress({ current: 0, total: 0 }), 500)
    }
  }

  // Load versions-only report (inventory data with version distribution, no usage analytics)
  const handleLoadVersionsReport = async () => {
    try {
      setLoading(true)
      setError(null)
      setSearchQuery('')
      
      setLoadingProgress({ current: 0, total: 100 })
      setLoadingMessage('Loading version distribution data...')
      
      const selectedAppsParam = selectedApplications.length > 0 
        ? selectedApplications.join(',') 
        : ''
      
      // Load inventory data for version analysis
      setLoadingProgress({ current: 20, total: 100 })
      const inventoryParams = new URLSearchParams()
      if (selectedAppsParam) {
        inventoryParams.set('applicationNames', selectedAppsParam)
      }
      
      const inventoryUrl = `/api/devices/applications?${inventoryParams.toString()}`
      
      const inventoryResponse = await fetch(inventoryUrl, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      })
      
      setLoadingProgress({ current: 60, total: 100 })
      
      if (!inventoryResponse.ok) {
        throw new Error(`Failed to load version data: ${inventoryResponse.status}`)
      }
      
      const inventoryData = await inventoryResponse.json()
      
      if (Array.isArray(inventoryData)) {
        setApplications(inventoryData)
        setReportType('versions')
        setUtilizationData(null) // Clear any previous usage data
        setLoadingProgress({ current: 100, total: 100 })
        setLoadingMessage('Complete!')
      } else {
        throw new Error('Invalid data format')
      }
      
      // Save current filter state
      const currentFilters = JSON.stringify({
        applications: selectedApplications,
        usages: selectedUsages,
        catalogs: selectedCatalogs,
        locations: selectedLocations
      })
      setLastAppliedFilters(currentFilters)
      
    } catch (error) {
      console.error('Failed to load versions data:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setError(errorMessage)
    } finally {
      setLoading(false)
      setFiltersExpanded(false) // Collapse accordion after report loads
      setTimeout(() => setLoadingProgress({ current: 0, total: 0 }), 500)
    }
  }

  // Sort utilization applications
  const sortedUtilizationApps = useMemo(() => {
    if (!utilizationData?.applications) return []
    
    return [...utilizationData.applications].sort((a, b) => {
      let compareResult = 0
      
      switch (utilizationSortColumn) {
        case 'name':
          compareResult = a.name.localeCompare(b.name)
          break
        case 'totalHours':
          compareResult = (a.totalHours || 0) - (b.totalHours || 0)
          break
        case 'launchCount':
          compareResult = (a.launchCount || 0) - (b.launchCount || 0)
          break
        case 'deviceCount':
          compareResult = (a.deviceCount || 0) - (b.deviceCount || 0)
          break
        case 'userCount':
          compareResult = (a.userCount || 0) - (b.userCount || 0)
          break
        case 'lastUsed':
          const dateA = a.lastUsed ? new Date(a.lastUsed).getTime() : 0
          const dateB = b.lastUsed ? new Date(b.lastUsed).getTime() : 0
          compareResult = dateA - dateB
          break
      }
      
      return utilizationSortDirection === 'asc' ? compareResult : -compareResult
    })
  }, [utilizationData?.applications, utilizationSortColumn, utilizationSortDirection])

  // Handle device table sorting
  const handleDeviceTableSort = (column: typeof deviceTableSortColumn) => {
    if (deviceTableSortColumn === column) {
      setDeviceTableSortDirection(deviceTableSortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setDeviceTableSortColumn(column)
      setDeviceTableSortDirection('asc')
    }
  }

  const handleMissingTableSort = (column: typeof missingTableSortColumn) => {
    if (missingTableSortColumn === column) {
      setMissingTableSortDirection(missingTableSortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setMissingTableSortColumn(column)
      setMissingTableSortDirection('asc')
    }
  }

  const handleUtilizationSort = (column: typeof utilizationSortColumn) => {
    if (utilizationSortColumn === column) {
      setUtilizationSortDirection(utilizationSortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setUtilizationSortColumn(column)
      setUtilizationSortDirection('desc')
    }
  }

  // Base filter for applications (without version filter - used for version widgets)
  const baseFilteredApplications = applications.filter(app => {
    // First filter: exclude junk applications
    if (!shouldIncludeApplication(app.name)) return false
    
    // Global platform filter
    if (platformFilter !== 'all' && !isPlatformVisible(app.platform || '')) return false
    
    const matchesSearch = !searchQuery.trim() || 
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.deviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.vendor.toLowerCase().includes(searchQuery.toLowerCase())
    
    // Note: API already filtered by applicationNames (using substring matching for inclusiveness)
    // Client-side only applies inventory filters (usage, catalog, location, etc.)
    
    const matchesUsages = selectedUsages.length === 0 || selectedUsages.includes(app.usage?.toLowerCase() || '')
    const matchesCatalogs = selectedCatalogs.length === 0 || selectedCatalogs.includes(app.catalog?.toLowerCase() || '')
    const matchesLocations = selectedLocations.length === 0 || selectedLocations.includes(app.location?.toLowerCase() || '')
    const matchesRooms = selectedRooms.length === 0 || 
      selectedRooms.some(room => 
        app.location?.toLowerCase().includes(room.toLowerCase()) || 
        app.room?.toLowerCase().includes(room.toLowerCase())
      )
    const matchesFleets = selectedFleets.length === 0 || selectedFleets.includes(app.fleet || '')
    
    return matchesSearch && matchesUsages && matchesCatalogs && matchesLocations && matchesRooms && matchesFleets
  })

  // Filter applications for display (includes version filter for table)
  const filteredApplications = baseFilteredApplications.filter(app => {
    const matchesVersions = selectedVersions.length === 0 || 
      selectedVersions.some(versionFilter => {
        // Handle both app-specific (appName:version) and general version filters
        if (versionFilter.includes(':')) {
          const [filterAppName, filterVersion] = versionFilter.split(':')
          if (filterVersion === 'Unknown') return false
          // Compare using NORMALIZED app name (since versionAnalysis uses normalized names)
          const normalizedAppName = normalizeAppName(app.name)
          return normalizedAppName === filterAppName && app.version === filterVersion
        } else {
          if (versionFilter === 'Unknown') return false
          return app.version === versionFilter
        }
      })
    
    return matchesVersions
  })

  // Sort filtered applications
  const sortedApplications = [...filteredApplications].sort((a, b) => {
    let compareResult = 0
    
    switch (sortColumn) {
      case 'device':
        compareResult = a.deviceName.localeCompare(b.deviceName)
        break
      case 'application':
        compareResult = a.name.localeCompare(b.name)
        break
      case 'version':
        compareResult = (a.version || '').localeCompare(b.version || '')
        break
      case 'vendor':
        compareResult = (a.vendor || '').localeCompare(b.vendor || '')
        break
      case 'usage':
        compareResult = (a.usage || '').localeCompare(b.usage || '')
        break
      case 'catalog':
        compareResult = (a.catalog || '').localeCompare(b.catalog || '')
        break
      case 'location':
        compareResult = (a.location || '').localeCompare(b.location || '')
        break
    }
    
    return sortDirection === 'asc' ? compareResult : -compareResult
  })

  const _handleSort = (column: typeof sortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const _hasActiveFilters = selectedApplications.length > 0 || searchQuery.trim() || 
                          selectedUsages.length > 0 || selectedCatalogs.length > 0 || 
                          selectedLocations.length > 0 || selectedRooms.length > 0

  // Helper functions for tag management
  const toggleApplication = (app: string) => {
        setSelectedApplications(prev => {
      const isCurrentlySelected = prev.includes(app)
      const newSelection = isCurrentlySelected 
        ? prev.filter(a => a !== app) 
        : [...prev, app]
                        return newSelection
    })
  }

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

  const _toggleLocation = (location: string) => {
    setSelectedLocations(prev => 
      prev.includes(location) ? prev.filter(l => l !== location) : [...prev, location]
    )
  }

  const toggleRoom = (room: string) => {
    setSelectedRooms(prev => 
      prev.includes(room) ? prev.filter(r => r !== room) : [...prev, room]
    )
  }

  const toggleFleet = (fleet: string) => {
    setSelectedFleets(prev => 
      prev.includes(fleet) ? prev.filter(f => f !== fleet) : [...prev, fleet]
    )
  }

  const toggleVersion = (version: string, appName?: string) => {
    // Create a version filter that includes both app name and version
    const versionFilter = appName ? `${appName}:${version}` : version
    setSelectedVersions(prev => 
      prev.includes(versionFilter) ? prev.filter(v => v !== versionFilter) : [...prev, versionFilter]
    )
  }

  const clearAllFilters = () => {
    setSelectedApplications([])
    setSelectedUsages([])
    setSelectedCatalogs([])
    setSelectedRooms([])
    setSelectedFleets([])
    setSelectedVersions([])
    setSearchQuery('')
    // Don't clear applications data - just clear error state
    setError(null)
  }

  const resetReport = () => {
    setApplications([])
    setUtilizationData(null)
    setReportType(null)
    setReportMode('has') // Reset to default mode
    setSelectedApplications([])
    setSelectedUsages([])
    setSelectedCatalogs([])
    setSelectedLocations([])
    setSelectedRooms([])
    setSelectedFleets([])
    setSelectedVersions([])
    setSearchQuery('')
    setError(null)
    setFiltersExpanded(true)
    setLastAppliedFilters('')
    // Reset sort and time period to defaults
    setUtilizationDays(30)
    setUtilizationSortColumn('totalHours')
    setUtilizationSortDirection('desc')
  }

  // Filter applications dropdown based on search and sort by popularity
  const filteredApplicationNames = useMemo(() => {
    // Since filterOptions.applicationNames are already normalized, just filter by search
    const result = filterOptions.applicationNames
      .filter(name => name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort() // Alphabetical sort since we don't have counts without applications data
    return result
  }, [filterOptions.applicationNames, searchQuery])

  // Compute devices that are MISSING the selected applications
  // Filters: Apply same catalog/usage/location filters to find devices that SHOULD have the app but DON'T
  const missingDevices = useMemo(() => {
    if (selectedApplications.length === 0 || reportMode !== 'missing') return []
    
    // Get serial numbers of devices that HAVE the selected applications
    const devicesWithApp = new Set(
      baseFilteredApplications.map(app => app.serialNumber)
    )
    
    // Filter all devices by current selection criteria, then find those missing the app
    const filtered = allDevices.filter(device => {
      // Must not have the app
      if (devicesWithApp.has(device.serialNumber)) return false
      
      // Apply same filters as the report
      if (selectedUsages.length > 0 && !selectedUsages.includes(device.usage?.toLowerCase() || '')) return false
      if (selectedCatalogs.length > 0 && !selectedCatalogs.includes(device.catalog?.toLowerCase() || '')) return false
      if (selectedLocations.length > 0 && !selectedLocations.includes(device.location?.toLowerCase() || '')) return false
      if (selectedRooms.length > 0) {
        const matchesRoom = selectedRooms.some(room => 
          device.location?.toLowerCase().includes(room.toLowerCase()) || 
          device.room?.toLowerCase().includes(room.toLowerCase())
        )
        if (!matchesRoom) return false
      }
      
      return true
    })
    
    // Sort based on current sort column and direction
    return [...filtered].sort((a, b) => {
      let aVal: string
      let bVal: string
      
      switch (missingTableSortColumn) {
        case 'deviceName':
          aVal = a.name || a.serialNumber
          bVal = b.name || b.serialNumber
          break
        case 'serialNumber':
          aVal = a.serialNumber
          bVal = b.serialNumber
          break
        case 'location':
          aVal = a.location || ''
          bVal = b.location || ''
          break
        case 'catalog':
          aVal = a.catalog || ''
          bVal = b.catalog || ''
          break
        default:
          aVal = a.name || a.serialNumber
          bVal = b.name || b.serialNumber
      }
      
      const comparison = aVal.localeCompare(bVal)
      return missingTableSortDirection === 'asc' ? comparison : -comparison
    })
  }, [allDevices, baseFilteredApplications, selectedApplications, selectedUsages, selectedCatalogs, selectedLocations, selectedRooms, reportMode, missingTableSortColumn, missingTableSortDirection])

  // Version analysis - group by NORMALIZED application name and version
  // Uses baseFilteredApplications (without version filter) so widgets always show all versions
  const versionAnalysis = useMemo(() => {
    const analysis: VersionAnalysis = {}
    
    baseFilteredApplications.forEach(app => {
      // Use normalized name as the key (same as what's in filterOptions.applicationNames)
      const normalizedName = normalizeAppName(app.name)
      if (!normalizedName) return // Skip if normalization results in empty string
      
      if (!analysis[normalizedName]) {
        analysis[normalizedName] = {}
      }
      const version = app.version || 'Unknown'
      analysis[normalizedName][version] = (analysis[normalizedName][version] || 0) + 1
    })
    
    return analysis
  }, [baseFilteredApplications])

  /* Commented out full-page error - using inline table error instead
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black">
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
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                <div className="hidden lg:flex">
                  <DevicePageNavigation className="flex items-center gap-2" />
                </div>
              </div>
            </div>
          </div>
        </header>
        
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Error Loading Applications
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {error}
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => {
                  setError(null)
                  window.location.reload()
                }}
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Try Again
              </button>
              <Link
                href="/dashboard"
                className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }
  */

  return (
    <div className="h-[calc(100vh-4rem)] bg-gray-50 dark:bg-black flex flex-col overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-4 sm:pb-8 pt-4 sm:pt-8 flex flex-col min-h-0">
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col min-h-0 overflow-hidden">

          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {reportType === 'usage' ? 'Applications Usage Report' : 'Applications Report'}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {reportType === 'usage' && utilizationData 
                  ? `${utilizationData.summary.totalAppsTracked} apps tracked across ${utilizationData.summary.uniqueDevices} devices`
                  : reportType === 'versions' && sortedApplications.length > 0
                  ? `${sortedApplications.length} applications across ${new Set(sortedApplications.map(app => app.serialNumber)).size} devices`
                  : 'Generate report to see application inventory across your fleet'
                }
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Time Period Selector - Only show for usage reports */}
              {reportType === 'usage' && utilizationData && (
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600 dark:text-gray-400">Period:</label>
                  <select
                    value={utilizationDays}
                    onChange={(e) => {
                      const newDays = parseInt(e.target.value)
                      setUtilizationDays(newDays)
                      // Auto-reload if report is already loaded - pass new days directly
                      if (utilizationData) {
                        handleLoadUtilization(newDays)
                      }
                    }}
                    className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value={7}>Last 7 days</option>
                    <option value={30}>Last 30 days</option>
                    <option value={90}>Last 90 days</option>
                    <option value={365}>Last year</option>
                  </select>
                </div>
              )}
              
              {/* Generate Report Button with Loading Spinner */}
              <div className="flex items-center gap-3">
                {/* Loading Spinner - Left of Button */}
                {loading && (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Generating report...</span>
                  </div>
                )}

                {/* Clear All Selections Button - Show when selections are active and NO report loaded */}
                {(selectedApplications.length > 0 || selectedUsages.length > 0 || selectedCatalogs.length > 0 || selectedLocations.length > 0 || selectedRooms.length > 0 || selectedFleets.length > 0) && 
                 !loading && 
                 !reportType && (
                  <button
                    onClick={clearAllFilters}
                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded-lg transition-colors whitespace-nowrap font-medium"
                  >
                    Clear All Selections
                  </button>
                )}
                
                {/* Generate Report Button - Show before any report is generated */}
                {!loading && !reportType && (
                  <button
                    onClick={() => handleLoadVersionsReport()}
                    className="px-4 py-2 text-white text-sm rounded-lg transition-colors whitespace-nowrap font-medium bg-blue-600 hover:bg-blue-700"
                  >
                    Generate Report
                  </button>
                )}
                
                {/* Update Report Button - Show when main report is loaded AND filters have changed */}
                {!loading && reportType === 'versions' && (() => {
                  const currentFilters = JSON.stringify({
                    applications: selectedApplications,
                    usages: selectedUsages,
                    catalogs: selectedCatalogs,
                    locations: selectedLocations
                  })
                  return lastAppliedFilters && lastAppliedFilters !== currentFilters
                })() && (
                  <button
                    onClick={() => handleLoadVersionsReport()}
                    className="px-4 py-2 text-white text-sm rounded-lg transition-colors whitespace-nowrap font-medium bg-blue-600 hover:bg-blue-700"
                  >
                    Update Report
                  </button>
                )}
                
                {/* Missing Report Toggle - Shows devices WITHOUT the selected app */}
                {!loading && reportType === 'versions' && selectedApplications.length > 0 && (
                  <button
                    onClick={() => setReportMode(prev => prev === 'has' ? 'missing' : 'has')}
                    className={`px-4 py-2 text-white text-sm rounded-lg transition-colors whitespace-nowrap font-medium flex items-center gap-2 ${
                      reportMode === 'missing' 
                        ? 'bg-green-600 hover:bg-green-700' 
                        : 'bg-red-600/80 hover:bg-red-700'
                    }`}
                  >
                    {reportMode === 'missing' ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                    )}
                    {reportMode === 'missing' ? 'Show Installed' : 'Missing Report'}
                    {reportMode === 'missing' && (
                      <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs">
                        {missingDevices.length}
                      </span>
                    )}
                  </button>
                )}

                {/* Usage Report Button - Secondary option after main report is generated */}
                {!loading && reportType === 'versions' && reportMode !== 'missing' && (
                  <button
                    onClick={() => handleLoadUtilization()}
                    className="px-4 py-2 text-white text-sm rounded-lg transition-colors whitespace-nowrap font-medium bg-purple-600 hover:bg-purple-700 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Usage Report
                  </button>
                )}
                
                {/* Update Usage Report Button - Show when usage report is loaded */}
                {!loading && reportType === 'usage' && (
                  <button
                    onClick={() => handleLoadUtilization()}
                    className="px-4 py-2 text-white text-sm rounded-lg transition-colors whitespace-nowrap font-medium bg-purple-600 hover:bg-purple-700 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    {(() => {
                      const currentFilters = JSON.stringify({
                        days: utilizationDays,
                        applications: selectedApplications,
                        usages: selectedUsages,
                        catalogs: selectedCatalogs,
                        locations: selectedLocations
                      })
                      const filtersChanged = lastAppliedFilters && lastAppliedFilters !== currentFilters
                      return filtersChanged ? 'Update Usage Report' : 'Usage Report'
                    })()}
                  </button>
                )}

                {/* Reset Button - Show after any report is generated */}
                {reportType && !loading && (
                  <button
                    onClick={resetReport}
                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded-lg transition-colors whitespace-nowrap font-medium flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    New Report
                  </button>
                )}
              </div>
              
              {/* Export CSV Button - Usage Report */}
              {reportType === 'usage' && utilizationData && utilizationData.applications.length > 0 && (
                <button
                  onClick={() => {
                    const csvContent = [
                      ['Application', 'Total Hours', 'Launches', 'Devices', 'Users', 'Last Used', 'Single User'].join(','),
                      ...sortedUtilizationApps.map(app => [
                        app.name,
                        app.totalHours.toFixed(1),
                        app.launchCount,
                        app.deviceCount,
                        app.userCount,
                        app.lastUsed || '',
                        app.isSingleUser ? 'Yes' : 'No'
                      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
                    ].join('\n')
                    
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
                    const link = document.createElement('a')
                    link.href = URL.createObjectURL(blob)
                    link.download = `applications-usage-${utilizationDays}days-${new Date().toISOString().split('T')[0]}.csv`
                    link.click()
                  }}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors whitespace-nowrap font-medium flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export Usage CSV
                </button>
              )}
              
              {/* Export CSV Button - Versions Report (handles both installed and missing modes) */}
              {reportType === 'versions' && (sortedApplications.length > 0 || (reportMode === 'missing' && missingDevices.length > 0)) && (
                <button
                  onClick={() => {
                    if (reportMode === 'missing') {
                      // Export missing devices report
                      const appNames = selectedApplications.join(', ')
                      const csvContent = [
                        ['Device', 'Serial Number', 'Location', 'Catalog', 'Missing Application'].join(','),
                        ...missingDevices.map(device => [
                          device.name || device.serialNumber,
                          device.serialNumber,
                          device.location || '',
                          device.catalog || '',
                          appNames
                        ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
                      ].join('\n')
                      
                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
                      const link = document.createElement('a')
                      link.href = URL.createObjectURL(blob)
                      const safeAppName = selectedApplications[0]?.replace(/[^a-zA-Z0-9]/g, '-') || 'app'
                      link.download = `missing-${safeAppName}-${new Date().toISOString().split('T')[0]}.csv`
                      link.click()
                    } else {
                      // Export installed applications report (existing behavior)
                      const csvContent = [
                        ['Device', 'Serial Number', 'Application', 'Version', 'Catalog', 'Location'].join(','),
                        ...sortedApplications.map(app => [
                          app.deviceName || app.serialNumber,
                          app.serialNumber,
                          app.name,
                          app.version,
                          app.catalog || '',
                          app.location || ''
                        ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
                      ].join('\n')
                      
                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
                      const link = document.createElement('a')
                      link.href = URL.createObjectURL(blob)
                      link.download = `applications-${new Date().toISOString().split('T')[0]}.csv`
                      link.click()
                    }
                  }}
                  className={`px-4 py-2 text-white text-sm rounded-lg transition-colors whitespace-nowrap font-medium flex items-center gap-2 ${
                    reportMode === 'missing' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {reportMode === 'missing' ? 'Export Missing CSV' : 'Export CSV'}
                </button>
              )}
              
              {/* Search Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search applications..."
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

          {/* Error Display */}
          {error && !filtersLoading && (
            <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg dark:bg-red-900 dark:border-red-700 dark:text-red-200 flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={() => {
                  setError(null)
                  window.location.reload()
                }}
                className="ml-4 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {/* Loading State with Progress Bar */}
          {filtersLoading && (
            <div className="px-6 py-8">
              <div className="max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Loading applications data from all devices...
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
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
                    style={{ 
                      width: loadingProgress.total > 0
                        ? `${(loadingProgress.current / loadingProgress.total) * 100}%`
                        : '0%'
                    }}
                  ></div>
                </div>
                <div className="mt-2 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {loadingProgress.total > 0 
                      ? (
                        <>
                          {Math.round((loadingProgress.current / loadingProgress.total) * 100)}% complete
                          {loadingProgress.total > 100 && <span className="ml-2">{loadingProgress.total} devices</span>}
                        </>
                      )
                      : 'First load may take 60-90 seconds'
                    }
                  </p>
                  {loadingMessage && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">
                      {loadingMessage}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Filter Clouds Section */}
          {!filtersLoading && (
            <div className="border-b border-gray-200 dark:border-gray-700">
              {/* Collapsible Header */}
              <button
                onClick={() => setFiltersExpanded(!effectiveFiltersExpanded)}
                className="w-full px-6 py-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <svg 
                    className={`w-5 h-5 text-gray-600 dark:text-gray-300 transition-transform ${effectiveFiltersExpanded ? 'rotate-90' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Selections {(selectedApplications.length > 0 || selectedUsages.length > 0 || selectedCatalogs.length > 0 || selectedLocations.length > 0 || selectedRooms.length > 0 || selectedFleets.length > 0) && (
                      <span className="ml-2 text-blue-600 dark:text-blue-400">
                        ({[selectedApplications, selectedUsages, selectedCatalogs, selectedLocations, selectedRooms, selectedFleets].reduce((sum, arr) => sum + arr.length, 0)} active)
                      </span>
                    )}
                  </h3>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {effectiveFiltersExpanded ? 'Click to collapse' : 'Click to expand'}
                </span>
              </button>
              
              {/* Cool Progress View - Show when generating report */}
              {loading && (
                <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-t border-gray-200 dark:border-gray-600">
                  <div className="flex items-center gap-4">
                    {/* Applications module icon */}
                    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    
                    {/* Progress info */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {loadingMessage || 'Processing...'}
                        </span>
                      </div>
                      
                      {/* Progress bar */}
                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 overflow-hidden">
                        <div 
                          className="h-2 rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600 transition-all duration-300 ease-out"
                          style={{ 
                            width: loadingProgress.total > 0 
                              ? `${Math.round((loadingProgress.current / loadingProgress.total) * 100)}%` 
                              : '0%',
                            backgroundSize: '200% 100%',
                            animation: 'shimmer 1.5s ease-in-out infinite'
                          }}
                        ></div>
                      </div>
                      
                      {/* Step indicators */}
                      <div className="flex items-center gap-2 mt-2">
                        <div className={`w-2 h-2 rounded-full ${loadingProgress.current >= 20 ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                        <div className={`w-2 h-2 rounded-full ${loadingProgress.current >= 40 ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                        <div className={`w-2 h-2 rounded-full ${loadingProgress.current >= 60 ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                        <div className={`w-2 h-2 rounded-full ${loadingProgress.current >= 80 ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                        <div className={`w-2 h-2 rounded-full ${loadingProgress.current >= 100 ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Collapsible Content */}
              <CollapsibleSection expanded={effectiveFiltersExpanded}>
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700">
                  <div className="space-y-4">
                
                {/* Inventory Filter Sections - Top */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* Usage Filter */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Usage {selectedUsages.length > 0 && `(${selectedUsages.length} selected)`}
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {filterOptions.usages.map(usage => (
                        <button
                          key={usage}
                          onClick={() => toggleUsage(usage.toLowerCase())}
                          className={`px-2 py-1 text-xs rounded-full border ${
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

                  {/* Catalog Filter */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Catalog {selectedCatalogs.length > 0 && `(${selectedCatalogs.length} selected)`}
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {filterOptions.catalogs.map(catalog => (
                        <button
                          key={catalog}
                          onClick={() => toggleCatalog(catalog.toLowerCase())}
                          className={`px-2 py-1 text-xs rounded-full border ${
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

                  {/* Fleet Filter - Only show if fleets exist */}
                  {filterOptions.fleets.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Fleet {selectedFleets.length > 0 && `(${selectedFleets.length} selected)`}
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {filterOptions.fleets.map(fleet => (
                        <button
                          key={fleet}
                          onClick={() => toggleFleet(fleet)}
                          className={`px-2 py-1 text-xs rounded-full border ${
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

                </div>

                {/* Locations Filter Cloud - Full Width */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Locations {selectedRooms.length > 0 && `(${selectedRooms.length} selected)`}
                    </h3>
                  </div>
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
                      {filterOptions.rooms.length === 0 && (
                        <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                          No location data available
                        </span>
                      )}
                  </div>
                </div>

                {/* Applications Filter Cloud */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Applications {selectedApplications.length > 0 && `(${selectedApplications.length} selected)`}
                    </h3>
                    <div className="flex items-center gap-2">
                      {/* Select All Filtered Results button - shows when search is active */}
                      {searchQuery && filteredApplicationNames.length > 0 && filteredApplicationNames.length < filterOptions.applicationNames.length && (
                        <button
                          onClick={() => {
                            // Add all filtered results that aren't already selected
                            const newSelections = filteredApplicationNames.filter(name => !selectedApplications.includes(name))
                            setSelectedApplications([...selectedApplications, ...newSelections])
                          }}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800 rounded-lg transition-colors"
                        >
                          Select {filteredApplicationNames.length} Results
                        </button>
                      )}
                      {/* Select All button */}
                      {selectedApplications.length < filterOptions.applicationNames.length && (
                        <button
                          onClick={() => setSelectedApplications([...filterOptions.applicationNames])}
                          className="px-2 py-1 text-xs bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 rounded-lg transition-colors"
                        >
                          Select All ({filterOptions.applicationNames.length})
                        </button>
                      )}
                      {/* Clear All button - when apps are selected */}
                      {selectedApplications.length > 0 && (
                        <button
                          onClick={() => setSelectedApplications([])}
                          className="px-2 py-1 text-xs bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800 rounded-lg transition-colors"
                        >
                          Clear ({selectedApplications.length})
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="min-h-48 max-h-[60vh] overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-800">
                    <div className="flex flex-wrap gap-1">
                      {filteredApplicationNames.map((name: string) => (
                        <button
                          key={name}
                          onClick={() => toggleApplication(name)}
                          className={`px-2 py-1 text-xs rounded-full border ${
                            selectedApplications.includes(name)
                              ? 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-600'
                              : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-500'
                          }`}
                        >
                          {name}
                        </button>
                      ))}
                      {filteredApplicationNames.length === 0 && !searchQuery && (
                        <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                          Loading applications...
                        </span>
                      )}
                      {filteredApplicationNames.length === 0 && searchQuery && (
                        <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                          No applications match &quot;{searchQuery}&quot;
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Clear Selections Button - REMOVED - Now at top */}

                  </div>
                </div>
              </CollapsibleSection>
            </div>
          )}
          

          {/* Version Distribution Widget - Shows for Usage Report (from API data) */}
          {reportType === 'usage' && utilizationData && utilizationData.versionDistribution && Object.keys(utilizationData.versionDistribution).length > 0 && (
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                  Version Distribution
                  {selectedVersions.length > 0 && (
                    <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                      ({selectedVersions.length} selected)
                    </span>
                  )}
                  {selectedApplications.length > 0 && (
                    <span className="text-sm font-normal text-blue-500 dark:text-blue-400">
                      - Showing {selectedApplications.length} selected app{selectedApplications.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </h3>
                {/* Horizontal scrollable container for apps - filtered by selectedApplications */}
                <div className="flex overflow-x-auto gap-4 pb-2" style={{ scrollbarWidth: 'thin' }}>
                  {Object.keys(utilizationData.versionDistribution)
                    // Filter to only show selected apps (if any are selected)
                    .filter(appName => {
                      if (selectedApplications.length === 0) {
                        // No app filter - show top apps by device count (limit to prevent overwhelming)
                        return true
                      }
                      // Check if this app matches any selected application (case-insensitive partial match)
                      return selectedApplications.some(selected => 
                        appName.toLowerCase().includes(selected.toLowerCase()) ||
                        selected.toLowerCase().includes(appName.toLowerCase())
                      )
                    })
                    .sort((a, b) => {
                      // Sort by total devices descending
                      const aTotal = utilizationData.versionDistribution![a].totalDevices
                      const bTotal = utilizationData.versionDistribution![b].totalDevices
                      return bTotal - aTotal
                    })
                    .map(appName => {
                      const appData = utilizationData.versionDistribution![appName]
                      const versions = appData.versions
                      const sortedVersions = Object.entries(versions)
                        .sort(([vA,], [vB,]) => vB.localeCompare(vA, undefined, { numeric: true, sensitivity: 'base' }))
                      const total = appData.totalDevices
                      
                      return (
                        <div 
                          key={appName} 
                          className="flex-shrink-0 w-64 bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate" title={appName}>
                              {appName}
                            </h4>
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 whitespace-nowrap">
                              {total} device{total !== 1 ? 's' : ''}
                            </span>
                          </div>
                          {/* Scrollable version list with max height */}
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {sortedVersions.map(([version, versionInfo]) => {
                              const count = versionInfo.count
                              const percentage = Math.round((count / total) * 100)
                              const versionFilter = `${appName}:${version}`
                              const isSelected = selectedVersions.includes(versionFilter)
                              return (
                                <div 
                                  key={version} 
                                  className={`p-2 rounded cursor-pointer transition-colors ${
                                    isSelected 
                                      ? 'bg-blue-100 dark:bg-blue-900 border-2 border-blue-500' 
                                      : 'hover:bg-gray-100 dark:hover:bg-gray-600 border-2 border-transparent'
                                  }`}
                                  onClick={() => toggleVersion(version, appName)}
                                  title="Click to show devices with this version"
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <span className={`text-xs font-medium ${
                                      isSelected 
                                        ? 'text-blue-700 dark:text-blue-300 font-bold' 
                                        : 'text-gray-700 dark:text-gray-300'
                                    }`}>
                                      v{version}
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      {count} ({percentage}%)
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 dark:bg-gray-500 rounded-full h-1.5">
                                    <div 
                                      className={`h-1.5 rounded-full transition-all duration-300 ${
                                        isSelected ? 'bg-blue-700' : 'bg-blue-600'
                                      }`}
                                      style={{ width: `${percentage}%` }}
                                    ></div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                </div>
                {Object.keys(utilizationData.versionDistribution).length === 0 && (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                    No version data available
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Version Distribution Widget - Shows for Versions Report (computed from applications) */}
          {reportType === 'versions' && Object.keys(versionAnalysis).length > 0 && (
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                  Version Distribution
                  {selectedVersions.length > 0 && (
                    <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                      ({selectedVersions.length} selected)
                    </span>
                  )}
                  {selectedApplications.length > 0 && (
                    <span className="text-sm font-normal text-blue-500 dark:text-blue-400">
                      - {selectedApplications.length} app{selectedApplications.length !== 1 ? 's' : ''} filtered
                    </span>
                  )}
                </h3>
                {/* Horizontal scrollable container for apps */}
                <div className="flex overflow-x-auto gap-4 pb-2" style={{ scrollbarWidth: 'thin' }}>
                  {Object.keys(versionAnalysis)
                    .sort((a, b) => {
                      // Sort by total devices descending
                      const aTotal = Object.values(versionAnalysis[a]).reduce((sum, count) => sum + count, 0)
                      const bTotal = Object.values(versionAnalysis[b]).reduce((sum, count) => sum + count, 0)
                      return bTotal - aTotal
                    })
                    .slice(0, 50) // Limit to prevent overwhelming
                    .map(appName => {
                      const versions = versionAnalysis[appName]
                      const sortedVersions = Object.entries(versions)
                        .sort(([vA,], [vB,]) => vB.localeCompare(vA, undefined, { numeric: true, sensitivity: 'base' }))
                      const total = Object.values(versions).reduce((sum, count) => sum + count, 0)
                      
                      return (
                        <div 
                          key={appName} 
                          className="flex-shrink-0 w-64 bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate" title={appName}>
                              {appName}
                            </h4>
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 whitespace-nowrap">
                              {total} device{total !== 1 ? 's' : ''}
                            </span>
                          </div>
                          {/* Scrollable version list with max height */}
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {sortedVersions.map(([version, count]) => {
                              const percentage = Math.round((count / total) * 100)
                              const versionFilter = `${appName}:${version}`
                              const isSelected = selectedVersions.includes(versionFilter)
                              return (
                                <div 
                                  key={version} 
                                  className={`p-2 rounded cursor-pointer transition-colors ${
                                    isSelected 
                                      ? 'bg-blue-100 dark:bg-blue-900 border-2 border-blue-500' 
                                      : 'bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 hover:bg-blue-50 dark:hover:bg-blue-900/30'
                                  }`}
                                  onClick={() => toggleVersion(version, appName)}
                                  title="Click to filter devices with this version"
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <span className={`text-xs font-medium ${
                                      isSelected 
                                        ? 'text-blue-700 dark:text-blue-300 font-bold' 
                                        : 'text-gray-700 dark:text-gray-300'
                                    }`}>
                                      v{version}
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      {count} ({percentage}%)
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 dark:bg-gray-500 rounded-full h-1.5">
                                    <div 
                                      className={`h-1.5 rounded-full transition-all duration-300 ${
                                        isSelected ? 'bg-blue-700' : 'bg-blue-600'
                                      }`}
                                      style={{ width: `${percentage}%` }}
                                    ></div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            </div>
          )}

          {/* Usage Report Content - Shows utilization data with widgets */}
          {reportType === 'usage' && utilizationData && selectedVersions.length === 0 && (
            <>
              {/* Widgets Accordion - Collapsible section - ONLY for Usage Report */}
              {(utilizationData.topUsers.length > 0 || utilizationData.singleUserApps.length > 0 || utilizationData.unusedApps.length > 0 || utilizationData.applications.length > 0) && (
                <div className={widgetsExpanded ? '' : 'border-b border-gray-200 dark:border-gray-700'}>
                  {/* Widgets Accordion Header */}
                  <button
                    onClick={() => setWidgetsExpanded(!effectiveWidgetsExpanded)}
                    className="w-full px-6 py-3 flex items-center justify-between bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center gap-2">
                      <svg 
                        className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${effectiveWidgetsExpanded ? 'rotate-90' : 'rotate-180'}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Usage Analytics</span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {effectiveWidgetsExpanded ? 'Click to collapse' : 'Click to expand'}
                    </span>
                  </button>
                </div>
              )}

              {/* Widgets Content - Collapsible */}
              <CollapsibleSection expanded={effectiveWidgetsExpanded && (utilizationData.topUsers.length > 0 || utilizationData.singleUserApps.length > 0 || utilizationData.unusedApps.length > 0 || utilizationData.applications.length > 0)}>
              <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              
              {/* Summary Cards - Inside Widgets Accordion */}
              <div className="px-6 py-4 bg-blue-50 dark:bg-blue-900/20 border-b border-gray-100 dark:border-gray-700">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {utilizationData.summary.totalAppsTracked}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Apps Tracked</div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {utilizationData.summary.uniqueUsers}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Unique Users</div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                      {utilizationData.summary.uniqueDevices}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Devices</div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                      {utilizationData.summary.singleUserAppCount}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Single-User Apps</div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {utilizationData.summary.unusedAppCount}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Unused Apps</div>
                  </div>
                </div>
              </div>
              
              {/* Widgets Grid */}
              <div className="px-6 py-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Users Widget */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 p-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Top Users by Usage
                  </h3>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {utilizationData.topUsers.slice(0, 10).map((user, idx) => (
                      <div key={user.username} className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            idx < 3 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {idx + 1}
                          </span>
                          <span className="text-sm text-gray-900 dark:text-white truncate">{user.username}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                            {formatDuration(user.totalSeconds)}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {user.appsUsed} apps
                          </span>
                        </div>
                      </div>
                    ))}
                    {utilizationData.topUsers.length === 0 && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">No user data available</p>
                    )}
                  </div>
                </div>

                {/* Single-User Apps Widget */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 p-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Single-User Applications
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Apps used by only one person - may indicate specialized tools or license inefficiency</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {utilizationData.singleUserApps.slice(0, 15).map((app) => (
                      <div key={app.name} className="flex items-center justify-between">
                        <span className="text-sm text-gray-900 dark:text-white truncate flex-1">{app.name}</span>
                        <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400 ml-2">
                          {app.totalHours.toFixed(1)}h
                        </span>
                      </div>
                    ))}
                    {utilizationData.singleUserApps.length === 0 && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">No single-user apps detected</p>
                    )}
                  </div>
                </div>

                {/* Unused Apps Widget */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 p-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    Unused Applications ({utilizationDays} days)
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Installed but not used - candidates for removal or license reclamation</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {utilizationData.unusedApps.slice(0, 15).map((app) => (
                      <div key={app.name} className="flex items-center justify-between">
                        <span className="text-sm text-gray-900 dark:text-white truncate flex-1">{app.name}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                          {app.deviceCount} devices
                        </span>
                      </div>
                    ))}
                    {utilizationData.unusedApps.length === 0 && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">All installed apps have been used</p>
                    )}
                  </div>
                </div>

                {/* Top Apps by Time Widget */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 p-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Most Used by Time
                  </h3>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {utilizationData.applications.slice(0, 10).map((app) => (
                      <div key={app.name} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-900 dark:text-white truncate flex-1">{app.name}</span>
                          <span className="text-sm font-medium text-blue-600 dark:text-blue-400 ml-2">
                            {formatDuration(app.totalSeconds)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full"
                              style={{ 
                                width: `${utilizationData.applications[0]?.totalSeconds ? (app.totalSeconds / utilizationData.applications[0].totalSeconds) * 100 : 0}%` 
                              }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400 w-16 text-right">
                            {app.deviceCount} dev
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              </div>
              </CollapsibleSection>

              {/* Utilization Data Table */}
              <div ref={tableContainerRef} className="flex-1 overflow-auto min-h-0 table-scrollbar">
                <table className="w-full">
                  <thead className="bg-blue-50 dark:bg-blue-900/30 sticky top-0 z-10">
                    <tr>
                      <th 
                        className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/50 select-none"
                        onClick={() => handleUtilizationSort('name')}
                      >
                        <div className="flex items-center gap-1">
                          Application
                          {utilizationSortColumn === 'name' && (
                            <svg className={`w-4 h-4 transition-transform ${utilizationSortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Versions
                      </th>
                      <th 
                        className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/50 select-none"
                        onClick={() => handleUtilizationSort('totalHours')}
                      >
                        <div className="flex items-center gap-1">
                          Total Time
                          {utilizationSortColumn === 'totalHours' && (
                            <svg className={`w-4 h-4 transition-transform ${utilizationSortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/50 select-none"
                        onClick={() => handleUtilizationSort('launchCount')}
                      >
                        <div className="flex items-center gap-1">
                          Launches
                          {utilizationSortColumn === 'launchCount' && (
                            <svg className={`w-4 h-4 transition-transform ${utilizationSortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/50 select-none"
                        onClick={() => handleUtilizationSort('deviceCount')}
                      >
                        <div className="flex items-center gap-1">
                          Devices
                          {utilizationSortColumn === 'deviceCount' && (
                            <svg className={`w-4 h-4 transition-transform ${utilizationSortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/50 select-none"
                        onClick={() => handleUtilizationSort('userCount')}
                      >
                        <div className="flex items-center gap-1">
                          Users
                          {utilizationSortColumn === 'userCount' && (
                            <svg className={`w-4 h-4 transition-transform ${utilizationSortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/50 select-none"
                        onClick={() => handleUtilizationSort('lastUsed')}
                      >
                        <div className="flex items-center gap-1">
                          Last Used
                          {utilizationSortColumn === 'lastUsed' && (
                            <svg className={`w-4 h-4 transition-transform ${utilizationSortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {error ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center">
                            <div className="w-12 h-12 mb-4 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <p className="text-base font-medium text-gray-900 dark:text-white mb-2">Failed to load applications</p>
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
                    ) : sortedUtilizationApps.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                          <div className="flex flex-col items-center justify-center">
                            <svg className="w-12 h-12 mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            <p className="text-lg font-medium mb-1">No usage data found</p>
                            <p className="text-sm">Try adjusting the time period or filters.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      sortedUtilizationApps.map((app) => (
                        <tr key={app.name} className="hover:bg-blue-50 dark:hover:bg-blue-900/10">
                          <td className="px-4 lg:px-6 py-4">
                            <div className="font-medium text-gray-900 dark:text-white truncate max-w-xs" title={app.name}>
                              {app.name}
                            </div>
                          </td>
                          <td className="px-4 lg:px-6 py-4">
                            {/* Show versions from versionAnalysis - use normalized name for lookup */}
                            {(() => {
                              const normalizedAppName = normalizeAppName(app.name)
                              const versions = versionAnalysis[normalizedAppName] || versionAnalysis[app.name]
                              if (!versions || Object.keys(versions).length === 0) {
                                return <span className="text-xs text-gray-400">-</span>
                              }
                              const sortedVersions = Object.entries(versions)
                                .sort(([vA,], [vB,]) => vB.localeCompare(vA, undefined, { numeric: true, sensitivity: 'base' }))
                              const _totalDevices = Object.values(versions).reduce((sum, count) => sum + count, 0)
                              if (sortedVersions.length === 1) {
                                return (
                                  <span className="text-xs text-gray-700 dark:text-gray-300">
                                    v{sortedVersions[0][0]}
                                  </span>
                                )
                              }
                              return (
                                <div className="flex flex-col gap-0.5">
                                  {sortedVersions.slice(0, 3).map(([version, count]) => (
                                    <span key={version} className="text-xs text-gray-700 dark:text-gray-300">
                                      v{version} <span className="text-gray-400">({count})</span>
                                    </span>
                                  ))}
                                  {sortedVersions.length > 3 && (
                                    <span className="text-xs text-gray-400">+{sortedVersions.length - 3} more</span>
                                  )}
                                </div>
                              )
                            })()}
                          </td>
                          <td className="px-4 lg:px-6 py-4">
                            <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                              {formatDuration(app.totalSeconds)}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {app.totalHours.toFixed(1)} hours
                            </div>
                          </td>
                          <td className="px-4 lg:px-6 py-4">
                            <div className="text-sm text-gray-900 dark:text-white">
                              {app.launchCount.toLocaleString()}
                            </div>
                          </td>
                          <td className="px-4 lg:px-6 py-4">
                            <div className="text-sm text-gray-900 dark:text-white">
                              {app.deviceCount}
                            </div>
                          </td>
                          <td className="px-4 lg:px-6 py-4">
                            <div className="text-sm text-gray-900 dark:text-white">
                              {app.userCount}
                            </div>
                          </td>
                          <td className="px-4 lg:px-6 py-4">
                            <div className="text-sm text-gray-900 dark:text-white">
                              {app.lastUsed ? formatRelativeTime(app.lastUsed) : '-'}
                            </div>
                          </td>
                          <td className="px-4 lg:px-6 py-4">
                            {app.isSingleUser ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                Single User
                              </span>
                            ) : app.userCount > 5 ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                Popular
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                                Normal
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Missing Devices Table - Shown when report mode is 'missing' */}
          {reportType === 'versions' && reportMode === 'missing' && (
            <>
              <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-700 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-red-900 dark:text-red-200 flex items-center gap-2">
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    Devices Missing: {selectedApplications.join(', ')}
                  </h3>
                  <span className="text-sm text-red-600 dark:text-red-400 font-medium">
                    {missingDevices.length} device{missingDevices.length !== 1 ? 's' : ''} without this application
                  </span>
                </div>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  These devices match your filter criteria but do not have the selected application installed.
                </p>
              </div>
              <div className="overflow-x-auto bg-white dark:bg-gray-800">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-red-50 dark:bg-red-900/30">
                    <tr>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/50 select-none"
                        onClick={() => handleMissingTableSort('deviceName')}
                      >
                        <div className="flex items-center gap-1">
                          Device
                          {missingTableSortColumn === 'deviceName' && (
                            <svg className={`w-4 h-4 transition-transform ${missingTableSortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/50 select-none"
                        onClick={() => handleMissingTableSort('serialNumber')}
                      >
                        <div className="flex items-center gap-1">
                          Serial Number
                          {missingTableSortColumn === 'serialNumber' && (
                            <svg className={`w-4 h-4 transition-transform ${missingTableSortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/50 select-none"
                        onClick={() => handleMissingTableSort('location')}
                      >
                        <div className="flex items-center gap-1">
                          Location
                          {missingTableSortColumn === 'location' && (
                            <svg className={`w-4 h-4 transition-transform ${missingTableSortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/50 select-none"
                        onClick={() => handleMissingTableSort('catalog')}
                      >
                        <div className="flex items-center gap-1">
                          Catalog
                          {missingTableSortColumn === 'catalog' && (
                            <svg className={`w-4 h-4 transition-transform ${missingTableSortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {missingDevices.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                          <div className="flex flex-col items-center justify-center">
                            <svg className="w-12 h-12 mb-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-lg font-medium mb-1 text-green-600 dark:text-green-400">All devices have this application!</p>
                            <p className="text-sm">No devices matching your filters are missing the selected application.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      missingDevices.map((device) => (
                        <tr key={device.serialNumber} className="hover:bg-red-50 dark:hover:bg-red-900/10">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Link
                              href={`/device/${device.serialNumber}#applications`}
                              className="text-sm font-medium text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                            >
                              {device.name || device.serialNumber}
                            </Link>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {device.serialNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {device.location || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {device.catalog || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                              Missing
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Versions Report Table - Shown for versions report type */}
          {reportType === 'versions' && reportMode === 'has' && sortedApplications.length > 0 && (
            <>
              <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    {selectedVersions.length > 0 ? (
                      <>
                        Filtered: {selectedVersions.length} version{selectedVersions.length > 1 ? 's' : ''} selected
                        <button 
                          onClick={() => setSelectedVersions([])}
                          className="ml-2 text-xs bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
                        >
                          Clear Selections
                        </button>
                      </>
                    ) : (
                      'Application Versions Inventory'
                    )}
                  </h3>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {sortedApplications.length} records
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto bg-white dark:bg-gray-800">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
                        onClick={() => handleDeviceTableSort('application')}
                      >
                        <div className="flex items-center gap-1">
                          Application
                          {deviceTableSortColumn === 'application' && (
                            <svg className={`w-4 h-4 transition-transform ${deviceTableSortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
                        onClick={() => handleDeviceTableSort('version')}
                      >
                        <div className="flex items-center gap-1">
                          Version
                          {deviceTableSortColumn === 'version' && (
                            <svg className={`w-4 h-4 transition-transform ${deviceTableSortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
                        onClick={() => handleDeviceTableSort('deviceName')}
                      >
                        <div className="flex items-center gap-1">
                          Device
                          {deviceTableSortColumn === 'deviceName' && (
                            <svg className={`w-4 h-4 transition-transform ${deviceTableSortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
                        onClick={() => handleDeviceTableSort('location')}
                      >
                        <div className="flex items-center gap-1">
                          Location
                          {deviceTableSortColumn === 'location' && (
                            <svg className={`w-4 h-4 transition-transform ${deviceTableSortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
                        onClick={() => handleDeviceTableSort('catalog')}
                      >
                        <div className="flex items-center gap-1">
                          Catalog
                          {deviceTableSortColumn === 'catalog' && (
                            <svg className={`w-4 h-4 transition-transform ${deviceTableSortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          )}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {(() => {
                      // Sort applications based on current sort column/direction
                      const sorted = [...sortedApplications].sort((a, b) => {
                        let aVal: string | undefined
                        let bVal: string | undefined
                        
                        switch (deviceTableSortColumn) {
                          case 'deviceName':
                            aVal = a.deviceName || a.serialNumber
                            bVal = b.deviceName || b.serialNumber
                            break
                          case 'application':
                            aVal = a.name
                            bVal = b.name
                            break
                          case 'version':
                            aVal = a.version
                            bVal = b.version
                            break
                          case 'location':
                            aVal = a.location || ''
                            bVal = b.location || ''
                            break
                          case 'catalog':
                            aVal = a.catalog || ''
                            bVal = b.catalog || ''
                            break
                          default:
                            aVal = a.name
                            bVal = b.name
                        }
                        
                        const comparison = (aVal || '').localeCompare(bVal || '')
                        return deviceTableSortDirection === 'desc' ? -comparison : comparison
                      })
                      
                      return sorted.map((app, index) => (
                        <tr key={`${app.serialNumber}-${app.name}-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {app.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            v{app.version}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/device/${app.serialNumber}#applications`}
                                className="text-sm font-medium text-gray-900 hover:text-gray-700 dark:text-white dark:hover:text-gray-200"
                              >
                                {app.deviceName || app.serialNumber}
                              </Link>
                              <PlatformBadge platform={app.platform || ''} size="sm" />
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {app.location || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {app.catalog || '-'}
                          </td>
                        </tr>
                      ))
                    })()}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Device Inventory Table - Shown when versions are selected in usage report */}
          {reportType === 'usage' && utilizationData && selectedVersions.length > 0 && utilizationData.versionDistribution && (
            <>
              <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Devices with Selected Versions
                  </h3>
                  <button
                    onClick={() => setSelectedVersions([])}
                    className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition-colors"
                  >
                    Clear Version Selection
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedVersions.map(versionFilter => {
                    const [appName, version] = versionFilter.split(':')
                    return (
                      <span key={versionFilter} className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-sm">
                        {appName} v{version}
                        <button
                          onClick={() => toggleVersion(version, appName)}
                          className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    )
                  })}
                </div>
              </div>
              <div className="overflow-x-auto bg-white dark:bg-gray-800">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
                        onClick={() => handleDeviceTableSort('deviceName')}
                      >
                        <div className="flex items-center gap-1">
                          Device Name
                          {deviceTableSortColumn === 'deviceName' && (
                            <svg className={`w-4 h-4 transition-transform ${deviceTableSortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
                        onClick={() => handleDeviceTableSort('serialNumber')}
                      >
                        <div className="flex items-center gap-1">
                          Serial Number
                          {deviceTableSortColumn === 'serialNumber' && (
                            <svg className={`w-4 h-4 transition-transform ${deviceTableSortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
                        onClick={() => handleDeviceTableSort('application')}
                      >
                        <div className="flex items-center gap-1">
                          Application
                          {deviceTableSortColumn === 'application' && (
                            <svg className={`w-4 h-4 transition-transform ${deviceTableSortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
                        onClick={() => handleDeviceTableSort('version')}
                      >
                        <div className="flex items-center gap-1">
                          Version
                          {deviceTableSortColumn === 'version' && (
                            <svg className={`w-4 h-4 transition-transform ${deviceTableSortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
                        onClick={() => handleDeviceTableSort('location')}
                      >
                        <div className="flex items-center gap-1">
                          Location
                          {deviceTableSortColumn === 'location' && (
                            <svg className={`w-4 h-4 transition-transform ${deviceTableSortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
                        onClick={() => handleDeviceTableSort('catalog')}
                      >
                        <div className="flex items-center gap-1">
                          Catalog
                          {deviceTableSortColumn === 'catalog' && (
                            <svg className={`w-4 h-4 transition-transform ${deviceTableSortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
                        onClick={() => handleDeviceTableSort('lastSeen')}
                      >
                        <div className="flex items-center gap-1">
                          Last Seen
                          {deviceTableSortColumn === 'lastSeen' && (
                            <svg className={`w-4 h-4 transition-transform ${deviceTableSortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          )}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {(() => {
                      // Build device list from versionDistribution based on selected versions
                      const devices: Array<{
                        id: string
                        appName: string
                        version: string
                        serialNumber: string
                        deviceName: string
                        location: string | null
                        catalog: string | null
                        lastSeen: string | null
                      }> = []
                      
                      selectedVersions.forEach(versionFilter => {
                        const [appName, version] = versionFilter.split(':')
                        const appData = utilizationData.versionDistribution![appName]
                        if (appData && appData.versions[version]) {
                          const versionInfo = appData.versions[version]
                          versionInfo.devices.forEach((device, idx) => {
                            devices.push({
                              id: `${appName}-${version}-${device.serialNumber}-${idx}`,
                              appName,
                              version,
                              serialNumber: device.serialNumber,
                              deviceName: device.deviceName || device.serialNumber,
                              location: device.location,
                              catalog: device.catalog,
                              lastSeen: device.lastSeen
                            })
                          })
                        }
                      })
                      
                      if (devices.length === 0) {
                        return (
                          <tr>
                            <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                              No devices found with the selected versions
                            </td>
                          </tr>
                        )
                      }
                      
                      // Sort devices based on selected column and direction
                      const sortedDevices = [...devices].sort((a, b) => {
                        let aVal: any = a[deviceTableSortColumn]
                        let bVal: any = b[deviceTableSortColumn]
                        
                        // Handle null/undefined values
                        if (aVal === null || aVal === undefined) aVal = ''
                        if (bVal === null || bVal === undefined) bVal = ''
                        
                        // Convert to string for comparison
                        aVal = String(aVal).toLowerCase()
                        bVal = String(bVal).toLowerCase()
                        
                        // For version column, use numeric comparison
                        if (deviceTableSortColumn === 'version') {
                          const comparison = aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: 'base' })
                          return deviceTableSortDirection === 'asc' ? comparison : -comparison
                        }
                        
                        // For lastSeen, compare as dates
                        if (deviceTableSortColumn === 'lastSeen') {
                          const aDate = a.lastSeen ? new Date(a.lastSeen).getTime() : 0
                          const bDate = b.lastSeen ? new Date(b.lastSeen).getTime() : 0
                          return deviceTableSortDirection === 'asc' ? aDate - bDate : bDate - aDate
                        }
                        
                        // Standard string comparison
                        if (aVal < bVal) return deviceTableSortDirection === 'asc' ? -1 : 1
                        if (aVal > bVal) return deviceTableSortDirection === 'asc' ? 1 : -1
                        return 0
                      })
                      
                      return sortedDevices.map((device) => (
                        <tr key={device.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Link
                              href={`/device/${device.serialNumber}#applications`}
                              className="text-sm font-medium text-gray-900 hover:text-gray-700 dark:text-white dark:hover:text-gray-200"
                            >
                              {device.deviceName}
                            </Link>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {device.serialNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {device.appName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            v{device.version}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {device.location || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {device.catalog || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {formatRelativeTime(device.lastSeen)}
                          </td>
                        </tr>
                      ))
                    })()}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ApplicationsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-black">
        <div className="animate-pulse">
          <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-32"></div>
            </div>
          </header>
        </div>
      </div>
    }>
      <ApplicationsPageContent />
    </Suspense>
  )
}
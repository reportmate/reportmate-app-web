"use client"

// Force dynamic rendering and disable caching for applications page
export const dynamic = 'force-dynamic'

import { useEffect, useState, Suspense, useMemo } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { formatRelativeTime } from "../../../src/lib/time"
import { DevicePageNavigation } from "../../../src/components/navigation/DevicePageNavigation"

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
  raw?: any
}

interface FilterOptions {
  applicationNames: string[]
  usages: string[]
  catalogs: string[]
  rooms: string[]
  fleets: string[]
  locations: string[]
}

interface VersionAnalysis {
  [appName: string]: {
    [version: string]: number
  }
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
    
    // Drivers and system components (more aggressive)
    /Driver$/i,
    /^Intel.*Driver/i,
    /^NVIDIA.*Driver/i,
    /^AMD.*Driver/i,
    /^AMD GPIO2 Driver/i,
    /^AMD Interface Driver/i,
    /^AMD PCI Driver/i,
    /^AMD PPM Provisioning File Driver/i,
    /^AMD PSP Driver/i,
    /^AMD_Chipset_Drivers/i,
    
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

// Group applications by normalized name
function groupApplicationsByNormalizedName(apps: ApplicationItem[]) {
  const grouped = new Map<string, ApplicationItem[]>()
  
  apps.forEach(app => {
    if (shouldIncludeApplication(app.name)) {
      const normalized = normalizeAppName(app.name)
      if (!grouped.has(normalized)) {
        grouped.set(normalized, [])
      }
      grouped.get(normalized)!.push(app)
    }
  })
  
  return grouped
}

function ApplicationsPageContent() {
  const [applications, setApplications] = useState<ApplicationItem[]>([])
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    applicationNames: [],
    usages: [],
    catalogs: [],
    rooms: [],
    fleets: [],
    locations: []
  })
  const [loading, setLoading] = useState(false)
  const [filtersLoading, setFiltersLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedApplications, setSelectedApplications] = useState<string[]>([])
  const [selectedUsages, setSelectedUsages] = useState<string[]>([])
  const [selectedCatalogs, setSelectedCatalogs] = useState<string[]>([])
  const [selectedRooms, setSelectedRooms] = useState<string[]>([])
  const [selectedFleets, setSelectedFleets] = useState<string[]>([])
  const [selectedVersions, setSelectedVersions] = useState<string[]>([])
  
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

  // Load filter options on mount
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        setFiltersLoading(true)
        const response = await fetch('/api/devices/applications/filters', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        })
        
        if (!response.ok) {
          throw new Error(`Failed to fetch filter options: ${response.status}`)
        }
        
        const data = await response.json()
        
        // Extract unique values for inventory-based filtering
        const usages = [...new Set(data.devices.map((d: any) => d.usage).filter(Boolean))] as string[]
        const catalogs = [...new Set(data.devices.map((d: any) => d.catalog).filter(Boolean))] as string[]
        const locations = [...new Set(data.devices.map((d: any) => d.location).filter(Boolean))] as string[]
        // Combine room and location data for comprehensive room filtering
        const rooms = [...new Set([
          ...data.devices.map((d: any) => d.location).filter(Boolean), // Primary source: location field
          ...data.devices.map((d: any) => d.room).filter(Boolean),     // Fallback: room field if exists  
        ])] as string[]
        const fleets = [...new Set(data.devices.map((d: any) => d.fleet).filter(Boolean))] as string[]
        
        console.log('📊 FILTER OPTIONS LOADED:', {
          devices: data.devices?.length || 0,
          applicationNames: data.applicationNames?.length || 0,
          usages: usages.length,
          catalogs: catalogs.length,
          rooms: rooms.length,
          fleets: fleets.length,
          locations: locations.length,
          first5Apps: data.applicationNames?.slice(0, 5) || []
        })

        setFilterOptions({
          applicationNames: data.applicationNames || [],
          usages,
          catalogs,
          locations,
          rooms,
          fleets
        })
        
      } catch (error) {
        console.error('Failed to fetch filter options:', error)
      } finally {
        setFiltersLoading(false)
      }
    }

    fetchFilterOptions()
  }, [])

  const fetchApplications = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const timestamp = new Date().toISOString()
      console.log(`${timestamp} - Fetching applications with filters:`, {
        search: searchQuery,
        applications: selectedApplications,
        usages: selectedUsages,
        catalogs: selectedCatalogs,
        rooms: selectedRooms
      })
      
      const params = new URLSearchParams()
      
      // Add filters to API call
      selectedApplications.forEach(app => {
        params.append('applicationNames', app)
      })
      
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim())
      }
      
      const apiUrl = `/api/devices/applications?${params.toString()}`
      
      const response = await fetch(apiUrl, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      
      console.log(`${timestamp} - API Response Status:`, response.status)
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log(`${timestamp} - API response received:`, { 
        isArray: Array.isArray(data), 
        length: Array.isArray(data) ? data.length : 'N/A'
      })
      
      if (Array.isArray(data)) {
        // Apply inventory-based client-side filtering
        let filteredData = data
        
        if (selectedUsages.length > 0) {
          filteredData = filteredData.filter(app => 
            selectedUsages.includes(app.usage?.toLowerCase() || '')
          )
        }
        
        if (selectedCatalogs.length > 0) {
          filteredData = filteredData.filter(app => 
            selectedCatalogs.includes(app.catalog?.toLowerCase() || '')
          )
        }
        
        if (selectedRooms.length > 0) {
          filteredData = filteredData.filter(app => 
            selectedRooms.some(room => app.location?.toLowerCase().includes(room.toLowerCase()) || app.room?.toLowerCase().includes(room.toLowerCase()))
          )
        }
        
        setApplications(filteredData)
        
        // Update application names in filter options using normalized names for deduplication
        const applicationNames = [...new Set(
          filteredData
            .filter(app => shouldIncludeApplication(app.name))
            .map(app => normalizeAppName(app.name))
        )].filter(Boolean) as string[]
        
        console.log(`🔧 Filtered applications: ${filteredData.length} -> ${applicationNames.length} unique normalized names`)
        console.log(`🔧 Filtered out ${filteredData.length - filteredData.filter(app => shouldIncludeApplication(app.name)).length} junk applications`)
        console.log('🔧 Sample normalization results:')
        filteredData
          .filter(app => shouldIncludeApplication(app.name))
          .slice(0, 10)
          .forEach(app => {
            const normalized = normalizeAppName(app.name)
            console.log(`  "${app.name}" -> "${normalized}"`)
          })
        console.log('🔧 First 10 unique normalized names:', applicationNames.slice(0, 10))
        console.log('🔧 Original vs Normalized examples:', 
          filteredData
            .filter(app => shouldIncludeApplication(app.name))
            .slice(0, 5)
            .map(app => ({
              original: app.name,
              normalized: normalizeAppName(app.name)
            }))
        )
        
        // Don't overwrite filterOptions.applicationNames - keep the full list for tag cloud
        
        console.log(`✅ Successfully loaded ${filteredData.length} applications`)
      } else {
        throw new Error('API returned invalid data format')
      }
      
    } catch (error) {
      console.error('❌ Failed to fetch applications:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setError(errorMessage)
      setApplications([])
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateReport = () => {
    fetchApplications()
  }

  const handleLoadAll = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/devices/applications?loadAll=true', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      
      if (!response.ok) {
        throw new Error(`Failed to load all applications: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (Array.isArray(data)) {
        setApplications(data)
        
        // Update application names in filter options using normalized names for deduplication
        const applicationNames = [...new Set(
          data
            .filter(app => shouldIncludeApplication(app.name))
            .map(app => normalizeAppName(app.name))
        )].filter(Boolean) as string[]
        
        console.log(`🔧 Filtered applications: ${data.length} -> ${applicationNames.length} unique normalized names`)
        console.log(`🔧 Filtered out ${data.length - data.filter(app => shouldIncludeApplication(app.name)).length} junk applications`)
        console.log('🔧 Sample normalization results:')
        data
          .filter(app => shouldIncludeApplication(app.name))
          .slice(0, 10)
          .forEach(app => {
            const normalized = normalizeAppName(app.name)
            console.log(`  "${app.name}" -> "${normalized}"`)
          })
        console.log('🔧 First 10 unique normalized names:', applicationNames.slice(0, 10))
        console.log('🔧 Original vs Normalized examples:', 
          data
            .filter(app => shouldIncludeApplication(app.name))
            .slice(0, 5)
            .map(app => ({
              original: app.name,
              normalized: normalizeAppName(app.name)
            }))
        )
        
        // Don't overwrite filterOptions.applicationNames - keep the full list for tag cloud
        
        console.log(`✅ Successfully loaded all ${data.length} applications`)
      } else {
        throw new Error('Invalid data format')
      }
      
    } catch (error) {
      console.error('❌ Failed to load all applications:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Filter applications for display (client-side filtering for real-time updates)
  const filteredApplications = applications.filter(app => {
    // First filter: exclude junk applications
    if (!shouldIncludeApplication(app.name)) return false
    
    const matchesSearch = !searchQuery.trim() || 
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.deviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.vendor.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesApplications = selectedApplications.length === 0 || 
      selectedApplications.includes(normalizeAppName(app.name))
    const matchesUsages = selectedUsages.length === 0 || selectedUsages.includes(app.usage?.toLowerCase() || '')
    const matchesCatalogs = selectedCatalogs.length === 0 || selectedCatalogs.includes(app.catalog?.toLowerCase() || '')
    const matchesRooms = selectedRooms.length === 0 || 
      selectedRooms.some(room => 
        app.location?.toLowerCase().includes(room.toLowerCase()) || 
        app.room?.toLowerCase().includes(room.toLowerCase())
      )
    const matchesFleets = selectedFleets.length === 0 || selectedFleets.includes(app.fleet || '')
    const matchesVersions = selectedVersions.length === 0 || 
      selectedVersions.some(versionFilter => {
        // Handle both app-specific (appName:version) and general version filters
        if (versionFilter.includes(':')) {
          const [filterAppName, filterVersion] = versionFilter.split(':')
          return app.name === filterAppName && (app.version || 'Unknown') === filterVersion
        } else {
          return (app.version || 'Unknown') === versionFilter
        }
      })
    
    return matchesSearch && matchesApplications && matchesUsages && matchesCatalogs && matchesRooms && matchesFleets && matchesVersions
  })

  // Calculate filter counts
  const getFilterCounts = () => {
    return {
      all: applications.length,
      assigned: applications.filter(app => app.usage?.toLowerCase() === 'assigned').length,
      shared: applications.filter(app => app.usage?.toLowerCase() === 'shared').length,
      curriculum: applications.filter(app => app.catalog?.toLowerCase() === 'curriculum').length,
      staff: applications.filter(app => app.catalog?.toLowerCase() === 'staff').length,
      faculty: applications.filter(app => app.catalog?.toLowerCase() === 'faculty').length,
      kiosk: applications.filter(app => app.catalog?.toLowerCase() === 'kiosk').length,
    }
  }

  const filterCounts = getFilterCounts()
  const hasActiveFilters = selectedApplications.length > 0 || searchQuery.trim() || 
                          selectedUsages.length > 0 || selectedCatalogs.length > 0 || selectedRooms.length > 0

  // Helper functions for tag management
  const toggleApplication = (app: string) => {
    setSelectedApplications(prev => 
      prev.includes(app) ? prev.filter(a => a !== app) : [...prev, app]
    )
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

  // Filter applications dropdown based on search and sort by popularity
  const filteredApplicationNames = useMemo(() => {
    // Debug: Check what data we're working with
    console.log('🔍 DEBUGGING filteredApplicationNames:', {
      'filterOptions.applicationNames.length': filterOptions.applicationNames.length,
      'applications.length': applications.length,
      'searchQuery': searchQuery,
      'selectedApplications': selectedApplications,
      'first10FilterOptions': filterOptions.applicationNames.slice(0, 10)
    })

    // Since filterOptions.applicationNames are already normalized, just filter by search
    const result = filterOptions.applicationNames
      .filter(name => name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort() // Alphabetical sort since we don't have counts without applications data
    
    // Debug logging
    console.log('🏷️ TAG CLOUD DATA:', {
      filterOptionsApps: filterOptions.applicationNames.length,
      searchQuery: searchQuery,
      filteredResults: result.length,
      first10Results: result.slice(0, 10)
    })
    
    return result
  }, [filterOptions.applicationNames, searchQuery])

  // Version analysis - group by application name and version
  const versionAnalysis = useMemo(() => {
    const analysis: VersionAnalysis = {}
    
    filteredApplications.forEach(app => {
      if (!analysis[app.name]) {
        analysis[app.name] = {}
      }
      const version = app.version || 'Unknown'
      analysis[app.name][version] = (analysis[app.name][version] || 0) + 1
    })
    
    return analysis
  }, [filteredApplications])

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
                  <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">Applications</h1>
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
                  fetchApplications()
                }}
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Try Again
              </button>
              <Link
                href="/dashboard"
                className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                ← Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      {/* Header - same as devices page */}
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
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                    Applications
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4 sm:pb-8 pt-4 sm:pt-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Applications Report {filteredApplications.length > 0 && `(${filteredApplications.length})`}
                {hasActiveFilters && applications.length > 0 && (
                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
                    (filtered)
                  </span>
                )}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {applications.length === 0 
                  ? 'Select applications and criteria to generate report'
                  : `Showing ${filteredApplications.length} of ${applications.length} applications`
                }
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
                  placeholder="Search to filter applications..."
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
              
              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {filteredApplications.length > 0 && (
                  <button
                    onClick={() => {
                      const csvContent = [
                        ['Device Name', 'Serial Number', 'Application', 'Version', 'Vendor', 'Category', 'Usage', 'Catalog', 'Room', 'Fleet', 'Last Seen'].join(','),
                        ...filteredApplications.map(app => [
                          app.deviceName,
                          app.serialNumber,
                          app.name,
                          app.version || '',
                          app.vendor || '',
                          app.category || '',
                          app.usage || '',
                          app.catalog || '',
                          app.room || '',
                          app.fleet || '',
                          formatRelativeTime(app.lastSeen)
                        ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
                      ].join('\n')
                      
                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
                      const link = document.createElement('a')
                      const url = URL.createObjectURL(blob)
                      link.setAttribute('href', url)
                      link.setAttribute('download', `applications-report-${new Date().toISOString().split('T')[0]}.csv`)
                      link.style.visibility = 'hidden'
                      document.body.appendChild(link)
                      link.click()
                      document.body.removeChild(link)
                    }}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export CSV
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Filter Clouds Section */}
          {!filtersLoading && (
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700">
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

                  {/* Fleet Filter */}
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

                </div>

                {/* Room Filter Cloud - Full Width */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Room {selectedRooms.length > 0 && `(${selectedRooms.length} selected)`}
                    </h3>
                  </div>
                  <div className="h-20 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-800">
                    <div className="flex flex-wrap gap-1">
                      {filterOptions.rooms
                        .filter(room => room.toLowerCase().includes(searchQuery.toLowerCase()))
                        .slice(0, 200).map(room => (
                        <button
                          key={room}
                          onClick={() => toggleRoom(room)}
                          className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                            selectedRooms.includes(room)
                              ? 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900 dark:text-purple-200 dark:border-purple-600'
                              : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-500'
                          }`}
                        >
                          {room}
                        </button>
                      ))}
                      {filterOptions.rooms.filter(room => room.toLowerCase().includes(searchQuery.toLowerCase())).length > 200 && (
                        <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                          +{filterOptions.rooms.filter(room => room.toLowerCase().includes(searchQuery.toLowerCase())).length - 200} more (search to filter)
                        </span>
                      )}
                      {filterOptions.rooms.length === 0 && (
                        <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                          No room data available
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Applications Filter Cloud */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Applications {selectedApplications.length > 0 && `(${selectedApplications.length} selected)`}
                    </h3>
                  </div>
                  <div className="h-32 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-800">
                    <div className="flex flex-wrap gap-1">
                      {filteredApplicationNames.map((name: string) => (
                        <button
                          key={name}
                          onClick={() => toggleApplication(name)}
                          className={`px-2 py-1 text-xs rounded-full border transition-colors ${
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
                          Generate report first to populate applications
                        </span>
                      )}
                      {filteredApplicationNames.length === 0 && searchQuery && (
                        <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                          No applications match "{searchQuery}"
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Main Action Buttons */}
                <div className="flex justify-center gap-3">
                  <button
                    onClick={handleGenerateReport}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm rounded-lg transition-colors"
                  >
                    {loading && <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>}
                    Generate Report
                  </button>
                  
                  <button
                    onClick={handleLoadAll}
                    disabled={loading}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white text-sm rounded-lg transition-colors"
                  >
                    Run All Apps Report
                  </button>
                  
                  {(selectedApplications.length > 0 || selectedUsages.length > 0 || selectedCatalogs.length > 0 || selectedRooms.length > 0 || selectedFleets.length > 0) && (
                    <button
                      onClick={clearAllFilters}
                      className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded-lg transition-colors"
                    >
                      Clear All Filters
                    </button>
                  )}
                </div>

              </div>
            </div>
          )}
          


          {/* Content Area */}
          {loading ? (
            <div className="px-6 py-8">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600 dark:text-gray-400">Loading applications...</span>
              </div>
            </div>
          ) : applications.length === 0 ? (
            <div></div>
          ) : (
            <>
              {/* Version Analysis Section */}
              {filteredApplications.length > 0 && (
                <div className="px-6 py-4 bg-yellow-50 dark:bg-yellow-900/20 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Version Analysis
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {Object.entries(versionAnalysis).map(([appName, versions]) => (
                      <div key={appName} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 p-4">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-3 truncate" title={appName}>
                          {appName}
                        </h4>
                        <div className="space-y-2">
                          {Object.entries(versions)
                            .sort(([,a], [,b]) => b - a) // Sort by count descending
                            .map(([version, count]) => (
                            <div key={version} className="flex items-center justify-between">
                              <button 
                                onClick={() => toggleVersion(`${appName}:${version}`)}
                                className={`text-sm truncate flex-1 mr-2 text-left px-2 py-1 rounded transition-colors ${
                                  selectedVersions.includes(`${appName}:${version}`) 
                                    ? 'bg-primary text-primary-foreground' 
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                                title={`Filter by ${appName} ${version} (${count} devices)`}
                              >
                                {version}
                              </button>
                              <div className="flex items-center gap-2">
                                <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2 flex-1 min-w-[60px]">
                                  <div 
                                    className="bg-blue-500 h-2 rounded-full" 
                                    style={{ 
                                      width: `${(count / Math.max(...Object.values(versions))) * 100}%` 
                                    }}
                                  ></div>
                                </div>
                                <span className="text-sm font-medium text-gray-900 dark:text-white min-w-[30px] text-right">
                                  {count}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Total: {Object.values(versions).reduce((a, b) => a + b, 0)} installations
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Application
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Device
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Version
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Publisher
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Usage
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Catalog
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Location
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredApplications.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                        <div className="flex flex-col items-center justify-center">
                          <svg className="w-12 h-12 mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <p className="text-lg font-medium mb-1">No applications found</p>
                          <p className="text-sm">Try adjusting your search or filter criteria.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredApplications.map((app) => (
                      <tr key={app.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td className="px-4 lg:px-6 py-4">
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 dark:text-white truncate">
                              {app.name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                              {app.architecture !== 'Unknown' && app.architecture}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 lg:px-6 py-4">
                          <Link
                            href={`/device/${encodeURIComponent(app.serialNumber)}`}
                            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          >
                            <div className="text-sm text-gray-900 dark:text-white font-medium">
                              {app.deviceName}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                              {app.serialNumber}
                            </div>
                          </Link>
                        </td>
                        <td className="px-4 lg:px-6 py-4">
                          <div className="text-sm text-gray-900 dark:text-white font-mono">
                            {app.version || '-'}
                          </div>
                        </td>
                        <td className="px-4 lg:px-6 py-4">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {app.publisher !== 'Unknown' ? app.publisher : '-'}
                          </div>
                        </td>
                        <td className="px-4 lg:px-6 py-4">
                          {app.usage ? (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              app.usage.toLowerCase() === 'assigned' 
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            }`}>
                              {app.usage}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-4 lg:px-6 py-4">
                          {app.catalog ? (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              app.catalog.toLowerCase() === 'curriculum' 
                                ? 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200'
                                : app.catalog.toLowerCase() === 'staff'
                                ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                                : app.catalog.toLowerCase() === 'faculty'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                : app.catalog.toLowerCase() === 'kiosk'
                                ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                            }`}>
                              {app.catalog}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-4 lg:px-6 py-4">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {app.location || '-'}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
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
"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { calculateDeviceStatus } from "../../../src/lib/data-processing"
import DeviceFilters, { FilterOptions } from "../../../src/components/shared/DeviceFilters"
import { usePlatformFilterSafe, normalizePlatform } from "../../../src/providers/PlatformFilterProvider"
import { CollapsibleSection } from "../../../src/components/ui/CollapsibleSection"
import { useScrollCollapse } from "../../../src/hooks/useScrollCollapse"

interface Security {
  id: string
  deviceId: string
  deviceName: string
  serialNumber: string
  lastSeen: string
  collectedAt: string
  platform: string
  // Protection
  firewallEnabled: boolean
  antivirus?: { name: string; enabled: boolean }
  gatekeeperEnabled: boolean
  systemIntegrityProtection: boolean
  // Encryption
  fileVaultEnabled: boolean
  tpmPresent?: boolean
  // Boot Security
  secureBootLevel: string
  externalBootLevel: string
  // Access Control
  activationLockEnabled: boolean
  remoteDesktopEnabled: boolean
  screenLockEnabled: boolean
  passwordPolicyEnforced: boolean
  autoLoginUser: string
  // SSH
  secureShell?: {
    statusDisplay: string
    isConfigured: boolean
    isServiceRunning: boolean
  }
  // EDR
  edrStatus?: string
  edrActive?: boolean
  // CVEs
  cveCount?: number
  criticalCveCount?: number
  // Certificates
  certificateCount?: number
  expiredCertCount?: number
  expiringSoonCertCount?: number
  // Tampering
  tpmEnabled?: boolean
  secureBootEnabled?: boolean
  sipEnabled?: boolean
  // Inventory
  status?: string
  catalog?: string
  usage?: string
  location?: string
  assetTag?: string
  raw?: any
}

function LoadingSkeleton() {
  return (
    <div>
      {/* Widgets Accordion Skeleton */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="w-full px-6 py-3 flex items-center justify-between bg-white dark:bg-gray-800 animate-pulse">
          <div className="flex items-center gap-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
          </div>
          <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
      
      {/* Widgets Content Skeleton */}
      <div className="px-6 py-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 animate-pulse">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-3"></div>
              <div className="flex items-start gap-6">
                <div className="relative w-32 h-32 flex-shrink-0">
                  <div className="w-full h-full bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                </div>
                <div className="flex-1 space-y-2">
                  {[...Array(4)].map((_, j) => (
                    <div key={j} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 flex-1">
                        <div className="w-3 h-3 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded flex-1 max-w-[80px]"></div>
                      </div>
                      <div className="h-4 w-6 bg-gray-200 dark:bg-gray-700 rounded ml-2"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Filters Accordion Skeleton */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="w-full px-6 py-3 flex items-center justify-between bg-white dark:bg-gray-800 animate-pulse">
          <div className="flex items-center gap-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
          </div>
          <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="flex-1 overflow-x-auto overflow-y-auto min-h-0">
        <div className="min-w-full">
          <div className="bg-gray-50 dark:bg-gray-700 px-3 py-2 border-b border-gray-200 dark:border-gray-600">
            <div className="flex space-x-8">
              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-16"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-20"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-16"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-24"></div>
            </div>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {[...Array(15)].map((_, i) => (
              <div key={i} className="px-3 py-3 flex space-x-8">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-28"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function SecurityPageContent() {
  const searchParams = useSearchParams()
  const { platformFilter: globalPlatformFilter, isPlatformVisible } = usePlatformFilterSafe()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [security, setSecurity] = useState<Security[]>([])
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [protectionFilter, setProtectionFilter] = useState('all')
  
  // Shared filter states
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [selectedCatalogs, setSelectedCatalogs] = useState<string[]>([])
  const [selectedAreas, setSelectedAreas] = useState<string[]>([])
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [selectedFleets, setSelectedFleets] = useState<string[]>([])
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [selectedUsages, setSelectedUsages] = useState<string[]>([])
  
  // Sorting state
  const [sortColumn, setSortColumn] = useState<'device' | 'lastSeen' | 'protection' | 'encryption' | 'edr' | 'cve' | 'tampering' | 'certificates'>('device')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  
  // Accordion states
  const [widgetsExpanded, setWidgetsExpanded] = useState(true)
  const [filtersExpanded, setFiltersExpanded] = useState(false)

  const { tableContainerRef, effectiveFiltersExpanded, effectiveWidgetsExpanded } = useScrollCollapse(
    { filters: filtersExpanded, widgets: widgetsExpanded },
    { enabled: !loading }
  )
  
  // Donut chart category expansion
  const [, setExpandedCategories] = useState<Set<string>>(new Set())
  
  const _toggleCategory = (categoryLabel: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(categoryLabel)) {
        newSet.delete(categoryLabel)
      } else {
        newSet.add(categoryLabel)
      }
      return newSet
    })
  }

  // Filter toggle functions
  const toggleStatus = (status: string) => {
    setSelectedStatuses(prev => 
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    )
  }
  
  const toggleCatalog = (catalog: string) => {
    setSelectedCatalogs(prev => 
      prev.includes(catalog) ? prev.filter(c => c !== catalog) : [...prev, catalog]
    )
  }
  
  const toggleArea = (area: string) => {
    setSelectedAreas(prev => 
      prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
    )
  }
  
  const toggleLocation = (location: string) => {
    setSelectedLocations(prev => 
      prev.includes(location) ? prev.filter(l => l !== location) : [...prev, location]
    )
  }
  
  const toggleFleet = (fleet: string) => {
    setSelectedFleets(prev => 
      prev.includes(fleet) ? prev.filter(f => f !== fleet) : [...prev, fleet]
    )
  }
  
  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev, platform]
    )
  }
  
  const toggleUsage = (usage: string) => {
    setSelectedUsages(prev => 
      prev.includes(usage) ? prev.filter(u => u !== usage) : [...prev, usage]
    )
  }
  
  const clearAllFilters = () => {
    setSelectedStatuses([])
    setSelectedCatalogs([])
    setSelectedAreas([])
    setSelectedLocations([])
    setSelectedFleets([])
    setSelectedPlatforms([])
    setSelectedUsages([])
    setProtectionFilter('all')
    setSearchQuery('')
  }
  
  const handleSort = (column: typeof sortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  useEffect(() => {
    const fetchSecurity = async () => {
      try {
        const response = await fetch('/api/modules/security', {
          cache: 'no-store',
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        })
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        
        // Enrich with calculated status
        const enrichedData = data.map((s: any) => ({
          ...s,
          status: calculateDeviceStatus(s.lastSeen)
        }))
        
        setSecurity(enrichedData)
      } catch (err) {
        console.error('Error fetching security:', err)
        setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchSecurity()
  }, [])

  // Calculate stats for widgets
  const protectionStatusCounts = security.reduce((acc, curr) => {
    const isProtected = curr.firewallEnabled && curr.fileVaultEnabled
    const label = isProtected ? 'Protected' : 'Needs Attention'
    acc[label] = (acc[label] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const encryptionCounts = security.reduce((acc, curr) => {
    const label = curr.fileVaultEnabled ? 'Encrypted' : 'Not Encrypted'
    acc[label] = (acc[label] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const _firewallCounts = security.reduce((acc, curr) => {
    const label = curr.firewallEnabled ? 'Enabled' : 'Disabled'
    acc[label] = (acc[label] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const edrCounts = security.reduce((acc, curr) => {
    const label = curr.edrActive ? 'Active' : 'Inactive'
    acc[label] = (acc[label] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const _sshCounts = security.reduce((acc, curr) => {
    let label = 'Unknown'
    if (curr.secureShell?.isServiceRunning) {
      label = curr.secureShell?.isConfigured ? 'Configured' : 'Running (Not Configured)'
    } else if (curr.secureShell?.statusDisplay) {
      label = 'Disabled'
    }
    acc[label] = (acc[label] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Calculate certificate counts for widgets
  const certificateCounts = security.reduce((acc, curr) => {
    const expired = curr.expiredCertCount || 0
    const expiringSoon = curr.expiringSoonCertCount || 0
    if (expired > 0) {
      acc['Expired'] = (acc['Expired'] || 0) + 1
    }
    if (expiringSoon > 0) {
      acc['Expiring Soon'] = (acc['Expiring Soon'] || 0) + 1
    }
    if (expired === 0 && expiringSoon === 0) {
      acc['Valid'] = (acc['Valid'] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)

  const certificateColors: Record<string, string> = {
    'Expired': '#ef4444',      // red
    'Expiring Soon': '#f59e0b', // amber
    'Valid': '#22c55e'          // green
  }

  // Create filter options
  const filterOptions: FilterOptions = {
    statuses: [...new Set(security.map(s => s.status).filter((s): s is string => Boolean(s)))].sort(),
    catalogs: [...new Set(security.map(s => s.catalog).filter((s): s is string => Boolean(s)))].sort(),
    areas: [],
    locations: [...new Set(security.map(s => s.location).filter((s): s is string => Boolean(s)))].sort(),
    fleets: [],
    platforms: [...new Set(security.map(s => normalizePlatform(s.platform)).filter(p => p !== 'unknown'))].sort(),
    usages: [...new Set(security.map(s => s.usage).filter((s): s is string => Boolean(s)))].sort()
  }

  // Apply filters
  const filteredSecurity = security.filter(s => {
    // Global platform filter
    if (globalPlatformFilter !== 'all') {
      const platform = normalizePlatform(s.platform)
      if (!isPlatformVisible(platform)) {
        return false
      }
    }
    
    // Protection filter
    if (protectionFilter === 'protected') {
      if (!s.firewallEnabled || !s.fileVaultEnabled) return false
    } else if (protectionFilter === 'unprotected') {
      if (s.firewallEnabled && s.fileVaultEnabled) return false
    }
    
    // Status filter
    if (selectedStatuses.length > 0 && s.status && !selectedStatuses.includes(s.status)) {
      return false
    }
    
    // Catalog filter
    if (selectedCatalogs.length > 0 && s.catalog && !selectedCatalogs.includes(s.catalog)) {
      return false
    }
    
    // Location filter
    if (selectedLocations.length > 0 && s.location && !selectedLocations.includes(s.location)) {
      return false
    }
    
    // Platform filter
    if (selectedPlatforms.length > 0) {
      const platform = normalizePlatform(s.platform)
      if (!selectedPlatforms.includes(platform)) {
        return false
      }
    }
    
    // Usage filter
    if (selectedUsages.length > 0 && s.usage && !selectedUsages.includes(s.usage)) {
      return false
    }
    
    // Search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      return (
        s.deviceName?.toLowerCase().includes(query) ||
        s.secureBootLevel?.toLowerCase().includes(query) ||
        s.autoLoginUser?.toLowerCase().includes(query) ||
        s.serialNumber?.toLowerCase().includes(query)
      )
    }
    
    return true
  }).sort((a, b) => {
    let aValue: string = ''
    let bValue: string = ''
    
    switch (sortColumn) {
      case 'device':
        aValue = a.deviceName?.toLowerCase() || ''
        bValue = b.deviceName?.toLowerCase() || ''
        break
      case 'lastSeen':
        aValue = a.lastSeen || ''
        bValue = b.lastSeen || ''
        break
      case 'protection':
        aValue = (a.firewallEnabled && a.fileVaultEnabled) ? '1' : '0'
        bValue = (b.firewallEnabled && b.fileVaultEnabled) ? '1' : '0'
        break
      case 'encryption':
        aValue = a.fileVaultEnabled ? '1' : '0'
        bValue = b.fileVaultEnabled ? '1' : '0'
        break
      case 'edr':
        aValue = a.edrActive ? '1' : '0'
        bValue = b.edrActive ? '1' : '0'
        break
      case 'cve':
        aValue = String(a.cveCount || 0).padStart(5, '0')
        bValue = String(b.cveCount || 0).padStart(5, '0')
        break
      case 'tampering':
        const aSecure = normalizePlatform(a.platform) === 'Windows' ? (a.tpmPresent && a.tpmEnabled) : a.secureBootEnabled
        const bSecure = normalizePlatform(b.platform) === 'Windows' ? (b.tpmPresent && b.tpmEnabled) : b.secureBootEnabled
        aValue = aSecure ? '1' : '0'
        bValue = bSecure ? '1' : '0'
        break
      case 'certificates':
        aValue = String(a.certificateCount || 0).padStart(5, '0')
        bValue = String(b.certificateCount || 0).padStart(5, '0')
        break
    }
    
    if (sortDirection === 'asc') {
      return aValue.localeCompare(bValue)
    } else {
      return bValue.localeCompare(aValue)
    }
  })

  // DonutChart component
  const DonutChart = ({ 
    data, 
    colors, 
    title,
    onFilter,
    selectedFilter
  }: { 
    data: { label: string; value: number }[]; 
    colors: Record<string, string>; 
    title: string;
    onFilter?: (label: string) => void;
    selectedFilter?: string;
  }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0)
    let cumulativePercent = 0
    const radius = 32
    const circumference = 2 * Math.PI * radius

    if (total === 0) return <div className="text-center text-gray-500 py-8">No data available</div>

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{title}</h3>
        <div className="flex items-start gap-6">
          <div className="relative w-32 h-32 flex-shrink-0">
            <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
              {data.map((item) => {
                const percent = item.value / total
                const strokeDasharray = `${percent * circumference} ${circumference}`
                const strokeDashoffset = -cumulativePercent * circumference
                cumulativePercent += percent
                
                return (
                  <circle
                    key={item.label}
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="transparent"
                    stroke={colors[item.label] || colors['default'] || '#cbd5e1'}
                    strokeWidth="16"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-300"
                  />
                )
              })}
            </svg>
          </div>
          <div className="flex-1 space-y-2">
            {data.map(item => {
              const isSelected = selectedFilter === item.label
              return (
                <div 
                  key={item.label}
                  className={`flex items-center justify-between text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 p-1 rounded transition-colors ${isSelected ? 'bg-gray-100 dark:bg-gray-700 font-medium ring-1 ring-gray-200 dark:ring-gray-600' : ''}`}
                  onClick={() => onFilter && onFilter(isSelected ? 'all' : item.label)}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[item.label] || colors['default'] || '#cbd5e1' }} />
                    <span className="text-gray-600 dark:text-gray-300">{item.label}</span>
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">{item.value}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // Colors for charts
  const protectionColors: Record<string, string> = {
    'Protected': '#22c55e',
    'Needs Attention': '#ef4444',
    'default': '#94a3b8'
  }

  const encryptionColors: Record<string, string> = {
    'Encrypted': '#22c55e',
    'Not Encrypted': '#ef4444',
    'default': '#94a3b8'
  }

  const _firewallColors: Record<string, string> = {
    'Enabled': '#22c55e',
    'Disabled': '#ef4444',
    'default': '#94a3b8'
  }

  const edrColors: Record<string, string> = {
    'Active': '#22c55e',
    'Inactive': '#ef4444',
    'default': '#94a3b8'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse"></div>
            </div>
            <LoadingSkeleton />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-4rem)] bg-gray-50 dark:bg-black flex flex-col overflow-hidden">
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col min-h-0">
        <div className="flex-1 bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col min-h-0 overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Device Security</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Security status and protection settings - {filteredSecurity.length} devices
                </p>
              </div>
              <div className="flex items-center gap-4">
                {/* Search */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search security..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-48 md:w-64 pl-10 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Under Development Notice */}
          <div className="px-6 py-4 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  Under Development
                </h3>
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                  This security dashboard is currently under construction. DATA IS NOT ACCURATE YET..
                </p>
              </div>
            </div>
          </div>

          {/* Selections Accordion */}
          <DeviceFilters
            filterOptions={filterOptions}
            selectedStatuses={selectedStatuses}
            selectedCatalogs={selectedCatalogs}
            selectedAreas={selectedAreas}
            selectedLocations={selectedLocations}
            selectedFleets={selectedFleets}
            selectedPlatforms={selectedPlatforms}
            selectedUsages={selectedUsages}
            onStatusToggle={toggleStatus}
            onCatalogToggle={toggleCatalog}
            onAreaToggle={toggleArea}
            onLocationToggle={toggleLocation}
            onFleetToggle={toggleFleet}
            onPlatformToggle={togglePlatform}
            onUsageToggle={toggleUsage}
            onClearAll={clearAllFilters}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            expanded={effectiveFiltersExpanded}
            onToggle={() => setFiltersExpanded(!effectiveFiltersExpanded)}
          />

          {/* Widgets Accordion */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setWidgetsExpanded(!effectiveWidgetsExpanded)}
              className="w-full px-6 py-3 flex items-center justify-between bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Widgets</span>
              <svg 
                className={`w-5 h-5 text-gray-400 transition-transform ${effectiveWidgetsExpanded ? 'rotate-90' : 'rotate-180'}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Widgets Content */}
            <CollapsibleSection expanded={effectiveWidgetsExpanded}>
            <div className="px-6 py-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <DonutChart 
                  title="Protection Status"
                  data={Object.entries(protectionStatusCounts).map(([label, value]) => ({ label, value }))}
                  colors={protectionColors}
                  onFilter={(label) => setProtectionFilter(label === 'Protected' ? 'protected' : label === 'Needs Attention' ? 'unprotected' : 'all')}
                  selectedFilter={protectionFilter === 'protected' ? 'Protected' : protectionFilter === 'unprotected' ? 'Needs Attention' : undefined}
                />
                <DonutChart 
                  title="Encryption"
                  data={Object.entries(encryptionCounts).map(([label, value]) => ({ label, value }))}
                  colors={encryptionColors}
                />
                <DonutChart 
                  title="Detection"
                  data={Object.entries(edrCounts).map(([label, value]) => ({ label, value }))}
                  colors={edrColors}
                />
                <DonutChart 
                  title="Certificates"
                  data={Object.entries(certificateCounts).map(([label, value]) => ({ label, value }))}
                  colors={certificateColors}
                />
              </div>
            </div>
            </CollapsibleSection>
          </div>

          {/* Table */}
          <div ref={tableContainerRef} className="flex-1 overflow-auto min-h-0 table-scrollbar">
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none" onClick={() => handleSort('encryption')}>Encryption</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none" onClick={() => handleSort('edr')}>Detection</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none" onClick={() => handleSort('cve')}>Vulnerabilities</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none" onClick={() => handleSort('tampering')}>Tampering</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none" onClick={() => handleSort('certificates')}>Certificates</th>
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
                        <p className="text-base font-medium text-gray-900 dark:text-white mb-2">Failed to load security data</p>
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
                ) : filteredSecurity.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">No security records found</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">No security records match your current filters.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredSecurity.map((sec) => (
                    <tr key={sec.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 max-w-56">
                        <Link 
                          href={`/device/${sec.serialNumber}#security`}
                          className="group block min-w-0"
                          title={sec.deviceName || 'Unknown Device'}
                        >
                          <div className="text-sm font-medium text-gray-900 group-hover:text-gray-700 dark:text-white dark:group-hover:text-gray-200 truncate">{sec.deviceName || 'Unknown'}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">
                            {sec.serialNumber}
                            {sec.assetTag && (
                              <span className="ml-1">| {sec.assetTag}</span>
                            )}
                          </div>
                        </Link>
                      </td>
                      {/* Encryption - FileVault (Mac) / BitLocker (Windows) */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          sec.fileVaultEnabled 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {normalizePlatform(sec.platform) === 'Windows' ? 'BitLocker' : 'FileVault'} {sec.fileVaultEnabled ? 'On' : 'Off'}
                        </span>
                      </td>
                      {/* Detection Status */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          sec.edrActive 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {sec.edrActive ? 'Active' : 'Inactive'}
                        </span>
                        {sec.edrStatus && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate max-w-[120px]" title={sec.edrStatus}>
                            {sec.edrStatus}
                          </div>
                        )}
                      </td>
                      {/* CVE Counts */}
                      <td className="px-6 py-4">
                        {(sec.cveCount !== undefined && sec.cveCount > 0) ? (
                          <div className="flex items-center gap-2">
                            {sec.criticalCveCount !== undefined && sec.criticalCveCount > 0 && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                {sec.criticalCveCount} Critical
                              </span>
                            )}
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {sec.cveCount} total
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-green-600 dark:text-green-400">None</span>
                        )}
                      </td>
                      {/* Tampering - Secure Boot (Mac) / TPM (Windows) */}
                      <td className="px-6 py-4">
                        {normalizePlatform(sec.platform) === 'Windows' ? (
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            sec.tpmPresent && sec.tpmEnabled
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}>
                            TPM {sec.tpmPresent && sec.tpmEnabled ? 'Active' : 'Inactive'}
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              sec.secureBootEnabled
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                              Secure Boot {sec.secureBootEnabled ? 'On' : 'Off'}
                            </span>
                            {sec.sipEnabled !== undefined && (
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                sec.sipEnabled
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              }`}>
                                SIP {sec.sipEnabled ? 'On' : 'Off'}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      {/* Certificates - Expired/Expiring Soon counts */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {sec.expiredCertCount !== undefined && sec.expiredCertCount > 0 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                              {sec.expiredCertCount} Expired
                            </span>
                          )}
                          {sec.expiringSoonCertCount !== undefined && sec.expiringSoonCertCount > 0 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                              {sec.expiringSoonCertCount} Expiring
                            </span>
                          )}
                          {(!sec.expiredCertCount || sec.expiredCertCount === 0) && 
                           (!sec.expiringSoonCertCount || sec.expiringSoonCertCount === 0) && (
                            <span className="text-sm text-green-600 dark:text-green-400">OK</span>
                          )}
                        </div>
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

export default function SecurityPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-black animate-pulse"></div>}>
      <SecurityPageContent />
    </Suspense>
  )
}

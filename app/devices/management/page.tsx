"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { DevicePageNavigation } from "../../../src/components/navigation/DevicePageNavigation"
import { CopyButton } from "../../../src/components/ui/CopyButton"
import { calculateDeviceStatus } from "../../../src/lib/data-processing"

interface Management {
  id: string
  deviceId: string
  deviceName: string
  serialNumber: string
  lastSeen: string
  collectedAt: string
  provider: string
  enrollmentStatus: string
  enrollmentType: string
  intuneId: string
  tenantName: string
  isEnrolled: boolean
  // Inventory fields
  usage?: string
  catalog?: string
  status?: string
  assetTag?: string
  location?: string
  department?: string
  raw: any
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8">
      {/* Widgets Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 h-48 animate-pulse">
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-6"></div>
            <div className="flex items-center justify-center h-24">
              <div className="w-24 h-24 rounded-full border-4 border-gray-200 dark:border-gray-700"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
        </div>
        <div className="p-4 space-y-4">
          {[...Array(15)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4 py-1">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/6"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/6"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/6"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ManagementPageContent() {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [management, setManagement] = useState<Management[]>([])
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [providerFilter, setProviderFilter] = useState('all')
  const [enrollmentStatusFilter, setEnrollmentStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  
  // Inventory filters
  const [deviceStatusFilter, setDeviceStatusFilter] = useState('all')
  const [usageFilter, setUsageFilter] = useState('all')
  const [catalogFilter, setCatalogFilter] = useState('all')
  
  // Sorting state - default to Device column ascending
  const [sortColumn, setSortColumn] = useState<'device' | 'provider' | 'status' | 'type' | 'deviceId'>('device')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  
  // Accordion states
  const [widgetsExpanded, setWidgetsExpanded] = useState(true)
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  
  // Handle column sort click
  const handleSort = (column: 'device' | 'provider' | 'status' | 'type' | 'deviceId') => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  useEffect(() => {
    const fetchManagement = async () => {
      try {
        console.log('🚀 Fetching management data...')
        
        // OPTIMIZED: Single consolidated API call for management data with inventory
        const response = await fetch('/api/devices/management', { 
          cache: 'no-store',
          credentials: 'include',
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
        })
        
        if (!response.ok) throw new Error(`Management API failed: ${response.status}`)
        
        const managementList = await response.json()
        console.log(`✅ Loaded ${Array.isArray(managementList) ? managementList.length : 0} management records`)
        
        // Map API response to Management interface
        const combinedData = (Array.isArray(managementList) ? managementList : []).map((mgmt: any) => {
          const status = calculateDeviceStatus(mgmt.lastSeen)
          
          // Normalize provider - "Microsoft Intune (Co-managed)" -> "Microsoft Intune"
          let provider = mgmt.provider || 'Unknown'
          if (provider.startsWith('Microsoft Intune')) {
            provider = 'Microsoft Intune'
          }
          
          // BUGFIX: Determine enrollmentType from deviceState (source of truth)
          // The mdmEnrollment.enrollmentType was incorrectly set in older client versions
          const deviceState = mgmt.raw?.deviceState
          let enrollmentType = mgmt.enrollmentType || 'Unknown'
          if (deviceState) {
            // Use deviceState flags as the authoritative source
            if (deviceState.domainJoined && deviceState.entraJoined) {
              enrollmentType = 'Hybrid Entra Join'
            } else if (deviceState.entraJoined) {
              enrollmentType = 'Entra Joined'
            } else if (deviceState.domainJoined) {
              enrollmentType = 'Domain Joined'
            }
          }
          
          return {
            id: mgmt.serialNumber || mgmt.deviceId,
            deviceId: mgmt.deviceId,
            deviceName: mgmt.deviceName || mgmt.serialNumber,
            serialNumber: mgmt.serialNumber,
            lastSeen: mgmt.lastSeen,
            collectedAt: mgmt.collectedAt || mgmt.lastSeen,
            provider: provider,
            enrollmentStatus: mgmt.enrollmentStatus || 'Unknown',
            enrollmentType: enrollmentType,
            intuneId: mgmt.intuneId || 'N/A',
            tenantName: mgmt.tenantName || '',
            isEnrolled: mgmt.isEnrolled || false,
            // Inventory fields from consolidated response
            usage: mgmt.usage,
            catalog: mgmt.catalog,
            status: status,
            assetTag: mgmt.assetTag,
            location: mgmt.location,
            department: mgmt.department,
            raw: mgmt.raw || mgmt
          }
        })
        
        setManagement(combinedData)
      } catch (err) {
        console.error('❌ Error fetching management:', err)
        setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchManagement()
  }, [])

  // Calculate stats for widgets (filter out Unknown and N/A)
  const enrollmentStatusCounts = management.reduce((acc, curr) => {
    const status = curr.enrollmentStatus || 'Unknown'
    if (status !== 'Unknown' && status !== 'N/A') {
      acc[status] = (acc[status] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)

  const enrollmentTypeCounts = management.reduce((acc, curr) => {
    let type = curr.enrollmentType || 'Unknown'
    // Normalize labels
    if (type === 'Hybrid Entra Join') type = 'Domain Joined'
    if (type === 'Entra Join') type = 'Entra Joined'
    // Include all types except Unknown and N/A
    if (type !== 'Unknown' && type !== 'N/A') {
      acc[type] = (acc[type] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)

  // Count Broken Trust - Domain-joined devices with trustStatus === 'Broken'
  // Use deviceState.domainJoined as source of truth (not enrollmentType)
  const brokenTrustCount = management.filter(m => {
    const isDomainJoined = m.raw?.deviceState?.domainJoined === true
    const trustStatus = m.raw?.domainTrust?.trustStatus
    return isDomainJoined && trustStatus === 'Broken'
  }).length

  // Count Unconfirmed Trust - Domain Joined devices without domainTrust data yet
  // Use deviceState.domainJoined as source of truth
  const unconfirmedTrustCount = management.filter(m => {
    const isDomainJoined = m.raw?.deviceState?.domainJoined === true
    const hasDomainTrust = m.raw?.domainTrust != null
    return isDomainJoined && !hasDomainTrust
  }).length

  // Get unique providers with counts (filter out Unknown)
  const providers = Array.from(new Set(
    management.map(m => m.provider).filter(p => p && p !== 'Unknown')
  )).sort()

  // Calculate provider counts (exclude Unknown)
  const providerCounts = providers.reduce((acc, provider) => {
    acc[provider] = management.filter(m => m.provider === provider).length
    return acc
  }, {} as Record<string, number>)

  // Filter management first, then calculate counts based on filtered data
  const baseFilteredManagement = management.filter(m => {
    // Search query - includes management and inventory fields
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesSearch = 
        m.deviceName.toLowerCase().includes(query) ||
        m.serialNumber.toLowerCase().includes(query) ||
        (m.intuneId && m.intuneId.toLowerCase().includes(query)) ||
        m.provider.toLowerCase().includes(query) ||
        // Inventory fields
        (m.usage && m.usage.toLowerCase().includes(query)) ||
        (m.catalog && m.catalog.toLowerCase().includes(query)) ||
        (m.assetTag && m.assetTag.toLowerCase().includes(query)) ||
        (m.location && m.location.toLowerCase().includes(query)) ||
        (m.department && m.department.toLowerCase().includes(query))
      
      if (!matchesSearch) return false
    }

    // Provider filter
    if (providerFilter !== 'all' && m.provider !== providerFilter) return false
    
    // Enrollment Status filter
    if (enrollmentStatusFilter !== 'all' && m.enrollmentStatus !== enrollmentStatusFilter) return false

    // Type filter - map display names back to raw values
    if (typeFilter !== 'all') {
      const deviceState = m.raw?.deviceState
      const isDomainJoined = deviceState?.domainJoined === true
      
      // Special handling for Broken Trust filter - must be domain-joined with broken trust
      if (typeFilter === 'Broken Trust') {
        const trustStatus = m.raw?.domainTrust?.trustStatus
        // Only show as Broken Trust if device is domain-joined AND trust is broken
        if (!isDomainJoined || trustStatus !== 'Broken') return false
      } else if (typeFilter === 'Unconfirmed') {
        // Unconfirmed filter - Domain Joined devices without domainTrust data
        const hasDomainTrust = m.raw?.domainTrust != null
        if (!isDomainJoined || hasDomainTrust) return false
      } else if (typeFilter === 'Domain Joined') {
        // Domain Joined filter shows ALL domain-joined devices (use deviceState as source of truth)
        if (!isDomainJoined) return false
      } else if (typeFilter === 'Entra Joined') {
        // Entra Joined filter - cloud-only devices (Entra but NOT domain-joined)
        const isEntraOnly = deviceState?.entraJoined === true && !isDomainJoined
        if (!isEntraOnly) return false
      } else {
        // Other filters - match the enrollmentType directly
        if (m.enrollmentType !== typeFilter) return false
      }
    }

    return true
  })

  // Calculate inventory filter counts based on data filtered by widgets/search (not inventory filters)
  const filterCounts = {
    active: baseFilteredManagement.filter(m => m.status?.toLowerCase() === 'active').length,
    stale: baseFilteredManagement.filter(m => m.status?.toLowerCase() === 'stale').length,
    missing: baseFilteredManagement.filter(m => m.status?.toLowerCase() === 'missing').length,
    assigned: baseFilteredManagement.filter(m => m.usage?.toLowerCase() === 'assigned').length,
    shared: baseFilteredManagement.filter(m => m.usage?.toLowerCase() === 'shared').length,
    curriculum: baseFilteredManagement.filter(m => m.catalog?.toLowerCase() === 'curriculum').length,
    staff: baseFilteredManagement.filter(m => m.catalog?.toLowerCase() === 'staff').length,
    faculty: baseFilteredManagement.filter(m => m.catalog?.toLowerCase() === 'faculty').length,
    kiosk: baseFilteredManagement.filter(m => m.catalog?.toLowerCase() === 'kiosk').length,
  }

  // Apply inventory filters to get final filtered list
  const filteredManagement = baseFilteredManagement.filter(m => {
    if (deviceStatusFilter !== 'all' && m.status?.toLowerCase() !== deviceStatusFilter) return false
    if (usageFilter !== 'all' && m.usage?.toLowerCase() !== usageFilter) return false
    if (catalogFilter !== 'all' && m.catalog?.toLowerCase() !== catalogFilter) return false
    return true
  }).sort((a, b) => {
    // Apply sorting
    let aValue: string = ''
    let bValue: string = ''
    
    switch (sortColumn) {
      case 'device':
        aValue = a.deviceName?.toLowerCase() || ''
        bValue = b.deviceName?.toLowerCase() || ''
        break
      case 'provider':
        aValue = a.provider?.toLowerCase() || ''
        bValue = b.provider?.toLowerCase() || ''
        break
      case 'status':
        aValue = a.enrollmentStatus?.toLowerCase() || ''
        bValue = b.enrollmentStatus?.toLowerCase() || ''
        break
      case 'type':
        aValue = a.enrollmentType?.toLowerCase() || ''
        bValue = b.enrollmentType?.toLowerCase() || ''
        break
      case 'deviceId':
        aValue = a.intuneId?.toLowerCase() || ''
        bValue = b.intuneId?.toLowerCase() || ''
        break
    }
    
    if (sortDirection === 'asc') {
      return aValue.localeCompare(bValue)
    } else {
      return bValue.localeCompare(aValue)
    }
  })

  // Helper for Donut Chart
  const DonutChart = ({ 
    data, 
    colors, 
    title,
    onFilter,
    selectedFilter,
    nestedItems = []
  }: { 
    data: { label: string; value: number }[]; 
    colors: Record<string, string>; 
    title: string;
    onFilter?: (label: string) => void;
    selectedFilter?: string;
    nestedItems?: { parentLabel: string; items: { label: string; value: number }[] }[];
  }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0)
    let cumulativePercent = 0
    const radius = 32
    const circumference = 2 * Math.PI * radius

    // Build a map of parent labels to their nested items
    const nestedMap = new Map<string, { label: string; value: number }[]>()
    nestedItems.forEach(n => nestedMap.set(n.parentLabel, n.items))

    if (total === 0) return <div className="text-center text-gray-500 py-8">No data available</div>

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{title}</h3>
        <div className="flex items-center gap-6">
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
            {/* Build set of nested item labels to exclude from main legend */}
            {(() => {
              const nestedLabels = new Set<string>()
              nestedItems.forEach(n => n.items.forEach(i => nestedLabels.add(i.label)))
              
              return data
                .filter(item => !nestedLabels.has(item.label)) // Exclude nested items from main list
                .map(item => {
                  const isSelected = selectedFilter === item.label
                  const nested = nestedMap.get(item.label)
                  return (
                    <div key={item.label}>
                      <div 
                        className={`flex items-center justify-between text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 p-1 rounded transition-colors ${isSelected ? 'bg-gray-100 dark:bg-gray-700 font-medium ring-1 ring-gray-200 dark:ring-gray-600' : ''}`}
                        onClick={() => onFilter && onFilter(isSelected ? 'all' : item.label)}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[item.label] || colors['default'] || '#cbd5e1' }} />
                          <span className="text-gray-600 dark:text-gray-300 truncate max-w-[120px]" title={item.label}>{item.label}</span>
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">{item.value}</span>
                      </div>
                      {/* Render nested items indented under parent */}
                      {nested && nested.length > 0 && (
                        <div className="ml-5 mt-1 space-y-1 border-l-2 border-gray-200 dark:border-gray-600 pl-2">
                          {nested.map(nestedItem => {
                            const isNestedSelected = selectedFilter === nestedItem.label
                            return (
                              <div 
                                key={nestedItem.label}
                                className={`flex items-center justify-between text-xs cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 p-1 rounded transition-colors ${isNestedSelected ? 'bg-gray-100 dark:bg-gray-700 font-medium ring-1 ring-gray-200 dark:ring-gray-600' : ''}`}
                                onClick={() => onFilter && onFilter(isNestedSelected ? 'all' : nestedItem.label)}
                              >
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[nestedItem.label] || colors['default'] || '#cbd5e1' }} />
                                  <span className="text-gray-500 dark:text-gray-400 truncate max-w-[100px]" title={nestedItem.label}>{nestedItem.label}</span>
                                </div>
                                <span className="font-medium text-gray-700 dark:text-gray-300">{nestedItem.value}</span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })
            })()}
          </div>
        </div>
      </div>
    )
  }

  // Helper for Collection Table Widget
  const CollectionWidget = ({ 
    title, 
    data, 
    colors,
    onFilter,
    selectedFilter
  }: { 
    title: string; 
    data: { label: string; value: number }[]; 
    colors: Record<string, string>;
    onFilter?: (label: string) => void;
    selectedFilter?: string;
  }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0)
    
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{title}</h3>
        <div className="h-32 overflow-y-auto space-y-3 pr-2">
          {data.map((item) => {
            const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0
            const color = colors[item.label] || colors['default'] || 'bg-gray-500'
            const bgClass = color.replace('text-', 'bg-').replace('800', '600').replace('900', '600') // Simple heuristic for bar color
            const isSelected = selectedFilter === item.label
            
            return (
              <div 
                key={item.label}
                className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 p-1 rounded transition-colors ${isSelected ? 'bg-gray-100 dark:bg-gray-700 font-medium ring-1 ring-gray-200 dark:ring-gray-600' : ''}`}
                onClick={() => onFilter && onFilter(isSelected ? 'all' : item.label)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate" title={item.label}>
                    {item.label}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {item.value}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${item.label === 'Microsoft Intune' ? 'bg-blue-600' : item.label === 'Apple' ? 'bg-gray-600' : 'bg-purple-600'}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            )
          })}
          {data.length === 0 && (
            <div className="text-center text-gray-500 py-4">No data available</div>
          )}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black">
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
                  <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <LoadingSkeleton />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black">
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
                  <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error loading management data</h3>
                <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                  <p>{error}</p>
                </div>
              </div>
            </div>
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
                {/* Squircle Icon - Teal for Management */}
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-500 to-yellow-600 dark:from-yellow-600 dark:to-yellow-700 flex items-center justify-center shadow-sm">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          
          {/* Widgets Accordion */}
          <div className={widgetsExpanded ? '' : 'border-b border-gray-200 dark:border-gray-700'}>
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
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Widget 1: Provider Collection (Swapped) */}
                <CollectionWidget 
                  title="Providers"
                  data={Object.entries(providerCounts).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)}
                  colors={{
                    'Microsoft Intune': 'text-blue-600',
                    'Apple': 'text-gray-600',
                    'default': 'text-purple-600'
                  }}
                  onFilter={setProviderFilter}
                  selectedFilter={providerFilter}
                />

                {/* Widget 2: Enrollment Status Donut (Swapped) */}
                <DonutChart 
                  title="Enrollment Status"
                  data={Object.entries(enrollmentStatusCounts).map(([label, value]) => ({ label, value }))}
                  colors={{
                    'Enrolled': '#10b981', // emerald-500
                    'Pending': '#f59e0b', // amber-500
                    'Unenrolled': '#ef4444', // red-500
                    'Not Enrolled': '#ef4444', // red-500
                    'Error': '#ef4444',
                    'default': '#94a3b8' // slate-400
                  }}
                  onFilter={setEnrollmentStatusFilter}
                  selectedFilter={enrollmentStatusFilter}
                />

                {/* Widget 3: Enrollment Type Donut - Trust status shown as subset indicators */}
                <DonutChart 
                  title="Enrollment Type"
                  data={[
                    // Show enrollment types in order: Entra Joined, Domain Joined, then trust status indicators
                    ...Object.entries(enrollmentTypeCounts)
                      .sort(([a], [b]) => {
                        // Entra Joined first, Domain Joined second
                        if (a === 'Entra Joined') return -1
                        if (b === 'Entra Joined') return 1
                        return a.localeCompare(b)
                      })
                      .map(([label, value]) => ({ label, value })),
                    // Unconfirmed (orange) - devices without domainTrust data - shown in donut, nested in legend
                    ...(unconfirmedTrustCount > 0 ? [{ label: 'Unconfirmed', value: unconfirmedTrustCount }] : []),
                    // Broken Trust (red) - devices with broken trust - shown in donut, nested in legend
                    ...(brokenTrustCount > 0 ? [{ label: 'Broken Trust', value: brokenTrustCount }] : [])
                  ]}
                  colors={{
                    'Entra Joined': '#10b981', // emerald-500
                    'Domain Joined': '#f59e0b', // amber-500 (Yellow) - domain joined
                    'Unconfirmed': '#f97316', // orange-500 - unconfirmed trust status
                    'Broken Trust': '#ef4444', // red-500 - broken trust
                    'AxM Assigned': '#10b981', // emerald-500
                    'default': '#8b5cf6' // violet-500
                  }}
                  onFilter={setTypeFilter}
                  selectedFilter={typeFilter}
                  nestedItems={[
                    {
                      parentLabel: 'Domain Joined',
                      items: [
                        // Broken Trust first, then Unconfirmed
                        ...(brokenTrustCount > 0 ? [{ label: 'Broken Trust', value: brokenTrustCount }] : []),
                        ...(unconfirmedTrustCount > 0 ? [{ label: 'Unconfirmed', value: unconfirmedTrustCount }] : [])
                      ]
                    }
                  ]}
                />
              </div>
            </div>
          )}

          {/* Selections Accordion Section */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Selections</span>
                {(deviceStatusFilter !== 'all' || usageFilter !== 'all' || catalogFilter !== 'all') && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 rounded-full">
                    {[deviceStatusFilter, usageFilter, catalogFilter].filter(f => f !== 'all').length} active
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
                {/* Device Status Filter */}
                <div>
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Device Status</div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 'active', label: 'Active', count: filterCounts.active, color: 'emerald' },
                      { value: 'stale', label: 'Stale', count: filterCounts.stale, color: 'yellow' },
                      { value: 'missing', label: 'Missing', count: filterCounts.missing, color: 'red' }
                    ].filter(opt => opt.count > 0).map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setDeviceStatusFilter(deviceStatusFilter === opt.value ? 'all' : opt.value)}
                        className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                          deviceStatusFilter === opt.value
                            ? `bg-${opt.color}-100 dark:bg-${opt.color}-900/30 text-${opt.color}-800 dark:text-${opt.color}-200 border-${opt.color}-300 dark:border-${opt.color}-700`
                            : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                        }`}
                      >
                        {opt.label} ({opt.count})
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Usage Filter */}
                <div>
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Usage</div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 'assigned', label: 'Assigned', count: filterCounts.assigned },
                      { value: 'shared', label: 'Shared', count: filterCounts.shared }
                    ].filter(opt => opt.count > 0).map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setUsageFilter(usageFilter === opt.value ? 'all' : opt.value)}
                        className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                          usageFilter === opt.value
                            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700'
                            : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                        }`}
                      >
                        {opt.label} ({opt.count})
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Catalog Filter */}
                <div>
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Catalog</div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 'curriculum', label: 'Curriculum', count: filterCounts.curriculum },
                      { value: 'staff', label: 'Staff', count: filterCounts.staff },
                      { value: 'faculty', label: 'Faculty', count: filterCounts.faculty },
                      { value: 'kiosk', label: 'Kiosk', count: filterCounts.kiosk }
                    ].filter(opt => opt.count > 0).map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setCatalogFilter(catalogFilter === opt.value ? 'all' : opt.value)}
                        className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                          catalogFilter === opt.value
                            ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-200 border-teal-300 dark:border-teal-700'
                            : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                        }`}
                      >
                        {opt.label} ({opt.count})
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Clear Selections */}
                {(deviceStatusFilter !== 'all' || usageFilter !== 'all' || catalogFilter !== 'all') && (
                  <div className="pt-2">
                    <button
                      onClick={() => {
                        setDeviceStatusFilter('all')
                        setUsageFilter('all')
                        setCatalogFilter('all')
                      }}
                      className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline"
                    >
                      Clear all selections
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Device Management</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  MDM enrollment and configuration • {filteredManagement.length} devices
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Clear Selections Button */}
                {(providerFilter !== 'all' || enrollmentStatusFilter !== 'all' || typeFilter !== 'all' || deviceStatusFilter !== 'all' || usageFilter !== 'all' || catalogFilter !== 'all' || searchQuery !== '') && (
                  <button
                    onClick={() => {
                      setProviderFilter('all')
                      setEnrollmentStatusFilter('all')
                      setTypeFilter('all')
                      setDeviceStatusFilter('all')
                      setUsageFilter('all')
                      setCatalogFilter('all')
                      setSearchQuery('')
                    }}
                    className="px-3 py-1.5 text-sm font-medium bg-yellow-100 text-yellow-800 border border-yellow-300 rounded-lg hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-300 dark:border-yellow-600 dark:hover:bg-yellow-800 transition-colors"
                  >
                    Clear selections
                  </button>
                )}
                
                {/* Search */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search management..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-48 md:w-64 pl-10 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                
                {/* Export to CSV Button */}
                <button
                  onClick={() => {
                    // Build CSV from filtered data only
                    const headers = ['Device Name', 'Serial Number', 'Asset Tag', 'Provider', 'Enrollment Status', 'Enrollment Type', 'Intune Device ID', 'Tenant', 'Trust Status']
                    const rows = filteredManagement.map(m => {
                      let displayType = m.enrollmentType || ''
                      if (displayType === 'Hybrid Entra Join') displayType = 'Domain Joined'
                      if (displayType === 'Entra Join') displayType = 'Entra Joined'
                      const trustStatus = m.raw?.domainTrust?.trustStatus || ''
                      return [
                        m.deviceName || '',
                        m.serialNumber || '',
                        m.assetTag || '',
                        m.provider || '',
                        m.enrollmentStatus || '',
                        displayType,
                        m.intuneId || '',
                        m.tenantName || '',
                        trustStatus
                      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
                    })
                    
                    const csv = [headers.join(','), ...rows].join('\n')
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                    const url = URL.createObjectURL(blob)
                    const link = document.createElement('a')
                    link.href = url
                    link.download = `management-report-${new Date().toISOString().split('T')[0]}.csv`
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
          
          {/* Inventory Filters */}
          <div className="border-b border-gray-200 dark:border-gray-600 px-4 lg:px-6 py-3 bg-gray-50 dark:bg-gray-700">
            <nav className="flex flex-wrap gap-2 items-center">
              {/* Status Filters */}
              {[
                { key: 'active', label: 'Active', count: filterCounts.active, type: 'status', colors: 'bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200 dark:bg-emerald-900 dark:text-emerald-300 dark:border-emerald-600 dark:hover:bg-emerald-800' },
                { key: 'stale', label: 'Stale', count: filterCounts.stale, type: 'status', colors: 'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200 dark:bg-amber-900 dark:text-amber-300 dark:border-amber-600 dark:hover:bg-amber-800' },
                { key: 'missing', label: 'Missing', count: filterCounts.missing, type: 'status', colors: 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-800' },
              ].map((filter) => {
                const isActive = deviceStatusFilter === filter.key
                
                return (
                  <button
                    key={filter.key}
                    onClick={() => setDeviceStatusFilter(deviceStatusFilter === filter.key ? 'all' : filter.key)}
                    className={`${
                      isActive
                        ? filter.colors
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-500'
                    } px-3 py-1.5 border rounded-lg text-sm font-medium flex items-center gap-2 transition-colors`}
                  >
                    <span>{filter.label}</span>
                    <span className={`${
                      isActive 
                        ? 'bg-white/20 text-current'
                        : 'bg-gray-200 text-gray-700 dark:bg-gray-500 dark:text-gray-200'
                    } inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ml-1`}>
                      {filter.count}
                    </span>
                  </button>
                )
              })}
              
              {/* Separator - Status/Usage */}
              <div className="flex items-center px-2">
                <div className="h-6 w-px bg-gradient-to-b from-transparent via-gray-300 to-transparent dark:via-gray-500"></div>
              </div>
              
              {/* Usage Filters */}
              {[
                { key: 'assigned', label: 'Assigned', count: filterCounts.assigned, type: 'usage', colors: 'bg-yellow-100 text-yellow-700 border-yellow-300 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-300 dark:border-yellow-600 dark:hover:bg-yellow-800' },
                { key: 'shared', label: 'Shared', count: filterCounts.shared, type: 'usage', colors: 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-600 dark:hover:bg-blue-800' },
              ].map((filter) => {
                const isActive = usageFilter === filter.key
                
                return (
                  <button
                    key={filter.key}
                    onClick={() => setUsageFilter(usageFilter === filter.key ? 'all' : filter.key)}
                    className={`${
                      isActive
                        ? filter.colors
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-500'
                    } px-3 py-1.5 border rounded-lg text-sm font-medium flex items-center gap-2 transition-colors`}
                  >
                    <span>{filter.label}</span>
                    <span className={`${
                      isActive 
                        ? 'bg-white/20 text-current'
                        : 'bg-gray-200 text-gray-700 dark:bg-gray-500 dark:text-gray-200'
                    } inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ml-1`}>
                      {filter.count}
                    </span>
                  </button>
                )
              })}
              
              {/* Separator - Usage/Catalog */}
              <div className="flex items-center px-2">
                <div className="h-6 w-px bg-gradient-to-b from-transparent via-gray-300 to-transparent dark:via-gray-500"></div>
              </div>
              
              {/* Catalog Filters */}
              {[
                { key: 'curriculum', label: 'Curriculum', count: filterCounts.curriculum, type: 'catalog', colors: 'bg-teal-100 text-teal-700 border-teal-300 hover:bg-teal-200 dark:bg-teal-900 dark:text-teal-300 dark:border-teal-600 dark:hover:bg-teal-800' },
                { key: 'staff', label: 'Staff', count: filterCounts.staff, type: 'catalog', colors: 'bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200 dark:bg-orange-900 dark:text-orange-300 dark:border-orange-600 dark:hover:bg-orange-800' },
                { key: 'faculty', label: 'Faculty', count: filterCounts.faculty, type: 'catalog', colors: 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200 dark:bg-red-900 dark:text-red-300 dark:border-red-600 dark:hover:bg-red-800' },
                { key: 'kiosk', label: 'Kiosk', count: filterCounts.kiosk, type: 'catalog', colors: 'bg-cyan-100 text-cyan-700 border-cyan-300 hover:bg-cyan-200 dark:bg-cyan-900 dark:text-cyan-300 dark:border-cyan-600 dark:hover:bg-cyan-800' },
              ].map((filter) => {
                const isActive = catalogFilter === filter.key
                
                return (
                  <button
                    key={filter.key}
                    onClick={() => setCatalogFilter(catalogFilter === filter.key ? 'all' : filter.key)}
                    className={`${
                      isActive
                        ? filter.colors
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-500'
                    } px-3 py-1.5 border rounded-lg text-sm font-medium flex items-center gap-2 transition-colors`}
                  >
                    <span>{filter.label}</span>
                    <span className={`${
                      isActive 
                        ? 'bg-white/20 text-current'
                        : 'bg-gray-200 text-gray-700 dark:bg-gray-500 dark:text-gray-200'
                    } inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ml-1`}>
                      {filter.count}
                    </span>
                  </button>
                )
              })}
            </nav>
          </div>

          <div className="overflow-x-auto max-h-[calc(100vh-400px)]">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
                <tr>
                  <th 
                    onClick={() => handleSort('device')}
                    className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-56 bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none"
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
                    onClick={() => handleSort('provider')}
                    className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-44 bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none"
                  >
                    <div className="flex items-center gap-1">
                      Provider
                      {sortColumn === 'provider' && (
                        <svg className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('status')}
                    className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-36 bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none"
                  >
                    <div className="flex items-center gap-1">
                      Status
                      {sortColumn === 'status' && (
                        <svg className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('type')}
                    className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-40 bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none"
                  >
                    <div className="flex items-center gap-1">
                      Type
                      {sortColumn === 'type' && (
                        <svg className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('deviceId')}
                    className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-72 bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none"
                  >
                    <div className="flex items-center gap-1">
                      Device ID
                      {sortColumn === 'deviceId' && (
                        <svg className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredManagement.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">No management records found</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">No management records match your current search.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredManagement.map((mgmt) => (
                    <tr key={mgmt.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        <Link 
                          href={`/device/${mgmt.serialNumber}#management`}
                          className="flex items-center text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-300"
                        >
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{mgmt.deviceName}</div>
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 font-mono">
                              <span className="inline-flex items-center gap-0.5">
                                {mgmt.serialNumber}
                                <CopyButton value={mgmt.serialNumber} size="sm" />
                              </span>
                              {mgmt.assetTag && (
                                <>
                                  <span className="text-gray-400 dark:text-gray-500">•</span>
                                  <span className="inline-flex items-center gap-0.5">
                                    {mgmt.assetTag}
                                    <CopyButton value={mgmt.assetTag} size="sm" />
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-3 py-1.5 text-sm text-gray-900 dark:text-white">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          mgmt.provider === 'Microsoft Intune'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            : mgmt.provider === 'Apple'
                            ? 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                            : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                        }`}>
                          {mgmt.provider}
                        </span>
                      </td>
                      <td className="px-3 py-1.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          mgmt.enrollmentStatus === 'Enrolled'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : mgmt.enrollmentStatus === 'Pending'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            : (mgmt.enrollmentStatus === 'Not Enrolled' || mgmt.enrollmentStatus === 'Unenrolled')
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                        }`}>
                          {mgmt.enrollmentStatus}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-sm text-gray-900 dark:text-white">
                        <div className="flex flex-col gap-1 items-start">
                          {(() => {
                            let displayType = mgmt.enrollmentType || '-'
                            if (displayType === 'Hybrid Entra Join') displayType = 'Domain Joined'
                            if (displayType === 'Entra Join') displayType = 'Entra Joined'
                            return (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium w-fit ${
                                displayType === 'Entra Joined' || displayType === 'AxM Assigned'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : displayType === 'Domain Joined'
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                              }`}>
                                {displayType}
                              </span>
                            )
                          })()}
                          {/* Show trust status indicator for Domain Joined (Hybrid Entra Join) devices */}
                          {(mgmt.enrollmentType === 'Hybrid Entra Join' || mgmt.enrollmentType === 'Domain Joined') && (() => {
                            // Check domainTrust.trustStatus - API returns 'Healthy' or 'Broken'
                            const domainTrust = mgmt.raw?.domainTrust
                            
                            // No domainTrust data yet = Unconfirmed (orange)
                            if (!domainTrust) {
                              return (
                                <span 
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium w-fit bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" 
                                  title="Trust status not yet reported by client"
                                >
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                  </svg>
                                  Unconfirmed
                                </span>
                              )
                            }
                            
                            const trustStatus = domainTrust?.trustStatus
                            const secureChannelValid = domainTrust?.secureChannelValid
                            const hasTrustIssue = trustStatus === 'Broken' || secureChannelValid === false
                            
                            // Broken trust = red pill
                            if (hasTrustIssue) {
                              return (
                                <span 
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium w-fit bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" 
                                  title={`Trust: ${trustStatus || 'Unknown'}, Secure Channel: ${secureChannelValid === true ? 'Valid' : secureChannelValid === false ? 'Invalid' : 'Unknown'}`}
                                >
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                  Broken
                                </span>
                              )
                            }
                            return null
                          })()}
                        </div>
                      </td>
                      <td className="px-3 py-1.5 text-sm text-gray-900 dark:text-white">
                        <div className="flex items-center gap-2 font-mono text-xs">
                          <span className="break-all">{mgmt.intuneId}</span>
                          {mgmt.intuneId && mgmt.intuneId !== 'N/A' && (
                            <CopyButton value={mgmt.intuneId} size="sm" />
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

export default function ManagementPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-black animate-pulse"></div>}>
      <ManagementPageContent />
    </Suspense>
  )
}

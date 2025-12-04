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

  useEffect(() => {
    const fetchManagement = async () => {
      try {
        console.log('🚀 Fetching management data...')
        
        // OPTIMIZED: Single consolidated API call for management data with inventory
        const response = await fetch('/api/devices/management', { 
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
        })
        
        if (!response.ok) throw new Error(`Management API failed: ${response.status}`)
        
        const managementList = await response.json()
        console.log(`✅ Loaded ${Array.isArray(managementList) ? managementList.length : 0} management records`)
        
        // Map API response to Management interface
        const combinedData = (Array.isArray(managementList) ? managementList : []).map((mgmt: any) => {
          const status = calculateDeviceStatus(mgmt.lastSeen)
          
          return {
            id: mgmt.serialNumber || mgmt.deviceId,
            deviceId: mgmt.deviceId,
            deviceName: mgmt.deviceName || mgmt.serialNumber,
            serialNumber: mgmt.serialNumber,
            lastSeen: mgmt.lastSeen,
            collectedAt: mgmt.collectedAt || mgmt.lastSeen,
            provider: mgmt.provider || 'Unknown',
            enrollmentStatus: mgmt.enrollmentStatus || 'Unknown',
            enrollmentType: mgmt.enrollmentType || 'Unknown',
            intuneId: mgmt.intuneId || 'N/A',
            tenantName: mgmt.tenantName || '',
            isEnrolled: mgmt.isEnrolled || false,
            // Inventory fields from consolidated response
            usage: mgmt.usage,
            catalog: mgmt.catalog,
            status: status,
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

  // Calculate stats for widgets
  const enrollmentStatusCounts = management.reduce((acc, curr) => {
    const status = curr.enrollmentStatus || 'Unknown'
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const enrollmentTypeCounts = management.reduce((acc, curr) => {
    const type = curr.enrollmentType || 'Unknown'
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Get unique providers with counts
  const providers = Array.from(new Set(
    management.map(m => m.provider).filter(Boolean)
  )).sort()

  // Calculate provider counts
  const providerCounts = providers.reduce((acc, provider) => {
    acc[provider] = management.filter(m => m.provider === provider).length
    return acc
  }, {} as Record<string, number>)

  // Calculate inventory filter counts
  const filterCounts = {
    active: management.filter(m => m.status?.toLowerCase() === 'active').length,
    stale: management.filter(m => m.status?.toLowerCase() === 'stale').length,
    missing: management.filter(m => m.status?.toLowerCase() === 'missing').length,
    assigned: management.filter(m => m.usage?.toLowerCase() === 'assigned').length,
    shared: management.filter(m => m.usage?.toLowerCase() === 'shared').length,
    curriculum: management.filter(m => m.catalog?.toLowerCase() === 'curriculum').length,
    staff: management.filter(m => m.catalog?.toLowerCase() === 'staff').length,
    faculty: management.filter(m => m.catalog?.toLowerCase() === 'faculty').length,
    kiosk: management.filter(m => m.catalog?.toLowerCase() === 'kiosk').length,
  }

  // Filter management
  const filteredManagement = management.filter(m => {
    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesSearch = 
        m.deviceName.toLowerCase().includes(query) ||
        m.serialNumber.toLowerCase().includes(query) ||
        (m.intuneId && m.intuneId.toLowerCase().includes(query)) ||
        m.provider.toLowerCase().includes(query)
      
      if (!matchesSearch) return false
    }

    // Provider filter
    if (providerFilter !== 'all' && m.provider !== providerFilter) return false
    
    // Enrollment Status filter
    if (enrollmentStatusFilter !== 'all' && m.enrollmentStatus !== enrollmentStatusFilter) return false

    // Type filter
    if (typeFilter !== 'all' && m.enrollmentType !== typeFilter) return false

    // Inventory filters
    if (deviceStatusFilter !== 'all' && m.status?.toLowerCase() !== deviceStatusFilter) return false
    if (usageFilter !== 'all' && m.usage?.toLowerCase() !== usageFilter) return false
    if (catalogFilter !== 'all' && m.catalog?.toLowerCase() !== catalogFilter) return false

    return true
  })

  // Helper for Donut Chart
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
                    <span className="text-gray-600 dark:text-gray-300 truncate max-w-[120px]" title={item.label}>{item.label}</span>
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
                  <div className="min-w-0">
                    <h1 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                      Management Report
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
                  <div className="min-w-0">
                    <h1 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                      Management Report
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
                <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                    Management Report
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Widgets Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
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
              'Error': '#ef4444',
              'default': '#94a3b8' // slate-400
            }}
            onFilter={setEnrollmentStatusFilter}
            selectedFilter={enrollmentStatusFilter}
          />

          {/* Widget 3: Enrollment Type Donut */}
          <DonutChart 
            title="Enrollment Type"
            data={Object.entries(enrollmentTypeCounts).map(([label, value]) => ({ label, value }))}
            colors={{
              'Entra Join': '#10b981', // emerald-500
              'Hybrid Entra Join': '#f59e0b', // amber-500 (Yellow)
              'AxM Assigned': '#10b981', // emerald-500
              'default': '#8b5cf6' // violet-500
            }}
            onFilter={setTypeFilter}
            selectedFilter={typeFilter}
          />
        </div>

        <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Device Management</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  MDM enrollment and configuration • {filteredManagement.length} devices
                  {(providerFilter !== 'all' || enrollmentStatusFilter !== 'all' || typeFilter !== 'all' || deviceStatusFilter !== 'all' || usageFilter !== 'all' || catalogFilter !== 'all') && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-0.5 rounded-full">
                      Filtered
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Clear Filters Button */}
                {(providerFilter !== 'all' || enrollmentStatusFilter !== 'all' || typeFilter !== 'all' || deviceStatusFilter !== 'all' || usageFilter !== 'all' || catalogFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setProviderFilter('all')
                      setEnrollmentStatusFilter('all')
                      setTypeFilter('all')
                      setDeviceStatusFilter('all')
                      setUsageFilter('all')
                      setCatalogFilter('all')
                    }}
                    className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline"
                  >
                    Clear filters
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
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-56 bg-gray-50 dark:bg-gray-700">Device</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-44 bg-gray-50 dark:bg-gray-700">Provider</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-36 bg-gray-50 dark:bg-gray-700">Status</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-40 bg-gray-50 dark:bg-gray-700">Type</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-72 bg-gray-50 dark:bg-gray-700">Device ID</th>
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
                          href={`/device/${mgmt.deviceId}`}
                          className="flex items-center hover:text-yellow-600 dark:hover:text-yellow-400"
                        >
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{mgmt.deviceName}</div>
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 font-mono">
                              <span>{mgmt.serialNumber}</span>
                              <CopyButton value={mgmt.serialNumber} size="sm" />
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
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          mgmt.enrollmentType === 'Entra Join' || mgmt.enrollmentType === 'AxM Assigned'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : mgmt.enrollmentType === 'Hybrid Entra Join'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        }`}>
                          {mgmt.enrollmentType || '-'}
                        </span>
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

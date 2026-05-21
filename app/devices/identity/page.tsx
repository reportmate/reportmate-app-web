"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { formatRelativeTime } from "../../../src/lib/time"
import { usePlatformFilterSafe, normalizePlatform } from "../../../src/providers/PlatformFilterProvider"
import { CollapsibleSection } from "../../../src/components/ui/CollapsibleSection"
import { useScrollCollapse } from "../../../src/hooks/useScrollCollapse"
import DeviceFilters, { FilterOptions } from "../../../src/components/shared/DeviceFilters"

interface IdentityDevice {
  id: string
  deviceId: string
  deviceName: string
  serialNumber: string
  lastSeen: string
  collectedAt: string
  platform: string
  totalUsers: number
  adminUsers: number
  disabledUsers: number
  localUsers?: number
  domainUsers?: number
  currentlyLoggedIn: number
  failedLoginsLast7Days?: number
  btmdbStatus?: string | null
  btmdbSizeMB?: number | null
  secureTokenUsers?: number | null
  secureTokenMissing?: number | null
  platformSSORegistered?: boolean
  platformSSOUserCount?: number
  adBound?: boolean
  adDomain?: string | null
  ldapBound?: boolean
  users?: { username: string; realName?: string; isAdmin?: boolean; lastLogon?: string }[]
  adminUsernames?: string[]
  loggedInUsernames?: string[]
  // Enrollment type (migrated from Management - Identity is authoritative)
  enrollmentType?: string
  entraJoined?: boolean
  domainJoined?: boolean
  tenantId?: string
  tenantName?: string
  // Domain trust status (Healthy, Broken, Unknown, Not Applicable)
  trustStatus?: string | null
  // Auth method: "Platform SSO" (Mac) or "Hello for Business" (Windows)
  authMethod?: string | null
  // Session utilization (TerminalServices RDP data)
  sessionSummary?: {
    totalSessions: number
    uniqueUsers: number
    avgSessionMinutes: number
    medianSessionMinutes: number
  } | null
  // Inventory dimensions (for Selections accordion)
  usage?: string | null
  catalog?: string | null
  location?: string | null
  area?: string | null
  department?: string | null
  fleet?: string | null
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Filters Accordion Skeleton */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="w-full px-6 py-3 flex items-center justify-between">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
          <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
      
      {/* Widgets Accordion Skeleton */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="w-full px-6 py-3 flex items-center justify-between">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
          <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700/50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-600 rounded mb-3"></div>
                <div className="space-y-2">
                  {[1, 2, 3].map(j => (
                    <div key={j} className="flex items-center justify-between">
                      <div className="h-3 w-24 bg-gray-200 dark:bg-gray-600 rounded"></div>
                      <div className="h-3 w-8 bg-gray-200 dark:bg-gray-600 rounded"></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Table Skeleton */}
      <div className="flex-1 overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3"><div className="h-4 w-16 bg-gray-300 dark:bg-gray-600 rounded"></div></th>
              <th className="px-6 py-3"><div className="h-4 w-16 bg-gray-300 dark:bg-gray-600 rounded"></div></th>
              <th className="px-6 py-3"><div className="h-4 w-16 bg-gray-300 dark:bg-gray-600 rounded"></div></th>
              <th className="px-6 py-3"><div className="h-4 w-20 bg-gray-300 dark:bg-gray-600 rounded"></div></th>
              <th className="px-6 py-3"><div className="h-4 w-20 bg-gray-300 dark:bg-gray-600 rounded"></div></th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {[...Array(8)].map((_, i) => (
              <tr key={i}>
                <td className="px-6 py-4"><div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div></td>
                <td className="px-6 py-4"><div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded"></div></td>
                <td className="px-6 py-4"><div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded"></div></td>
                <td className="px-6 py-4"><div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div></td>
                <td className="px-6 py-4"><div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function IdentityPageContent() {
  const searchParams = useSearchParams()
  const { platformFilter: globalPlatformFilter, isPlatformVisible } = usePlatformFilterSafe()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [identityDevices, setIdentityDevices] = useState<IdentityDevice[]>([])
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [adminFilter, setAdminFilter] = useState('all')
  const [widgetsExpanded, setWidgetsExpanded] = useState(true)
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  // Utilization report mode
  const [showUtilizationReport, setShowUtilizationReport] = useState(false)
  // Local Admins report mode (flat admin x device view)
  const [showAdminsReport, setShowAdminsReport] = useState(false)
  // Widget click filters
  const [directoryFilter, setDirectoryFilter] = useState<string | null>(null)
  const [authFilter, setAuthFilter] = useState<string | null>(null)
  const [adminAccountFilter, setAdminAccountFilter] = useState<string | null>(null)
  // Selections accordion state
  const [selectedUsages, setSelectedUsages] = useState<string[]>([])
  const [selectedCatalogs, setSelectedCatalogs] = useState<string[]>([])
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [selectedAreas, setSelectedAreas] = useState<string[]>([])
  const [selectedFleets, setSelectedFleets] = useState<string[]>([])
  const toggleUsage = (u: string) => setSelectedUsages(p => p.includes(u) ? p.filter(x => x !== u) : [...p, u])
  const toggleCatalog = (c: string) => setSelectedCatalogs(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c])
  const toggleLocation = (l: string) => setSelectedLocations(p => p.includes(l) ? p.filter(x => x !== l) : [...p, l])
  const toggleArea = (a: string) => setSelectedAreas(p => p.includes(a) ? p.filter(x => x !== a) : [...p, a])
  const toggleFleet = (f: string) => setSelectedFleets(p => p.includes(f) ? p.filter(x => x !== f) : [...p, f])
  const clearAllSelections = () => {
    setSelectedUsages([]); setSelectedCatalogs([]); setSelectedLocations([]); setSelectedAreas([]); setSelectedFleets([])
  }
  // Expandable legend categories
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const toggleCategory = (label: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }
  const hasActiveWidgetFilter = directoryFilter !== null || authFilter !== null || adminAccountFilter !== null
  const clearWidgetFilters = () => { setDirectoryFilter(null); setAuthFilter(null); setAdminAccountFilter(null) }
  const matchesAdminFilter = (d: IdentityDevice, name: string) =>
    (d.adminUsernames || []).some(u => u.toLowerCase() === name.toLowerCase())

  const { tableContainerRef, effectiveFiltersExpanded, effectiveWidgetsExpanded } = useScrollCollapse(
    { filters: filtersExpanded, widgets: widgetsExpanded },
    { enabled: !loading }
  )
  
  // Sorting state
  const [sortColumn, setSortColumn] = useState<'device' | 'directory' | 'auth' | 'users' | 'loggedIn' | 'lastSeen'>('device')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  
  const handleSort = (column: typeof sortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  useEffect(() => {
    const fetchIdentity = async () => {
      try {
        const response = await fetch('/api/modules/identity', {
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
        setIdentityDevices(data)
      } catch (err) {
        console.error('Error fetching identity:', err)
        setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchIdentity()
  }, [])

  // Platform-filtered devices (for widgets — no search/admin filter)
  const platformFilteredDevices = identityDevices.filter(d => {
    if (globalPlatformFilter) {
      const platform = normalizePlatform(d.platform)
      if (!isPlatformVisible(platform)) return false
    }
    return true
  })

  // Filter devices (for table — includes search + admin filter + widget click filters)
  const filteredDevices = platformFilteredDevices.filter(d => {
    if (adminFilter === 'has-admins' && d.adminUsers === 0) return false
    if (adminFilter === 'no-admins' && d.adminUsers > 0) return false
    if (adminFilter === 'multiple-admins' && d.adminUsers <= 1) return false
    
    // Widget click: directory filter
    if (directoryFilter) {
      // Trust sub-statuses for domain joined / hybrid
      if (directoryFilter === 'Broken') {
        if (d.enrollmentType !== 'Domain Joined' || d.trustStatus !== 'Broken') return false
      } else if (directoryFilter === 'Unconfirmed') {
        if (d.enrollmentType !== 'Domain Joined') return false
        if (d.trustStatus === 'Healthy' || d.trustStatus === 'Broken') return false
      } else if (directoryFilter === 'Trusted') {
        if (d.enrollmentType !== 'Domain Joined' || d.trustStatus !== 'Healthy') return false
      } else {
        if (d.enrollmentType !== directoryFilter) return false
      }
    }
    
    // Widget click: admin account filter
    if (adminAccountFilter) {
      if (!matchesAdminFilter(d, adminAccountFilter)) return false
    }

    // Widget click: auth filter
    if (authFilter) {
      if (authFilter === 'Modern') {
        if (!d.authMethod) return false
      } else if (authFilter === 'Legacy') {
        if (d.authMethod || !(d.adBound || d.ldapBound)) return false
      } else if (authFilter === 'Standard') {
        if (d.authMethod || d.adBound || d.ldapBound) return false
      }
    }
    
    if (selectedUsages.length > 0 && !selectedUsages.includes(d.usage || '')) return false
    if (selectedCatalogs.length > 0 && !selectedCatalogs.includes(d.catalog || '')) return false
    if (selectedLocations.length > 0 && !selectedLocations.includes(d.location || '')) return false
    if (selectedAreas.length > 0 && !selectedAreas.includes(d.area || d.department || '')) return false
    if (selectedFleets.length > 0 && !selectedFleets.includes(d.fleet || '')) return false

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      return (
        d.deviceName?.toLowerCase().includes(query) ||
        d.serialNumber?.toLowerCase().includes(query) ||
        d.users?.some(u => u.username?.toLowerCase().includes(query)) ||
        d.loggedInUsernames?.some(u => u?.toLowerCase().includes(query))
      )
    }

    return true
  }).sort((a, b) => {
    let aValue: string | number = ''
    let bValue: string | number = ''
    
    switch (sortColumn) {
      case 'device':
        aValue = a.deviceName?.toLowerCase() || ''
        bValue = b.deviceName?.toLowerCase() || ''
        break
      case 'directory':
        aValue = a.enrollmentType?.toLowerCase() || ''
        bValue = b.enrollmentType?.toLowerCase() || ''
        break
      case 'auth':
        aValue = a.authMethod?.toLowerCase() || ''
        bValue = b.authMethod?.toLowerCase() || ''
        break
      case 'users':
        aValue = a.totalUsers
        bValue = b.totalUsers
        break
      case 'loggedIn':
        aValue = a.currentlyLoggedIn
        bValue = b.currentlyLoggedIn
        break
      case 'lastSeen':
        aValue = a.lastSeen || ''
        bValue = b.lastSeen || ''
        break
    }
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
    }
    
    if (sortDirection === 'asc') {
      return String(aValue).localeCompare(String(bValue))
    } else {
      return String(bValue).localeCompare(String(aValue))
    }
  })

  // Calculate summary stats
  const totalLoggedIn = filteredDevices.reduce((sum, d) => sum + d.currentlyLoggedIn, 0)

  // Calculate identity widget stats (from platform-filtered set)
  const identityStats = {
    // adminNames is keyed by canonical (lowercase) username so that the same
    // admin account is counted once across case variations. value stores the
    // display name + device count.
    adminNames: (() => {
      const acc: Record<string, { display: string; count: number }> = {}
      for (const d of platformFilteredDevices) {
        const seen = new Set<string>()
        for (const raw of (d.adminUsernames || [])) {
          if (!raw) continue
          const key = raw.toLowerCase()
          if (seen.has(key)) continue
          seen.add(key)
          if (!acc[key]) acc[key] = { display: raw, count: 0 }
          acc[key].count += 1
        }
      }
      return acc
    })(),
    
    enrollmentTypes: platformFilteredDevices.reduce((acc, d) => {
      const type = d.enrollmentType || 'Unknown'
      if (type !== 'Unknown') {
        acc[type] = (acc[type] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>),
    
    // Trust status counts for domain-joined / hybrid devices
    trustCounts: platformFilteredDevices.reduce((acc, d) => {
      if (d.enrollmentType === 'Domain Joined') {
        if (d.trustStatus === 'Healthy') acc.trusted++
        else if (d.trustStatus === 'Broken') acc.broken++
        else acc.unconfirmed++ // Unknown, null, or no data
      }
      return acc
    }, { trusted: 0, broken: 0, unconfirmed: 0 })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black animate-pulse">
        <header className="bg-white dark:bg-gray-900 border-b h-16"></header>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <LoadingSkeleton />
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-4rem)] bg-gray-50 dark:bg-black flex flex-col overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col min-h-0">
        <div className="flex-1 bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col min-h-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Identity & Users</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      User accounts, sessions, and identity management across {filteredDevices.length} devices
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">{totalLoggedIn}</div>
                  <div className="text-gray-500 dark:text-gray-400">Logged In</div>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center gap-4">
              {/* No Admin Users toggle - only shown when there are devices with no admins */}
              {platformFilteredDevices.some(d => d.adminUsers === 0) && (
              <button
                onClick={() => setAdminFilter(adminFilter === 'no-admins' ? 'all' : 'no-admins')}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors flex items-center gap-2 ${
                  adminFilter === 'no-admins'
                    ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                No Admin Users
              </button>
              )}

              <div className="flex-1" />

              {/* Generate Utilization Report */}
              {platformFilteredDevices.some(d => d.sessionSummary && d.sessionSummary.totalSessions > 0) && (
                <button
                  onClick={() => setShowUtilizationReport(!showUtilizationReport)}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors flex items-center gap-2 ${
                    showUtilizationReport
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  title="Show session utilization report for devices with RDP data"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  {showUtilizationReport ? 'Back to List' : 'Utilization Report'}
                </button>
              )}

              {/* Export CSV */}
              <button
                onClick={() => {
                  const headers = ['Device Name', 'Serial Number', 'Platform', 'Total Users', 'Admin Users', 'Currently Logged In', 'Last Seen']
                  const rows = filteredDevices.map(d => [
                    d.deviceName || '',
                    d.serialNumber || '',
                    d.platform || '',
                    d.totalUsers || 0,
                    d.adminUsers || 0,
                    d.currentlyLoggedIn || 0,
                    d.lastSeen || ''
                  ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
                  
                  const csv = [headers.join(','), ...rows].join('\n')
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                  const url = URL.createObjectURL(blob)
                  const link = document.createElement('a')
                  link.href = url
                  link.download = `identity-report-${new Date().toISOString().split('T')[0]}.csv`
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

              {/* Search */}
              <div className="relative max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search devices or users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Yellow Clear Filters Bar */}
          {hasActiveWidgetFilter && (
            <div className="px-6 py-3 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-yellow-800 dark:text-yellow-200">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span className="font-medium">Filters Active</span>
                <span className="text-yellow-600 dark:text-yellow-300">
                  {[
                    directoryFilter,
                    authFilter,
                    adminAccountFilter ? `Admin: ${adminAccountFilter}` : null,
                  ].filter(Boolean).join(', ')}
                </span>
              </div>
              <button
                onClick={clearWidgetFilters}
                className="px-3 py-1 text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors"
              >
                Clear Filters
              </button>
            </div>
          )}

          {/* Selections accordion (shared component) */}
          {(() => {
            const sharedFilterOptions: FilterOptions = {
              statuses: [],
              usages: Array.from(new Set(platformFilteredDevices.map(d => d.usage).filter(Boolean) as string[])).sort(),
              catalogs: Array.from(new Set(platformFilteredDevices.map(d => d.catalog).filter(Boolean) as string[])).sort(),
              areas: Array.from(new Set(platformFilteredDevices.map(d => d.area || d.department).filter(Boolean) as string[])).sort(),
              locations: Array.from(new Set(platformFilteredDevices.map(d => d.location).filter(Boolean) as string[])).sort(),
              fleets: Array.from(new Set(platformFilteredDevices.map(d => d.fleet).filter(Boolean) as string[])).sort(),
            }
            const locCounts: Record<string, number> = {}
            platformFilteredDevices.forEach(d => { if (d.location) locCounts[d.location] = (locCounts[d.location] || 0) + 1 })
            return (
              <DeviceFilters
                filterOptions={sharedFilterOptions}
                selectedStatuses={[]}
                selectedCatalogs={selectedCatalogs}
                selectedAreas={selectedAreas}
                selectedLocations={selectedLocations}
                selectedFleets={selectedFleets}
                selectedUsages={selectedUsages}
                onStatusToggle={() => { /* no statuses on /identity */ }}
                onCatalogToggle={toggleCatalog}
                onAreaToggle={toggleArea}
                onLocationToggle={toggleLocation}
                onFleetToggle={toggleFleet}
                onUsageToggle={toggleUsage}
                onClearAll={clearAllSelections}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                expanded={effectiveFiltersExpanded}
                onToggle={() => setFiltersExpanded(!filtersExpanded)}
                locationCounts={locCounts}
              />
            )
          })()}

          {/* Widgets Accordion */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setWidgetsExpanded(!widgetsExpanded)}
              className="w-full px-6 py-3 flex items-center justify-between bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Widgets</span>
              <svg 
                className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${effectiveWidgetsExpanded ? 'rotate-90' : 'rotate-180'}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            
            <CollapsibleSection expanded={effectiveWidgetsExpanded} maxHeight="60vh">
              <div className="px-6 py-6 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700/50">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Widget 1: Directory Services Donut with Expandable Legend */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Directory Services</h3>
                    {(() => {
                      const entries = Object.entries(identityStats.enrollmentTypes)
                        .sort(([a], [b]) => {
                          const order = ['Cloud Joined', 'Domain Joined', 'Standard', 'Unjoined']
                          return (order.indexOf(a) === -1 ? 99 : order.indexOf(a)) - (order.indexOf(b) === -1 ? 99 : order.indexOf(b))
                        })
                      const total = entries.reduce((sum, [, v]) => sum + v, 0)
                      
                      if (total === 0) return <div className="text-center text-gray-500 py-8">No data available</div>
                      
                      const colorMap: Record<string, string> = {
                        'Cloud Joined': '#10b981',
                        'Domain Joined': '#f59e0b',
                        'Standard': '#3b82f6',
                        'Unjoined': '#ef4444',
                      }

                      // Trust sub-counts for domain/hybrid
                      const { trusted, broken, unconfirmed } = identityStats.trustCounts
                      const trustColors: Record<string, string> = {
                        'Trusted': '#eab308',
                        'Unconfirmed': '#f97316',
                        'Broken': '#ef4444',
                      }
                      // Categories that can expand to show trust sub-items
                      const expandableCategories = ['Domain Joined']
                      // Always show all 3 trust sub-items when expanded (even if count 0)
                      const trustItems = [
                        { label: 'Trusted', value: trusted },
                        { label: 'Unconfirmed', value: unconfirmed },
                        { label: 'Broken', value: broken },
                      ]
                      const hasTrustData = trusted + broken + unconfirmed > 0

                      // Build donut data - if a category is expanded, replace its segment with trust sub-segments
                      const donutSegments: { label: string; value: number; color: string }[] = []
                      for (const [label, value] of entries) {
                        if (expandableCategories.includes(label) && expandedCategories.has(label) && hasTrustData) {
                          for (const t of trustItems.filter(t => t.value > 0)) {
                            donutSegments.push({ label: `${label}:${t.label}`, value: t.value, color: trustColors[t.label] || '#94a3b8' })
                          }
                        } else {
                          donutSegments.push({ label, value, color: colorMap[label] || '#94a3b8' })
                        }
                      }
                      const donutTotal = donutSegments.reduce((sum, s) => sum + s.value, 0)
                      const radius = 32
                      const circumference = 2 * Math.PI * radius
                      let cumulativePercent = 0
                      
                      return (
                        <div className="flex items-start gap-3">
                          <div className="relative w-28 h-28 flex-shrink-0">
                            <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
                              {donutSegments.map((seg) => {
                                const percent = donutTotal > 0 ? seg.value / donutTotal : 0
                                const strokeDasharray = `${percent * circumference} ${circumference}`
                                const strokeDashoffset = -cumulativePercent * circumference
                                cumulativePercent += percent
                                const filterLabel = seg.label.includes(':') ? seg.label.split(':')[1] : seg.label
                                return (
                                  <circle
                                    key={seg.label}
                                    cx="50"
                                    cy="50"
                                    r={radius}
                                    fill="transparent"
                                    stroke={seg.color}
                                    strokeWidth="16"
                                    strokeDasharray={strokeDasharray}
                                    strokeDashoffset={strokeDashoffset}
                                    className="transition-all duration-300 cursor-pointer hover:opacity-80"
                                    onClick={() => setDirectoryFilter(directoryFilter === filterLabel ? null : filterLabel)}
                                  />
                                )
                              })}
                            </svg>
                          </div>
                          <div className="flex-1 space-y-2">
                            {entries.map(([label, value]) => {
                              const isExpandable = expandableCategories.includes(label) && hasTrustData
                              const isExpanded = expandedCategories.has(label)
                              return (
                                <div key={label}>
                                  <div className={`flex items-center gap-2 text-sm w-full rounded px-1 py-0.5 transition-colors ${
                                    directoryFilter === label ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                  }`}>
                                    {isExpandable && (
                                      <button onClick={() => toggleCategory(label)} className="flex-shrink-0 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600">
                                        <svg className={`w-3 h-3 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                        </svg>
                                      </button>
                                    )}
                                    {!isExpandable && <div className="w-4 flex-shrink-0" />}
                                    <button
                                      onClick={() => setDirectoryFilter(directoryFilter === label ? null : label)}
                                      className="flex items-center justify-between gap-3 flex-1 cursor-pointer min-w-0"
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: colorMap[label] || '#94a3b8' }} />
                                        <span className="text-gray-600 dark:text-gray-300 whitespace-nowrap">{label}</span>
                                      </div>
                                      <span className="font-medium text-gray-900 dark:text-white tabular-nums shrink-0 min-w-[2.5rem] text-right">{value.toLocaleString()}</span>
                                    </button>
                                  </div>
                                  {isExpandable && isExpanded && (
                                    <div className="ml-5 mt-1 space-y-1 border-l-2 border-gray-200 dark:border-gray-600 pl-2">
                                      {trustItems.filter(t => t.value > 0).map((t) => (
                                        <button
                                          key={t.label}
                                          onClick={() => setDirectoryFilter(directoryFilter === t.label ? null : t.label)}
                                          className={`flex items-center justify-between text-xs w-full rounded px-1 py-0.5 transition-colors ${
                                            directoryFilter === t.label ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                          }`}
                                        >
                                          <div className="flex items-center gap-2 min-w-0">
                                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: trustColors[t.label] }} />
                                            <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap">{t.label}</span>
                                          </div>
                                          <span className="font-medium text-gray-700 dark:text-gray-300 tabular-nums shrink-0 min-w-[2rem] text-right">{t.value.toLocaleString()}</span>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })()}
                  </div>

                  {/* Widget 2: macOS Security stack (SecureToken / Platform SSO / BTMDB)
                       when global platform filter is macOS; otherwise Authentication donut. */}
                  {globalPlatformFilter === 'macOS' ? (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">macOS Security</h3>
                    {(() => {
                      const macDevices = platformFilteredDevices
                      const totalMac = macDevices.length
                      if (totalMac === 0) return <div className="text-center text-gray-500 py-8">No data available</div>

                      const ssoRegistered = macDevices.filter(d => d.platformSSORegistered).length
                      const ssoMissing = totalMac - ssoRegistered
                      const tokenHolders = macDevices.reduce((sum, d) => sum + (d.secureTokenUsers || 0), 0)
                      const tokenMissing = macDevices.reduce((sum, d) => sum + (d.secureTokenMissing || 0), 0)
                      const devicesWithMissingTokens = macDevices.filter(d => (d.secureTokenMissing || 0) > 0).length
                      const btmdbBroken = macDevices.filter(d => d.btmdbStatus && d.btmdbStatus.toLowerCase() !== 'healthy' && d.btmdbStatus.toLowerCase() !== 'ok').length
                      const btmdbHealthy = macDevices.filter(d => d.btmdbStatus && (d.btmdbStatus.toLowerCase() === 'healthy' || d.btmdbStatus.toLowerCase() === 'ok')).length

                      const Row = ({ label, value, hint, color = 'text-gray-900 dark:text-white' }: { label: string; value: string | number; hint?: string; color?: string }) => (
                        <div className="flex items-center justify-between py-1.5">
                          <div className="min-w-0">
                            <div className="text-sm text-gray-600 dark:text-gray-300">{label}</div>
                            {hint && <div className="text-xs text-gray-400 dark:text-gray-500">{hint}</div>}
                          </div>
                          <div className={`text-sm font-semibold tabular-nums shrink-0 ml-3 ${color}`}>{value}</div>
                        </div>
                      )

                      return (
                        <div className="space-y-3 text-sm">
                          <div>
                            <div className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">SecureToken</div>
                            <Row label="Token holders" value={tokenHolders.toLocaleString()} />
                            <Row
                              label="Users missing token"
                              value={tokenMissing.toLocaleString()}
                              hint={devicesWithMissingTokens > 0 ? `${devicesWithMissingTokens} device${devicesWithMissingTokens === 1 ? '' : 's'}` : undefined}
                              color={tokenMissing > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-gray-900 dark:text-white'}
                            />
                          </div>
                          <div className="border-t border-gray-100 dark:border-gray-700/50 pt-2">
                            <div className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Platform SSO</div>
                            <Row label="Devices registered" value={`${ssoRegistered}/${totalMac}`} color={ssoRegistered === totalMac ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-900 dark:text-white'} />
                            {ssoMissing > 0 && (
                              <Row label="Not registered" value={ssoMissing} color="text-amber-700 dark:text-amber-300" />
                            )}
                          </div>
                          <div className="border-t border-gray-100 dark:border-gray-700/50 pt-2">
                            <div className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Background Task Mgmt (BTMDB)</div>
                            <Row label="Healthy" value={btmdbHealthy} color={btmdbHealthy > 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-900 dark:text-white'} />
                            {btmdbBroken > 0 && (
                              <Row label="Issues detected" value={btmdbBroken} color="text-red-700 dark:text-red-300" />
                            )}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                  ) : (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      {globalPlatformFilter === 'Windows' ? 'Windows Authentication' : 'Authentication'}
                    </h3>
                    {(() => {
                      // Modern = has authMethod (Platform SSO or Hello for Business)
                      const modernCount = platformFilteredDevices.filter(d => d.authMethod).length
                      // Legacy = AD or LDAP bound without modern auth
                      const legacyCount = platformFilteredDevices.filter(d => 
                        !d.authMethod && (d.adBound || d.ldapBound)
                      ).length
                      // Standard = everything else
                      const standardCount = platformFilteredDevices.length - modernCount - legacyCount

                      const authData = [
                        { label: 'Modern', value: modernCount, color: '#10b981' },
                        { label: 'Legacy', value: legacyCount, color: '#f59e0b' },
                        { label: 'Standard', value: standardCount, color: '#3b82f6' },
                      ].filter(d => d.value > 0)
                      const total = authData.reduce((sum, d) => sum + d.value, 0)
                      
                      if (total === 0) return <div className="text-center text-gray-500 py-8">No data available</div>
                      
                      const radius = 32
                      const circumference = 2 * Math.PI * radius
                      let cumulativePercent = 0
                      
                      return (
                        <div className="flex items-start gap-3">
                          <div className="relative w-28 h-28 flex-shrink-0">
                            <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
                              {authData.map((item) => {
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
                                    stroke={item.color}
                                    strokeWidth="16"
                                    strokeDasharray={strokeDasharray}
                                    strokeDashoffset={strokeDashoffset}
                                    className="transition-all duration-300 cursor-pointer hover:opacity-80"
                                    onClick={() => setAuthFilter(authFilter === item.label ? null : item.label)}
                                  />
                                )
                              })}
                            </svg>
                          </div>
                          <div className="flex-1 space-y-2">
                            {authData.map((item) => (
                              <button
                                key={item.label}
                                onClick={() => setAuthFilter(authFilter === item.label ? null : item.label)}
                                className={`flex items-center justify-between text-sm w-full rounded px-1 py-0.5 transition-colors ${
                                  authFilter === item.label ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                  <span className="text-gray-600 dark:text-gray-300 whitespace-nowrap">{item.label}</span>
                                </div>
                                <span className="font-medium text-gray-900 dark:text-white tabular-nums shrink-0 min-w-[2.5rem] text-right">{item.value.toLocaleString()}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                  )}

                  {/* Widget 3: Administrator Accounts (click to filter) */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Administrator Accounts</h3>
                      <button
                        onClick={() => setShowAdminsReport(!showAdminsReport)}
                        className={`text-xs px-2 py-1 rounded-md border transition-colors ${
                          showAdminsReport
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                            : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                        title="Toggle a flat per-admin report for security review"
                      >
                        {showAdminsReport ? 'Back to List' : 'Admins Report'}
                      </button>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                      {(() => {
                        const entries = Object.entries(identityStats.adminNames).sort((a, b) => b[1].count - a[1].count)
                        const maxCount = entries[0]?.[1].count || 0
                        return entries.slice(0, 10).map(([key, { display, count }]) => {
                          const percentage = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0
                          const isActive = adminAccountFilter?.toLowerCase() === key
                          return (
                            <button
                              key={key}
                              onClick={() => setAdminAccountFilter(isActive ? null : display)}
                              className={`block w-full text-left rounded px-1 py-0.5 transition-colors ${
                                isActive ? 'bg-yellow-50 dark:bg-yellow-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                              }`}
                              title={`Filter devices with admin "${display}"`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className={`text-sm font-medium truncate ${isActive ? 'text-yellow-800 dark:text-yellow-200' : 'text-gray-900 dark:text-white'}`} title={display}>{display}</span>
                                <span className="text-sm text-gray-500 dark:text-gray-400 ml-2 shrink-0 tabular-nums">{count}</span>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div className={`h-2 rounded-full transition-all duration-300 ${isActive ? 'bg-yellow-600' : 'bg-yellow-500'}`} style={{ width: `${percentage}%` }} />
                              </div>
                            </button>
                          )
                        })
                      })()}
                      {Object.keys(identityStats.adminNames).length === 0 && (
                        <div className="text-center text-gray-500 py-4">No admin accounts found</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CollapsibleSection>
          </div>

          <div ref={tableContainerRef} className="flex-1 overflow-auto min-h-0 table-scrollbar">
            {showAdminsReport ? (
              /* Local Admins Report View — flat per-(admin,device) listing for security review */
              (() => {
                type AdminRow = { admin: string; device: IdentityDevice }
                const rows: AdminRow[] = []
                for (const d of filteredDevices) {
                  for (const a of (d.adminUsernames || [])) {
                    rows.push({ admin: a, device: d })
                  }
                }
                rows.sort((a, b) => {
                  const c = a.admin.toLowerCase().localeCompare(b.admin.toLowerCase())
                  if (c !== 0) return c
                  return (a.device.deviceName || '').toLowerCase().localeCompare((b.device.deviceName || '').toLowerCase())
                })

                const exportCsv = () => {
                  const headers = ['Admin Account', 'Device Name', 'Serial Number', 'Platform', 'Last Seen']
                  const csvRows = rows.map(r => [
                    r.admin,
                    r.device.deviceName || '',
                    r.device.serialNumber || '',
                    r.device.platform || '',
                    r.device.lastSeen || '',
                  ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
                  const csv = [headers.join(','), ...csvRows].join('\n')
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                  const url = URL.createObjectURL(blob)
                  const link = document.createElement('a')
                  link.href = url
                  link.download = `local-admins-${new Date().toISOString().split('T')[0]}.csv`
                  document.body.appendChild(link)
                  link.click()
                  document.body.removeChild(link)
                  URL.revokeObjectURL(url)
                }

                return (
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Local Administrators Report</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {rows.length.toLocaleString()} admin assignments across {filteredDevices.length.toLocaleString()} devices.
                          {adminAccountFilter && <span className="ml-2 text-yellow-700 dark:text-yellow-300">Filtered to: <code>{adminAccountFilter}</code></span>}
                        </p>
                      </div>
                      <button
                        onClick={exportCsv}
                        className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Export CSV
                      </button>
                    </div>

                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Admin Account</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Device</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Platform</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Last Seen</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {rows.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                              No local admin accounts found.
                            </td>
                          </tr>
                        ) : rows.map((r, i) => {
                          const isFiltered = adminAccountFilter && r.admin.toLowerCase() === adminAccountFilter.toLowerCase()
                          return (
                            <tr key={`${r.device.id}-${r.admin}-${i}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                              <td className="px-6 py-3">
                                <button
                                  onClick={() => setAdminAccountFilter(adminAccountFilter?.toLowerCase() === r.admin.toLowerCase() ? null : r.admin)}
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border transition-colors ${
                                    isFiltered
                                      ? 'bg-yellow-200 text-yellow-900 border-yellow-400 dark:bg-yellow-900/60 dark:text-yellow-100 dark:border-yellow-600'
                                      : 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-200 dark:border-yellow-700 hover:bg-yellow-200 dark:hover:bg-yellow-900/60'
                                  }`}
                                  title="Click to filter by this admin"
                                >
                                  {r.admin}
                                </button>
                              </td>
                              <td className="px-6 py-3">
                                <Link href={`/device/${r.device.serialNumber}#identity`} className="group block">
                                  <div className="text-sm font-medium text-gray-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">{r.device.deviceName}</div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">{r.device.serialNumber}</div>
                                </Link>
                              </td>
                              <td className="px-6 py-3 text-sm text-gray-700 dark:text-gray-300">{r.device.platform}</td>
                              <td className="px-6 py-3 text-sm text-gray-700 dark:text-gray-300">{r.device.lastSeen ? formatRelativeTime(r.device.lastSeen) : '-'}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              })()
            ) : showUtilizationReport ? (
              /* Utilization Report View */
              (() => {
                const devicesWithSessions = filteredDevices
                  .filter(d => d.sessionSummary && d.sessionSummary.totalSessions > 0)
                  .sort((a, b) => (b.sessionSummary?.totalSessions || 0) - (a.sessionSummary?.totalSessions || 0))
                
                const fleetTotalSessions = devicesWithSessions.reduce((sum, d) => sum + (d.sessionSummary?.totalSessions || 0), 0)
                const fleetUniqueUsers = devicesWithSessions.reduce((sum, d) => sum + (d.sessionSummary?.uniqueUsers || 0), 0)
                const avgDurations = devicesWithSessions.map(d => d.sessionSummary?.avgSessionMinutes || 0).filter(v => v > 0)
                const fleetAvgDuration = avgDurations.length > 0 ? avgDurations.reduce((a, b) => a + b, 0) / avgDurations.length : 0
                
                const formatDuration = (minutes: number) => {
                  if (minutes > 60) return `${(minutes / 60).toFixed(1)}h`
                  return `${Math.round(minutes)}m`
                }
                
                return (
                  <div className="p-6 space-y-6">
                    {/* Fleet Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-800">
                        <div className="text-3xl font-bold text-indigo-700 dark:text-indigo-300">{devicesWithSessions.length}</div>
                        <div className="text-sm text-indigo-600 dark:text-indigo-400">Devices with Sessions</div>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                        <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">{fleetTotalSessions.toLocaleString()}</div>
                        <div className="text-sm text-blue-600 dark:text-blue-400">Total Sessions</div>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                        <div className="text-3xl font-bold text-green-700 dark:text-green-300">{fleetUniqueUsers}</div>
                        <div className="text-sm text-green-600 dark:text-green-400">Total Unique Users</div>
                      </div>
                      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                        <div className="text-3xl font-bold text-amber-700 dark:text-amber-300">{formatDuration(fleetAvgDuration)}</div>
                        <div className="text-sm text-amber-600 dark:text-amber-400">Avg Session Duration</div>
                      </div>
                    </div>

                    {/* Per-Device Utilization Table */}
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Device</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Sessions</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Unique Users</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Avg Duration</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Median Duration</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Last Seen</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {devicesWithSessions.map(device => (
                          <tr key={device.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-6 py-4">
                              <Link href={`/device/${device.serialNumber}#identity`} className="group block">
                                <div className="text-sm font-medium text-gray-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">{device.deviceName}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">{device.serialNumber}</div>
                              </Link>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">{device.sessionSummary?.totalSessions.toLocaleString()}</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">{device.sessionSummary?.uniqueUsers}</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="text-sm text-gray-900 dark:text-white">{formatDuration(device.sessionSummary?.avgSessionMinutes || 0)}</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="text-sm text-gray-900 dark:text-white">{formatDuration(device.sessionSummary?.medianSessionMinutes || 0)}</span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                              {device.lastSeen ? formatRelativeTime(device.lastSeen) : '-'}
                            </td>
                          </tr>
                        ))}
                        {devicesWithSessions.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-6 py-12 text-center">
                              <p className="text-sm text-gray-500 dark:text-gray-400">No devices have session history data yet.</p>
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Session data is collected from TerminalServices event logs on Windows devices.</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )
              })()
            ) : (
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
                  <th 
                    onClick={() => handleSort('directory')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none"
                  >
                    <div className="flex items-center gap-1">
                      Directory
                      {sortColumn === 'directory' && (
                        <svg className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('auth')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none"
                  >
                    <div className="flex items-center gap-1">
                      Auth
                      {sortColumn === 'auth' && (
                        <svg className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('users')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none"
                  >
                    <div className="flex items-center gap-1">
                      Users
                      {sortColumn === 'users' && (
                        <svg className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('loggedIn')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none"
                  >
                    <div className="flex items-center gap-1">
                      Current
                      {sortColumn === 'loggedIn' && (
                        <svg className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('lastSeen')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none"
                  >
                    <div className="flex items-center gap-1">
                      Last Seen
                      {sortColumn === 'lastSeen' && (
                        <svg className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </th>
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
                        <p className="text-base font-medium text-gray-900 dark:text-white mb-2">Failed to load identity data</p>
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
                ) : filteredDevices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">No identity records found</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">No identity records match your current filters.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredDevices.map((device) => {
                    // Directory type badge colors
                    const dirColorMap: Record<string, string> = {
                      'Cloud Joined': 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/40 dark:text-purple-200 dark:border-purple-700',
                      'Domain Joined': 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-700',
                      'Standard': 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-700',
                      'Unjoined': 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-200 dark:border-red-700',
                    }
                    // Trust status badge — only for Domain Joined devices
                    const trustBadge = (() => {
                      if (device.enrollmentType !== 'Domain Joined') return null
                      if (device.trustStatus === 'Broken') return { label: 'Broken', cls: 'bg-red-100 text-red-800 border border-red-300 dark:bg-red-900/40 dark:text-red-200 dark:border-red-700', icon: '\u26A0' }
                      if (!device.trustStatus || device.trustStatus === 'Unknown') return { label: 'Unconfirmed', cls: 'bg-orange-100 text-orange-800 border border-orange-300 dark:bg-orange-900/40 dark:text-orange-200 dark:border-orange-700', icon: '\u24D8' }
                      return null // Healthy = no badge needed
                    })()
                    return (
                      <tr key={device.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4 max-w-56">
                          <Link 
                            href={`/device/${device.serialNumber}#identity`}
                            className="group block min-w-0"
                            title={device.deviceName || 'Unknown Device'}
                          >
                            <div className="text-sm font-medium text-gray-900 group-hover:text-gray-700 dark:text-white dark:group-hover:text-gray-200 truncate">{device.deviceName}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">
                              {device.serialNumber}
                              <span className="ml-2 text-gray-400">|</span>
                              <span className="ml-2">{device.platform}</span>
                            </div>
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1 items-start">
                            <span className={`inline-flex items-center w-fit px-2 py-0.5 rounded-full text-xs font-medium border ${dirColorMap[device.enrollmentType || ''] || 'bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600'}`}>
                              {device.enrollmentType || 'Unknown'}
                            </span>
                            {trustBadge && (
                              <span className={`inline-flex items-center gap-1 w-fit px-2 py-0.5 rounded-full text-xs font-medium ${trustBadge.cls}`}>
                                {trustBadge.icon} {trustBadge.label}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {device.authMethod ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                              {device.authMethod}
                            </span>
                          ) : (device.adBound || device.ldapBound) ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                              Legacy
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-700">
                              Standard
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{device.totalUsers}</div>
                          <div className={`text-xs ${device.adminUsers === 0 ? 'text-yellow-600 dark:text-yellow-400 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                            {device.adminUsers === 0 ? 'no admins' : `${device.adminUsers} admin${device.adminUsers === 1 ? '' : 's'}`}
                          </div>
                          {adminAccountFilter && (() => {
                            const matched = (device.adminUsernames || []).filter(
                              u => u.toLowerCase() === adminAccountFilter.toLowerCase()
                            )
                            if (matched.length === 0) return null
                            return (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {matched.map(u => (
                                  <span
                                    key={u}
                                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-200 dark:border-yellow-700"
                                    title={`Admin account: ${u}`}
                                  >
                                    {u}
                                  </span>
                                ))}
                              </div>
                            )
                          })()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {device.currentlyLoggedIn > 0 ? (
                              <>
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1 animate-pulse"></span>
                                  {device.currentlyLoggedIn}
                                </span>
                                {device.loggedInUsernames && device.loggedInUsernames.length > 0 && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[100px]" title={device.loggedInUsernames.join(', ')}>
                                    {device.loggedInUsernames[0]}
                                    {device.loggedInUsernames.length > 1 && ` +${device.loggedInUsernames.length - 1}`}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                          {device.lastSeen ? formatRelativeTime(device.lastSeen) : '-'}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function IdentityPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-black animate-pulse"></div>}>
      <IdentityPageContent />
    </Suspense>
  )
}

"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { formatRelativeTime } from "../../../src/lib/time"
import { usePlatformFilterSafe, normalizePlatform } from "../../../src/providers/PlatformFilterProvider"
import { CollapsibleSection } from "../../../src/components/ui/CollapsibleSection"
import { useScrollCollapse } from "../../../src/hooks/useScrollCollapse"

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
  // Widget click filters
  const [directoryFilter, setDirectoryFilter] = useState<string | null>(null)
  const [authFilter, setAuthFilter] = useState<string | null>(null)
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
  const hasActiveWidgetFilter = directoryFilter !== null || authFilter !== null
  const clearWidgetFilters = () => { setDirectoryFilter(null); setAuthFilter(null) }

  const { tableContainerRef, effectiveWidgetsExpanded } = useScrollCollapse(
    { widgets: widgetsExpanded },
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
        if (d.trustStatus !== 'Broken') return false
      } else if (directoryFilter === 'Unconfirmed') {
        const isDomainOrHybrid = d.enrollmentType === 'Domain Joined'
        if (!isDomainOrHybrid || (d.trustStatus && d.trustStatus !== 'Unknown')) return false
      } else if (directoryFilter === 'Trusted') {
        if (d.trustStatus !== 'Healthy') return false
      } else {
        if (d.enrollmentType !== directoryFilter) return false
      }
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
    adminNames: platformFilteredDevices.reduce((acc, d) => {
      if (d.users) {
        d.users.filter(u => u.isAdmin).forEach(u => {
          const name = u.username || 'Unknown'
          acc[name] = (acc[name] || 0) + 1
        })
      }
      return acc
    }, {} as Record<string, number>),
    
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
                  {[directoryFilter, authFilter].filter(Boolean).join(', ')}
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

          {/* Widgets Accordion */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setWidgetsExpanded(!effectiveWidgetsExpanded)}
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
                                      {trustItems.map((t) => (
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

                  {/* Widget 2: Authentication Donut - Modern / Legacy / Standard */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Authentication</h3>
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

                  {/* Widget 3: Administrator Accounts */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Administrator Accounts</h3>
                    <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                      {Object.entries(identityStats.adminNames).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => {
                        const total = Object.values(identityStats.adminNames).reduce((sum, v) => sum + v, 0)
                        const percentage = total > 0 ? Math.round((count / total) * 100) : 0
                        return (
                          <div key={name}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-gray-900 dark:text-white truncate" title={name}>{name}</span>
                              <span className="text-sm text-gray-500 dark:text-gray-400">{count}</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div className="h-2 rounded-full bg-yellow-500 transition-all duration-300" style={{ width: `${percentage}%` }} />
                            </div>
                          </div>
                        )
                      })}
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

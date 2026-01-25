"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { formatRelativeTime } from "../../../src/lib/time"
import { usePlatformFilterSafe, normalizePlatform } from "../../../src/providers/PlatformFilterProvider"

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
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(10)].map((_, i) => (
        <div key={i} className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      ))}
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
  const [platformFilter, setPlatformFilter] = useState('all')
  const [adminFilter, setAdminFilter] = useState('all')
  
  // Sorting state
  const [sortColumn, setSortColumn] = useState<'device' | 'users' | 'admins' | 'loggedIn' | 'lastSeen'>('device')
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

  // Get unique platforms for filtering
  const platforms = Array.from(new Set(
    identityDevices.map(d => d.platform).filter(Boolean)
  )).sort()

  // Filter devices
  const filteredDevices = identityDevices.filter(d => {
    // Global platform filter first
    if (globalPlatformFilter) {
      const platform = normalizePlatform(d.platform)
      if (!isPlatformVisible(platform)) {
        return false
      }
    }
    if (platformFilter !== 'all' && d.platform !== platformFilter) return false
    
    if (adminFilter === 'has-admins' && d.adminUsers === 0) return false
    if (adminFilter === 'no-admins' && d.adminUsers > 0) return false
    if (adminFilter === 'multiple-admins' && d.adminUsers <= 1) return false
    
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
      case 'users':
        aValue = a.totalUsers
        bValue = b.totalUsers
        break
      case 'admins':
        aValue = a.adminUsers
        bValue = b.adminUsers
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
  const totalUsers = filteredDevices.reduce((sum, d) => sum + d.totalUsers, 0)
  const totalAdmins = filteredDevices.reduce((sum, d) => sum + d.adminUsers, 0)
  const totalLoggedIn = filteredDevices.reduce((sum, d) => sum + d.currentlyLoggedIn, 0)

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
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
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
                  <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{totalUsers}</div>
                  <div className="text-gray-500 dark:text-gray-400">Total Users</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{totalAdmins}</div>
                  <div className="text-gray-500 dark:text-gray-400">Admin Users</div>
                </div>
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
              {/* Platform Filter */}
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-1.5"
              >
                <option value="all">All Platforms</option>
                {platforms.map(platform => (
                  <option key={platform} value={platform}>{platform}</option>
                ))}
              </select>

              {/* Admin Filter */}
              <select
                value={adminFilter}
                onChange={(e) => setAdminFilter(e.target.value)}
                className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-1.5"
              >
                <option value="all">All Devices</option>
                <option value="has-admins">Has Admin Users</option>
                <option value="multiple-admins">Multiple Admins</option>
                <option value="no-admins">No Admin Users</option>
              </select>

              {/* Search */}
              <div className="relative flex-1 max-w-md">
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
                  className="block w-full pl-10 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

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
            </div>
          </div>

          <div className="overflow-auto max-h-[calc(100vh-20rem)]">
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
                    onClick={() => handleSort('admins')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none"
                  >
                    <div className="flex items-center gap-1">
                      Admins
                      {sortColumn === 'admins' && (
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
                      Active Sessions
                      {sortColumn === 'loggedIn' && (
                        <svg className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700">Status</th>
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
                  filteredDevices.map((device) => (
                    <tr key={device.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 max-w-56">
                        <Link 
                          href={`/device/${device.deviceId}#identity`}
                          className="group block min-w-0"
                          title={device.deviceName || 'Unknown Device'}
                        >
                          <div className="text-sm font-medium text-indigo-600 group-hover:text-indigo-800 dark:text-indigo-400 dark:group-hover:text-indigo-300 truncate">{device.deviceName}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">
                            {device.serialNumber}
                            <span className="ml-2 text-gray-400">|</span>
                            <span className="ml-2">{device.platform}</span>
                          </div>
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900 dark:text-white">{device.totalUsers}</div>
                          {device.users && device.users.length > 0 && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[150px]" title={device.users.map(u => u.username).join(', ')}>
                              {device.users.slice(0, 2).map(u => u.username).join(', ')}
                              {device.users.length > 2 && ` +${device.users.length - 2}`}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          device.adminUsers > 1 
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            : device.adminUsers === 1
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                        }`}>
                          {device.adminUsers}
                        </span>
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
                            <span className="text-sm text-gray-400 dark:text-gray-500">None</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {/* macOS specific badges */}
                          {device.platform === 'macOS' && (
                            <>
                              {device.btmdbStatus && device.btmdbStatus !== 'healthy' && (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  device.btmdbStatus === 'critical' 
                                    ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                }`} title="Background Task Management DB health">
                                  BTMDB {device.btmdbStatus}
                                </span>
                              )}
                              {device.secureTokenMissing !== null && device.secureTokenMissing > 0 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" title="Users missing Secure Token">
                                  {device.secureTokenMissing} no token
                                </span>
                              )}
                              {device.platformSSORegistered && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" title="Platform SSO registered">
                                  PSSO
                                </span>
                              )}
                            </>
                          )}
                          {/* Directory binding */}
                          {device.adBound && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" title={device.adDomain || 'Active Directory bound'}>
                              AD
                            </span>
                          )}
                          {device.ldapBound && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              LDAP
                            </span>
                          )}
                          {/* Windows specific */}
                          {device.failedLoginsLast7Days !== undefined && device.failedLoginsLast7Days > 10 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" title={`${device.failedLoginsLast7Days} failed logins in last 7 days`}>
                              {device.failedLoginsLast7Days} failed
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {device.lastSeen ? formatRelativeTime(device.lastSeen) : '-'}
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

export default function IdentityPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-black animate-pulse"></div>}>
      <IdentityPageContent />
    </Suspense>
  )
}

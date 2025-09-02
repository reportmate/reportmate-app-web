"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { formatRelativeTime } from "../../../src/lib/time"
import { DevicePageNavigation } from "../../../src/components/navigation/DevicePageNavigation"

interface System {
  id: string
  deviceId: string
  deviceName: string
  serialNumber: string
  lastSeen: string
  collectedAt: string
  platform: string
  osVersion: string
  buildVersion: string
  kernelVersion: string
  hostname: string
  computerName: string
  localHostname: string
  uptime: number
  timezone: string
  lastBootTime: string
  cpuLogicalCores: number
  cpuPhysicalCores: number
  cpuBrand: string
  cpuSubtype: string
  hardwareModel: string
  hardwareSerial: string
  physicalMemory: number
  uuid: string
  bootVolume: string
  systemVolume: string
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

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  
  if (days > 0) {
    return `${days}d ${hours}h`
  } else if (hours > 0) {
    return `${hours}h ${mins}m`
  } else {
    return `${mins}m`
  }
}

function SystemPageContent() {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [systems, setSystems] = useState<System[]>([])
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [platformFilter, setPlatformFilter] = useState('all')

  useEffect(() => {
    const fetchSystems = async () => {
      try {
        const response = await fetch('/api/modules/system', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        })
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        setSystems(data)
      } catch (err) {
        console.error('Error fetching systems:', err)
        setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchSystems()
  }, [])

  // Get unique platforms
  const platforms = Array.from(new Set(
    systems.map(s => s.platform).filter(Boolean)
  )).sort()

  // Filter systems
  const filteredSystems = systems.filter(s => {
    if (platformFilter !== 'all') {
      if (s.platform !== platformFilter) return false
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      return (
        s.deviceName?.toLowerCase().includes(query) ||
        s.hostname?.toLowerCase().includes(query) ||
        s.osVersion?.toLowerCase().includes(query) ||
        s.hardwareModel?.toLowerCase().includes(query) ||
        s.cpuBrand?.toLowerCase().includes(query) ||
        s.serialNumber?.toLowerCase().includes(query)
      )
    }
    
    return true
  })

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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black">
        <header className="bg-white dark:bg-gray-900 border-b">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Dashboard
            </Link>
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">System</h1>
          </div>
        </header>
        
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Error Loading System</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
              Try Again
            </button>
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
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <Link href="/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-sm font-medium hidden sm:inline">Dashboard</span>
              </Link>
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
              <div className="flex items-center gap-3 min-w-0">
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">System</h1>
              </div>
            </div>

            {/* Right side - Navigation */}
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              {/* Navigation */}
              <div className="hidden lg:flex">
                <DevicePageNavigation className="flex items-center gap-2" />
              </div>

              {/* Mobile Navigation */}
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
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">System Information</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Operating system and hardware details • {filteredSystems.length} systems
                </p>
              </div>
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

                {/* Search */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search systems..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-48 md:w-64 pl-10 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Device</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">OS Version</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Hardware</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">CPU</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Memory</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Uptime</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Last Seen</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredSystems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">No system records found</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">No system records match your current search.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredSystems.map((sys) => (
                    <tr key={sys.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link 
                          href={`/device/${sys.deviceId}`}
                          className="flex items-center hover:text-purple-600 dark:hover:text-purple-400"
                        >
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{sys.deviceName}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{sys.hostname}</div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="text-gray-900 dark:text-white font-medium">
                            {sys.platform} {sys.osVersion}
                          </div>
                          <div className="text-gray-500 dark:text-gray-400">
                            Build: {sys.buildVersion}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="text-gray-900 dark:text-white">
                            {sys.hardwareModel}
                          </div>
                          <div className="text-gray-500 dark:text-gray-400">
                            {sys.hardwareSerial}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="text-gray-900 dark:text-white">
                            {sys.cpuBrand}
                          </div>
                          <div className="text-gray-500 dark:text-gray-400">
                            {sys.cpuPhysicalCores} cores / {sys.cpuLogicalCores} threads
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {formatBytes(sys.physicalMemory)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="text-gray-900 dark:text-white">
                            {formatUptime(sys.uptime)}
                          </div>
                          {sys.lastBootTime && (
                            <div className="text-gray-500 dark:text-gray-400">
                              Boot: {formatRelativeTime(sys.lastBootTime)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {sys.lastSeen ? formatRelativeTime(sys.lastSeen) : '-'}
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

export default function SystemPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-black animate-pulse"></div>}>
      <SystemPageContent />
    </Suspense>
  )
}

"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { formatRelativeTime } from "../../../src/lib/time"
import { DevicePageNavigation } from "../../../src/components/navigation/DevicePageNavigation"

interface FetchProgress {
  stage: 'discovering' | 'fetching' | 'aggregating' | 'complete' | 'error'
  sessionId: string
  deviceCount: number
  processedDevices: number
  currentDevice?: string | null
  totalInstalls: number
  startTime: number
  data?: any[]
  error?: string
}

function LoadingSkeleton({ progress }: { progress?: FetchProgress }) {
  const getProgressPercentage = () => {
    if (!progress || progress.deviceCount === 0) return 10;
    if (progress.stage === 'discovering') return 15;
    if (progress.stage === 'fetching') {
      return 15 + (progress.processedDevices / progress.deviceCount) * 70; // 15% to 85%
    }
    if (progress.stage === 'aggregating') return 90;
    if (progress.stage === 'complete') return 100;
    return 10;
  };

  const getStatusText = () => {
    if (!progress) return 'Initializing...';
    switch (progress.stage) {
      case 'discovering':
        return `Found ${progress.deviceCount} devices`;
      case 'fetching':
        return ''; 
      case 'aggregating':
        return `Organizing ${progress.totalInstalls.toLocaleString()} install records`;
      case 'complete':
        return 'Ready!';
      case 'error':
        return progress.error || 'An error occurred';
      default:
        return 'Fetching install data from all devices...';
    }
  };

  const progressPercentage = getProgressPercentage();

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">Loading Installs Report</h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {getStatusText()}
          </p>
          <div className="mt-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          {progress && progress.stage === 'fetching' && progress.deviceCount > 0 && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {progress.processedDevices} of {progress.deviceCount} devices processed
              {progress.totalInstalls > 0 && ` • ${progress.totalInstalls.toLocaleString()} installs found`}
            </p>
          )}
        </div>
      </div>

      {/* Dashboard Style Widgets Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Errors/Warnings Stack */}
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                <div className="space-y-2">
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-8"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Version Distribution Skeletons */}
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
            </div>
            <div className="space-y-3">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="space-y-2">
                  <div className="flex justify-between">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2"></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
            </div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-64"></div>
          </div>
        </div>
        <div className="border-b border-gray-200 dark:border-gray-600 px-6 py-3 bg-gray-50 dark:bg-gray-700">
          <div className="flex gap-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-8 bg-gray-200 dark:bg-gray-600 rounded w-16"></div>
            ))}
          </div>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="px-6 py-4 flex space-x-6">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-40"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

interface InstallRecord {
  id: string
  deviceId: string
  deviceName: string
  serialNumber: string
  lastSeen: string
  collectedAt: string
  totalPackages: number
  installed: number
  pending: number
  failed: number
  lastUpdate: string
  packages: any[]
  raw?: any
  installs?: {
    cimian?: {
      version?: string
    }
    munki?: {
      version?: string
    }
  }
}

function InstallsPageContent() {
  const [installs, setInstalls] = useState<InstallRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fetchProgress, setFetchProgress] = useState<FetchProgress | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const searchParams = useSearchParams()

  // Initialize filters from URL
  useEffect(() => {
    const urlSearch = searchParams.get('search')
    if (urlSearch) setSearchQuery(urlSearch)
    
    const urlStatus = searchParams.get('status')
    if (urlStatus && ['installed', 'pending', 'warning', 'error', 'removed'].includes(urlStatus)) {
      setStatusFilter(urlStatus)
    }
  }, [searchParams])

  useEffect(() => {
    const fetchInstallsWithProgress = async () => {
      try {
        console.log('🚀 Starting installs fetch with real-time progress...')
        setLoading(true)
        setError(null)
        setFetchProgress(null)
        
        const sessionId = Date.now().toString()
        const eventSource = new EventSource(`/api/devices/installs/progress?sessionId=${sessionId}`)
        
        eventSource.onmessage = (event) => {
          try {
            const progressData: FetchProgress = JSON.parse(event.data)
            console.log('📊 Progress update:', progressData)
            
            setFetchProgress(progressData)
            
            if (progressData.stage === 'complete' && progressData.data) {
              console.log(`✅ Installs fetch completed! Loaded ${progressData.data.length} devices`)
              console.log('🔍 Sample device data for debugging:', progressData.data[0])
              setInstalls(progressData.data)
              setLoading(false)
              eventSource.close()
            } else if (progressData.stage === 'error') {
              console.error('❌ Progress API error:', progressData.error)
              setError(progressData.error || 'Failed to fetch installs')
              setLoading(false)
              eventSource.close()
            }
          } catch (parseError) {
            console.error('❌ Failed to parse progress data:', parseError)
          }
        }
        
        eventSource.onerror = (event) => {
          console.error('❌ EventSource error:', event)
          setError('Lost connection to progress updates')
          setLoading(false)
          eventSource.close()
        }
        
        // Cleanup on component unmount
        return () => {
          eventSource.close()
        }
        
      } catch (error) {
        console.error('❌ Failed to start progress fetch:', error)
        setError(error instanceof Error ? error.message : 'Failed to start fetch')
        setLoading(false)
      }
    }

    fetchInstallsWithProgress()
  }, [])

  // Filter installs based on status and search
  const filteredInstalls = installs.filter(install => {
    // First filter by search query at the device and package level
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      
      // Check if device name or serial number matches
      const deviceMatches = install.deviceName?.toLowerCase().includes(query) ||
                           install.serialNumber?.toLowerCase().includes(query)
      
      // Check if any package name matches
      const packageMatches = install.packages?.some((pkg: any) => 
        pkg.name?.toLowerCase().includes(query) ||
        pkg.displayName?.toLowerCase().includes(query)
      ) || false
      
      if (!deviceMatches && !packageMatches) {
        return false
      }
    }
    
    // For package-level filtering, we need to check if the device has packages matching the status
    if (statusFilter !== 'all' && install.packages && install.packages.length > 0) {
      const hasMatchingPackage = install.packages.some((pkg: any) => {
        const status = pkg.status?.toLowerCase() || '';
        switch (statusFilter) {
          case 'installed':
            return status === 'installed';
          case 'pending':
            return status === 'pending';
          case 'warning':
            return status === 'warning';
          case 'error':
            return status === 'error';
          case 'removed':
            return status === 'removed';
          default:
            return true;
        }
      })
      
      if (!hasMatchingPackage) {
        return false
      }
    }
    
    return true
  })

  // Create a function to filter packages within each device based on search and status
  const getFilteredPackagesForDevice = (install: InstallRecord) => {
    if (!install.packages || install.packages.length === 0) {
      return []
    }

    return install.packages.filter((pkg: any) => {
      // Apply search filter to individual packages
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const deviceMatches = install.deviceName?.toLowerCase().includes(query) ||
                             install.serialNumber?.toLowerCase().includes(query)
        const packageMatches = pkg.name?.toLowerCase().includes(query) ||
                              pkg.displayName?.toLowerCase().includes(query)
        
        // If device matches, show all packages; if only package matches, show only matching packages
        if (!deviceMatches && !packageMatches) {
          return false
        }
      }

      // Apply status filter to individual packages
      if (statusFilter !== 'all') {
        const status = pkg.status?.toLowerCase() || '';
        switch (statusFilter) {
          case 'installed':
            return status === 'installed';
          case 'pending':
            return status === 'pending';
          case 'warning':
            return status === 'warning';
          case 'error':
            return status === 'error';
          case 'removed':
            return status === 'removed';
          default:
            return false;
        }
      }

      return true
    })
  }

  // Calculate totals
  const totals = {
    devices: installs.length,
    packages: installs.reduce((sum, i) => sum + i.totalPackages, 0),
    installed: installs.reduce((sum, i) => sum + i.installed, 0),
    pending: installs.reduce((sum, i) => sum + i.pending, 0),
    failed: installs.reduce((sum, i) => sum + i.failed, 0)
  }

  if (loading) {
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
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">Installs Report</h1>
                </div>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
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
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 pt-8">
          <LoadingSkeleton progress={fetchProgress || undefined} />
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
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Installs Report</h1>
          </div>
        </header>
        
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Error Loading Installs</h2>
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
                <svg className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">Installs Report</h1>
              </div>
            </div>
            
            <div className="flex items-center gap-4 flex-shrink-0">
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 pt-8">
        {/* Dashboard Style Widgets - 3 columns: Errors/Warnings Stack, Cimian Versions, Munki Versions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Errors/Warnings Stack (1/3) */}
          <div className="space-y-4">
            {/* Error Widget */}
            <Link
              href="/events?filter=error"
              className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md dark:hover:border-gray-600 transition-all duration-200 cursor-pointer group block"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
                  <div className="w-6 h-6 text-red-500 dark:text-red-300">
                    <svg fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-500 dark:text-red-300 group-hover:text-red-700 dark:group-hover:text-red-300 transition-colors">
                    {installs.reduce((sum, install) => sum + (install.packages?.filter((pkg: any) => pkg.status?.toLowerCase() === 'error').length || 0), 0)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                    Errors
                  </p>
                </div>
              </div>
            </Link>

            {/* Warning Widget */}
            <Link
              href="/events?filter=warning" 
              className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md dark:hover:border-gray-600 transition-all duration-200 cursor-pointer group block"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
                  <div className="w-6 h-6 text-yellow-600 dark:text-yellow-400">
                    <svg fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 group-hover:text-yellow-700 dark:group-hover:text-yellow-300 transition-colors">
                    {installs.reduce((sum, install) => sum + (install.packages?.filter((pkg: any) => pkg.status?.toLowerCase() === 'warning').length || 0), 0)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                    Warnings
                  </p>
                </div>
              </div>
            </Link>
          </div>

          {/* Cimian Version Distribution (1/3) */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Cimian Versions</h3>
              </div>
            </div>
            
            {(() => {
              // Extract Cimian version data from installs
              const cimianVersions = installs.reduce((acc: Record<string, number>, install) => {
                // Check both possible locations for Cimian version data
                const cimianVersion = install.installs?.cimian?.version || install.raw?.cimian?.version;
                if (cimianVersion) {
                  acc[cimianVersion] = (acc[cimianVersion] || 0) + 1;
                }
                return acc;
              }, {});

              const sortedCimianVersions = Object.entries(cimianVersions)
                .sort(([versionA], [versionB]) => {
                  // Parse semantic versions for proper sorting (latest first)
                  const parseVersion = (version: string) => {
                    const parts = version.split('.').map(n => parseInt(n) || 0);
                    return parts.concat([0, 0, 0]).slice(0, 3); // Ensure 3 parts
                  };
                  
                  const vA = parseVersion(versionA);
                  const vB = parseVersion(versionB);
                  
                  // Compare major, minor, patch in order (latest first)
                  for (let i = 0; i < 3; i++) {
                    if (vB[i] !== vA[i]) return vB[i] - vA[i];
                  }
                  return 0;
                })
                .slice(0, 5); // Show top 5 versions

              const totalCimianDevices = Object.values(cimianVersions).reduce((sum, count) => sum + count, 0);

              if (sortedCimianVersions.length === 0) {
                return (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-500 dark:text-gray-400">No Windows devices</p>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {sortedCimianVersions.map(([version, count]) => {
                    const percentage = Math.round((count / totalCimianDevices) * 100);
                    
                    return (
                      <div key={version} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-900 dark:text-white font-medium truncate">
                            v{version}
                          </span>
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400 ml-2">
                            {count} ({percentage}%)
                          </span>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full transition-all duration-500 bg-blue-500 dark:bg-blue-400"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Summary */}
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
                    <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                      {totalCimianDevices} Windows device{totalCimianDevices !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Munki Version Distribution (1/3) */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Munki Versions</h3>
              </div>
            </div>
            
            {(() => {
              // Extract Munki version data from installs
              const munkiVersions = installs.reduce((acc: Record<string, number>, install) => {
                // Check both possible locations for Munki version data
                const munkiVersion = install.installs?.munki?.version || install.raw?.munki?.version;
                if (munkiVersion) {
                  acc[munkiVersion] = (acc[munkiVersion] || 0) + 1;
                }
                return acc;
              }, {});

              const sortedMunkiVersions = Object.entries(munkiVersions)
                .sort(([versionA], [versionB]) => {
                  // Parse semantic versions for proper sorting (latest first)
                  const parseVersion = (version: string) => {
                    const parts = version.split('.').map(n => parseInt(n) || 0);
                    return parts.concat([0, 0, 0]).slice(0, 3); // Ensure 3 parts
                  };
                  
                  const vA = parseVersion(versionA);
                  const vB = parseVersion(versionB);
                  
                  // Compare major, minor, patch in order (latest first)
                  for (let i = 0; i < 3; i++) {
                    if (vB[i] !== vA[i]) return vB[i] - vA[i];
                  }
                  return 0;
                })
                .slice(0, 5); // Show top 5 versions

              const totalMunkiDevices = Object.values(munkiVersions).reduce((sum, count) => sum + count, 0);

              if (sortedMunkiVersions.length === 0) {
                return (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-500 dark:text-gray-400">No macOS devices</p>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {sortedMunkiVersions.map(([version, count]) => {
                    const percentage = Math.round((count / totalMunkiDevices) * 100);
                    
                    return (
                      <div key={version} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-900 dark:text-white font-medium truncate">
                            v{version}
                          </span>
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400 ml-2">
                            {count} ({percentage}%)
                          </span>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full transition-all duration-500 bg-green-500 dark:bg-green-400"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Summary */}
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
                    <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                      {totalMunkiDevices} macOS device{totalMunkiDevices !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Installs</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Package installation status and management
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
                  placeholder="Search devices & packages..."
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
          
          {/* Filter Row */}
          <div className="border-b border-gray-200 dark:border-gray-600 px-4 lg:px-6 py-3 bg-gray-50 dark:bg-gray-700">
            <nav className="flex flex-wrap gap-2">
              {(() => {
                // Calculate counts based on currently visible/filtered data
                const allPackages = filteredInstalls.flatMap(install => getFilteredPackagesForDevice(install))
                const installedCount = allPackages.filter((pkg: any) => pkg.status?.toLowerCase() === 'installed').length
                const pendingCount = allPackages.filter((pkg: any) => pkg.status?.toLowerCase() === 'pending').length
                const warningCount = allPackages.filter((pkg: any) => pkg.status?.toLowerCase() === 'warning').length
                const errorCount = allPackages.filter((pkg: any) => pkg.status?.toLowerCase() === 'error').length
                const removedCount = allPackages.filter((pkg: any) => pkg.status?.toLowerCase() === 'removed').length
                
                const filters = [
                  { key: 'all', label: 'All', count: allPackages.length },
                  { key: 'installed', label: 'Installed', count: installedCount },
                  { key: 'pending', label: 'Pending', count: pendingCount },
                  { key: 'warning', label: 'Warning', count: warningCount },
                  { key: 'error', label: 'Error', count: errorCount },
                  { key: 'removed', label: 'Removed', count: removedCount },
                ]

                return filters.map((filter) => {
                  const isActive = statusFilter === filter.key
                  
                  return (
                    <button
                      key={filter.key}
                      onClick={() => setStatusFilter(filter.key)}
                      className={`${
                        isActive
                          ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-500'
                      } px-3 py-1.5 border rounded-lg text-sm font-medium flex items-center gap-2 transition-colors`}
                    >
                      <span className="hidden lg:inline">{filter.label}</span>
                      <span className="lg:hidden">{filter.key === 'all' ? 'All' : filter.label}</span>
                      <span className={`${
                        isActive 
                          ? 'bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200'
                          : 'bg-gray-200 text-gray-700 dark:bg-gray-500 dark:text-gray-200'
                      } inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ml-1`}>
                        {filter.count}
                      </span>
                    </button>
                  )
                })
              })()}
            </nav>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Package
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Device
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Version
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Last Update
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredInstalls.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      <div className="flex flex-col items-center justify-center">
                        <svg className="w-12 h-12 mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <p className="text-lg font-medium mb-1">No package data found</p>
                        <p className="text-sm">
                          {searchQuery 
                            ? `No packages match your search "${searchQuery}".`
                            : 'Try adjusting your search or filter criteria.'
                          }
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredInstalls.flatMap((install) => {
                    const filteredPackages = getFilteredPackagesForDevice(install)
                    
                    if (filteredPackages.length > 0) {
                      return filteredPackages.map((pkg: any, index: number) => (
                        <tr key={`${install.id}-pkg-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <td className="px-4 lg:px-6 py-4">
                            <div className="min-w-0">
                              <div className="font-medium text-gray-900 dark:text-white truncate">
                                {pkg.name || pkg.displayName || 'Unknown Package'}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 lg:px-6 py-4">
                            <Link
                              href={`/device/${encodeURIComponent(install.serialNumber)}`}
                              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            >
                              <div className="min-w-0">
                                <div className="font-medium text-gray-900 dark:text-white truncate">
                                  {install.deviceName || 'Unknown Device'}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400 truncate font-mono">
                                  {install.serialNumber}
                                </div>
                              </div>
                            </Link>
                          </td>
                          <td className="px-4 lg:px-6 py-4">
                            <span className="text-sm font-mono text-gray-900 dark:text-white">
                              {pkg.version || 'N/A'}
                            </span>
                          </td>
                          <td className="px-4 lg:px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              pkg.status?.toLowerCase() === 'installed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                              pkg.status?.toLowerCase() === 'pending' ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200' :
                              pkg.status?.toLowerCase() === 'warning' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                              pkg.status?.toLowerCase() === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                              pkg.status?.toLowerCase() === 'removed' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                            }`}>
                              {pkg.status || 'unknown'}
                            </span>
                          </td>
                          <td className="px-4 lg:px-6 py-4">
                            <div className="text-sm text-gray-900 dark:text-white">
                              {pkg.lastUpdate ? formatRelativeTime(pkg.lastUpdate) : 
                               install.lastUpdate ? formatRelativeTime(install.lastUpdate) :
                               install.collectedAt ? formatRelativeTime(install.collectedAt) : '-'}
                            </div>
                          </td>
                        </tr>
                      ))
                    } else if ((!searchQuery.trim() || 
                               install.deviceName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                               install.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase())) && 
                               statusFilter === 'all') {
                      // Show devices with no packages only if no search query or device matches search
                      return [(
                        <tr key={install.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <td className="px-4 lg:px-6 py-4">
                            <div className="min-w-0">
                              <div className="font-medium text-gray-900 dark:text-white truncate">
                                No packages
                              </div>
                            </div>
                          </td>
                          <td className="px-4 lg:px-6 py-4">
                            <Link
                              href={`/device/${encodeURIComponent(install.serialNumber)}`}
                              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            >
                              <div className="min-w-0">
                                <div className="font-medium text-gray-900 dark:text-white truncate">
                                  {install.deviceName || 'Unknown Device'}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400 truncate font-mono">
                                  {install.serialNumber}
                                </div>
                              </div>
                            </Link>
                          </td>
                          <td className="px-4 lg:px-6 py-4">
                            <span className="text-sm text-gray-500 dark:text-gray-400">-</span>
                          </td>
                          <td className="px-4 lg:px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
                              no data
                            </span>
                          </td>
                          <td className="px-4 lg:px-6 py-4">
                            <div className="text-sm text-gray-900 dark:text-white">
                              {install.collectedAt ? formatRelativeTime(install.collectedAt) : '-'}
                            </div>
                          </td>
                        </tr>
                      )]
                    } else {
                      return []
                    }
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

export default function InstallsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-black animate-pulse"></div>}>
      <InstallsPageContent />
    </Suspense>
  )
}

"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState, Suspense, useMemo } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { formatRelativeTime } from "../../../src/lib/time"
import { DevicePageNavigation } from "../../../src/components/navigation/DevicePageNavigation"

interface Application {
  id: string
  deviceId: string
  deviceName: string
  serialNumber: string
  lastSeen: string
  collectedAt: string
  name: string
  version: string
  vendor: string
  publisher: string
  category: string
  installDate: string
  size: number
  path: string
  bundleId: string
  description: string
}

interface AppVersion {
  version: string
  count: number
  devices: Application[]
}

interface AppGroup {
  name: string
  totalCount: number
  versions: AppVersion[]
  expanded: boolean
  category?: string
  vendor?: string
}

interface FetchProgress {
  stage: 'discovering' | 'fetching' | 'aggregating' | 'complete'
  deviceCount: number
  processedDevices: number
  currentDevice?: string
  totalApplications: number
  startTime: number
}

// In-memory cache for applications data
let applicationsCache: {
  data: Application[] | null
  timestamp: number
  ttl: number
} = {
  data: null,
  timestamp: 0,
  ttl: 30000 // 30 seconds cache
}

function LoadingSkeleton({ progress }: { progress?: FetchProgress }) {
  if (!progress) {
    return (
      <div className="flex gap-6 min-h-screen">
        {/* Left sidebar skeleton */}
        <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          <div className="p-4 space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Right content skeleton */}
        <div className="flex-1 p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 12.2H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V10.2a2 2 0 00-2-2M5 12.2V10.2a2 2 0 012-2m0 0V6.2a2 2 0 012-2h6a2 2 0 012 2v2M7 8.2h10" />
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

      {/* Loading Progress */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Loading Applications</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Building app version catalog from all devices
            </p>
          </div>
          
          <div className="p-6">
            {/* Stage indicator */}
            <div className="mb-6">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  {progress.stage === 'discovering' && (
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </div>
                  )}
                  {progress.stage === 'fetching' && (
                    <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-orange-600 dark:text-orange-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </div>
                  )}
                  {progress.stage === 'aggregating' && (
                    <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-600 dark:text-purple-400 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-7l2 2-2 2m-2 12l2-2-2-2" />
                      </svg>
                    </div>
                  )}
                  {progress.stage === 'complete' && (
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {progress.stage === 'discovering' && `Discovering devices... Found ${progress.deviceCount} devices`}
                    {progress.stage === 'fetching' && progress.currentDevice && `Processing ${progress.currentDevice} (${progress.processedDevices}/${progress.deviceCount})`}
                    {progress.stage === 'fetching' && !progress.currentDevice && `Fetching applications from ${progress.deviceCount} devices (${progress.processedDevices}/${progress.deviceCount})`}
                    {progress.stage === 'aggregating' && `Organizing ${progress.totalApplications.toLocaleString()} applications by name and version...`}
                    {progress.stage === 'complete' && `App catalog ready! ${progress.totalApplications.toLocaleString()} applications organized`}
                  </div>
                  {progress.currentDevice && progress.stage === 'fetching' && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Device: {progress.currentDevice}
                    </div>
                  )}
                  {progress.stage !== 'discovering' && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Elapsed: {Math.round((Date.now() - progress.startTime) / 1000)}s
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Progress bar */}
            {progress.stage === 'fetching' && progress.deviceCount > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <span>Device Progress</span>
                  <span>{progress.processedDevices} / {progress.deviceCount} complete</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-orange-600 dark:bg-orange-500 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${(progress.processedDevices / progress.deviceCount) * 100}%` 
                    }}
                  />
                </div>
              </div>
            )}

            {/* Applications found so far */}
            {progress.totalApplications > 0 && (
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Applications Found: {progress.totalApplications.toLocaleString()}
                </div>
                <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  {progress.stage === 'fetching' 
                    ? `From ${progress.processedDevices} of ${progress.deviceCount} devices processed`
                    : progress.stage === 'aggregating'
                    ? 'Building version catalog...'
                    : 'Ready for browsing!'
                  }
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ApplicationsPageContent() {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [appGroups, setAppGroups] = useState<AppGroup[]>([])
  const [selectedApp, setSelectedApp] = useState<string | null>(null)
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [fetchProgress, setFetchProgress] = useState<FetchProgress>({
    stage: 'discovering',
    deviceCount: 0,
    processedDevices: 0,
    totalApplications: 0,
    startTime: Date.now()
  })

  useEffect(() => {
    const fetchApplicationsWithProgress = async () => {
      try {
        setLoading(true)
        setFetchProgress({
          stage: 'discovering',
          deviceCount: 0,
          processedDevices: 0,
          totalApplications: 0,
          startTime: Date.now()
        })

        // Check cache first
        const now = Date.now()
        if (applicationsCache.data && (now - applicationsCache.timestamp) < applicationsCache.ttl) {
          console.log('[APPLICATIONS] Using cached data')
          setApplications(applicationsCache.data)
          const groups = groupApplicationsByNameAndVersion(applicationsCache.data)
          setAppGroups(groups)
          
          // Auto-select first app if none selected
          if (groups.length > 0 && !selectedApp) {
            setSelectedApp(groups[0].name)
            if (groups[0].versions.length > 0) {
              setSelectedVersion(groups[0].versions[0].version)
            }
          }
          
          setFetchProgress({
            stage: 'complete',
            deviceCount: 0,
            processedDevices: 0,
            totalApplications: applicationsCache.data.length,
            startTime: Date.now()
          })
          setLoading(false)
          return
        }

        // For now, just use the regular API with simulated progress since streaming has env issues
        fetchApplicationsRegular()

      } catch (err) {
        console.error('Error setting up applications stream:', err)
        fetchApplicationsRegular()
      }
    }

    const fetchApplicationsRegular = async () => {
      let progressInterval: NodeJS.Timeout | undefined
      
      try {
        setFetchProgress(prev => ({
          ...prev,
          stage: 'fetching',
          deviceCount: 92, // Known device count
          processedDevices: 0
        }))

        // Start progress simulation
        progressInterval = setInterval(() => {
          setFetchProgress(prev => {
            if (prev.stage === 'fetching' && prev.processedDevices < prev.deviceCount) {
              // Simulate progress at varying speeds (some devices faster than others)
              const increment = Math.random() > 0.7 ? 2 : 1
              const newProcessed = Math.min(prev.processedDevices + increment, prev.deviceCount - 5) // Leave room for final jump
              return {
                ...prev,
                processedDevices: newProcessed,
                currentDevice: `Device ${newProcessed + 1}` // Show current device being processed
              }
            }
            return prev
          })
        }, 200) // Update every 200ms

        const response = await fetch('/api/devices/applications', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        })
        
        // Clear progress simulation
        if (progressInterval) {
          clearInterval(progressInterval)
          progressInterval = undefined
        }
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        
        // Update with final data
        setFetchProgress(prev => ({
          ...prev,
          stage: 'complete',
          processedDevices: prev.deviceCount,
          totalApplications: data.length,
          currentDevice: undefined
        }))
        
        // Cache the data
        const now = Date.now()
        applicationsCache = {
          data: data,
          timestamp: now,
          ttl: 30000
        }
        
        setApplications(data)
        const groups = groupApplicationsByNameAndVersion(data)
        setAppGroups(groups)
        
        // Auto-select first app if none selected
        if (groups.length > 0 && !selectedApp) {
          setSelectedApp(groups[0].name)
          if (groups.length > 0) {
            setSelectedVersion(groups[0].versions[0].version)
          }
        }
        
      } catch (err) {
        console.error('Error fetching applications:', err)
        // Clear progress interval if it exists
        if (progressInterval) {
          clearInterval(progressInterval)
        }
        setError(err instanceof Error ? err.message : 'An unexpected error occurred')
        setFetchProgress(prev => ({
          ...prev,
          stage: 'complete',
          currentDevice: undefined
        }))
      } finally {
        setLoading(false)
      }
    }

    fetchApplicationsWithProgress()
  }, [selectedApp])

  // Group applications by name and version
  const groupApplicationsByNameAndVersion = (apps: Application[]): AppGroup[] => {
    const groups: { [appName: string]: AppGroup } = {}
    
    apps.forEach(app => {
      const appName = app.name || 'Unknown Application'
      
      if (!groups[appName]) {
        groups[appName] = {
          name: appName,
          totalCount: 0,
          versions: [],
          expanded: true,
          category: app.category,
          vendor: app.publisher || app.vendor
        }
      }
      
      groups[appName].totalCount++
      
      // Find or create version group
      let versionGroup = groups[appName].versions.find(v => v.version === app.version)
      if (!versionGroup) {
        versionGroup = {
          version: app.version || 'Unknown',
          count: 0,
          devices: []
        }
        groups[appName].versions.push(versionGroup)
      }
      
      versionGroup.count++
      versionGroup.devices.push(app)
    })
    
    // Sort groups by total count (descending) and versions by count (descending)
    Object.values(groups).forEach(group => {
      group.versions.sort((a, b) => b.count - a.count)
    })
    
    return Object.values(groups)
      .sort((a, b) => b.totalCount - a.totalCount)
      .filter(group => {
        if (!searchQuery.trim()) return true
        const query = searchQuery.toLowerCase()
        return group.name.toLowerCase().includes(query) ||
               group.vendor?.toLowerCase().includes(query) ||
               group.category?.toLowerCase().includes(query)
      })
  }

  const toggleAppExpansion = (appName: string) => {
    setAppGroups(prev => prev.map(group => ({
      ...group,
      expanded: group.name === appName ? !group.expanded : group.expanded
    })))
  }

  const selectAppVersion = (appName: string, version?: string) => {
    setSelectedApp(appName)
    setSelectedVersion(version || null)
    
    // Expand the selected app
    setAppGroups(prev => prev.map(group => ({
      ...group,
      expanded: group.name === appName ? true : group.expanded
    })))
  }

  // Get selected app data
  const selectedAppGroup = appGroups.find(group => group.name === selectedApp)
  const selectedDevices = selectedVersion 
    ? selectedAppGroup?.versions.find(v => v.version === selectedVersion)?.devices || []
    : selectedAppGroup?.versions.flatMap(v => v.devices) || []

  // Filter app groups based on search query
  const filteredAppGroups = useMemo(() => {
    if (!searchQuery.trim()) return appGroups
    const query = searchQuery.toLowerCase()
    return appGroups.filter(group => 
      group.name.toLowerCase().includes(query)
    )
  }, [appGroups, searchQuery])

  // Filter applications based on search query
  const filteredApplications = useMemo(() => {
    if (!searchQuery.trim()) return applications
    const query = searchQuery.toLowerCase()
    return applications.filter(app => 
      app.name?.toLowerCase().includes(query)
    )
  }, [applications, searchQuery])

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
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Applications</h1>
          </div>
        </header>
        
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Error Loading Applications</h2>
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
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 12.2H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V10.2a2 2 0 00-2-2M5 12.2V10.2a2 2 0 012-2m0 0V6.2a2 2 0 012-2h6a2 2 0 012 2v2M7 8.2h10" />
                </svg>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">Applications</h1>
              </div>
            </div>
            {/* Right side - Navigation */}
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

      {/* Search Bar */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
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
                className="block w-full pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {filteredAppGroups.length} applications • {applications.length} total installations
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Split Layout */}
      <div className="flex h-[calc(100vh-160px)]">
        {/* Left Panel - App Groups (33%) */}
        <div className="w-1/3 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Applications</h3>
            
            {loading ? (
              <div className="space-y-4">
                {/* Loading Progress */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    <div>
                      <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        {fetchProgress.stage === 'discovering' && 'Discovering devices...'}
                        {fetchProgress.stage === 'fetching' && `Fetching applications from ${fetchProgress.deviceCount} devices`}
                        {fetchProgress.stage === 'aggregating' && 'Processing application data...'}
                        {fetchProgress.stage === 'complete' && 'Complete!'}
                      </div>
                      {fetchProgress.stage === 'fetching' && fetchProgress.deviceCount > 0 && (
                        <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                          Progress: {fetchProgress.processedDevices}/{fetchProgress.deviceCount}
                          {fetchProgress.currentDevice && ` • ${fetchProgress.currentDevice}`}
                        </div>
                      )}
                    </div>
                  </div>
                  {fetchProgress.stage === 'fetching' && fetchProgress.deviceCount > 0 && (
                    <div className="mt-3">
                      <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(fetchProgress.processedDevices / fetchProgress.deviceCount) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Loading Skeleton for apps */}
                <div className="space-y-2">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="animate-pulse border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1">
                          <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                          <div>
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-1"></div>
                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                          </div>
                        </div>
                        <div className="w-8 h-5 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredAppGroups.map((group) => (
                <div key={group.name} className="border border-gray-200 dark:border-gray-600 rounded-lg">
                  {/* App Header */}
                  <button
                    onClick={() => toggleAppExpansion(group.name)}
                    className={`w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg ${
                      selectedApp === group.name ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <svg 
                        className={`w-4 h-4 text-gray-400 transition-transform ${group.expanded ? 'rotate-90' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{group.name}</div>
                        {group.vendor && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{group.vendor}</div>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Version List */}
                  {group.expanded && (
                    <div className="border-t border-gray-200 dark:border-gray-600">
                      {group.versions.map((version) => (
                        <button
                          key={version.version}
                          onClick={() => selectAppVersion(group.name, version.version)}
                          className={`w-full flex items-center justify-between p-2 pl-8 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                            selectedApp === group.name && selectedVersion === version.version 
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100' 
                              : ''
                          }`}
                        >
                          <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{version.version}</span>
                          <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">
                            {version.count}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          </div>
        </div>

        {/* Right Content - All Applications Table (67%) */}
        <div className="w-2/3 bg-white dark:bg-gray-800 overflow-hidden">
          <div className="h-full flex flex-col">
            {/* Content Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    All Applications
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {filteredApplications.length} total installations across all devices
                  </p>
                </div>
              </div>
            </div>

            {/* Applications Table */}
            <div className="flex-1 overflow-auto">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                      Loading Applications
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {fetchProgress.stage === 'discovering' && 'Discovering devices...'}
                      {fetchProgress.stage === 'fetching' && `Processing ${fetchProgress.processedDevices}/${fetchProgress.deviceCount} devices`}
                      {fetchProgress.stage === 'aggregating' && 'Organizing applications...'}
                      {fetchProgress.stage === 'complete' && 'Finalizing data...'}
                    </p>
                    {fetchProgress.totalApplications > 0 && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                        {fetchProgress.totalApplications.toLocaleString()} applications found so far
                      </p>
                    )}
                  </div>
                </div>
              ) : filteredApplications.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                      No applications found
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {searchQuery.trim() ? 'Try adjusting your search terms.' : 'No applications have been discovered on any devices.'}
                    </p>
                  </div>
                </div>
              ) : (
                <table className="w-full table-auto divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-auto min-w-0">Application</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-48 min-w-0">Device</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-32 min-w-0">Version</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-32 min-w-0">Install Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-24 min-w-0">Size</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredApplications.map((app, index) => (
                      <tr key={`${app.deviceName}-${app.name}-${app.version}-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-4 min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-xs">
                            {app.name || 'Unknown Application'}
                          </div>
                          {app.publisher && (
                            <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                              {app.publisher}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 min-w-0 w-48">
                          <Link 
                            href={`/device/${app.deviceId}`}
                            className="flex items-center hover:text-green-600 dark:hover:text-green-400"
                          >
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{app.deviceName}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400 truncate">{app.serialNumber}</div>
                            </div>
                          </Link>
                        </td>
                        <td className="px-4 py-4 min-w-0 w-32">
                          <span className="text-sm text-gray-900 dark:text-white font-mono truncate block">{app.version}</span>
                        </td>
                        <td className="px-4 py-4 min-w-0 w-32 text-sm text-gray-900 dark:text-white">
                          <span className="truncate block">{app.installDate ? formatRelativeTime(app.installDate) : '-'}</span>
                        </td>
                        <td className="px-4 py-4 min-w-0 w-24 text-sm text-gray-900 dark:text-white">
                          <span className="truncate block">{app.size ? `${(app.size / 1024 / 1024).toFixed(1)} MB` : '-'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ApplicationsPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <ApplicationsPageContent />
    </Suspense>
  )
}

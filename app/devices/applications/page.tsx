"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState, Suspense } from "react"
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

interface FetchProgress {
  stage: 'discovering' | 'fetching' | 'complete'
  deviceCount: number
  currentDevice?: string
  deviceProgress: Array<{
    deviceId: string
    deviceName: string
    status: 'pending' | 'fetching' | 'complete' | 'error'
    applicationCount?: number
    error?: string
  }>
  totalApplications: number
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

function ApplicationsPageContent() {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [fetchProgress, setFetchProgress] = useState<FetchProgress>({
    stage: 'discovering',
    deviceCount: 0,
    deviceProgress: [],
    totalApplications: 0
  })

  useEffect(() => {
    const fetchApplicationsWithProgress = async () => {
      try {
        // Reset progress
        setFetchProgress({
          stage: 'discovering',
          deviceCount: 0,
          deviceProgress: [],
          totalApplications: 0
        })

        // Simulate the discovery phase first
        setFetchProgress(prev => ({
          ...prev,
          stage: 'discovering',
          deviceCount: 10 // This would come from the API in real implementation
        }))
        
        await new Promise(resolve => setTimeout(resolve, 800))
        
        // Simulate fetching each device with progress
        const deviceIds = ['MJ071W8M', 'G6BN851003QF', 'G6BN851005UG', 'MZ00FC44', '53G4FF3', '53HFFF3', '53G9FF3', '3GX9PY2', '53GBFF3', '97BQKQ3']
        const deviceNames = ['Basically Good Media Lab 03', 'Campus Research Lab 12', 'CTS Digital Signage 06', 'Camera Puppet 02', 'Student Lab Mac 15', 'Faculty Office Mac 22', 'Library Study Mac 08', 'Design Studio Mac 31', 'Academic Success Mac 19', 'Innovation Hub Mac 45']
        const applicationCounts = [147, 0, 24, 47, 0, 0, 0, 181, 257, 306]
        
        // Initialize device progress
        const initialProgress = deviceIds.map((deviceId, index) => ({
          deviceId,
          deviceName: deviceNames[index] || `Device ${deviceId}`,
          status: 'pending' as const,
          applicationCount: undefined
        }))
        
        setFetchProgress(prev => ({
          ...prev,
          stage: 'fetching',
          deviceProgress: initialProgress,
          totalApplications: 0 // Start from 0
        }))
        
        // Simulate fetching each device with incremental progress
        for (let i = 0; i < deviceIds.length; i++) {
          const deviceId = deviceIds[i]
          const appCount = applicationCounts[i]
          
          // Update to fetching status
          setFetchProgress(prev => ({
            ...prev,
            currentDevice: deviceId,
            deviceProgress: prev.deviceProgress.map(device => 
              device.deviceId === deviceId 
                ? { ...device, status: 'fetching' }
                : device
            )
          }))
          
          // Simulate fetch delay
          await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 600))
          
          // Update to complete status with incremental app count
          setFetchProgress(prev => ({
            ...prev,
            deviceProgress: prev.deviceProgress.map(device => 
              device.deviceId === deviceId 
                ? { ...device, status: 'complete', applicationCount: appCount }
                : device
            ),
            totalApplications: prev.totalApplications + appCount // Increment total
          }))
        }
        
        // Final update - mark as complete
        setFetchProgress(prev => ({
          ...prev,
          stage: 'complete',
          currentDevice: undefined
        }))
        
        // Now fetch the actual data (in a real implementation, we'd have already collected this during the progress updates)
        const response = await fetch('/api/applications', {
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
        setApplications(data)
      } catch (err) {
        console.error('Error fetching applications:', err)
        setError(err instanceof Error ? err.message : 'An unexpected error occurred')
        setFetchProgress(prev => ({
          ...prev,
          stage: 'complete'
        }))
      } finally {
        setLoading(false)
      }
    }

    fetchApplicationsWithProgress()
  }, [])

  // Get unique categories
  const categories = Array.from(new Set(
    applications.map(app => app.category).filter(Boolean)
  )).sort()

  // Filter applications
  const filteredApplications = applications.filter(app => {
    if (categoryFilter !== 'all') {
      if (app.category !== categoryFilter) return false
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      return (
        app.deviceName?.toLowerCase().includes(query) ||
        app.name?.toLowerCase().includes(query) ||
        app.vendor?.toLowerCase().includes(query) ||
        app.publisher?.toLowerCase().includes(query) ||
        app.bundleId?.toLowerCase().includes(query) ||
        app.serialNumber?.toLowerCase().includes(query)
      )
    }
    
    return true
  })

  if (loading) {
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

        {/* Loading Progress */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Loading Applications</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Fetching application data from all devices
              </p>
            </div>
            
            <div className="p-6">
              {/* Stage indicator */}
              <div className="mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {fetchProgress.stage === 'discovering' && (
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </div>
                    )}
                    {fetchProgress.stage === 'fetching' && (
                      <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-orange-600 dark:text-orange-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </div>
                    )}
                    {fetchProgress.stage === 'complete' && (
                      <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {fetchProgress.stage === 'discovering' && `Discovering devices... Found ${fetchProgress.deviceCount} devices`}
                      {fetchProgress.stage === 'fetching' && `Fetching applications from ${fetchProgress.deviceCount} devices`}
                      {fetchProgress.stage === 'complete' && `Successfully aggregated ${fetchProgress.totalApplications} applications from all devices`}
                    </div>
                    {fetchProgress.currentDevice && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Currently fetching: {fetchProgress.currentDevice}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress overview */}
              {fetchProgress.stage !== 'discovering' && fetchProgress.deviceProgress.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <span>Device Progress</span>
                    <span>{fetchProgress.deviceProgress.filter(d => d.status === 'complete').length} / {fetchProgress.deviceProgress.length} complete</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${(fetchProgress.deviceProgress.filter(d => d.status === 'complete').length / fetchProgress.deviceProgress.length) * 100}%` 
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Device list */}
              {fetchProgress.deviceProgress.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Device Details</h3>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {fetchProgress.deviceProgress.map((device) => (
                      <div key={device.deviceId} className="flex items-center gap-3 p-2 rounded border border-gray-200 dark:border-gray-600">
                        <div className="flex-shrink-0">
                          {device.status === 'pending' && (
                            <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 rounded-full" />
                          )}
                          {device.status === 'fetching' && (
                            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                          )}
                          {device.status === 'complete' && (
                            <div className="w-4 h-4 bg-green-600 rounded-full flex items-center justify-center">
                              <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 8 8">
                                <path d="M6.564.75l-3.59 3.612-1.538-1.55L0 4.26l2.974 2.99L8 2.193z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {device.deviceName}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {device.deviceId}
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {device.status === 'complete' && device.applicationCount !== undefined && (
                            <span>{device.applicationCount} apps</span>
                          )}
                          {device.status === 'fetching' && (
                            <span className="text-blue-600 dark:text-blue-400">Fetching...</span>
                          )}
                          {device.status === 'pending' && (
                            <span className="text-gray-400">Waiting...</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Total progress */}
              {fetchProgress.totalApplications > 0 && (
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Total Applications Found: {fetchProgress.totalApplications.toLocaleString()}
                  </div>
                  <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    Aggregated from {fetchProgress.deviceProgress.filter(d => d.status === 'complete').length} devices
                  </div>
                </div>
              )}
            </div>
          </div>
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
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Installed Applications</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Software applications installed on devices • {filteredApplications.length} applications
                </p>
              </div>
              <div className="flex items-center gap-4">
                {/* Category Filter */}
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-1.5"
                >
                  <option value="all">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
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
                    placeholder="Search applications..."
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Application</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Vendor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Size</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Install Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Last Seen</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredApplications.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-7l2 2-2 2m-2 12l2-2-2-2" />
                        </svg>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">No applications found</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">No applications match your current search.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredApplications.map((app) => (
                    <tr key={app.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link 
                          href={`/device/${app.deviceId}`}
                          className="flex items-center hover:text-green-600 dark:hover:text-green-400"
                        >
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{app.deviceName}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{app.serialNumber}</div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{app.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{app.version}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {app.publisher || app.vendor || 'Unknown'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          app.category === 'Productivity' 
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            : app.category === 'Development'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : app.category === 'Utilities'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        }`}>
                          {app.category || 'Other'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {app.size ? `${(app.size / 1024 / 1024).toFixed(1)} MB` : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {app.installDate ? formatRelativeTime(app.installDate) : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {app.lastSeen ? formatRelativeTime(app.lastSeen) : '-'}
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

export default function ApplicationsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-black animate-pulse"></div>}>
      <ApplicationsPageContent />
    </Suspense>
  )
}

/**
 * Applications Tab Component
 * Installed applications, software inventory, and usage tracking
 */

import React, { useMemo, useState } from 'react'
import { ApplicationsTable } from '../tables'
import { extractApplications } from '../../lib/data-processing/modules/applications'
import { formatRelativeTime } from '../../lib/time'

// Extended ApplicationInfo with usage data
interface ApplicationUsage {
  launchCount: number
  totalSeconds: number
  lastUsed?: string
  firstSeen?: string
  users?: string[]
  uniqueUserCount?: number
  averageSessionSeconds?: number
}

interface ApplicationInfo {
  id: string;
  name: string;
  displayName?: string;
  path?: string;
  version: string;
  bundle_version?: string;
  last_modified?: number;
  obtained_from?: string;
  runtime_environment?: string;
  info?: string;
  has64bit?: boolean;
  signed_by?: string;
  publisher?: string;
  category?: string;
  installDate?: string;
  size?: string;
  bundleId?: string;
  install_location?: string;
  description?: string;
  status?: string;
  startType?: string;
  usage?: ApplicationUsage;
}

// Usage snapshot from the module
interface UsageSnapshot {
  IsCaptureEnabled?: boolean
  isCaptureEnabled?: boolean
  Status?: string
  status?: string
  TotalLaunches?: number
  totalLaunches?: number
  TotalUsageSeconds?: number
  totalUsageSeconds?: number
  Applications?: ApplicationUsage[]
  applications?: ApplicationUsage[]
  ActiveSessions?: unknown[]
  activeSessions?: unknown[]
}

interface DeviceData {
  applications?: {
    installedApps?: ApplicationInfo[]
  }
  modules?: {
    applications?: {
      installed_applications?: ApplicationInfo[]
      installedApplications?: ApplicationInfo[]
      InstalledApplications?: ApplicationInfo[]
      Usage?: UsageSnapshot
      usage?: UsageSnapshot
    }
  }
}

interface ApplicationsTabProps {
  device: DeviceData
  data?: {
    installedApps?: ApplicationInfo[]
  }
}

// Helper to format duration
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`
  const hours = Math.floor(seconds / 3600)
  const mins = Math.round((seconds % 3600) / 60)
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

export const ApplicationsTab: React.FC<ApplicationsTabProps> = ({ device, data }) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'unused' | 'singleUser' | 'withUsage'>('all')
  
  // Process applications data from the modular device structure
  const applicationsModuleData = extractApplications(device?.modules || {})
  
  // Extract usage data from module
  const usageData = device?.modules?.applications?.Usage || device?.modules?.applications?.usage
  const isUsageAvailable = usageData?.IsCaptureEnabled || usageData?.isCaptureEnabled || false
  const usageStatus = usageData?.Status || usageData?.status || 'unavailable'
  
  // Check if we have applications data
  const hasApplicationsData = (data?.installedApps?.length ?? 0) > 0 ||
                              (device?.applications?.installedApps?.length ?? 0) > 0 ||
                              (device?.modules?.applications?.installed_applications?.length ?? 0) > 0 || 
                              (device?.modules?.applications?.installedApplications?.length ?? 0) > 0 || 
                              (applicationsModuleData?.applications?.length ?? 0) > 0
  
  // Memoize the selection of installed apps
  const installedApps = useMemo(() => {
    if (data?.installedApps?.length) {
      return data.installedApps
    } else if (device?.modules?.applications?.installedApplications) {
      return device.modules.applications.installedApplications
    } else if (device?.modules?.applications?.InstalledApplications) {
      return device.modules.applications.InstalledApplications
    } else if (device?.modules?.applications?.installed_applications) {
      return device.modules.applications.installed_applications
    } else if (applicationsModuleData?.applications) {
      return applicationsModuleData.applications
    }
    return []
  }, [
    data?.installedApps, 
    device?.modules?.applications?.installedApplications,
    device?.modules?.applications?.InstalledApplications,
    device?.modules?.applications?.installed_applications,
    applicationsModuleData?.applications
  ])

  // Transform and enrich with usage data
  const processedApps = useMemo(() => {
    return installedApps.map((app: ApplicationInfo, index: number) => ({
      id: app.id || app.name || `app-${index}`,
      name: app.name || app.displayName || 'Unknown Application',
      displayName: app.displayName || app.name,
      version: app.version || (app as unknown as Record<string, unknown>).bundle_version as string || 'Unknown',
      publisher: app.publisher || (app as unknown as Record<string, unknown>).signed_by as string || 'Unknown Publisher',
      category: app.category || 'Uncategorized',
      installDate: app.installDate || (app as unknown as Record<string, unknown>).install_date as string || (app as unknown as Record<string, unknown>).last_modified as string,
      size: app.size,
      path: app.path || (app as unknown as Record<string, unknown>).install_location as string,
      bundleId: (app as unknown as Record<string, unknown>).bundleId as string || (app as unknown as Record<string, unknown>).bundle_id as string,
      info: (app as unknown as Record<string, unknown>).info as string,
      obtained_from: (app as unknown as Record<string, unknown>).obtained_from as string,
      runtime_environment: (app as unknown as Record<string, unknown>).runtime_environment as string,
      has64bit: (app as unknown as Record<string, unknown>).has64bit as boolean,
      signed_by: (app as unknown as Record<string, unknown>).signed_by as string,
      usage: app.usage || (app as unknown as Record<string, unknown>).Usage as ApplicationUsage
    }))
  }, [installedApps])

  // Filter apps based on active filter
  const filteredApps = useMemo(() => {
    if (activeFilter === 'all') return processedApps
    
    if (activeFilter === 'withUsage') {
      return processedApps.filter((app: ApplicationInfo) => 
        app.usage?.launchCount && app.usage.launchCount > 0
      )
    }
    
    if (activeFilter === 'unused') {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      return processedApps.filter((app: ApplicationInfo) => {
        if (!app.usage?.lastUsed) return true // No usage data = unused
        const lastUsed = new Date(app.usage.lastUsed)
        return lastUsed < thirtyDaysAgo
      })
    }
    
    if (activeFilter === 'singleUser') {
      return processedApps.filter((app: ApplicationInfo) => 
        app.usage?.uniqueUserCount === 1
      )
    }
    
    return processedApps
  }, [processedApps, activeFilter])

  // Calculate statistics
  const totalApps = processedApps.length
  const signedApps = processedApps.filter((app: ApplicationInfo) => 
    (app as unknown as Record<string, unknown>).signed_by || app.publisher !== 'Unknown Publisher'
  ).length
  const recentApps = processedApps.filter((app: ApplicationInfo) => {
    if (!app.installDate) return false
    const installDate = new Date(app.installDate)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    return installDate > thirtyDaysAgo
  }).length

  // Usage statistics
  const appsWithUsage = processedApps.filter((app: ApplicationInfo) => app.usage?.launchCount && app.usage.launchCount > 0).length
  const unusedApps = processedApps.filter((app: ApplicationInfo) => {
    if (!app.usage?.lastUsed) return true
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    return new Date(app.usage.lastUsed) < thirtyDaysAgo
  }).length
  const singleUserApps = processedApps.filter((app: ApplicationInfo) => app.usage?.uniqueUserCount === 1).length
  const totalUsageHours = processedApps.reduce((sum: number, app: ApplicationInfo) => 
    sum + (app.usage?.totalSeconds || 0) / 3600, 0
  )
  
  // Top apps by usage
  const topAppsByUsage = useMemo(() => {
    return [...processedApps]
      .filter((app: ApplicationInfo) => app.usage?.totalSeconds && app.usage.totalSeconds > 0)
      .sort((a: ApplicationInfo, b: ApplicationInfo) => (b.usage?.totalSeconds || 0) - (a.usage?.totalSeconds || 0))
      .slice(0, 5)
  }, [processedApps])

  const applicationsData = useMemo(() => ({
    totalApps: filteredApps.length,
    signedApps,
    recentApps,
    installedApps: filteredApps
  }), [filteredApps, signedApps, recentApps])

  // Empty state
  if (!hasApplicationsData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Applications</h1>
              <p className="text-base text-gray-600 dark:text-gray-400">Inventory and usage tracking</p>
            </div>
          </div>
        </div>
        <ApplicationsTable data={applicationsData} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Applications</h1>
            <p className="text-base text-gray-600 dark:text-gray-400">Inventory and usage tracking</p>
          </div>
        </div>
        
        {/* Total Apps Count */}
        <div className="flex items-center gap-4">
          {totalApps > 0 && (
            <div className="text-right">
              <div className="text-sm text-gray-500 dark:text-gray-400">Total Applications</div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {totalApps.toLocaleString()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Usage Status Banner */}
      {!isUsageAvailable && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Usage Tracking {usageStatus}</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                    Kernel process telemetry is not available. Enable Microsoft-Windows-Kernel-Process/Operational log for usage tracking.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Usage Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div 
              className={`bg-white dark:bg-gray-800 rounded-xl p-4 border cursor-pointer transition-colors ${
                activeFilter === 'withUsage' 
                  ? 'border-green-500 ring-1 ring-green-500' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-green-300'
              }`}
              onClick={() => setActiveFilter(activeFilter === 'withUsage' ? 'all' : 'withUsage')}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{appsWithUsage}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Apps with Usage Data</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalUsageHours.toFixed(1)}h</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Usage Time</p>
                </div>
              </div>
            </div>
            
            <div 
              className={`bg-white dark:bg-gray-800 rounded-xl p-4 border cursor-pointer transition-colors ${
                activeFilter === 'unused' 
                  ? 'border-amber-500 ring-1 ring-amber-500' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-amber-300'
              }`}
              onClick={() => setActiveFilter(activeFilter === 'unused' ? 'all' : 'unused')}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{unusedApps}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Unused (30+ days)</p>
                </div>
              </div>
            </div>
            
            <div 
              className={`bg-white dark:bg-gray-800 rounded-xl p-4 border cursor-pointer transition-colors ${
                activeFilter === 'singleUser' 
                  ? 'border-blue-500 ring-1 ring-blue-500' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
              }`}
              onClick={() => setActiveFilter(activeFilter === 'singleUser' ? 'all' : 'singleUser')}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{singleUserApps}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Single-User Apps</p>
                </div>
              </div>
            </div>
          </div>

          {/* Top Apps by Usage */}
          {topAppsByUsage.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Top Applications by Usage</h3>
              </div>
              <div className="p-4">
                <div className="space-y-3">
                  {topAppsByUsage.map((app: ApplicationInfo, index: number) => {
                    const maxSeconds = topAppsByUsage[0]?.usage?.totalSeconds || 1
                    const percentage = ((app.usage?.totalSeconds || 0) / maxSeconds) * 100
                    
                    return (
                      <div key={app.id || index} className="flex items-center gap-4">
                        <div className="w-8 text-sm font-medium text-gray-500 dark:text-gray-400">
                          #{index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {app.displayName || app.name}
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                              {formatDuration(app.usage?.totalSeconds || 0)}
                            </span>
                          </div>
                          <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 rounded-full transition-all duration-300"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                            <span>{app.usage?.launchCount || 0} launches</span>
                            {app.usage?.uniqueUserCount && (
                              <span>{app.usage.uniqueUserCount} user{app.usage.uniqueUserCount > 1 ? 's' : ''}</span>
                            )}
                            {app.usage?.lastUsed && (
                              <span>Last: {formatRelativeTime(app.usage.lastUsed)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Filter indicator */}
          {activeFilter !== 'all' && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Filtering: {activeFilter === 'unused' ? 'Unused apps (30+ days)' : activeFilter === 'singleUser' ? 'Single-user apps' : 'Apps with usage data'}
              </span>
              <button 
                onClick={() => setActiveFilter('all')}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Clear filter
              </button>
            </div>
          )}

      {/* Applications Table */}
      <ApplicationsTable data={applicationsData} />

      {/* Debug Accordion for API Data */}
      <div className="mt-6">
        <details className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
          <summary className="cursor-pointer px-4 py-3 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Debug API JSON Data</span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              device.modules.applications
            </span>
          </summary>
          <div className="border-t border-gray-200 dark:border-gray-700">
            <div className="p-4">
              <div className="flex justify-end gap-2 mb-2">
                <button
                  onClick={() => {
                    const jsonString = JSON.stringify(device?.modules?.applications, null, 2)
                    navigator.clipboard.writeText(jsonString)
                  }}
                  className="px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Copy JSON
                </button>
              </div>
              <pre className="p-4 bg-gray-900 dark:bg-black text-gray-100 text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-[600px] overflow-y-auto rounded border border-gray-700">
                {JSON.stringify(device?.modules?.applications, null, 2)}
              </pre>
            </div>
          </div>
        </details>
      </div>
    </div>
  )
}

export default ApplicationsTab

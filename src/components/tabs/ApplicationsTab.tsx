/**
 * Applications Tab Component
 * Installed applications, software inventory, and usage tracking
 */

import React, { useMemo, useState } from 'react'
import { ApplicationsTable } from '../tables'
import { extractApplications } from '../../lib/data-processing/modules/applications'
import { formatRelativeTime } from '../../lib/time'
import { normalizeKeys } from '../../lib/utils/powershell-parser'
import { DebugAccordion } from '../DebugAccordion'

// Extended ApplicationInfo with usage data
// Supports both frontend-standard field names and Windows client variants
interface ApplicationUsage {
  launchCount: number
  totalSeconds?: number
  totalUsageSeconds?: number  // Windows client variant
  lastUsed?: string
  lastLaunchTime?: string  // Windows client variant
  firstSeen?: string
  users?: string[]
  uniqueUserCount?: number
  averageSessionSeconds?: number
}

// macOS active session from SQLite watcher
interface ActiveSession {
  name: string
  path: string
  user: string
  isActive: number | boolean
  processId: number
  sessionId: string
  startTime: string
  durationSeconds: number
}

// macOS applicationUsage structure
interface MacApplicationUsage {
  status?: string
  captureMethod?: string
  totalLaunches?: number
  totalUsageSeconds?: number
  activeSessions?: ActiveSession[]
  windowStart?: string
  windowEnd?: string
  generatedAt?: string
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
  ActiveSessions?: ActiveSession[]
  activeSessions?: ActiveSession[]
  CaptureMethod?: string
  captureMethod?: string
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
  
  // Normalize snake_case to camelCase for applications module
  // Prefer direct data prop if available
  const rawApplicationsModule = data || device?.modules?.applications
  const normalizedApplicationsModule = rawApplicationsModule ? normalizeKeys(rawApplicationsModule) as any : null
  
  // Process applications data from the modular device structure (or constructed from data)
  const applicationsModuleData = extractApplications(normalizedApplicationsModule ? { applications: normalizedApplicationsModule } : device?.modules || {})
  
  // Extract usage data - check both raw and normalized module
  // macOS sends applicationUsage at the module level with activeSessions array
  const rawUsageData = (rawApplicationsModule as any)?.applicationUsage || (rawApplicationsModule as any)?.usage
  const normalizedUsageData = normalizedApplicationsModule?.applicationUsage || normalizedApplicationsModule?.usage
  const usageData = rawUsageData || normalizedUsageData
  
  // For macOS SQLiteWatcher, check captureMethod instead of isCaptureEnabled
  const captureMethod = usageData?.captureMethod || usageData?.CaptureMethod
  const isUsageAvailable = captureMethod === 'SQLiteWatcher' || usageData?.isCaptureEnabled || usageData?.IsCaptureEnabled || false
  const usageStatus = isUsageAvailable ? 'available' : (usageData?.status || usageData?.Status || 'unavailable')
  
  // Get active sessions from macOS data
  const activeSessions: ActiveSession[] = usageData?.activeSessions || usageData?.ActiveSessions || []
  
  // Build usage map by app path for efficient lookup
  const usageByPath = useMemo(() => {
    const map = new Map<string, {
      launchCount: number
      totalSeconds: number
      lastUsed: string
      firstSeen: string
      users: Set<string>
    }>()
    
    for (const session of activeSessions) {
      const path = session.path
      if (!path) continue
      
      const existing = map.get(path)
      if (existing) {
        existing.launchCount++
        existing.totalSeconds += session.durationSeconds || 0
        if (session.startTime > existing.lastUsed) {
          existing.lastUsed = session.startTime
        }
        if (session.startTime < existing.firstSeen) {
          existing.firstSeen = session.startTime
        }
        if (session.user) {
          existing.users.add(session.user)
        }
      } else {
        map.set(path, {
          launchCount: 1,
          totalSeconds: session.durationSeconds || 0,
          lastUsed: session.startTime || '',
          firstSeen: session.startTime || '',
          users: new Set(session.user ? [session.user] : [])
        })
      }
    }
    
    return map
  }, [activeSessions])
  
  // Check if we have applications data - check normalized module
  const hasApplicationsData = (data?.installedApps?.length ?? 0) > 0 ||
                              (device?.applications?.installedApps?.length ?? 0) > 0 ||
                              (normalizedApplicationsModule?.installedApplications?.length ?? 0) > 0 || 
                              (applicationsModuleData?.applications?.length ?? 0) > 0
  
  // Memoize the selection of installed apps - use normalized module
  const installedApps = useMemo(() => {
    if (data?.installedApps?.length) {
      return data.installedApps
    } else if (normalizedApplicationsModule?.installedApplications) {
      return normalizedApplicationsModule.installedApplications
    } else if (applicationsModuleData?.applications) {
      return applicationsModuleData.applications
    }
    return []
  }, [
    data?.installedApps, 
    normalizedApplicationsModule?.installedApplications,
    applicationsModuleData?.applications
  ])

  // Transform and enrich with usage data
  const processedApps = useMemo(() => {
    return installedApps.map((app: ApplicationInfo, index: number) => {
      // Look up usage from the usageByPath map (macOS) or existing app.usage (Windows)
      // Windows uses installLocation (camelCase), check both variants
      const appPath = app.path || (app as unknown as Record<string, unknown>).installLocation as string || (app as unknown as Record<string, unknown>).install_location as string
      const sessionUsage = appPath ? usageByPath.get(appPath) : undefined

      // Build usage object from session data if available
      // Windows client sends totalUsageSeconds/lastLaunchTime, normalize to totalSeconds/lastUsed
      const existingUsage = app.usage || (app as unknown as Record<string, unknown>).Usage as ApplicationUsage & { totalUsageSeconds?: number; lastLaunchTime?: string }
      let usage: ApplicationUsage | undefined = existingUsage ? {
        launchCount: existingUsage.launchCount,
        totalSeconds: existingUsage.totalSeconds || existingUsage.totalUsageSeconds || 0,
        lastUsed: existingUsage.lastUsed || existingUsage.lastLaunchTime,
        firstSeen: existingUsage.firstSeen,
        users: existingUsage.users,
        uniqueUserCount: existingUsage.uniqueUserCount,
        averageSessionSeconds: existingUsage.averageSessionSeconds
      } : undefined
      
      if (sessionUsage) {
        usage = {
          launchCount: sessionUsage.launchCount,
          totalSeconds: sessionUsage.totalSeconds,
          lastUsed: sessionUsage.lastUsed,
          firstSeen: sessionUsage.firstSeen,
          users: Array.from(sessionUsage.users),
          uniqueUserCount: sessionUsage.users.size,
          averageSessionSeconds: sessionUsage.launchCount > 0 
            ? sessionUsage.totalSeconds / sessionUsage.launchCount 
            : 0
        }
      }
      
      return {
        id: app.id || app.name || `app-${index}`,
        name: app.name || app.displayName || 'Unknown Application',
        displayName: app.displayName || app.name,
        version: app.version || (app as unknown as Record<string, unknown>).bundle_version as string || 'Unknown',
        publisher: app.publisher || (app as unknown as Record<string, unknown>).signed_by as string || 'Unknown Publisher',
        category: app.category || 'Uncategorized',
        installDate: app.installDate || (app as unknown as Record<string, unknown>).install_date as string || (app as unknown as Record<string, unknown>).last_modified as string,
        size: app.size,
        path: appPath,
        bundleId: (app as unknown as Record<string, unknown>).bundleId as string || (app as unknown as Record<string, unknown>).bundle_id as string || (app as unknown as Record<string, unknown>).bundleIdentifier as string,
        info: (app as unknown as Record<string, unknown>).info as string,
        obtained_from: (app as unknown as Record<string, unknown>).obtained_from as string,
        runtime_environment: (app as unknown as Record<string, unknown>).runtime_environment as string,
        has64bit: (app as unknown as Record<string, unknown>).has64bit as boolean,
        signed_by: (app as unknown as Record<string, unknown>).signed_by as string,
        usage
      }
    })
  }, [installedApps, usageByPath])

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

      {/* Applications Table */}
      <ApplicationsTable data={applicationsData} />

      <DebugAccordion
        data={device?.modules?.applications}
        label="device.modules.applications"
        moduleVersion={(device?.modules?.applications as any)?.moduleVersion}
      />
    </div>
  )
}

export default ApplicationsTab

/**
 * Application Usage Widgets
 * Charts and visualizations for application usage tracking
 */

import React, { useMemo } from 'react'
import { formatRelativeTime } from '../../lib/time'

// Application usage data structure
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
  id: string
  name: string
  displayName?: string
  path?: string
  version: string
  publisher?: string
  usage?: ApplicationUsage
}

interface UsageWidgetsProps {
  applications: ApplicationInfo[]
  showUserBreakdown?: boolean
  className?: string
}

// Helper to format duration
function formatDuration(seconds: number, verbose = false): string {
  if (!seconds || seconds <= 0) return '-'
  
  if (verbose) {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.round(seconds % 60)
    
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
    }
    if (mins > 0) {
      return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
    }
    return `${secs}s`
  }
  
  if (seconds < 60) return `${Math.round(seconds)}s`
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`
  const hours = Math.floor(seconds / 3600)
  const mins = Math.round((seconds % 3600) / 60)
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

// Helper to format percentage
function formatPercent(value: number, total: number): string {
  if (total === 0) return '0%'
  return `${Math.round((value / total) * 100)}%`
}

/**
 * Usage Distribution Bar Chart
 * Shows relative usage time for top applications
 */
export const UsageDistributionChart: React.FC<{ apps: ApplicationInfo[], maxItems?: number }> = ({ 
  apps, 
  maxItems = 10 
}) => {
  const topApps = useMemo(() => {
    return [...apps]
      .filter(app => app.usage?.totalSeconds && app.usage.totalSeconds > 0)
      .sort((a, b) => (b.usage?.totalSeconds || 0) - (a.usage?.totalSeconds || 0))
      .slice(0, maxItems)
  }, [apps, maxItems])

  const maxSeconds = topApps[0]?.usage?.totalSeconds || 1
  const totalSeconds = topApps.reduce((sum, app) => sum + (app.usage?.totalSeconds || 0), 0)

  if (topApps.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No usage data available
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {topApps.map((app, index) => {
        const percentage = ((app.usage?.totalSeconds || 0) / maxSeconds) * 100
        const _totalPercentage = ((app.usage?.totalSeconds || 0) / totalSeconds) * 100
        
        // Generate gradient color based on position
        const hue = 210 + (index * 15) // Blue to purple gradient
        const saturation = 70 - (index * 3)
        const lightness = 55 + (index * 2)
        
        return (
          <div key={app.id || index} className="group">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="w-5 text-xs font-medium text-gray-400 shrink-0">
                  {index + 1}.
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {app.displayName || app.name}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatPercent(app.usage?.totalSeconds || 0, totalSeconds)}
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white w-16 text-right">
                  {formatDuration(app.usage?.totalSeconds || 0)}
                </span>
              </div>
            </div>
            <div className="h-6 bg-gray-100 dark:bg-gray-700 rounded-md overflow-hidden relative">
              <div 
                className="h-full rounded-md transition-all duration-500 ease-out flex items-center justify-end pr-2"
                style={{ 
                  width: `${percentage}%`,
                  backgroundColor: `hsl(${hue}, ${saturation}%, ${lightness}%)`
                }}
              >
                {percentage > 20 && (
                  <span className="text-[10px] font-medium text-white opacity-80">
                    {app.usage?.launchCount} launches
                  </span>
                )}
              </div>
              {percentage <= 20 && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-500">
                  {app.usage?.launchCount} launches
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Usage Summary Stats Row
 * Compact row of key usage metrics
 */
export const UsageSummaryStats: React.FC<{ apps: ApplicationInfo[] }> = ({ apps }) => {
  const stats = useMemo(() => {
    const appsWithUsage = apps.filter(app => app.usage?.launchCount && app.usage.launchCount > 0)
    const totalLaunches = appsWithUsage.reduce((sum, app) => sum + (app.usage?.launchCount || 0), 0)
    const totalSeconds = appsWithUsage.reduce((sum, app) => sum + (app.usage?.totalSeconds || 0), 0)
    const allUsers = new Set<string>()
    appsWithUsage.forEach(app => {
      app.usage?.users?.forEach(u => allUsers.add(u))
    })
    
    const mostUsedApp = [...appsWithUsage]
      .sort((a, b) => (b.usage?.totalSeconds || 0) - (a.usage?.totalSeconds || 0))[0]
    
    const mostLaunchedApp = [...appsWithUsage]
      .sort((a, b) => (b.usage?.launchCount || 0) - (a.usage?.launchCount || 0))[0]

    return {
      totalApps: apps.length,
      appsWithUsage: appsWithUsage.length,
      unusedApps: apps.length - appsWithUsage.length,
      totalLaunches,
      totalSeconds,
      uniqueUsers: allUsers.size,
      mostUsedApp,
      mostLaunchedApp
    }
  }, [apps])

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-linear-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 rounded-xl p-4">
        <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.appsWithUsage}</div>
        <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">Active Apps</div>
        <div className="text-[10px] text-blue-500 dark:text-blue-500 mt-0.5">of {stats.totalApps} total</div>
      </div>
      
      <div className="bg-linear-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/20 rounded-xl p-4">
        <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{formatDuration(stats.totalSeconds)}</div>
        <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">Total Usage</div>
        <div className="text-[10px] text-purple-500 dark:text-purple-500 mt-0.5">{stats.totalLaunches.toLocaleString()} launches</div>
      </div>
      
      <div className="bg-linear-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20 rounded-xl p-4">
        <div className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.uniqueUsers}</div>
        <div className="text-xs text-green-600 dark:text-green-400 mt-1">Unique Users</div>
        <div className="text-[10px] text-green-500 dark:text-green-500 mt-0.5">across all apps</div>
      </div>
      
      <div className="bg-linear-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/20 rounded-xl p-4">
        <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{stats.unusedApps}</div>
        <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">Unused Apps</div>
        <div className="text-[10px] text-amber-500 dark:text-amber-500 mt-0.5">no recent activity</div>
      </div>
    </div>
  )
}

/**
 * Most Active Users Widget
 * Shows users with the most application usage
 */
export const MostActiveUsersWidget: React.FC<{ apps: ApplicationInfo[], maxUsers?: number }> = ({ 
  apps, 
  maxUsers = 5 
}) => {
  const userStats = useMemo(() => {
    const userMap = new Map<string, { totalSeconds: number, totalLaunches: number, appCount: number }>()
    
    apps.forEach(app => {
      if (!app.usage?.users) return
      
      // Distribute usage among users (simple equal split for now)
      const userCount = app.usage.users.length
      const secondsPerUser = (app.usage.totalSeconds || 0) / userCount
      const launchesPerUser = Math.ceil((app.usage.launchCount || 0) / userCount)
      
      app.usage.users.forEach(user => {
        const existing = userMap.get(user) || { totalSeconds: 0, totalLaunches: 0, appCount: 0 }
        userMap.set(user, {
          totalSeconds: existing.totalSeconds + secondsPerUser,
          totalLaunches: existing.totalLaunches + launchesPerUser,
          appCount: existing.appCount + 1
        })
      })
    })
    
    return Array.from(userMap.entries())
      .map(([user, stats]) => ({ user, ...stats }))
      .sort((a, b) => b.totalSeconds - a.totalSeconds)
      .slice(0, maxUsers)
  }, [apps, maxUsers])

  if (userStats.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
        No user data available
      </div>
    )
  }

  const maxSeconds = userStats[0]?.totalSeconds || 1

  return (
    <div className="space-y-3">
      {userStats.map((stat) => {
        const percentage = (stat.totalSeconds / maxSeconds) * 100
        const username = stat.user.includes('\\') ? stat.user.split('\\').pop() : stat.user
        
        return (
          <div key={stat.user} className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center shrink-0">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                {username?.[0]?.toUpperCase() || '?'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {username}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                  {formatDuration(stat.totalSeconds)}
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-linear-to-r from-blue-500 to-purple-500 rounded-full"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                {stat.appCount} apps, {stat.totalLaunches} launches
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Recently Used Applications Widget
 * Shows applications sorted by last used time
 */
export const RecentlyUsedWidget: React.FC<{ apps: ApplicationInfo[], maxItems?: number }> = ({ 
  apps, 
  maxItems = 8 
}) => {
  const recentApps = useMemo(() => {
    return [...apps]
      .filter(app => app.usage?.lastUsed)
      .sort((a, b) => {
        const aTime = new Date(a.usage?.lastUsed || 0).getTime()
        const bTime = new Date(b.usage?.lastUsed || 0).getTime()
        return bTime - aTime
      })
      .slice(0, maxItems)
  }, [apps, maxItems])

  if (recentApps.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
        No recent usage data
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {recentApps.map((app, index) => (
        <div 
          key={app.id || index}
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <div className="w-9 h-9 bg-linear-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-lg flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {app.displayName || app.name}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {formatRelativeTime(app.usage!.lastUsed!)}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {formatDuration(app.usage?.totalSeconds || 0)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {app.usage?.launchCount} launches
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Unused Applications Alert Widget
 * Highlights applications that haven't been used recently
 */
export const UnusedAppsWidget: React.FC<{ apps: ApplicationInfo[], daysThreshold?: number, maxItems?: number }> = ({ 
  apps, 
  daysThreshold = 30,
  maxItems = 5
}) => {
  const nowRef = React.useRef(0)
  // eslint-disable-next-line react-hooks/purity -- Date.now() is intentional for time-based filtering
  if (nowRef.current === 0) nowRef.current = Date.now()
  const unusedApps = useMemo(() => {
    const thresholdDate = new Date(nowRef.current - daysThreshold * 24 * 60 * 60 * 1000)
    
    return [...apps]
      .filter(app => {
        // No usage data = unused
        if (!app.usage?.lastUsed) return true
        // Last used before threshold = unused
        return new Date(app.usage.lastUsed) < thresholdDate
      })
      .slice(0, maxItems)
  }, [apps, daysThreshold, maxItems])

  const totalUnused = useMemo(() => apps.filter(app => {
    if (!app.usage?.lastUsed) return true
    const thresholdDate = new Date(nowRef.current - daysThreshold * 24 * 60 * 60 * 1000)
    return new Date(app.usage.lastUsed) < thresholdDate
  }).length, [apps, daysThreshold])

  if (unusedApps.length === 0) {
    return (
      <div className="text-center py-4">
        <div className="w-12 h-12 mx-auto mb-2 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="text-sm text-green-600 dark:text-green-400 font-medium">All applications in use</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">No unused applications detected</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
          {totalUnused} apps unused in {daysThreshold}+ days
        </span>
      </div>
      <div className="space-y-2">
        {unusedApps.map((app, index) => (
          <div 
            key={app.id || index}
            className="flex items-center gap-3 p-2 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-800/30"
          >
            <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {app.displayName || app.name}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {app.publisher || 'Unknown publisher'}
              </div>
            </div>
            <div className="text-xs text-amber-600 dark:text-amber-400 shrink-0">
              {app.usage?.lastUsed 
                ? formatRelativeTime(app.usage.lastUsed)
                : 'Never used'}
            </div>
          </div>
        ))}
      </div>
      {totalUnused > maxItems && (
        <div className="text-center mt-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            +{totalUnused - maxItems} more unused apps
          </span>
        </div>
      )}
    </div>
  )
}

/**
 * Application Usage Dashboard
 * Combines multiple widgets into a comprehensive dashboard
 */
export const ApplicationUsageDashboard: React.FC<UsageWidgetsProps> = ({ 
  applications,
  showUserBreakdown = true,
  className = ''
}) => {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Summary Stats */}
      <UsageSummaryStats apps={applications} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Usage Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
            Usage Distribution
          </h3>
          <UsageDistributionChart apps={applications} maxItems={8} />
        </div>

        {/* Recently Used */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
            Recently Used
          </h3>
          <RecentlyUsedWidget apps={applications} maxItems={6} />
        </div>

        {/* Most Active Users */}
        {showUserBreakdown && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
              Most Active Users
            </h3>
            <MostActiveUsersWidget apps={applications} maxUsers={5} />
          </div>
        )}

        {/* Unused Applications */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
            License Optimization
          </h3>
          <UnusedAppsWidget apps={applications} daysThreshold={30} maxItems={5} />
        </div>
      </div>
    </div>
  )
}

export default ApplicationUsageDashboard

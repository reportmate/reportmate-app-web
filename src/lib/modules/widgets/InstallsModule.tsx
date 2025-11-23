/**
 * Installs Module for ReportMate
 * 
 * Comprehensive module for managing software installation reporting across Windows (Cimian) and macOS (Munki).
 * Integrates with Cimian's structured logging system to provide detailed install session and event tracking.
 * 
 * Features:
 * - Install session tracking with structured events
 * - Package-level install/update/removal history 
 * - Real-time installation progress monitoring
 * - Integration with Cimian's external monitoring data format
 * - Error and warning aggregation
 * - Installation performance analytics
 */

import React, { useState, useEffect } from 'react'
import { EnhancedBaseModule, ExtendedModuleManifest } from '../EnhancedModule'
import { DeviceWidgetProps } from '../ModuleRegistry'
import { formatRelativeTime } from '../../time'

// Types for Cimian structured logging data
interface CimianSessionRecord {
  session_id: string
  start_time: string
  end_time?: string
  run_type: string
  status: string
  duration_seconds: number
  total_actions: number
  installs: number
  updates: number
  removals: number
  successes: number
  failures: number
  hostname: string
  user: string
  process_id: number
  log_version: string
}

interface CimianEventRecord {
  event_id: string
  session_id: string
  timestamp: string
  level: string
  event_type: string
  package?: string
  version?: string
  action: string
  status: string
  message: string
  duration_ms?: number
  progress?: number
  error?: string
  source_file: string
  source_function: string
  source_line: number
}

interface CimianPackageRecord {
  package_name: string
  latest_version: string
  last_install_time: string
  last_update_time: string
  install_count: number
  update_count: number
  removal_count: number
  last_install_status: string
  total_sessions: number
}

interface InstallSession {
  id: string
  deviceId: string
  sessionId: string
  startTime: string
  endTime?: string
  status: 'running' | 'completed' | 'failed' | 'interrupted'
  runType: 'auto' | 'manual' | 'bootstrap' | 'ondemand'
  totalActions: number
  installs: number
  updates: number
  removals: number
  successes: number
  failures: number
  duration?: number
  hostname: string
  user: string
  events?: InstallEvent[]
}

interface InstallEvent {
  id: string
  sessionId: string
  timestamp: string
  level: 'info' | 'warning' | 'error' | 'debug'
  eventType: 'install' | 'update' | 'remove' | 'status_check' | 'error'
  packageName?: string
  version?: string
  action: string
  status: 'started' | 'progress' | 'completed' | 'failed'
  message: string
  duration?: number
  progress?: number
  error?: string
}

interface PackageInstallHistory {
  packageName: string
  displayName: string
  latestVersion: string
  lastInstallTime: string
  lastUpdateTime: string
  installCount: number
  updateCount: number
  removalCount: number
  lastInstallStatus: 'success' | 'failed' | 'pending'
  totalSessions: number
  recentSessions: string[]
}

// Install Sessions Overview Widget
const InstallSessionsOverviewWidget: React.FC<DeviceWidgetProps> = ({ deviceId, device }) => {
  const [sessions, setSessions] = useState<InstallSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const processDeviceSessions = () => {
      try {
        // Use session data directly from device if available
        const installsData = device?.installs
        const recentSessions = installsData?.recent_sessions || installsData?.recentSessions || []
        
        if (recentSessions.length > 0) {
          // Convert the enhanced Cimian session data to the expected format
          const processedSessions: InstallSession[] = recentSessions.map((session: any, index: number) => ({
            id: `session-${deviceId}-${index}`,
            deviceId,
            sessionId: session.session_id || session.sessionId || session.SessionId || `session-${index}`,
            startTime: session.start_time || session.startTime || session.StartTime || new Date().toISOString(),
            endTime: session.end_time || session.endTime || session.EndTime,
            status: (session.status || session.Status || 'unknown').toLowerCase() as 'running' | 'completed' | 'failed' | 'interrupted',
            runType: (session.run_type || session.runType || session.RunType || 'unknown').toLowerCase() as 'auto' | 'manual' | 'bootstrap' | 'ondemand',
            totalActions: session.total_actions || session.totalActions || session.TotalActions || 0,
            installs: session.installs || session.Installs || 0,
            updates: session.updates || session.Updates || 0,
            removals: session.removals || session.Removals || 0,
            successes: session.successes || session.Successes || 0,
            failures: session.failures || session.Failures || 0,
            duration: session.duration_seconds || session.durationSeconds || session.DurationSeconds || undefined,
            hostname: session.hostname || session.Hostname || session.hostname || '',
            user: session.user || session.User || session.user || '',
            events: []
          }))
          
          setSessions(processedSessions)
          console.log(`[InstallsModule] Processed ${processedSessions.length} sessions from device data`)
        } else {
          console.log('[InstallsModule] No session data found in device object, falling back to API call')
          fetchSessionsFromAPI()
        }
      } catch (err) {
        console.error('[InstallsModule] Error processing device sessions:', err)
        fetchSessionsFromAPI()
      } finally {
        setLoading(false)
      }
    }

    const fetchSessionsFromAPI = async () => {
      try {
        const response = await fetch(`/api/device/${deviceId}/install-sessions?limit=10`)
        if (response.ok) {
          const data = await response.json()
          setSessions(data.sessions || [])
          console.log('[InstallsModule] Fetched sessions from API fallback')
        } else {
          setError('Failed to fetch install sessions')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch sessions')
      } finally {
        setLoading(false)
      }
    }

    // Try to use device data first, fallback to API if needed
    processDeviceSessions()
  }, [deviceId, device])

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-600 dark:text-red-400">{error}</div>
      </div>
    )
  }

  const recentSession = sessions[0]
  const stats = sessions.reduce((acc, session) => {
    acc.totalActions += session.totalActions
    acc.totalInstalls += session.installs
    acc.totalUpdates += session.updates
    acc.totalRemovals += session.removals
    acc.totalSuccesses += session.successes
    acc.totalFailures += session.failures
    return acc
  }, {
    totalActions: 0,
    totalInstalls: 0,
    totalUpdates: 0,
    totalRemovals: 0,
    totalSuccesses: 0,
    totalFailures: 0
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 dark:text-green-400'
      case 'failed': return 'text-red-600 dark:text-red-400'
      case 'running': return 'text-blue-600 dark:text-blue-400'
      case 'interrupted': return 'text-yellow-600 dark:text-yellow-400'
      default: return 'text-gray-600 dark:text-gray-400'
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Recent Session Status */}
      {recentSession && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900 dark:text-white">
                Latest Install Session
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {formatRelativeTime(recentSession.startTime)} • {recentSession.runType}
              </div>
            </div>
            <div className={`font-medium ${getStatusColor(recentSession.status)}`}>
              {recentSession.status.toUpperCase()}
            </div>
          </div>
          
          {recentSession.status === 'completed' && recentSession.duration && (
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Completed in {Math.round(recentSession.duration / 60)} minutes
            </div>
          )}
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {stats.totalInstalls}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Installs</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
            {stats.totalUpdates}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Updates</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {stats.totalSuccesses}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Successes</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {stats.totalFailures}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Failures</div>
        </div>
      </div>

      {/* Recent Sessions List */}
      <div className="space-y-2">
        <h4 className="font-medium text-gray-900 dark:text-white">Recent Sessions</h4>
        {sessions.slice(0, 5).map((session) => (
          <div key={session.id} className="flex items-center justify-between py-2 px-3 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {session.sessionId}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {formatRelativeTime(session.startTime)} • {session.runType}
              </div>
            </div>
            <div className="text-right">
              <div className={`text-sm font-medium ${getStatusColor(session.status)}`}>
                {session.status}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {session.totalActions} actions
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Install Events Timeline Widget
const InstallEventsTimelineWidget: React.FC<DeviceWidgetProps> = ({ deviceId, isExpanded }) => {
  const [events, setEvents] = useState<InstallEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [sessionFilter, setSessionFilter] = useState<string>('all')
  const [levelFilter, setLevelFilter] = useState<string>('all')

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const params = new URLSearchParams({
          limit: isExpanded ? '100' : '20'
        })
        if (sessionFilter !== 'all') {
          params.append('session', sessionFilter)
        }
        if (levelFilter !== 'all') {
          params.append('level', levelFilter)
        }

        const response = await fetch(`/api/device/${deviceId}/install-events?${params}`)
        if (response.ok) {
          const data = await response.json()
          setEvents(data.events || [])
        }
      } catch (error) {
        console.error('Failed to fetch install events:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [deviceId, isExpanded, sessionFilter, levelFilter])

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900'
      case 'warning': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900'
      case 'info': return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900'
      case 'debug': return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800'
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800'
    }
  }

  const getEventIcon = (eventType: string, status: string) => {
    if (status === 'failed') {
      return (
        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )
    }
    if (status === 'completed') {
      return (
        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )
    }
    if (status === 'progress') {
      return (
        <svg className="w-4 h-4 text-blue-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )
    }
    return (
      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                <div className="h-2 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      {/* Filters */}
      {isExpanded && (
        <div className="flex gap-4 mb-4">
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Levels</option>
            <option value="error">Errors</option>
            <option value="warning">Warnings</option>
            <option value="info">Info</option>
            <option value="debug">Debug</option>
          </select>
        </div>
      )}

      {/* Events Timeline */}
      <div className="space-y-3">
        {events.map((event, index) => (
          <div key={event.id} className="flex items-start space-x-3">
            {/* Timeline indicator */}
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 flex items-center justify-center">
                {getEventIcon(event.eventType, event.status)}
              </div>
              {index < events.length - 1 && (
                <div className="w-0.5 h-6 bg-gray-300 dark:bg-gray-600 mt-1"></div>
              )}
            </div>

            {/* Event details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(event.level)}`}>
                  {event.level.toUpperCase()}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatRelativeTime(event.timestamp)}
                </span>
                {event.duration && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    ({event.duration}ms)
                  </span>
                )}
              </div>
              
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {event.packageName ? (
                  <>
                    {event.action} {event.packageName}
                    {event.version && <span className="text-gray-500"> v{event.version}</span>}
                  </>
                ) : (
                  event.action
                )}
              </div>
              
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {event.message}
              </div>

              {event.error && (
                <div className="text-sm text-red-600 dark:text-red-400 mt-1 font-mono bg-red-50 dark:bg-red-900 p-2 rounded">
                  {event.error}
                </div>
              )}

              {event.progress !== undefined && event.progress >= 0 && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                    <span>Progress</span>
                    <span>{event.progress === -1 ? 'Indeterminate' : `${event.progress}%`}</span>
                  </div>
                  {event.progress !== -1 && (
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div 
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${event.progress}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {events.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No installation events found
        </div>
      )}
    </div>
  )
}

// Package Install History Widget
const PackageHistoryWidget: React.FC<DeviceWidgetProps> = ({ deviceId, isExpanded }) => {
  const [packages, setPackages] = useState<PackageInstallHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'lastInstall' | 'installCount'>('lastInstall')

  useEffect(() => {
    const fetchPackageHistory = async () => {
      try {
        const response = await fetch(`/api/device/${deviceId}/package-history`)
        if (response.ok) {
          const data = await response.json()
          setPackages(data.packages || [])
        }
      } catch (error) {
        console.error('Failed to fetch package history:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPackageHistory()
  }, [deviceId])

  const filteredAndSortedPackages = packages
    .filter(pkg => 
      !searchTerm || 
      pkg.packageName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pkg.displayName.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.displayName.localeCompare(b.displayName)
        case 'lastInstall':
          return new Date(b.lastInstallTime).getTime() - new Date(a.lastInstallTime).getTime()
        case 'installCount':
          return b.installCount - a.installCount
        default:
          return 0
      }
    })
    .slice(0, isExpanded ? 50 : 10)

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      {/* Controls */}
      {isExpanded && (
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="lastInstall">Latest Install</option>
            <option value="name">Name</option>
            <option value="installCount">Install Count</option>
          </select>
        </div>
      )}

      {/* Package History Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Package
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Version
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Last Install
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Activity
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredAndSortedPackages.map((pkg) => (
              <tr key={pkg.packageName} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-4 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {pkg.displayName}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {pkg.packageName}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {pkg.latestVersion}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {formatRelativeTime(pkg.lastInstallTime)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-white">
                    {pkg.installCount} installs, {pkg.updateCount} updates
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {pkg.totalSessions} sessions
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    pkg.lastInstallStatus === 'success' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : pkg.lastInstallStatus === 'failed'
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  }`}>
                    {pkg.lastInstallStatus}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredAndSortedPackages.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No package history found
        </div>
      )}
    </div>
  )
}

// Installation Analytics Widget
const InstallAnalyticsWidget: React.FC<DeviceWidgetProps> = ({ deviceId }) => {
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch(`/api/device/${deviceId}/install-analytics?range=${timeRange}`)
        if (response.ok) {
          const data = await response.json()
          setAnalytics(data)
        }
      } catch (error) {
        console.error('Failed to fetch install analytics:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [deviceId, timeRange])

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="p-6 text-center text-gray-500 dark:text-gray-400">
        No analytics data available
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-between items-center">
        <h4 className="font-medium text-gray-900 dark:text-white">Installation Analytics</h4>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as any)}
          className="px-3 py-1 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {analytics.totalSessions || 0}
          </div>
          <div className="text-sm text-blue-600 dark:text-blue-400">Install Sessions</div>
          <div className="text-xs text-blue-500 dark:text-blue-300 mt-1">
            {analytics.avgSessionDuration && `Avg: ${Math.round(analytics.avgSessionDuration / 60)}min`}
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-900 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {analytics.successRate || 0}%
          </div>
          <div className="text-sm text-green-600 dark:text-green-400">Success Rate</div>
          <div className="text-xs text-green-500 dark:text-green-300 mt-1">
            {analytics.totalSuccesses || 0} of {analytics.totalAttempts || 0}
          </div>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {analytics.uniquePackages || 0}
          </div>
          <div className="text-sm text-purple-600 dark:text-purple-400">Unique Packages</div>
          <div className="text-xs text-purple-500 dark:text-purple-300 mt-1">
            {analytics.totalInstallActions || 0} actions
          </div>
        </div>
      </div>

      {/* Performance Trends */}
      {analytics.trends && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h5 className="font-medium text-gray-900 dark:text-white mb-3">Performance Trends</h5>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Average Session Duration</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {analytics.trends.avgDuration ? `${Math.round(analytics.trends.avgDuration / 60)}min` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Fastest Session</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {analytics.trends.fastestSession ? `${Math.round(analytics.trends.fastestSession / 60)}min` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Most Active Day</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {analytics.trends.mostActiveDay || 'N/A'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Top Packages */}
      {analytics.topPackages && analytics.topPackages.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h5 className="font-medium text-gray-900 dark:text-white mb-3">Most Installed Packages</h5>
          <div className="space-y-2">
            {analytics.topPackages.slice(0, 5).map((pkg: any, index: number) => (
              <div key={pkg.name} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500 w-4">#{index + 1}</span>
                  <span className="text-sm text-gray-900 dark:text-white">{pkg.name}</span>
                </div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {pkg.count} installs
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Main Installs Module
class InstallsModule extends EnhancedBaseModule {
  readonly manifest: ExtendedModuleManifest = {
    id: 'installs',
    name: 'Software Installs',
    version: '1.0.0',
    description: 'Comprehensive software installation tracking and analytics for Windows (Cimian) and macOS (Munki)',
    author: 'ReportMate Team',
    enabled: true,
    category: 'integration',
    tags: ['installs', 'cimian', 'munki', 'software', 'deployment', 'analytics'],
    permissions: ['device:read', 'installs:read'],
    dependencies: [],
    deviceWidgets: [
      {
        id: 'install-sessions-overview',
        name: 'Install Sessions Overview',
        description: 'Overview of recent installation sessions with status and statistics',
        component: InstallSessionsOverviewWidget,
        category: 'overview',
        size: 'large',
        refreshInterval: 30000 // 30 seconds
      },
      {
        id: 'install-events-timeline',
        name: 'Installation Events Timeline',
        description: 'Real-time timeline of installation events and activities',
        component: InstallEventsTimelineWidget,
        category: 'software',
        size: 'full',
        refreshInterval: 10000 // 10 seconds for real-time updates
      },
      {
        id: 'package-history',
        name: 'Package Install History',
        description: 'Historical view of package installations, updates, and removals',
        component: PackageHistoryWidget,
        category: 'software',
        size: 'full',
        refreshInterval: 60000 // 1 minute
      },
      {
        id: 'install-analytics',
        name: 'Installation Analytics',
        description: 'Performance metrics and trends for software installations',
        component: InstallAnalyticsWidget,
        category: 'overview',
        size: 'medium',
        refreshInterval: 300000 // 5 minutes
      }
    ],
    configSchema: {
      title: 'Installs Module Configuration',
      description: 'Configure installation tracking and analytics settings',
      properties: {
        enableRealTimeUpdates: {
          type: 'boolean',
          title: 'Enable Real-time Updates',
          description: 'Enable real-time updates for installation events',
          default: true
        },
        defaultTimeRange: {
          type: 'select',
          title: 'Default Time Range',
          description: 'Default time range for analytics',
          default: '30d',
          options: [
            { label: 'Last 7 days', value: '7d' },
            { label: 'Last 30 days', value: '30d' },
            { label: 'Last 90 days', value: '90d' }
          ]
        },
        maxEventsPerSession: {
          type: 'number',
          title: 'Max Events Per Session',
          description: 'Maximum number of events to display per session',
          default: 1000,
          validation: { min: 100, max: 5000 }
        },
        enableCimianIntegration: {
          type: 'boolean',
          title: 'Enable Cimian Integration',
          description: 'Enable integration with Cimian structured logging',
          default: true
        },
        enableMunkiIntegration: {
          type: 'boolean',
          title: 'Enable Munki Integration',
          description: 'Enable integration with Munki managed installs',
          default: true
        }
      }    }
  }
}

export default InstallsModule

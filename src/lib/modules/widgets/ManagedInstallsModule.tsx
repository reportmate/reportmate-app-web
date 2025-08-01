/**
 * Managed Installs Module
 * 
 * This module provides managed software installation widgets and functionality
 * Demonstrates how to break down the large managed installs section into modular components
 */

import React, { useState, useEffect } from 'react'
import { EnhancedBaseModule, ExtendedModuleManifest } from '../EnhancedModule'
import { DeviceWidgetProps } from '../ModuleRegistry'
import { formatRelativeTime } from '../../time'

// Managed Installs Overview Widget
const ManagedInstallsOverviewWidget: React.FC<DeviceWidgetProps> = ({ deviceId, device }) => {
  const [installsData, setInstallsData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchInstallsData = async () => {
      try {
        // Use Next.js API route - get full device data and extract installs module data
        const response = await fetch(`/api/device/${deviceId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.device && data.device.installs) {
            setInstallsData(data.device.installs)
          }
        }
      } catch (error) {
        console.error('Failed to fetch installs data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchInstallsData()
  }, [deviceId])

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!installsData) {
    return (
      <div className="p-6 text-center">
        <div className="text-gray-500 dark:text-gray-400">
          No managed installs data available
        </div>
      </div>
    )
  }

  // Calculate summary stats from new Cimian data structure
  const recentInstalls = installsData.recent_installs || []
  const pendingInstalls = installsData.pending_installs || []
  const installedCount = recentInstalls.filter((pkg: any) => 
    pkg.status === 'Installed' || pkg.status === 'Success').length
  const pendingCount = pendingInstalls.length
  const failedCount = recentInstalls.filter((pkg: any) => 
    pkg.status === 'Failed' || pkg.status === 'Install Loop').length

  const cimianInfo = installsData.cimian || {}
  const latestSession = installsData.recent_sessions?.[0]

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {installedCount}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Installed</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
            {pendingCount}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Pending</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {failedCount}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Failed</div>
        </div>
      </div>
      
      {cimianInfo.is_installed && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <div className="flex justify-between">
              <span>Cimian Version:</span>
              <span className="font-medium">{cimianInfo.version || 'Unknown'}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span>Status:</span>
              <span className="font-medium">{cimianInfo.status || 'Unknown'}</span>
            </div>
            {latestSession && (
              <>
                <div className="flex justify-between mt-1">
                  <span>Last Session:</span>
                  <span className="font-medium">{formatRelativeTime(latestSession.start_time)}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span>Session Type:</span>
                  <span className="font-medium">{latestSession.run_type}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span>Duration:</span>
                  <span className="font-medium">{latestSession.duration_seconds ? `${latestSession.duration_seconds}s` : 'N/A'}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span>Cache Size:</span>
                  <span className="font-medium">{latestSession.cache_size_mb?.toFixed(1)} MB</span>
                </div>
              </>
            )}
            {cimianInfo.config?.manifest && (
              <div className="flex justify-between mt-1">
                <span>Manifest:</span>
                <span className="font-medium text-xs">{cimianInfo.config.manifest}</span>
              </div>
            )}
            {/* Enhanced Cimian data - Pending Packages */}
            {cimianInfo.pending_packages && cimianInfo.pending_packages.length > 0 && (
              <div className="mt-2">
                <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Pending Packages ({cimianInfo.pending_packages.length}):
                </div>
                <div className="flex flex-wrap gap-1">
                  {cimianInfo.pending_packages.slice(0, 3).map((pkg: string, idx: number) => (
                    <span key={idx} className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                      {pkg}
                    </span>
                  ))}
                  {cimianInfo.pending_packages.length > 3 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      +{cimianInfo.pending_packages.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}
            {/* Enhanced Cimian data - Reports Status */}
            {cimianInfo.reports && Object.keys(cimianInfo.reports).length > 0 && (
              <div className="mt-2">
                <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Report Files:
                </div>
                <div className="space-y-1">
                  {Object.entries(cimianInfo.reports).map(([reportName, reportInfo]: [string, any], idx: number) => (
                    <div key={idx} className="flex justify-between text-xs">
                      <span className="font-mono text-gray-600 dark:text-gray-400">{reportName}</span>
                      <span className="text-gray-500 dark:text-gray-500">
                        {reportInfo.size_bytes ? `${Math.round(reportInfo.size_bytes / 1024)}KB` : 'N/A'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Managed Packages Table Widget
const ManagedPackagesTableWidget: React.FC<DeviceWidgetProps> = ({ deviceId, isExpanded }) => {
  const [packages, setPackages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        // Use Next.js API route - get full device data and extract installs packages
        const response = await fetch(`/api/device/${deviceId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.device && data.device.installs) {
            // Combine recent and pending installs from new Cimian format
            const recentInstalls = data.device.installs.recent_installs || []
            const pendingInstalls = data.device.installs.pending_installs || []
            const allPackages = [...recentInstalls, ...pendingInstalls]
            setPackages(allPackages)
          }
        }
      } catch (error) {
        console.error('Failed to fetch packages:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPackages()
  }, [deviceId])

  const filteredPackages = packages.filter(pkg => {
    const matchesSearch = !searchTerm || 
      pkg.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pkg.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pkg.id?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || 
      pkg.status?.toLowerCase().includes(statusFilter.toLowerCase())
    
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Filters */}
      <div className="flex gap-4 mb-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search packages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        >
          <option value="all">All Status</option>
          <option value="installed">Installed</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Package table */}
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
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Method
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Last Update
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredPackages
              .slice(0, isExpanded ? undefined : 10)  // Show first 10 unless expanded
              .map((pkg, index) => (
                <tr key={pkg.id || index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {pkg.display_name || pkg.name}
                      </div>
                      {pkg.display_name && pkg.name && pkg.display_name !== pkg.name && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {pkg.name}
                        </div>
                      )}
                      {pkg.has_install_loop && (
                        <div className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                          ⚠ Install Loop Detected
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {pkg.version}
                      {pkg.installed_version && pkg.installed_version !== pkg.version && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          (installed: {pkg.installed_version})
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      pkg.status === 'Installed' || pkg.status === 'Success'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      pkg.status === 'Pending' || pkg.status === 'Install'
                        ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200' :
                      pkg.status === 'Install Loop'
                        ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                      pkg.status === 'Failed' || pkg.status === 'Warning'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                    }`}>
                      {pkg.status}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {pkg.install_method && (
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {pkg.install_method}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {formatRelativeTime(pkg.last_update || pkg.last_attempt_time)}
                    {pkg.install_count > 0 && (
                      <div className="text-xs text-gray-400">
                        {pkg.install_count} install{pkg.install_count !== 1 ? 's' : ''}
                        {pkg.failure_count > 0 && `, ${pkg.failure_count} failed`}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {!isExpanded && filteredPackages.length > 10 && (
        <div className="mt-4 text-center">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Showing 10 of {filteredPackages.length} packages. 
            <button className="ml-1 text-blue-600 hover:text-blue-800 dark:text-blue-400">
              Click expand to see all
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Cimian Sessions Widget (new)
const CimianSessionsWidget: React.FC<DeviceWidgetProps> = ({ deviceId, isExpanded }) => {
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await fetch(`/api/device/${deviceId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.device && data.device.installs && data.device.installs.recent_sessions) {
            setSessions(data.device.installs.recent_sessions)
          }
        }
      } catch (error) {
        console.error('Failed to fetch Cimian sessions:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSessions()
  }, [deviceId])

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  if (!sessions || sessions.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="text-gray-500 dark:text-gray-400">
          No Cimian sessions found
        </div>
      </div>
    )
  }

  const displaySessions = isExpanded ? sessions : sessions.slice(0, 5)

  return (
    <div className="p-6">
      <div className="space-y-4">
        {displaySessions.map((session, index) => (
          <div key={session.session_id || index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  Session {session.session_id}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {session.run_type} • {formatRelativeTime(session.start_time)}
                </div>
              </div>
              <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                session.status === 'SUCCESS' || session.status === 'completed'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : session.status === 'FAILED' || session.status === 'failed'
                  ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  : session.status === 'RUNNING' || session.status === 'running'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
              }`}>
                {session.status}
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-500 dark:text-gray-400">Managed</div>
                <div className="font-medium">{session.total_packages_managed || session.total_actions || 0}</div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400">Installed</div>
                <div className="font-medium text-green-600">{session.packages_installed || session.installs || 0}</div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400">Failed</div>
                <div className="font-medium text-red-600">{session.packages_failed || session.failures || 0}</div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400">Duration</div>
                <div className="font-medium">{session.duration_seconds ? `${session.duration_seconds}s` : 'N/A'}</div>
              </div>
            </div>

            {session.cache_size_mb && (
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Cache: {session.cache_size_mb.toFixed(1)} MB
              </div>
            )}

            {session.packages_handled && session.packages_handled.length > 0 && (
              <div className="mt-2">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Packages handled:</div>
                <div className="flex flex-wrap gap-1">
                  {session.packages_handled.slice(0, 5).map((pkg: string, idx: number) => (
                    <span key={idx} className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                      {pkg}
                    </span>
                  ))}
                  {session.packages_handled.length > 5 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      +{session.packages_handled.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {!isExpanded && sessions.length > 5 && (
        <div className="mt-4 text-center">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Showing 5 of {sessions.length} sessions.
            <button className="ml-1 text-blue-600 hover:text-blue-800 dark:text-blue-400">
              Click expand to see all
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Managed Installs Errors Widget
const ManagedInstallsErrorsWidget: React.FC<DeviceWidgetProps> = ({ deviceId }) => {
  const [errors, setErrors] = useState<any[]>([])
  const [warnings, setWarnings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        // Use Next.js API route - get full device data and extract installs events
        const response = await fetch(`/api/device/${deviceId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.device && data.device.installs && data.device.installs.recent_events) {
            const events = data.device.installs.recent_events
            setErrors(events.filter((e: any) => e.level === 'ERROR'))
            setWarnings(events.filter((e: any) => e.level === 'WARN' || e.level === 'WARNING'))
          }
        }
      } catch (error) {
        console.error('Failed to fetch messages:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMessages()
  }, [deviceId])

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (errors.length === 0 && warnings.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="w-12 h-12 mx-auto mb-4 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="text-gray-500 dark:text-gray-400">
          No errors or warnings
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      {/* Errors */}
      {errors.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">
            Errors ({errors.length})
          </h4>
          <div className="space-y-2">
            {errors.map((error, idx) => (
              <div key={error.event_id || idx} className="border border-red-200 dark:border-red-800 rounded-lg p-3 bg-red-50 dark:bg-red-900/20">
                <div className="flex justify-between items-start mb-1">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                    {error.package || error.event_type}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatRelativeTime(error.timestamp)}
                  </span>
                </div>
                <div className="text-sm font-medium text-red-900 dark:text-red-100">
                  {error.message}
                </div>
                {error.error && (
                  <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                    {error.error}
                  </div>
                )}
                {error.source_file && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {error.source_file}:{error.source_line}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Warnings */}
      {warnings.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-yellow-600 dark:text-yellow-400 mb-2">
            Warnings ({warnings.length})
          </h4>
          <div className="space-y-2">
            {warnings.map((warning) => (
              <div key={warning.id} className="border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 bg-yellow-50 dark:bg-yellow-900/20">
                <div className="flex justify-between items-start mb-1">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                    {warning.package}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatRelativeTime(warning.timestamp)}
                  </span>
                </div>
                <div className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                  {warning.message}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// The Module Class
export class ManagedInstallsModule extends EnhancedBaseModule {
  readonly manifest: ExtendedModuleManifest = {
    id: 'managed-installs',
    name: 'Managed Installs',
    version: '1.0.0',
    description: 'Software management and deployment tracking',
    author: 'ReportMate Team',
    enabled: true,
    category: 'device',
    tags: ['software', 'deployment', 'munki', 'cimian'],
    
    deviceWidgets: [
      {
        id: 'managed-installs-overview',
        name: 'Managed Installs Overview',
        description: 'Summary of managed software installations',
        component: ManagedInstallsOverviewWidget,
        category: 'software',
        size: 'large',
        order: 10,
        conditions: [
          {
            type: 'has_data',
            field: 'installs',
            operator: 'exists',
            value: true
          }
        ]
      },
      {
        id: 'managed-packages-table',
        name: 'Managed Packages',
        description: 'Detailed list of managed software packages',
        component: ManagedPackagesTableWidget,
        category: 'software',
        size: 'full',
        order: 11,
        conditions: [
          {
            type: 'has_data',
            field: 'installs',
            operator: 'exists',
            value: true
          }
        ]
      },
      {
        id: 'cimian-sessions',
        name: 'Cimian Sessions',
        description: 'Recent Cimian installation sessions with detailed tracking',
        component: CimianSessionsWidget,
        category: 'software',
        size: 'large',
        order: 11.5,
        conditions: [
          {
            type: 'has_data',
            field: 'installs.recent_sessions',
            operator: 'exists',
            value: true
          }
        ]
      },
      {
        id: 'managed-installs-errors',
        name: 'Installation Issues',
        description: 'Errors and warnings from managed installations',
        component: ManagedInstallsErrorsWidget,
        category: 'software',
        size: 'medium',
        order: 12,
        conditions: [
          {
            type: 'has_data',
            field: 'installs',
            operator: 'exists',
            value: true
          }
        ]
      }
    ],
    
    configSchema: {
      title: 'Managed Installs Settings',
      description: 'Configure managed software installation monitoring',
      properties: {
        showOnlyErrors: {
          type: 'boolean',
          title: 'Show Only Errors',
          description: 'Only display packages with errors or warnings',
          default: false
        },
        refreshInterval: {
          type: 'number',
          title: 'Refresh Interval (minutes)',
          description: 'How often to refresh package data',
          default: 5,
          validation: { min: 1, max: 60 }
        },
        maxPackagesToShow: {
          type: 'number',
          title: 'Max Packages to Show',
          description: 'Maximum number of packages to display by default',
          default: 50,
          validation: { min: 10, max: 500 }
        }
      }
    }
  }

  async onLoad(): Promise<void> {
    this.log('info', 'Managed Installs module loaded')
  }
}

export default ManagedInstallsModule

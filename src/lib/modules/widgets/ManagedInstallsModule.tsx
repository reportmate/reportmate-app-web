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
  const [managedInstalls, setManagedInstalls] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchManagedInstalls = async () => {
      try {
        const response = await fetch(`/api/device/${deviceId}/managed-installs`)
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setManagedInstalls(data.managedInstalls)
          }
        }
      } catch (error) {
        console.error('Failed to fetch managed installs:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchManagedInstalls()
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

  if (!managedInstalls) {
    return (
      <div className="p-6 text-center">
        <div className="text-gray-500 dark:text-gray-400">
          No managed installs data available
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {managedInstalls.installed || 0}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Installed</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
            {managedInstalls.pending || 0}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Pending</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {managedInstalls.failed || 0}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Failed</div>
        </div>
      </div>
      
      {managedInstalls.config && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <div className="flex justify-between">
              <span>Last Run:</span>
              <span className="font-medium">{formatRelativeTime(managedInstalls.config.lastRun)}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span>Manifest:</span>
              <span className="font-medium">{managedInstalls.config.manifest}</span>
            </div>
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
        const response = await fetch(`/api/device/${deviceId}/managed-installs/packages`)
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.packages) {
            setPackages(data.packages)
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
      pkg.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pkg.name?.toLowerCase().includes(searchTerm.toLowerCase())
    
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
                Last Update
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredPackages
              .slice(0, isExpanded ? undefined : 10)  // Show first 10 unless expanded
              .map((pkg) => (
                <tr key={pkg.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {pkg.displayName}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {pkg.name}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {pkg.version}
                      {pkg.installedVersion && pkg.installedVersion !== pkg.version && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          (installed: {pkg.installedVersion})
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      pkg.status === 'installed' || pkg.status === 'Installed' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      pkg.status === 'pending_install' || pkg.status === 'Pending Update' 
                        ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200' :
                      pkg.status === 'pending_removal' 
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                      pkg.status.includes('failed') || pkg.status === 'Failed' 
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                    }`}>
                      {pkg.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {formatRelativeTime(pkg.lastUpdate)}
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

// Managed Installs Errors Widget
const ManagedInstallsErrorsWidget: React.FC<DeviceWidgetProps> = ({ deviceId }) => {
  const [errors, setErrors] = useState<any[]>([])
  const [warnings, setWarnings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await fetch(`/api/device/${deviceId}/managed-installs/messages`)
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setErrors(data.errors || [])
            setWarnings(data.warnings || [])
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
            {errors.map((error) => (
              <div key={error.id} className="border border-red-200 dark:border-red-800 rounded-lg p-3 bg-red-50 dark:bg-red-900/20">
                <div className="flex justify-between items-start mb-1">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                    {error.package}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatRelativeTime(error.timestamp)}
                  </span>
                </div>
                <div className="text-sm font-medium text-red-900 dark:text-red-100">
                  {error.message}
                </div>
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
            field: 'managedInstalls',
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
            field: 'managedInstalls',
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
            field: 'managedInstalls',
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

/**
 * Device Info Module
 * Core module for displaying basic device information
 */

import React from 'react'
import { BaseModule } from '../BaseModule'
import { ModuleManifest } from '../ModuleRegistry'
import { formatRelativeTime } from '../../time'

// Device Info Tab Component
const DeviceInfoTab: React.FC<{ deviceId: string }> = ({ deviceId }) => {
  const [device, setDevice] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const fetchDevice = async () => {
      try {
        // Use Next.js API route
        const response = await fetch(`/api/device/${deviceId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setDevice(data.device)
          }
        }
      } catch (error) {
        console.error('Failed to fetch device:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDevice()
  }, [deviceId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading device information...</div>
      </div>
    )
  }

  if (!device) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Failed to load device information</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Inventory */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Inventory
          </h3>
        </div>
        <div className="px-6 py-4">
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Device Name</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{device.modules?.inventory?.deviceName || 'Unknown Device'}</dd>
            </div>
            {device.modules?.inventory?.assetTag && (
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Asset Tag</dt>
                <dd className="mt-1 text-sm font-mono text-gray-900 dark:text-gray-100">{device.modules?.inventory?.assetTag}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Serial Number</dt>
              <dd className="mt-1 text-sm font-mono text-gray-900 dark:text-gray-100">{device.serialNumber || 'Unknown'}</dd>
            </div>
            {device.deviceId && (
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Hardware UUID</dt>
                <dd className="mt-1 text-sm font-mono text-gray-900 dark:text-gray-100">{device.deviceId}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Seen</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{formatRelativeTime(device.lastSeen)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</dt>
              <dd className="mt-1">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  device.status === 'active' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : device.status === 'warning'
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    : device.status === 'error'
                    ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                }`}>
                  {device.status}
                </span>
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Operating System Information */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Operating System
          </h3>
        </div>
        <div className="px-6 py-4">
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Operating System</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                {device.osDisplayName || device.osName || device.os || 'Unknown'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Version</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                {device.osVersionName || device.osVersion || 'Unknown'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Build</dt>
              <dd className="mt-1 text-sm font-mono text-gray-900 dark:text-gray-100">
                {device.osBuild || 'Unknown'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Architecture</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                {device.osArchitecture || device.architecture || 'Unknown'}
              </dd>
            </div>
            {device.osInstallDate && (
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Installed on</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                  {new Date(device.osInstallDate).toLocaleDateString()}
                </dd>
              </div>
            )}
            {device.experiencePack && (
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Experience Pack</dt>
                <dd className="mt-1 text-sm font-mono text-gray-900 dark:text-gray-100">
                  {device.experiencePack}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Hardware Information */}
      {device.modules?.hardware && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Hardware Information
            </h3>
          </div>
          <div className="px-6 py-4">
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {device.modules.hardware.cpu && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">CPU</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{device.modules.hardware.cpu}</dd>
                </div>
              )}
              {device.modules.hardware.memory && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Memory</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{device.modules.hardware.memory}</dd>
                </div>
              )}
              {device.modules.hardware.storage && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Storage</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{device.modules.hardware.storage}</dd>
                </div>
              )}
              {device.modules.hardware.architecture && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Architecture</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{device.modules.hardware.architecture}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      )}

      {/* Network Information */}
      {device.modules?.network && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Network Information
            </h3>
          </div>
          <div className="px-6 py-4">
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {device.modules.network.hostname && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Hostname</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{device.modules.network.hostname}</dd>
                </div>
              )}
              {device.ipAddress && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">IP Address</dt>
                  <dd className="mt-1 text-sm font-mono text-gray-900 dark:text-gray-100">{device.ipAddress}</dd>
                </div>
              )}
              {device.macAddress && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">MAC Address</dt>
                  <dd className="mt-1 text-sm font-mono text-gray-900 dark:text-gray-100">{device.macAddress}</dd>
                </div>
              )}
              {device.modules.network.connectionType && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Connection Type</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{device.modules.network.connectionType}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      )}
    </div>
  )
}

// Device Info Widget for Dashboard
const DeviceInfoWidget: React.FC = () => {
  const [stats, setStats] = React.useState<any>(null)

  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        // Use Next.js API route
        const response = await fetch('/api/devices', {
          cache: 'no-store',
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        })
        if (response.ok) {
          const data = await response.json()
          // The API returns a direct array of devices
          if (Array.isArray(data)) {
            const devices = data
            const stats = {
              total: devices.length,
              active: devices.filter((d: any) => d.status === 'active').length,
              stale: devices.filter((d: any) => d.status === 'stale').length,
              missing: devices.filter((d: any) => d.status === 'missing').length,
              warning: devices.filter((d: any) => d.status === 'warning').length,
              error: devices.filter((d: any) => d.status === 'error').length,
            }
            setStats(stats)
          }
        }
      } catch (error) {
        console.error('Failed to fetch device stats:', error)
      }
    }

    fetchStats()
  }, [])

  if (!stats) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
        Device Overview
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Total</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.active}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Active</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.stale}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Stale</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">{stats.missing}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Missing</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.error}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Error</div>
        </div>
      </div>
    </div>
  )
}

export class DeviceInfoModule extends BaseModule {
  readonly manifest: ModuleManifest = {
    id: 'device-info',
    name: 'Device Information',
    version: '1.0.0',
    description: 'Core module for displaying device information',
    author: 'ReportMate Team',
    enabled: true,
    
    dashboardWidgets: [
      {
        id: 'device-overview',
        name: 'Device Overview',
        component: DeviceInfoWidget,
        size: 'large',
        order: 1,
      },
    ],
    
    deviceTabs: [
      {
        id: 'info',
        name: 'Information',
        icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
        component: DeviceInfoTab,
        order: 1,
      },
    ],
  }

  async onLoad(): Promise<void> {
    this.log('info', 'Device Info module loaded')
  }
}

export default DeviceInfoModule

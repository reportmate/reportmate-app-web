/**
 * Device Info Module
 * Core module for displaying basic device information
 */

import React from 'react'
import { BaseModule } from '../BaseModule'
import { ModuleManifest } from '../ModuleRegistry'

// Device Info Tab Component
const DeviceInfoTab: React.FC<{ deviceId: string }> = ({ deviceId }) => {
  const [device, setDevice] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const fetchDevice = async () => {
      try {
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
      {/* Basic Information */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Basic Information
          </h3>
        </div>
        <div className="px-6 py-4">
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{device.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Serial Number</dt>
              <dd className="mt-1 text-sm font-mono text-gray-900 dark:text-gray-100">{device.serialNumber || device.id}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Model</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{device.model || 'Unknown'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Operating System</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{device.os || 'Unknown'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Seen</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{device.lastSeen}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</dt>
              <dd className="mt-1">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  device.status === 'online' 
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

      {/* Hardware Information */}
      {device.hardware && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Hardware Information
            </h3>
          </div>
          <div className="px-6 py-4">
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {device.hardware.cpu && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">CPU</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{device.hardware.cpu}</dd>
                </div>
              )}
              {device.hardware.memory && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Memory</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{device.hardware.memory}</dd>
                </div>
              )}
              {device.hardware.storage && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Storage</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{device.hardware.storage}</dd>
                </div>
              )}
              {device.hardware.architecture && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Architecture</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{device.hardware.architecture}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      )}

      {/* Network Information */}
      {device.network && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Network Information
            </h3>
          </div>
          <div className="px-6 py-4">
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {device.network.hostname && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Hostname</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{device.network.hostname}</dd>
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
              {device.network.connectionType && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Connection Type</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{device.network.connectionType}</dd>
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
        const response = await fetch('/api/device')
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.devices) {
            const devices = data.devices
            const stats = {
              total: devices.length,
              online: devices.filter((d: any) => d.status === 'online').length,
              offline: devices.filter((d: any) => d.status === 'offline').length,
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
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.online}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Online</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">{stats.offline}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Offline</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.warning}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Warning</div>
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

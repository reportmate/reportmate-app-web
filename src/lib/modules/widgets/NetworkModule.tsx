"use client"

import React, { useState, useEffect } from 'react'
import { EnhancedBaseModule, ExtendedModuleManifest } from '../EnhancedModule'
import { DeviceWidgetProps } from '../ModuleRegistry'

// Network Overview Widget
const NetworkOverviewWidget: React.FC<DeviceWidgetProps> = ({ deviceId, device }) => {
  const [networkInfo, setNetworkInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchNetworkInfo = async () => {
      try {
        // Fetch device data from API
        const response = await fetch(`/api/device/${deviceId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.device) {
            setNetworkInfo(data.device)
          }
        }
      } catch (error) {
        console.error('Failed to fetch network info:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchNetworkInfo()
  }, [deviceId])

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!networkInfo) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Network Data</h3>
        <p className="text-gray-600 dark:text-gray-400">Network information is not available for this device.</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
          <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Network Configuration</h2>
          <p className="text-gray-600 dark:text-gray-400">Network connectivity and configuration details</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mb-1">
            {networkInfo.ipAddress || 'Not Available'}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">IP Address</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1 font-mono">
            {networkInfo.macAddress || 'Not Available'}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">MAC Address</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1 font-mono">
            {networkInfo.name || 'Unknown'}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Device Name</div>
        </div>
      </div>
    </div>
  )
}

// Basic Network Info Widget
const BasicNetworkInfoWidget: React.FC<DeviceWidgetProps> = ({ deviceId, device }) => {
  const [networkInfo, setNetworkInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchNetworkInfo = async () => {
      try {
        const response = await fetch(`/api/device/${deviceId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.device) {
            setNetworkInfo(data.device)
          }
        }
      } catch (error) {
        console.error('Failed to fetch network info:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchNetworkInfo()
  }, [deviceId])

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-6 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-6 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (!networkInfo) return null

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Inventory</h3>
      </div>
      <div className="p-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Device Name</label>
          <p className="text-gray-900 dark:text-white font-mono">{networkInfo.name || 'Unknown'}</p>
        </div>
        {networkInfo.ipAddress && (
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">IP Address</label>
            <p className="text-gray-900 dark:text-white">{networkInfo.ipAddress}</p>
          </div>
        )}
        {networkInfo.macAddress && (
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">MAC Address</label>
            <p className="text-gray-900 dark:text-white font-mono">{networkInfo.macAddress}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// IP Configuration Widget
const IPConfigurationWidget: React.FC<DeviceWidgetProps> = ({ deviceId, device }) => {
  const [networkInfo, setNetworkInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchNetworkInfo = async () => {
      try {
        const response = await fetch(`/api/device/${deviceId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.device) {
            setNetworkInfo(data.device)
          }
        }
      } catch (error) {
        console.error('Failed to fetch network info:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchNetworkInfo()
  }, [deviceId])

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-6 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!networkInfo) return null

  // For now, just show basic network info since we don't have detailed IPv4/IPv6 config
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Network Configuration</h3>
      </div>
      <div className="p-6 space-y-4">
        {networkInfo.ipAddress && (
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">IP Address</label>
            <p className="text-gray-900 dark:text-white font-mono">{networkInfo.ipAddress}</p>
          </div>
        )}
        {networkInfo.macAddress && (
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">MAC Address</label>
            <p className="text-gray-900 dark:text-white font-mono">{networkInfo.macAddress}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Wireless Network Widget
const WirelessNetworkWidget: React.FC<DeviceWidgetProps> = ({ deviceId, device }) => {
  const [networkInfo, setNetworkInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchNetworkInfo = async () => {
      try {
        const response = await fetch(`/api/device/${deviceId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.device) {
            setNetworkInfo(data.device)
          }
        }
      } catch (error) {
        console.error('Failed to fetch network info:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchNetworkInfo()
  }, [deviceId])

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-6 bg-gray-200 rounded w-2/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-6 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (!networkInfo) return null

  // For now, just return null since we don't have wireless-specific data structure
  return null
}

// Define the Network Module
export class NetworkModule extends EnhancedBaseModule {
  manifest: ExtendedModuleManifest = {
    id: 'network-module',
    name: 'Network Module',
    version: '1.0.0',
    description: 'Displays comprehensive network information including connectivity, IP configuration, and wireless details',
    author: 'ReportMate',
    category: 'device',
    enabled: true,
    
    deviceWidgets: [
      {
        id: 'network-overview',
        name: 'Network Overview',
        description: 'Network connectivity overview with connection type, IP, and MAC address',
        component: NetworkOverviewWidget,
        category: 'network',
        size: 'large',
        order: 1,
        refreshInterval: 60,
        supportsExport: true
      },
      {
        id: 'basic-network-info',
        name: 'Basic Network Information', 
        description: 'Hostname, service, and media details',
        component: BasicNetworkInfoWidget,
        category: 'network',
        size: 'medium',
        order: 2,
        refreshInterval: 60
      },
      {
        id: 'ip-configuration', 
        name: 'IP Configuration',
        description: 'IPv4 and IPv6 configuration details',
        component: IPConfigurationWidget,
        category: 'network',
        size: 'medium',
        order: 3,
        refreshInterval: 60,
        supportsExport: true
      },
      {
        id: 'wireless-info',
        name: 'Wireless Information',
        description: 'Wireless network configuration and capabilities',
        component: WirelessNetworkWidget,
        category: 'network',
        size: 'large',
        order: 4,
        refreshInterval: 60
      }
    ],
    
    configSchema: {
      title: 'Network Module Settings',
      description: 'Configure network monitoring preferences',
      properties: {
        showOverview: {
          type: 'boolean',
          title: 'Show Network Overview',
          description: 'Display network overview with connection type, IP, and MAC address',
          default: true
        },
        showBasicInfo: {
          type: 'boolean',
          title: 'Show Inventory',
          description: 'Display hostname, service, and media information',
          default: true
        },
        showIPConfig: {
          type: 'boolean',
          title: 'Show IP Configuration',
          description: 'Display IPv4 and IPv6 configuration details',
          default: true
        },
        showWirelessInfo: {
          type: 'boolean',
          title: 'Show Wireless Information',
          description: 'Display wireless network information (when available)',
          default: true
        },
        refreshInterval: {
          type: 'number',
          title: 'Refresh Interval (seconds)',
          description: 'How often to refresh network data',
          default: 60,
          validation: { min: 30, max: 300 }
        }
      }
    }
  }

  async onLoad(): Promise<void> {
    this.log('info', 'Network module loaded')
  }
}

// Export default instance
export default new NetworkModule()

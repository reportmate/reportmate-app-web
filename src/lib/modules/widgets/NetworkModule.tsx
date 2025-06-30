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
        // In a real implementation, this would be an API call
        // For now, we'll use the device data directly
        if (device?.network) {
          setNetworkInfo(device)
        }
      } catch (error) {
        console.error('Failed to fetch network info:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchNetworkInfo()
  }, [deviceId, device])

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

  if (!networkInfo?.network) {
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
            {networkInfo.network.connectionType}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Connection Type</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1 font-mono">
            {networkInfo.ipAddress}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">IP Address</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1 font-mono">
            {networkInfo.macAddress}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">MAC Address</div>
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
        if (device?.network) {
          setNetworkInfo(device)
        }
      } catch (error) {
        console.error('Failed to fetch network info:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchNetworkInfo()
  }, [deviceId, device])

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

  if (!networkInfo?.network) return null

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Basic Information</h3>
      </div>
      <div className="p-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Hostname</label>
          <p className="text-gray-900 dark:text-white font-mono">{networkInfo.network.hostname}</p>
        </div>
        {networkInfo.network.service && (
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Service</label>
            <p className="text-gray-900 dark:text-white">{networkInfo.network.service}</p>
          </div>
        )}
        {networkInfo.network.status !== undefined && (
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Status</label>
            <p className="text-gray-900 dark:text-white">{networkInfo.network.status}</p>
          </div>
        )}
        {networkInfo.network.currentmedia && (
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Current Media</label>
            <p className="text-gray-900 dark:text-white">{networkInfo.network.currentmedia}</p>
          </div>
        )}
        {networkInfo.network.activemedia && (
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Media</label>
            <p className="text-gray-900 dark:text-white">{networkInfo.network.activemedia}</p>
          </div>
        )}
        {networkInfo.network.activemtu && (
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Active MTU</label>
            <p className="text-gray-900 dark:text-white">{networkInfo.network.activemtu}</p>
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
        if (device?.network) {
          setNetworkInfo(device)
        }
      } catch (error) {
        console.error('Failed to fetch network info:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchNetworkInfo()
  }, [deviceId, device])

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

  if (!networkInfo?.network) return null

  const hasIPv4 = networkInfo.network.ipv4ip || networkInfo.network.ipv4conf
  const hasIPv6 = networkInfo.network.ipv6ip || networkInfo.network.ipv6conf

  if (!hasIPv4 && !hasIPv6) return null

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">IP Configuration</h3>
      </div>
      <div className="p-6 space-y-6">
        {hasIPv4 && (
          <div>
            <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">IPv4</h4>
            <div className="space-y-3">
              {networkInfo.network.ipv4conf && (
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Configuration</label>
                  <p className="text-gray-900 dark:text-white">{networkInfo.network.ipv4conf}</p>
                </div>
              )}
              {networkInfo.network.ipv4ip && (
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">IP Address</label>
                  <p className="text-gray-900 dark:text-white font-mono">{networkInfo.network.ipv4ip}</p>
                </div>
              )}
              {networkInfo.network.ipv4mask && (
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Subnet Mask</label>
                  <p className="text-gray-900 dark:text-white font-mono">{networkInfo.network.ipv4mask}</p>
                </div>
              )}
              {networkInfo.network.ipv4router && (
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Router</label>
                  <p className="text-gray-900 dark:text-white font-mono">{networkInfo.network.ipv4router}</p>
                </div>
              )}
              {networkInfo.network.ipv4dns && (
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">DNS Servers</label>
                  <p className="text-gray-900 dark:text-white font-mono">{networkInfo.network.ipv4dns}</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {hasIPv6 && (
          <div>
            <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">IPv6</h4>
            <div className="space-y-3">
              {networkInfo.network.ipv6conf && (
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Configuration</label>
                  <p className="text-gray-900 dark:text-white">{networkInfo.network.ipv6conf}</p>
                </div>
              )}
              {networkInfo.network.ipv6ip && (
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">IP Address</label>
                  <p className="text-gray-900 dark:text-white font-mono">{networkInfo.network.ipv6ip}</p>
                </div>
              )}
              {networkInfo.network.ipv6prefixlen !== undefined && (
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Prefix Length</label>
                  <p className="text-gray-900 dark:text-white">{networkInfo.network.ipv6prefixlen}</p>
                </div>
              )}
              {networkInfo.network.ipv6router && (
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Router</label>
                  <p className="text-gray-900 dark:text-white font-mono">{networkInfo.network.ipv6router}</p>
                </div>
              )}
            </div>
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
        if (device?.network) {
          setNetworkInfo(device)
        }
      } catch (error) {
        console.error('Failed to fetch network info:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchNetworkInfo()
  }, [deviceId, device])

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

  if (!networkInfo?.network) return null

  const hasWirelessInfo = networkInfo.network.ssid || 
                         networkInfo.network.signalStrength ||
                         networkInfo.network.wireless_card_type ||
                         networkInfo.network.country_code ||
                         networkInfo.network.firmware_version ||
                         networkInfo.network.airdrop_supported !== undefined ||
                         networkInfo.network.wow_supported !== undefined

  if (!hasWirelessInfo) return null

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Wireless Information</h3>
        </div>
      </div>
      <div className="p-6 space-y-4">
        {networkInfo.network.ssid && (
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">SSID</label>
            <p className="text-gray-900 dark:text-white">{networkInfo.network.ssid}</p>
          </div>
        )}
        {networkInfo.network.signalStrength && (
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Signal Strength</label>
            <p className="text-gray-900 dark:text-white">{networkInfo.network.signalStrength}</p>
          </div>
        )}
        {networkInfo.network.wireless_card_type && (
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Wireless Card Type</label>
            <p className="text-gray-900 dark:text-white">{networkInfo.network.wireless_card_type}</p>
          </div>
        )}
        {networkInfo.network.country_code && (
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Country Code</label>
            <p className="text-gray-900 dark:text-white">{networkInfo.network.country_code}</p>
          </div>
        )}
        {networkInfo.network.firmware_version && (
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Firmware Version</label>
            <p className="text-gray-900 dark:text-white">{networkInfo.network.firmware_version}</p>
          </div>
        )}
        {networkInfo.network.supported_channels && (
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Supported Channels</label>
            <p className="text-gray-900 dark:text-white text-sm">{networkInfo.network.supported_channels}</p>
          </div>
        )}
        {networkInfo.network.supported_phymodes && (
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Supported PHY Modes</label>
            <p className="text-gray-900 dark:text-white text-sm">{networkInfo.network.supported_phymodes}</p>
          </div>
        )}
        
        {/* Boolean features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {networkInfo.network.airdrop_supported !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">AirDrop Supported</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                networkInfo.network.airdrop_supported 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
              }`}>
                {networkInfo.network.airdrop_supported ? 'Yes' : 'No'}
              </span>
            </div>
          )}
          {networkInfo.network.wow_supported !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Wake on Wireless</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                networkInfo.network.wow_supported 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
              }`}>
                {networkInfo.network.wow_supported ? 'Yes' : 'No'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
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
          title: 'Show Basic Information',
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

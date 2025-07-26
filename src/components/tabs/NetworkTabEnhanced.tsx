/**
 * Network Tab Component
 * Detailed network configuration and connectivity information with enhanced active connection detection
 */

import React from 'react'
import { NetworkTable } from '../tables'

interface NetworkTabProps {
  device: any
  data?: any
}

export const NetworkTab: React.FC<NetworkTabProps> = ({ device, data }) => {
  // Use processed network data if available, otherwise use device data
  const networkData = data || device?.network || {}
  
  console.log('NetworkTab rendering with data:', {
    hasData: !!data,
    hasDeviceNetwork: !!device?.network,
    dataKeys: data ? Object.keys(data) : [],
    connectionType: networkData.connectionType,
    interfacesCount: networkData.interfaces?.length || 0
  })

  return (
    <div className="space-y-8">
      {/* Active Connection Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Active Connection</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {networkData.connectionType || 'Unknown'}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Connection Type</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {networkData.ipAddress || 'N/A'}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">IP Address</div>
          </div>
          {networkData.ssid && (
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {networkData.ssid}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">WiFi Network</div>
            </div>
          )}
          {networkData.signalStrength && (
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {networkData.signalStrength}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Signal Strength</div>
            </div>
          )}
        </div>
      </div>

      {/* Network Configuration Details */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Network Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Basic Information</h4>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600 dark:text-gray-400">Hostname:</dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-white">{networkData.hostname || 'N/A'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600 dark:text-gray-400">MAC Address:</dt>
                <dd className="text-sm font-mono text-gray-900 dark:text-white">{networkData.macAddress || 'N/A'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600 dark:text-gray-400">Primary Interface:</dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-white">{networkData.primaryInterface || 'N/A'}</dd>
              </div>
            </dl>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Network Settings</h4>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600 dark:text-gray-400">Gateway:</dt>
                <dd className="text-sm font-mono text-gray-900 dark:text-white">{networkData.gateway || 'N/A'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600 dark:text-gray-400">DNS Servers:</dt>
                <dd className="text-sm font-mono text-gray-900 dark:text-white">{networkData.dns || 'N/A'}</dd>
              </div>
              {networkData.vpnActive && (
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-600 dark:text-gray-400">VPN:</dt>
                  <dd className="text-sm text-green-600 dark:text-green-400">
                    Active {networkData.vpnName && `(${networkData.vpnName})`}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>

      {/* Network Interfaces Table */}
      {networkData.interfaces && networkData.interfaces.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Network Interfaces</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Interface</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">IP Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">MAC Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">MTU</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {networkData.interfaces.map((iface: any, index: number) => (
                  <tr key={iface.name || index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{iface.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        iface.type?.toLowerCase().includes('wireless') || iface.type?.toLowerCase().includes('802.11')
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                      }`}>
                        {iface.type || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        iface.status === 'Connected'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {iface.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-white">
                      {iface.ipAddress || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-white">
                      {iface.macAddress || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {iface.mtu || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* WiFi Networks */}
      {networkData.wifiNetworks && networkData.wifiNetworks.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Saved WiFi Networks</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">SSID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Security</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Channel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {networkData.wifiNetworks.map((network: any, index: number) => (
                  <tr key={network.ssid || index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{network.ssid}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {network.security}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        network.isConnected
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                      }`}>
                        {network.isConnected ? 'Connected' : 'Saved'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {network.channel}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Legacy Network Table for compatibility */}
      {!networkData.interfaces && <NetworkTable data={networkData} />}
    </div>
  )
}

export default NetworkTab

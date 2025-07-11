/**
 * Network Widget
 * Displays network configuration and connectivity information
 */

import React from 'react'

interface NetworkInfo {
  hostname?: string
  connectionType?: string
  ssid?: string | null
  signalStrength?: string | null
  service?: string
  status?: number
  ethernet?: string
  clientid?: string
  ipv4conf?: string
  ipv4ip?: string
  ipv4mask?: string
  ipv4router?: string
  ipv6conf?: string
  ipv6ip?: string
  ipv6prefixlen?: number
  ipv6router?: string
  ipv4dns?: string
  vlans?: string
  activemtu?: number
  validmturange?: string
  currentmedia?: string
  activemedia?: string
  searchdomain?: string
  externalip?: string
  location?: string
  airdrop_channel?: string
  airdrop_supported?: boolean
  wow_supported?: boolean
  supported_channels?: string
  supported_phymodes?: string
  wireless_card_type?: string
  country_code?: string
  firmware_version?: string
  wireless_locale?: string
}

interface Device {
  id: string
  name: string
  ipAddress?: string
  ipAddressV4?: string
  ipAddressV6?: string
  macAddress?: string
  network?: NetworkInfo
}

interface NetworkWidgetProps {
  device: Device
}

const getNetworkIcon = () => (
  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
  </svg>
)

export const NetworkWidget: React.FC<NetworkWidgetProps> = ({ device }) => {
  const { network } = device
  const hasNetworkInfo = device.ipAddress || device.macAddress || device.network

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
            {getNetworkIcon()}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Network</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Connectivity and configuration</p>
          </div>
        </div>
      </div>
      <div className="p-6">
        {hasNetworkInfo ? (
          <div className="space-y-4">
            {/* Basic Network Info */}
            {network?.hostname && (
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Hostname</label>
                <p className="text-gray-900 dark:text-white font-mono">{network.hostname}</p>
              </div>
            )}
            
            {device.ipAddressV4 && (
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">IPv4 Address</label>
                <p className="text-gray-900 dark:text-white font-mono">{device.ipAddressV4}</p>
              </div>
            )}
            
            {device.ipAddressV6 && (
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">IPv6 Address</label>
                <p className="text-gray-900 dark:text-white font-mono text-xs break-all">{device.ipAddressV6}</p>
              </div>
            )}
            
            {device.macAddress && (
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">MAC Address</label>
                <p className="text-gray-900 dark:text-white font-mono">{device.macAddress}</p>
              </div>
            )}

            {/* Connection Type and Details */}
            {network?.connectionType && (
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Connection Type</label>
                <p className="text-gray-900 dark:text-white">{network.connectionType}</p>
              </div>
            )}

            {/* WiFi Specific Info */}
            {network?.ssid && (
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">WiFi Network</label>
                <p className="text-gray-900 dark:text-white">{network.ssid}</p>
                {network.signalStrength && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">Signal: {network.signalStrength}</p>
                )}
              </div>
            )}

            {/* DNS and Gateway */}
            {network?.ipv4router && (
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Gateway</label>
                <p className="text-gray-900 dark:text-white font-mono">{network.ipv4router}</p>
              </div>
            )}

            {network?.ipv4dns && (
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">DNS Server</label>
                <p className="text-gray-900 dark:text-white font-mono">{network.ipv4dns}</p>
              </div>
            )}

            {/* Advanced Network Info */}
            {network?.activemtu && (
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">MTU</label>
                <p className="text-gray-900 dark:text-white">{network.activemtu}</p>
              </div>
            )}

            {network?.externalip && (
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">External IP</label>
                <p className="text-gray-900 dark:text-white font-mono">{network.externalip}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-600 dark:text-gray-400">Network information not available</p>
        )}
      </div>
    </div>
  )
}

export default NetworkWidget

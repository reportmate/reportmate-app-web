/**
 * Network Tab Component
 * Detailed network configuration and connectivity information with enhanced active connection detection
 */

import React, { useState } from 'react'
import { NetworkTable } from '../tables'

interface NetworkTabProps {
  device: any
  data?: any
}

// CopyableValue component for consistent copy functionality - inline style like widgets
const CopyableValue: React.FC<{ 
  value: string | undefined, 
  showCopy?: boolean,
  className?: string,
  placeholder?: string 
}> = ({ value, showCopy = true, className = "", placeholder = "N/A" }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!value || value === placeholder) return
    
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(value)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } else {
        // Fallback for browsers that don't support clipboard API
        const textArea = document.createElement('textarea')
        textArea.value = value
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        
        try {
          document.execCommand('copy')
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        } catch (fallbackErr) {
          console.error('Fallback copy failed:', fallbackErr)
        } finally {
          document.body.removeChild(textArea)
        }
      }
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }

  const displayValue = value || placeholder
  const shouldShowCopyButton = showCopy && value && value !== placeholder

  return (
    <span className={`flex items-center ${className}`}>
      <span>{displayValue}</span>
      {shouldShowCopyButton && (
        <button
          onClick={handleCopy}
          className="ml-2 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
          title={copied ? 'Copied!' : 'Copy to clipboard'}
        >
          {copied ? (
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </button>
      )}
    </span>
  )
}

export const NetworkTab: React.FC<NetworkTabProps> = ({ device, data }) => {
  // Use processed network data if available, otherwise use device data
  const networkData = data || device?.network || {}
  
  console.log('NetworkTab rendering with data:', {
    hasData: !!data,
    hasDeviceNetwork: !!device?.network,
    dataKeys: data ? Object.keys(data) : [],
    connectionType: networkData.connectionType,
    interfacesCount: networkData.interfaces?.length || 0,
    macAddress: networkData.macAddress,
    activeConnectionData: data ? {
      interfaceName: data.interfaceName,
      friendlyName: data.friendlyName,
      ipAddress: data.ipAddress,
      gateway: data.gateway
    } : null
  })

  return (
    <div className="space-y-8">
      {/* Active Connection Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Active Connection</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {networkData.connectionType || 'Unknown'}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Connection Type</div>
          </div>
          {networkData.ssid && (
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {networkData.ssid}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">WiFi Network</div>
            </div>
          )}
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900 dark:text-white font-mono">
              <CopyableValue 
                value={networkData.ipAddress} 
                className="justify-center" 
                placeholder="N/A"
              />
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">IP Address</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {networkData.hostname || 'N/A'}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Hostname</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900 dark:text-white font-mono">
              <CopyableValue 
                value={networkData.macAddress} 
                className="justify-center" 
                placeholder="N/A"
                />
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">MAC Address</div>
          </div>
          {networkData.signalStrength && (
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {networkData.signalStrength}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Signal Strength</div>
            </div>
          )}
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900 dark:text-white font-mono">
              <CopyableValue 
                value={networkData.dns} 
                className="justify-center" 
                placeholder="N/A"
              />
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">DNS Servers</div>
          </div>
          {networkData.vpnName && (
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {networkData.vpnName}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">VPN Connection</div>
            </div>
          )}
        </div>
      </div>

      {/* Network Configuration and WiFi Networks - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Network Configuration Details - 25% width (1 column) */}
        <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Network Configuration</h3>
          <div className="space-y-6">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Interface Summary</h4>
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-600 dark:text-gray-400">Active Interfaces:</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white">
                    {networkData.interfaces?.filter((iface: any) => iface.status === 'Connected').length || 0}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-600 dark:text-gray-400">Total Interfaces:</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white">{networkData.interfaces?.length || 0}</dd>
                </div>
              </dl>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Network Routes</h4>
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-600 dark:text-gray-400">Configured Routes:</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white">{networkData.routes?.length || 0}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-600 dark:text-gray-400">VPN Connections:</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white">{networkData.vpnConnections?.length || 0}</dd>
                </div>
                {networkData.vpnActive && (
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-600 dark:text-gray-400">VPN Status:</dt>
                    <dd className="text-sm text-green-600 dark:text-green-400">
                      Active {networkData.vpnName && `(${networkData.vpnName})`}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>

        {/* WiFi Networks - 75% width (3 columns) */}
        {networkData.wifiNetworks && networkData.wifiNetworks.length > 0 ? (
          <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
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
                  {networkData.wifiNetworks
                    .sort((a: any, b: any) => {
                      // Sort by connection status first (connected networks first)
                      if (a.isConnected !== b.isConnected) {
                        return b.isConnected ? 1 : -1;
                      }
                      // Then sort alphabetically by SSID
                      return (a.ssid || '').localeCompare(b.ssid || '');
                    })
                    .map((network: any, index: number) => (
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
        ) : (
          <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Saved WiFi Networks</h3>
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                </svg>
              </div>
              <p className="text-gray-600 dark:text-gray-400">No saved WiFi networks found</p>
            </div>
          </div>
        )}
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
                {networkData.interfaces
                  .sort((a: any, b: any) => {
                    // First priority: Connected status (Connected before Disconnected/Down)
                    const aConnected = a.status === 'Connected' ? 1 : 0;
                    const bConnected = b.status === 'Connected' ? 1 : 0;
                    if (aConnected !== bConnected) {
                      return bConnected - aConnected; // Connected first
                    }
                    
                    // Second priority: Wireless interfaces first (among connected interfaces)
                    const aWireless = (a.type?.toLowerCase().includes('wireless') || a.type?.toLowerCase().includes('802.11')) ? 1 : 0;
                    const bWireless = (b.type?.toLowerCase().includes('wireless') || b.type?.toLowerCase().includes('802.11')) ? 1 : 0;
                    if (aWireless !== bWireless) {
                      return bWireless - aWireless; // Wireless first
                    }
                    
                    // Third priority: Sort by interface name
                    return (a.name || '').localeCompare(b.name || '');
                  })
                  .map((iface: any, index: number) => (
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
                      <CopyableValue 
                        value={iface.ipAddress} 
                        className="font-mono" 
                        placeholder="N/A"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-white">
                      <CopyableValue 
                        value={iface.macAddress} 
                        className="font-mono" 
                        placeholder="N/A"
                      />
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

      {/* Legacy Network Table for compatibility */}
      {!networkData.interfaces && <NetworkTable data={networkData} />}
    </div>
  )
}

export default NetworkTab

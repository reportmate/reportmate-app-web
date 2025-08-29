/**
 * Network Tab Component
 * Detailed network configuration and connectivity information with enhanced active connection detection
 */

import React, { useState } from 'react'
import { NetworkTable } from '../tables'
import { extractNetwork } from '../../lib/data-processing/modules'

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
  console.log('🌐🌐🌐🌐🌐 NETWORK TAB COMPONENT RENDERING 🌐🌐🌐🌐🌐');
  console.log('🌐🌐🌐 NETWORK TAB - Component starting with device:', device?.deviceId || 'undefined');
  console.log('🌐🌐🌐 NETWORK TAB - Data prop:', data);
  console.log('🌐🌐🌐 NETWORK TAB - Device object keys:', device ? Object.keys(device) : 'no device');
  
  // Process network data directly like ApplicationsTab does
  const processedNetworkData = data || extractNetwork(device)
  console.log('🌐🌐🌐 NETWORK TAB - Processed data from processNetworkData:', processedNetworkData)
  
  // Use processed data as primary source, fallback to data prop
  const networkData = processedNetworkData || data || {}
  
  console.log('🌐🌐🌐 NetworkTab rendering with final networkData:', {
    hasProcessedData: !!processedNetworkData,
    hasDataProp: !!data,
    connectionType: networkData.connectionType,
    interfacesCount: networkData.interfaces?.length || 0,
    wifiNetworksCount: networkData.wifiNetworks?.length || 0,
    vpnConnectionsCount: networkData.vpnConnections?.length || 0,
    macAddress: networkData.macAddress,
    ipAddress: networkData.ipAddress,
    ssid: networkData.ssid
  })

  return (
    <div className="space-y-6">
      {/* Header with Icon */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Network Status</h1>
            <p className="text-base text-gray-600 dark:text-gray-400">Network connectivity and configuration details</p>
          </div>
        </div>
        {/* Connection Type - Top Right */}
        {networkData.connectionType && (
          <div className="text-right mr-8">
            <div className="text-sm text-gray-500 dark:text-gray-400">Active Connection</div>
            <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">
              {networkData.connectionType}
            </div>
          </div>
        )}
      </div>

      {/* Active Connection Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {networkData.ssid && (
            <div className="text-center">
              <div className="text-sm text-gray-500 dark:text-gray-500">WiFi Network</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {networkData.ssid}
              </div>
            </div>
          )}
          <div className="text-center">
            <div className="text-sm text-gray-500 dark:text-gray-500">IP Address</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white font-mono">
              <CopyableValue 
                value={networkData.ipAddress} 
                className="justify-center" 
                placeholder="N/A"
              />
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-500 dark:text-gray-500">MAC Address</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white font-mono">
              <CopyableValue 
                value={networkData.macAddress} 
                className="justify-center" 
                placeholder="N/A"
                />
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-500 dark:text-gray-500">Hostname</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {networkData.hostname || 'N/A'}
            </div>
          </div>
          {networkData.signalStrength && (
            <div className="text-center">
              <div className="text-sm text-gray-500 dark:text-gray-500">Signal Strength</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {networkData.signalStrength}
              </div>
            </div>
          )}
          <div className="text-center">
            <div className="text-sm text-gray-500 dark:text-gray-500">DNS Servers</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white font-mono">
              <CopyableValue 
                value={Array.isArray(networkData.dns) 
                  ? networkData.dns.join(', ') 
                  : typeof networkData.dns === 'object' && networkData.dns?.servers 
                    ? networkData.dns.servers.join(', ')
                    : typeof networkData.dns === 'string' 
                      ? networkData.dns 
                      : undefined
                } 
                className="justify-center" 
                placeholder="N/A"
              />
            </div>
          </div>
          {networkData.interfaceName && (
            <div className="text-center">
              <div className="text-sm text-gray-500 dark:text-gray-500">Interface</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {networkData.interfaceName}
              </div>
            </div>
          )}
          {networkData.vpnName && (
            <div className="text-center">
              <div className="text-sm text-gray-500 dark:text-gray-500">VPN Connection</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {networkData.vpnName}
              </div>
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
                    {networkData.interfaces?.filter((iface: any) => iface.status === 'Active' || iface.status === 'Connected').length || 0}
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
                        {network.channel && network.channel !== 'Unknown' ? network.channel : ''}
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
                    // First priority: Active status (Active/Connected before Disconnected)
                    const aActive = (a.status === 'Active' || a.status === 'Connected') ? 1 : 0;
                    const bActive = (b.status === 'Active' || b.status === 'Connected') ? 1 : 0;
                    if (aActive !== bActive) {
                      return bActive - aActive; // Active first
                    }
                    
                    // Second priority: Wired/Ethernet interfaces first (among active interfaces)
                    const aWired = (a.type?.toLowerCase().includes('ethernet') || a.type?.toLowerCase().includes('wired')) ? 1 : 0;
                    const bWired = (b.type?.toLowerCase().includes('ethernet') || b.type?.toLowerCase().includes('wired')) ? 1 : 0;
                    if (aWired !== bWired) {
                      return bWired - aWired; // Wired/Ethernet first
                    }
                    
                    // Third priority: Sort by interface name
                    return (a.name || '').localeCompare(b.name || '');
                  })
                  .map((iface: any, index: number) => {
                    const isActive = iface.status === 'Connected' || iface.status === 'Active';
                    const isDisconnected = iface.status === 'Disconnected';
                    
                    return (
                    <tr key={iface.name || index} className={`${
                      isDisconnected 
                        ? 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700' 
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}>
                      <td className="px-6 py-4">
                        <div className={`text-sm font-medium ${
                          isDisconnected 
                            ? 'text-gray-400 dark:text-gray-500' 
                            : 'text-gray-900 dark:text-white'
                        }`}>
                          {iface.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isActive ? (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            iface.type?.toLowerCase().includes('wireless') || iface.type?.toLowerCase().includes('802.11')
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                          }`}>
                            {iface.type || 'Unknown'}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400 dark:text-gray-500">
                            {iface.type || 'Unknown'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isActive ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            Active
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400 dark:text-gray-500">
                            Disconnected
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                        <CopyableValue 
                          value={iface.ipAddress && iface.ipAddress !== 'N/A' ? iface.ipAddress : ''} 
                          className={`font-mono ${isDisconnected ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}
                          placeholder=""
                          showCopy={iface.ipAddress && iface.ipAddress !== 'N/A'}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                        <CopyableValue 
                          value={iface.macAddress && iface.macAddress !== 'N/A' ? iface.macAddress : ''} 
                          className={`font-mono ${isDisconnected ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}
                          placeholder=""
                          showCopy={iface.macAddress && iface.macAddress !== 'N/A'}
                        />
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDisconnected ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                        {iface.mtu && iface.mtu !== 0 ? iface.mtu : ''}
                      </td>
                    </tr>
                    );
                  })}
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

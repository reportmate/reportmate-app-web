/**
 * Network Widget - Complete Refactor
 * Three distinct views:
 * 1. Only Ethernet: Connection type, hostname, IP address, Mac address
 * 2. Only Wireless: Connection type, Hostname, SSID + Protocol, IP address, Mac address
 * 3. Both Ethernet and Wireless (TWO COLUMNS):
 *    LEFT: Ethernet - Hostname, IP address, Mac address
 *    RIGHT: Wireless - SSID + Protocol, IP address, Mac address
 */

import React from 'react'
import { StatBlock, Stat, EmptyState, Icons, WidgetColors } from './shared'
import { extractNetwork } from '../../lib/data-processing/modules/network'

interface Device {
  id: string
  name: string
  ipAddress?: string
  ipAddressV4?: string
  ipAddressV6?: string
  macAddress?: string
  modules?: {
    network?: any
  }
}

interface NetworkWidgetProps {
  device: Device
}

export const NetworkWidget: React.FC<NetworkWidgetProps> = ({ device }) => {
  const network = extractNetwork(device)
  
  // Get interfaces for determining connections
  const interfaces = network.interfaces || []
  const activeInterfaces = interfaces.filter((iface: any) => iface.isActive)
  
  // Find Ethernet interface
  const ethernetInterface = activeInterfaces.find((iface: any) => 
    iface.type === 'Ethernet' || 
    iface.name === 'en1' ||
    iface.name?.toLowerCase().includes('ethernet')
  )
  
  // Find WiFi interface
  const wifiInterface = activeInterfaces.find((iface: any) => 
    iface.type === 'Wireless' || 
    iface.type === 'WiFi' ||
    iface.type?.toLowerCase().includes('wifi') ||
    iface.type?.toLowerCase().includes('wireless') ||
    iface.name === 'en0'
  )
  
  // Get WiFi details
  const wifiData = network.wifiInterface || (wifiInterface ? {
    ssid: wifiInterface.ssid,
    protocol: wifiInterface.wirelessProtocol,
    ipAddress: wifiInterface.ipAddress,
    macAddress: wifiInterface.macAddress
  } : null)
  
  // Determine connection state
  const hasEthernet = !!ethernetInterface
  const hasWifi = !!wifiInterface
  const hasBoth = hasEthernet && hasWifi
  
  // VPN status
  const vpnActive = network.vpnActive
  const vpnName = network.vpnName
  
  // Get primary IP for display check
  const primaryIp = ethernetInterface?.ipAddress || wifiInterface?.ipAddress || network.ipAddress

  if (!primaryIp) {
    return (
      <StatBlock 
        title="Network" 
        subtitle="Connectivity and configuration"
        icon={Icons.network}
        iconColor={WidgetColors.teal}
      >
        <EmptyState message="Network information not available" />
      </StatBlock>
    )
  }

  return (
    <StatBlock 
      title="Network" 
      subtitle="Connectivity and configuration"
      icon={Icons.network}
      iconColor={WidgetColors.teal}
    >
      <div className="space-y-4">
        {/* VIEW 3: Both Ethernet and Wireless - TWO BLOCKS OF TWO COLUMNS */}
        {hasBoth ? (
          <>
            {/* BLOCK 1: Hostname and WiFi Name */}
            <div className="grid grid-cols-2 gap-4">
              <Stat 
                label="Hostname" 
                value={network.hostname} 
                isMono 
                showCopyButton
              />
              
              {wifiData?.ssid && wifiData.ssid !== '[Location Services Required]' && (
                <Stat 
                  label="WiFi Name" 
                  value={wifiData.ssid}
                />
              )}
            </div>
            
            {/* Separator between blocks */}
            <div className="border-t border-transparent"></div>
            
            {/* BLOCK 2: IP and MAC Addresses */}
            <div className="grid grid-cols-2 gap-4">
              {/* LEFT COLUMN: Wired */}
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Wired IP Address</div>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-xs text-gray-900 dark:text-white truncate" title={ethernetInterface?.ipAddress || network.ipAddress}>
                      {ethernetInterface?.ipAddress || network.ipAddress}
                    </span>
                    <button
                      onClick={() => navigator.clipboard.writeText(ethernetInterface?.ipAddress || network.ipAddress || '')}
                      className="flex-shrink-0 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      title="Copy to clipboard"
                    >
                      <svg className="w-3 h-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Wired MAC Address</div>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-xs text-gray-900 dark:text-white truncate" title={ethernetInterface?.macAddress || network.macAddress}>
                      {ethernetInterface?.macAddress || network.macAddress}
                    </span>
                    <button
                      onClick={() => navigator.clipboard.writeText(ethernetInterface?.macAddress || network.macAddress || '')}
                      className="flex-shrink-0 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      title="Copy to clipboard"
                    >
                      <svg className="w-3 h-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              
              {/* RIGHT COLUMN: WiFi */}
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">WiFi IP Address</div>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-xs text-gray-900 dark:text-white truncate" title={wifiData?.ipAddress || wifiInterface?.ipAddress}>
                      {wifiData?.ipAddress || wifiInterface?.ipAddress}
                    </span>
                    <button
                      onClick={() => navigator.clipboard.writeText(wifiData?.ipAddress || wifiInterface?.ipAddress || '')}
                      className="flex-shrink-0 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      title="Copy to clipboard"
                    >
                      <svg className="w-3 h-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">WiFi MAC Address</div>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-xs text-gray-900 dark:text-white truncate" title={wifiData?.macAddress || wifiInterface?.macAddress}>
                      {wifiData?.macAddress || wifiInterface?.macAddress}
                    </span>
                    <button
                      onClick={() => navigator.clipboard.writeText(wifiData?.macAddress || wifiInterface?.macAddress || '')}
                      className="flex-shrink-0 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      title="Copy to clipboard"
                    >
                      <svg className="w-3 h-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : hasEthernet ? (
          /* VIEW 1: Only Ethernet */
          <>
            <Stat 
              label="Connection" 
              value="Ethernet"
            />
            
            <Stat 
              label="Hostname" 
              value={network.hostname} 
              isMono 
              showCopyButton
            />
            
            <Stat 
              label="IP Address" 
              value={ethernetInterface?.ipAddress || network.ipAddress} 
              isMono 
              showCopyButton
            />
            
            <Stat 
              label="MAC Address" 
              value={ethernetInterface?.macAddress || network.macAddress} 
              isMono 
              showCopyButton
            />
          </>
        ) : hasWifi ? (
          /* VIEW 2: Only Wireless */
          <>
            <Stat 
              label="Connection" 
              value="Wireless"
            />
            
            <Stat 
              label="Hostname" 
              value={network.hostname} 
              isMono 
              showCopyButton
            />
            
            {wifiData?.ssid && wifiData.ssid !== '[Location Services Required]' && (
              <Stat 
                label="SSID" 
                value={wifiData.protocol ? `${wifiData.ssid} (${wifiData.protocol})` : wifiData.ssid}
              />
            )}
            
            <Stat 
              label="IP Address" 
              value={wifiData?.ipAddress || wifiInterface?.ipAddress || network.ipAddress} 
              isMono 
              showCopyButton
            />
            
            <Stat 
              label="MAC Address" 
              value={wifiData?.macAddress || wifiInterface?.macAddress || network.macAddress} 
              isMono 
              showCopyButton
            />
          </>
        ) : (
          /* Fallback: Unknown connection type */
          <>
            <Stat 
              label="Connection" 
              value={network.connectionType || 'Unknown'}
            />
            
            {network.hostname && (
              <Stat 
                label="Hostname" 
                value={network.hostname} 
                isMono 
                showCopyButton
              />
            )}
            
            <Stat 
              label="IP Address" 
              value={network.ipAddress} 
              isMono 
              showCopyButton
            />
            
            {network.macAddress && (
              <Stat 
                label="MAC Address" 
                value={network.macAddress} 
                isMono 
                showCopyButton
              />
            )}
          </>
        )}

        {/* Network Quality - At the bottom */}
        {network.networkQuality && (network.networkQuality.downlinkCapacity || network.networkQuality.uplinkCapacity) && (
          <div className="pt-3 border-t border-transparent space-y-2">
            {/* Network Quality Title */}
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Network Quality</div>
            
            <div className="grid grid-cols-2 gap-2">
              {/* Row 1: Download & Upload */}
              {network.networkQuality.downlinkCapacity && (
                <div className="min-w-0">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Download</div>
                  <div className="text-xs text-gray-900 dark:text-gray-100">{network.networkQuality.downlinkCapacity}</div>
                </div>
              )}
              {network.networkQuality.uplinkCapacity && (
                <div className="min-w-0">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Upload</div>
                  <div className="text-xs text-gray-900 dark:text-gray-100">{network.networkQuality.uplinkCapacity}</div>
                </div>
              )}
              
              {/* Row 2: Responsiveness & Latency */}
              {(network.networkQuality.downlinkResponsiveness || network.networkQuality.uplinkResponsiveness) && (
                <div className="min-w-0">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Responsiveness</div>
                  <div className="text-xs text-gray-900 dark:text-gray-100">{network.networkQuality.downlinkResponsiveness || network.networkQuality.uplinkResponsiveness || 'Unknown'}</div>
                </div>
              )}
              {network.networkQuality.idleLatency && (
                <div className="min-w-0">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Latency</div>
                  <div className="text-xs text-gray-900 dark:text-gray-100">{network.networkQuality.idleLatency}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </StatBlock>
  )
}

export default NetworkWidget

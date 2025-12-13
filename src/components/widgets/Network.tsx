/**
 * Enhanced Network Widget
 * Displays comprehensive network configuration and connectivity information
 */

import React from 'react'
import { StatBlock, Stat, StatusBadge, EmptyState, Icons, WidgetColors } from './shared'
import { extractNetwork } from '../../lib/data-processing/modules/network'

// Based on actual API response structure from your sample data
interface NetworkInfo {
  moduleId?: string
  deviceId?: string
  collectedAt?: string
  hostname?: string
  connectionType?: string
  connectionName?: string
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
  // WiFi specific
  airdrop_channel?: string
  airdrop_supported?: boolean
  wow_supported?: boolean
  supported_channels?: string
  supported_phymodes?: string
  wireless_card_type?: string
  country_code?: string
  firmware_version?: string
  wireless_locale?: string
  // Enhanced modular structure
  interfaces?: Array<{
    name: string
    type: string
    status: string
    ipAddress?: string
    macAddress?: string
    speed?: string
    ssid?: string
    signalStrength?: string
    isActive?: boolean
  }>
  activeConnection?: {
    connectionType?: string
    interfaceName?: string
    friendlyName?: string
    ipAddress?: string
    gateway?: string
    activeWifiSsid?: string
    wifiSignalStrength?: number
    isVpnActive?: boolean
    vpnName?: string
  }
  primaryInterface?: string
  dns?: string[]
  gateway?: string
  externalIp?: string
}

interface Device {
  id: string
  name: string
  ipAddress?: string
  ipAddressV4?: string
  ipAddressV6?: string
  macAddress?: string
  network?: NetworkInfo
  // Modular network data
  modules?: {
    network?: NetworkInfo
  }
}

interface NetworkWidgetProps {
  device: Device
}

export const NetworkWidget: React.FC<NetworkWidgetProps> = ({ device }) => {
  // Use the enhanced extractNetwork function to get processed network data
  const network = extractNetwork(device)
  
  // Get activeConnection data using the processed network data
  const activeConnectionData = {
    connectionType: network.connectionType || 'Unknown',
    interfaceName: network.interfaceName,
    ipAddress: network.ipAddress || device.ipAddress,
    gateway: network.gateway,
    macAddress: network.macAddress || device.macAddress,
    isVpnActive: network.vpnActive || false,
    vpnName: network.vpnName || '',
    activeWifiSsid: network.ssid,
    wifiSignalStrength: network.signalStrength,
    // Enhanced data for active connection
    activeDnsServers: network.activeDnsServers || [],
    dnsAddress: network.dnsAddress
  }
  
  // Debug logging
  console.log('[NetworkWidget] Device data:', {
    deviceId: device.id,
    hasModules: !!device.modules,
    hasNetworkModule: !!device.modules?.network,
    networkData: network,
    activeConnectionData: activeConnectionData,
    activeDnsCount: activeConnectionData.activeDnsServers?.length || 0
  })
  
  const hasNetworkInfo = activeConnectionData.ipAddress || activeConnectionData.connectionType !== 'Unknown'

  if (!hasNetworkInfo) {
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
      <div className="space-y-5">
        {/* Active Connection - Priority Display */}
        {activeConnectionData.connectionType !== 'Unknown' ? (
          <>            
            {/* Connection Type and WiFi SSID - Side by side */}
            <div className="grid grid-cols-2 gap-4">
              <Stat 
                label="Connection Type" 
                value={activeConnectionData.connectionType} 
              />
              {activeConnectionData.activeWifiSsid && activeConnectionData.connectionType === 'Wireless' ? (
                <Stat 
                  label="WiFi Network" 
                  value={activeConnectionData.activeWifiSsid} 
                />
              ) : (
                <div></div>
              )}
            </div>

            {/* IP Address - Full width */}
            {activeConnectionData.ipAddress && (
              <Stat 
                label="IP Address" 
                value={activeConnectionData.ipAddress} 
                isMono 
                showCopyButton
              />
            )}

            {/* MAC Address - Full width */}
            {activeConnectionData.macAddress && (
              <Stat 
                label="MAC Address" 
                value={activeConnectionData.macAddress} 
                isMono 
                showCopyButton
              />
            )}

            {/* DNS Address - Full width for long addresses */}
            {activeConnectionData.dnsAddress && (
              <Stat 
                label="DNS Address" 
                value={activeConnectionData.dnsAddress} 
                isMono 
                showCopyButton
              />
            )}

            {/* VPN Status - Full width if active */}
            {activeConnectionData.isVpnActive && (
              <StatusBadge
                label="VPN Active"
                status={activeConnectionData.vpnName || 'Connected'}
                type="success"
              />
            )}

          </>
        ) : (
          <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 p-2 rounded">
            Network connection information not available
          </div>
        )}
      </div>
    </StatBlock>
  )
}

export default NetworkWidget

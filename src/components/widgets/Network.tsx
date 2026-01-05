/**
 * Enhanced Network Widget
 * Displays comprehensive network configuration and connectivity information
 * 
 * SNAKE_CASE: All interfaces match API response format directly
 */

import React from 'react'
import { StatBlock, Stat, StatusBadge, EmptyState, Icons, WidgetColors } from './shared'
import { extractNetwork } from '../../lib/data-processing/modules/network'

// Based on actual API response structure (snake_case from osquery/FastAPI)
interface NetworkInfo {
  module_id?: string
  device_id?: string
  collected_at?: string
  hostname?: string
  connection_type?: string
  connection_name?: string
  ssid?: string | null
  signal_strength?: string | null
  service?: string
  status?: number
  ethernet?: string
  client_id?: string
  ipv4_conf?: string
  ipv4_ip?: string
  ipv4_mask?: string
  ipv4_router?: string
  ipv6_conf?: string
  ipv6_ip?: string
  ipv6_prefix_len?: number
  ipv6_router?: string
  ipv4_dns?: string
  vlans?: string
  active_mtu?: number
  valid_mtu_range?: string
  current_media?: string
  active_media?: string
  search_domain?: string
  external_ip?: string
  location?: string
  // WiFi specific
  airdrop_channel?: string
  airdrop_supported?: boolean
  wow_supported?: boolean
  supported_channels?: string
  supported_phy_modes?: string
  wireless_card_type?: string
  country_code?: string
  firmware_version?: string
  wireless_locale?: string
  // Enhanced modular structure (snake_case)
  interfaces?: Array<{
    name: string
    type: string
    status: string
    ip_address?: string
    mac_address?: string
    speed?: string
    ssid?: string
    signal_strength?: string
    is_active?: boolean
  }>
  active_connection?: {
    connection_type?: string
    interface_name?: string
    friendly_name?: string
    ip_address?: string
    gateway?: string
    active_wifi_ssid?: string
    wifi_signal_strength?: number
    is_vpn_active?: boolean
    vpn_name?: string
  }
  primary_interface?: string
  dns?: string[]
  gateway?: string
  external_ip_address?: string
}

interface Device {
  id: string
  name: string
  ip_address?: string
  ip_address_v4?: string
  ip_address_v6?: string
  mac_address?: string
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
  
  // Get active_connection data using the processed network data (snake_case)
  const activeConnectionData = {
    connectionType: network.connection_type || 'Unknown',
    interfaceName: network.interface_name,
    ipAddress: network.ip_address || device.ip_address,
    gateway: network.gateway,
    macAddress: network.mac_address || device.mac_address,
    isVpnActive: network.vpn_active || false,
    vpnName: network.vpn_name || '',
    activeWifiSsid: network.ssid,
    wifiSignalStrength: network.signal_strength,
    // Enhanced data for active connection (snake_case)
    activeDnsServers: network.active_dns_servers || [],
    dnsAddress: network.dns_address
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

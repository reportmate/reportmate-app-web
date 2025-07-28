/**
 * Enhanced Network Widget
 * Displays comprehensive network configuration and connectivity information
 */

import React from 'react'
import { StatBlock, Stat, StatusBadge, EmptyState, Icons, WidgetColors } from './shared'

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
  // Access network data from modular structure or fallback to device level
  const networkModule = device.modules?.network as NetworkInfo | undefined
  const network = networkModule || device.network
  
  // Get activeConnection data using the same structure as NetworkTab
  const activeConnectionData = (network as any)?.activeConnection || {
    connectionType: (network as any)?.connectionType || 'Unknown',
    interfaceName: (network as any)?.primaryInterface || (network as any)?.interfaceName,
    friendlyName: (network as any)?.friendlyName,
    ipAddress: (network as any)?.ipAddress || device.ipAddress,
    gateway: (network as any)?.gateway,
    macAddress: (network as any)?.activeConnection?.macAddress || (network as any)?.macAddress || device.macAddress,
    isVpnActive: (network as any)?.isVpnActive || false,
    vpnName: (network as any)?.vpnName || '',
    activeWifiSsid: (network as any)?.activeConnection?.activeWifiSsid
  }
  
  // Get DNS servers - handle both array and string formats
  const dnsServers = (network as any)?.dns?.servers || (network as any)?.dns || []
  const primaryDns = Array.isArray(dnsServers) ? dnsServers[0] : dnsServers
  
  // Debug logging
  console.log('[NetworkWidget] Device data:', {
    deviceId: device.id,
    hasModules: !!device.modules,
    hasNetworkModule: !!device.modules?.network,
    hasDirectNetwork: !!device.network,
    networkKeys: network ? Object.keys(network) : [],
    activeConnectionData: activeConnectionData,
    dnsServers: dnsServers,
    networkSample: JSON.stringify(network).substring(0, 300)
  })
  
  const hasNetworkInfo = activeConnectionData.ipAddress || activeConnectionData.connectionType !== 'Unknown' || network

  const formatConnectionStatus = (status?: number) => {
    switch (status) {
      case 1: return 'Connected'
      case 0: return 'Disconnected'
      case 2: return 'Connecting'
      default: return 'Unknown'
    }
  }

  const getConnectionStatusType = (status?: number): 'success' | 'error' | 'warning' => {
    switch (status) {
      case 1: return 'success'
      case 0: return 'error'
      case 2: return 'warning'
      default: return 'warning'
    }
  }

  if (!hasNetworkInfo) {
    return (
      <StatBlock 
        title="Network" 
        subtitle="Connectivity and configuration"
        icon={Icons.network}
        iconColor={WidgetColors.indigo}
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
      iconColor={WidgetColors.indigo}
    >
      <div className="space-y-4">
        {/* Active Connection - Priority Display */}
        {activeConnectionData.connectionType !== 'Unknown' ? (
          <>            
            {/* Connection Type */}
            <Stat 
              label="Connection Type" 
              value={activeConnectionData.connectionType} 
            />

            {/* IP Address */}
            {activeConnectionData.ipAddress && (
              <Stat 
                label="IP Address" 
                value={activeConnectionData.ipAddress} 
                isMono 
              />
            )}

            {/* Gateway */}
            {activeConnectionData.gateway && (
              <Stat 
                label="Gateway" 
                value={activeConnectionData.gateway} 
                isMono 
              />
            )}

            {/* DNS Server */}
            {primaryDns && (
              <Stat 
                label="DNS Server" 
                value={primaryDns} 
                isMono 
              />
            )}

            {/* MAC Address */}
            {activeConnectionData.macAddress && (
              <Stat 
                label="MAC Address" 
                value={activeConnectionData.macAddress} 
                isMono 
              />
            )}

            {/* WiFi SSID */}
            {activeConnectionData.activeWifiSsid && (
              <Stat 
                label="WiFi Network" 
                value={activeConnectionData.activeWifiSsid} 
              />
            )}

            {/* VPN Status */}
            {activeConnectionData.isVpnActive && (
              <StatusBadge
                label="VPN Active"
                status={activeConnectionData.vpnName || 'Connected'}
                type="success"
              />
            )}

            {/* Interface Name */}
            {(activeConnectionData.friendlyName || activeConnectionData.interfaceName) && (
              <Stat 
                label="Interface" 
                value={activeConnectionData.friendlyName || activeConnectionData.interfaceName} 
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

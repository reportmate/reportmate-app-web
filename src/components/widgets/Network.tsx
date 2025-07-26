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
  const network = device.network || networkModule
  
  // Get activeConnection from either modules.network or direct network level
  const activeConnection = (network as any)?.activeConnection || (networkModule as any)?.activeConnection
  
  // Debug logging
  console.log('[NetworkWidget] Device data:', {
    deviceId: device.id,
    hasModules: !!device.modules,
    hasNetworkModule: !!device.modules?.network,
    hasDirectNetwork: !!device.network,
    networkKeys: network ? Object.keys(network) : [],
    hasActiveConnection: !!activeConnection,
    activeConnectionData: activeConnection,
    networkSample: JSON.stringify(network).substring(0, 300)
  })
  
  const hasNetworkInfo = device.ipAddress || device.macAddress || network || (network as any)?.interfaces?.length

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
        {activeConnection ? (
          <>            
            {/* WiFi Network - Show first for wireless connections */}
            {activeConnection.connectionType === 'Wireless' && (
              <>
                {activeConnection.activeWifiSsid ? (
                  <Stat 
                    label="WiFi Network" 
                    value={activeConnection.activeWifiSsid} 
                  />
                ) : (
                  <Stat 
                    label="WiFi Network" 
                    value="Connected (Name unavailable)" 
                  />
                )}
              </>
            )}

            {/* Connection Type */}
            <Stat 
              label="Connection Type" 
              value={activeConnection.connectionType || 'Unknown'} 
            />

            {/* WiFi Signal Strength - Only show for wireless connections */}
            {activeConnection.connectionType === 'Wireless' && (
              <>
                {activeConnection.wifiSignalStrength ? (
                  <Stat 
                    label="Signal Strength" 
                    value={`${activeConnection.wifiSignalStrength}%`} 
                  />
                ) : (
                  <Stat 
                    label="Signal Strength" 
                    value="Unknown (requires location services)" 
                  />
                )}
              </>
            )}

            {/* IP Address */}
            {activeConnection.ipAddress && (
              <Stat 
                label="IP Address" 
                value={activeConnection.ipAddress} 
                isMono 
              />
            )}

            {/* DNS Server */}
            {((network as any)?.dns && (network as any).dns.length > 0) ? (
              <Stat 
                label="DNS Server" 
                value={(network as any).dns[0]} 
                isMono 
              />
            ) : (network as any)?.ipv4dns && (
              <Stat 
                label="DNS Server" 
                value={(network as any).ipv4dns} 
                isMono 
              />
            )}

            {/* VPN Status */}
            {activeConnection.isVpnActive && (
              <StatusBadge
                label="VPN Active"
                status={activeConnection.vpnName || 'Connected'}
                type="success"
              />
            )}
          </>
        ) : (
          <div className="text-xs text-red-500 bg-red-100 p-2 rounded">
            DEBUG: No activeConnection found!
            <br />
            network keys: {network ? Object.keys(network).join(', ') : 'network is null'}
            <br />
            Has direct network: {!!device.network ? 'YES' : 'NO'}
            <br />
            Has modules.network: {!!device.modules?.network ? 'YES' : 'NO'}
          </div>
        )}

        {/* Enhanced Network Interfaces - Secondary Display */}
        {(network as any)?.interfaces && (network as any).interfaces.length > 0 && (
          <>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-4">Network Interfaces</div>
            {(network as any).interfaces.map((iface: any, index: number) => (
              <div key={index} className="space-y-2 border-l-2 border-gray-200 pl-3">
                <StatusBadge
                  label={`${iface.name} (${iface.type})`}
                  status={iface.status}
                  type={iface.status === 'Connected' ? 'success' : 'warning'}
                />
                {iface.ipAddress && (
                  <Stat 
                    label="IP Address" 
                    value={iface.ipAddress} 
                    isMono 
                  />
                )}
                {iface.macAddress && (
                  <Stat 
                    label="MAC Address" 
                    value={iface.macAddress} 
                    isMono 
                  />
                )}
                {iface.speed && (
                  <Stat 
                    label="Speed" 
                    value={iface.speed} 
                  />
                )}
                {iface.ssid && (
                  <Stat 
                    label="SSID" 
                    value={iface.ssid} 
                  />
                )}
                {iface.signalStrength && (
                  <Stat 
                    label="Signal Strength" 
                    value={iface.signalStrength} 
                  />
                )}
              </div>
            ))}
            
            {/* Gateway and DNS for enhanced data */}
            {(network as any)?.gateway && (
              <Stat 
                label="Gateway" 
                value={(network as any).gateway} 
                isMono 
              />
            )}
            
            {(network as any)?.dns && (network as any).dns.length > 0 && (
              <Stat 
                label="DNS Servers" 
                value={(network as any).dns.join(', ')} 
                isMono 
              />
            )}
            
            {(network as any)?.externalIp && (
              <Stat 
                label="External IP" 
                value={(network as any).externalIp} 
                isMono 
              />
            )}
          </>
        )}

        {/* Legacy Network Data (when enhanced interfaces not available) */}
        {(!activeConnection?.connectionType && (!(network as any)?.interfaces || (network as any).interfaces.length === 0)) && (
          <>
            {/* Connection Status */}
            {network?.status !== undefined && (
              <StatusBadge
                label="Connection Status"
                status={formatConnectionStatus(network.status)}
                type={getConnectionStatusType(network.status)}
              />
            )}

            {/* Connection Type */}
            {network?.connectionType && (
              <Stat 
                label="Connection Type" 
                value={network.connectionType} 
              />
            )}

            {/* Network Identity */}
            {network?.hostname && (
              <Stat 
                label="Hostname" 
                value={network.hostname} 
                isMono 
              />
            )}

            {/* IP Address */}
            {(device.ipAddress || network?.ipv4ip) && (
              <Stat 
                label="IPv4 Address" 
                value={device.ipAddress || network?.ipv4ip || 'Unknown'} 
                isMono 
              />
            )}

            {/* MAC Address */}
            {device.macAddress && (
              <Stat 
                label="MAC Address" 
                value={device.macAddress} 
                isMono 
              />
            )}

            {/* WiFi Information */}
            {network?.ssid && network.ssid !== 'null' && (
              <>
                <Stat 
                  label="WiFi Network" 
                  value={network.ssid}
                />
                {network.signalStrength && network.signalStrength !== 'null' && (
                  <Stat 
                    label="Signal Strength" 
                    value={`${network.signalStrength} dBm`}
                  />
                )}
              </>
            )}

            {/* Network Configuration */}
            {network?.ipv4mask && (
              <Stat 
                label="Subnet Mask" 
                value={network.ipv4mask} 
                isMono 
              />
            )}

            {/* Gateway & DNS */}
            {network?.ipv4router && (
              <Stat 
                label="Gateway" 
                value={network.ipv4router} 
                isMono 
              />
            )}

            {network?.ipv4dns && (
              <Stat 
                label="DNS Server" 
                value={network.ipv4dns} 
                isMono 
              />
            )}

            {/* Advanced Network Info */}
            {network?.activemtu && (
              <Stat 
                label="MTU" 
                value={network.activemtu.toString()} 
              />
            )}

            {network?.externalip && (
              <Stat 
                label="External IP" 
                value={network.externalip} 
                isMono 
              />
            )}
          </>
        )}
      </div>
    </StatBlock>
  )
}

export default NetworkWidget

/**
 * Network Widget
 * Displays network configuration and connectivity information
 */

import React from 'react'
import { StatBlock, Stat, EmptyState, Icons, WidgetColors } from './shared'

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

export const NetworkWidget: React.FC<NetworkWidgetProps> = ({ device }) => {
  const { network } = device
  const hasNetworkInfo = device.ipAddress || device.macAddress || device.network

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
      {/* Basic Network Info */}
      {network?.hostname && (
        <Stat label="Hostname" value={network.hostname} isMono />
      )}
      
      {(device.ipAddress || device.ipAddressV4) && (
        <Stat label="IP Address" value={device.ipAddress || device.ipAddressV4} isMono />
      )}
      
      {device.ipAddressV6 && (
        <Stat label="IPv6 Address" value={device.ipAddressV6} isMono />
      )}
      
      {device.macAddress && (
        <Stat label="MAC Address" value={device.macAddress} isMono />
      )}

      {/* Connection Type and Details */}
      {network?.connectionType && (
        <Stat label="Connection Type" value={network.connectionType} />
      )}

      {/* WiFi Specific Info */}
      {network?.ssid && (
        <Stat 
          label="WiFi Network" 
          value={network.ssid} 
          sublabel={network.signalStrength ? `Signal: ${network.signalStrength}` : undefined}
        />
      )}

      {/* DNS and Gateway */}
      {network?.ipv4router && (
        <Stat label="Gateway" value={network.ipv4router} isMono />
      )}

      {network?.ipv4dns && (
        <Stat label="DNS Server" value={network.ipv4dns} isMono />
      )}

      {/* Advanced Network Info */}
      {network?.activemtu && (
        <Stat label="MTU" value={network.activemtu.toString()} />
      )}

      {network?.externalip && (
        <Stat label="External IP" value={network.externalip} isMono />
      )}
    </StatBlock>
  )
}

export default NetworkWidget


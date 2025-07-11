/**
 * Information Widget
 * Displays basic device information like name, serial number, asset tag, etc.
 */

import React from 'react'
import { StatBlock, Stat, Icons, WidgetColors } from './shared'

interface Device {
  id: string
  name: string
  assetTag?: string
  serialNumber?: string
  deviceId?: string
  model?: string
  lastSeen?: string
  status?: 'online' | 'offline' | 'warning' | 'error'
}

interface InformationWidgetProps {
  device: Device
}

export const InformationWidget: React.FC<InformationWidgetProps> = ({ device }) => {
  return (
    <StatBlock 
      title="Basic Information" 
      subtitle="Device identity and details"
      icon={Icons.information}
      iconColor={WidgetColors.blue}
    >
      <Stat label="Device Name" value={device.name} />
      {device.assetTag && (
        <Stat label="Asset Tag" value={device.assetTag} />
      )}
      <Stat label="Serial Number" value={device.serialNumber} isMono />
      {device.deviceId && device.deviceId !== device.id && (
        <Stat label="Hardware UUID" value={device.deviceId} isMono />
      )}
    </StatBlock>
  )
}

export default InformationWidget

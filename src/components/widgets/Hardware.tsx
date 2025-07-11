/**
 * Hardware Widget
 * Displays system hardware specifications
 */

import React from 'react'
import { StatBlock, Stat, EmptyState, Icons, WidgetColors } from './shared'

interface Device {
  id: string
  name: string
  model?: string
  processor?: string
  processorSpeed?: string
  cores?: number
  memory?: string
  availableRAM?: string
  memorySlots?: string
  storage?: string
  availableStorage?: string
  storageType?: string
  graphics?: string
  vram?: string
  resolution?: string
  architecture?: string
  manufacturer?: string
}

interface HardwareWidgetProps {
  device: Device
}

export const HardwareWidget: React.FC<HardwareWidgetProps> = ({ device }) => {
  const hasHardwareInfo = device.processor || device.memory || device.storage || device.graphics

  if (!hasHardwareInfo) {
    return (
      <StatBlock 
        title="Hardware" 
        subtitle="Device specs"
        icon={Icons.hardware}
        iconColor={WidgetColors.orange}
      >
        <EmptyState message="Hardware information not available" />
      </StatBlock>
    )
  }

  return (
    <StatBlock 
      title="Hardware" 
      subtitle="Device specs"
      icon={Icons.hardware}
      iconColor={WidgetColors.orange}
    >
      {device.model && (
        <Stat label="Model" value={device.model} />
      )}
      {device.processor && (
        <Stat 
          label="Processor" 
          value={device.processor} 
          sublabel={device.processorSpeed}
        />
      )}
      {device.cores && (
        <Stat label="CPU Cores" value={`${device.cores} cores`} />
      )}
      {device.memory && (
        <Stat 
          label="Memory" 
          value={device.memory}
          sublabel={device.availableRAM ? `Available: ${device.availableRAM}` : undefined}
        />
      )}
      {device.storage && (
        <Stat 
          label="Storage" 
          value={device.storage}
          sublabel={device.storageType ? device.storageType : (device.availableStorage ? `Available: ${device.availableStorage}` : undefined)}
        />
      )}
      {device.graphics && (
        <Stat 
          label="Graphics" 
          value={device.graphics}
          sublabel={device.vram ? `${device.vram} VRAM` : undefined}
        />
      )}
      {device.resolution && (
        <Stat label="Display Resolution" value={device.resolution} />
      )}
      {device.architecture && (
        <Stat label="Architecture" value={device.architecture} />
      )}
    </StatBlock>
  )
}

export default HardwareWidget

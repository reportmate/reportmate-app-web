/**
 * Hardware Widget
 * Displays comprehensive hardware information for devices
 */

import React from 'react'
import { StatBlock, Stat, EmptyState, Icons, WidgetColors } from './shared'

interface Device {
  id: string
  name: string
  model?: string
  manufacturer?: string
  processor?: string | any
  cores?: number
  memory?: string
  storage?: string
  availability?: string
  graphics?: string
  vram?: string
  batteryLevel?: number
  batteryHealth?: string
  isCharging?: boolean
  architecture?: string
  // Modular hardware data from modules.hardware
  modules?: {
    hardware?: {
      model?: string
      manufacturer?: string
      processor?: {
        name?: string
        cores?: number
        socket?: string
        maxSpeed?: number
        baseSpeed?: number
        architecture?: string
        manufacturer?: string
        logicalProcessors?: number
      }
      memory?: {
        totalPhysical?: number
        availablePhysical?: number
        totalFormatted?: string
      }
      storage?: Array<{
        name?: string
        type?: string
        capacity?: number
        freeSpace?: number
        capacityFormatted?: string
        freeFormatted?: string
        health?: string
      }>
      graphics?: {
        name?: string
        manufacturer?: string
        memory?: number
        memorySize?: number
        memoryFormatted?: string
        driverVersion?: string
      }
      battery?: {
        chargePercent?: number
        health?: string
        isCharging?: boolean
        cycleCount?: number
      }
    }
  }
  // Legacy hardware properties (fallback)
  hardware?: any
}

interface HardwareWidgetProps {
  device: Device
}

// Helper function to safely render any value as a string
const safeString = (value: any): string => {
  if (value === null || value === undefined) return 'Unknown'
  if (typeof value === 'object') {
    // If it's an object, try to extract meaningful properties
    if (value.name) return String(value.name)
    if (value.value) return String(value.value)
    // Otherwise, just return a placeholder instead of trying to render the object
    return 'Complex Value'
  }
  return String(value)
}

// Helper function specifically for processor objects
const safeProcessorString = (processor: any): string => {
  if (!processor) return 'Unknown'
  if (typeof processor === 'string') return processor
  if (typeof processor === 'object') {
    // Try to extract the processor name from various possible properties
    const name = processor.name || processor.displayName || processor.model || processor.brand
    if (name) return String(name)
    
    // If no name property, try to construct a meaningful string from available data
    if (processor.manufacturer && processor.cores) {
      return `${processor.manufacturer} ${processor.cores}-core processor`
    }
    
    return 'Unknown Processor'
  }
  return String(processor)
}

export const HardwareWidget: React.FC<HardwareWidgetProps> = ({ device }) => {
  // Get hardware data from modules first, then fallback to device properties
  const hardwareModule = device.modules?.hardware
  const legacyHardware = device.hardware || {}
  
  console.log('[HardwareWidget] Debug data access:', {
    deviceId: device.id,
    hasModules: !!device.modules,
    hasHardwareModule: !!device.modules?.hardware,
    hasLegacyHardware: !!device.hardware,
    hardwareModuleKeys: hardwareModule ? Object.keys(hardwareModule) : [],
    legacyHardwareKeys: Object.keys(legacyHardware)
  })

  // Build unified hardware info preferring module data over legacy
  const hardwareInfo = {
    model: hardwareModule?.model || device.model || 'Unknown',
    manufacturer: hardwareModule?.manufacturer || device.manufacturer || 'Unknown',
    processor: safeProcessorString(
      hardwareModule?.processor || 
      (typeof legacyHardware.processor === 'object' ? legacyHardware.processor?.name : legacyHardware.processor) || 
      device.processor || 
      'Unknown'
    ),
    cores: hardwareModule?.processor?.cores || device.cores,
    memory: hardwareModule?.memory?.totalFormatted || device.memory || 'Unknown',
    storage: hardwareModule?.storage?.[0]?.capacityFormatted || device.storage || 'Unknown',
    graphics: hardwareModule?.graphics?.name || device.graphics || 'Unknown',
    vram: hardwareModule?.graphics?.memoryFormatted || device.vram,
    architecture: hardwareModule?.processor?.architecture || device.architecture || 'Unknown',
    batteryLevel: hardwareModule?.battery?.chargePercent || device.batteryLevel,
    batteryHealth: hardwareModule?.battery?.health || device.batteryHealth,
    isCharging: hardwareModule?.battery?.isCharging ?? device.isCharging
  }

  // Check if we have any hardware information
  const hasHardwareInfo = Object.values(hardwareInfo).some(value => 
    value !== undefined && value !== null && value !== 'Unknown' && value !== ''
  )

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
      <div className="space-y-4">
        {/* Primary Hardware Info */}
        <div className="space-y-4">
          <Stat 
            label="Model" 
            value={hardwareInfo.model} 
          />
          
          <Stat 
            label="Architecture" 
            value={hardwareInfo.architecture} 
          />
          
          <Stat 
            label="Processor" 
            value={hardwareInfo.processor}
            // sublabel={hardwareInfo.cores ? `${hardwareInfo.cores} cores` : undefined}
          />
          
          <Stat 
            label="Graphics" 
            value={hardwareInfo.graphics}
            sublabel={hardwareInfo.vram ? `${hardwareInfo.vram} VRAM` : undefined}
          />
          
          <Stat 
            label="Memory" 
            value={hardwareInfo.memory}
          />

          <Stat 
            label="Storage" 
            value={hardwareInfo.storage}
          />
        </div>
      </div>
    </StatBlock>
  )
}

export default HardwareWidget

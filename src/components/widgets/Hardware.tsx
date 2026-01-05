/**
 * Hardware Widget
 * Displays comprehensive hardware information for devices
 */

import React from 'react'
import { StatBlock, Stat, EmptyState, Icons, WidgetColors } from './shared'
import { normalizeKeys } from '../../lib/utils/powershell-parser'

interface ProcessorInfo {
  name?: string;
  speed?: string;
  cores?: number;
  architecture?: string;
}

interface Device {
  id: string
  name: string
  deviceId?: string
  model?: string
  manufacturer?: string
  processor?: string | ProcessorInfo
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
    inventory?: {
      deviceName?: string
      usage?: string
      catalog?: string
      department?: string
      location?: string
      assetTag?: string
      serialNumber?: string
      uuid?: string
    }
  }
  // Legacy hardware properties (fallback)
  hardware?: any
}

interface HardwareWidgetProps {
  device: Device
}

// Helper function specifically for processor objects
const safeProcessorString = (processor: string | ProcessorInfo | unknown): string => {
  if (!processor) return 'Unknown'
  if (typeof processor === 'string') return processor
  if (typeof processor === 'object') {
    const proc = processor as Record<string, unknown>;
    // Try to extract the processor name from various possible properties
    const name = proc.name || proc.displayName || proc.model || proc.brand
    if (name) return String(name)
    
    // If no name property, try to construct a meaningful string from available data
    if (proc.manufacturer && proc.cores) {
      return `${proc.manufacturer} ${proc.cores}-core processor`
    }
    
    return 'Unknown Processor'
  }
  return String(processor)
}

export const HardwareWidget: React.FC<HardwareWidgetProps> = ({ device }) => {
  // Normalize hardware data to camelCase (API returns snake_case)
  const rawHardware = device.modules?.hardware
  const hardwareModule = rawHardware ? normalizeKeys(rawHardware) as any : null
  const legacyHardware = hardwareModule || {}
  
  console.log('[HardwareWidget] Debug data access:', {
    deviceId: device.id,
    hasModules: !!device.modules,
    hasHardwareModule: !!device.modules?.hardware,
    normalizedHardware: hardwareModule,
    hardwareModuleKeys: hardwareModule ? Object.keys(hardwareModule) : [],
  })

  // Helper function to format bytes to human readable format
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Helper function to safely get a numeric value
  const safeNumber = (value: unknown): number => {
    if (value === null || value === undefined) return 0
    if (typeof value === 'number') return value
    if (typeof value === 'string') {
      const parsed = parseFloat(value)
      return isNaN(parsed) ? 0 : parsed
    }
    return 0
  }

  // Build unified hardware info preferring module data over legacy
  const hardwareInfo = {
    model: hardwareModule?.model || 'Unknown',
    manufacturer: hardwareModule?.manufacturer || 'Unknown',
    processor: safeProcessorString(
      hardwareModule?.processor || 
      (typeof legacyHardware.processor === 'object' ? legacyHardware.processor?.name : legacyHardware.processor) || 
      'Unknown'
    ),
    cores: hardwareModule?.processor?.cores,
    memory: hardwareModule?.memory?.totalPhysical ? formatBytes(safeNumber(hardwareModule.memory.totalPhysical)) : 'Unknown',
    storage: hardwareModule?.storage?.[0]?.capacity && hardwareModule?.storage?.[0]?.freeSpace 
      ? `${formatBytes(safeNumber(hardwareModule.storage[0].capacity))} ${formatBytes(safeNumber(hardwareModule.storage[0].freeSpace))} free`
      : hardwareModule?.storage?.[0]?.capacity 
        ? formatBytes(safeNumber(hardwareModule.storage[0].capacity))
        : 'Unknown',
    graphics: hardwareModule?.graphics?.name && hardwareModule?.graphics?.memorySize
      ? `${hardwareModule.graphics.name} ${hardwareModule.graphics.memorySize} GB VRAM`
      : hardwareModule?.graphics?.name || 'Unknown',
    vram: hardwareModule?.graphics?.memorySize ? `${hardwareModule.graphics.memorySize} GB` : undefined,
    architecture: hardwareModule?.processor?.architecture || 'Unknown',
    batteryLevel: hardwareModule?.battery?.chargePercent,
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
      <div className="space-y-5">
        {/* Primary Hardware Info */}
        <div className="space-y-5">
          <Stat 
            label="Model" 
            value={hardwareInfo.model} 
          />
          
          {/* <Stat 
            label="Architecture" 
            value={hardwareInfo.architecture} 
          /> */}
          
          <Stat 
            label="Processor" 
            value={hardwareInfo.processor}
            // sublabel={hardwareInfo.cores ? `${hardwareInfo.cores} cores` : undefined}
          />
          
          <Stat 
            label="Graphics" 
            value={hardwareInfo.graphics}
          />
          
          {/* Memory and Storage - 30/70 split */}
          <div className="grid grid-cols-10 gap-4">
            <div className="col-span-3">
              <Stat 
                label="Memory" 
                value={hardwareInfo.memory}
              />
            </div>
            <div className="col-span-7">
              <Stat 
                label="Storage" 
                value={hardwareInfo.storage}
              />
            </div>
          </div>
        </div>
      </div>
    </StatBlock>
  )
}

export default HardwareWidget

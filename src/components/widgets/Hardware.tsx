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
            label="Manufacturer" 
            value={hardwareInfo.manufacturer} 
          />
          
          <Stat 
            label="Processor" 
            value={hardwareInfo.processor}
            sublabel={hardwareInfo.cores ? `${hardwareInfo.cores} cores` : undefined}
          />
          
          <Stat 
            label="Architecture" 
            value={hardwareInfo.architecture} 
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
        </div>

        {/* Battery Info (if available) */}
        {(hardwareInfo.batteryLevel !== undefined || hardwareInfo.batteryHealth) && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="space-y-2">
              {hardwareInfo.batteryLevel !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Battery</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {hardwareInfo.batteryLevel}%
                    </span>
                    {hardwareInfo.isCharging && (
                      <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
              )}
              {hardwareInfo.batteryHealth && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Health</span>
                  <span className="text-sm text-gray-900 dark:text-white">
                    {hardwareInfo.batteryHealth}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </StatBlock>
  )
}

export default HardwareWidget

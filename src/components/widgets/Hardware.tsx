/**
 * Hardware Widget
 * Displays comprehensive hardware information for devices
 * Uses same data extraction patterns as HardwareTab.tsx
 */

import React from 'react'
import { StatBlock, Stat, EmptyState, Icons, WidgetColors } from './shared'
import { normalizeKeys } from '../../lib/utils/powershell-parser'

interface Device {
  id: string
  name: string
  platform?: string
  modules?: {
    hardware?: any
    system?: any
  }
  [key: string]: unknown
}

interface HardwareWidgetProps {
  device: Device
}

// Helper function to safely render any value as a string - matches HardwareTab.tsx
const safeString = (value: unknown): string => {
  if (value === null || value === undefined) return 'Unknown'
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (obj.name) return String(obj.name)
    if (obj.value) return String(obj.value)
    return 'Unknown'
  }
  return String(value)
}

// Helper function to safely extract processor name - matches HardwareTab.tsx
const safeProcessorName = (processor: unknown): string => {
  if (!processor) return 'Unknown'
  if (typeof processor === 'string') return processor
  if (typeof processor === 'object') {
    const proc = processor as Record<string, unknown>
    return String(proc.name || proc.value || 'Unknown Processor')
  }
  return String(processor)
}

// Helper function to safely get a numeric value - matches HardwareTab.tsx
const safeNumber = (value: unknown): number => {
  if (value === null || value === undefined) return 0
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = parseFloat(value)
    return isNaN(parsed) ? 0 : parsed
  }
  return 0
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export const HardwareWidget: React.FC<HardwareWidgetProps> = ({ device }) => {
  // Normalize snake_case to camelCase for all hardware data - same as HardwareTab
  const rawHardware = device?.modules?.hardware || {}
  const hardwareData = normalizeKeys(rawHardware) as any
  
  if (!hardwareData || Object.keys(hardwareData).length === 0) {
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

  // Detect platform
  const operatingSystem = device?.modules?.system?.operatingSystem || device?.modules?.system?.operating_system
  const platform = device?.platform?.toLowerCase() || 
                  operatingSystem?.platform?.toLowerCase() ||
                  operatingSystem?.name?.toLowerCase() ||
                  ''
  const isMac = platform.includes('mac') || platform.includes('darwin')
  
  // === Data Extraction - EXACTLY matching HardwareTab.tsx patterns ===
  
  // Model - from hardwareData.model (HardwareTab shows this in System Identity section)
  const model = safeString(hardwareData.model)
  
  // Chip name for Mac (e.g., "M4 Pro", "M3 Max")
  const chipName = safeString(hardwareData.processor?.chip || hardwareData.processor?.name || hardwareData.processor)
  
  // Identifier (hardware serial number)
  const identifier = safeString(hardwareData.identifier || hardwareData.serialNumber || hardwareData.serial_number)
  
  // Processor - HardwareTab uses safeProcessorName(hardwareData.processor)
  const processorName = safeProcessorName(hardwareData.processor)
  
  // CPU cores - support both logical_cores (Mac) and logicalProcessors (Windows)
  const cpuCores = safeNumber(hardwareData.processor?.cores) || 
                   safeNumber(hardwareData.processor?.cpu_cores) ||
                   safeNumber(hardwareData.processor?.logical_cores) || 
                   safeNumber(hardwareData.processor?.logicalProcessors)
  
  // Graphics - HardwareTab uses safeString(hardwareData.graphics?.name)
  const graphicsName = safeString(hardwareData.graphics?.name)
  const gpuCores = safeNumber(hardwareData.graphics?.cores) || safeNumber(hardwareData.graphics?.gpu_cores)
  
  // Unified Memory Detection - Must be AFTER cpuCores, gpuCores, and chipName are defined
  // Apple Silicon or if CPU name matches GPU name (common in SoCs)
  const isUnifiedMemory = (cpuCores > 0 && gpuCores > 0 && cpuCores + gpuCores > 0) && 
                          (chipName.includes('M1') || chipName.includes('M2') || chipName.includes('M3') || chipName.includes('M4'))
  
  // NPU cores for Mac Apple Silicon
  const npuCores = safeNumber(hardwareData.processor?.npu_cores) || safeNumber(hardwareData.npu?.cores)
  
  // Memory - support physicalMemory (normalized from physical_memory on Mac) and totalPhysical (Windows)
  const totalMemory = safeNumber(hardwareData.memory?.physicalMemory) || 
                      safeNumber(hardwareData.memory?.physical_memory) ||
                      safeNumber(hardwareData.memory?.totalPhysical) || 0
  const memoryFormatted = totalMemory > 0 ? formatBytes(totalMemory) : 'Unknown'
  
  // Storage - get internal drives only - use capacity (Mac now sends capacity, not size)
  const allStorageDevices = Array.isArray(hardwareData.storage) ? hardwareData.storage : []
  const storageDevices = allStorageDevices.filter((drive: any) => {
    const capacity = drive.capacity
    const freeSpace = drive.freeSpace ?? drive.free_space
    return (capacity && capacity > 0) && (freeSpace && freeSpace > 0)
  })
  // Only count INTERNAL drives
  const internalDrives = storageDevices.filter((drive: any) => {
    const isInternal = drive.is_internal ?? drive.isInternal
    return isInternal === 1 || isInternal === true
  })
  
  const totalStorage = internalDrives.reduce((total: number, drive: any) => {
    const capacity = drive.capacity ?? 0
    return total + capacity
  }, 0) || 0
  
  const freeStorage = internalDrives.reduce((total: number, drive: any) => {
    const freeSpace = drive.freeSpace ?? drive.free_space ?? 0
    return total + freeSpace
  }, 0) || 0

  // Check if we have any hardware information
  const hasHardwareInfo = model !== 'Unknown' || processorName !== 'Unknown' || chipName !== 'Unknown' || totalMemory > 0

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
      {isMac ? (
        /* Mac-specific layout: Model/Identifier at top, Chip, 2-column grid, Storage at bottom */
        <div className="space-y-3">
          {/* Model and Identifier at very top */}
          {model !== 'Unknown' && (
            <Stat 
              label="Model" 
              value={model} 
            />
          )}
          {identifier !== 'Unknown' && (
            <Stat 
              label="Identifier" 
              value={identifier}
              isMono
              showCopyButton
            />
          )}
          
          {isUnifiedMemory ? (
            /* Unified Memory Architecture: Dashed border box around CPU/GPU/Memory/NPU */
            <>
              {/* Chip name */}
              <Stat 
                label="Chip" 
                value={chipName !== 'Unknown' ? chipName : 'Unknown'} 
              />
              
              {/* Dashed border container - left padding for box, reduced top margin to attach to title */}
              <div className="rounded-lg border border-gray-300 dark:border-gray-600 border-dashed mt-1 mb-3 ml-[-12px] py-2 pl-3 pr-2">
                <div className="grid grid-cols-2 gap-2">
                  {/* LEFT COLUMN */}
                  <div className="space-y-2">
                    <Stat 
                      label="CPU" 
                      value={cpuCores > 0 ? `${cpuCores} cores` : 'Unknown'}
                    />
                    <Stat 
                      label="GPU" 
                      value={gpuCores > 0 ? `${gpuCores} cores` : graphicsName}
                    />
                  </div>
                  
                  {/* RIGHT COLUMN */}
                  <div className="space-y-2">
                    <Stat 
                      label="Memory" 
                      value={memoryFormatted}
                    />
                    {npuCores > 0 && (
                      <Stat 
                        label="NPU" 
                        value={`${npuCores} cores`}
                      />
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Non-unified memory: Standard layout with Chip label */
            <>
              {/* Chip name (e.g., M4 Pro) */}
              <Stat 
                label="Chip" 
                value={chipName !== 'Unknown' ? chipName : 'Unknown'} 
              />
              
              {/* Two-column grid: CPU/GPU left, Memory/NPU right */}
              <div className="grid grid-cols-2 gap-4">
                {/* LEFT COLUMN */}
                <div className="space-y-2">
                  <Stat 
                    label="CPU" 
                    value={cpuCores > 0 ? `${cpuCores} cores` : 'Unknown'}
                  />
                  <Stat 
                    label="GPU" 
                    value={gpuCores > 0 ? `${gpuCores} cores` : graphicsName}
                  />
                </div>
                
                {/* RIGHT COLUMN */}
                <div className="space-y-2">
                  <Stat 
                    label="Memory" 
                    value={memoryFormatted}
                  />
                  {npuCores > 0 && (
                    <Stat 
                      label="NPU" 
                      value={`${npuCores} cores`}
                    />
                  )}
                </div>
              </div>
            </>
          )}
          
          {/* Storage at bottom with total capacity and free */}
          <Stat 
            label="Storage" 
            value={totalStorage > 0 ? `${formatBytes(totalStorage)} (${formatBytes(freeStorage)} free)` : 'Unknown'}
          />
        </div>
      ) : (
        /* Windows/Linux layout: Standard vertical list */
        <div className="space-y-3">
          <Stat 
            label="Model" 
            value={model} 
          />
          
          <Stat 
            label="Processor" 
            value={cpuCores > 0 ? `${processorName} (${cpuCores} cores)` : processorName}
          />
          
          <Stat 
            label="Graphics" 
            value={gpuCores > 0 ? `${graphicsName} (${gpuCores} cores)` : graphicsName}
          />
          
          <Stat 
            label="Memory" 
            value={memoryFormatted}
          />
          
          <Stat 
            label="Storage" 
            value={totalStorage > 0 ? `${formatBytes(totalStorage)} (${formatBytes(freeStorage)} free)` : 'Unknown'}
          />
        </div>
      )}
    </StatBlock>
  )
}

export default HardwareWidget

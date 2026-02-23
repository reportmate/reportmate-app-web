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

  // Detect platform - check OS fields first, then hardware model/manufacturer as fallback
  const operatingSystem = device?.modules?.system?.operatingSystem || device?.modules?.system?.operating_system
  const platform = device?.platform?.toLowerCase() || 
                  operatingSystem?.platform?.toLowerCase() ||
                  operatingSystem?.name?.toLowerCase() ||
                  ''
  const modelName = (hardwareData.system?.modelName || hardwareData.system?.model_name || hardwareData.model || '').toLowerCase()
  const hwVendor = (hardwareData.system?.hardwareVendor || hardwareData.system?.hardware_vendor || hardwareData.manufacturer || '').toLowerCase()
  const isMac = platform.includes('mac') || platform.includes('darwin')
    || modelName.includes('mac') || modelName.includes('imac')
    || hwVendor.includes('apple')
  
  // === Data Extraction - EXACTLY matching HardwareTab.tsx patterns ===
  
  // Manufacturer - from hardwareData.manufacturer
  const manufacturer = safeString(hardwareData.manufacturer)
  
  // Model - from hardwareData.model (HardwareTab shows this in System Identity section)
  const model = safeString(hardwareData.model)
  
  // Model Identifier - Mac specific identifier (e.g., "Mac16,11")
  const _modelIdentifier = safeString(hardwareData.modelIdentifier || hardwareData.model_identifier)
  
  // Chip name for Mac (e.g., "M4 Pro", "M3 Max")
  const chipName = safeString(hardwareData.processor?.chip || hardwareData.processor?.name || hardwareData.processor)
  
  // Processor - HardwareTab uses safeProcessorName(hardwareData.processor)
  const processorName = safeProcessorName(hardwareData.processor)
  
  // CPU cores - support both logical_cores (Mac) and logicalProcessors (Windows)
  const cpuCores = safeNumber(hardwareData.processor?.cores) || 
                   safeNumber(hardwareData.processor?.cpu_cores) ||
                   safeNumber(hardwareData.processor?.logical_cores) || 
                   safeNumber(hardwareData.processor?.logicalProcessors)
  
  // Graphics - HardwareTab uses safeString(hardwareData.graphics?.name)
  const graphicsName = safeString(hardwareData.graphics?.name)
  const graphicsManufacturer = safeString(hardwareData.graphics?.manufacturer)
  const gpuCores = safeNumber(hardwareData.graphics?.cores) || safeNumber(hardwareData.graphics?.gpu_cores)
  
  // Clean GPU name by removing manufacturer prefix (e.g., "NVIDIA GeForce RTX 3080" -> "GeForce RTX 3080")
  const cleanGraphicsName = (() => {
    let name = graphicsName
    const mfg = graphicsManufacturer.toUpperCase()
    if (mfg && name.toUpperCase().startsWith(mfg)) {
      name = name.slice(mfg.length).trim()
    }
    // Also handle common variations
    if (name.toUpperCase().startsWith('NVIDIA ')) name = name.slice(7).trim()
    if (name.toUpperCase().startsWith('AMD ')) name = name.slice(4).trim()
    if (name.toUpperCase().startsWith('INTEL ')) name = name.slice(6).trim()
    return name || graphicsName
  })()
  
  // Unified Memory Detection - Must be AFTER cpuCores, gpuCores, and chipName are defined
  // Apple Silicon or if CPU name matches GPU name (common in SoCs)
  const isUnifiedMemory = (cpuCores > 0 && gpuCores > 0 && cpuCores + gpuCores > 0) && 
                          (chipName.includes('M1') || chipName.includes('M2') || chipName.includes('M3') || chipName.includes('M4'))
  
  // NPU cores and performance for Mac Apple Silicon
  const npuCores = safeNumber(hardwareData.processor?.npu_cores) || safeNumber(hardwareData.npu?.cores)
  const npuTops = safeString(hardwareData.npu?.performance_tops || hardwareData.npu?.performanceTops)
  
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
        <div className="space-y-3">
          {/* Mac-specific layout: Model full-width, Chip, 2-column grid, Storage at bottom */}
          {model !== 'Unknown' && (
            <Stat label="Model" value={model} />
          )}
          
          {isUnifiedMemory ? (
            <>
              {/* Unified Memory Architecture: No border, just clean grid */}
              {/* Chip name */}
              <Stat 
                label="Chip" 
                value={chipName !== 'Unknown' ? chipName : 'Unknown'} 
              />
              
              {/* Two-column grid: CPU/GPU left, RAM/NPU right */}
              <div className="grid grid-cols-2 gap-2">
                {/* LEFT COLUMN */}
                <div className="space-y-2">
                  <Stat 
                    label="CPU" 
                    value={cpuCores > 0 ? `${cpuCores} cores` : 'Unknown'}
                  />
                  <Stat 
                    label="GPU" 
                    value={gpuCores > 0 ? `${gpuCores} cores` : cleanGraphicsName}
                  />
                </div>
                
                {/* RIGHT COLUMN */}
                <div className="space-y-2">
                  <Stat 
                    label="RAM" 
                    value={memoryFormatted}
                  />
                  {npuCores > 0 && (
                    <Stat 
                      label="NPU" 
                      value={npuTops !== 'Unknown' ? `${npuTops} TOPS` : `${npuCores} cores`}
                    />
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Non-unified memory: Standard layout with Chip label */}
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
                    value={gpuCores > 0 ? `${gpuCores} cores` : cleanGraphicsName}
                  />
                </div>
                
                {/* RIGHT COLUMN */}
                <div className="space-y-2">
                  <Stat 
                    label="RAM" 
                    value={memoryFormatted}
                  />
                  {npuCores > 0 && (
                    <Stat 
                      label="NPU" 
                      value={npuTops !== 'Unknown' ? `${npuTops} TOPS` : `${npuCores} cores`}
                    />
                  )}
                </div>
              </div>
            </>
          )}
          
          {/* Storage at bottom with total capacity and free */}
          <Stat 
            label="Storage" 
            value={totalStorage > 0 ? `${formatBytes(totalStorage)} • ${formatBytes(freeStorage)} free` : 'Unknown'}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {/* Windows: Custom width grid for Manufacturer (30%) / Model (70%) */}
          <div className="grid grid-cols-10 gap-3">
            {manufacturer !== 'Unknown' && (
              <div className="col-span-3">
                <Stat 
                  label="Manufacturer" 
                  value={manufacturer} 
                />
              </div>
            )}
            <div className="col-span-7">
              <Stat 
                label="Model" 
                value={model} 
              />
            </div>
          </div>
          
          <Stat 
            label="Processor" 
            value={cpuCores > 0 ? `${processorName} (${cpuCores} cores)` : processorName}
          />
          
          <Stat 
            label="Graphics" 
            value={gpuCores > 0 ? `${cleanGraphicsName} (${gpuCores} cores)` : cleanGraphicsName}
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

/**
 * Hardware Tab Component
 * Displays device hardware information and specifications
 */

import React from 'react'
import { StorageVisualization } from '../storage'
import { CopyButton } from '../ui/CopyButton'

interface HardwareData {
  model?: unknown;
  manufacturer?: unknown;
  formFactor?: 'desktop' | 'laptop' | string;  // Mac: desktop/laptop based on model
  memory?: {
    totalPhysical?: unknown;
    availablePhysical?: unknown;
    type?: string;  // Mac: LPDDR5, etc.
    manufacturer?: string;  // Mac: Hynix, Samsung, etc.
    modules?: Array<{
      type?: unknown;
      manufacturer?: unknown;
      capacity?: unknown;
      speed?: unknown;
      location?: unknown;
    }>;
  };
  processor?: {
    name?: unknown;
    architecture?: unknown;
    cores?: unknown;
    logicalProcessors?: unknown;
    maxSpeed?: unknown;
    performanceCores?: number;  // Mac: P-cores count
    efficiencyCores?: number;  // Mac: E-cores count
  };
  battery?: {
    cycleCount?: unknown;
    chargePercent?: unknown;
    health?: unknown;
    isCharging?: unknown;
    estimatedRuntime?: unknown;
    items?: unknown[];  // Mac: empty array for desktop
  };
  graphics?: {
    name?: unknown;
    manufacturer?: unknown;
    memorySize?: unknown;
    cores?: number;  // Mac: GPU core count
    metalSupport?: string;  // Mac: Metal version support
    bus?: string;  // Mac: Builtin, PCIe, etc.
    deviceType?: string;  // Mac: GPU, Display, etc.
  };
  npu?: {
    name?: unknown;
    manufacturer?: unknown;
    computeUnits?: unknown;
    compute_units?: unknown;
    cores?: number;  // Mac: Neural Engine cores
    performance_tops?: string;  // Mac: TOPS rating
  };
  displays?: Array<{
    name?: string;
    serialNumber?: string;
    resolution?: string;
    scaledResolution?: string;
    displayType?: string;
    firmwareVersion?: string;
    isMainDisplay?: boolean | number;
    online?: boolean | number;
    mirror?: boolean | number;
    ambientBrightnessEnabled?: boolean | number;
    type?: 'internal' | 'external';
    connectionType?: string;
  }>;
  wireless?: {
    name?: unknown;
    manufacturer?: unknown;
    macAddress?: unknown;
    driverVersion?: unknown;
    driverDate?: unknown;
    status?: unknown;
    protocol?: unknown;
    isAvailable?: unknown;
  };
  bluetooth?: {
    name?: unknown;
    manufacturer?: unknown;
    macAddress?: unknown;
    driverVersion?: unknown;
    driverDate?: unknown;
    status?: unknown;
    bluetoothVersion?: unknown;
    isAvailable?: unknown;
  };
  [key: string]: unknown;
}

interface DeviceWithHardware {
  deviceId?: string;
  modules?: {
    hardware?: HardwareData;
    inventory?: {
      uuid?: string;
      [key: string]: unknown;
    };
  };
  hardware?: HardwareData;
  [key: string]: unknown;
}

interface HardwareTabProps {
  device: DeviceWithHardware
  data?: HardwareData
}

// Helper function to safely render any value as a string
const safeString = (value: unknown): string => {
  if (value === null || value === undefined) return 'Unknown'
  if (typeof value === 'object') {
    // If it's an object, try to extract meaningful properties
    const obj = value as Record<string, unknown>
    if (obj.name) return String(obj.name)
    if (obj.value) return String(obj.value)
    // Otherwise, just return a placeholder
    return 'Complex Value'
  }
  return String(value)
}

// Helper function to safely extract processor name specifically
const safeProcessorName = (processor: unknown): string => {
  if (!processor) return 'Unknown'
  if (typeof processor === 'string') return processor
  if (typeof processor === 'object') {
    const proc = processor as Record<string, unknown>
    return String(proc.name || proc.value || 'Unknown Processor')
  }
  return String(processor)
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

// Helper function to format battery runtime
const formatRuntime = (runtime: string): string => {
  if (!runtime) return 'Unknown'
  
  // Handle Windows TimeSpan format (HH:MM:SS.FFFFFFF)
  const match = runtime.match(/^(\d{1,2}):(\d{2}):(\d{2})/)
  if (match) {
    const [, hours, minutes, seconds] = match
    const h = parseInt(hours, 10)
    const m = parseInt(minutes, 10)
    const s = parseInt(seconds, 10)
    
    if (h > 0) {
      return `${h}h ${m}m`
    } else if (m > 0) {
      return `${m}m ${s}s`
    } else {
      return `${s}s`
    }
  }
  
  return runtime
}

export const HardwareTab: React.FC<HardwareTabProps> = ({ device, data }) => {
  // Extract hardware data from the unified structure - check modular structure first
  // FIXED: Ensure we're correctly accessing the hardware module from the new structure
  const hardwareData = device?.modules?.hardware || device?.hardware || data || {}
  
  if (!hardwareData || Object.keys(hardwareData).length === 0) {
    return (
      <div className="space-y-6">
        {/* Header with Icon */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Hardware Overview</h1>
              <p className="text-base text-gray-600 dark:text-gray-400">System hardware specifications and components</p>
            </div>
          </div>
        </div>
        
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 002 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Hardware Information</h3>
          <p className="text-gray-600 dark:text-gray-400">Hardware data is not available for this device.</p>
        </div>
      </div>
    )
  }

  // Hardware stats for overview cards - filter out invalid storage devices
  const allStorageDevices = Array.isArray(hardwareData.storage) ? hardwareData.storage : []
  // Filter out devices with 0 capacity or 0 free space as they don't have proper data collection
  const storageDevices = allStorageDevices.filter((drive: any) => 
    (drive.capacity && drive.capacity > 0) && (drive.freeSpace && drive.freeSpace > 0)
  )
  // Filter to internal drives only for storage overview (exclude external/backup drives)
  const internalDrives = storageDevices.filter((drive: any) => drive.isInternal !== false)
  const totalStorage = internalDrives.reduce((total: number, drive: any) => total + (drive.capacity || 0), 0) || 0
  const freeStorage = internalDrives.reduce((total: number, drive: any) => total + (drive.freeSpace || 0), 0) || 0
  const totalMemory = safeNumber(hardwareData.memory?.totalPhysical) || 0
  const availableMemory = safeNumber(hardwareData.memory?.availablePhysical) || 0
  const usedMemory = totalMemory - availableMemory
  const memoryUsagePercent = totalMemory > 0 ? Math.round((usedMemory / totalMemory) * 100) : 0
  const processorArchitecture = safeString(hardwareData.processor?.architecture)
  const graphicsName = safeString(hardwareData.graphics?.name)
  const graphicsManufacturer = safeString(hardwareData.graphics?.manufacturer)
  const graphicsMemorySize = safeNumber(hardwareData.graphics?.memorySize)
  const npuName = safeString(hardwareData.npu?.name)
  const npuManufacturer = safeString(hardwareData.npu?.manufacturer)
  const npuComputeUnits = safeNumber(hardwareData.npu?.computeUnits) || safeNumber(hardwareData.npu?.compute_units)
  const memoryModule = hardwareData.memory?.modules?.[0]
  const memoryModuleType = safeString(memoryModule?.type)
  const memoryModuleManufacturer = safeString(memoryModule?.manufacturer)
  // Mac-specific: Memory type and manufacturer can be at top level (for unified memory)
  const memoryType = hardwareData.memory?.type || memoryModuleType
  const memoryManufacturer = hardwareData.memory?.manufacturer || memoryModuleManufacturer
  
  // Mac-specific: Processor performance/efficiency cores
  const processorCores = safeNumber(hardwareData.processor?.cores) || safeNumber(hardwareData.processor?.logicalProcessors)
  const performanceCores = safeNumber(hardwareData.processor?.performanceCores)
  const efficiencyCores = safeNumber(hardwareData.processor?.efficiencyCores)
  const hasAppleSilicon = performanceCores > 0 && efficiencyCores > 0
  
  // Mac-specific: Graphics enhancements
  const graphicsCores = safeNumber(hardwareData.graphics?.cores)
  const graphicsMetalSupport = safeString(hardwareData.graphics?.metalSupport)
  
  // Mac-specific: NPU enhancements
  const npuCores = safeNumber(hardwareData.npu?.cores)
  const npuTops = safeString(hardwareData.npu?.performance_tops)
  
  // Mac-specific: Form factor (desktop vs laptop) for hiding battery
  const formFactor = hardwareData.formFactor as string | undefined
  const isDesktop = formFactor === 'desktop'
  
  // Mac-specific: Displays array
  const displays = Array.isArray(hardwareData.displays) ? hardwareData.displays : []
  const hasDisplays = displays.length > 0
  
  const batteryCycleCount = safeNumber(hardwareData.battery?.cycleCount)
  const batteryChargePercent = safeNumber(hardwareData.battery?.chargePercent)
  const batteryHealth = safeString(hardwareData.battery?.health)
  const batteryIsCharging = Boolean(hardwareData.battery?.isCharging)
  const batteryEstimatedRuntime = typeof hardwareData.battery?.estimatedRuntime === 'string'
    ? hardwareData.battery.estimatedRuntime
    : ''
  // Battery logic: Mac desktops have empty items array, so check for actual battery data
  const batteryItems = Array.isArray(hardwareData.battery?.items) ? hardwareData.battery.items : null
  const hasBatteryData = batteryItems ? batteryItems.length > 0 : Boolean(hardwareData.battery)
  const hasBattery = !isDesktop && hasBatteryData && (batteryCycleCount > 0 || batteryChargePercent > 0)
  const hasBatteryCycleCount = batteryCycleCount > 0
  const batteryRuntimeDisplay = batteryEstimatedRuntime ? formatRuntime(batteryEstimatedRuntime) : 'Unknown'

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-6">
      {/* Header with Icon */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Hardware Overview</h1>
            <p className="text-base text-gray-600 dark:text-gray-400">System hardware specifications and components</p>
          </div>
        </div>
  {/* Architecture - Top Right */}
  {processorArchitecture && (
          <div className="text-right mr-8">
            <div className="text-sm text-gray-500 dark:text-gray-400">Architecture</div>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400 max-w-xs truncate">
              {processorArchitecture}
            </div>
          </div>
        )}
      </div>

      {/* Hardware Overview Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Model - Takes 50% width */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 md:col-span-2">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Model</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {safeString(hardwareData.model) || 'Unknown'}
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            {hardwareData.model_identifier && safeString(hardwareData.model_identifier) !== 'Unknown' && (
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Identifier: </span>
                <span className="text-sm text-gray-900 dark:text-white font-mono">
                  {safeString(hardwareData.model_identifier)}
                </span>
              </div>
            )}
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Manufacturer: </span>
              <span className="text-sm text-gray-900 dark:text-white font-medium">
                {safeString(hardwareData.manufacturer) || 'Unknown'}
              </span>
            </div>
          </div>
        </div>

        {/* Storage Available */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 flex flex-col justify-end">
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">
            {totalStorage > 0 ? Math.round((freeStorage / totalStorage) * 100) : 0}%
          </div>
          <div className="text-base text-gray-500 dark:text-gray-400">Storage Available</div>
          <div className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            {formatBytes(freeStorage)} free / {formatBytes(totalStorage)} total
          </div>
        </div>

        {/* Battery Cycles (laptops) or Total Memory (desktops) */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 flex flex-col justify-end">
          {hasBattery ? (
            <>
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {hasBatteryCycleCount ? batteryCycleCount : 'N/A'}
              </div>
              <div className="text-base text-gray-500 dark:text-gray-400">Battery Cycles</div>
              <div className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                {hasBatteryCycleCount
                  ? `${Math.round((batteryCycleCount / 1000) * 100)}% of 1000 max`
                  : 'Battery info unavailable'}
              </div>
            </>
          ) : (
            <>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {formatBytes(totalMemory)}
              </div>
              <div className="text-base text-gray-500 dark:text-gray-400">Memory</div>
              <div className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                {memoryType && memoryType !== 'Unknown' ? memoryType : ''} {memoryManufacturer && memoryManufacturer !== 'Unknown' ? memoryManufacturer : 'Unified Memory'}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Detailed Hardware Information */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Hardware Specifications</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">UUID:</span>
            <span className="text-sm text-gray-900 dark:text-white font-mono">
              {device?.modules?.inventory?.uuid || device?.deviceId || 'Unknown'}
            </span>
            {(device?.modules?.inventory?.uuid || device?.deviceId) && (
              <CopyButton value={device?.modules?.inventory?.uuid || device?.deviceId || ''} size="sm" />
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-base">
          {/* Row 1: CPU, GPU, NPU (if available) */}
          {/* 1. CPU */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="px-3 py-1 bg-red-100 dark:bg-red-900 rounded-lg">
                <div className="font-semibold text-lg text-red-600 dark:text-red-400">CPU</div>
              </div>
            </div>
            <div className="text-gray-600 dark:text-gray-400 mb-2">{safeProcessorName(hardwareData.processor)}</div>
            <div className="text-sm text-gray-500 dark:text-gray-500">
              {hasAppleSilicon 
                ? `${processorCores} cores (${performanceCores}P + ${efficiencyCores}E)`
                : `${processorCores} cores${safeNumber(hardwareData.processor?.maxSpeed) ? ` @ ${safeNumber(hardwareData.processor?.maxSpeed)}GHz` : ''}`
              }
            </div>
          </div>
          
          {/* 2. GPU */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="px-3 py-1 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <div className="font-semibold text-lg text-purple-600 dark:text-purple-400">GPU</div>
              </div>
            </div>
            <div className="text-gray-600 dark:text-gray-400 mb-2">{graphicsName}</div>
            <div className="text-sm text-gray-500 dark:text-gray-500">
              {graphicsCores > 0 
                ? `${graphicsCores} cores${graphicsMetalSupport && graphicsMetalSupport !== 'Unknown' ? ` • ${graphicsMetalSupport}` : ''}`
                : `${graphicsManufacturer} ${graphicsMemorySize ? `${graphicsMemorySize}GB VRAM` : 'Unknown VRAM'}`
              }
            </div>
          </div>
          
          {/* 3. NPU - Only show if available */}
          {hardwareData.npu && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="px-3 py-1 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <div className="font-semibold text-lg text-blue-600 dark:text-blue-400">NPU</div>
                </div>
              </div>
              <div className="text-gray-600 dark:text-gray-400 mb-2">{npuName}</div>
              <div className="text-sm text-gray-500 dark:text-gray-500">
                {npuCores > 0 
                  ? `${npuCores} cores${npuTops && npuTops !== 'Unknown' ? ` • ${npuTops} TOPS` : ''}`
                  : `${npuManufacturer} ${npuComputeUnits ? `${npuComputeUnits} TOPS` : 'Unknown TOPS'}`
                }
              </div>
            </div>
          )}
          
          {/* Row 2: Memory, Storage, Battery (if available) */}
          {/* 4. Memory */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <div className="font-semibold text-lg text-yellow-600 dark:text-yellow-400">Memory</div>
              </div>
            </div>
            <div className="text-gray-600 dark:text-gray-400 mb-2">{formatBytes(totalMemory)}</div>
            <div className="text-sm text-gray-500 dark:text-gray-500">
              {memoryType && memoryType !== 'Unknown' ? memoryType : memoryModuleType} {memoryManufacturer && memoryManufacturer !== 'Unknown' ? memoryManufacturer : memoryModuleManufacturer}
            </div>
          </div>
          
          {/* 5. Storage */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="px-3 py-1 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <div className="font-semibold text-lg text-orange-600 dark:text-orange-400">Storage</div>
              </div>
            </div>
            <div className="text-gray-600 dark:text-gray-400 mb-2">
              {storageDevices[0] ? formatBytes(storageDevices[0].capacity) : 'Unknown'}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-500">
              {storageDevices[0]?.type || 'Unknown'} {storageDevices[0]?.health || 'Unknown'} Health
            </div>
          </div>
          
          {/* 6. Battery - Only show if NOT a desktop and has battery data */}
          {hasBattery && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="px-3 py-1 bg-green-100 dark:bg-green-900 rounded-lg">
                  <div className="font-semibold text-lg text-green-600 dark:text-green-400">Battery</div>
                </div>
              </div>
              <div className="text-gray-600 dark:text-gray-400 mb-2">
                {`${Math.round(batteryChargePercent)}% ${batteryHealth}`}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-500">
                {`${batteryCycleCount} cycles ${batteryIsCharging ? 'Charging' : 'Not charging'}`}
              </div>
            </div>
          )}

          {/* Row 3: Wireless and Bluetooth - Connectivity Hardware */}
          {/* 7. Wireless - Only show if available */}
          {hardwareData.wireless && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="px-3 py-1 bg-cyan-100 dark:bg-cyan-900 rounded-lg">
                  <div className="font-semibold text-lg text-cyan-600 dark:text-cyan-400">Wireless</div>
                </div>
              </div>
              <div className="text-gray-600 dark:text-gray-400 mb-2">{safeString(hardwareData.wireless.name) || 'Unknown'}</div>
              <div className="text-sm text-gray-500 dark:text-gray-500">
                {safeString(hardwareData.wireless.manufacturer)} {safeString(hardwareData.wireless.protocol) || 'Unknown Protocol'}
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-600 mt-1">
                Status: {safeString(hardwareData.wireless.status)}
              </div>
            </div>
          )}

          {/* 8. Bluetooth - Only show if available */}
          {hardwareData.bluetooth && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
                  <div className="font-semibold text-lg text-indigo-600 dark:text-indigo-400">Bluetooth</div>
                </div>
              </div>
              <div className="text-gray-600 dark:text-gray-400 mb-2">{safeString(hardwareData.bluetooth.name) || 'Unknown'}</div>
              <div className="text-sm text-gray-500 dark:text-gray-500">
                {safeString(hardwareData.bluetooth.manufacturer)} {safeString(hardwareData.bluetooth.bluetoothVersion) ? `v${safeString(hardwareData.bluetooth.bluetoothVersion)}` : 'Unknown Version'}
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-600 mt-1">
                Status: {safeString(hardwareData.bluetooth.status)}
              </div>
            </div>
          )}

          {/* Show "No Wireless" indicator if not present */}
          {!hardwareData.wireless && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <div className="font-semibold text-lg text-gray-400 dark:text-gray-500">Wireless</div>
                </div>
              </div>
              <div className="text-gray-400 dark:text-gray-500 mb-2">Not Present</div>
              <div className="text-sm text-gray-400 dark:text-gray-600">
                No wireless adapter detected
              </div>
            </div>
          )}

          {/* Show "No Bluetooth" indicator if not present */}
          {!hardwareData.bluetooth && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <div className="font-semibold text-lg text-gray-400 dark:text-gray-500">Bluetooth</div>
                </div>
              </div>
              <div className="text-gray-400 dark:text-gray-500 mb-2">Not Present</div>
              <div className="text-sm text-gray-400 dark:text-gray-600">
                No Bluetooth adapter detected
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Displays Information - Show connected displays */}
      {hasDisplays && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Displays</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Connected display devices and their specifications
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Display</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Resolution</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Serial Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Firmware</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {displays.map((display, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center mr-3">
                          <svg className="h-4 w-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                            <line x1="8" y1="21" x2="16" y2="21" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                            <line x1="12" y1="17" x2="12" y2="21" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                          </svg>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {display.name || 'Unknown Display'}
                            {display.isMainDisplay ? <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">(Main)</span> : ''}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {display.type === 'internal' ? 'Built-in' : 'External'} {display.displayType || ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-gray-100">{display.resolution || 'Unknown'}</div>
                      {display.scaledResolution && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">Scaled: {display.scaledResolution}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {display.displayType || display.connectionType || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-gray-100">
                      <span className="inline-flex items-center gap-1">
                        {display.serialNumber || 'N/A'}
                        {display.serialNumber && <CopyButton value={display.serialNumber} size="sm" />}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {display.firmwareVersion || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        display.online ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        <div className={`w-2 h-2 rounded-full mr-1.5 ${display.online ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                        {display.online ? 'Connected' : 'Disconnected'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Storage Visualization - Enhanced with hierarchical drill-down */}
      {storageDevices && storageDevices.length > 0 && (
        <StorageVisualization storageDevices={storageDevices} />
      )}

      {/* Battery Information - Only show for laptops (devices with actual battery data, not desktops) */}
      {hasBattery && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Battery Information</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Current battery status and health information
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Charge Level</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Health</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cycle Count</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estimated Runtime</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      batteryIsCharging ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      <div className={`w-2 h-2 rounded-full mr-1.5 ${
                        batteryIsCharging ? 'bg-green-400' : 'bg-gray-400'
                      }`}></div>
                      {batteryIsCharging ? 'Charging' : 'Not Charging'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
                        <div 
                          className={`h-2 rounded-full ${
                            batteryChargePercent >= 80 ? 'bg-green-500' :
                            batteryChargePercent >= 20 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(Math.max(batteryChargePercent, 0), 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">{Math.round(batteryChargePercent)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      batteryHealth === 'Good' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      batteryHealth === 'Fair' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                      batteryHealth === 'Poor' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {batteryHealth}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {batteryCycleCount} cycles
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {batteryRuntimeDisplay}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Memory Modules */}
      {hardwareData.memory?.modules && hardwareData.memory.modules.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Memory Modules</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Physical memory modules installed in this system
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Capacity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Speed</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Manufacturer</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {hardwareData.memory.modules.map((module: any, index: number) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {module.location || `Slot ${index + 1}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {module.type || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {formatBytes((module.capacity || 0) * 1024 * 1024)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {module.speed ? `${module.speed} MHz` : 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {module.manufacturer || 'Unknown'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Debug Accordion for API Data */}
      <div className="mt-6">
        <details className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
          <summary className="cursor-pointer px-4 py-3 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Debug API JSON Data</span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              device.modules.hardware
            </span>
          </summary>
          <div className="border-t border-gray-200 dark:border-gray-700">
            <div className="p-4">
              <div className="flex justify-end gap-2 mb-2">
                <button
                  onClick={() => {
                    const jsonString = JSON.stringify(device?.modules?.hardware, null, 2)
                    navigator.clipboard.writeText(jsonString)
                  }}
                  className="px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Copy JSON
                </button>
              </div>
              <pre className="p-4 bg-gray-900 dark:bg-black text-gray-100 text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-[600px] overflow-y-auto rounded border border-gray-700">
                {JSON.stringify(device?.modules?.hardware, null, 2)}
              </pre>
            </div>
          </div>
        </details>
      </div>
    </div>
  )
}

export default HardwareTab
/**
 * Hardware Tab Component
 * Displays device hardware information and specifications
 */

import React from 'react'
import { StorageVisualization } from '../storage'
import { CopyButton } from '../ui/CopyButton'
import { 
  Cpu, 
  MemoryStick, 
  HardDrive, 
  Battery, 
  Wifi, 
  Bluetooth, 
  Monitor, 
  Box, 
  Zap, 
  Activity,
  Microchip,
  Layers,
  Smartphone,
  Laptop,
  Server,
  Brain
} from 'lucide-react'

interface HardwareData {
  model?: unknown;
  manufacturer?: unknown;
  formFactor?: 'desktop' | 'laptop' | string;
  model_identifier?: unknown;
  memory?: {
    totalPhysical?: unknown;
    availablePhysical?: unknown;
    type?: string;
    manufacturer?: string;
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
    performanceCores?: number;
    efficiencyCores?: number;
  };
  battery?: {
    cycleCount?: unknown;
    chargePercent?: unknown;
    health?: unknown;
    isCharging?: unknown;
    estimatedRuntime?: unknown;
    items?: unknown[];
  };
  graphics?: {
    name?: unknown;
    manufacturer?: unknown;
    memorySize?: unknown;
    cores?: number;
    metalSupport?: string;
    bus?: string;
    deviceType?: string;
  };
  npu?: {
    name?: unknown;
    manufacturer?: unknown;
    computeUnits?: unknown;
    compute_units?: unknown;
    cores?: number;
    performance_tops?: string;
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
    wifiGeneration?: string;
    wifiVersion?: string;
    supportedBands?: string;
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
    const obj = value as Record<string, unknown>
    if (obj.name) return String(obj.name)
    if (obj.value) return String(obj.value)
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

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// --- Sub-components for the new layout ---

const SpecCard = ({ 
  title, 
  icon: Icon, 
  children, 
  className = "",
  iconColorClass = "text-gray-600 dark:text-gray-300"
}: { 
  title: string, 
  icon: React.ElementType, 
  children: React.ReactNode, 
  className?: string,
  iconColorClass?: string
}) => (
  <div className={`bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 ${className}`}>
    <div className="flex items-center gap-2 mb-3">
      <Icon className={`w-6 h-6 ${iconColorClass}`} />
      <h4 className="font-semibold text-gray-900 dark:text-white">{title}</h4>
    </div>
    <div className="space-y-1">
      {children}
    </div>
  </div>
)

const DetailRow = ({ label, value, subValue }: { label?: string, value: React.ReactNode, subValue?: string }) => (
  <div>
    {label && <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</div>}
    <div className="text-sm font-medium text-gray-900 dark:text-white">{value}</div>
    {subValue && <div className="text-xs text-gray-500 dark:text-gray-400">{subValue}</div>}
  </div>
)

export const HardwareTab: React.FC<HardwareTabProps> = ({ device, data }) => {
  const hardwareData = device?.modules?.hardware || device?.hardware || data || {}
  
  if (!hardwareData || Object.keys(hardwareData).length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
              <Cpu className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Hardware Overview</h1>
              <p className="text-base text-gray-600 dark:text-gray-400">System hardware specifications and components</p>
            </div>
          </div>
        </div>
        
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
            <Activity className="w-8 h-8 text-gray-400 dark:text-gray-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Hardware Information</h3>
          <p className="text-gray-600 dark:text-gray-400">Hardware data is not available for this device.</p>
        </div>
      </div>
    )
  }

  // Data Extraction
  const allStorageDevices = Array.isArray(hardwareData.storage) ? hardwareData.storage : []
  const storageDevices = allStorageDevices.filter((drive: any) => 
    (drive.capacity && drive.capacity > 0) && (drive.freeSpace && drive.freeSpace > 0)
  )
  // Only count INTERNAL drives (isInternal: 1)
  const internalDrives = storageDevices.filter((drive: any) => drive.isInternal === 1 || drive.isInternal === true)
  const totalStorage = internalDrives.reduce((total: number, drive: any) => total + (drive.capacity || 0), 0) || 0
  const freeStorage = internalDrives.reduce((total: number, drive: any) => total + (drive.freeSpace || 0), 0) || 0
  
  const totalMemory = safeNumber(hardwareData.memory?.totalPhysical) || 0
  const memoryModule = hardwareData.memory?.modules?.[0]
  const memoryModuleType = safeString(memoryModule?.type)
  const memoryModuleManufacturer = safeString(memoryModule?.manufacturer)
  const memoryType = hardwareData.memory?.type || memoryModuleType
  const memoryManufacturer = hardwareData.memory?.manufacturer || memoryModuleManufacturer
  
  const processorName = safeProcessorName(hardwareData.processor)
  const processorArchitecture = safeString(hardwareData.processor?.architecture)
  const processorCores = safeNumber(hardwareData.processor?.cores) || safeNumber(hardwareData.processor?.logicalProcessors)
  const performanceCores = safeNumber(hardwareData.processor?.performanceCores)
  const efficiencyCores = safeNumber(hardwareData.processor?.efficiencyCores)
  const hasAppleSilicon = performanceCores > 0 && efficiencyCores > 0
  
  const graphicsName = safeString(hardwareData.graphics?.name)
  const graphicsManufacturer = safeString(hardwareData.graphics?.manufacturer)
  const graphicsMemorySize = safeNumber(hardwareData.graphics?.memorySize)
  const graphicsCores = safeNumber(hardwareData.graphics?.cores)
  const graphicsMetalSupport = safeString(hardwareData.graphics?.metalSupport)
  
  const npuName = safeString(hardwareData.npu?.name)
  const npuManufacturer = safeString(hardwareData.npu?.manufacturer)
  const npuComputeUnits = safeNumber(hardwareData.npu?.computeUnits) || safeNumber(hardwareData.npu?.compute_units)
  const npuCores = safeNumber(hardwareData.npu?.cores)
  const npuTops = safeString(hardwareData.npu?.performance_tops)
  const hasNpu = Boolean(hardwareData.npu)
  
  const displays = Array.isArray(hardwareData.displays) ? hardwareData.displays : []
  const hasDisplays = displays.length > 0
  
  const batteryCycleCount = safeNumber(hardwareData.battery?.cycleCount)
  const batteryChargePercent = safeNumber(hardwareData.battery?.chargePercent)
  const batteryHealth = safeString(hardwareData.battery?.health)
  const batteryIsCharging = Boolean(hardwareData.battery?.isCharging)
  const batteryEstimatedRuntime = typeof hardwareData.battery?.estimatedRuntime === 'string' ? hardwareData.battery.estimatedRuntime : ''
  const batteryItems = Array.isArray(hardwareData.battery?.items) ? hardwareData.battery.items : null
  const formFactor = hardwareData.formFactor as string | undefined
  const isDesktop = formFactor === 'desktop'
  const hasBatteryData = batteryItems ? batteryItems.length > 0 : Boolean(hardwareData.battery)
  const hasBattery = !isDesktop && hasBatteryData && (batteryCycleCount > 0 || batteryChargePercent > 0)

  // Wireless data
  const wifiGeneration = safeString(hardwareData.wireless?.wifiGeneration)
  const wifiVersion = safeString(hardwareData.wireless?.wifiVersion)
  const wirelessAvailable = Boolean(hardwareData.wireless?.isAvailable)

  // Bluetooth data
  const bluetoothVersion = safeString(hardwareData.bluetooth?.bluetoothVersion)
  const bluetoothStatus = safeString(hardwareData.bluetooth?.status)
  const bluetoothAvailable = Boolean(hardwareData.bluetooth?.isAvailable)

  // Unified Memory Detection
  // Apple Silicon or if CPU name matches GPU name (common in SoCs)
  const isUnifiedMemory = hasAppleSilicon || (processorName === graphicsName && graphicsName !== 'Unknown');

  // Clean up GPU name if it repeats the processor name
  const displayGraphicsName = isUnifiedMemory && graphicsName.startsWith(processorName) 
    ? graphicsName.replace(processorName, '').trim() || 'Integrated Graphics'
    : graphicsName;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
            <Cpu className="w-6 h-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Hardware Overview</h1>
            <p className="text-base text-gray-600 dark:text-gray-400">System hardware specifications and components</p>
          </div>
        </div>
        {processorArchitecture && (
          <div className="text-right mr-8">
            <div className="text-sm text-gray-500 dark:text-gray-400">Architecture</div>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400 max-w-xs truncate">
              {processorArchitecture}
            </div>
          </div>
        )}
      </div>

      {/* Unified Card with Everything */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        
        {/* System Identity Section - Bordered box inside card */}
        <div className="border-2 border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-6 bg-white dark:bg-gray-800">
          <div className="flex flex-wrap items-start gap-8">
            {/* Manufacturer */}
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Manufacturer</div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {safeString(hardwareData.manufacturer) || 'Unknown'}
              </div>
            </div>
            
            {/* Model */}
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Model</div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {safeString(hardwareData.model) || 'Unknown'}
              </div>
            </div>
            
            {/* Identifier */}
            {hardwareData.model_identifier && safeString(hardwareData.model_identifier) !== 'Unknown' && (
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Identifier</div>
                <div className="text-xl font-mono font-bold text-gray-900 dark:text-white">
                  {safeString(hardwareData.model_identifier)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Hardware Grid */}
        {isUnifiedMemory ? (
          <>
            {/* Full-Width Chip Title */}
            <div className="mb-3 ml-5 flex items-baseline gap-2">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{processorName} Chip</h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">Unified Memory Architecture</span>
            </div>
            
            {/* Unified Layout: 4x2 grid with dashed border around CPU/Memory/GPU/NPU */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-1">
              {/* SINGLE Dashed Border Container around CPU/Memory/GPU/NPU - spans 2 columns */}
              <div className="col-span-2 bg-gray-100 dark:bg-gray-900/50 rounded-2xl p-4 border-2 border-gray-200 dark:border-gray-700 border-dashed">
                <div className="grid grid-cols-2 gap-4">
                  {/* CPU */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-2">
                      <Cpu className="w-5 h-5 text-red-500" />
                      <h4 className="font-semibold text-gray-900 dark:text-white">CPU</h4>
                    </div>
                    <div className="text-2xl font-bold text-red-500 mb-1">{processorCores} Cores</div>
                    {hasAppleSilicon && (
                      <div className="text-sm text-gray-900 dark:text-white">{performanceCores} Performance + {efficiencyCores} Efficiency</div>
                    )}
                  </div>

                  {/* Memory */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-2">
                      <MemoryStick className="w-5 h-5 text-yellow-500" />
                      <h4 className="font-semibold text-gray-900 dark:text-white">Memory</h4>
                    </div>
                    <div className="text-2xl font-bold text-yellow-500 mb-1">{formatBytes(totalMemory)}</div>
                    <div className="text-sm text-gray-900 dark:text-white">{memoryType} {memoryManufacturer}</div>
                  </div>

                  {/* GPU */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-2">
                      <Layers className="w-5 h-5 text-green-500" />
                      <h4 className="font-semibold text-gray-900 dark:text-white">GPU</h4>
                    </div>
                    <div className="text-2xl font-bold text-green-500 mb-1">{graphicsCores} Cores</div>
                    <div className="text-sm text-gray-900 dark:text-white">{graphicsMetalSupport || displayGraphicsName}</div>
                  </div>

                  {/* NPU */}
                  {hasNpu ? (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2 mb-2">
                        <Brain className="w-5 h-5 text-pink-500" />
                        <h4 className="font-semibold text-gray-900 dark:text-white">NPU</h4>
                      </div>
                      <div className="text-2xl font-bold text-pink-500 mb-1">{npuTops !== 'Unknown' ? `${npuTops} TOPS` : `${npuCores} Cores`}</div>
                      <div className="text-sm text-gray-900 dark:text-white">{npuTops !== 'Unknown' ? `${npuCores} Cores` : ''}</div>
                    </div>
                  ) : (
                    <div></div>
                  )}
                </div>
              </div>

              {/* Right Side: Storage/Battery/Wireless/Bluetooth - spans 2 columns (50%) */}
              <div className="col-span-1 lg:col-span-2 p-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Storage */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-2">
                      <HardDrive className="w-5 h-5 text-purple-500" />
                      <h4 className="font-semibold text-gray-900 dark:text-white">Storage</h4>
                    </div>
                    <div className="text-2xl font-bold text-purple-500 mb-1">{formatBytes(totalStorage)}</div>
                    <div className="text-sm text-gray-900 dark:text-white mb-1">{Math.round((freeStorage / totalStorage) * 100)}% Free</div>
                  </div>

                  {/* Battery or Empty */}
                  {hasBattery ? (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2 mb-2">
                        <Battery className="w-5 h-5 text-green-500" />
                        <h4 className="font-semibold text-gray-900 dark:text-white">Battery</h4>
                      </div>
                      <div className="text-2xl font-bold text-green-500 mb-1">{batteryCycleCount}</div>
                      <div className="text-sm text-gray-900 dark:text-white mb-1">Cycles</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{Math.round(batteryChargePercent)}% • {batteryHealth}</div>
                    </div>
                  ) : (
                    <div></div>
                  )}

                  {/* Wireless */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-2">
                      <Wifi className="w-5 h-5 text-teal-500" />
                      <h4 className="font-semibold text-gray-900 dark:text-white">Wireless</h4>
                    </div>
                    <div className="text-2xl font-bold text-teal-500 mb-1">{wifiGeneration !== 'Unknown' ? wifiGeneration : 'N/A'}</div>
                    <div className="text-sm text-gray-900 dark:text-white">{wifiVersion !== 'Unknown' ? wifiVersion : (wirelessAvailable ? 'Available' : 'Not Available')}</div>
                  </div>

                  {/* Bluetooth */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-2">
                      <Bluetooth className="w-5 h-5 text-blue-500" />
                      <h4 className="font-semibold text-gray-900 dark:text-white">Bluetooth</h4>
                    </div>
                    <div className="text-2xl font-bold text-blue-500 mb-1">{bluetoothVersion !== 'Unknown' ? bluetoothVersion : 'N/A'}</div>
                    <div className="text-sm text-gray-900 dark:text-white">{bluetoothStatus !== 'Unknown' ? bluetoothStatus : (bluetoothAvailable ? 'Available' : 'Not Available')}</div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          // Discrete Layout - 4x2 Grid: CPU/Memory/Storage/Battery | GPU/NPU/Wireless/Bluetooth
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Row 1: CPU | Memory | Storage | Battery */}
            {/* CPU */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <Cpu className="w-5 h-5 text-red-500" />
                <h4 className="font-semibold text-gray-900 dark:text-white">CPU</h4>
              </div>
              <div className="text-2xl font-bold text-red-500 mb-1">{processorCores} Cores</div>
              <div className="text-sm text-gray-900 dark:text-white mb-1">{processorName}</div>
              {safeNumber(hardwareData.processor?.maxSpeed) > 0 && (
                <div className="text-xs text-gray-500 dark:text-gray-400">Max: {safeNumber(hardwareData.processor?.maxSpeed)} GHz</div>
              )}
            </div>

            {/* Memory */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <MemoryStick className="w-5 h-5 text-yellow-500" />
                <h4 className="font-semibold text-gray-900 dark:text-white">Memory</h4>
              </div>
              <div className="text-2xl font-bold text-yellow-500 mb-1">{formatBytes(totalMemory)}</div>
              <div className="text-sm text-gray-900 dark:text-white mb-1">{memoryType} {memoryManufacturer}</div>
              {hardwareData.memory?.modules && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {hardwareData.memory.modules.length} Modules
                </div>
              )}
            </div>

            {/* Storage */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <HardDrive className="w-5 h-5 text-purple-500" />
                <h4 className="font-semibold text-gray-900 dark:text-white">Storage</h4>
              </div>
              <div className="text-2xl font-bold text-purple-500 mb-1">{formatBytes(totalStorage)}</div>
              <div className="text-sm text-gray-900 dark:text-white mb-1">{formatBytes(freeStorage)} Free</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{internalDrives[0]?.type || 'Internal'}</div>
            </div>

            {/* Battery or Empty */}
            {hasBattery ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <Battery className="w-5 h-5 text-green-500" />
                  <h4 className="font-semibold text-gray-900 dark:text-white">Battery</h4>
                </div>
                <div className="text-2xl font-bold text-green-500 mb-1">{batteryCycleCount}</div>
                <div className="text-sm text-gray-900 dark:text-white mb-1">Cycles</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{Math.round(batteryChargePercent)}% • {batteryHealth}</div>
              </div>
            ) : (
              <div></div>
            )}

            {/* Row 2: GPU | NPU | Wireless | Bluetooth */}
            {/* GPU */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <Layers className="w-5 h-5 text-green-500" />
                <h4 className="font-semibold text-gray-900 dark:text-white">GPU</h4>
              </div>
              <div className="text-2xl font-bold text-green-500 mb-1">{graphicsCores > 0 ? `${graphicsCores} Cores` : graphicsName}</div>
              <div className="text-sm text-gray-900 dark:text-white mb-1">{graphicsName}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {graphicsMemorySize ? `${graphicsMemorySize} GB VRAM` : 'Discrete GPU'}
              </div>
            </div>

            {/* NPU or Empty */}
            {hasNpu ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-5 h-5 text-pink-500" />
                  <h4 className="font-semibold text-gray-900 dark:text-white">NPU</h4>
                </div>
                <div className="text-2xl font-bold text-pink-500 mb-1">{npuTops !== 'Unknown' ? `${npuTops} TOPS` : `${npuCores} Cores`}</div>
                <div className="text-sm text-gray-900 dark:text-white mb-1">{npuName}</div>
                {npuTops !== 'Unknown' && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">{npuCores} Cores</div>
                )}
              </div>
            ) : (
              <div></div>
            )}

            {/* Wireless */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <Wifi className="w-5 h-5 text-cyan-500" />
                <h4 className="font-semibold text-gray-900 dark:text-white">Wireless</h4>
              </div>
              <div className="text-2xl font-bold text-cyan-500 mb-1">{wifiGeneration !== 'Unknown' ? wifiGeneration : 'N/A'}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{wifiVersion !== 'Unknown' ? wifiVersion : (wirelessAvailable ? 'Available' : 'Not Available')}</div>
            </div>

            {/* Bluetooth */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <Bluetooth className="w-5 h-5 text-blue-500" />
                <h4 className="font-semibold text-gray-900 dark:text-white">Bluetooth</h4>
              </div>
              <div className="text-2xl font-bold text-blue-500 mb-1">{bluetoothVersion !== 'Unknown' ? bluetoothVersion : 'N/A'}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{bluetoothStatus !== 'Unknown' ? bluetoothStatus : (bluetoothAvailable ? 'Available' : 'Not Available')}</div>
            </div>

          </div>
        )}

      </div>

      {/* Displays Section - Full Width Cards */}
      {hasDisplays && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Monitor className="w-6 h-6 text-gray-500" />
            Displays
          </h3>
          <div className="space-y-4">
            {displays.map((display, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-end gap-12">
                  {/* Left: Icon + Title */}
                  <div className="flex items-end gap-3 flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                      <Monitor className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white" title={display.name}>
                        {display.name || 'Unknown Display'}
                      </h4>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {display.type === 'internal' ? 'Built-in' : 'External'} {display.displayType}
                      </div>
                    </div>
                  </div>

                  {/* Middle: Specs - Horizontal layout aligned to bottom */}
                  <div className="flex items-end gap-10 min-w-0 flex-1">
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Resolution</div>
                      <div className="text-base font-medium text-gray-900 dark:text-white">{display.resolution}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Serial Number</div>
                      <div className="text-base font-mono text-gray-900 dark:text-white flex items-center gap-2">
                        {display.serialNumber ? (
                          <>
                            <span>{display.serialNumber}</span>
                            <CopyButton value={display.serialNumber} size="sm" />
                          </>
                        ) : 'N/A'}
                      </div>
                    </div>
                    {display.firmwareVersion && (
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Firmware</div>
                        <div className="text-base text-gray-900 dark:text-white">{display.firmwareVersion}</div>
                      </div>
                    )}
                  </div>

                  {/* Right: Badges - Horizontal with Main Display left, Connected right */}
                  <div className="flex flex-row gap-2 flex-shrink-0">
                    {display.isMainDisplay === 1 || display.isMainDisplay === true ? (
                      <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-sm font-medium rounded whitespace-nowrap text-center">
                        Main Display
                      </span>
                    ) : null}
                    <span className={`inline-flex items-center justify-center gap-1.5 text-sm font-medium px-3 py-1 rounded whitespace-nowrap ${
                      display.online ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${display.online ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      {display.online ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Storage Visualization Section */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <HardDrive className="w-6 h-6 text-gray-500" />
          Storage Analysis
        </h3>
        {storageDevices && storageDevices.length > 0 ? (
          <StorageVisualization storageDevices={storageDevices} />
        ) : (
          <div className="text-center py-8 text-gray-500">No storage devices detected</div>
        )}
      </div>

      {/* Storage Devices Section - Show when multiple drives with capacity > 0 */}
      {(() => {
        const validDrives = storageDevices.filter((drive: any) => 
          drive.capacity && safeNumber(drive.capacity) > 0
        );
        return validDrives.length > 1 ? (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <HardDrive className="w-6 h-6 text-gray-500" />
              Storage Devices
            </h3>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Device Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Capacity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Free Space</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">File System</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Health</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Interface</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {validDrives.map((drive: any, index: number) => {
                      const capacity = safeNumber(drive.capacity);
                      const freeSpace = safeNumber(drive.freeSpace);
                      const usedPercent = capacity > 0 ? Math.round(((capacity - freeSpace) / capacity) * 100) : 0;
                      const health = safeString(drive.health);
                      
                      return (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {safeString(drive.name) && safeString(drive.name) !== 'Unknown' ? safeString(drive.name) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {safeString(drive.deviceName) && safeString(drive.deviceName) !== 'Unknown' ? safeString(drive.deviceName) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {safeString(drive.type) && safeString(drive.type) !== 'Unknown' ? safeString(drive.type) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {formatBytes(capacity)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            <div className="flex flex-col gap-1">
                              <div>{formatBytes(freeSpace)} ({100 - usedPercent}% free)</div>
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                <div 
                                  className={`h-1.5 rounded-full transition-all ${
                                    usedPercent > 90 
                                      ? 'bg-red-500' 
                                      : usedPercent > 75 
                                      ? 'bg-yellow-500' 
                                      : 'bg-green-500'
                                  }`}
                                  style={{ width: `${usedPercent}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {safeString(drive.fileSystem) && safeString(drive.fileSystem) !== 'Unknown' ? safeString(drive.fileSystem) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {health !== 'Unknown' ? (
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                health === 'Good' 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : health === 'Warning'
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              }`}>
                                {health}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {safeString(drive.interface) && safeString(drive.interface) !== 'Unknown' ? safeString(drive.interface) : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null;
      })()}

      {/* Battery Information Section */}
      {hasBattery && hardwareData.battery && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Battery className="w-6 h-6 text-gray-500" />
            Battery Information
          </h3>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    {hardwareData.battery.isCharging !== undefined && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    )}
                    {hardwareData.battery.health !== undefined && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Health</th>
                    )}
                    {hardwareData.battery.cycleCount !== undefined && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cycle Count</th>
                    )}
                    {hardwareData.battery.chargePercent !== undefined && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Charge</th>
                    )}
                    {hardwareData.battery.estimatedRuntime !== undefined && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Runtime</th>
                    )}
                    {hardwareData.battery.designCapacity !== undefined && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Design Capacity</th>
                    )}
                    {hardwareData.battery.currentCapacity !== undefined && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Current Capacity</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {hardwareData.battery.isCharging !== undefined && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{hardwareData.battery.isCharging ? 'Charging' : 'Not Charging'}</td>
                    )}
                    {hardwareData.battery.health !== undefined && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{hardwareData.battery.health}</td>
                    )}
                    {hardwareData.battery.cycleCount !== undefined && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        <div className="flex flex-col gap-2">
                          <div className="font-medium">{hardwareData.battery.cycleCount} / 1000</div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all ${
                                hardwareData.battery.cycleCount > 900 
                                  ? 'bg-red-500' 
                                  : hardwareData.battery.cycleCount > 800 
                                  ? 'bg-yellow-500' 
                                  : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min((hardwareData.battery.cycleCount / 1000) * 100, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                    )}
                    {hardwareData.battery.chargePercent !== undefined && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{Math.round(hardwareData.battery.chargePercent)}%</td>
                    )}
                    {hardwareData.battery.estimatedRuntime !== undefined && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {(() => {
                          const runtime = hardwareData.battery.estimatedRuntime.toString();
                          const match = runtime.match(/^(\d+):(\d+):(\d+)/);
                          if (match) {
                            const hours = parseInt(match[1]);
                            const minutes = parseInt(match[2]);
                            return `${hours}h ${minutes}m`;
                          }
                          return runtime;
                        })()}
                      </td>
                    )}
                    {hardwareData.battery.designCapacity !== undefined && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{hardwareData.battery.designCapacity} mAh</td>
                    )}
                    {hardwareData.battery.currentCapacity !== undefined && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{hardwareData.battery.currentCapacity} mAh</td>
                    )}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Memory Modules Section */}
      {hardwareData.memory?.modules && Array.isArray(hardwareData.memory.modules) && hardwareData.memory.modules.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <MemoryStick className="w-6 h-6 text-gray-500" />
            Memory Modules
          </h3>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Capacity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Speed</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Manufacturer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {hardwareData.memory.modules.map((module: any, index: number) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {safeString(module.location) || `Slot ${index + 1}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {safeString(module.type) && safeString(module.type) !== 'Unknown' ? safeString(module.type) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatBytes(safeNumber(module.capacity) * 1024 * 1024)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {module.speed ? `${safeString(module.speed)} MHz` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {safeString(module.manufacturer) && safeString(module.manufacturer) !== 'Unknown' ? safeString(module.manufacturer) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Debug Accordion */}
      <div className="mt-6">
        <details className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
          <summary className="cursor-pointer px-4 py-3 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-gray-500 dark:text-gray-400" />
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

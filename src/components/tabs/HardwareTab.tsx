/**
 * Hardware Tab Component
 * Displays device hardware information and specifications
 */

import React from 'react'
import { StorageVisualization } from '../storage'
import { CopyButton } from '../ui/CopyButton'
import { normalizeKeys } from '../../lib/utils/powershell-parser'
import { DebugAccordion } from '../DebugAccordion'
import { 
  Cpu, 
  MemoryStick, 
  HardDrive, 
  Battery, 
  Wifi, 
  Bluetooth, 
  Monitor, 
  Activity,
  Layers,
  Brain
} from 'lucide-react'

interface HardwareData {
  model?: unknown;
  manufacturer?: unknown;
  formFactor?: 'desktop' | 'laptop' | string;
  model_identifier?: unknown;
  memory?: {
    // snake_case (Mac osquery)
    physical_memory?: unknown;
    // camelCase (Windows)
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
    // snake_case (Mac osquery)
    logical_cores?: unknown;
    performance_cores?: number;
    efficiency_cores?: number;
    // camelCase (Windows)
    logicalProcessors?: unknown;
    maxSpeed?: unknown;
    performanceCores?: number;
    efficiencyCores?: number;
  };
  battery?: {
    // osquery snake_case fields (Mac)
    cycle_count?: unknown;
    percent_remaining?: unknown;
    charging?: unknown;
    minutes_until_empty?: unknown;
    minutes_to_full_charge?: unknown;
    max_capacity?: unknown;
    current_capacity?: unknown;
    designed_capacity?: unknown;
    // Legacy camelCase fields (Windows)
    cycleCount?: unknown;
    chargePercent?: unknown;
    health?: unknown;
    isCharging?: unknown;
    estimatedRuntime?: unknown;
    designCapacity?: unknown;
    currentCapacity?: unknown;
    items?: unknown[];
  };
  graphics?: {
    name?: unknown;
    manufacturer?: unknown;
    memorySize?: unknown;
    cores?: number;
    // snake_case (Mac osquery)
    metal_support?: string;
    device_type?: string;
    // camelCase (Windows)
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
    performanceTops?: string;
    isAvailable?: boolean;
    is_available?: boolean;
  };
  storage?: Array<{
    name?: string;
    // snake_case (Mac osquery)
    size?: number;
    free_space?: number;
    file_system?: string;
    is_internal?: boolean | number;
    smart_status?: string;
    purgeable_space?: number;
    device_name?: string;
    // camelCase (Windows)
    capacity?: number;
    freeSpace?: number;
    fileSystem?: string;
    isInternal?: boolean | number;
    smartStatus?: string;
    purgeableSpace?: number;
    deviceName?: string;
    type?: string;
    interface?: string;
    health?: string;
    [key: string]: unknown;
  }>;
  displays?: Array<{
    name?: string;
    // snake_case (Mac osquery)
    serial_number?: string;
    scaled_resolution?: string;
    display_type?: string;
    firmware_version?: string;
    is_main_display?: boolean | number;
    ambient_brightness_enabled?: boolean | number;
    connection_type?: string;
    // camelCase (Windows)
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
    // Enhanced display info (model-based lookup)
    diagonal_inches?: number;
    diagonalInches?: number;
    ppi?: number;
    color_gamut?: string;
    colorGamut?: string;
    brightness_nits?: number;
    brightnessNits?: number;
    peak_brightness_hdr?: number;
    peakBrightnessHdr?: number;
    true_tone?: boolean | number;
    trueTone?: boolean | number;
    promotion?: boolean | number;
    refresh_rate?: string;
    refreshRate?: string;
    nanotexture_option?: boolean | number;
    nanotextureOption?: boolean | number;
    data_source?: string;
    dataSource?: string;
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

const _SpecCard = ({ 
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

const _DetailRow = ({ label, value, subValue }: { label?: string, value: React.ReactNode, subValue?: string }) => (
  <div>
    {label && <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</div>}
    <div className="text-sm font-medium text-gray-900 dark:text-white">{value}</div>
    {subValue && <div className="text-xs text-gray-500 dark:text-gray-400">{subValue}</div>}
  </div>
)

export const HardwareTab: React.FC<HardwareTabProps> = ({ device, data }) => {
  // Normalize snake_case to camelCase for all hardware data
  const rawHardware = device?.modules?.hardware || device?.hardware || data || {}
  const hardwareData = normalizeKeys(rawHardware) as any
  
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

  // Data Extraction - Support both snake_case (Mac osquery) and camelCase (Windows)
  const allStorageDevices = Array.isArray(hardwareData.storage) ? hardwareData.storage : []
  const storageDevices = allStorageDevices.filter((drive: any) => {
    // Support both size (Mac) and capacity (Windows)
    const capacity = drive.size ?? drive.capacity
    // Support both free_space (Mac) and freeSpace (Windows)
    const freeSpace = drive.free_space ?? drive.freeSpace
    return (capacity && capacity > 0) && (freeSpace && freeSpace > 0)
  })
  // Only count INTERNAL drives - support both is_internal (Mac) and isInternal (Windows)
  // Default to true if isInternal is not set (Windows logical drives are internal)
  const internalDrives = storageDevices.filter((drive: any) => {
    const isInternal = drive.isInternal ?? drive.is_internal
    // If isInternal is not set (undefined), assume internal unless it's clearly external
    const isRemovable = (drive.type ?? drive.Type ?? '').toLowerCase().includes('removable') ||
                        (drive.interface ?? drive.Interface ?? '').toLowerCase().includes('usb')
    if (isInternal === undefined) {
      return !isRemovable // Default to internal if not explicitly marked
    }
    return isInternal === 1 || isInternal === true
  })
  const totalStorage = internalDrives.reduce((total: number, drive: any) => {
    const capacity = drive.size ?? drive.capacity ?? 0
    return total + capacity
  }, 0) || 0
  const freeStorage = internalDrives.reduce((total: number, drive: any) => {
    const freeSpace = drive.free_space ?? drive.freeSpace ?? 0
    return total + freeSpace
  }, 0) || 0
  
  // Memory - support physicalMemory (normalized from physical_memory), physical_memory (pre-normalization), totalPhysical (Windows)
  const totalMemory = safeNumber(hardwareData.memory?.physicalMemory) || safeNumber(hardwareData.memory?.physical_memory) || safeNumber(hardwareData.memory?.totalPhysical) || 0
  const memoryModule = hardwareData.memory?.modules?.[0]
  const memoryModuleType = safeString(memoryModule?.type)
  const memoryModuleManufacturer = safeString(memoryModule?.manufacturer)
  const memoryType = hardwareData.memory?.type || memoryModuleType
  const memoryManufacturer = hardwareData.memory?.manufacturer || memoryModuleManufacturer
  
  const processorName = safeProcessorName(hardwareData.processor)
  const processorArchitecture = safeString(hardwareData.processor?.architecture)
  // Support both logical_cores (Mac) and logicalProcessors (Windows)
  const processorCores = safeNumber(hardwareData.processor?.cores) || safeNumber(hardwareData.processor?.logical_cores) || safeNumber(hardwareData.processor?.logicalProcessors)
  // Support both performance_cores/efficiency_cores (Mac) and performanceCores/efficiencyCores (Windows)
  const performanceCores = safeNumber(hardwareData.processor?.performance_cores) || safeNumber(hardwareData.processor?.performanceCores)
  const efficiencyCores = safeNumber(hardwareData.processor?.efficiency_cores) || safeNumber(hardwareData.processor?.efficiencyCores)
  // Apple Silicon detection: Must have BOTH performance AND efficiency cores
  const hasAppleSilicon = performanceCores > 0 && efficiencyCores > 0
  
  const graphicsName = safeString(hardwareData.graphics?.name)
  const graphicsManufacturer = safeString(hardwareData.graphics?.manufacturer)
  const graphicsMemorySize = safeNumber(hardwareData.graphics?.memorySize) || safeNumber(hardwareData.graphics?.memory_size)
  const graphicsDriverVersion = safeString(hardwareData.graphics?.driverVersion)
  const graphicsCores = safeNumber(hardwareData.graphics?.cores)
  // Support both metalSupport (normalized from metal_support) and metalSupport (Windows camelCase)
  const graphicsMetalSupport = safeString(hardwareData.graphics?.metalSupport ?? hardwareData.graphics?.metal_support)
  
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
  
  const npuName = safeString(hardwareData.npu?.name)
  const _npuManufacturer = safeString(hardwareData.npu?.manufacturer)
  const npuComputeUnits = safeNumber(hardwareData.npu?.computeUnits)
  const npuCores = safeNumber(hardwareData.npu?.cores)
  const npuTops = safeString(hardwareData.npu?.performanceTops)
  // Check for hasNpu (normalized from has_npu) or isAvailable - after normalizeKeys(), all keys are camelCase
  const npuIsAvailable = Boolean(hardwareData.npu?.isAvailable || hardwareData.npu?.hasNpu)
  // Only show NPU card if it's available with a valid name AND has cores
  const hasNpu = npuIsAvailable && npuName !== 'Unknown' && npuName !== '' && (npuComputeUnits > 0 || npuCores > 0)
  
  const displays = Array.isArray(hardwareData.displays) ? hardwareData.displays : []
  const hasDisplays = displays.length > 0
  
  // Support both osquery snake_case (Mac) and camelCase (Windows)
  const batteryCycleCount = safeNumber(hardwareData.battery?.cycleCount) || safeNumber(hardwareData.battery?.cycle_count)
  const batteryChargePercent = safeNumber(hardwareData.battery?.percentRemaining) || safeNumber(hardwareData.battery?.percent_remaining) || safeNumber(hardwareData.battery?.chargePercent)
  const batteryHealth = safeString(hardwareData.battery?.health)
  const batteryIsCharging = hardwareData.battery?.charging === 1 || Boolean(hardwareData.battery?.isCharging)
  // osquery: minutes_until_empty, Windows: estimatedRuntime
  const batteryEstimatedRuntime = (hardwareData.battery?.minutesUntilEmpty || hardwareData.battery?.minutes_until_empty)
    ? `${hardwareData.battery.minutesUntilEmpty ?? hardwareData.battery.minutes_until_empty} min`
    : (typeof hardwareData.battery?.estimatedRuntime === 'string' ? hardwareData.battery.estimatedRuntime : '')
  const batteryItems = Array.isArray(hardwareData.battery?.items) ? hardwareData.battery.items : null
  const formFactor = hardwareData.formFactor as string | undefined
  const isDesktop = formFactor === 'desktop'
  const hasBatteryData = batteryItems ? batteryItems.length > 0 : Boolean(hardwareData.battery)
  const hasBattery = !isDesktop && hasBatteryData && (batteryCycleCount > 0 || batteryChargePercent > 0)

  // Wireless data
  const wifiGeneration = safeString(hardwareData.wireless?.wifiGeneration || hardwareData.wireless?.wifi_generation)
  const wifiVersion = safeString(hardwareData.wireless?.wifiVersion || hardwareData.wireless?.wifi_version)
  const rawWirelessStatus = hardwareData.wireless?.status
  // Suppress hardware-level "off" status — WiFi can be active while interface reports "off"
  const wirelessStatus = rawWirelessStatus && String(rawWirelessStatus).toLowerCase() !== 'off'
    ? safeString(rawWirelessStatus)
    : 'Unknown'
  const wirelessAvailable = Boolean(hardwareData.wireless?.isAvailable || hardwareData.wireless?.is_available)
  const wirelessName = safeString(hardwareData.wireless?.name)
  const wirelessProtocol = safeString(hardwareData.wireless?.protocol)

  // Bluetooth data
  const bluetoothVersion = safeString(hardwareData.bluetooth?.bluetoothVersion)
  const bluetoothStatus = safeString(hardwareData.bluetooth?.status)
  const bluetoothAvailable = Boolean(hardwareData.bluetooth?.isAvailable)

  // Unified Memory Detection
  // 1. Backend flag: unifiedMemory (normalized from unified_memory set by Mac client for Apple Silicon)
  // 2. Apple Silicon with performance/efficiency cores (M-series chips)
  // 3. CPU name matches GPU name (common in SoCs)
  const hasUnifiedMemoryFlag = Boolean(hardwareData.memory?.unifiedMemory || hardwareData.memory?.unified_memory)
  const isUnifiedMemory = hasUnifiedMemoryFlag || hasAppleSilicon || (processorName === graphicsName && graphicsName !== 'Unknown')

  // Clean up GPU name if it repeats the processor name
  const displayGraphicsName = isUnifiedMemory && cleanGraphicsName.startsWith(processorName) 
    ? cleanGraphicsName.replace(processorName, '').trim() || 'Integrated Graphics'
    : cleanGraphicsName;

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
            
            {/* Identifier - check both normalized (modelIdentifier) and raw (model_identifier) */}
            {(hardwareData.modelIdentifier || hardwareData.model_identifier) && safeString(hardwareData.modelIdentifier ?? hardwareData.model_identifier) !== 'Unknown' && (
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Identifier</div>
                <div className="text-xl font-mono font-bold text-gray-900 dark:text-white">
                  {safeString(hardwareData.modelIdentifier ?? hardwareData.model_identifier)}
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
                    <div className="text-sm text-gray-900 dark:text-white">
                      {memoryType && memoryType !== 'Unknown' ? `${memoryType} ` : ''}{memoryManufacturer}
                    </div>
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

                  {/* NPU - only render if available */}
                  {hasNpu && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2 mb-2">
                        <Brain className="w-5 h-5 text-pink-500" />
                        <h4 className="font-semibold text-gray-900 dark:text-white">NPU</h4>
                      </div>
                      <div className="text-2xl font-bold text-pink-500 mb-1">{npuTops !== 'Unknown' ? `${npuTops} TOPS` : `${npuCores} Cores`}</div>
                      <div className="text-sm text-gray-900 dark:text-white">{npuTops !== 'Unknown' ? `${npuCores} Cores` : ''}</div>
                    </div>
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
                    <div className="text-sm text-gray-900 dark:text-white mb-1">{totalStorage > 0 ? Math.min(100, Math.round((freeStorage / totalStorage) * 100)) : 0}% Free</div>
                  </div>

                  {/* Battery or Empty */}
                  {hasBattery ? (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2 mb-2">
                        <Battery className="w-5 h-5 text-green-500" />
                        <h4 className="font-semibold text-gray-900 dark:text-white">Battery</h4>
                      </div>
                      <div className="text-2xl font-bold text-green-500 mb-1">{batteryCycleCount} Cycles</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{Math.round(batteryChargePercent)}% • {batteryHealth}</div>
                    </div>
                  ) : (
                    <div></div>
                  )}

                  {/* Wireless - only render if available */}
                  {wirelessAvailable && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2 mb-2">
                        <Wifi className="w-5 h-5 text-teal-500" />
                        <h4 className="font-semibold text-gray-900 dark:text-white">Wireless</h4>
                      </div>
                      <div className="text-2xl font-bold text-teal-500 mb-1">
                        {wifiGeneration !== 'Unknown' ? wifiGeneration : 'Available'}
                      </div>
                      <div className="text-sm text-gray-900 dark:text-white">
                        {wifiVersion !== 'Unknown' ? wifiVersion : ''}
                        {wifiVersion !== 'Unknown' && wirelessStatus !== 'Unknown' && wirelessStatus && ' • '}
                        {wirelessStatus !== 'Unknown' && wirelessStatus ? (
                          <span className="text-gray-500 dark:text-gray-400">{wirelessStatus}</span>
                        ) : null}
                      </div>
                    </div>
                  )}

                  {/* Bluetooth - only render if available */}
                  {bluetoothAvailable && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2 mb-2">
                        <Bluetooth className="w-5 h-5 text-blue-500" />
                        <h4 className="font-semibold text-gray-900 dark:text-white">Bluetooth</h4>
                      </div>
                      <div className="text-2xl font-bold text-blue-500 mb-1">{bluetoothVersion !== 'Unknown' ? bluetoothVersion : 'N/A'}</div>
                      <div className="text-sm text-gray-900 dark:text-white">{bluetoothStatus !== 'Unknown' ? bluetoothStatus : 'Available'}</div>
                    </div>
                  )}
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
              {hasAppleSilicon && performanceCores > 0 && efficiencyCores > 0 ? (
                <div className="text-xs text-gray-500 dark:text-gray-400">{performanceCores} Performance + {efficiencyCores} Efficiency</div>
              ) : safeNumber(hardwareData.processor?.maxSpeed) > 0 ? (
                <div className="text-xs text-gray-500 dark:text-gray-400">Max: {safeNumber(hardwareData.processor?.maxSpeed)} GHz</div>
              ) : null}
            </div>

            {/* Memory */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <MemoryStick className="w-5 h-5 text-yellow-500" />
                <h4 className="font-semibold text-gray-900 dark:text-white">Memory</h4>
              </div>
              <div className="text-2xl font-bold text-yellow-500 mb-1">{formatBytes(totalMemory)}</div>
              <div className="text-sm text-gray-900 dark:text-white mb-1">
                {memoryType && memoryType !== 'Unknown' ? `${memoryType} ` : ''}{memoryManufacturer}
              </div>
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
                <div className="text-2xl font-bold text-green-500 mb-1">{batteryCycleCount} Cycles</div>
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
              <div className="text-2xl font-bold text-green-500 mb-1">{graphicsName}</div>
              {graphicsCores > 0 && (
                <div className="text-sm text-gray-900 dark:text-white mb-1">{graphicsCores} Cores</div>
              )}
              {graphicsMemorySize > 0 && (
                <div className="text-sm text-gray-900 dark:text-white mb-1">{graphicsMemorySize} GB VRAM</div>
              )}
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {graphicsManufacturer !== 'Unknown' && graphicsManufacturer 
                  ? `${graphicsManufacturer} Discrete Card${graphicsDriverVersion !== 'Unknown' && graphicsDriverVersion ? ` - Driver ${graphicsDriverVersion}` : ''}`
                  : (graphicsMetalSupport !== 'Unknown' && graphicsMetalSupport ? graphicsMetalSupport : 'Discrete GPU')}
              </div>
            </div>

            {/* NPU - only render if available */}
            {hasNpu && (
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
            )}

            {/* Wireless - only render if available */}
            {wirelessAvailable && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <Wifi className="w-5 h-5 text-cyan-500" />
                  <h4 className="font-semibold text-gray-900 dark:text-white">Wireless</h4>
                </div>
                <div className="text-2xl font-bold text-cyan-500 mb-1">
                  {wifiGeneration !== 'Unknown' ? wifiGeneration : 'Available'}
                </div>
                <div className="text-sm text-gray-900 dark:text-white mb-1">
                  {wirelessProtocol !== 'Unknown' ? wirelessProtocol : ''}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate" title={wirelessName !== 'Unknown' ? wirelessName : undefined}>
                  {wirelessName !== 'Unknown' ? wirelessName : ''}
                </div>
              </div>
            )}

            {/* Bluetooth - only render if available */}
            {bluetoothAvailable && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <Bluetooth className="w-5 h-5 text-blue-500" />
                  <h4 className="font-semibold text-gray-900 dark:text-white">Bluetooth</h4>
                </div>
                <div className="text-2xl font-bold text-blue-500 mb-1">{bluetoothVersion !== 'Unknown' ? bluetoothVersion : 'N/A'}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{bluetoothStatus !== 'Unknown' ? bluetoothStatus : 'Available'}</div>
              </div>
            )}

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
            {displays.map((display: any, index: number) => {
              // Support both snake_case (Mac osquery) and camelCase (Windows)
              const displaySerialNumber = display.serial_number ?? display.serialNumber
              const displayType = display.display_type ?? display.displayType
              const displayFirmwareVersion = display.firmware_version ?? display.firmwareVersion
              const displayIsMainDisplay = display.is_main_display ?? display.isMainDisplay
              // Enhanced fields (model-based lookup)
              const diagonalInches = display.diagonal_inches ?? display.diagonalInches
              const ppi = display.ppi
              const colorGamut = display.color_gamut ?? display.colorGamut
              const brightnessNits = display.brightness_nits ?? display.brightnessNits
              const trueTone = display.true_tone ?? display.trueTone
              const refreshRate = display.refresh_rate ?? display.refreshRate
              const _hasEnhancedInfo = diagonalInches || ppi || colorGamut || brightnessNits
              
              return (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center gap-8">
                  {/* Left: Icon + Title */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                      <Monitor className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white" title={display.name}>
                        {display.name || 'Unknown Display'}
                      </h4>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {diagonalInches ? `${diagonalInches}" ` : ''}
                        {display.type === 'internal' ? 'Built-in' : 'External'} {displayType}
                      </div>
                    </div>
                  </div>

                  {/* Middle: Specs - Horizontal layout aligned to bottom */}
                  <div className="flex items-end gap-10 min-w-0 flex-1">
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Resolution</div>
                      <div className="text-base font-medium text-gray-900 dark:text-white">{display.resolution || 'Unknown'}</div>
                    </div>
                    {ppi && (
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pixel Density</div>
                        <div className="text-base font-medium text-gray-900 dark:text-white">{ppi} PPI</div>
                      </div>
                    )}
                    {brightnessNits && (
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Brightness</div>
                        <div className="text-base font-medium text-gray-900 dark:text-white">{brightnessNits} nits</div>
                      </div>
                    )}
                    {colorGamut && (
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Color Gamut</div>
                        <div className="text-base font-medium text-gray-900 dark:text-white">{colorGamut}</div>
                      </div>
                    )}
                    {/* Only show serial number for external displays */}
                    {display.type !== 'internal' && displaySerialNumber && (
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Serial Number</div>
                        <div className="text-base font-mono text-gray-900 dark:text-white flex items-center gap-2">
                          <span>{displaySerialNumber}</span>
                          <CopyButton value={displaySerialNumber} size="sm" />
                        </div>
                      </div>
                    )}
                    {displayFirmwareVersion && (
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Firmware</div>
                        <div className="text-base text-gray-900 dark:text-white">{displayFirmwareVersion}</div>
                      </div>
                    )}
                  </div>

                  {/* Right: Badges - Horizontal with Main Display left, Connected right */}
                  <div className="flex flex-row gap-2 flex-shrink-0">
                    {(trueTone === 1 || trueTone === true) && (
                      <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-sm font-medium rounded whitespace-nowrap text-center">
                        True Tone
                      </span>
                    )}
                    {refreshRate && (
                      <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-medium rounded whitespace-nowrap text-center">
                        {refreshRate}
                      </span>
                    )}
                    {/* Only show Main Display badge for external displays */}
                    {display.type !== 'internal' && (displayIsMainDisplay === 1 || displayIsMainDisplay === true) && (
                      <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-sm font-medium rounded whitespace-nowrap text-center">
                        Main Display
                      </span>
                    )}
                    {/* Only show Connected badge for external displays */}
                    {display.type !== 'internal' && (
                      <span className={`inline-flex items-center justify-center gap-1.5 text-sm font-medium px-3 py-1 rounded whitespace-nowrap ${
                        display.online ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}>
                        <div className={`w-2 h-2 rounded-full ${display.online ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                        {display.online ? 'Connected' : 'Disconnected'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )})}
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
        const validDrives = storageDevices.filter((drive: any) => {
          // Support both size (Mac) and capacity (Windows)
          const driveCapacity = drive.size ?? drive.capacity
          return driveCapacity && safeNumber(driveCapacity) > 0
        });
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
                      const capacity = safeNumber(drive.size ?? drive.capacity);
                      const freeSpace = safeNumber(drive.freeSpace ?? drive.free_space);
                      const fileSystem = safeString(drive.fileSystem ?? drive.file_system);
                      const deviceName = safeString(drive.deviceName ?? drive.device_name);
                      // Cap usedPercent at 100% and floor at 0% to prevent visual overflow
                      const rawUsedPercent = capacity > 0 ? Math.round(((capacity - freeSpace) / capacity) * 100) : 0;
                      const usedPercent = Math.min(100, Math.max(0, rawUsedPercent));
                      const health = safeString(drive.health);
                      
                      return (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {safeString(drive.name) && safeString(drive.name) !== 'Unknown' ? safeString(drive.name) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {deviceName && deviceName !== 'Unknown' ? deviceName : '-'}
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
                            {fileSystem && fileSystem !== 'Unknown' ? fileSystem : '-'}
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    {batteryHealth && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Health</th>
                    )}
                    {batteryCycleCount > 0 && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cycle Count</th>
                    )}
                    {batteryChargePercent > 0 && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Charge</th>
                    )}
                    {batteryEstimatedRuntime && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Runtime</th>
                    )}
                    {(hardwareData.battery.designedCapacity !== undefined || hardwareData.battery.designed_capacity !== undefined || hardwareData.battery.designCapacity !== undefined) && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Design Capacity</th>
                    )}
                    {(hardwareData.battery.currentCapacity !== undefined || hardwareData.battery.current_capacity !== undefined) && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Current Capacity</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{batteryIsCharging ? 'Charging' : 'Not Charging'}</td>
                    {batteryHealth && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{batteryHealth}</td>
                    )}
                    {batteryCycleCount > 0 && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        <div className="flex flex-col gap-2">
                          <div className="font-medium">{batteryCycleCount} / 1000</div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all ${
                                batteryCycleCount > 900 
                                  ? 'bg-red-500' 
                                  : batteryCycleCount > 800 
                                  ? 'bg-yellow-500' 
                                  : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min((batteryCycleCount / 1000) * 100, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                    )}
                    {batteryChargePercent > 0 && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{Math.round(batteryChargePercent)}%</td>
                    )}
                    {batteryEstimatedRuntime && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {batteryEstimatedRuntime}
                      </td>
                    )}
                    {(hardwareData.battery.designedCapacity !== undefined || hardwareData.battery.designed_capacity !== undefined || hardwareData.battery.designCapacity !== undefined) && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {safeNumber(hardwareData.battery.designedCapacity) || safeNumber(hardwareData.battery.designed_capacity) || safeNumber(hardwareData.battery.designCapacity)} mAh
                      </td>
                    )}
                    {(hardwareData.battery.currentCapacity !== undefined || hardwareData.battery.current_capacity !== undefined) && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {safeNumber(hardwareData.battery.currentCapacity) || safeNumber(hardwareData.battery.current_capacity)} mAh
                      </td>
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

      <DebugAccordion
        data={device?.modules?.hardware}
        label="device.modules.hardware"
        moduleVersion={device?.modules?.hardware?.moduleVersion as string | undefined}
      />
    </div>
  )
}

export default HardwareTab

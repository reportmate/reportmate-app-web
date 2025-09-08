/**
 * MODULAR Device Mapper
 */

import { calculateDeviceStatus, normalizeLastSeen, type DeviceStatus } from './device-status'
import { extractHardware, type HardwareInfo } from './modules/hardware'
import { extractNetwork, type NetworkInfo } from './modules/network'
import { extractSystem, type SystemInfo } from './modules/system'
import { extractInventory, type InventoryInfo } from './modules/inventory'
import { extractInstalls, type InstallsInfo } from './modules/installs'
import { extractApplications } from './modules/applications'

export interface ProcessedDeviceInfo {
  // Core identifiers
  deviceId: string
  serialNumber: string
  name: string
  
  // Status and timestamps
  lastSeen: string
  status: DeviceStatus
  createdAt?: string
  
  // Client information
  clientVersion?: string
  
  // Modular data (source of truth)
  modules?: any
  
  // Processed modular data
  hardware?: HardwareInfo
  network?: NetworkInfo
  system?: SystemInfo
  inventory?: InventoryInfo
  installs?: InstallsInfo
  applications?: any
  peripherals?: any
  
  // Legacy compatibility (deprecated - use modular data instead)
  model?: string
  os?: string
  platform?: string
  uptime?: string
  location?: string
  assetTag?: string
  ipAddress?: string
  macAddress?: string
  totalEvents: number
  lastEventTime: string
  processor?: string
  processorSpeed?: string
  cores?: number
  memory?: string
  availableRAM?: string
  storage?: string
  graphics?: string
  architecture?: string
  batteryLevel?: number
  batteryHealth?: string
  batteryCycleCount?: number
  isCharging?: boolean
  bootTime?: string
}

/**
 * Validates device structure
 */
export function validateDeviceStructure(rawDevice: any): void {
  if (!rawDevice) {
    throw new Error('🚨 VALIDATION FAILED: No device data provided')
  }
  
  if (!rawDevice.modules) {
    console.error('🚨 STRUCTURE VIOLATION: Device data missing modules object', {
      deviceId: rawDevice.deviceId,
      serialNumber: rawDevice.serialNumber,
      availableKeys: Object.keys(rawDevice)
    })
    throw new Error('🚨 CRITICAL: Device data missing required modules structure')
  }
}

/**
 * MODULAR Device Mapper - NEW ARCHITECTURE
 * Each aspect is processed by dedicated modules
 */
export function mapDeviceData(rawDevice: any): ProcessedDeviceInfo {
  console.log('🚨🚨🚨 MODULAR DEVICE MAPPER - CALLED WITH DATA!')
  console.log('🚨🚨🚨 DEVICE MAPPER - USING ISOLATED PROCESSING MODULES')
  
  if (!rawDevice) {
    throw new Error('No device data provided to mapper')
  }

  // Validate structure
  validateDeviceStructure(rawDevice)

  // Normalize core data using modules
  const validLastSeen = normalizeLastSeen(rawDevice.lastSeen)
  const deviceStatus = calculateDeviceStatus(validLastSeen)

  // Extract modular data using dedicated processors
  console.log('🔧 MODULAR EXTRACTION - Starting module processing')
  console.log('🔧 MODULES AVAILABLE:', Object.keys(rawDevice.modules))
  
  const hardware = extractHardware(rawDevice.modules)
  console.log('✅ Hardware extraction complete')
  
  const network = extractNetwork(rawDevice.modules)
  console.log('✅ Network extraction complete')
  
  const system = extractSystem(rawDevice.modules)
  console.log('✅ System extraction complete')
  
  const inventory = extractInventory(rawDevice.modules)
  console.log('✅ Inventory extraction complete')
  
  console.log('🎯 ABOUT TO CALL extractInstalls with modules:', {
    hasInstalls: !!rawDevice.modules?.installs,
    installsKeys: rawDevice.modules?.installs ? Object.keys(rawDevice.modules.installs) : 'no installs'
  })
  const installs = extractInstalls(rawDevice.modules)  // FIXES status capitalization
  console.log('✅ Installs extraction complete')

  // Core device info
  const mappedDevice: ProcessedDeviceInfo = {
    // Core identifiers
    deviceId: rawDevice.deviceId,
    serialNumber: rawDevice.serialNumber,
    name: inventory.deviceName || rawDevice.serialNumber || 'Unknown Device',
    
    // Status and timestamps  
    lastSeen: validLastSeen,
    status: deviceStatus,
    createdAt: rawDevice.createdAt,
    
    // Client information
    clientVersion: rawDevice.clientVersion,
    
    // Pass through modules (source of truth)
    modules: rawDevice.modules,
    
    // Processed modular data (easy access)
    hardware,
    network,
    system,
    inventory,
    installs,  // CONTAINS PROPERLY CAPITALIZED STATUSES
    
    // Legacy compatibility fields (deprecated)
    model: hardware.processor,
    os: system.operatingSystem?.name || '',
    platform: system.operatingSystem?.version || '',
    uptime: system.bootTime || '',
    location: inventory.location,
    assetTag: inventory.assetTag,
    ipAddress: network.ipAddress,
    macAddress: network.macAddress,
    totalEvents: 0,
    lastEventTime: validLastSeen,
    processor: hardware.processor,
    processorSpeed: hardware.processorSpeed,
    cores: hardware.cores,
    memory: hardware.memory,
    availableRAM: hardware.availableRAM,
    storage: hardware.storage,
    graphics: hardware.graphics,
    architecture: hardware.architecture,
    batteryLevel: hardware.batteryLevel,
    batteryHealth: hardware.batteryHealth,
    batteryCycleCount: hardware.batteryCycleCount,
    isCharging: hardware.isCharging,
    bootTime: hardware.bootTime
  }

  // Process additional modular data
  if (rawDevice.modules?.applications?.installed_applications) {
    mappedDevice.applications = extractApplications(rawDevice)
  }

  if (rawDevice.modules?.peripherals || rawDevice.modules?.displays || rawDevice.modules?.printers) {
    mappedDevice.peripherals = extractHardware(rawDevice)
  }

  console.log('🧩 MODULAR DEVICE MAPPER - Processing complete:', {
    deviceId: mappedDevice.deviceId,
    serialNumber: mappedDevice.serialNumber,
    status: mappedDevice.status,
    modulesProcessed: {
      hardware: !!mappedDevice.hardware && Object.keys(mappedDevice.hardware).length > 0,
      network: !!mappedDevice.network && Object.keys(mappedDevice.network).length > 0,
      system: !!mappedDevice.system && Object.keys(mappedDevice.system).length > 0,
      inventory: !!mappedDevice.inventory && Object.keys(mappedDevice.inventory).length > 0,
      installs: !!mappedDevice.installs && mappedDevice.installs.totalPackages > 0
    },
    installsStatus: mappedDevice.installs ? {
      totalPackages: mappedDevice.installs.totalPackages,
      statusBreakdown: {
        installed: mappedDevice.installs.installed,
        pending: mappedDevice.installs.pending,
        failed: mappedDevice.installs.failed
      }
    } : 'No installs data'
  })

  return mappedDevice
}

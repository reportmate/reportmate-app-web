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
import { extractSecurity, type SecurityInfo } from './modules/security'
import { extractManagement, type ManagementInfo } from './modules/management'
import { extractProfiles, type ProfilesInfo } from './modules/profiles'

export interface ProcessedDeviceInfo {
  // Core identifiers
  deviceId: string
  serialNumber: string
  name: string
  
  // Status and timestamps
  lastSeen: string
  status: DeviceStatus
  createdAt?: string
  registrationDate?: string  // Alias for createdAt for clearer UI display
  
  // Archive status
  archived?: boolean
  archivedAt?: string
  
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
  security?: SecurityInfo
  management?: ManagementInfo
  profiles?: ProfilesInfo
  
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
    throw new Error('VALIDATION FAILED: No device data provided')
  }
  
  if (!rawDevice.modules) {
    console.error('STRUCTURE VIOLATION: Device data missing modules object', {
      deviceId: rawDevice.deviceId,
      serialNumber: rawDevice.serialNumber,
      availableKeys: Object.keys(rawDevice)
    })
    throw new Error('Device data missing required modules structure')
  }
}

/**
 * Modular Device Mapper
 * Each aspect is processed by dedicated modules
 * 
 * Pass the full modules object to each extractor
 * Each extractor expects: { hardware: {...}, system: {...}, etc. }
 * NOT the individual module data directly
 */
/**
 * Infer platform from hardware module data when no explicit platform is set
 */
function inferPlatformFromHardware(modules: any): string | undefined {
  const modelName = modules?.hardware?.system?.model_name || modules?.hardware?.model || ''
  if (modelName) {
    const lower = modelName.toLowerCase()
    if (lower.includes('mac') || lower.includes('imac')) return 'macOS'
  }
  const vendor = modules?.hardware?.system?.hardware_vendor || modules?.hardware?.manufacturer || ''
  if (vendor && vendor.toLowerCase().includes('apple')) return 'macOS'
  return undefined
}

export function mapDeviceData(rawDevice: any): ProcessedDeviceInfo {
  // Extract modules data with correct nesting
  const modules = rawDevice.modules || {}
  
  // Pass modules object to each extractor in the format it expects
  // extractHardware, extractSecurity expect: { hardware: {...} } directly (modules)
  // extractSystem, extractNetwork expect: { modules: { system: {...} } } (wrapped)
  const inventory = extractInventory(modules)
  const system = extractSystem({ modules })
  const hardware = extractHardware(modules)
  const network = extractNetwork({ modules })  // extractNetwork expects deviceModules.modules.network
  const security = extractSecurity(modules)
  const applications = extractApplications(modules)
  const management = extractManagement(modules)
  const installs = extractInstalls(modules)
  const profiles = extractProfiles(modules)
  
  const finalName = inventory.deviceName
    || rawDevice.name
    || modules.hardware?.system?.computer_name
    || modules.hardware?.system?.hostname
    || modules.network?.hostname
    || rawDevice.serialNumber
    || 'Unknown Device'
  
  // Calculate status using centralized logic (single source of truth)
  const normalizedLastSeen = normalizeLastSeen(rawDevice.lastSeen)
  const calculatedStatus = calculateDeviceStatus(normalizedLastSeen)
  
  return {
    // Core identifiers  
    deviceId: rawDevice.deviceId,
    serialNumber: rawDevice.serialNumber || 'Unknown',
    name: finalName,
    
    // Platform (required for macOS/Windows-specific UI features like btmdbHealth)
    platform: rawDevice.platform || inferPlatformFromHardware(modules),
    
    // Status and timestamps
    lastSeen: normalizedLastSeen,
    status: rawDevice.archived ? 'archived' : calculatedStatus,
    createdAt: rawDevice.createdAt,
    registrationDate: rawDevice.createdAt,  // Alias for clearer display
    
    // Archive status
    archived: rawDevice.archived || false,
    archivedAt: rawDevice.archivedAt,
    
    // Client information
    clientVersion: rawDevice.clientVersion,
    
    // Required properties
    totalEvents: 0,
    lastEventTime: rawDevice.lastSeen || new Date().toISOString(),
    
    // Module data
    inventory,
    system,
    hardware,
    network,
    security,
    applications,
    management,
    installs,
    profiles,
    
    // Keep original modules for any unprocessed data
    modules: modules
  }
}

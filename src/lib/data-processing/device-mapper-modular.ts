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
 * MODULAR Device Mapper - NEW ARCHITECTURE
 * Each aspect is processed by dedicated modules
 */
export function mapDeviceData(rawDevice: any): ProcessedDeviceInfo {
  // Extract modules data with correct nesting
  const modules = rawDevice.modules || {}
  
  // FIXED: Extract inventory from the correct nested path
  const inventory = extractInventory(modules.inventory || {})
  const system = extractSystem(modules.system || {})
  const hardware = extractHardware(modules.hardware || {})
  const network = extractNetwork(modules.network || {})
  const security = extractSecurity(modules.security || {})
  const applications = extractApplications(modules.applications || {})
  const management = extractManagement(modules.management || {})
  const installs = extractInstalls(modules.installs || {})
  const profiles = extractProfiles(modules.profiles || {})
  
  const finalName = inventory.deviceName || rawDevice.name || rawDevice.serialNumber || 'Unknown Device'
  
  // Calculate status using centralized logic (single source of truth)
  const normalizedLastSeen = normalizeLastSeen(rawDevice.lastSeen)
  const calculatedStatus = calculateDeviceStatus(normalizedLastSeen)
  
  return {
    // Core identifiers  
    deviceId: rawDevice.deviceId,
    serialNumber: rawDevice.serialNumber || 'Unknown',
    name: finalName,
    
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

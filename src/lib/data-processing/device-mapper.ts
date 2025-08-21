/**
 * Device data mapper - Maps raw API device data to the format expected by components
 * NEW CLEAN VERSION - modules are the source of truth, no duplicate data
 */

import { processApplicationsData, processPeripheralsData, processInstallsData } from './component-data'

/**
 * Validates that device data follows the standardized nested structure
 * CRITICAL: Prevents flat structure access that causes inconsistencies
 */
export function validateDeviceStructure(rawDevice: any): void {
  if (!rawDevice) {
    throw new Error('🚨 VALIDATION FAILED: No device data provided')
  }
  
  if (!rawDevice.modules) {
    console.error('🚨 STRUCTURE VIOLATION: Device data is missing required modules object', {
      deviceId: rawDevice.deviceId,
      serialNumber: rawDevice.serialNumber,
      hasInventory: !!rawDevice.inventory,
      hasHardware: !!rawDevice.hardware,
      availableKeys: Object.keys(rawDevice)
    })
    throw new Error('🚨 CRITICAL: Device data missing required modules structure. API must return nested format: device.modules.*')
  }

  // Development warnings for potential flat structure leakage
  if (process.env.NODE_ENV === 'development') {
    const flatProperties = ['inventory', 'hardware', 'security', 'applications', 'system', 'network', 'management']
    const foundFlat = flatProperties.filter(prop => rawDevice[prop] && !rawDevice.modules[prop])
    
    if (foundFlat.length > 0) {
      console.error('🚨 FLAT STRUCTURE DETECTED: Found flat properties that should be in modules:', {
        flatProperties: foundFlat,
        deviceId: rawDevice.deviceId,
        serialNumber: rawDevice.serialNumber
      })
    }
  }
}

export interface ProcessedDeviceInfo {
  deviceId: string     // Internal UUID (unique)
  serialNumber: string // Human-readable unique identifier
  name: string
  model?: string
  os?: string
  platform?: string
  lastSeen: string
  status: 'active' | 'stale' | 'warning' | 'error' | 'missing'
  uptime?: string
  location?: string
  assetTag?: string
  createdAt?: string
  ipAddress?: string
  macAddress?: string
  totalEvents: number
  lastEventTime: string
  // Hardware properties (from modules only)
  processor?: string
  processorSpeed?: string
  cores?: number
  memory?: string
  availableRAM?: string
  memorySlots?: string
  storage?: string
  availableStorage?: string
  storageType?: string
  graphics?: string
  vram?: string
  npu?: string
  npuManufacturer?: string
  npuArchitecture?: string
  npuComputeUnits?: number
  resolution?: string
  architecture?: string
  diskUtilization?: number
  memoryUtilization?: number
  cpuUtilization?: number
  temperature?: number
  batteryLevel?: number
  batteryHealth?: string
  batteryCycleCount?: number
  isCharging?: boolean
  bootTime?: string
  // Module data (source of truth)
  modules?: any
  // Legacy compatibility fields
  [key: string]: any
}

/**
 * Maps raw device data from the STANDARDIZED nested API structure to component-friendly format
 * ENFORCED STRUCTURE: device.modules.* is the ONLY source of truth
 * NO FALLBACKS: Components must expect consistent nested structure
 */
export function mapDeviceData(rawDevice: any): ProcessedDeviceInfo {
  console.log('🚨 STANDARDIZED DEVICE MAPPER - Enforcing nested structure only');
  console.log('mapDeviceData input - NESTED STRUCTURE REQUIRED:', {
    deviceId: rawDevice.deviceId,
    serialNumber: rawDevice.serialNumber,
    hasModules: !!rawDevice.modules,
    moduleKeys: rawDevice.modules ? Object.keys(rawDevice.modules) : [],
    structureValid: !!rawDevice.modules,
    sample: JSON.stringify(rawDevice).substring(0, 500)
  })

  if (!rawDevice) {
    throw new Error('No device data provided to mapper')
  }

  // CRITICAL: Validate structure before processing
  validateDeviceStructure(rawDevice)

  // Helper function to safely get nested values
  const getNestedValue = (obj: any, path: string) => {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  // Determine device status - prefer API-provided status, fallback to calculation
  const getDeviceStatus = (rawDevice: any): 'active' | 'stale' | 'warning' | 'error' | 'missing' => {
    // Use API-provided status if available and valid
    const apiStatus = rawDevice.status
    if (apiStatus && ['active', 'stale', 'warning', 'error', 'missing'].includes(apiStatus)) {
      return apiStatus as 'active' | 'stale' | 'warning' | 'error' | 'missing'
    }
    
    // Fallback to calculation based on lastSeen (aligned with backend logic)
    const lastSeen = rawDevice.lastSeen
    if (!lastSeen) return 'missing'
    
    const lastSeenDate = new Date(lastSeen)
    const now = new Date()
    const diffHours = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60 * 60)
    
    // Match backend logic: 24h/7d thresholds
    if (diffHours < 24) return 'active'      // < 24 hours
    if (diffHours < 24 * 7) return 'stale'  // 24 hours - 7 days
    return 'missing'                         // 7+ days
  }

  // Extract basic device information with robust lastSeen handling
  const lastSeenValue = rawDevice.lastSeen
  let validLastSeen: string
  
  // Handle various invalid lastSeen values
  if (!lastSeenValue || 
      lastSeenValue === 'null' || 
      lastSeenValue === 'undefined' || 
      lastSeenValue === '' ||
      (typeof lastSeenValue === 'string' && lastSeenValue.trim() === '') ||
      (lastSeenValue instanceof Date && isNaN(lastSeenValue.getTime())) ||
      (typeof lastSeenValue === 'string' && isNaN(new Date(lastSeenValue).getTime()))) {
    
    console.warn('Invalid lastSeen value detected:', lastSeenValue, 'using current time as fallback')
    validLastSeen = new Date().toISOString()
  } else {
    validLastSeen = typeof lastSeenValue === 'string' ? lastSeenValue : new Date(lastSeenValue).toISOString()
  }

  // STANDARDIZED STRUCTURE: Only nested modules access, no fallbacks to flat structure
  if (!rawDevice.modules) {
    throw new Error('🚨 CRITICAL: Device data missing required modules structure. API must return nested format: device.modules.*')
  }

  const mappedDevice: ProcessedDeviceInfo = {
    deviceId: rawDevice.deviceId,                                    // Internal UUID
    serialNumber: rawDevice.serialNumber,                           // Human-readable ID  
    name: rawDevice.modules?.inventory?.deviceName || rawDevice.serialNumber || 'Unknown Device',
    
    // All other data comes from modules - no more duplication
    model: rawDevice.modules?.hardware?.model,
    os: rawDevice.modules?.system?.operatingSystem?.name,
    platform: rawDevice.modules?.system?.operatingSystem?.platform,
    lastSeen: validLastSeen,
    status: getDeviceStatus(rawDevice),
    uptime: rawDevice.modules?.system?.uptimeString,
    location: rawDevice.modules?.inventory?.location,
    assetTag: rawDevice.modules?.inventory?.assetTag,
    createdAt: rawDevice.createdAt,
    ipAddress: rawDevice.modules?.network?.primaryInterface?.ipAddress,
    macAddress: rawDevice.modules?.network?.primaryInterface?.macAddress,
    totalEvents: 0, // Will be populated from events API
    lastEventTime: validLastSeen,
    
    // Hardware information from modules
    processor: rawDevice.modules?.hardware?.processor?.name,
    processorSpeed: rawDevice.modules?.hardware?.processor?.speed,
    cores: rawDevice.modules?.hardware?.processor?.cores,
    memory: rawDevice.modules?.hardware?.memory?.totalPhysical ? 
      `${Math.round(rawDevice.modules.hardware.memory.totalPhysical / (1024*1024*1024))} GB` : undefined,
    availableRAM: rawDevice.modules?.hardware?.memory?.availablePhysical ?
      `${Math.round(rawDevice.modules.hardware.memory.availablePhysical / (1024*1024*1024))} GB` : undefined,
    storage: rawDevice.modules?.hardware?.storage?.[0] ? (() => {
      const mainDrive = rawDevice.modules.hardware.storage[0]
      const totalGB = Math.round(mainDrive.capacity / (1024*1024*1024))
      const freeGB = Math.round((mainDrive.freeSpace || 0) / (1024*1024*1024))
      return freeGB > 0 ? `${totalGB} GB ${mainDrive.type || 'Drive'} • ${freeGB} GB free` : `${totalGB} GB ${mainDrive.type || 'Drive'}`
    })() : undefined,
    graphics: rawDevice.modules?.hardware?.graphics?.name,
    architecture: rawDevice.modules?.system?.operatingSystem?.architecture,
    batteryLevel: rawDevice.modules?.hardware?.battery?.chargePercent,
    batteryHealth: rawDevice.modules?.hardware?.battery?.health,
    batteryCycleCount: rawDevice.modules?.hardware?.battery?.cycleCount,
    isCharging: rawDevice.modules?.hardware?.battery?.isCharging,
    bootTime: rawDevice.modules?.system?.operatingSystem?.bootTime
  }

  // Pass through the modules as-is - they are the source of truth
  if (rawDevice.modules) {
    ;(mappedDevice as any).modules = rawDevice.modules
  }

  // Process modular data into widget-friendly format
  // Applications data processing
  if (rawDevice.modules?.applications?.installed_applications) {
    const applicationsData = processApplicationsData(rawDevice);
    ;(mappedDevice as any).applications = applicationsData
  }

  // Peripherals data processing
  if (rawDevice.modules?.peripherals || rawDevice.modules?.displays || rawDevice.modules?.printers) {
    const peripheralsData = processPeripheralsData(rawDevice);
    ;(mappedDevice as any).peripherals = peripheralsData
  }

  // Installs data processing - CRITICAL for managed installs display
  // STANDARDIZED: Only check nested modules structure
  if (rawDevice.modules?.installs) {
    const installsData = processInstallsData(rawDevice);
    ;(mappedDevice as any).installs = installsData
    console.log('🔧 DeviceMapper: Processed installs data from modules.installs:', {
      totalPackages: installsData.totalPackages,
      hasConfig: !!installsData.config,
      systemName: installsData.systemName
    })
  } else {
    console.log('🔧 DeviceMapper: No installs data found in required location: rawDevice.modules.installs')
  }

  console.log('DeviceMapper STANDARDIZED - Nested structure enforced:', {
    deviceId: mappedDevice.deviceId,
    serialNumber: mappedDevice.serialNumber,
    name: mappedDevice.name,
    hasModules: !!(mappedDevice as any).modules,
    moduleKeys: (mappedDevice as any).modules ? Object.keys((mappedDevice as any).modules) : [],
    structureCompliant: !!(mappedDevice as any).modules
  })

  return mappedDevice
}

/**
 * Device data mapper - Maps raw API device data to the format expected by components
 * NEW CLEAN VERSION - modules are the source of truth, no duplicate data
 */

export interface ProcessedDeviceInfo {
  deviceId: string     // Internal UUID (unique)
  serialNumber: string // Human-readable unique identifier
  name: string
  model?: string
  os?: string
  platform?: string
  lastSeen: string
  status: 'online' | 'offline' | 'warning' | 'error'
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
 * Maps raw device data from the clean API structure to component-friendly format
 * NEW APPROACH: Only essential data duplicated, everything else comes from modules
 */
export function mapDeviceData(rawDevice: any): ProcessedDeviceInfo {
  console.log('🚨🚨🚨 CLEAN DEVICE MAPPER CALLED! 🚨🚨🚨');
  console.log('mapDeviceData input - NEW CLEAN STRUCTURE:', {
    deviceId: rawDevice.deviceId,
    serialNumber: rawDevice.serialNumber,
    hasModules: !!rawDevice.modules,
    moduleKeys: rawDevice.modules ? Object.keys(rawDevice.modules) : [],
    rawDeviceKeys: Object.keys(rawDevice),
    sample: JSON.stringify(rawDevice).substring(0, 500)
  })

  if (!rawDevice) {
    throw new Error('No device data provided to mapper')
  }

  // Helper function to safely get nested values
  const getNestedValue = (obj: any, path: string) => {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  // Determine device status based on last_seen timestamp
  const getDeviceStatus = (lastSeen: string): 'online' | 'offline' | 'warning' | 'error' => {
    if (!lastSeen) return 'offline'
    
    const lastSeenDate = new Date(lastSeen)
    const now = new Date()
    const diffMinutes = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60)
    
    if (diffMinutes < 5) return 'online'
    if (diffMinutes < 60) return 'warning'
    return 'offline'
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

  // Use CLEAN structure - only deviceId and serialNumber, get everything else from modules
  const mappedDevice: ProcessedDeviceInfo = {
    deviceId: rawDevice.deviceId,                                    // Internal UUID
    serialNumber: rawDevice.serialNumber,                           // Human-readable ID  
    name: rawDevice.name || rawDevice.modules?.inventory?.deviceName || rawDevice.serialNumber || 'Unknown Device',
    
    // All other data comes from modules - no more duplication
    model: rawDevice.modules?.hardware?.model,
    os: rawDevice.modules?.system?.operatingSystem?.name,
    platform: rawDevice.modules?.system?.operatingSystem?.platform,
    lastSeen: validLastSeen,
    status: getDeviceStatus(validLastSeen),
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

  console.log('DeviceMapper DEBUG - Clean mapped device:', {
    deviceId: mappedDevice.deviceId,
    serialNumber: mappedDevice.serialNumber,
    name: mappedDevice.name,
    hasModules: !!(mappedDevice as any).modules,
    moduleKeys: (mappedDevice as any).modules ? Object.keys((mappedDevice as any).modules) : []
  })

  return mappedDevice
}

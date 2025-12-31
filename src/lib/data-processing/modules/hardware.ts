/**
 * Hardware Data Module
 * Handles all hardware data extraction and formatting in isolation
 */

export interface HardwareInfo {
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
}

/**
 * Extract hardware information from device modules
 * MODULAR: Self-contained hardware data processing
 */
/**
 * Extract hardware information from device modules
 * READER ONLY: Expects device to provide pre-processed, clean data
 */
export function extractHardware(deviceModules: any): HardwareInfo {
  if (!deviceModules?.hardware) {
    console.log('[HARDWARE MODULE] No hardware data found in modules')
    return {}
  }

  const hardware = deviceModules.hardware
  const system = deviceModules.system
  
  console.log('[HARDWARE MODULE] Processing hardware data:', {
    hasProcessor: !!hardware.processor,
    hasMemory: !!hardware.memory,
    hasStorage: !!hardware.storage,
    hasGraphics: !!hardware.graphics,
    hasBattery: !!hardware.battery
  })

  const hardwareInfo: HardwareInfo = {
    processor: hardware.processor?.name,
    processorSpeed: hardware.processor?.speed,
    cores: hardware.processor?.cores,
    architecture: system?.operatingSystem?.architecture,
    bootTime: system?.operatingSystem?.bootTime
  }

  // Memory processing - supports both snake_case (Mac osquery) and camelCase (Windows)
  if (hardware.memory) {
    // Mac sends physical_memory, Windows sends totalPhysical
    const totalMem = hardware.memory.physical_memory ?? hardware.memory.totalPhysical
    if (totalMem) {
      hardwareInfo.memory = `${Math.round(totalMem / (1024*1024*1024))} GB`
    }
    if (hardware.memory.availablePhysical) {
      hardwareInfo.availableRAM = `${Math.round(hardware.memory.availablePhysical / (1024*1024*1024))} GB`
    }
  }

  // Storage processing - supports both snake_case (Mac osquery) and camelCase (Windows)
  if (hardware.storage?.[0]) {
    const mainDrive = hardware.storage[0]
    // Mac sends size, Windows sends capacity
    const capacity = mainDrive.size ?? mainDrive.capacity
    // Mac sends free_space, Windows sends freeSpace
    const freeSpace = mainDrive.free_space ?? mainDrive.freeSpace
    const totalGB = Math.round(capacity / (1024*1024*1024))
    const freeGB = Math.round((freeSpace || 0) / (1024*1024*1024))
    hardwareInfo.storage = freeGB > 0 
      ? `${totalGB} GB ${mainDrive.type || 'Drive'} ${freeGB} GB free` 
      : `${totalGB} GB ${mainDrive.type || 'Drive'}`
  }

  // Graphics processing
  if (hardware.graphics) {
    hardwareInfo.graphics = hardware.graphics.name
    hardwareInfo.vram = hardware.graphics.vram
  }

  // NPU processing
  if (hardware.npu) {
    hardwareInfo.npu = hardware.npu.name
    hardwareInfo.npuManufacturer = hardware.npu.manufacturer
    hardwareInfo.npuArchitecture = hardware.npu.architecture
    hardwareInfo.npuComputeUnits = hardware.npu.computeUnits
  }

  // Battery processing - supports both osquery snake_case (Mac) and legacy camelCase (Windows)
  if (hardware.battery) {
    // osquery uses percent_remaining, Windows uses chargePercent
    hardwareInfo.batteryLevel = hardware.battery.percent_remaining ?? hardware.battery.chargePercent
    hardwareInfo.batteryHealth = hardware.battery.health
    // osquery uses cycle_count, Windows uses cycleCount
    hardwareInfo.batteryCycleCount = hardware.battery.cycle_count ?? hardware.battery.cycleCount
    // osquery uses charging (0/1), Windows uses isCharging (boolean)
    hardwareInfo.isCharging = hardware.battery.charging === 1 || hardware.battery.isCharging === true
  }

  // Performance metrics
  if (hardware.performance) {
    hardwareInfo.diskUtilization = hardware.performance.diskUtilization
    hardwareInfo.memoryUtilization = hardware.performance.memoryUtilization
    hardwareInfo.cpuUtilization = hardware.performance.cpuUtilization
    hardwareInfo.temperature = hardware.performance.temperature
  }

  console.log('[HARDWARE MODULE] Hardware info extracted:', Object.keys(hardwareInfo))
  return hardwareInfo
}

/**
 * Hardware Data Module
 * Handles all hardware data extraction and formatting in isolation
 */

export interface HardwareInfo {
  processor?: string
  processorSpeed?: string
  cores?: number
  logicalProcessors?: number
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
        return {}
  }

  const hardware = deviceModules.hardware
  const system = deviceModules.system
  
  
  const hardwareInfo: HardwareInfo = {
    processor: hardware.processor?.name,
    // Support both snake_case and camelCase for processor speed
    processorSpeed: hardware.processor?.speed || hardware.processor?.base_speed || hardware.processor?.baseSpeed,
    cores: hardware.processor?.cores,
    // Support snake_case logical_processors
    logicalProcessors: hardware.processor?.logical_processors || hardware.processor?.logicalProcessors,
    architecture: system?.operating_system?.architecture || system?.operatingSystem?.architecture,
    bootTime: system?.operating_system?.bootTime || system?.operatingSystem?.bootTime || system?.boot_time
  }

  // Memory processing - supports both snake_case (osquery/new) and camelCase (legacy)
  if (hardware.memory) {
    // Support: physicalMemory (normalized from physical_memory), total_physical (snake_case), totalPhysical (camelCase), physical_memory (Mac raw)
    const totalMem = hardware.memory.physicalMemory ?? hardware.memory.physical_memory ?? hardware.memory.total_physical ?? hardware.memory.totalPhysical
    if (totalMem) {
      hardwareInfo.memory = `${Math.round(totalMem / (1024*1024*1024))} GB`
    }
    // Support: available_physical (snake_case), availablePhysical (camelCase)
    const availMem = hardware.memory.availablePhysical ?? hardware.memory.available_physical
    if (availMem) {
      hardwareInfo.availableRAM = `${Math.round(availMem / (1024*1024*1024))} GB`
    }
  }

  // Storage processing - supports both snake_case (Mac osquery) and camelCase (Windows)
  if (hardware.storage?.[0]) {
    const mainDrive = hardware.storage[0]
    // Mac sends size, Windows sends capacity
    const capacity = mainDrive.size ?? mainDrive.capacity
    // After normalization: freeSpace (from free_space)
    const freeSpace = mainDrive.freeSpace ?? mainDrive.free_space
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

  // NPU processing - supports both snake_case and camelCase
  if (hardware.npu) {
    hardwareInfo.npu = hardware.npu.name
    hardwareInfo.npuManufacturer = hardware.npu.manufacturer
    hardwareInfo.npuArchitecture = hardware.npu.architecture
    // Support: compute_units (snake_case), computeUnits (camelCase)
    hardwareInfo.npuComputeUnits = hardware.npu.compute_units ?? hardware.npu.computeUnits
  }

  // Battery processing - supports both snake_case (osquery) and camelCase (legacy)
  if (hardware.battery) {
    // Support: percent_remaining (snake_case), chargePercent (camelCase)
    hardwareInfo.batteryLevel = hardware.battery.percent_remaining ?? hardware.battery.chargePercent
    hardwareInfo.batteryHealth = hardware.battery.health
    // Support: cycle_count (snake_case), cycleCount (camelCase)
    hardwareInfo.batteryCycleCount = hardware.battery.cycle_count ?? hardware.battery.cycleCount
    // Support: charging (0/1 from osquery), isCharging (boolean from legacy)
    hardwareInfo.isCharging = hardware.battery.charging === 1 || hardware.battery.isCharging === true
  }

  // Performance metrics - supports both snake_case and camelCase
  if (hardware.performance) {
    hardwareInfo.diskUtilization = hardware.performance.disk_utilization ?? hardware.performance.diskUtilization
    hardwareInfo.memoryUtilization = hardware.performance.memory_utilization ?? hardware.performance.memoryUtilization
    hardwareInfo.cpuUtilization = hardware.performance.cpu_utilization ?? hardware.performance.cpuUtilization
    hardwareInfo.temperature = hardware.performance.temperature
  }

    return hardwareInfo
}

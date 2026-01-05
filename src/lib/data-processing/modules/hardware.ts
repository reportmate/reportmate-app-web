/**
 * Hardware Data Module
 * Handles all hardware data extraction and formatting in isolation
 * 
 * SNAKE_CASE: All properties match API response format directly
 */

export interface HardwareInfo {
  // Processor
  processor?: string
  processor_speed?: string
  cores?: number
  architecture?: string
  logical_processors?: number
  max_speed?: number
  base_speed?: number
  
  // Memory
  memory?: string
  available_ram?: string
  total_physical?: number
  total_virtual?: number
  available_physical?: number
  available_virtual?: number
  memory_modules?: Array<{
    type?: string
    speed?: number
    capacity?: number
    location?: string
    manufacturer?: string
  }>
  
  // Storage
  storage?: string
  available_storage?: string
  storage_type?: string
  
  // Graphics
  graphics?: string
  vram?: string
  driver_version?: string
  driver_date?: string
  memory_size?: number
  
  // NPU
  npu?: string
  npu_manufacturer?: string
  npu_architecture?: string
  npu_compute_units?: number
  npu_is_available?: boolean
  
  // Display
  resolution?: string
  
  // Performance
  disk_utilization?: number
  memory_utilization?: number
  cpu_utilization?: number
  temperature?: number
  
  // Battery
  battery_level?: number
  battery_health?: string
  battery_cycle_count?: number
  is_charging?: boolean
  
  // Metadata
  model?: string
  manufacturer?: string
  boot_time?: string
  collected_at?: string
  device_id?: string
  module_id?: string
}

/**
 * Extract hardware information from device modules
 * READER ONLY: Expects device to provide pre-processed, clean snake_case data
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
    hasNpu: !!hardware.npu
  })

  const hardwareInfo: HardwareInfo = {
    // Model and manufacturer
    model: hardware.model,
    manufacturer: hardware.manufacturer,
    
    // Processor - snake_case from API
    processor: hardware.processor?.name,
    cores: hardware.processor?.cores,
    architecture: hardware.processor?.architecture,
    logical_processors: hardware.processor?.logical_processors,
    max_speed: hardware.processor?.max_speed,
    base_speed: hardware.processor?.base_speed,
    boot_time: system?.operating_system?.boot_time,
    
    // Metadata
    collected_at: hardware.collected_at,
    device_id: hardware.device_id,
    module_id: hardware.module_id
  }

  // Memory processing - snake_case from API
  if (hardware.memory) {
    hardwareInfo.total_physical = hardware.memory.total_physical
    hardwareInfo.total_virtual = hardware.memory.total_virtual
    hardwareInfo.available_physical = hardware.memory.available_physical
    hardwareInfo.available_virtual = hardware.memory.available_virtual
    hardwareInfo.memory_modules = hardware.memory.modules
    
    // Format for display
    if (hardware.memory.total_physical) {
      hardwareInfo.memory = `${Math.round(hardware.memory.total_physical / (1024*1024*1024))} GB`
    }
    if (hardware.memory.available_physical) {
      hardwareInfo.available_ram = `${Math.round(hardware.memory.available_physical / (1024*1024*1024))} GB`
    }
  }

  // Storage processing - snake_case from API
  if (hardware.storage?.[0]) {
    const mainDrive = hardware.storage[0]
    const totalGB = Math.round(mainDrive.capacity / (1024*1024*1024))
    const freeGB = Math.round((mainDrive.free_space || 0) / (1024*1024*1024))
    hardwareInfo.storage = freeGB > 0 
      ? `${totalGB} GB ${mainDrive.type || 'Drive'} ${freeGB} GB free` 
      : `${totalGB} GB ${mainDrive.type || 'Drive'}`
    hardwareInfo.storage_type = mainDrive.type
  }

  // Graphics processing - snake_case from API
  if (hardware.graphics) {
    hardwareInfo.graphics = hardware.graphics.name
    hardwareInfo.memory_size = hardware.graphics.memory_size
    hardwareInfo.driver_version = hardware.graphics.driver_version
    hardwareInfo.driver_date = hardware.graphics.driver_date
    if (hardware.graphics.memory_size) {
      hardwareInfo.vram = `${hardware.graphics.memory_size} GB`
    }
  }

  // NPU processing - snake_case from API
  if (hardware.npu) {
    hardwareInfo.npu = hardware.npu.name
    hardwareInfo.npu_manufacturer = hardware.npu.manufacturer
    hardwareInfo.npu_architecture = hardware.npu.architecture
    hardwareInfo.npu_compute_units = hardware.npu.compute_units
    hardwareInfo.npu_is_available = hardware.npu.is_available
  }

  // Battery processing - snake_case from API
  if (hardware.battery) {
    hardwareInfo.battery_level = hardware.battery.charge_percent
    hardwareInfo.battery_health = hardware.battery.health
    hardwareInfo.battery_cycle_count = hardware.battery.cycle_count
    hardwareInfo.is_charging = hardware.battery.is_charging
  }

  // Performance metrics - snake_case from API
  if (hardware.performance) {
    hardwareInfo.disk_utilization = hardware.performance.disk_utilization
    hardwareInfo.memory_utilization = hardware.performance.memory_utilization
    hardwareInfo.cpu_utilization = hardware.performance.cpu_utilization
    hardwareInfo.temperature = hardware.performance.temperature
  }

  console.log('[HARDWARE MODULE] Hardware info extracted:', Object.keys(hardwareInfo))
  return hardwareInfo
}

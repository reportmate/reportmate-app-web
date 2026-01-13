/**
 * Performance Module - Reader Only
 * Frontend reads pre-processed performance data from device collection
 * NO heavy processing - device should provide clean, standardized performance metrics
 */

export interface PerformanceInfo {
  cpu: CpuPerformance
  memory: MemoryPerformance
  disk: DiskPerformance[]
  network: NetworkPerformance
  processes: ProcessInfo[]
  systemLoad: SystemLoad
  bootTime: BootTimeInfo
  thermals: ThermalInfo
  power: PowerInfo
  uptime: UptimeInfo
  summary: PerformanceSummary
}

export interface CpuPerformance {
  usage: number  // Current percentage
  averageUsage: number  // Average over collection period
  peakUsage: number
  cores: number
  threads: number
  frequency: number  // Current MHz
  baseFrequency: number  // Base MHz
  maxFrequency: number  // Max MHz
  temperature?: number  // Celsius
  topProcesses: TopProcess[]
}

export interface MemoryPerformance {
  totalRam: number  // Bytes
  usedRam: number
  freeRam: number
  availableRam: number
  usagePercentage: number
  committedMemory: number
  cachedMemory: number
  pagedPool: number
  nonPagedPool: number
  virtualMemory: {
    total: number
    used: number
    available: number
  }
  pageFile: {
    total: number
    used: number
    peak: number
  }
  topProcesses: TopProcess[]
}

export interface DiskPerformance {
  drive: string  // C:, D:, etc.
  name: string
  totalSpace: number  // Bytes
  usedSpace: number
  freeSpace: number
  usagePercentage: number
  readSpeed: number  // MB/s
  writeSpeed: number  // MB/s
  iops: number  // Input/Output operations per second
  responseTime: number  // milliseconds
  queueLength: number
  temperature?: number  // Celsius
  health: 'healthy' | 'warning' | 'critical' | 'failing'
  type: 'hdd' | 'ssd' | 'nvme' | 'usb' | 'network'
}

export interface NetworkPerformance {
  totalBytesReceived: number
  totalBytesSent: number
  currentDownloadSpeed: number  // bytes/sec
  currentUploadSpeed: number  // bytes/sec
  peakDownloadSpeed: number
  peakUploadSpeed: number
  packetsReceived: number
  packetsSent: number
  packetsLost: number
  latency: number  // milliseconds
  adapters: NetworkAdapterPerformance[]
}

export interface NetworkAdapterPerformance {
  name: string
  bytesReceived: number
  bytesSent: number
  packetsReceived: number
  packetsSent: number
  errors: number
  discards: number
  utilization: number  // percentage
  speed: number  // Mbps
  status: 'up' | 'down' | 'unknown'
}

export interface ProcessInfo {
  name: string
  pid: number
  cpu: number  // percentage
  memory: number  // bytes
  handles: number
  threads: number
  startTime?: string
  user?: string
  priority: string
  status: 'running' | 'sleeping' | 'stopped' | 'zombie'
  commandLine?: string
}

export interface TopProcess {
  name: string
  pid: number
  usage: number  // percentage of resource (CPU or Memory)
}

export interface SystemLoad {
  oneMinute: number
  fiveMinute: number
  fifteenMinute: number
  processQueue: number
  contextSwitches: number
  interrupts: number
  systemCalls: number
}

export interface BootTimeInfo {
  lastBootTime: string
  bootDuration: number  // seconds
  fastBoot: boolean
  hibernationUsed: boolean
  bootType: 'cold' | 'warm' | 'hibernate' | 'sleep'
}

export interface ThermalInfo {
  cpuTemperature?: number  // Celsius
  gpuTemperature?: number
  systemTemperature?: number
  fanSpeeds: FanInfo[]
  thermalThrottling: boolean
  overheating: boolean
}

export interface FanInfo {
  name: string
  speed: number  // RPM
  percentage: number  // 0-100
  status: 'normal' | 'high' | 'critical' | 'failed'
}

export interface PowerInfo {
  batteryPresent: boolean
  batteryLevel?: number  // percentage
  batteryStatus?: 'charging' | 'discharging' | 'full' | 'low' | 'critical'
  powerSource: 'battery' | 'ac' | 'ups' | 'unknown'
  estimatedTimeRemaining?: number  // minutes
  powerPlan: string
  cpuPowerManagement: boolean
  screenBrightness?: number  // percentage
}

export interface UptimeInfo {
  uptimeSeconds: number
  uptimeFormatted: string
  lastReboot: string
  rebootReason?: string
  unexpectedShutdowns: number
  systemStability: 'stable' | 'unstable' | 'critical'
}

export interface PerformanceSummary {
  overallScore: number  // 0-100, calculated on device
  cpuScore: number
  memoryScore: number
  diskScore: number
  networkScore: number
  performanceIssues: string[]
  recommendations: string[]
  bottlenecks: string[]
  healthStatus: 'excellent' | 'good' | 'fair' | 'poor' | 'critical'
}

/**
 * Extract performance information from device modules
 * READER ONLY: Expects device to provide pre-processed performance analysis
 */
export function extractPerformance(deviceModules: any): PerformanceInfo {
  if (!deviceModules?.performance) {
        return createEmptyPerformanceInfo()
  }

  const performance = deviceModules.performance
  
  
  const performanceInfo: PerformanceInfo = {
    // Read CPU performance metrics (device should calculate averages, peaks)
    cpu: performance.cpu ? mapCpuPerformance(performance.cpu) : createEmptyCpuPerformance(),
    
    // Read memory performance
    memory: performance.memory ? mapMemoryPerformance(performance.memory) : createEmptyMemoryPerformance(),
    
    // Read disk performance for all drives
    disk: performance.disk ? performance.disk.map(mapDiskPerformance) : [],
    
    // Read network performance
    network: performance.network ? mapNetworkPerformance(performance.network) : createEmptyNetworkPerformance(),
    
    // Read process information (device should sort by resource usage)
    processes: performance.processes ? performance.processes.map(mapProcessInfo) : [],
    
    // Read system load metrics
    systemLoad: performance.systemLoad ? mapSystemLoad(performance.systemLoad) : createEmptySystemLoad(),
    
    // Read boot time analysis
    bootTime: performance.bootTime ? mapBootTimeInfo(performance.bootTime) : createEmptyBootTimeInfo(),
    
    // Read thermal information
    thermals: performance.thermals ? mapThermalInfo(performance.thermals) : createEmptyThermalInfo(),
    
    // Read power information
    power: performance.power ? mapPowerInfo(performance.power) : createEmptyPowerInfo(),
    
    // Read uptime information
    uptime: performance.uptime ? mapUptimeInfo(performance.uptime) : createEmptyUptimeInfo(),
    
    // Use device-calculated performance summary
    summary: performance.summary || createEmptySummary()
  }

  
  return performanceInfo
}

// Helper functions for mapping device data (minimal processing)
function mapCpuPerformance(cpu: any): CpuPerformance {
  return {
    usage: cpu.usage || 0,
    averageUsage: cpu.averageUsage || cpu.average_usage || cpu.usage || 0,
    peakUsage: cpu.peakUsage || cpu.peak_usage || cpu.usage || 0,
    cores: cpu.cores || 1,
    threads: cpu.threads || cpu.cores || 1,
    frequency: cpu.frequency || 0,
    baseFrequency: cpu.baseFrequency || cpu.base_frequency || cpu.frequency || 0,
    maxFrequency: cpu.maxFrequency || cpu.max_frequency || cpu.frequency || 0,
    temperature: cpu.temperature,
    topProcesses: cpu.topProcesses || cpu.top_processes ? 
      (cpu.topProcesses || cpu.top_processes).map(mapTopProcess) : []
  }
}

function mapMemoryPerformance(memory: any): MemoryPerformance {
  return {
    totalRam: memory.totalRam || memory.total_ram || 0,
    usedRam: memory.usedRam || memory.used_ram || 0,
    freeRam: memory.freeRam || memory.free_ram || 0,
    availableRam: memory.availableRam || memory.available_ram || 0,
    usagePercentage: memory.usagePercentage || memory.usage_percentage || 0,
    committedMemory: memory.committedMemory || memory.committed_memory || 0,
    cachedMemory: memory.cachedMemory || memory.cached_memory || 0,
    pagedPool: memory.pagedPool || memory.paged_pool || 0,
    nonPagedPool: memory.nonPagedPool || memory.non_paged_pool || 0,
    virtualMemory: memory.virtualMemory || memory.virtual_memory || {
      total: 0,
      used: 0,
      available: 0
    },
    pageFile: memory.pageFile || memory.page_file || {
      total: 0,
      used: 0,
      peak: 0
    },
    topProcesses: memory.topProcesses || memory.top_processes ? 
      (memory.topProcesses || memory.top_processes).map(mapTopProcess) : []
  }
}

function mapDiskPerformance(disk: any): DiskPerformance {
  return {
    drive: disk.drive || '',
    name: disk.name || '',
    totalSpace: disk.totalSpace || disk.total_space || 0,
    usedSpace: disk.usedSpace || disk.used_space || 0,
    freeSpace: disk.freeSpace || disk.free_space || 0,
    usagePercentage: disk.usagePercentage || disk.usage_percentage || 0,
    readSpeed: disk.readSpeed || disk.read_speed || 0,
    writeSpeed: disk.writeSpeed || disk.write_speed || 0,
    iops: disk.iops || 0,
    responseTime: disk.responseTime || disk.response_time || 0,
    queueLength: disk.queueLength || disk.queue_length || 0,
    temperature: disk.temperature,
    health: disk.health || 'healthy',
    type: disk.type || 'hdd'
  }
}

function mapNetworkPerformance(network: any): NetworkPerformance {
  return {
    totalBytesReceived: network.totalBytesReceived || network.total_bytes_received || 0,
    totalBytesSent: network.totalBytesSent || network.total_bytes_sent || 0,
    currentDownloadSpeed: network.currentDownloadSpeed || network.current_download_speed || 0,
    currentUploadSpeed: network.currentUploadSpeed || network.current_upload_speed || 0,
    peakDownloadSpeed: network.peakDownloadSpeed || network.peak_download_speed || 0,
    peakUploadSpeed: network.peakUploadSpeed || network.peak_upload_speed || 0,
    packetsReceived: network.packetsReceived || network.packets_received || 0,
    packetsSent: network.packetsSent || network.packets_sent || 0,
    packetsLost: network.packetsLost || network.packets_lost || 0,
    latency: network.latency || 0,
    adapters: network.adapters ? network.adapters.map(mapNetworkAdapterPerformance) : []
  }
}

function mapNetworkAdapterPerformance(adapter: any): NetworkAdapterPerformance {
  return {
    name: adapter.name || '',
    bytesReceived: adapter.bytesReceived || adapter.bytes_received || 0,
    bytesSent: adapter.bytesSent || adapter.bytes_sent || 0,
    packetsReceived: adapter.packetsReceived || adapter.packets_received || 0,
    packetsSent: adapter.packetsSent || adapter.packets_sent || 0,
    errors: adapter.errors || 0,
    discards: adapter.discards || 0,
    utilization: adapter.utilization || 0,
    speed: adapter.speed || 0,
    status: adapter.status || 'unknown'
  }
}

function mapProcessInfo(process: any): ProcessInfo {
  return {
    name: process.name || '',
    pid: process.pid || 0,
    cpu: process.cpu || 0,
    memory: process.memory || 0,
    handles: process.handles || 0,
    threads: process.threads || 0,
    startTime: process.startTime || process.start_time,
    user: process.user,
    priority: process.priority || 'normal',
    status: process.status || 'running',
    commandLine: process.commandLine || process.command_line
  }
}

function mapTopProcess(process: any): TopProcess {
  return {
    name: process.name || '',
    pid: process.pid || 0,
    usage: process.usage || 0
  }
}

function mapSystemLoad(load: any): SystemLoad {
  return {
    oneMinute: load.oneMinute || load.one_minute || 0,
    fiveMinute: load.fiveMinute || load.five_minute || 0,
    fifteenMinute: load.fifteenMinute || load.fifteen_minute || 0,
    processQueue: load.processQueue || load.process_queue || 0,
    contextSwitches: load.contextSwitches || load.context_switches || 0,
    interrupts: load.interrupts || 0,
    systemCalls: load.systemCalls || load.system_calls || 0
  }
}

function mapBootTimeInfo(bootTime: any): BootTimeInfo {
  return {
    lastBootTime: bootTime.lastBootTime || bootTime.last_boot_time || '',
    bootDuration: bootTime.bootDuration || bootTime.boot_duration || 0,
    fastBoot: bootTime.fastBoot || bootTime.fast_boot || false,
    hibernationUsed: bootTime.hibernationUsed || bootTime.hibernation_used || false,
    bootType: bootTime.bootType || bootTime.boot_type || 'cold'
  }
}

function mapThermalInfo(thermal: any): ThermalInfo {
  return {
    cpuTemperature: thermal.cpuTemperature || thermal.cpu_temperature,
    gpuTemperature: thermal.gpuTemperature || thermal.gpu_temperature,
    systemTemperature: thermal.systemTemperature || thermal.system_temperature,
    fanSpeeds: thermal.fanSpeeds || thermal.fan_speeds ? 
      (thermal.fanSpeeds || thermal.fan_speeds).map(mapFanInfo) : [],
    thermalThrottling: thermal.thermalThrottling || thermal.thermal_throttling || false,
    overheating: thermal.overheating || false
  }
}

function mapFanInfo(fan: any): FanInfo {
  return {
    name: fan.name || '',
    speed: fan.speed || 0,
    percentage: fan.percentage || 0,
    status: fan.status || 'normal'
  }
}

function mapPowerInfo(power: any): PowerInfo {
  return {
    batteryPresent: power.batteryPresent || power.battery_present || false,
    batteryLevel: power.batteryLevel || power.battery_level,
    batteryStatus: power.batteryStatus || power.battery_status,
    powerSource: power.powerSource || power.power_source || 'unknown',
    estimatedTimeRemaining: power.estimatedTimeRemaining || power.estimated_time_remaining,
    powerPlan: power.powerPlan || power.power_plan || 'Balanced',
    cpuPowerManagement: power.cpuPowerManagement || power.cpu_power_management || false,
    screenBrightness: power.screenBrightness || power.screen_brightness
  }
}

function mapUptimeInfo(uptime: any): UptimeInfo {
  return {
    uptimeSeconds: uptime.uptimeSeconds || uptime.uptime_seconds || 0,
    uptimeFormatted: uptime.uptimeFormatted || uptime.uptime_formatted || '',
    lastReboot: uptime.lastReboot || uptime.last_reboot || '',
    rebootReason: uptime.rebootReason || uptime.reboot_reason,
    unexpectedShutdowns: uptime.unexpectedShutdowns || uptime.unexpected_shutdowns || 0,
    systemStability: uptime.systemStability || uptime.system_stability || 'stable'
  }
}

// Empty data creators
function createEmptyPerformanceInfo(): PerformanceInfo {
  return {
    cpu: createEmptyCpuPerformance(),
    memory: createEmptyMemoryPerformance(),
    disk: [],
    network: createEmptyNetworkPerformance(),
    processes: [],
    systemLoad: createEmptySystemLoad(),
    bootTime: createEmptyBootTimeInfo(),
    thermals: createEmptyThermalInfo(),
    power: createEmptyPowerInfo(),
    uptime: createEmptyUptimeInfo(),
    summary: createEmptySummary()
  }
}

function createEmptyCpuPerformance(): CpuPerformance {
  return {
    usage: 0,
    averageUsage: 0,
    peakUsage: 0,
    cores: 1,
    threads: 1,
    frequency: 0,
    baseFrequency: 0,
    maxFrequency: 0,
    topProcesses: []
  }
}

function createEmptyMemoryPerformance(): MemoryPerformance {
  return {
    totalRam: 0,
    usedRam: 0,
    freeRam: 0,
    availableRam: 0,
    usagePercentage: 0,
    committedMemory: 0,
    cachedMemory: 0,
    pagedPool: 0,
    nonPagedPool: 0,
    virtualMemory: { total: 0, used: 0, available: 0 },
    pageFile: { total: 0, used: 0, peak: 0 },
    topProcesses: []
  }
}

function createEmptyNetworkPerformance(): NetworkPerformance {
  return {
    totalBytesReceived: 0,
    totalBytesSent: 0,
    currentDownloadSpeed: 0,
    currentUploadSpeed: 0,
    peakDownloadSpeed: 0,
    peakUploadSpeed: 0,
    packetsReceived: 0,
    packetsSent: 0,
    packetsLost: 0,
    latency: 0,
    adapters: []
  }
}

function createEmptySystemLoad(): SystemLoad {
  return {
    oneMinute: 0,
    fiveMinute: 0,
    fifteenMinute: 0,
    processQueue: 0,
    contextSwitches: 0,
    interrupts: 0,
    systemCalls: 0
  }
}

function createEmptyBootTimeInfo(): BootTimeInfo {
  return {
    lastBootTime: '',
    bootDuration: 0,
    fastBoot: false,
    hibernationUsed: false,
    bootType: 'cold'
  }
}

function createEmptyThermalInfo(): ThermalInfo {
  return {
    fanSpeeds: [],
    thermalThrottling: false,
    overheating: false
  }
}

function createEmptyPowerInfo(): PowerInfo {
  return {
    batteryPresent: false,
    powerSource: 'unknown',
    powerPlan: 'Balanced',
    cpuPowerManagement: false
  }
}

function createEmptyUptimeInfo(): UptimeInfo {
  return {
    uptimeSeconds: 0,
    uptimeFormatted: '',
    lastReboot: '',
    unexpectedShutdowns: 0,
    systemStability: 'stable'
  }
}

function createEmptySummary(): PerformanceSummary {
  return {
    overallScore: 0,
    cpuScore: 0,
    memoryScore: 0,
    diskScore: 0,
    networkScore: 0,
    performanceIssues: [],
    recommendations: [],
    bottlenecks: [],
    healthStatus: 'critical'
  }
}

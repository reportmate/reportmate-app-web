/**
 * System Info Module
 * Handles all system/OS data extraction in isolation
 */

export interface SystemService {
  name: string
  displayName?: string
  description?: string
  status: string
  startType?: string
  start_type?: string
}

export interface EnvironmentVariable {
  name: string
  value: string
}

export interface WindowsUpdate {
  id: string
  title?: string
  category?: string
  installDate?: string
  requiresRestart?: boolean
}

export interface OperatingSystemInfo {
  name?: string
  version?: string
  displayVersion?: string
  edition?: string
  build?: string
  architecture?: string
  locale?: string
  timeZone?: string
  activeKeyboardLayout?: string
  featureUpdate?: string
}

export interface SystemInfo {
  services: SystemService[]
  environment: EnvironmentVariable[]
  updates: WindowsUpdate[]
  runningServices: number
  operatingSystem: OperatingSystemInfo
  bootTime?: string
}

/**
 * Extract system information from device modules
 * MODULAR: Self-contained system data processing
 */
export function extractSystem(deviceModules: any): SystemInfo {
  console.log('[SYSTEM MODULE] Processing system data')
  
  // Initialize with defaults
  const systemInfo: SystemInfo = {
    services: [],
    environment: [],
    updates: [],
    runningServices: 0,
    operatingSystem: {}
  }

  if (!deviceModules?.modules) {
    console.log('[SYSTEM MODULE] No modules data found')
    return systemInfo
  }

  const modules = deviceModules.modules

  // Extract services data - check both system.services and separate services module
  let rawServices = null
  if (modules?.system?.services) {
    rawServices = modules.system.services
  } else if (modules?.services?.services) {
    rawServices = modules.services.services
  }

  if (rawServices && Array.isArray(rawServices)) {
    systemInfo.services = rawServices.map((service: any) => ({
      name: service.name || service.serviceName || '',
      displayName: service.displayName || service.display_name || '',
      description: service.description || '',
      status: service.status || service.state || 'Unknown',
      startType: service.startType || service.start_type || '',
      start_type: service.start_type || service.startType || ''
    }))
    
    systemInfo.runningServices = systemInfo.services.filter(s => 
      s.status?.toLowerCase().includes('running') || 
      s.status?.toLowerCase().includes('started')
    ).length
  }

  // Extract environment variables - check both system.environment and separate environment module
  let rawEnv = null
  if (modules?.system?.environment) {
    rawEnv = modules.system.environment
  } else if (modules?.environment?.environment) {
    rawEnv = modules.environment.environment
  }

  if (rawEnv && Array.isArray(rawEnv)) {
    systemInfo.environment = rawEnv.map((env: any) => ({
      name: env.name || env.key || '',
      value: env.value || ''
    }))
  }

  // Extract Windows updates - check both system.updates and separate updates module
  let rawUpdates = null
  if (modules?.system?.updates) {
    rawUpdates = modules.system.updates
  } else if (modules?.updates?.updates) {
    rawUpdates = modules.updates.updates
  }

  if (rawUpdates && Array.isArray(rawUpdates)) {
    systemInfo.updates = rawUpdates.map((update: any) => ({
      id: update.id || update.updateId || '',
      title: update.title || update.name || '',
      category: update.category || '',
      installDate: update.installDate || update.installed_date || '',
      requiresRestart: update.requiresRestart || update.requires_restart || false
    }))
  }

  // Extract operating system info
  if (modules?.system?.operatingSystem) {
    const os = modules.system.operatingSystem
    systemInfo.operatingSystem = {
      name: os.name || os.productName || '',
      version: os.version || '',
      displayVersion: os.displayVersion || os.display_version || '',
      edition: os.edition || '',
      build: os.build || os.buildNumber || '',
      architecture: os.architecture || os.arch || '',
      locale: os.locale || '',
      timeZone: os.timeZone || os.timezone || '',
      activeKeyboardLayout: os.activeKeyboardLayout || '',
      featureUpdate: os.featureUpdate || ''
    }
  }

  // Boot time - check various possible locations
  if (modules?.system?.lastBootTime) {
    systemInfo.bootTime = modules.system.lastBootTime
  } else if (modules?.system?.bootTime) {
    systemInfo.bootTime = modules.system.bootTime
  }

  console.log('[SYSTEM MODULE] System info extracted:', {
    servicesCount: systemInfo.services.length,
    runningServices: systemInfo.runningServices,
    environmentCount: systemInfo.environment.length,
    updatesCount: systemInfo.updates.length,
    hasOperatingSystem: !!Object.keys(systemInfo.operatingSystem).length
  })

  return systemInfo
}

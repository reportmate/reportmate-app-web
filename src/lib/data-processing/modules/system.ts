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

export interface ScheduledTask {
  name: string
  path: string
  enabled: boolean
  action: string
  hidden: boolean
  state: string
  lastRunTime?: string
  nextRunTime?: string
  lastRunCode: string
  lastRunMessage: string
  status: string
}

export interface ActivationInfo {
  isActivated?: boolean
  status?: string
  statusCode?: number
  partialProductKey?: string
  licenseType?: string
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
  activation?: ActivationInfo
}

export interface SystemInfo {
  services: SystemService[]
  environment: EnvironmentVariable[]
  updates: WindowsUpdate[]
  scheduledTasks: ScheduledTask[]
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
    scheduledTasks: [],
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

  // Extract scheduled tasks - check both system.scheduledTasks and separate scheduledTasks module
  let rawScheduledTasks = null
  if (modules?.system?.scheduledTasks) {
    rawScheduledTasks = modules.system.scheduledTasks
  } else if (modules?.scheduledTasks?.scheduledTasks) {
    rawScheduledTasks = modules.scheduledTasks.scheduledTasks
  }

  if (rawScheduledTasks && Array.isArray(rawScheduledTasks)) {
    systemInfo.scheduledTasks = rawScheduledTasks.map((task: any) => ({
      name: task.name || '',
      path: task.path || '',
      enabled: task.enabled || false,
      action: task.action || '',
      hidden: task.hidden || false,
      state: task.state || '',
      lastRunTime: task.lastRunTime || task.last_run_time || '',
      nextRunTime: task.nextRunTime || task.next_run_time || '',
      lastRunCode: task.lastRunCode || task.last_run_code || '',
      lastRunMessage: task.lastRunMessage || task.last_run_message || '',
      status: task.status || task.state || 'Unknown'
    }))
  }

  // Extract operating system info - handle both Windows and Mac structures
  if (modules?.system?.operatingSystem) {
    const os = modules.system.operatingSystem
    // Check for Mac's systemDetails which contains locale, timeZone, keyboardLayouts
    const systemDetails = modules.system.systemDetails || {}
    
    systemInfo.operatingSystem = {
      name: os.name || os.productName || '',
      version: os.version || '',
      // Mac uses majorVersion.minorVersion.patchVersion format
      displayVersion: os.displayVersion || os.display_version || 
        (os.majorVersion !== undefined ? `${os.majorVersion}.${os.minorVersion || 0}` : ''),
      edition: os.edition || os.platform || '', // Mac uses platform (Darwin)
      build: os.build || os.buildNumber || '',
      architecture: os.architecture || os.arch || '',
      // Mac stores locale/timezone in systemDetails
      locale: os.locale || systemDetails.locale || '',
      timeZone: os.timeZone || os.timezone || systemDetails.timeZone || '',
      // Mac stores keyboard layouts as array in systemDetails
      activeKeyboardLayout: os.activeKeyboardLayout || 
        (systemDetails.keyboardLayouts?.length > 0 ? systemDetails.keyboardLayouts.join(', ') : ''),
      featureUpdate: os.featureUpdate || '',
      // Windows activation status
      activation: os.activation ? {
        isActivated: os.activation.isActivated,
        status: os.activation.status,
        statusCode: os.activation.statusCode,
        partialProductKey: os.activation.partialProductKey,
        licenseType: os.activation.licenseType
      } : undefined
    }
  }

  // Boot time - check various possible locations including Mac's systemDetails
  if (modules?.system?.lastBootTime) {
    systemInfo.bootTime = modules.system.lastBootTime
  } else if (modules?.system?.bootTime) {
    systemInfo.bootTime = modules.system.bootTime
  } else if (modules?.system?.systemDetails?.bootTime) {
    systemInfo.bootTime = modules.system.systemDetails.bootTime
  }

  console.log('[SYSTEM MODULE] System info extracted:', {
    servicesCount: systemInfo.services.length,
    runningServices: systemInfo.runningServices,
    environmentCount: systemInfo.environment.length,
    updatesCount: systemInfo.updates.length,
    scheduledTasksCount: systemInfo.scheduledTasks.length,
    hasOperatingSystem: !!Object.keys(systemInfo.operatingSystem).length
  })

  return systemInfo
}

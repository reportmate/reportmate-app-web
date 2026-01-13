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

  // Extract scheduled tasks - check both system.scheduledTasks and system.scheduled_tasks
  let rawScheduledTasks = null
  if (modules?.system?.scheduled_tasks) {
    rawScheduledTasks = modules.system.scheduled_tasks
  } else if (modules?.system?.scheduledTasks) {
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
      lastRunTime: task.last_run_time || task.lastRunTime || '',
      nextRunTime: task.next_run_time || task.nextRunTime || '',
      lastRunCode: task.last_run_code || task.lastRunCode || '',
      lastRunMessage: task.last_run_message || task.lastRunMessage || '',
      status: task.status || task.state || 'Unknown'
    }))
  }

  // Extract operating system info - handle both Windows and Mac structures
  // Support both snake_case (new) and camelCase (legacy) field names
  // Mac client uses camelCase (operatingSystem), Windows may use snake_case (operating_system)
  const rawOs = modules?.system?.operatingSystem || modules?.system?.operating_system
  if (rawOs) {
    const os = rawOs
    // Check for Mac's systemDetails which contains locale, timeZone, keyboardLayouts
    // Mac client uses camelCase (systemDetails), might have snake_case variant (system_details)
    const systemDetails = modules.system.systemDetails || modules.system.system_details || {}
    
    systemInfo.operatingSystem = {
      name: os.name || os.productName || os.product_name || '',
      version: os.version || '',
      // Support both snake_case and camelCase for displayVersion
      // Mac: uses majorVersion.minorVersion.patchVersion
      displayVersion: os.display_version || os.displayVersion || 
        (os.majorVersion !== undefined ? `${os.majorVersion}.${os.minorVersion || 0}.${os.patchVersion || 0}` : '') ||
        (os.major !== undefined ? `${os.major}.${os.minor || 0}.${os.patch || 0}` : ''),
      edition: os.edition || os.platform || '', // Mac uses platform (Darwin)
      build: os.build || os.buildNumber || os.build_number || '',
      architecture: os.architecture || os.arch || '',
      // Support both snake_case and camelCase for locale/timezone
      // Mac stores these in systemDetails, Windows in operating_system
      locale: os.locale || systemDetails.locale || '',
      timeZone: os.time_zone || os.timeZone || os.timezone || systemDetails.timeZone || systemDetails.time_zone || '',
      // Support both snake_case and camelCase for keyboard layout
      // Mac stores keyboardLayouts array in systemDetails
      activeKeyboardLayout: os.active_keyboard_layout || os.activeKeyboardLayout || 
        (os.keyboard_layouts?.length > 0 ? os.keyboard_layouts.join(', ') : '') ||
        (systemDetails.keyboardLayouts?.length > 0 ? systemDetails.keyboardLayouts.join(', ') : ''),
      featureUpdate: os.feature_update || os.featureUpdate || '',
      // Windows activation status - support snake_case
      activation: os.activation ? {
        isActivated: os.activation.is_activated ?? os.activation.isActivated,
        status: os.activation.status,
        statusCode: os.activation.status_code ?? os.activation.statusCode,
        partialProductKey: os.activation.partial_product_key ?? os.activation.partialProductKey,
        licenseType: os.activation.license_type ?? os.activation.licenseType
      } : undefined
    }
  }

  // Boot time - check various possible locations including Mac's systemDetails
  // Support both snake_case and camelCase
  // Mac stores bootTime in systemDetails (camelCase)
  if (modules?.system?.last_boot_time) {
    systemInfo.bootTime = modules.system.last_boot_time
  } else if (modules?.system?.lastBootTime) {
    systemInfo.bootTime = modules.system.lastBootTime
  } else if (modules?.system?.bootTime) {
    systemInfo.bootTime = modules.system.bootTime
  } else if (modules?.system?.boot_time) {
    systemInfo.bootTime = modules.system.boot_time
  } else if (modules?.system?.systemDetails?.bootTime) {
    systemInfo.bootTime = modules.system.systemDetails.bootTime
  } else if (modules?.system?.system_details?.boot_time) {
    systemInfo.bootTime = modules.system.system_details.boot_time
  }

  // Boot time - check various possible locations including Mac's systemDetails
  // Support both snake_case and camelCase
  if (modules?.system?.last_boot_time) {
    systemInfo.bootTime = modules.system.last_boot_time
  } else if (modules?.system?.lastBootTime) {
    systemInfo.bootTime = modules.system.lastBootTime
  } else if (modules?.system?.bootTime) {
    systemInfo.bootTime = modules.system.bootTime
  } else if (modules?.system?.boot_time) {
    systemInfo.bootTime = modules.system.boot_time
  } else if (modules?.system?.systemDetails?.bootTime) {
    systemInfo.bootTime = modules.system.systemDetails.bootTime
  } else if (modules?.system?.system_details?.boot_time) {
    systemInfo.bootTime = modules.system.system_details.boot_time
  }

  
  return systemInfo
}

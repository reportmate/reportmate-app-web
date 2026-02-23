/**
 * System Info Module
 * Handles all system/OS data extraction in isolation
 * Supports both Windows and macOS platforms
 */

export interface SystemService {
  name: string
  displayName?: string
  description?: string
  status: string
  startType?: string
  start_type?: string
  // Mac launchd fields
  label?: string
  pid?: number | null
  runAtLoad?: boolean
  keepAlive?: boolean
  onDemand?: boolean
  disabled?: boolean
  path?: string
  program?: string
  programArguments?: string[]
  source?: string  // Apple, System, User
  type?: string    // LaunchDaemon, LaunchAgent
  plistContent?: string  // JSON representation of the plist
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

// Mac-specific: Pending Apple Updates
export interface MacUpdate {
  name: string
  productKey?: string
  version?: string
  installDate?: string
  recommended?: boolean
  isSecurity?: boolean
  restartRequired?: boolean
  size?: string
}

// Mac-specific: Install History from package_receipts
export interface InstallHistoryItem {
  packageId: string
  packageFilename?: string
  version?: string
  location?: string
  installTime?: string
  installerName?: string
  path?: string
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
  // Mac launchd fields
  type?: string  // LaunchDaemon, LaunchAgent
  source?: string  // System, User, Apple
  runAtLoad?: boolean
  username?: string
}

// Mac-specific: Login Items
export interface LoginItem {
  name: string
  path?: string
  type?: string  // LoginItem, LaunchAgent, BTM, etc.
  enabled: boolean
  source?: string
  username?: string
}

// Mac-specific: System Extensions
export interface SystemExtension {
  identifier: string
  version?: string
  state: string
  teamId?: string
  bundlePath?: string
  category?: string
  type?: string  // Network, EndpointSecurity, DriverKit, System
  // Extension categories from macOS Extensions pane
  extensionCategory?: string  // Actions, Camera Extensions, Driver Extensions, File Providers, etc.
  appName?: string  // The app that provides this extension
  managedByProfile?: boolean
  profileIdentifier?: string
}

// Mac-specific: Kernel Extensions
export interface KernelExtension {
  name: string
  version?: string
  path?: string
  size?: number
  references?: number
  index?: number
  loaded?: boolean
}

// Mac-specific: Privileged Helper Tools
export interface PrivilegedHelperTool {
  name: string
  path?: string
  bundleIdentifier?: string
  teamId?: string
  size?: number
  modifiedDate?: string
  signed?: boolean
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
  // Mac-specific fields
  platform?: string  // Darwin for Mac
  kernelVersion?: string
}

export interface SystemInfo {
  services: SystemService[]
  environment: EnvironmentVariable[]
  updates: WindowsUpdate[]
  scheduledTasks: ScheduledTask[]
  runningServices: number
  operatingSystem: OperatingSystemInfo
  bootTime?: string
  // Platform detection
  isMac: boolean
  // Mac-specific data
  pendingAppleUpdates: MacUpdate[]
  installHistory: InstallHistoryItem[]
  loginItems: LoginItem[]
  systemExtensions: SystemExtension[]
  kernelExtensions: KernelExtension[]
  privilegedHelperTools: PrivilegedHelperTool[]
}

/**
 * Extract system information from device modules
 * MODULAR: Self-contained system data processing
 * Supports both Windows and macOS platforms
 */
export function extractSystem(deviceModules: any): SystemInfo {
    
  // Initialize with defaults
  const systemInfo: SystemInfo = {
    services: [],
    environment: [],
    updates: [],
    scheduledTasks: [],
    runningServices: 0,
    operatingSystem: {},
    isMac: false,
    pendingAppleUpdates: [],
    installHistory: [],
    loginItems: [],
    systemExtensions: [],
    kernelExtensions: [],
    privilegedHelperTools: []
  }

  if (!deviceModules?.modules) {
        return systemInfo
  }

  const modules = deviceModules.modules

  // Detect platform - Mac uses platform: "Darwin" or operatingSystem.platform === "Darwin"
  const rawOs = modules?.system?.operatingSystem || modules?.system?.operating_system
  const platform = rawOs?.platform || modules?.system?.systemDetails?.platform || ''
  systemInfo.isMac = platform.toLowerCase() === 'darwin' || rawOs?.name?.toLowerCase().includes('macos')

  // Extract services data - check both system.services and separate services module
  // Mac: launchd services, Windows: Windows Services
  let rawServices = null
  if (modules?.system?.services) {
    rawServices = modules.system.services
  } else if (modules?.services?.services) {
    rawServices = modules.services.services
  }

  if (rawServices && Array.isArray(rawServices)) {
    systemInfo.services = rawServices.map((service: any) => {
      // Mac launchd format has different fields
      if (systemInfo.isMac || service.label) {
        return {
          name: service.label || service.name || '',
          displayName: service.label || service.name || '',
          label: service.label || '',
          description: '',
          status: service.status || (service.pid ? 'Running' : 'Stopped'),
          pid: service.pid || null,
          runAtLoad: service.runAtLoad ?? service.run_at_load ?? false,
          keepAlive: service.keepAlive ?? service.keep_alive ?? false,
          onDemand: service.onDemand ?? service.on_demand ?? false,
          disabled: service.disabled ?? false,
          path: service.path || '',
          program: service.program || '',
          programArguments: service.programArguments || service.program_arguments || [],
          plistContent: service.plistContent || service.plist_content || undefined,
          type: service.type || '',
          source: service.source || ''
        }
      }
      // Windows format
      return {
        name: service.name || service.serviceName || '',
        displayName: service.displayName || service.display_name || '',
        description: service.description || '',
        status: service.status || service.state || 'Unknown',
        startType: service.startType || service.start_type || '',
        start_type: service.start_type || service.startType || ''
      }
    })
    
    systemInfo.runningServices = systemInfo.services.filter(s => 
      s.status?.toLowerCase().includes('running') || 
      s.status?.toLowerCase().includes('started') ||
      s.pid != null
    ).length
  }

  // Extract environment variables - check both system.environment and separate environment module
  let rawEnv = null
  if (modules?.system?.environment) {
    rawEnv = modules.system.environment
  } else if (modules?.environment?.environment) {
    rawEnv = modules.environment.environment
  }

  // Environment can be an object (Mac) or array (Windows)
  if (rawEnv) {
    if (Array.isArray(rawEnv)) {
      systemInfo.environment = rawEnv.map((env: any) => ({
        name: env.name || env.key || '',
        value: env.value || ''
      }))
    } else if (typeof rawEnv === 'object') {
      // Mac stores environment as key-value object
      systemInfo.environment = Object.entries(rawEnv).map(([key, value]) => ({
        name: key,
        value: String(value || '')
      }))
    }
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

  // Extract Mac pending Apple updates
  const rawPendingUpdates = modules?.system?.pendingAppleUpdates || modules?.system?.pending_apple_updates
  if (rawPendingUpdates && Array.isArray(rawPendingUpdates)) {
    systemInfo.pendingAppleUpdates = rawPendingUpdates.map((update: any) => ({
      name: update.name || update.display_name || '',
      productKey: update.productKey || update.product_key || '',
      version: update.version || '',
      installDate: update.installDate || update.install_date || '',
      recommended: update.recommended ?? update.is_recommended ?? false,
      isSecurity: update.isSecurity ?? update.is_security ?? false,
      restartRequired: update.restartRequired ?? update.restart_required ?? update.reboot_required ?? false,
      size: update.size || ''
    }))
  }

  // Extract Mac install history from package_receipts
  const rawInstallHistory = modules?.system?.installHistory || modules?.system?.install_history
  if (rawInstallHistory && Array.isArray(rawInstallHistory)) {
    systemInfo.installHistory = rawInstallHistory.map((item: any) => ({
      packageId: item.packageId || item.package_id || '',
      packageFilename: item.packageFilename || item.package_filename || '',
      version: item.version || '',
      location: item.location || '',
      installTime: item.installTime || item.install_time || '',
      installerName: item.installerName || item.installer_name || '',
      path: item.path || ''
    }))
  }

  // Extract scheduled tasks - check both system.scheduledTasks and system.scheduled_tasks
  // Mac: Launch Daemons/Agents, Windows: Task Scheduler
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
      name: task.name || task.label || '',
      path: task.path || '',
      enabled: task.enabled ?? task.runAtLoad ?? !(task.disabled ?? false),
      action: task.action || task.program || task.path || '',
      hidden: task.hidden ?? false,
      state: task.state || task.status || '',
      lastRunTime: task.last_run_time || task.lastRunTime || '',
      nextRunTime: task.next_run_time || task.nextRunTime || '',
      lastRunCode: task.last_run_code || task.lastRunCode || '',
      lastRunMessage: task.last_run_message || task.lastRunMessage || '',
      status: task.status || task.state || 'Unknown',
      // Mac-specific
      type: task.type || '',  // LaunchDaemon, LaunchAgent
      source: task.source || '',  // System, User, Apple
      runAtLoad: task.runAtLoad ?? task.run_at_load ?? false,
      username: task.username || ''
    }))
  }

  // Extract Mac Login Items
  const rawLoginItems = modules?.system?.loginItems || modules?.system?.login_items
  if (rawLoginItems && Array.isArray(rawLoginItems)) {
    systemInfo.loginItems = rawLoginItems.map((item: any) => ({
      name: item.name || '',
      path: item.path || '',
      type: item.type || 'LoginItem',
      enabled: item.enabled ?? true,
      source: item.source || '',
      username: item.username || ''
    }))
  }

  // Extract Mac System Extensions
  const rawSystemExtensions = modules?.system?.systemExtensions || modules?.system?.system_extensions
  if (rawSystemExtensions && Array.isArray(rawSystemExtensions)) {
    systemInfo.systemExtensions = rawSystemExtensions.map((ext: any) => ({
      identifier: ext.identifier || '',
      version: ext.version || '',
      state: ext.state || 'unknown',
      teamId: ext.teamId || ext.team_id || ext.team || '',
      bundlePath: ext.bundlePath || ext.bundle_path || '',
      category: ext.category || '',
      type: ext.type || 'System',
      extensionCategory: ext.extensionCategory || ext.extension_category || '',
      appName: ext.appName || ext.app_name || '',
      managedByProfile: ext.managedByProfile ?? ext.managed_by_profile ?? false,
      profileIdentifier: ext.profileIdentifier || ext.profile_identifier || ''
    }))
  }

  // Extract Mac Kernel Extensions
  const rawKernelExtensions = modules?.system?.kernelExtensions || modules?.system?.kernel_extensions
  if (rawKernelExtensions && Array.isArray(rawKernelExtensions)) {
    systemInfo.kernelExtensions = rawKernelExtensions.map((kext: any) => ({
      name: kext.name || '',
      version: kext.version || '',
      path: kext.path || '',
      size: kext.size || 0,
      references: kext.references || kext.refs || 0,
      index: kext.index || kext.idx || 0,
      loaded: kext.loaded ?? true
    }))
  }

  // Extract Mac Privileged Helper Tools
  const rawPrivilegedHelpers = modules?.system?.privilegedHelperTools || modules?.system?.privileged_helper_tools
  if (rawPrivilegedHelpers && Array.isArray(rawPrivilegedHelpers)) {
    systemInfo.privilegedHelperTools = rawPrivilegedHelpers.map((helper: any) => ({
      name: helper.name || '',
      path: helper.path || '',
      bundleIdentifier: helper.bundleIdentifier || helper.bundle_identifier || '',
      teamId: helper.teamId || helper.team_id || '',
      size: helper.size || 0,
      modifiedDate: helper.modifiedDate || helper.modified_date || '',
      signed: helper.signed ?? false
    }))
  }

  // Extract operating system info - handle both Windows and Mac structures
  // Support both snake_case (new) and camelCase (legacy) field names
  // Mac client uses camelCase (operatingSystem), Windows may use snake_case (operating_system)
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
      // Mac-specific
      platform: os.platform || '',
      kernelVersion: os.kernelVersion || os.kernel_version || '',
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

  
  return systemInfo
}

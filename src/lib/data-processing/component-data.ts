/**
 * Data Processing Utilities for Tables and Cards
 * Transforms device data into format expected by UI components
 */

import { formatRelativeTime } from '../time'

// Applications Data Processing
export interface ApplicationsData {
  totalApps: number
  installedApps: ApplicationInfo[]
  recentlyUpdated: number
  categoryBreakdown: Record<string, number>
}

export interface ApplicationInfo {
  id: string
  name: string
  displayName?: string
  version: string
  publisher?: string
  category?: string
  installDate?: string
  size?: string
  path?: string
}

export function processApplicationsData(rawDevice: any): ApplicationsData {
  // Extract applications data from API response only - NO FAKE DATA
  let apps: any[] = []
  
  // Look in various locations for applications data from API
  // NEW: Check the correct modular structure first
  if (rawDevice.modules?.applications?.installed_applications) {
    apps = rawDevice.modules.applications.installed_applications
  } else if (rawDevice.modules?.osQuery?.system?.[0]?.apps) {
    apps = rawDevice.modules.osQuery.system[0].apps
  } else if (rawDevice.modules?.osQuery?.system?.[0]?.applications) {
    apps = rawDevice.modules.osQuery.system[0].applications
  } else if (rawDevice.applications?.installedApps) {
    apps = rawDevice.applications.installedApps
  } else if (rawDevice.apps) {
    apps = rawDevice.apps
  } else if (rawDevice.applications) {
    apps = rawDevice.applications
  }
  
  // Process only real applications from API - NO FAKE DATA
  const installedApps: ApplicationInfo[] = apps.map((app: any, index: number) => ({
    id: app.id || app.name || app.displayName || `app-${index}`,
    name: app.name || app.displayName || 'Unknown',
    displayName: app.displayName || app.name,
    version: app.version || app.bundle_version || 'Unknown',
    publisher: app.publisher || app.signed_by || 'Unknown',
    category: app.category || 'Uncategorized',
    installDate: app.installDate || app.install_date || app.last_modified,
    size: app.size,
    path: app.path || app.install_location
  }))

  // Calculate recently updated (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const recentlyUpdated = installedApps.filter(app => {
    if (!app.installDate) return false
    const installDate = new Date(app.installDate)
    return installDate > thirtyDaysAgo
  }).length

  // Category breakdown
  const categoryBreakdown: Record<string, number> = {}
  installedApps.forEach(app => {
    const category = app.category || 'Uncategorized'
    categoryBreakdown[category] = (categoryBreakdown[category] || 0) + 1
  })

  return {
    totalApps: installedApps.length,
    installedApps,
    recentlyUpdated,
    categoryBreakdown
  }
}

// Hardware Data Processing
export interface HardwareData {
  cpu: string
  memory: string
  storage: string
  graphics: string
  architecture: string
  temperature?: number
  memoryUtilization?: number
  cpuUtilization?: number
  diskUtilization?: number
}

export function processHardwareData(rawDevice: any): HardwareData {
  console.log('Processing hardware data for device:', rawDevice.modules?.inventory?.deviceName || rawDevice.name || rawDevice.id)
  console.log('Hardware data structure:', {
    hasHardware: !!rawDevice.hardware,
    hardwareKeys: rawDevice.hardware ? Object.keys(rawDevice.hardware) : [],
    hasModules: !!rawDevice.modules,
    hasModulesHardware: !!rawDevice.modules?.hardware,
    modulesHardwareKeys: rawDevice.modules?.hardware ? Object.keys(rawDevice.modules.hardware) : [],
    rawDeviceKeys: Object.keys(rawDevice),
    rawDeviceSample: JSON.stringify(rawDevice).substring(0, 1000)
  })
  
  // Extract hardware data from the new modular structure first, then fallback to old structure
  const hardwareModule = rawDevice.modules?.hardware || rawDevice.hardware || {}
  console.log('Hardware module data:', JSON.stringify(hardwareModule, null, 2))
  console.log('Hardware module keys:', Object.keys(hardwareModule))
  console.log('Hardware module has processor:', !!hardwareModule.processor)
  console.log('Hardware module has memory:', !!hardwareModule.memory)
  console.log('Hardware module has storage:', !!hardwareModule.storage)
  console.log('Hardware module has graphics:', !!hardwareModule.graphics)
  
  // Fallback to old module structure if new structure not found
  const deviceModule = rawDevice.modules?.device || {}
  const systemData = rawDevice.modules?.osQuery?.system?.[0] || {}
  const operatingSystem = systemData.operatingSystem || {}
  
  // Extract processor information
  const processor = hardwareModule.processor || {}
  const cpu = processor.name || rawDevice.processor || operatingSystem.architecture || deviceModule.Model || 'Unknown'
  
  // Extract memory information
  const memoryInfo = hardwareModule.memory || {}
  const totalMemoryBytes = memoryInfo.totalPhysical || 0
  const totalMemoryGB = totalMemoryBytes > 0 ? Math.round((totalMemoryBytes / (1024 * 1024 * 1024)) * 100) / 100 : 0
  const memory = totalMemoryGB > 0 ? `${totalMemoryGB} GB` : (rawDevice.memory || 'Unknown')
  
  // Extract storage information
  const storageDevices = hardwareModule.storage || []
  const totalStorageBytes = Array.isArray(storageDevices) ? 
    storageDevices.reduce((total: number, drive: any) => total + (drive.capacity || 0), 0) : 0
  const totalStorageGB = totalStorageBytes > 0 ? Math.round((totalStorageBytes / (1024 * 1024 * 1024)) * 100) / 100 : 0
  const storage = totalStorageGB > 0 ? `${totalStorageGB} GB` : (rawDevice.storage || 'Unknown')
  
  // Extract graphics information
  const graphicsInfo = hardwareModule.graphics || {}
  const graphics = graphicsInfo.name || rawDevice.graphics || 'Unknown'
  
  // Architecture information
  const architecture = processor.architecture || rawDevice.architecture || operatingSystem.architecture || 'Unknown'
  
  // Create enhanced hardware data with the available information
  const hardware = {
    cpu,
    memory,
    storage,
    graphics,
    architecture,
    temperature: rawDevice.temperature,
    memoryUtilization: rawDevice.memoryUtilization,
    cpuUtilization: rawDevice.cpuUtilization,
    diskUtilization: rawDevice.diskUtilization
  }
  
  console.log('Processed hardware data:', {
    cpu: hardware.cpu,
    memory: hardware.memory,
    storage: hardware.storage,
    graphics: hardware.graphics,
    architecture: hardware.architecture
  })

  return hardware
}

// Network Data Processing
export interface NetworkData {
  connectionType: string
  ipAddress: string
  macAddress: string
  hostname: string
  signalStrength?: string
  ssid?: string
  gateway: string
  dns: string
  primaryInterface: string
  vpnActive: boolean
  vpnName?: string
  // Enhanced activeConnection fields
  interfaceName?: string
  friendlyName?: string
  interfaces: NetworkInterface[]
  wifiNetworks: WifiNetwork[]
  vpnConnections: VpnConnection[]
  routes: NetworkRoute[]
}

export interface NetworkInterface {
  name: string
  type: string
  status: string
  ipAddress?: string
  macAddress?: string
  mtu?: number
  bytesSent?: number
  bytesReceived?: number
}

export interface WifiNetwork {
  ssid: string
  security: string
  signalStrength: number
  isConnected: boolean
  channel: string
}

export interface VpnConnection {
  name: string
  type: string
  status: string
  isActive: boolean
  server?: string
  localAddress?: string
  gateway?: string
}

export interface NetworkRoute {
  destination: string
  gateway: string
  interface: string
  metric: number
}

export function processNetworkData(rawDevice: any): NetworkData {
  console.log('Processing network data for device:', rawDevice.modules?.inventory?.deviceName || rawDevice.name || rawDevice.id)
  console.log('Raw device structure:', {
    hasNetwork: !!rawDevice.network,
    hasModules: !!rawDevice.modules,
    rawDeviceKeys: Object.keys(rawDevice),
    networkKeys: rawDevice.network ? Object.keys(rawDevice.network) : []
  })
  
  const networkModule = rawDevice.network || rawDevice.modules?.network || {}
  const activeConnection = networkModule.activeConnection || {}
  
  console.log('Network module data:', {
    hasNetworkModule: !!networkModule,
    hasActiveConnection: !!activeConnection,
    activeConnectionKeys: activeConnection ? Object.keys(activeConnection) : [],
    interfacesCount: networkModule.interfaces?.length || 0,
    networkModuleKeys: Object.keys(networkModule),
    networkModuleSample: JSON.stringify(networkModule).substring(0, 500)
  })
  
  const hostname = rawDevice.modules?.inventory?.deviceName || rawDevice.name || rawDevice.hostname || 'Unknown'
  
  // Use real network data from the new modular network module
  const interfaces = (networkModule.interfaces || []).map((iface: any) => ({
    name: iface.name || iface.friendlyName || 'Unknown',
    type: iface.type || 'Unknown',
    status: iface.isActive ? 'Connected' : (iface.status === 'Up' ? 'Connected' : 'Disconnected'),
    ipAddress: iface.ipAddresses?.find((ip: string) => !ip.includes(':')) || 'N/A',
    macAddress: iface.macAddress || 'N/A',
    mtu: iface.mtu || 0,
    bytesSent: iface.bytesSent || 0,
    bytesReceived: iface.bytesReceived || 0
  }))
  
  const networkData = {
    connectionType: activeConnection.connectionType || 'Unknown',
    ipAddress: activeConnection.ipAddress || rawDevice.ipAddress || rawDevice.ipAddressV4 || 'N/A',
    macAddress: (() => {
      // Try to get MAC address from multiple sources in priority order
      if (rawDevice.macAddress) return rawDevice.macAddress;
      
      // Try to find the primary interface and get its MAC address
      const primaryInterface = networkModule.interfaces?.find((iface: any) => 
        iface.name === activeConnection.interfaceName || 
        iface.name === networkModule.primaryInterface ||
        iface.isActive
      );
      
      if (primaryInterface?.macAddress) return primaryInterface.macAddress;
      
      // Fallback to any interface with a MAC address
      const interfaceWithMac = networkModule.interfaces?.find((iface: any) => iface.macAddress);
      if (interfaceWithMac?.macAddress) return interfaceWithMac.macAddress;
      
      return 'N/A';
    })(),
    hostname: hostname,
    signalStrength: activeConnection.wifiSignalStrength ? `${activeConnection.wifiSignalStrength}%` : undefined,
    ssid: activeConnection.activeWifiSsid || undefined,
    gateway: activeConnection.gateway || networkModule.routes?.find((r: any) => r.destination === '0.0.0.0')?.gateway || 'N/A',
    dns: networkModule.dns?.servers?.join(', ') || 'N/A',
    primaryInterface: networkModule.primaryInterface || activeConnection.interfaceName || 'Unknown',
    vpnActive: activeConnection.isVpnActive || false,
    vpnName: activeConnection.vpnName || undefined,
    // Enhanced activeConnection fields
    interfaceName: activeConnection.interfaceName || 'Unknown',
    friendlyName: activeConnection.friendlyName || activeConnection.interfaceName || 'Unknown',
    interfaces: interfaces,
    wifiNetworks: networkModule.wifiNetworks || [],
    vpnConnections: networkModule.vpnConnections || [],
    routes: networkModule.routes || []
  }
  
  console.log('Processed network data:', {
    connectionType: networkData.connectionType,
    ipAddress: networkData.ipAddress,
    interfacesCount: networkData.interfaces.length,
    hasActiveConnection: !!activeConnection.connectionType
  })
  
  return networkData
}

// Security Data Processing
export interface SecurityData {
  overallScore: number
  issues: number
  compliant: number
  warnings: number
  lastScan: string
  features: SecurityFeature[]
}

export interface SecurityFeature {
  name: string
  status: 'enabled' | 'disabled' | 'warning' | 'unknown'
  value: string
  critical: boolean
}

export function processSecurityData(rawDevice: any): SecurityData {
  const operatingSystem = rawDevice.modules?.osQuery?.system?.[0]?.operatingSystem || {}
  const services = rawDevice.modules?.osQuery?.system?.[0]?.services || []
  const features: SecurityFeature[] = []
  
  let enabledCount = 0
  let disabledCount = 0
  let warningCount = 0
  
  // Check Windows Defender status from services - ONLY REAL DATA
  const defenderService = services.find((s: any) => s.name === 'WinDefend')
  if (defenderService) {
    const status = defenderService.status === 'RUNNING' ? 'enabled' : 'disabled'
    features.push({
      name: 'Windows Defender',
      status,
      value: defenderService.status,
      critical: true
    })
    if (status === 'enabled') enabledCount++
    else disabledCount++
  }
  
  // Check BitLocker service - ONLY REAL DATA
  const bitlockerService = services.find((s: any) => s.name === 'BDESVC')
  if (bitlockerService) {
    const status = bitlockerService.status === 'RUNNING' ? 'enabled' : 'disabled'
    features.push({
      name: 'BitLocker',
      status,
      value: bitlockerService.status,
      critical: true
    })
    if (status === 'enabled') enabledCount++
    else disabledCount++
  }
  
  // Check Windows Firewall - ONLY REAL DATA
  const firewallService = services.find((s: any) => s.name === 'BFE' || s.name === 'MpsSvc')
  if (firewallService) {
    const status = firewallService.status === 'RUNNING' ? 'enabled' : 'disabled'
    features.push({
      name: 'Windows Firewall',
      status,
      value: firewallService.status,
      critical: true
    })
    if (status === 'enabled') enabledCount++
    else disabledCount++
  }
  
  // Check Windows Update service - ONLY REAL DATA
  const updateService = services.find((s: any) => s.name === 'wuauserv')
  if (updateService) {
    const status = updateService.status === 'RUNNING' ? 'enabled' : 'warning'
    features.push({
      name: 'Windows Update',
      status,
      value: updateService.status,
      critical: false
    })
    if (status === 'enabled') enabledCount++
    else warningCount++
  }
  
  // Calculate overall score (0-100) - only if we have real data
  const totalFeatures = features.length
  const score = totalFeatures > 0 ? Math.round((enabledCount / totalFeatures) * 100) : 0
  
  return {
    overallScore: score,
    issues: disabledCount,
    compliant: enabledCount,
    warnings: warningCount,
    lastScan: rawDevice.lastSeen || '',
    features
  }
}

// System Data Processing  
export interface SystemData {
  uptime: string
  bootTime: string
  osVersion: string
  kernelVersion: string
  processes: number
  services: number
  patches: number
  system?: {
    operatingSystem?: {
      name?: string
      version?: string
      build?: string
      architecture?: string
      edition?: string
      displayVersion?: string
      featureUpdate?: string
      installDate?: string
      locale?: string
      timeZone?: string
      keyboardLayouts?: string[]
      activeKeyboardLayout?: string
    }
    uptimeString?: string
  }
}

export interface SystemTabData {
  services: any[]
  environment: any[]
  updates: any[]
  runningServices: number
  stoppedServices: number
  operatingSystem: any
  uptime: string
  bootTime: string
}

export function processSystemTabData(rawDevice: any): SystemTabData {
  // Extract system data from modules structure
  const systemModule = rawDevice.modules?.system || {}
  const osQuerySystem = rawDevice.modules?.osQuery?.system?.[0] || {}
  
  // Get services data
  const services = systemModule.services || osQuerySystem.services || []
  
  // Get environment variables
  const environment = systemModule.environment || osQuerySystem.environment || []
  
  // Get updates/patches
  const updates = systemModule.updates || osQuerySystem.updates || []
  
  // Get operating system info
  const operatingSystem = systemModule.operatingSystem || osQuerySystem.operatingSystem || {}
  
  // Calculate running vs stopped services
  const runningServices = services.filter((s: any) => s.status === 'RUNNING' || s.status === 'Running').length
  const stoppedServices = services.filter((s: any) => s.status === 'STOPPED' || s.status === 'Stopped').length
  
  return {
    services,
    environment,
    updates,
    runningServices,
    stoppedServices,
    operatingSystem,
    uptime: rawDevice.uptime || systemModule.uptimeString || osQuerySystem.uptimeString || 'Unknown',
    bootTime: rawDevice.bootTime || systemModule.lastBootTime || osQuerySystem.lastBootTime || 'Unknown'
  }
}

// Hardware Tab Data Processing
interface HardwareTabData {
  cpuInfo: any[]
  memory: any[]
  storage: any[]
  graphics: any
  battery: any
  thermal: any
  usb: any[]
  processes: any[]
  runningProcesses: number
  totalMemoryGB: number
  totalStorageGB: number
}

export function processHardwareTabData(rawDevice: any): HardwareTabData {
  // Extract hardware data from modules structure
  const hardwareModule = rawDevice.modules?.hardware || {}
  const osQueryHardware = rawDevice.modules?.osQuery?.hardware || {}
  
  // Get CPU information from multiple sources
  const cpuInfo = rawDevice.cpu_info || rawDevice.cpuInfo || 
                  hardwareModule.processor || osQueryHardware.cpu_info || 
                  osQueryHardware.cpuInfo || []
  
  // Get memory information  
  const memory = rawDevice.memory || hardwareModule.memory?.modules || 
                 osQueryHardware.memory || []
  
  // Get storage information (combine different sources)
  const disks = rawDevice.disks || rawDevice.disk_info || []
  const blockDevices = rawDevice.block_devices || []
  const hardwareStorage = hardwareModule.storage || []
  const storage = [...disks, ...blockDevices, ...hardwareStorage]
  
  // Get graphics information
  const graphics = rawDevice.graphics || hardwareModule.graphics || osQueryHardware.graphics || {}
  
  // Get battery information
  const battery = rawDevice.battery || hardwareModule.battery || osQueryHardware.battery || null
  
  // Get thermal information
  const thermal = rawDevice.thermal || hardwareModule.thermal || osQueryHardware.thermal || null
  
  // Get USB devices
  const usb = rawDevice.usb_devices || rawDevice.usbDevices || 
              hardwareModule.usbDevices || osQueryHardware.usb_devices || []
  
  // Get processes information
  const processes = rawDevice.processes || osQueryHardware.processes || []
  
  // Calculate running processes
  const runningProcesses = processes.filter((proc: any) => 
    proc.state === 'R' || proc.status === 'Running').length
  
  // Calculate total memory in GB
  const totalMemoryGB = memory.reduce((sum: number, mem: any) => {
    const size = parseInt(mem.size) || parseInt(mem.capacity) || 0
    return sum + (size / (1024 * 1024 * 1024)) // Convert bytes to GB
  }, 0)
  
  // Calculate total storage in GB
  const totalStorageGB = storage.reduce((sum: number, disk: any) => {
    const size = parseInt(disk.size) || parseInt(disk.capacity) || 0
    return sum + (size / (1024 * 1024 * 1024)) // Convert bytes to GB
  }, 0)
  
  return {
    cpuInfo: Array.isArray(cpuInfo) ? cpuInfo : [],
    memory: Array.isArray(memory) ? memory : [],
    storage: Array.isArray(storage) ? storage : [],
    graphics,
    battery,
    thermal,
    usb: Array.isArray(usb) ? usb : [],
    processes: Array.isArray(processes) ? processes : [],
    runningProcesses,
    totalMemoryGB: Math.round(totalMemoryGB * 100) / 100, // Round to 2 decimal places
    totalStorageGB: Math.round(totalStorageGB * 100) / 100
  }
}

export function processSystemData(rawDevice: any): SystemData {
  // Handle new unified data structure first
  const systemModule = rawDevice.modules?.system || {}
  const operatingSystem = systemModule.operatingSystem || rawDevice.operatingSystem || {}
  
  // Fallback to old structure if new structure not found
  const oldSystemData = rawDevice.modules?.osQuery?.system?.[0] || {}
  const fallbackOperatingSystem = oldSystemData.operatingSystem || {}
  
  // Use new structure data if available, otherwise fall back to old structure
  const finalOperatingSystem = Object.keys(operatingSystem).length > 0 ? operatingSystem : fallbackOperatingSystem
  const systemData = Object.keys(systemModule).length > 0 ? systemModule : oldSystemData
  const services = systemData.services || oldSystemData.services || []
  
  console.log('[processSystemData] Raw device modules:', Object.keys(rawDevice.modules || {}))
  console.log('[processSystemData] System module keys:', Object.keys(systemModule))
  console.log('[processSystemData] Operating system data:', finalOperatingSystem)
  console.log('[processSystemData] System data keys:', Object.keys(systemData))
  
  return {
    uptime: rawDevice.uptime || systemData.uptimeString || oldSystemData.uptimeString || 'Unknown',
    bootTime: rawDevice.bootTime || systemData.lastBootTime || oldSystemData.lastBootTime || 'Unknown',
    osVersion: rawDevice.osVersion || finalOperatingSystem.version || rawDevice.os || 'Unknown',
    kernelVersion: finalOperatingSystem.build || finalOperatingSystem.kernelVersion || 'Unknown',
    processes: systemData.runningProcesses?.length || oldSystemData.runningProcesses?.length || 250, // Estimated
    services: services.length || 0,
    patches: systemData.updates?.length || oldSystemData.updates?.length || 0,
    system: {
      operatingSystem: finalOperatingSystem,
      uptimeString: systemData.uptimeString || oldSystemData.uptimeString
    }
  }
}

// Events Data Processing
export interface EventsData {
  totalEvents: number
  recentEvents: number
  errors: number
  warnings: number
  lastEvent: string
  eventsByType: Record<string, number>
}

export function processEventsData(rawDevice: any, events: any[]): EventsData {
  const now = new Date()
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  
  const recentEvents = events.filter(event => new Date(event.ts) > last24Hours)
  const errors = events.filter(event => event.kind === 'Error').length
  const warnings = events.filter(event => event.kind === 'Warning').length
  
  // Event type breakdown
  const eventsByType: Record<string, number> = {}
  events.forEach(event => {
    const type = event.kind || 'Unknown'
    eventsByType[type] = (eventsByType[type] || 0) + 1
  })
  
  return {
    totalEvents: events.length,
    recentEvents: recentEvents.length,
    errors,
    warnings,
    lastEvent: rawDevice.lastEventTime || rawDevice.lastSeen || '',
    eventsByType
  }
}

// Installs Data Processing
export interface InstallsData {
  totalPackages: number
  installed: number
  pending: number
  failed: number
  lastUpdate: string
  packages: InstallPackage[]
  config?: {
    type: 'cimian' | 'munki'
    version: string
    softwareRepoURL: string
    manifest: string
    runType: string
    lastRun: string
    duration: string
  }
}

export interface InstallPackage {
  id: string
  name: string
  displayName: string
  version: string
  status: string
  type: string
  lastUpdate: string
}

export function processInstallsData(rawDevice: any): InstallsData {
  // Extract managed installs data from API response only
  const installs = rawDevice.managedInstalls || rawDevice.modules?.installs || rawDevice.modules?.managedInstalls || {}
  const cimianData = installs.cimian || installs.Cimian || {}
  const packages = installs.packages || installs.recentInstalls || []
  
  // Check if managed installs system is Cimian from API data
  const managedInstallsSystem = rawDevice.modules?.managedInstallsSystem
  
  // Extract Cimian configuration from API data only - NO FAKE DATA
  let config = undefined
  if (cimianData.isInstalled || managedInstallsSystem === 'Cimian') {
    config = {
      type: 'cimian' as const,
      version: cimianData.version || 'Unknown',
      softwareRepoURL: cimianData.softwareRepoURL || 'Unknown',
      manifest: cimianData.manifest || rawDevice.serialNumber || rawDevice.deviceId || 'Unknown',
      runType: cimianData.runType || 'Unknown',
      lastRun: cimianData.lastRun || rawDevice.lastSeen || 'Unknown',
      duration: cimianData.duration || 'Unknown'
    }
  }
  
  // Process only real packages from API - NO FAKE DATA
  const processedPackages: InstallPackage[] = packages.map((pkg: any) => ({
    id: pkg.id || pkg.name || 'unknown',
    name: pkg.name || 'Unknown Package',
    displayName: pkg.displayName || pkg.name || 'Unknown Package',
    version: pkg.version || pkg.installedVersion || 'Unknown',
    status: pkg.status || 'unknown',
    type: pkg.type || (managedInstallsSystem === 'Cimian' ? 'cimian' : 'munki'),
    lastUpdate: pkg.lastUpdate || installs.lastUpdate || ''
  }))
  
  const installed = processedPackages.filter(p => p.status === 'installed').length
  const pending = processedPackages.filter(p => p.status?.includes('pending')).length
  const failed = processedPackages.filter(p => p.status?.includes('failed')).length
  
  return {
    totalPackages: processedPackages.length,
    installed,
    pending,
    failed,
    lastUpdate: installs.lastUpdate || rawDevice.lastSeen || '',
    packages: processedPackages,
    config: config
  }
}

// Profiles Data Processing
export interface ProfilesData {
  totalProfiles: number
  systemProfiles: number
  userProfiles: number
  profiles: ProfileInfo[]
}

export interface ProfileInfo {
  id: string
  name: string
  displayName: string
  description?: string
  organization?: string
  uuid: string
  identifier: string
  type: 'Device' | 'User'
  installDate: string
  payloads?: Array<{
    type?: string
    displayName?: string
    identifier?: string
  }> | null
  isRemovable: boolean
  hasRemovalPasscode: boolean
  isEncrypted: boolean
}

export function processProfilesData(rawDevice: any): ProfilesData {
  // Extract profiles data from API response only - NO FAKE DATA
  let profiles: any[] = []
  
  console.log('🔧 processProfilesData DEBUG:', {
    hasRawDevice: !!rawDevice,
    rawDeviceKeys: rawDevice ? Object.keys(rawDevice) : [],
    hasModules: !!rawDevice?.modules,
    moduleKeys: rawDevice?.modules ? Object.keys(rawDevice.modules) : [],
    hasProfilesModule: !!rawDevice?.modules?.profiles,
    profilesModuleKeys: rawDevice?.modules?.profiles ? Object.keys(rawDevice.modules.profiles) : [],
    // Check for various profile field variations
    hasConfigurationProfiles: !!rawDevice?.modules?.profiles?.configurationProfiles,
    configurationProfilesLength: rawDevice?.modules?.profiles?.configurationProfiles?.length || 0,
    hasIntunePolicies: !!rawDevice?.modules?.profiles?.intunePolicies,
    intunePoliciesLength: rawDevice?.modules?.profiles?.intunePolicies?.length || 0,
    hasRegistryPolicies: !!rawDevice?.modules?.profiles?.registryPolicies,
    registryPoliciesLength: rawDevice?.modules?.profiles?.registryPolicies?.length || 0,
    sampleRawDevice: JSON.stringify(rawDevice).substring(0, 1000)
  })
  
  // Look in various locations for profiles data from API - check both camelCase and PascalCase
  if (rawDevice.modules?.profiles?.configurationProfiles?.length > 0) {
    profiles = rawDevice.modules.profiles.configurationProfiles
    console.log('✅ Found profiles in rawDevice.modules.profiles.configurationProfiles:', profiles.length)
  } else if (rawDevice.modules?.profiles?.intunePolicies?.length > 0) {
    // Group Intune policies by policy area instead of showing each setting as a separate profile
    const groupedPolicies = groupIntunePoliciesByArea(rawDevice.modules.profiles.intunePolicies)
    profiles = Object.values(groupedPolicies)
    console.log('✅ Found profiles in rawDevice.modules.profiles.intunePolicies (grouped by area):', profiles.length)
  } else if (rawDevice.modules?.profiles?.registryPolicies?.length > 0) {
    // Group Registry policies by source and category
    const groupedPolicies = groupRegistryPoliciesBySource(rawDevice.modules.profiles.registryPolicies)
    profiles = Object.values(groupedPolicies)
    console.log('✅ Found profiles in rawDevice.modules.profiles.registryPolicies (grouped by source):', profiles.length)  
  } else if (rawDevice.management?.profiles) {
    profiles = rawDevice.management.profiles
    console.log('✅ Found profiles in rawDevice.management.profiles:', profiles.length)
  } else if (rawDevice.mdm?.profiles) {
    profiles = rawDevice.mdm.profiles
    console.log('✅ Found profiles in rawDevice.mdm.profiles:', profiles.length)
  } else if (rawDevice.profiles) {
    profiles = rawDevice.profiles
    console.log('✅ Found profiles in rawDevice.profiles:', profiles.length)
  } else {
    console.log('❌ No profiles found in any expected location')
  }
  
  // Process only real profiles from API - NO FAKE DATA
  const processedProfiles: ProfileInfo[] = profiles.map((profile: any, index: number) => ({
    id: profile.id || profile.identifier || profile.policyId || `profile-${index}`,
    name: profile.name || profile.displayName || profile.policyName || 'Unknown Profile',
    displayName: profile.displayName || profile.name || profile.policyName || 'Unknown Profile',
    uuid: profile.uuid || profile.identifier || profile.policyId || profile.id || `profile-${index}`,
    identifier: profile.identifier || profile.policyId || profile.id || `profile-${index}`,
    type: (profile.type === 'User' ? 'User' : 'Device') as 'Device' | 'User',
    installDate: profile.installDate || profile.dateInstalled || profile.assignedDate || profile.lastSync || profile.lastModified || '',
    organization: profile.organization || profile.source || 'Unknown',
    description: profile.description || profile.policyType || profile.category || '',
    payloads: Array.isArray(profile.payloads) ? profile.payloads : (Array.isArray(profile.settings) ? profile.settings : []),
    isRemovable: Boolean(profile.removable) || (profile.enforcementState ? profile.enforcementState !== 'Enforced' : true),
    hasRemovalPasscode: Boolean(profile.hasRemovalPasscode),
    isEncrypted: Boolean(profile.encrypted)
  }))
  
  const systemProfiles = processedProfiles.filter(p => p.type === 'Device').length
  const userProfiles = processedProfiles.filter(p => p.type === 'User').length
  
  return {
    totalProfiles: processedProfiles.length,
    systemProfiles: systemProfiles, // Device profiles count as system profiles
    userProfiles,
    profiles: processedProfiles
  }
}

// Helper function to group Intune policies by policy area
function groupIntunePoliciesByArea(intunePolicies: any[]): Record<string, any> {
  const grouped: Record<string, any> = {}
  
  intunePolicies.forEach(policy => {
    const policyArea = policy.policyType || policy.policyName || 'Unknown'
    
    if (!grouped[policyArea]) {
      grouped[policyArea] = {
        id: policy.policyId || policyArea,
        name: policyArea,
        displayName: policyArea,
        policyType: policy.policyType,
        organization: 'Microsoft Intune',
        assignedDate: policy.assignedDate,
        lastSync: policy.lastSync,
        status: policy.status,
        enforcementState: policy.enforcementState,
        settings: []
      }
    }
    
    // Combine settings from all policies in this area
    if (Array.isArray(policy.settings)) {
      grouped[policyArea].settings.push(...policy.settings)
    }
  })
  
  return grouped
}

// Helper function to group Registry policies by source
function groupRegistryPoliciesBySource(registryPolicies: any[]): Record<string, any> {
  const grouped: Record<string, any> = {}
  
  registryPolicies.forEach(policy => {
    const source = policy.source || 'Group Policy'
    const category = policy.category || 'General'
    const groupKey = `${source}-${category}`
    
    if (!grouped[groupKey]) {
      grouped[groupKey] = {
        id: groupKey,
        name: `${source} - ${category}`,
        displayName: `${source} - ${category}`,
        source: policy.source,
        category: policy.category,
        lastModified: policy.lastModified,
        settings: []
      }
    }
    
    // Add this policy as a setting
    grouped[groupKey].settings.push({
      name: policy.valueName,
      value: policy.value,
      type: policy.type,
      keyPath: policy.keyPath,
      description: `Registry setting: ${policy.valueName}`
    })
  })
  
  return grouped
}

// Export all processors
export const dataProcessors = {
  applications: processApplicationsData,
  hardware: processHardwareData,
  network: processNetworkData,
  security: processSecurityData,
  system: processSystemData,
  events: processEventsData,
  installs: processInstallsData,
  profiles: processProfilesData
}

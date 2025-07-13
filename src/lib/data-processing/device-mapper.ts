/**
 * Device Data Mapping and Processing Utilities
 * Transforms raw API data into structured format for UI components
 */

// Core device interfaces that match our widget expectations
export interface ProcessedDeviceInfo {
  // Basic Information
  id: string
  name: string
  serialNumber: string
  assetTag?: string
  deviceId?: string
  model?: string
  manufacturer?: string
  lastSeen: string
  status: 'online' | 'offline' | 'warning' | 'error'
  location?: string

  // Operating System (granular)
  osName?: string
  osVersion?: string
  osBuild?: string
  osArchitecture?: string
  os?: string // Fallback for legacy parsing
  architecture?: string // Fallback
  platform?: string

  // Hardware
  processor?: string
  processorSpeed?: string
  cores?: number
  memory?: string
  storage?: string
  storageType?: string
  graphics?: string
  vram?: string
  resolution?: string
  temperature?: number
  batteryLevel?: number

  // Network
  ipAddress?: string
  ipAddressV4?: string
  ipAddressV6?: string
  macAddress?: string
  network?: {
    hostname: string
    connectionType: string
    ssid?: string
    signalStrength?: string
    interfaces?: any[]
    addresses?: any[]
  }

  // System
  uptime?: string
  bootTime?: string
  cpuUtilization?: number
  memoryUtilization?: number
  diskUtilization?: number

  // Management (MDM)
  management?: {
    enrolled: boolean
    vendor?: string
    organization?: string
    server_url?: string
    enrolled_via_dep?: boolean
    user_approved?: boolean
    profiles?: any[]
    restrictions?: any
    apps?: any[]
  }

  // Security Features (standardized format)
  securityFeatures?: {
    // Windows-specific
    bitlocker?: { enabled: boolean; status: string }
    windowsDefender?: { enabled: boolean; status: string }
    uac?: { enabled: boolean; status: string }
    windowsUpdates?: { enabled: boolean; status: string }
    smartScreen?: { enabled: boolean; status: string }
    tpm?: { enabled: boolean; status: string; version?: string }
    firewall?: { enabled: boolean; status: string }
    
    // Mac-specific
    filevault?: { enabled: boolean; status: string }
    gatekeeper?: { enabled: boolean; status: string }
    sip?: { enabled: boolean; status: string }
    xprotect?: { enabled: boolean; status: string }
    automaticUpdates?: { enabled: boolean; status: string }
    
    // Cross-platform
    antivirus?: { enabled: boolean; status: string }
    autoupdate?: { enabled: boolean; status: string }
    edr?: { installed: boolean; name: string | null; status: string; version: string | null }
  }

  // Applications
  applications?: {
    totalApps: number
    installedApps: any[]
  }

  // Managed Installs
  managedInstalls?: {
    totalPackages: number
    installed: number
    pending: number
    failed: number
    lastUpdate: string
    packages: any[]
    config?: any
    messages?: any
  }

  // Events
  totalEvents?: number
  lastEventTime?: string
}

/**
 * Parse legacy OS string into granular components
 * Input: "Microsoft Windows 11 Enterprise 10.0.26100 (Build 26100)"
 * Output: { osName, osVersion, osBuild }
 */
export function parseOperatingSystem(osString: string) {
  if (!osString) return { osName: 'Unknown', osVersion: 'Unknown', osBuild: 'Unknown' }

  // Windows format: "Microsoft Windows 11 Enterprise 10.0.26100 (Build 26100)"
  const windowsMatch = osString.match(/^(Microsoft Windows \d+.*?)\s+(\d+\.\d+\.\d+).*?\(Build (\d+)\)/)
  if (windowsMatch) {
    const [, osName, buildNumber, buildVersion] = windowsMatch
    // Convert build number to version name for common Windows versions
    let versionName = 'Unknown'
    if (buildNumber.startsWith('10.0.26100')) versionName = '24H2'
    else if (buildNumber.startsWith('10.0.22631')) versionName = '23H2'
    else if (buildNumber.startsWith('10.0.22621')) versionName = '22H2'
    else if (buildNumber.startsWith('10.0.19045')) versionName = '22H2'
    else if (buildNumber.startsWith('10.0.19044')) versionName = '21H2'
    
    return {
      osName: osName.trim(),
      osVersion: versionName,
      osBuild: buildNumber
    }
  }

  // macOS format: "macOS 15.2.0" or "macOS Sequoia 15.2.0"
  const macOSMatch = osString.match(/^(macOS.*?)\s+(\d+\.\d+\.\d+)/)
  if (macOSMatch) {
    const [, osName, version] = macOSMatch
    return {
      osName: osName.trim(),
      osVersion: version,
      osBuild: version
    }
  }

  // Generic version pattern: "OS Name version.number"
  const genericMatch = osString.match(/^(.*?)\s+(\d+\.\d+(?:\.\d+)?)/)
  if (genericMatch) {
    const [, osName, version] = genericMatch
    return {
      osName: osName.trim(),
      osVersion: version,
      osBuild: version
    }
  }

  // Fallback: use the entire string as OS name
  return {
    osName: osString,
    osVersion: 'Unknown',
    osBuild: 'Unknown'
  }
}

/**
 * Determine the device platform from OS string
 */
export function detectPlatform(osString: string): string {
  if (!osString) return 'Unknown'
  
  const os = osString.toLowerCase()
  if (os.includes('windows')) return 'Windows'
  if (os.includes('macos') || os.includes('mac os')) return 'macOS'
  if (os.includes('linux')) return 'Linux'
  if (os.includes('ubuntu')) return 'Ubuntu'
  if (os.includes('centos')) return 'CentOS'
  if (os.includes('android')) return 'Android'
  if (os.includes('ios')) return 'iOS'
  
  return 'Unknown'
}

/**
 * Format uptime string from seconds or other formats
 */
export function formatUptime(uptime: any): string {
  if (!uptime && uptime !== 0) return 'Unknown'
  
  const seconds = typeof uptime === 'number' ? uptime : parseInt(uptime, 10)
  if (isNaN(seconds)) return 'Unknown'
  
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else {
    return `${minutes}m`
  }
}

/**
 * Normalize security features to standard format
 */
export function normalizeSecurityFeatures(rawSecurity: any, platform: string) {
  if (!rawSecurity) return {}
  
  const normalized: any = {}
  
  // Handle different input formats
  const features = rawSecurity.securityFeatures || rawSecurity
  
  if (features.antivirus) {
    normalized.antivirus = {
      enabled: Boolean(features.antivirus.enabled),
      status: features.antivirus.status || 'Unknown'
    }
  }
  
  if (features.firewall) {
    normalized.firewall = {
      enabled: Boolean(features.firewall.enabled),
      status: features.firewall.status || 'Unknown'
    }
  }
  
  if (features.bitlocker) {
    normalized.bitlocker = {
      enabled: Boolean(features.bitlocker.enabled),
      status: features.bitlocker.status || 'Unknown'
    }
  }
  
  if (features.tpm) {
    normalized.tpm = {
      enabled: Boolean(features.tpm.enabled),
      status: features.tpm.status || 'Unknown',
      version: features.tpm.version
    }
  }
  
  if (features.autoupdate) {
    normalized.windowsUpdates = {
      enabled: Boolean(features.autoupdate.enabled),
      status: features.autoupdate.status || 'Unknown'
    }
  }
  
  // Map other platform-specific features as needed
  
  return normalized
}

/**
 * Main device data mapper function
 */
export function mapDeviceData(rawDevice: any): ProcessedDeviceInfo {
  // Parse operating system information - support both flat and nested structures
  const osString = rawDevice.os || 
                   (rawDevice.OperatingSystem ? 
                     `${rawDevice.OperatingSystem.Name} ${rawDevice.OperatingSystem.Version} ${rawDevice.OperatingSystem.Build}`.trim() :
                     ''
                   )
  const osInfo = parseOperatingSystem(osString)
  const platform = detectPlatform(osString)
  
  // Enhanced processor detection for new optimized client data
  const getProcessorName = (device: any): string => {
    // Try the new optimized client data structure first (from data.processor)
    if (device.data?.processor) {
      return device.data.processor
    }
    
    // Try direct processor field
    if (device.processor) {
      return device.processor
    }
    
    // Try Hardware structure (legacy Azure Functions format)
    if (device.Hardware?.Processor) {
      return device.Hardware.Processor
    }
    
    // Try lowercase hardware structure
    if (device.hardware?.processor) {
      return device.hardware.processor
    }
    
    // Try nested device object
    if (device.device?.processor) {
      return device.device.processor
    }
    
    return 'Unknown'
  }

  // Enhanced cores detection
  const getCores = (device: any): number | undefined => {
    // Try the new optimized client data structure first
    if (device.data?.cores) {
      return device.data.cores
    }
    
    // Try other structures
    return device.cores || device.Hardware?.Cores || device.hardware?.cores || undefined
  }

  // Enhanced memory detection
  const getMemory = (device: any): string | undefined => {
    // Try the new optimized client data structure first
    if (device.data?.memory) {
      return device.data.memory
    }
    
    // Try other structures
    return device.memory || device.Hardware?.Memory || device.hardware?.memory || undefined
  }

  // Enhanced graphics detection
  const getGraphics = (device: any): string | undefined => {
    // Try the new optimized client data structure first
    if (device.data?.graphics) {
      return device.data.graphics
    }
    
    // Try other structures
    return device.graphics || device.Hardware?.Graphics || device.hardware?.graphics || undefined
  }

  // Enhanced storage detection
  const getStorage = (device: any): string | undefined => {
    // Try the new optimized client data structure first
    if (device.data?.storage) {
      return device.data.storage
    }
    
    // Try other structures
    return device.storage || device.Hardware?.Storage || device.hardware?.storage || undefined
  }
  
  // Base device information - support both flat and nested structures
  const processedDevice: ProcessedDeviceInfo = {
    id: rawDevice.id || rawDevice.serialNumber || rawDevice.BasicInfo?.SerialNumber || rawDevice.device?.serialNumber,
    name: rawDevice.name || rawDevice.BasicInfo?.Name || rawDevice.device?.computerName || 'Unknown Device',
    serialNumber: rawDevice.serialNumber || rawDevice.BasicInfo?.SerialNumber || rawDevice.device?.serialNumber || rawDevice.id,
    assetTag: rawDevice.assetTag || rawDevice.BasicInfo?.AssetTag || rawDevice.device?.assetTag || undefined,
    deviceId: rawDevice.deviceId || rawDevice.DeviceId || rawDevice.device?.deviceId,
    model: rawDevice.model || rawDevice.BasicInfo?.Model || rawDevice.device?.model,
    manufacturer: rawDevice.manufacturer || rawDevice.BasicInfo?.Manufacturer || rawDevice.device?.manufacturer,
    lastSeen: rawDevice.lastSeen || rawDevice.LastUpdated || rawDevice.collection_timestamp,
    status: rawDevice.status || rawDevice.device?.status || 'offline',
    location: rawDevice.location,
    
    // Operating System (granular) - support both flat and nested structures
    osName: osInfo.osName || rawDevice.OperatingSystem?.Name || rawDevice.device?.osName,
    osVersion: osInfo.osVersion || rawDevice.OperatingSystem?.Version || rawDevice.device?.osVersion,
    osBuild: osInfo.osBuild || rawDevice.OperatingSystem?.Build || rawDevice.device?.osBuild,
    osArchitecture: rawDevice.architecture || rawDevice.OperatingSystem?.Architecture || rawDevice.device?.osArchitecture,
    os: osString, // Keep for fallback
    architecture: rawDevice.architecture || rawDevice.OperatingSystem?.Architecture || rawDevice.device?.osArchitecture,
    platform: platform,
    
    // Hardware - enhanced detection for optimized client data
    processor: getProcessorName(rawDevice),
    cores: getCores(rawDevice),
    memory: getMemory(rawDevice),
    storage: getStorage(rawDevice),
    storageType: rawDevice.storageType || rawDevice.Hardware?.StorageType || rawDevice.hardware?.storageType,
    graphics: getGraphics(rawDevice),
    vram: rawDevice.vram || rawDevice.Hardware?.Vram || rawDevice.hardware?.vram,
    temperature: rawDevice.temperature,
    batteryLevel: rawDevice.batteryLevel,
    
    // Network - support both flat and nested structures
    ipAddress: rawDevice.ipAddress || rawDevice.Network?.IpAddress || rawDevice.ipAddressV4 || rawDevice.device?.ipAddressV4,
    ipAddressV4: rawDevice.ipAddressV4 || rawDevice.Network?.IpAddress || rawDevice.device?.ipAddressV4,
    ipAddressV6: rawDevice.ipAddressV6,
    macAddress: rawDevice.macAddress || rawDevice.Network?.MacAddress,
    network: rawDevice.network || (rawDevice.Network ? {
      hostname: rawDevice.Network.Hostname || rawDevice.name,
      connectionType: rawDevice.Network.ConnectionType || 'Unknown',
      ssid: rawDevice.Network.ssid,
      signalStrength: rawDevice.Network.signalStrength,
      interfaces: rawDevice.Network.interfaces || [],
      addresses: rawDevice.Network.addresses || []
    } : undefined),
    
    // System
    uptime: formatUptime(rawDevice.uptime),
    bootTime: rawDevice.bootTime,
    cpuUtilization: rawDevice.cpuUtilization,
    memoryUtilization: rawDevice.memoryUtilization,
    diskUtilization: rawDevice.diskUtilization,
    
    // Management (MDM) - support both flat and nested structures
    management: rawDevice.mdm || rawDevice.Management ? {
      enrolled: Boolean((rawDevice.mdm || rawDevice.Management)?.enrolled),
      vendor: (rawDevice.mdm || rawDevice.Management)?.organization || (rawDevice.mdm || rawDevice.Management)?.vendor,
      organization: (rawDevice.mdm || rawDevice.Management)?.organization,
      server_url: (rawDevice.mdm || rawDevice.Management)?.server_url,
      enrolled_via_dep: (rawDevice.mdm || rawDevice.Management)?.enrolled_via_dep,
      user_approved: (rawDevice.mdm || rawDevice.Management)?.user_approved,
      profiles: (rawDevice.mdm || rawDevice.Management)?.profiles || [],
      restrictions: (rawDevice.mdm || rawDevice.Management)?.restrictions || {},
      apps: (rawDevice.mdm || rawDevice.Management)?.apps || []
    } : undefined,
    
    // Security Features - support both flat and nested structures
    securityFeatures: normalizeSecurityFeatures(rawDevice.security || rawDevice.Security || rawDevice.securityFeatures, platform),
    
    // Applications - support both flat and nested structures
    applications: rawDevice.applications || rawDevice.Applications || {
      totalApps: (rawDevice.Applications || []).length || 0,
      installedApps: rawDevice.Applications || []
    },
    
    // Managed Installs
    managedInstalls: rawDevice.managedInstalls || {
      totalPackages: 0,
      installed: 0,
      pending: 0,
      failed: 0,
      lastUpdate: rawDevice.lastSeen || new Date().toISOString(),
      packages: []
    },
    
    // Events
    totalEvents: rawDevice.totalEvents,
    lastEventTime: rawDevice.lastEventTime
  }
  
  return processedDevice
}

export default mapDeviceData

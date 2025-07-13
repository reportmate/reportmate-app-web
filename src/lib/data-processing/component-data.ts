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
  const apps = rawDevice.applications?.installedApps || []
  
  // Process installed applications
  const installedApps: ApplicationInfo[] = apps.map((app: any) => ({
    id: app.id || app.name || app.displayName,
    name: app.name || app.displayName || 'Unknown',
    displayName: app.displayName || app.name,
    version: app.version || app.bundle_version || 'Unknown',
    publisher: app.publisher || app.signed_by || 'Unknown',
    category: app.category || 'Uncategorized',
    installDate: app.installDate || app.last_modified,
    size: app.size,
    path: app.path
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
  return {
    cpu: rawDevice.processor || rawDevice.hardware?.processor || 'Unknown',
    memory: rawDevice.memory || rawDevice.hardware?.memory || 'Unknown',
    storage: rawDevice.storage || rawDevice.hardware?.storage || 'Unknown',
    graphics: rawDevice.graphics || rawDevice.hardware?.graphics || 'Unknown',
    architecture: rawDevice.architecture || rawDevice.hardware?.architecture || 'Unknown',
    temperature: rawDevice.temperature,
    memoryUtilization: rawDevice.memoryUtilization,
    cpuUtilization: rawDevice.cpuUtilization,
    diskUtilization: rawDevice.diskUtilization
  }
}

// Network Data Processing
export interface NetworkData {
  connectionType: string
  ipAddress: string
  macAddress: string
  hostname: string
  signalStrength?: string
  ssid?: string
  interfaces: NetworkInterface[]
}

export interface NetworkInterface {
  name: string
  type: string
  status: string
  ipAddress?: string
  macAddress?: string
}

export function processNetworkData(rawDevice: any): NetworkData {
  const network = rawDevice.network || {}
  
  return {
    connectionType: network.connectionType || 'Unknown',
    ipAddress: rawDevice.ipAddress || rawDevice.ipAddressV4 || network.ipv4ip || 'Unknown',
    macAddress: rawDevice.macAddress || network.ethernet || 'Unknown',
    hostname: network.hostname || rawDevice.name || 'Unknown',
    signalStrength: network.signalStrength,
    ssid: network.ssid,
    interfaces: network.interfaces || []
  }
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
  const security = rawDevice.securityFeatures || rawDevice.security || {}
  const features: SecurityFeature[] = []
  
  let enabledCount = 0
  let disabledCount = 0
  let warningCount = 0
  
  // Process each security feature
  Object.entries(security).forEach(([key, value]: [string, any]) => {
    if (value && typeof value === 'object' && 'enabled' in value) {
      const status = value.enabled ? 'enabled' : 'disabled'
      const critical = ['bitlocker', 'filevault', 'tpm', 'firewall'].includes(key)
      
      features.push({
        name: key,
        status,
        value: value.status || 'Unknown',
        critical
      })
      
      if (status === 'enabled') {
        enabledCount++
      } else if (status === 'disabled' && critical) {
        disabledCount++
      }
    }
  })
  
  // Calculate overall score (0-100)
  const totalFeatures = features.length
  const score = totalFeatures > 0 ? Math.round((enabledCount / totalFeatures) * 100) : 0
  
  return {
    overallScore: score,
    issues: disabledCount,
    compliant: enabledCount,
    warnings: warningCount,
    lastScan: rawDevice.lastSeen || new Date().toISOString(),
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
}

export function processSystemData(rawDevice: any): SystemData {
  const system = rawDevice.system || {}
  
  return {
    uptime: rawDevice.uptime || 'Unknown',
    bootTime: rawDevice.bootTime || 'Unknown',
    osVersion: rawDevice.osVersion || rawDevice.os || 'Unknown',
    kernelVersion: system.kernelVersion || 'Unknown',
    processes: system.runningServices?.length || 0,
    services: system.runningServices?.length || 0,
    patches: system.recentPatches?.length || 0
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
  const installs = rawDevice.managedInstalls || {}
  const packages = installs.packages || []
  
  const processedPackages: InstallPackage[] = packages.map((pkg: any) => ({
    id: pkg.id || pkg.name,
    name: pkg.name,
    displayName: pkg.displayName || pkg.name,
    version: pkg.version || pkg.installedVersion || 'Unknown',
    status: pkg.status,
    type: pkg.type || 'munki',
    lastUpdate: pkg.lastUpdate || installs.lastUpdate || ''
  }))
  
  return {
    totalPackages: installs.totalPackages || packages.length,
    installed: installs.installed || packages.filter((p: any) => p.status === 'installed').length,
    pending: installs.pending || packages.filter((p: any) => p.status === 'pending_install').length,
    failed: installs.failed || packages.filter((p: any) => p.status?.includes('failed')).length,
    lastUpdate: installs.lastUpdate || rawDevice.lastSeen || '',
    packages: processedPackages
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
  identifier: string
  type: 'System' | 'User'
  installDate: string
  organization?: string
  description?: string
  payloads: number
  removable: boolean
  encrypted: boolean
}

export function processProfilesData(rawDevice: any): ProfilesData {
  const mdm = rawDevice.management || rawDevice.mdm || {}
  const profiles = mdm.profiles || []
  
  const processedProfiles: ProfileInfo[] = profiles.map((profile: any) => ({
    id: profile.id || profile.identifier,
    name: profile.name || profile.displayName,
    identifier: profile.identifier,
    type: profile.type || 'System',
    installDate: profile.installDate || profile.dateInstalled || '',
    organization: profile.organization || mdm.organization,
    description: profile.description,
    payloads: Array.isArray(profile.payloads) ? profile.payloads.length : 0,
    removable: Boolean(profile.removable),
    encrypted: Boolean(profile.encrypted)
  }))
  
  const systemProfiles = processedProfiles.filter(p => p.type === 'System').length
  const userProfiles = processedProfiles.filter(p => p.type === 'User').length
  
  return {
    totalProfiles: processedProfiles.length,
    systemProfiles,
    userProfiles,
    profiles: processedProfiles
  }
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

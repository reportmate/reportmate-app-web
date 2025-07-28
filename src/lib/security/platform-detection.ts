/**
 * Platform Detection Utility for Security Features
 * Determines device platform and provides platform-specific security feature mapping
 */

export type Platform = 'windows' | 'macos' | 'linux' | 'unknown'

export interface Device {
  deviceId: string      // Internal UUID (unique)
  serialNumber: string  // Human-readable unique identifier  
  name?: string
  hostname?: string
  osName?: string
  os?: string
  platform?: string
  modules?: {
    security?: any
    system?: any
  }
  security?: any
}

export interface SecurityFeature {
  key: string
  label: string
  windowsOnly?: boolean
  macosOnly?: boolean
  linuxOnly?: boolean
  priority: number
}

/**
 * Platform-specific security features configuration
 */
export const SECURITY_FEATURES: Record<Platform, SecurityFeature[]> = {
  windows: [
    { key: 'antivirus', label: 'Antivirus Protection', priority: 1 },
    { key: 'firewall', label: 'Windows Firewall', priority: 2 },
    { key: 'encryption', label: 'BitLocker Encryption', windowsOnly: true, priority: 3 },
    { key: 'tpm', label: 'TPM Security', windowsOnly: true, priority: 4 },
    { key: 'securityUpdates', label: 'Security Updates', priority: 5 },
  ],
  macos: [
    { key: 'antivirus', label: 'XProtect', priority: 1 },
    { key: 'firewall', label: 'macOS Firewall', priority: 2 },
    { key: 'encryption', label: 'FileVault', macosOnly: true, priority: 3 },
    { key: 'gatekeeper', label: 'Gatekeeper', macosOnly: true, priority: 4 },
    { key: 'sip', label: 'System Integrity Protection', macosOnly: true, priority: 5 },
    { key: 'securityUpdates', label: 'Security Updates', priority: 6 },
  ],
  linux: [
    { key: 'antivirus', label: 'Antivirus (ClamAV)', priority: 1 },
    { key: 'firewall', label: 'UFW/iptables', priority: 2 },
    { key: 'selinux', label: 'SELinux', linuxOnly: true, priority: 3 },
    { key: 'apparmor', label: 'AppArmor', linuxOnly: true, priority: 4 },
    { key: 'securityUpdates', label: 'Security Updates', priority: 5 },
  ],
  unknown: [
    { key: 'antivirus', label: 'Antivirus', priority: 1 },
    { key: 'firewall', label: 'Firewall', priority: 2 },
    { key: 'securityUpdates', label: 'Security Updates', priority: 3 },
  ]
}

/**
 * Detect platform from device information
 */
export function detectPlatform(device: Device): Platform {
  // Check explicit platform field first
  if (device.platform) {
    const platform = device.platform.toLowerCase()
    if (platform.includes('windows')) return 'windows'
    if (platform.includes('mac') || platform.includes('darwin')) return 'macos'
    if (platform.includes('linux')) return 'linux'
  }

  // Check OS name patterns
  const osName = (device.osName || device.os || '').toLowerCase()
  if (osName.includes('windows')) return 'windows'
  if (osName.includes('mac') || osName.includes('darwin')) return 'macos'
  if (osName.includes('linux') || osName.includes('ubuntu') || osName.includes('centos') || osName.includes('debian')) return 'linux'

  // Check system module OS info
  const systemOS = device.modules?.system?.operatingSystem?.name?.toLowerCase()
  if (systemOS) {
    if (systemOS.includes('windows')) return 'windows'
    if (systemOS.includes('mac') || systemOS.includes('darwin')) return 'macos'
    if (systemOS.includes('linux')) return 'linux'
  }

  return 'unknown'
}

/**
 * Get platform-specific security features to display
 */
export function getPlatformSecurityFeatures(platform: Platform): SecurityFeature[] {
  return SECURITY_FEATURES[platform] || SECURITY_FEATURES.unknown
}

/**
 * Check if a security feature should be displayed for the current platform
 */
export function shouldDisplayFeature(feature: SecurityFeature, platform: Platform): boolean {
  // If feature has platform restrictions, check them
  if (feature.windowsOnly && platform !== 'windows') return false
  if (feature.macosOnly && platform !== 'macos') return false
  if (feature.linuxOnly && platform !== 'linux') return false
  
  return true
}

/**
 * Get security status for display (success, warning, error)
 */
export function getSecurityStatus(featureData: any, featureKey: string, platform: Platform): 'success' | 'warning' | 'error' {
  if (!featureData) return 'error'

  switch (featureKey) {
    case 'antivirus':
      if (featureData.isEnabled === true) return 'success'
      if (featureData.enabled === true) return 'success'
      return 'error'

    case 'firewall':
      if (featureData.isEnabled === true) return 'success'
      if (featureData.enabled === true) return 'success'
      return 'error'

    case 'encryption':
      if (platform === 'windows') {
        if (featureData.bitLocker?.isEnabled === true) return 'success'
        return 'error'
      }
      if (platform === 'macos') {
        if (featureData.fileVault === true || featureData.filevault_status === true) return 'success'
        return 'error'
      }
      return 'warning'

    case 'tpm':
      if (featureData.isPresent === true && featureData.isEnabled === true) return 'success'
      if (featureData.isPresent === true) return 'warning'
      return 'error'

    case 'gatekeeper':
      if (featureData === 'Enabled' || featureData.enabled === true) return 'success'
      return 'error'

    case 'sip':
      if (featureData === 'Enabled' || featureData.enabled === true) return 'success'
      return 'warning'

    case 'securityUpdates':
      if (Array.isArray(featureData) && featureData.length > 0) return 'success'
      return 'warning'

    default:
      return 'warning'
  }
}

/**
 * Format security feature value for display
 */
export function formatSecurityValue(featureData: any, featureKey: string, platform: Platform): string {
  if (!featureData) return 'Unknown'

  switch (featureKey) {
    case 'antivirus':
      if (platform === 'windows') {
        if (featureData.isEnabled && featureData.name) {
          return `${featureData.name} (Active)`
        }
        return featureData.isEnabled ? 'Active' : 'Inactive'
      }
      if (platform === 'macos') {
        return featureData.enabled ? 'XProtect Active' : 'XProtect Inactive'
      }
      return featureData.enabled ? 'Active' : 'Inactive'

    case 'firewall':
      const status = featureData.isEnabled || featureData.enabled ? 'Enabled' : 'Disabled'
      if (featureData.profile) {
        return `${status} (${featureData.profile})`
      }
      return status

    case 'encryption':
      if (platform === 'windows') {
        if (featureData.bitLocker?.isEnabled) {
          const drives = featureData.bitLocker.encryptedDrives
          if (drives) {
            const driveList = Array.isArray(drives) ? drives : [drives]
            return `Enabled (${driveList.join(', ')})`
          }
          return 'Enabled'
        }
        return 'Disabled'
      }
      if (platform === 'macos') {
        return featureData.fileVault || featureData.filevault_status ? 'FileVault Enabled' : 'FileVault Disabled'
      }
      return 'Unknown'

    case 'tpm':
      if (featureData.isPresent && featureData.isEnabled && featureData.isActivated) {
        return `Ready (v${featureData.version || 'Unknown'})`
      }
      if (featureData.isPresent) {
        return 'Present but not activated'
      }
      return 'Not Present'

    case 'gatekeeper':
      return featureData === 'Enabled' || featureData.enabled ? 'Enabled' : 'Disabled'

    case 'sip':
      return featureData === 'Enabled' || featureData.enabled ? 'Enabled' : 'Disabled'

    case 'securityUpdates':
      if (Array.isArray(featureData)) {
        return `${featureData.length} updates installed`
      }
      return 'Unknown'

    default:
      return String(featureData)
  }
}

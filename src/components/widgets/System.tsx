/**
 * System Widget
 * Displays operating system information and system details
 */

import React from 'react'
import { StatBlock, Stat, EmptyState, Icons, WidgetColors } from './shared'
import { normalizeKeys } from '../../lib/utils/powershell-parser'

// Get macOS marketing name from version number
function getMacOSMarketingName(version: string | undefined): string {
  if (!version) return 'macOS'
  
  // Parse major version
  const major = parseInt(version.split('.')[0], 10)
  
  // macOS version to marketing name mapping
  const versionNames: Record<number, string> = {
    26: 'Tahoe',
    15: 'Sequoia',
    14: 'Sonoma',
    13: 'Ventura',
    12: 'Monterey',
    11: 'Big Sur',
    10: 'Catalina',
  }
  
  if (major === 10) {
    // Old macOS X versioning (10.14.x, 10.15.x)
    const minor = parseInt(version.split('.')[1], 10)
    const oldVersions: Record<number, string> = {
      15: 'Catalina',
      14: 'Mojave',
      13: 'High Sierra',
      12: 'Sierra',
    }
    return oldVersions[minor] || 'macOS'
  }
  
  return versionNames[major] || 'macOS'
}

// Get Windows marketing name from display version
function getWindowsMarketingName(displayVersion: string | undefined): string {
  if (!displayVersion) return ''
  
  // Map display versions to marketing names
  const marketingNames: Record<string, string> = {
    '25H2': '25H2',
    '24H2': '24H2',
    '23H2': '23H2',
    '22H2': '22H2',
    '21H2': '21H2',
    '21H1': '21H1',
    '20H2': '20H2',
  }
  
  return marketingNames[displayVersion] || displayVersion
}

// Get dynamic OS label (\"macOS\" or \"Windows 10\" / \"Windows 11\")
function getOSLabel(osInfo: OperatingSystemInfo | undefined, isMac: boolean): string {
  if (isMac) return 'macOS'
  
  // For Windows, extract version number (10 or 11)
  const osName = osInfo?.name || ''
  if (osName.includes('Windows 11')) return 'Windows 11'
  if (osName.includes('Windows 10')) return 'Windows 10'
  
  // Fallback to generic Windows
  return 'Windows'
}

interface Device {
  id: string
  name: string
  serialNumber?: string
  // Modules structure
  modules?: {
    system?: {
      // Support both camelCase and snake_case
      operatingSystem?: OperatingSystemInfo
      operating_system?: OperatingSystemInfo
      uptimeString?: string
      uptime_string?: string
    }
  }
}

interface OperatingSystemInfo {
  name?: string
  edition?: string
  version?: string
  displayVersion?: string
  display_version?: string
  build?: string
  architecture?: string
  locale?: string
  timeZone?: string
  time_zone?: string
  activeKeyboardLayout?: string
  active_keyboard_layout?: string
  featureUpdate?: string
  feature_update?: string
}

interface SystemWidgetProps {
  device: Device
}

export const SystemWidget: React.FC<SystemWidgetProps> = ({ device }) => {
  // Normalize system data to camelCase
  const rawSystem = device.modules?.system
  const system = rawSystem ? normalizeKeys(rawSystem) as any : null
  
  // Use normalized data (camelCase)
  const operatingSystem = system?.operatingSystem
  const uptimeString = system?.uptimeString
  
  // Mac stores timezone, locale, keyboardLayouts in systemDetails (separate field)
  // Windows stores them directly in operating_system
  const systemDetails = system?.systemDetails || {}
  
  // Platform detection for Mac-specific display
  const platform = device?.platform?.toLowerCase() || operatingSystem?.name?.toLowerCase() || ''
  const isMac = platform.includes('mac') || platform.includes('darwin')
  
  // For Mac, show \"macOS\" + marketing name (Tahoe, Sequoia, etc)
  // For Windows, show \"Windows 10\" or \"Windows 11\" + marketing name (24H2, 25H2, etc)
  const osLabel = getOSLabel(operatingSystem, isMac)
  const osMarketingName = isMac 
    ? getMacOSMarketingName(operatingSystem?.version)
    : getWindowsMarketingName(operatingSystem?.displayVersion)
  const osName = `${osLabel}${osMarketingName ? ' ' + osMarketingName : ''}`
  
  // Get locale/timezone/keyboard from correct location
  const locale = operatingSystem?.locale || systemDetails?.locale
  const timeZone = operatingSystem?.timeZone || systemDetails?.timeZone
  const keyboardLayout = isMac 
    ? (systemDetails?.keyboardLayouts?.[0] || 'Unknown')
    : (operatingSystem?.activeKeyboardLayout || 'Unknown')

  // Check if we have any system information
  const hasSystemInfo = operatingSystem

  if (!hasSystemInfo) {
    return (
      <StatBlock 
        title="System" 
        subtitle="Operating system details"
        icon={Icons.system}
        iconColor={WidgetColors.purple}
      >
        <EmptyState message="System information not available" />
      </StatBlock>
    )
  }

  // Extract Windows build number from version (e.g., "10.0.26200" -> "26200")
  const extractBuildNumber = (version?: string): string => {
    if (!version) return 'Unknown'
    const parts = version.split('.')
    if (parts.length >= 3) {
      return parts[2] // Return the build number (third part)
    }
    return version
  }
  
  // Format Mac version as major.minor.patch
  const formatMacVersion = (version?: string): string => {
    if (!version) return 'Unknown'
    const parts = version.split('.')
    const major = parts[0] || '0'
    const minor = parts[1] || '0'
    const patch = parts[2] || '0'
    return `${major}.${minor}.${patch}`
  }

  // Software Update status logic - matching SystemTab.tsx
  const pendingAppleUpdates = system?.updates?.pending || []
  const hasUpdates = isMac ? pendingAppleUpdates.length > 0 : false

  return (
    <StatBlock 
      title="System" 
      subtitle="Operating system details"
      icon={Icons.system}
      iconColor={WidgetColors.purple}
    >
      <div className="space-y-6">
        {/* Three Column Grid - Always */}
        <div className="grid grid-cols-3 gap-4">
          {isMac ? (
            // Mac: macOS (label) | Tahoe (value) | Version | Build
            <>
              <Stat 
                label={osLabel}
                value={osMarketingName}
              />
              <Stat 
                label="Version" 
                value={formatMacVersion(operatingSystem?.version)}
              />
              <Stat 
                label="Build" 
                value={operatingSystem?.buildNumber || operatingSystem?.build || 'Unknown'}
              />
            </>
          ) : (
            // Windows: Windows 11 (label) | 25H2 (value) | Build | Feature Update
            <>
              <Stat 
                label={osLabel}
                value={osMarketingName}
              />
              <Stat 
                label="Version" 
                value={extractBuildNumber(operatingSystem?.version)}
              />
              <Stat 
                label="Feature" 
                value={operatingSystem?.featureUpdate || 'Unknown'}
              />
            </>
          )}
        </div>

        {/* Software Update - Full width row */}
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Software Update</div>
          {hasUpdates ? (
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                {isMac ? `${pendingAppleUpdates.length} Pending Update${pendingAppleUpdates.length !== 1 ? 's' : ''}` : 'Pending Updates'}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium text-green-700 dark:text-green-300">Up to Date</span>
            </div>
          )}
        </div>

        {/* Invisible separator */}
        <div className="h-0"></div>

        {/* Second Section - Localization */}
        <div className="grid grid-cols-5 gap-6">
          <div className="col-span-3 space-y-4">
            <Stat 
              label="Keyboard Layout" 
              value={keyboardLayout} 
            />
            
            <Stat 
              label="Time Zone" 
              value={timeZone || 'Unknown'} 
            />
          </div>
          
          <div className="col-span-2 space-y-4">
            <Stat 
              label="Uptime" 
              value={uptimeString || 'Unknown'} 
            />

            <Stat 
              label="Locale" 
              value={locale || 'Unknown'} 
            />
          </div>
        </div>
      </div>
    </StatBlock>
  )
}

export default SystemWidget

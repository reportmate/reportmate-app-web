/**
 * System Widget
 * Displays operating system information with separate fields for OS name, version, build, and architecture
 */

import React from 'react'
import { StatBlock, Stat, Icons, WidgetColors } from './shared'

interface Device {
  id: string
  name: string
  osName?: string
  osVersion?: string
  osBuild?: string
  osArchitecture?: string
  os?: string // Fallback for legacy format
  architecture?: string // Fallback for legacy format
}

interface SystemWidgetProps {
  device: Device
}

/**
 * Parse legacy OS string into granular components
 * Input: "Microsoft Windows 11 Enterprise 10.0.26100 (Build 26100)"
 * Output: { osName, osVersion, osBuild }
 */
const parseOperatingSystem = (osString: string) => {
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

export const SystemWidget: React.FC<SystemWidgetProps> = ({ device }) => {
  // Use granular OS data if available, otherwise parse legacy format
  let osName: string, osVersion: string, osBuild: string
  
  if (device.osName && device.osVersion && device.osBuild) {
    // Use granular data directly
    osName = device.osName
    osVersion = device.osVersion
    osBuild = device.osBuild
  } else if (device.os) {
    // Parse legacy format
    const parsed = parseOperatingSystem(device.os)
    osName = parsed.osName
    osVersion = parsed.osVersion
    osBuild = parsed.osBuild
  } else {
    // Fallback
    osName = 'Unknown'
    osVersion = 'Unknown'
    osBuild = 'Unknown'
  }

  const osArchitecture = device.osArchitecture || device.architecture || 'Unknown'

  return (
    <StatBlock 
      title="System" 
      subtitle="Operating system details"
      icon={Icons.system}
      iconColor={WidgetColors.blue}
    >
      <Stat label="Operating System" value={osName} />
      <Stat label="Version" value={osVersion} />
      <Stat label="Build" value={osBuild} isMono />
      <Stat label="Architecture" value={osArchitecture} />
    </StatBlock>
  )
}

export default SystemWidget

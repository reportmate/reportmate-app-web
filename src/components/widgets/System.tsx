/**
 * Operating System Widget
 * Displays g      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
          <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3V6a3 3 0 013-3h13.5a3 3 0 013 3v5.25a3 3 0 01-3 3m-13.5 0h13.5m-13.5 0v5.25A2.25 2.25 0 007.5 21.75h9A2.25 2.25 0 0018.75 19.5v-5.25m0 0V9a2.25 2.25 0 00-2.25-2.25H7.5A2.25 2.25 0 005.25 9v5.25z" />
          </svg>
        </div>
        {title} OS information with separate fields for OS name, version, build, and architecture
 */

import React from 'react'

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

interface OperatingSystemWidgetProps {
  device: Device
}

interface StatProps {
  label: string
  value: string | undefined
}

const Stat: React.FC<StatProps> = ({ label, value }) => (
  <div>
    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</dt>
    <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 font-mono">
      {value || 'Unknown'}
    </dd>
  </div>
)

const getOSIcon = () => {
  // OS-agnostic system/settings icon
  return (
    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

interface StatBlockProps {
  title: string
  children: React.ReactNode
}

const StatBlock: React.FC<StatBlockProps> = ({ title, children }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
          {getOSIcon()}
        </div>
        {title}
      </h3>
    </div>
    <div className="px-6 py-4">
      <dl className="space-y-4">
        {children}
      </dl>
    </div>
  </div>
)

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

export const SystemWidget: React.FC<OperatingSystemWidgetProps> = ({ device }) => {
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
    <StatBlock title="Operating System">
      <Stat label="OS" value={osName} />
      <Stat label="Version" value={osVersion} />
      <Stat label="Build" value={osBuild} />
      <Stat label="Architecture" value={osArchitecture} />
    </StatBlock>
  )
}

export default SystemWidget

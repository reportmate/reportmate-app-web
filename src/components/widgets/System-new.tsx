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
  osDisplayVersion?: string
  osEdition?: string
  osFeatureUpdate?: string
  osInstallDate?: string
  osLocale?: string
  osTimeZone?: string
  keyboardLayouts?: string[]
  uptime?: string
  bootTime?: string
  os?: string // Fallback for legacy format
  architecture?: string // Fallback for legacy format
  // Modular system data
  system?: {
    osName?: string
    osVersion?: string
    osBuild?: string
    osArchitecture?: string
    os?: string
    architecture?: string
  }
  // New modular structure
  modules?: {
    system?: {
      operatingSystem?: {
        name?: string
        version?: string
        build?: string
        displayVersion?: string
        architecture?: string
        edition?: string
        locale?: string
        timeZone?: string
        installDate?: string
        featureUpdate?: string
        keyboardLayouts?: string[]
        activeKeyboardLayout?: string
        major?: number
        minor?: number
        patch?: number
      }
      // OSQuery structure - the actual location of operating system data
      osQuery?: {
        system?: Array<{
          operatingSystem?: {
            name?: string
            version?: string
            build?: string
            displayVersion?: string
            architecture?: string
            edition?: string
            locale?: string
            timeZone?: string
            installDate?: string
            featureUpdate?: string
            keyboardLayouts?: string[]
            activeKeyboardLayout?: string
            major?: number
            minor?: number
            patch?: number
          }
        }>
      }
      uptime?: string
      uptimeString?: string
      lastBootTime?: string
      updates?: Array<{
        id: string
        title: string
        status: string
        category: string
        installDate: string
        requiresRestart: boolean
      }>
      environment?: Array<{
        name: string
        scope: string
        value: string
      }>
      version?: string
      deviceId?: string
      moduleId?: string
      collectedAt?: string
    }
  }
}

interface SystemWidgetProps {
  device: Device
}

export const SystemWidget: React.FC<SystemWidgetProps> = ({ device }) => {
  // Debug logging
  console.log('SystemWidget DEBUG - Full device object:', JSON.stringify(device, null, 2))
  
  // Access the operating system data from the correct path
  const operatingSystem = device.modules?.system?.operatingSystem || {}
  const systemModule = device.modules?.system || {}
  
  console.log('SystemWidget DEBUG - Operating System data:', operatingSystem)
  console.log('SystemWidget DEBUG - System module data:', systemModule)
  
  // Extract OS information from device-level fields (which are populated from the system module)
  const osName = device.osName || 'Unknown OS'
  const osVersion = device.osVersion || 'Unknown'
  const osDisplayVersion = device.osDisplayVersion || 'Unknown'
  const osBuildNumber = device.osVersion?.split('.').pop() || 'Unknown'
  const osEdition = device.osEdition || 'Unknown'
  const osFeatureUpdate = device.osFeatureUpdate || 'Unknown'
  const architecture = device.architecture || 'Unknown'
  const uptime = device.uptime || systemModule.uptimeString || 'Unknown'
  const osLocale = device.osLocale || 'Unknown'
  const osTimeZone = device.osTimeZone || 'Unknown'
  const keyboardLayouts = device.keyboardLayouts || []
  const activeKeyboardLayout = keyboardLayouts.length > 0 ? keyboardLayouts[0] : 'Unknown'
  
  // Clean up OS name (remove "Microsoft" prefix and edition suffix since we show them separately)
  const cleanOsName = osName
    .replace(/^Microsoft\s+/, '')
    .replace(/ (Enterprise|Professional|Pro|Home|Education)$/i, '')
    .trim()
  
  console.log('SystemWidget DEBUG - Extracted data:', {
    osName: cleanOsName,
    osVersion,
    osDisplayVersion,
    osBuild: osBuildNumber,
    osEdition,
    architecture,
    uptime
  })

  return (
    <StatBlock 
      title="System" 
      subtitle="Operating system details"
      icon={Icons.system}
      iconColor={WidgetColors.blue}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Column */}
        <div className="space-y-3">
          <Stat label="Operating System" value={cleanOsName} />
          <Stat label="Edition" value={osEdition} />
          <Stat label="Version" value={osVersion} isMono />
          <Stat label="Display Version" value={osDisplayVersion} />
          <Stat label="Build" value={osBuildNumber} isMono />
          <Stat label="Feature Update" value={osFeatureUpdate} />
        </div>
        
        {/* Right Column */}
        <div className="space-y-3">
          <Stat label="Architecture" value={architecture} />
          <Stat label="Uptime" value={uptime} />
          <Stat label="Locale" value={osLocale} />
          <Stat label="Time Zone" value={osTimeZone} />
          <Stat label="Active Keyboard" value={activeKeyboardLayout} />
        </div>
      </div>
    </StatBlock>
  )
}

export default SystemWidget

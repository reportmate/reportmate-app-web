/**
 * System Widget
 * Displays operating system information and system details
 */

import React from 'react'
import { StatBlock, Stat, EmptyState, Icons, WidgetColors } from './shared'

interface Device {
  id: string
  name: string
  serialNumber?: string
  os?: string
  platform?: string
  architecture?: string
  uptime?: string
  // API response fields for operating system
  osName?: string
  osVersion?: string
  osDisplayVersion?: string
  osEdition?: string
  osFeatureUpdate?: string
  osInstallDate?: string
  osLocale?: string
  osTimeZone?: string
  keyboardLayouts?: string[]
  // Legacy interface fields for backward compatibility
  operatingSystem?: {
    name: string
    edition?: string
    version?: string
    displayVersion?: string
    build?: string
    architecture?: string
    locale?: string
    timeZone?: string
    activeKeyboardLayout?: string
    featureUpdate?: string
  }
  // Modular system data
  system?: {
    operatingSystem?: {
      name: string
      edition?: string
      version?: string
      displayVersion?: string
      build?: string
      architecture?: string
      locale?: string
      timeZone?: string
      activeKeyboardLayout?: string
      featureUpdate?: string
    }
    uptimeString?: string
  }
  // Modules structure
  modules?: {
    system?: {
      operatingSystem?: {
        name: string
        edition?: string
        version?: string
        displayVersion?: string
        build?: string
        architecture?: string
        locale?: string
        timeZone?: string
        activeKeyboardLayout?: string
        featureUpdate?: string
      }
      uptimeString?: string
    }
  }
}

interface SystemWidgetProps {
  device: Device
}

export const SystemWidget: React.FC<SystemWidgetProps> = ({ device }) => {
  // Try multiple data paths to find the operating system data
  let operatingSystem = null
  let uptimeString = null

  // Path 1: device.system.operatingSystem (most likely based on API logs)
  if (device.system?.operatingSystem) {
    operatingSystem = device.system.operatingSystem
    uptimeString = device.system.uptimeString || device.uptime
  }
  // Path 2: device.modules.system.operatingSystem
  else if (device.modules?.system?.operatingSystem) {
    operatingSystem = device.modules.system.operatingSystem
    uptimeString = device.modules.system.uptimeString || device.uptime
  }
  // Path 3: Top-level device properties (fallback)
  else {
    operatingSystem = {
      name: device.osName,
      edition: device.osEdition,
      version: device.osVersion,
      displayVersion: device.osDisplayVersion,
      build: device.osVersion?.split('.').pop(),
      architecture: device.architecture,
      locale: device.osLocale,
      timeZone: device.osTimeZone,
      activeKeyboardLayout: device.keyboardLayouts?.[0],
      featureUpdate: device.osFeatureUpdate
    }
    uptimeString = device.uptime
  }

  // Check if we have any system information
  const hasSystemInfo = operatingSystem || device.os

  if (!hasSystemInfo) {
    return (
      <StatBlock 
        title="System" 
        subtitle="Operating system details"
        icon={Icons.system}
        iconColor={WidgetColors.blue}
      >
        <EmptyState message="System information not available" />
      </StatBlock>
    )
  }

  return (
    <StatBlock 
      title="System" 
      subtitle="Operating system details"
      icon={Icons.system}
      iconColor={WidgetColors.blue}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-4">
          <Stat 
            label="Operating System" 
            value={operatingSystem?.name ? 
              operatingSystem.name.replace('Microsoft ', '') : 
              device.os || 'Unknown'
            } 
          />
          
          <Stat 
            label="Edition" 
            value={operatingSystem?.edition || 'Unknown'} 
          />
          
          <Stat 
            label="Version" 
            value={operatingSystem?.version ? 
              `${operatingSystem.version}${operatingSystem.build ? ` (Build ${operatingSystem.build})` : ''}` : 
              'Unknown'
            } 
          />
          
          <Stat 
            label="Display Version" 
            value={operatingSystem?.displayVersion || 'Unknown'} 
          />
          
          <Stat 
            label="Feature Update" 
            value={operatingSystem?.featureUpdate || 'Unknown'} 
          />
        </div>
        
        {/* Right Column */}
        <div className="space-y-4">
          <Stat 
            label="Uptime" 
            value={uptimeString || 'Unknown'} 
          />
          
          <Stat 
            label="Locale" 
            value={operatingSystem?.locale || 'Unknown'} 
          />
          
          <Stat 
            label="Time Zone" 
            value={operatingSystem?.timeZone || 'Unknown'} 
          />
          
          <Stat 
            label="Keyboard Layout" 
            value={operatingSystem?.activeKeyboardLayout || 'Unknown'} 
          />
        </div>
      </div>
    </StatBlock>
  )
}

export default SystemWidget

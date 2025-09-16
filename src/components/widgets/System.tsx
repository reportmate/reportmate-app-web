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
  // Use modules.system data only
  const operatingSystem = device.modules?.system?.operatingSystem
  const uptimeString = device.modules?.system?.uptimeString

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

  return (
    <StatBlock 
      title="System" 
      subtitle="Operating system details"
      icon={Icons.system}
      iconColor={WidgetColors.purple}
    >
      <div className="space-y-6">
        {/* First Section - Main System Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            <Stat 
              label="Operating System" 
              value={operatingSystem?.name ? 
                operatingSystem.name.replace('Microsoft ', '') : 
                'Unknown'
              } 
            />          
            
            <Stat 
              label="Version" 
              value={operatingSystem?.version || 'Unknown'} 
            />

            <Stat 
              label="Display Version" 
              value={operatingSystem?.displayVersion || 'Unknown'} 
            />

          </div>
          
          {/* Right Column */}
          <div className="space-y-4">
            <Stat 
              label="Edition" 
              value={operatingSystem?.edition || 'Unknown'} 
            />
            
            <Stat 
              label="Feature Update" 
              value={operatingSystem?.featureUpdate || 'Unknown'} 
            />
          </div>
        </div>

        {/* Invisible separator */}
        <div className="h-0"></div>

        {/* Second Section - Localization Info */}
        <div className="grid grid-cols-5 gap-6">
          <div className="col-span-3 space-y-4">
            <Stat 
              label="Keyboard Layout" 
              value={operatingSystem?.activeKeyboardLayout || 'Unknown'} 
            />
            
            <Stat 
              label="Time Zone" 
              value={operatingSystem?.timeZone || 'Unknown'} 
            />
          </div>
          
          <div className="col-span-2 space-y-4">
            <Stat 
              label="Uptime" 
              value={uptimeString || 'Unknown'} 
            />

            <Stat 
              label="Locale" 
              value={operatingSystem?.locale || 'Unknown'} 
            />
          </div>
        </div>
      </div>
    </StatBlock>
  )
}

export default SystemWidget

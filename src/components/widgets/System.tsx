/**
 * System Widget
 * Displays operating system information and system details
 * 
 * SNAKE_CASE: All properties match API response format directly
 */

import React from 'react'
import { StatBlock, Stat, EmptyState, Icons, WidgetColors } from './shared'

interface Device {
  id: string
  name: string
  serialNumber?: string
  // Modules structure - snake_case from API
  modules?: {
    system?: {
      uptime?: string
      operating_system?: {
        name: string
        edition?: string
        version?: string
        display_version?: string
        build?: string
        architecture?: string
        locale?: string
        time_zone?: string
        active_keyboard_layout?: string
        keyboard_layouts?: string[]
        feature_update?: string
        install_date?: string
        activation?: {
          status?: string
          status_code?: number
          is_activated?: boolean
          license_type?: string
          license_source?: string
          partial_product_key?: string
          has_firmware_license?: boolean
        }
      }
      services?: Array<{
        name?: string
        path?: string
        status?: string
        start_type?: string
        description?: string
        display_name?: string
      }>
      updates?: Array<{
        id?: string
        title?: string
        status?: string
        category?: string
        install_date?: string
        requires_restart?: boolean
      }>
      collected_at?: string
      device_id?: string
      module_id?: string
    }
  }
}

interface SystemWidgetProps {
  device: Device
}

export const SystemWidget: React.FC<SystemWidgetProps> = ({ device }) => {
  // Use modules.system data - snake_case from API
  const system = device.modules?.system
  const operatingSystem = system?.operating_system
  const uptime = system?.uptime

  console.log('SystemWidget DEBUG:', {
    deviceName: device?.name,
    hasSystem: !!system,
    hasOperatingSystem: !!operatingSystem,
    systemKeys: system ? Object.keys(system) : [],
    osKeys: operatingSystem ? Object.keys(operatingSystem) : []
  })

  // Check if we have any system information
  if (!operatingSystem) {
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
              label="Display Version" 
              value={operatingSystem?.display_version || 'Unknown'} 
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
              value={operatingSystem?.feature_update || 'Unknown'} 
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
              value={operatingSystem?.active_keyboard_layout || 'Unknown'} 
            />
            
            <Stat 
              label="Time Zone" 
              value={operatingSystem?.time_zone || 'Unknown'} 
            />
          </div>
          
          <div className="col-span-2 space-y-4">
            <Stat 
              label="Uptime" 
              value={uptime || 'Unknown'} 
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

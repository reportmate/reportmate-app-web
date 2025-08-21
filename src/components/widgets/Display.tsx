/**
 * Display Widget
 * Displays monitor and display device information
 */

import React from 'react'
import { StatBlock, Stat, EmptyState, Icons, WidgetColors } from './shared'

interface DisplayInfo {
  name?: string
  resolution?: string
  refreshRate?: number
  colorDepth?: number
  manufacturer?: string
  model?: string
  serialNumber?: string
  connectionType?: string
  isPrimary?: boolean
  isBuiltIn?: boolean
  brightness?: number
}

interface DisplaysData {
  totalDisplays: number
  displays: DisplayInfo[]
  primaryDisplay?: DisplayInfo
  externalDisplays?: DisplayInfo[]
}

interface Device {
  id: string
  name: string
  // Legacy display fields
  resolution?: string
  // Modular displays data
  modules?: {
    displays?: DisplaysData
  }
}

interface DisplayWidgetProps {
  device: Device
}

export const DisplayWidget: React.FC<DisplayWidgetProps> = ({ device }) => {
  // Access display data from modular structure
  const displays = device.modules?.displays
  const hasDisplayInfo = displays && displays.displays && displays.displays.length > 0
  
  // Fallback to legacy resolution field
  const hasLegacyDisplay = device.resolution

  if (!hasDisplayInfo && !hasLegacyDisplay) {
    return (
      <StatBlock 
        title="Display" 
        subtitle="Monitor and display information"
        icon={Icons.display}
        iconColor={WidgetColors.indigo}
      >
        <EmptyState message="Display information not available" />
      </StatBlock>
    )
  }

  // Use modular data if available, otherwise use legacy
  if (hasDisplayInfo) {
    const primaryDisplay = displays.displays.find(d => d.isPrimary) || displays.displays[0]
    const externalCount = displays.displays.filter(d => !d.isBuiltIn).length
    
    return (
      <StatBlock 
        title="Display" 
        subtitle="Monitor and display information"
        icon={Icons.display}
        iconColor={WidgetColors.indigo}
      >
        <Stat label="Total Displays" value={displays.totalDisplays?.toString() || displays.displays.length.toString()} />
        
        {primaryDisplay && (
          <>
            <Stat 
              label="Primary Display" 
              value={primaryDisplay.name || `${primaryDisplay.manufacturer || 'Unknown'} ${primaryDisplay.model || 'Display'}`} 
            />
            {primaryDisplay.resolution && (
              <Stat label="Resolution" value={primaryDisplay.resolution} />
            )}
            {primaryDisplay.refreshRate && (
              <Stat label="Refresh Rate" value={`${primaryDisplay.refreshRate} Hz`} />
            )}
            {primaryDisplay.connectionType && (
              <Stat label="Connection" value={primaryDisplay.connectionType} />
            )}
          </>
        )}
        
        {externalCount > 0 && (
          <Stat label="External Displays" value={externalCount.toString()} />
        )}
        
        {displays.displays.length > 1 && (
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
              Additional Displays:
            </div>
            {displays.displays.slice(1).map((display, index) => (
              <div key={index} className="text-xs text-gray-500 dark:text-gray-400">
                {display.name || `Display ${index + 2}`} - {display.resolution || 'Unknown resolution'}
              </div>
            ))}
          </div>
        )}
      </StatBlock>
    )
  } else {
    // Legacy display info
    return (
      <StatBlock 
        title="Display" 
        subtitle="Monitor and display information"
        icon={Icons.display}
        iconColor={WidgetColors.indigo}
      >
        <Stat label="Resolution" value={device.resolution} />
      </StatBlock>
    )
  }
}

export default DisplayWidget

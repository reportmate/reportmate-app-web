/**
 * Display Widget
 * Displays monitor and display device information
 */

import React from 'react'
import { StatBlock, Stat, EmptyState, Icons, WidgetColors } from './shared'
import { normalizeKeys } from '../../lib/utils/powershell-parser'

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
  totalDisplays?: number
  displays?: DisplayInfo[]
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
    displays?: any
  }
}

interface DisplayWidgetProps {
  device: Device
}

export const DisplayWidget: React.FC<DisplayWidgetProps> = ({ device }) => {
  // Access display data from modular structure with snake_case normalization
  const rawDisplays = device.modules?.displays
  const displays = rawDisplays ? normalizeKeys(rawDisplays) as DisplaysData : null
  // Bound once so the rest of the component reads a real array rather than an
  // optional field the early return only appears to have narrowed.
  const displayList = displays?.displays ?? []
  const hasDisplayInfo = displayList.length > 0
  
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
    const primaryDisplay = displayList.find(d => d.isPrimary) || displayList[0]
    const externalCount = displayList.filter(d => !d.isBuiltIn).length
    
    return (
      <StatBlock 
        title="Display" 
        subtitle="Monitor and display information"
        icon={Icons.display}
        iconColor={WidgetColors.indigo}
      >
        <Stat label="Total Displays" value={displays?.totalDisplays?.toString() || displayList.length.toString()} />
        
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
        
        {displayList.length > 1 && (
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
              Additional Displays:
            </div>
            {displayList.slice(1).map((display, index) => (
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

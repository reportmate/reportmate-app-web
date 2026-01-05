/**
 * Inventory Widget
 * Displays inventory information including device name, usage, catalog, department, location, asset tag, and serial number
 * 
 * SNAKE_CASE: All properties match API response format directly
 */

import React from 'react'
import { StatBlock, Stat, Icons, WidgetColors } from './shared'
import { formatRelativeTime } from '../../lib/time'

interface Device {
  id: string
  name: string
  serialNumber?: string
  deviceId?: string
  model?: string
  lastSeen?: string
  createdAt?: string
  status?: 'active' | 'stale' | 'warning' | 'error'
  // Modular data from modules - snake_case to match API
  modules?: {
    inventory?: {
      device_name?: string
      usage?: string
      catalog?: string
      department?: string
      location?: string
      asset_tag?: string
      serial_number?: string
      uuid?: string
      owner?: string
      collected_at?: string
      device_id?: string
      module_id?: string
    }
  }
}

interface InventoryWidgetProps {
  device: Device
}

export const InventoryWidget: React.FC<InventoryWidgetProps> = ({ device }) => {
  // Use inventory module data directly - snake_case from API
  const inventory = device.modules?.inventory || {}
  
  // Check if we have any assignment details for the right column
  const hasAssignmentDetails = inventory.usage || inventory.catalog || inventory.department || inventory.location
  
  return (
    <StatBlock 
      title="Inventory" 
      subtitle="Device identity and assignment details"
      icon={Icons.information}
      iconColor={WidgetColors.blue}
    >
      <div className="space-y-6">
        {/* Two Column Grid for Identity and Assignment */}
        <div className={`grid ${hasAssignmentDetails ? 'grid-cols-2' : 'grid-cols-1'} gap-6`}>
          {/* Left Column - Device Identity */}
          <div className="space-y-4">
            {/* Device Name */}
            <Stat 
              label="Device Name" 
              value={inventory.device_name || 'Unknown Device'} 
            />
            
            {/* Asset Tag */}
            {inventory.asset_tag && (
              <Stat 
                label="Asset Tag" 
                value={inventory.asset_tag} 
                isMono 
                showCopyButton
              />
            )}
            
            {/* Serial Number */}
            <Stat 
              label="Serial Number" 
              value={inventory.serial_number || device.serialNumber} 
              isMono 
              showCopyButton
            />
            
            {/* Registered */}
            {device.createdAt && (
              <Stat 
                label="Registered" 
                value={formatRelativeTime(device.createdAt)} 
              />
            )}
          </div>
          
          {/* Right Column - Assignment Details (only visible if data exists) */}
          {hasAssignmentDetails && (
            <div className="space-y-4">
              {/* Usage */}
              {inventory.usage && (
                <Stat label="Usage" value={inventory.usage} />
              )}
              
              {/* Catalog */}
              {inventory.catalog && (
                <Stat label="Catalog" value={inventory.catalog} />
              )}
              
              {/* Department */}
              {inventory.department && (
                <Stat label="Department" value={inventory.department} />
              )}
              
              {/* Location */}
              {inventory.location && (
                <Stat label="Location" value={inventory.location} />
              )}
            </div>
          )}
        </div>
      </div>
    </StatBlock>
  )
}

export default InventoryWidget

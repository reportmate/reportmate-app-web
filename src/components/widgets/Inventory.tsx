/**
 * Inventory Widget
 * Displays inventory information including device name, usage, catalog, department, location, asset tag, and serial number
 */

import React from 'react'
import { StatBlock, Stat, Icons, WidgetColors } from './shared'
import { formatRelativeTime } from '../../lib/time'
import { normalizeKeys } from '../../lib/utils/powershell-parser'

interface Device {
  id: string
  name: string
  assetTag?: string
  serialNumber?: string
  deviceId?: string
  model?: string
  lastSeen?: string
  createdAt?: string
  status?: 'active' | 'stale' | 'warning' | 'error'
  // Inventory specific fields from the inventory module
  inventory?: {
    deviceName?: string
    usage?: string
    catalog?: string
    department?: string
    location?: string
    assetTag?: string
    serialNumber?: string
    uuid?: string
  }
  // Modular data from modules
  modules?: {
    inventory?: {
      deviceName?: string
      device_name?: string
      usage?: string
      catalog?: string
      department?: string
      location?: string
      assetTag?: string
      asset_tag?: string
      serialNumber?: string
      serial_number?: string
      uuid?: string
    }
  }
}

interface InventoryWidgetProps {
  device: Device
}

export const InventoryWidget: React.FC<InventoryWidgetProps> = ({ device }) => {
  // Normalize inventory module data to camelCase (API returns snake_case)
  const rawInventory = device.modules?.inventory
  const inventory = rawInventory ? normalizeKeys(rawInventory) as any : {}
  
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
        <div className={`grid ${hasAssignmentDetails ? 'grid-cols-5' : 'grid-cols-1'} gap-6`}>
          {/* Left Column - Device Identity (60% width) */}
          <div className={`space-y-4 ${hasAssignmentDetails ? 'col-span-3' : ''}`}>
            {/* Device Name */}
            <Stat 
              label="Device Name" 
              value={inventory.deviceName || 'Unknown Device'} 
            />
            
            {/* Asset Tag */}
            {inventory.assetTag && (
              <Stat 
                label="Asset Tag" 
                value={inventory.assetTag} 
                isMono 
                showCopyButton
              />
            )}
            
            {/* Serial Number */}
            <Stat 
              label="Serial Number" 
              value={inventory.serialNumber || device.serialNumber} 
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
          
          {/* Right Column - Assignment Details (40% width) */}
          {hasAssignmentDetails && (
            <div className="space-y-4 col-span-2">
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

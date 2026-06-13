/**
 * Inventory Widget
 * Displays device identity plus assignment details. Assignment fields (usage,
 * catalog, department, area, location, fleet, owner) are rendered from the org's
 * configurable inventory field mapping; identity fields stay fixed.
 */

"use client"

import React from 'react'
import { StatBlock, Stat, Icons, WidgetColors } from './shared'
import { formatRelativeTime } from '../../lib/time'
import { normalizeKeys } from '../../lib/utils/powershell-parser'
import { useSettingsOptional } from '../../providers/SettingsProvider'
import { mapInventory } from '../../lib/rules/inventoryMapping'
import { DEFAULT_INVENTORY_FIELDS } from '../../lib/settings/defaults'

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
    fleet?: string
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
      fleet?: string
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

  // Assignment fields come from the org's configurable mapping (falls back to
  // defaults outside the provider). Asset tag stays in the identity column.
  const settings = useSettingsOptional()
  const fields = settings?.inventoryFields?.length ? settings.inventoryFields : DEFAULT_INVENTORY_FIELDS
  const assignmentRows = mapInventory(rawInventory as Record<string, unknown>, fields)
    .filter((row) => row.key !== 'assetTag')

  const hasAssignmentDetails = assignmentRows.length > 0

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
            {/* Device Name - fallback chain: inventory → hardware.system.computer_name → hardware.system.hostname → device.name */}
            <Stat 
              label="Device Name" 
              value={inventory.deviceName || (device.modules as any)?.hardware?.system?.computer_name || (device.modules as any)?.hardware?.system?.hostname || device.name || 'Unknown Device'} 
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
          
          {/* Right Column - Assignment Details (40% width), config-driven order/labels */}
          {hasAssignmentDetails && (
            <div className="space-y-4 col-span-2">
              {assignmentRows.map((row) => (
                <Stat key={row.key} label={row.label} value={row.value} />
              ))}
            </div>
          )}
        </div>
      </div>
    </StatBlock>
  )
}

export default InventoryWidget

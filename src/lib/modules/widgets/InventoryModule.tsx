/**
 * Inventory Module
 * 
 * This module provides device inventory information widgets
 * Displays device identification, asset information, and organizational data
 */

import React, { useState, useEffect } from 'react'
import { EnhancedBaseModule, ExtendedModuleManifest } from '../EnhancedModule'
import { DeviceWidgetProps } from '../ModuleRegistry'

// Inventory Overview Widget
const InventoryOverviewWidget: React.FC<DeviceWidgetProps> = ({ deviceId, device }) => {
  const [inventory, setInventory] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        // Use Next.js API route - get full device data and extract inventory
        const response = await fetch(`/api/device/${deviceId}`)
        if (response.ok) {
          const data = await response.json()
          
          if (data.success && data.device) {
            // Extract inventory from modules data
            const modules = data.device.modules || {}
            const inventoryData = modules.inventory || {}
            
            // Fallback to direct inventory property if modules.inventory is empty
            if (Object.keys(inventoryData).length === 0 && data.device.modules?.inventory) {
              setInventory(data.device.modules.inventory)
            } else {
              setInventory(inventoryData)
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch inventory:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchInventory()
  }, [deviceId])

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-3 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!inventory) {
    return (
      <div className="p-6 text-center">
        <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No inventory data
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Inventory information is not available for this device.
        </p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Device Name */}
        {inventory.deviceName && (
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Device Name</label>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{inventory.deviceName}</p>
          </div>
        )}
        
        {/* Usage */}
        {inventory.usage && (
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Usage</label>
            <p className="text-gray-900 dark:text-white">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {inventory.usage}
              </span>
            </p>
          </div>
        )}
        
        {/* Catalog */}
        {inventory.catalog && (
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Catalog</label>
            <p className="text-gray-900 dark:text-white">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                {inventory.catalog}
              </span>
            </p>
          </div>
        )}
        
        {/* Department */}
        {inventory.department && (
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Department</label>
            <p className="text-gray-900 dark:text-white">{inventory.department}</p>
          </div>
        )}
        
        {/* Location */}
        {inventory.location && (
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Location</label>
            <p className="text-gray-900 dark:text-white">
              <span className="inline-flex items-center">
                <svg className="w-4 h-4 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {inventory.location}
              </span>
            </p>
          </div>
        )}
        
        {/* Asset Tag */}
        {inventory.assetTag && (
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Asset Tag</label>
            <p className="text-gray-900 dark:text-white font-mono text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
              {inventory.assetTag}
            </p>
          </div>
        )}
        
        {/* Serial Number */}
        {inventory.serialNumber && (
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Serial Number</label>
            <p className="text-gray-900 dark:text-white font-mono text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
              {inventory.serialNumber}
            </p>
          </div>
        )}
        
        {/* UUID */}
        {inventory.uuid && (
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">UUID</label>
            <p className="text-gray-900 dark:text-white font-mono text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded break-all">
              {inventory.uuid}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// Detailed Inventory Widget
const InventoryDetailsWidget: React.FC<DeviceWidgetProps> = ({ deviceId, device }) => {
  const [inventory, setInventory] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const response = await fetch(`/api/device/${deviceId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.device) {
            const modules = data.device.modules || {}
            const inventoryData = modules.inventory || {}
            setInventory(inventoryData)
          }
        }
      } catch (error) {
        console.error('Failed to fetch inventory:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchInventory()
  }, [deviceId])

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  if (!inventory) {
    return (
      <div className="p-6 text-center">
        <div className="text-gray-500 dark:text-gray-400">
          No detailed inventory information available
        </div>
      </div>
    )
  }

  const inventoryFields = [
    { key: 'deviceName', label: 'Device Name', type: 'text' },
    { key: 'usage', label: 'Usage', type: 'badge' },
    { key: 'catalog', label: 'Catalog', type: 'badge' },
    { key: 'department', label: 'Department', type: 'text' },
    { key: 'location', label: 'Location', type: 'location' },
    { key: 'assetTag', label: 'Asset Tag', type: 'code' },
    { key: 'serialNumber', label: 'Serial Number', type: 'code' },
    { key: 'uuid', label: 'UUID', type: 'code' },
    { key: 'owner', label: 'Owner', type: 'text' },
    { key: 'purchaseDate', label: 'Purchase Date', type: 'date' },
    { key: 'warrantyExpiration', label: 'Warranty Expiration', type: 'date' }
  ]

  return (
    <div className="p-6">
      <div className="space-y-4">
        {inventoryFields.map(field => {
          const value = inventory[field.key]
          if (!value) return null

          return (
            <div key={field.key} className="border-b border-gray-200 dark:border-gray-700 pb-4">
              <dt className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                {field.label}
              </dt>
              <dd className="text-gray-900 dark:text-white">
                {field.type === 'badge' && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {value}
                  </span>
                )}
                {field.type === 'code' && (
                  <span className="font-mono text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                    {value}
                  </span>
                )}
                {field.type === 'location' && (
                  <span className="inline-flex items-center">
                    <svg className="w-4 h-4 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {value}
                  </span>
                )}
                {field.type === 'date' && (
                  <span>{new Date(value).toLocaleDateString()}</span>
                )}
                {field.type === 'text' && (
                  <span>{value}</span>
                )}
              </dd>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// The Module Class
export class InventoryModule extends EnhancedBaseModule {
  readonly manifest: ExtendedModuleManifest = {
    id: 'inventory',
    name: 'Inventory',
    version: '1.0.0',
    description: 'Device identification and asset management information',
    author: 'ReportMate Team',
    enabled: true,
    category: 'device',
    tags: ['inventory', 'assets', 'identification', 'organization'],
    
    deviceWidgets: [
      {
        id: 'inventory-overview',
        name: 'Inventory Overview',
        description: 'Essential device inventory information',
        component: InventoryOverviewWidget,
        category: 'overview',
        size: 'large',
        order: 1,
        conditions: [
          {
            type: 'has_data',
            field: 'inventory',
            operator: 'exists',
            value: true
          }
        ]
      },
      {
        id: 'inventory-details',
        name: 'Inventory Details',
        description: 'Complete inventory and asset information',
        component: InventoryDetailsWidget,
        category: 'overview',
        size: 'full',
        order: 2,
        conditions: [
          {
            type: 'has_data',
            field: 'inventory',
            operator: 'exists',
            value: true
          }
        ]
      }
    ],
    
    configSchema: {
      title: 'Inventory Settings',
      description: 'Configure inventory display options',
      properties: {
        showUUID: {
          type: 'boolean',
          title: 'Show UUID',
          description: 'Display device UUID in inventory widgets',
          default: true
        },
        showDates: {
          type: 'boolean',
          title: 'Show Dates',
          description: 'Display purchase and warranty dates',
          default: true
        },
        highlightAssetTag: {
          type: 'boolean',
          title: 'Highlight Asset Tag',
          description: 'Emphasize asset tag display',
          default: true
        }
      }
    }
  }
}

export default InventoryModule

/**
 * Hardware Module
 * 
 * This module provides hardware information widgets
 * Demonstrates how to break down hardware sections into modular components
 */

import React, { useState, useEffect } from 'react'
import { EnhancedBaseModule, ExtendedModuleManifest } from '../EnhancedModule'
import { DeviceWidgetProps } from '../ModuleRegistry'

// Hardware Overview Widget
const HardwareOverviewWidget: React.FC<DeviceWidgetProps> = ({ deviceId, device }) => {
  const [hardware, setHardware] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchHardware = async () => {
      try {
        const response = await fetch(`/api/device/${deviceId}/hardware`)
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setHardware(data.hardware)
          }
        }
      } catch (error) {
        console.error('Failed to fetch hardware:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchHardware()
  }, [deviceId])

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!hardware) {
    return (
      <div className="p-6 text-center">
        <div className="text-gray-500 dark:text-gray-400">
          Hardware information not available
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CPU */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Processor</h4>
            </div>
          </div>
          <div className="space-y-1 text-sm">
            {hardware.processor && (
              <div>
                <span className="text-gray-600 dark:text-gray-400">Name:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">{hardware.processor}</span>
              </div>
            )}
            {hardware.processorSpeed && (
              <div>
                <span className="text-gray-600 dark:text-gray-400">Speed:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">{hardware.processorSpeed}</span>
              </div>
            )}
            {hardware.cores && (
              <div>
                <span className="text-gray-600 dark:text-gray-400">Cores:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">{hardware.cores}</span>
              </div>
            )}
          </div>
        </div>

        {/* Memory */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-7H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2z" />
              </svg>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Memory</h4>
            </div>
          </div>
          <div className="space-y-1 text-sm">
            {hardware.totalRAM && (
              <div>
                <span className="text-gray-600 dark:text-gray-400">Total:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">{hardware.totalRAM}</span>
              </div>
            )}
            {hardware.availableRAM && (
              <div>
                <span className="text-gray-600 dark:text-gray-400">Available:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">{hardware.availableRAM}</span>
              </div>
            )}
            {hardware.memorySlots && (
              <div>
                <span className="text-gray-600 dark:text-gray-400">Slots:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">{hardware.memorySlots}</span>
              </div>
            )}
          </div>
        </div>

        {/* Storage */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 011 1v16a1 1 0 01-1 1H3a1 1 0 01-1-1V5a1 1 0 011-1h4z" />
              </svg>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Storage</h4>
            </div>
          </div>
          <div className="space-y-1 text-sm">
            {hardware.storage && (
              <div>
                <span className="text-gray-600 dark:text-gray-400">Capacity:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">{hardware.storage}</span>
              </div>
            )}
            {hardware.availableStorage && (
              <div>
                <span className="text-gray-600 dark:text-gray-400">Available:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">{hardware.availableStorage}</span>
              </div>
            )}
            {hardware.storageType && (
              <div>
                <span className="text-gray-600 dark:text-gray-400">Type:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">{hardware.storageType}</span>
              </div>
            )}
          </div>
        </div>

        {/* Graphics */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Graphics</h4>
            </div>
          </div>
          <div className="space-y-1 text-sm">
            {hardware.gpu && (
              <div>
                <span className="text-gray-600 dark:text-gray-400">GPU:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">{hardware.gpu}</span>
              </div>
            )}
            {hardware.vram && (
              <div>
                <span className="text-gray-600 dark:text-gray-400">VRAM:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">{hardware.vram}</span>
              </div>
            )}
            {hardware.resolution && (
              <div>
                <span className="text-gray-600 dark:text-gray-400">Resolution:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">{hardware.resolution}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Storage Details Widget
const StorageDetailsWidget: React.FC<DeviceWidgetProps> = ({ deviceId }) => {
  const [storageDevices, setStorageDevices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStorage = async () => {
      try {
        const response = await fetch(`/api/device/${deviceId}/storage`)
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.storage) {
            setStorageDevices(data.storage)
          }
        }
      } catch (error) {
        console.error('Failed to fetch storage:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStorage()
  }, [deviceId])

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  if (storageDevices.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="text-gray-500 dark:text-gray-400">
          No storage devices found
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="space-y-4">
        {storageDevices.map((device, index) => {
          const usedPercentage = device.used && device.total 
            ? (parseInt(device.used) / parseInt(device.total)) * 100 
            : 0

          return (
            <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {device.name || `Drive ${index + 1}`}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {device.type || 'Unknown'} • {device.fileSystem || 'Unknown FS'}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {device.available || 'Unknown'} available
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    of {device.total || 'Unknown'} total
                  </div>
                </div>
              </div>
              
              {/* Storage usage bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                <div 
                  className={`h-2 rounded-full ${
                    usedPercentage > 90 ? 'bg-red-600' :
                    usedPercentage > 75 ? 'bg-yellow-600' :
                    'bg-green-600'
                  }`}
                  style={{ width: `${Math.min(usedPercentage, 100)}%` }}
                ></div>
              </div>
              
              <div className="mt-2 flex justify-between text-xs text-gray-600 dark:text-gray-400">
                <span>{device.used || '0 GB'} used</span>
                <span>{usedPercentage.toFixed(1)}% full</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// System Information Widget
const SystemInfoWidget: React.FC<DeviceWidgetProps> = ({ deviceId, device }) => {
  return (
    <div className="p-6">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Model</label>
            <p className="text-gray-900 dark:text-white">{device?.model || 'Unknown'}</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Serial Number</label>
            <p className="text-gray-900 dark:text-white font-mono">{device?.serialNumber || 'Unknown'}</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Operating System</label>
            <p className="text-gray-900 dark:text-white">{device?.os || 'Unknown'}</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Architecture</label>
            <p className="text-gray-900 dark:text-white">{device?.architecture || 'Unknown'}</p>
          </div>
          
          {device?.biosVersion && (
            <>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">BIOS Version</label>
                <p className="text-gray-900 dark:text-white">{device.biosVersion}</p>
              </div>
            </>
          )}
          
          {device?.lastSeen && (
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Last Seen</label>
              <p className="text-gray-900 dark:text-white">{device.lastSeen}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// The Module Class
export class HardwareModule extends EnhancedBaseModule {
  readonly manifest: ExtendedModuleManifest = {
    id: 'hardware',
    name: 'Hardware Information',
    version: '1.0.0',
    description: 'Comprehensive hardware monitoring and information',
    author: 'ReportMate Team',
    enabled: true,
    category: 'device',
    tags: ['hardware', 'system', 'monitoring'],
    
    deviceWidgets: [
      {
        id: 'hardware-overview',
        name: 'Hardware Overview',
        description: 'Key hardware specifications and status',
        component: HardwareOverviewWidget,
        category: 'hardware',
        size: 'large',
        order: 5,
        conditions: [
          {
            type: 'has_data',
            field: 'hardware',
            operator: 'exists',
            value: true
          }
        ]
      },
      {
        id: 'storage-details',
        name: 'Storage Details',
        description: 'Detailed storage device information and usage',
        component: StorageDetailsWidget,
        category: 'hardware',
        size: 'medium',
        order: 6,
        refreshInterval: 30, // Refresh every 30 seconds
        supportsExport: true
      },
      {
        id: 'system-info',
        name: 'System Information',
        description: 'Basic system and device information',
        component: SystemInfoWidget,
        category: 'overview',
        size: 'medium',
        order: 1
      }
    ],
    
    configSchema: {
      title: 'Hardware Module Settings',
      description: 'Configure hardware monitoring preferences',
      properties: {
        showDetailedSpecs: {
          type: 'boolean',
          title: 'Show Detailed Specifications',
          description: 'Display detailed hardware specifications',
          default: true
        },
        storageWarningThreshold: {
          type: 'number',
          title: 'Storage Warning Threshold (%)',
          description: 'Show warning when storage usage exceeds this percentage',
          default: 80,
          validation: { min: 50, max: 95 }
        },
        refreshInterval: {
          type: 'number',
          title: 'Refresh Interval (seconds)',
          description: 'How often to refresh hardware data',
          default: 60,
          validation: { min: 10, max: 300 }
        }
      }
    }
  }

  async onLoad(): Promise<void> {
    this.log('info', 'Hardware module loaded')
  }
}

export default HardwareModule

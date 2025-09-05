/**
 * Hardware Model Chart Component
 * Shows distribution of hardware models across devices
 */

import React, { useMemo } from 'react'

interface Device {
  deviceId: string
  serialNumber: string
  name?: string
  deviceName?: string
  manufacturer?: string
  model?: string
  architecture?: string
  modules?: {
    hardware?: {
      memory?: {
        totalPhysical?: number
        availablePhysical?: number
      }
      manufacturer?: string
      model?: string
      processor?: {
        architecture?: string
      }
    }
    system?: {
      operatingSystem?: {
        architecture?: string
      }
      hardwareInfo?: {
        manufacturer?: string
        model?: string
      }
    }
  }
  memory?: string | number | {
    totalPhysical?: number
    availablePhysical?: number
  }
}

interface HardwareModelChartProps {
  devices: Device[]
  loading?: boolean
  className?: string
}

interface HardwareModelData {
  name: string
  count: number
  percentage: number
  color: string
}

export function HardwareModelChart({ 
  devices, 
  loading = false, 
  className = ''
}: HardwareModelChartProps) {
  const hardwareData = useMemo(() => {
    if (!devices || devices.length === 0) return []

    // Helper function to get model name (using exact same logic as table)
    const getModel = (device: Device): string => {
      // Debug logging
      if (process.env.NODE_ENV === 'development') {
        console.log('Model debug for device:', device.serialNumber || device.name || device.deviceName, {
          directModel: device.model,
          hardwareModel: device.modules?.hardware?.model,
          systemModel: device.modules?.system?.hardwareInfo?.model,
          rawModel: (device as any).raw?.model,
          rawSystemModel: (device as any).raw?.system?.hardwareInfo?.model,
          rawHardwareModel: (device as any).raw?.hardware?.model,
          device: device
        })
      }

      // Use exact same logic as table
      const deviceFromMainAPI = device // In charts, we already have the device
      
      return deviceFromMainAPI?.model || 
             deviceFromMainAPI?.modules?.hardware?.model ||
             deviceFromMainAPI?.modules?.system?.hardwareInfo?.model ||
             (device as any).raw?.model ||
             (device as any).raw?.system?.hardwareInfo?.model ||
             (device as any).raw?.hardware?.model ||
             'Unknown Model'
    }

    // Count by model
    const counts: { [key: string]: number } = {}
    
    devices.forEach((device: Device) => {
      const model = getModel(device)
      counts[model] = (counts[model] || 0) + 1
    })

    // Convert to array with percentages
    const total = devices.length
    const colors = [
      '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
      '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1',
      '#14b8a6', '#fbbf24', '#f87171', '#a78bfa', '#22d3ee'
    ]

    return Object.entries(counts)
      .map(([name, count], index) => ({
        name,
        count,
        percentage: Math.round((count / total) * 100),
        color: colors[index % colors.length]
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10) // Show top 10 models only
  }, [devices])

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center">
                <div className="w-20 h-4 bg-gray-200 dark:bg-gray-600 rounded mr-4"></div>
                <div className="flex-1 h-6 bg-gray-200 dark:bg-gray-600 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!hardwareData || hardwareData.length === 0) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Hardware Models
        </h3>
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          <p>No hardware data available</p>
        </div>
      </div>
    )
  }

  const maxCount = Math.max(...hardwareData.map(item => item.count))
  const totalDevices = hardwareData.reduce((sum, item) => sum + item.count, 0)

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Hardware Models
      </h3>
      
      <div className="space-y-3">
        {hardwareData.map(item => (
          <div key={item.name} className="group">
            <div className="flex items-center">
              {/* Label */}
              <div className="w-40 text-sm font-medium text-gray-900 dark:text-white truncate">
                {item.name}
              </div>
              
              {/* Bar */}
              <div className="flex-1 ml-4">
                <div className="flex items-center">
                  <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-6 relative overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500 ease-out"
                      style={{ 
                        width: `${(item.count / maxCount) * 100}%`,
                        backgroundColor: item.color
                      }}
                    ></div>
                    
                    {/* Count label inside bar */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-medium text-white mix-blend-difference">
                        {item.count}
                      </span>
                    </div>
                  </div>
                  
                  {/* Percentage */}
                  <div className="ml-3 text-sm text-gray-500 dark:text-gray-400 w-12 text-right">
                    {item.percentage}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default HardwareModelChart

/**
 * Memory Breakdown Bar Chart Component
 * Shows distribution of memory sizes across devices
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

interface MemoryBreakdownChartProps {
  devices: Device[]
  loading?: boolean
  className?: string
}

interface MemoryData {
  range: string
  count: number
  percentage: number
  color: string
}

export function MemoryBreakdownChart({ devices, loading = false, className = '' }: MemoryBreakdownChartProps) {
  const memoryData = useMemo(() => {
    if (!devices || devices.length === 0) return []

    // Helper function to get memory size in GB
    const getMemoryGB = (device: Device): number => {
      // Debug logging
      if (process.env.NODE_ENV === 'development') {
        console.log('Memory debug for device:', device.serialNumber || device.deviceName || device.name, {
          // Check all possible memory locations based on HardwareTab.tsx
          directMemory: device.memory,
          hardwareModuleMemory: device.modules?.hardware?.memory,
          // From HardwareRecord structure (hardware page)
          memoryFromRecord: (device as any).memory,
          device: device
        })
      }

      // Try the modules.hardware.memory structure first (from HardwareTab.tsx)
      if (device.modules?.hardware?.memory?.totalPhysical) {
        const totalBytes = device.modules.hardware.memory.totalPhysical
        return Math.round(totalBytes / (1024 * 1024 * 1024))
      }

      // Try direct memory field (could be from HardwareRecord)
      const memoryField = device.memory || (device as any).memory
      if (memoryField) {
        if (typeof memoryField === 'number') {
          // If it's already in GB
          return memoryField
        }
        if (typeof memoryField === 'string') {
          // Extract number from string like "8.0 GB" or "16 GB"
          const match = memoryField.match(/(\d+\.?\d*)\s*GB/i)
          if (match) {
            return Math.round(parseFloat(match[1]))
          }
        }
        // Try to handle object memory
        if (typeof memoryField === 'object' && memoryField !== null) {
          const memObj = memoryField as any
          if (memObj.totalPhysical) {
            return Math.round(memObj.totalPhysical / (1024 * 1024 * 1024))
          }
        }
      }

      return 0
    }

    // Define memory ranges
    const memoryRanges = [
      { range: '4 GB', min: 0, max: 4, color: '#ef4444' },
      { range: '8 GB', min: 5, max: 8, color: '#f97316' },
      { range: '16 GB', min: 9, max: 16, color: '#eab308' },
      { range: '32 GB', min: 17, max: 32, color: '#22c55e' },
      { range: '64 GB', min: 33, max: 64, color: '#3b82f6' },
      { range: '128+ GB', min: 65, max: Infinity, color: '#8b5cf6' }
    ]

    // Count devices in each range
    const rangeCounts: { [key: string]: number } = {}
    
    devices.forEach(device => {
      const memoryGB = getMemoryGB(device)
      if (memoryGB > 0) {
        const range = memoryRanges.find(r => memoryGB >= r.min && memoryGB <= r.max)
        if (range) {
          rangeCounts[range.range] = (rangeCounts[range.range] || 0) + 1
        }
      }
    })

    // Convert to array with percentages
    const totalDevicesWithMemory = Object.values(rangeCounts).reduce((sum, count) => sum + count, 0)
    
    if (totalDevicesWithMemory === 0) return []

    return memoryRanges
      .map(range => ({
        range: range.range,
        count: rangeCounts[range.range] || 0,
        percentage: Math.round(((rangeCounts[range.range] || 0) / totalDevicesWithMemory) * 100),
        color: range.color
      }))
      .filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count)
  }, [devices])

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center">
                <div className="w-16 h-4 bg-gray-200 dark:bg-gray-600 rounded mr-4"></div>
                <div className="flex-1 h-6 bg-gray-200 dark:bg-gray-600 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!memoryData || memoryData.length === 0) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Memory Distribution</h3>
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          <p>No memory data available</p>
        </div>
      </div>
    )
  }

  const maxCount = Math.max(...memoryData.map(item => item.count))
  const totalDevices = memoryData.reduce((sum, item) => sum + item.count, 0)

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Memory Distribution</h3>
      
      <div className="space-y-4">
        {memoryData.map(item => (
          <div key={item.range} className="flex items-center">
            {/* Label */}
            <div className="w-20 text-sm font-medium text-gray-900 dark:text-white">
              {item.range}
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
                  
                  {/* Count label inside bar if there's space */}
                  {item.count > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-medium text-white mix-blend-difference">
                        {item.count}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Percentage */}
                <div className="ml-3 text-sm text-gray-500 dark:text-gray-400 w-12 text-right">
                  {item.percentage}%
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default MemoryBreakdownChart

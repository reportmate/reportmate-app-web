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
  selectedMemoryRanges?: string[]
  onMemoryRangeToggle?: (range: string) => void
  // Global filter context for visual feedback
  globalSelectedPlatforms?: string[]
  globalSelectedModels?: string[]
  globalSelectedArchitectures?: string[]
  globalSelectedDeviceTypes?: string[]
}

interface MemoryData {
  range: string
  count: number
  percentage: number
  color: string
  isSelected: boolean
  isGreyedOut?: boolean
}

export function MemoryBreakdownChart({ 
  devices, 
  loading = false, 
  className = '',
  selectedMemoryRanges = [],
  onMemoryRangeToggle,
  globalSelectedPlatforms = [],
  globalSelectedModels = [],
  globalSelectedArchitectures = [],
  globalSelectedDeviceTypes = []
}: MemoryBreakdownChartProps) {
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

    // Helper functions for filtering (same as hardware page)
    const getDeviceModel = (device: Device): string => {
      return device.model || 
             device.modules?.hardware?.model ||
             device.modules?.system?.hardwareInfo?.model ||
             (device as any).raw?.model ||
             (device as any).raw?.system?.hardwareInfo?.model ||
             (device as any).raw?.hardware?.model ||
             'Unknown Model'
    }

    const getDeviceType = (device: Device): string => {
      const model = getDeviceModel(device)
      if (model.toLowerCase().includes('macbook') || model.toLowerCase().includes('imac') || model.toLowerCase().includes('mac')) {
        return 'Mac'
      }
      if (model.toLowerCase().includes('surface')) {
        return 'Surface'
      }
      if (model.toLowerCase().includes('thinkpad') || model.toLowerCase().includes('laptop')) {
        return 'Laptop'
      }
      if (model.toLowerCase().includes('desktop') || model.toLowerCase().includes('optiplex')) {
        return 'Desktop'
      }
      return 'Other'
    }

    const getDevicePlatform = (device: Device): 'Windows' | 'Macintosh' | 'Other' => {
      const model = getDeviceModel(device)
      if (model.toLowerCase().includes('macbook') || 
          model.toLowerCase().includes('imac') || 
          model.toLowerCase().includes('mac mini') ||
          model.toLowerCase().includes('mac pro') ||
          model.toLowerCase().includes('mac studio')) {
        return 'Macintosh'
      }
      return 'Windows'
    }

    // Apply global filters to get synchronized data
    const filteredDevices = devices.filter(device => {
      // Platform filter
      if (globalSelectedPlatforms.length > 0) {
        const platform = getDevicePlatform(device)
        if (!globalSelectedPlatforms.includes(platform)) return false
      }

      // Model filter
      if (globalSelectedModels.length > 0) {
        const model = getDeviceModel(device)
        if (!globalSelectedModels.includes(model)) return false
      }

      // Architecture filter
      if (globalSelectedArchitectures.length > 0) {
        const arch = device.architecture || 'Unknown'
        if (!globalSelectedArchitectures.includes(arch)) return false
      }

      // Device type filter
      if (globalSelectedDeviceTypes.length > 0) {
        const deviceType = getDeviceType(device)
        if (!globalSelectedDeviceTypes.includes(deviceType)) return false
      }

      return true
    })

    // Define memory ranges
    const memoryRanges = [
      { range: '4 GB', min: 0, max: 4, color: '#ef4444' },
      { range: '8 GB', min: 5, max: 8, color: '#f97316' },
      { range: '16 GB', min: 9, max: 16, color: '#eab308' },
      { range: '32 GB', min: 17, max: 32, color: '#22c55e' },
      { range: '64 GB', min: 33, max: 64, color: '#3b82f6' },
      { range: '128+ GB', min: 65, max: Infinity, color: '#8b5cf6' }
    ]

    // Count devices in each range from full dataset (to show all possible ranges)
    const allRangeCounts: { [key: string]: number } = {}
    devices.forEach(device => {
      const memoryGB = getMemoryGB(device)
      if (memoryGB > 0) {
        const range = memoryRanges.find(r => memoryGB >= r.min && memoryGB <= r.max)
        if (range) {
          allRangeCounts[range.range] = (allRangeCounts[range.range] || 0) + 1
        }
      }
    })

    // Count devices in each range from filtered dataset (for synchronized percentages)
    const filteredRangeCounts: { [key: string]: number } = {}
    filteredDevices.forEach(device => {
      const memoryGB = getMemoryGB(device)
      if (memoryGB > 0) {
        const range = memoryRanges.find(r => memoryGB >= r.min && memoryGB <= r.max)
        if (range) {
          filteredRangeCounts[range.range] = (filteredRangeCounts[range.range] || 0) + 1
        }
      }
    })

    // Convert to array with percentages
    const totalFilteredDevicesWithMemory = Object.values(filteredRangeCounts).reduce((sum, count) => sum + count, 0)

    return memoryRanges
      .map(range => {
        const allCount = allRangeCounts[range.range] || 0
        const filteredCount = filteredRangeCounts[range.range] || 0
        
        return {
          range: range.range,
          count: filteredCount, // Show filtered count
          percentage: totalFilteredDevicesWithMemory > 0 ? Math.round((filteredCount / totalFilteredDevicesWithMemory) * 100) : 0,
          color: range.color,
          isSelected: selectedMemoryRanges.length === 0 || selectedMemoryRanges.includes(range.range),
          isGreyedOut: filteredCount === 0
        }
      })
      // Only show ranges that have actual data in the full dataset
      .filter(item => allRangeCounts[item.range] > 0)
      .sort((a, b) => b.count - a.count || a.range.localeCompare(b.range))
  }, [devices, selectedMemoryRanges, globalSelectedPlatforms, globalSelectedModels, globalSelectedArchitectures, globalSelectedDeviceTypes])

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
            <div 
              className="flex items-center cursor-pointer rounded-lg p-2 transition-colors w-full hover:bg-gray-50 dark:hover:bg-gray-700/50"
              onClick={() => onMemoryRangeToggle && onMemoryRangeToggle(item.range)}
            >
              {/* Label */}
              <div className={`w-20 text-sm font-medium transition-colors ${
                item.isGreyedOut 
                  ? 'text-gray-400 dark:text-gray-500' 
                  : 'text-gray-900 dark:text-white'
              }`}>
                {item.range}
              </div>
              
              {/* Bar */}
              <div className="flex-1 ml-4">
                <div className="flex items-center">
                  <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-6 relative overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ease-out ${
                        item.isGreyedOut 
                          ? 'opacity-30' 
                          : item.isSelected 
                            ? 'opacity-100' 
                            : selectedMemoryRanges.length > 0 
                              ? 'opacity-40' 
                              : 'opacity-100'
                      }`}
                      style={{ 
                        width: `${maxCount > 0 ? (item.count / maxCount) * 100 : 0}%`,
                        backgroundColor: item.color
                      }}
                    ></div>
                    
                    {/* Count label inside bar if there's space */}
                    {item.count > 0 && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className={`text-xs font-medium mix-blend-difference transition-colors ${
                          item.isGreyedOut ? 'text-gray-400' : 'text-white'
                        }`}>
                          {item.count}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Percentage */}
                  <div className={`ml-3 text-sm w-12 text-right transition-colors ${
                    item.isGreyedOut
                      ? 'text-gray-400 dark:text-gray-500'
                      : item.isSelected 
                        ? 'text-blue-600 dark:text-blue-400 font-medium' 
                      : selectedMemoryRanges.length > 0 
                        ? 'text-gray-400 dark:text-gray-500' 
                        : 'text-gray-500 dark:text-gray-400'
                  }`}>
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

export default MemoryBreakdownChart

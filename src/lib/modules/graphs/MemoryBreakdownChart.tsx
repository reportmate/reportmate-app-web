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
        totalPhysical?: number | string
        availablePhysical?: number | string
        totalFormatted?: string
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
    totalPhysical?: number | string
    availablePhysical?: number | string
    totalFormatted?: string
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
      // Try the modules.hardware.memory structure first (from HardwareTab.tsx)
      if (device.modules?.hardware?.memory) {
        const mem = device.modules.hardware.memory
        // Handle totalPhysical
        if (mem.totalPhysical) {
          const totalBytes = typeof mem.totalPhysical === 'string' ? parseFloat(mem.totalPhysical) : mem.totalPhysical
          if (!isNaN(totalBytes)) {
            return Math.round(totalBytes / (1024 * 1024 * 1024))
          }
        }
        // Handle totalFormatted (e.g. "16 GB")
        if (mem.totalFormatted) {
           const match = mem.totalFormatted.match(/(\d+\.?\d*)\s*GB/i)
           if (match) return Math.round(parseFloat(match[1]))
        }
      }

      // Try direct memory field (could be from HardwareRecord)
      const memoryField = device.memory || (device as any).memory
      if (memoryField) {
        if (typeof memoryField === 'number') {
          // If it's a large number, assume bytes
          if (memoryField > 1000) {
             return Math.round(memoryField / (1024 * 1024 * 1024))
          }
          // If small, assume GB
          return memoryField
        }
        if (typeof memoryField === 'string') {
          // Extract number from string like "8.0 GB" or "16 GB"
          const match = memoryField.match(/(\d+\.?\d*)\s*GB/i)
          if (match) {
            return Math.round(parseFloat(match[1]))
          }
          // Try parsing as bytes string
          const bytes = parseFloat(memoryField)
          if (!isNaN(bytes) && bytes > 1000) {
             return Math.round(bytes / (1024 * 1024 * 1024))
          }
        }
        // Try to handle object memory
        if (typeof memoryField === 'object' && memoryField !== null) {
          const memObj = memoryField as any
          if (memObj.totalPhysical) {
            const totalBytes = typeof memObj.totalPhysical === 'string' ? parseFloat(memObj.totalPhysical) : memObj.totalPhysical
            if (!isNaN(totalBytes)) {
               return Math.round(totalBytes / (1024 * 1024 * 1024))
            }
          }
        }
      }

      return 0
    }

    // Helper functions for filtering (same as hardware page)
    const getDeviceModel = (device: Device): string | null => {
      return device.model || 
             device.modules?.hardware?.model ||
             device.modules?.system?.hardwareInfo?.model ||
             // NO FAKE DATA - Return null for unknown models
             null
    }

    const getDeviceType = (device: Device): string | null => {
      const model = getDeviceModel(device)
      // NO FAKE DATA - Return null for devices without model info
      if (!model) return null
      
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
      if (model && (model.toLowerCase().includes('macbook') || 
          model.toLowerCase().includes('imac') || 
          model.toLowerCase().includes('mac mini') ||
          model.toLowerCase().includes('mac pro') ||
          model.toLowerCase().includes('mac studio'))) {
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
        if (!model || !globalSelectedModels.includes(model)) return false
      }

      // Architecture filter
      if (globalSelectedArchitectures.length > 0) {
        const arch = device.architecture || 'Unknown'
        if (!globalSelectedArchitectures.includes(arch)) return false
      }

      // Device type filter
      if (globalSelectedDeviceTypes.length > 0) {
        const deviceType = getDeviceType(device)
        if (!deviceType || !globalSelectedDeviceTypes.includes(deviceType)) return false
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
          isSelected: selectedMemoryRanges.includes(range.range),
          isGreyedOut: selectedMemoryRanges.length > 0 && !selectedMemoryRanges.includes(range.range)
        }
      })
      // Only show ranges that have actual data in the full dataset
      .filter(item => allRangeCounts[item.range] > 0)
      // Sort by size (smallest first: 4 GB, 8 GB, 16 GB, etc.)
      .sort((a, b) => {
        const aSize = parseInt(a.range)
        const bSize = parseInt(b.range)
        return aSize - bSize
      })
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
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Memory</h3>
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          <p>No memory data available</p>
        </div>
      </div>
    )
  }

  const maxCount = Math.max(...memoryData.map(item => item.count))
  const totalDevices = memoryData.reduce((sum, item) => sum + item.count, 0)

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Memory</h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">{totalDevices} devices</span>
      </div>
      
      <div className="space-y-1">
        {memoryData.map(item => (
          <div 
            key={item.range}
            className={`cursor-pointer rounded-lg p-2 transition-all hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
              item.isSelected ? 'bg-blue-50 dark:bg-blue-900/30' : ''
            }`}
            onClick={() => onMemoryRangeToggle && onMemoryRangeToggle(item.range)}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`text-sm font-medium transition-colors ${
                item.isGreyedOut 
                  ? 'text-gray-400 dark:text-gray-500' 
                  : item.isSelected
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-900 dark:text-white'
              }`}>{item.range}</span>
              <div className="flex items-center gap-2">
                <span className={`text-sm transition-colors ${
                  item.isGreyedOut 
                    ? 'text-gray-400 dark:text-gray-500' 
                    : 'text-gray-600 dark:text-gray-400'
                }`}>{item.count}</span>
                <span className={`text-xs transition-colors ${
                  item.isGreyedOut 
                    ? 'text-gray-400 dark:text-gray-500' 
                    : 'text-gray-500 dark:text-gray-500'
                }`}>({item.percentage.toFixed(1)}%)</span>
              </div>
            </div>
            <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 transition-opacity duration-200 ${
              item.isGreyedOut ? 'opacity-30' : ''
            }`}>
              <div
                className="h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${item.percentage}%`,
                  backgroundColor: item.color,
                  opacity: item.isGreyedOut ? 0.3 : 1
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default MemoryBreakdownChart

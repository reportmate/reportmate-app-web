/**
 * Memory Breakdown Bar Chart Component
 * Shows distribution of memory sizes across devices
 */

import React, { useMemo } from 'react'
import { getDevicePlatformLabel } from '../../../providers/PlatformFilterProvider'

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
    physical_memory?: number | string
    physicalMemory?: number | string
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
        const mem = device.modules.hardware.memory as any
        // Handle physical_memory / physicalMemory (Mac osquery)
        const physMem = mem.physical_memory || mem.physicalMemory
        if (physMem) {
          const totalBytes = typeof physMem === 'string' ? parseFloat(physMem) : physMem
          if (!isNaN(totalBytes)) {
            return Math.round(totalBytes / (1024 * 1024 * 1024))
          }
        }
        // Handle totalPhysical (Windows)
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
          // Mac osquery: physical_memory / physicalMemory
          const physMem = memObj.physical_memory || memObj.physicalMemory
          if (physMem) {
            const totalBytes = typeof physMem === 'string' ? parseFloat(physMem) : physMem
            if (!isNaN(totalBytes)) {
               return Math.round(totalBytes / (1024 * 1024 * 1024))
            }
          }
          // Windows: totalPhysical
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
      return getDevicePlatformLabel(device)
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

    // Snap raw GB to nearest standard memory size
    const snapToStandardSize = (gb: number): string => {
      const sizes = [2, 4, 8, 12, 16, 24, 32, 36, 48, 64, 96, 128, 192, 256, 384, 512]
      let best = sizes[0]
      let bestDiff = Math.abs(gb - sizes[0])
      for (const s of sizes) {
        const diff = Math.abs(gb - s)
        if (diff < bestDiff) { best = s; bestDiff = diff }
      }
      return `${best} GB`
    }

    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#ec4899']

    // Count from full dataset (to know which sizes exist)
    const allSizeCounts: { [key: string]: number } = {}
    devices.forEach(device => {
      const memoryGB = getMemoryGB(device)
      if (memoryGB > 0) {
        const label = snapToStandardSize(memoryGB)
        allSizeCounts[label] = (allSizeCounts[label] || 0) + 1
      }
    })

    // Count from filtered dataset
    const filteredSizeCounts: { [key: string]: number } = {}
    filteredDevices.forEach(device => {
      const memoryGB = getMemoryGB(device)
      if (memoryGB > 0) {
        const label = snapToStandardSize(memoryGB)
        filteredSizeCounts[label] = (filteredSizeCounts[label] || 0) + 1
      }
    })

    const totalFiltered = Object.values(filteredSizeCounts).reduce((sum, c) => sum + c, 0)

    // Build sorted list of sizes that have data
    const sizeLabels = Object.keys(allSizeCounts).sort((a, b) => parseInt(a) - parseInt(b))

    return sizeLabels.map((label, i) => {
      const filteredCount = filteredSizeCounts[label] || 0
      return {
        range: label,
        count: filteredCount,
        percentage: totalFiltered > 0 ? Math.round((filteredCount / totalFiltered) * 100) : 0,
        color: colors[i % colors.length],
        isSelected: selectedMemoryRanges.includes(label),
        isGreyedOut: selectedMemoryRanges.length > 0 && !selectedMemoryRanges.includes(label)
      }
    }).filter(item => allSizeCounts[item.range] > 0)
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
      </div>
      
      <div className="space-y-1 max-h-[250px] overflow-y-auto pr-1">
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

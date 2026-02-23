/**
 * Hardware Model Chart Component
 * Shows distribution of hardware models across devices
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
  processor?: string | object | any
  modules?: {
    hardware?: {
      storage?: any[]
      processor?: string | object | any
      manufacturer?: string
      model?: string
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
}

interface HardwareModelChartProps {
  devices: Device[]
  loading?: boolean
  className?: string
  selectedModels?: string[]
  onModelToggle?: (model: string) => void
  // Global filter context for visual feedback
  globalSelectedPlatforms?: string[]
  globalSelectedProcessors?: string[]
  globalSelectedArchitectures?: string[]
  globalSelectedDeviceTypes?: string[]
  globalSelectedMemoryRanges?: string[]
  globalSelectedStorageRanges?: string[]
}

interface HardwareData {
  name: string
  count: number
  percentage: number
  color: string
  isSelected: boolean
  isGreyedOut?: boolean
}

export function HardwareTypeChart({ 
  devices, 
  loading = false, 
  className = '',
  selectedModels = [],
  onModelToggle,
  globalSelectedPlatforms = [],
  globalSelectedProcessors = [],
  globalSelectedArchitectures = [],
  globalSelectedDeviceTypes = [],
  globalSelectedMemoryRanges = [],
  globalSelectedStorageRanges = []
}: HardwareModelChartProps) {
  const hardwareData = useMemo(() => {
    if (!devices || devices.length === 0) return []

    // Helper function to get model name
    const getModelName = (device: Device): string | null => {
      return device.model || 
             device.modules?.hardware?.model ||
             device.modules?.system?.hardwareInfo?.model ||
             // NO FAKE DATA - Return null for unknown models
             null
    }

    // Helper function to determine device type
    const getDeviceType = (device: Device): string | null => {
      const model = getModelName(device)
      // NO FAKE DATA - Return null for devices without model info
      if (!model) return null
      
      const modelLower = model.toLowerCase()
      
      // Desktop indicators
      if (modelLower.includes('desktop') || 
          modelLower.includes('optiplex') || 
          modelLower.includes('precision') ||
          modelLower.includes('workstation') ||
          modelLower.includes('tower') ||
          modelLower.includes('sff') ||
          modelLower.includes('mt') ||
          modelLower.includes('imac') ||
          modelLower.includes('mac pro') ||
          modelLower.includes('mac studio')) {
        return 'Desktop'
      }
      
      // Laptop indicators
      if (modelLower.includes('laptop') || 
          modelLower.includes('book') || 
          modelLower.includes('thinkpad') ||
          modelLower.includes('macbook') ||
          modelLower.includes('pavilion') ||
          modelLower.includes('inspiron') ||
          modelLower.includes('latitude') ||
          modelLower.includes('elitebook') ||
          modelLower.includes('probook') ||
          modelLower.includes('yoga') ||
          modelLower.includes('ideapad') ||
          modelLower.includes('surface laptop')) {
        return 'Laptop'
      }
      
      // Default to Desktop for unknown
      return 'Desktop'
    }

    // Helper function to get processor name
    const getProcessorName = (device: Device): string | null => {
      const processor = device.processor || 
                       device.modules?.hardware?.processor

      if (typeof processor === 'string' && processor.trim()) {
        return processor
      }

      if (typeof processor === 'object' && processor !== null) {
        return processor.name || processor.model || processor.brand || null
      }

      // NO FAKE DATA - Return null for unknown processors
      return null
    }

    // Helper function to get memory range
    const getMemoryRange = (device: Device): string | null => {
      const memory = (device as any).memory
      if (!memory) return null // NO FAKE DATA - Return null for unknown memory
      const memGb = parseFloat(memory)
      if (isNaN(memGb)) return null
      if (memGb <= 8) return '8 GB'
      if (memGb <= 16) return '9-16 GB'
      if (memGb <= 32) return '17-32 GB'
      if (memGb <= 64) return '33-64 GB'
      return '>64 GB'
    }

    // Helper function to get architecture
    const getArchitecture = (device: Device): string => {
      return device.architecture || 
             device.modules?.hardware?.processor?.architecture ||
             device.modules?.system?.operatingSystem?.architecture ||
             (device as any).raw?.architecture ||
             'x64'
    }

    // Helper function to get platform
    const getDevicePlatform = (device: Device): 'Windows' | 'Macintosh' | 'Other' | null => {
      const result = getDevicePlatformLabel(device)
      const model = getModelName(device)
      // NO FAKE DATA - Return null for devices without model info
      if (!model && result === 'Other') return null
      return result
    }

    // Apply global filters to get the relevant device subset
    const filteredDevices = devices.filter(device => {
      // Platform filter
      if (globalSelectedPlatforms.length > 0) {
        const platform = getDevicePlatform(device)
        // NO FAKE DATA - Skip devices without platform info
        if (!platform || !globalSelectedPlatforms.includes(platform)) return false
      }

      // Processor filter
      if (globalSelectedProcessors.length > 0) {
        const processor = getProcessorName(device)
        // NO FAKE DATA - Skip devices without real processor info
        if (!processor || !globalSelectedProcessors.includes(processor)) return false
      }

      // Architecture filter
      if (globalSelectedArchitectures.length > 0) {
        const arch = getArchitecture(device)
        if (!globalSelectedArchitectures.includes(arch)) return false
      }

      // Device type filter
      if (globalSelectedDeviceTypes.length > 0) {
        const deviceType = getDeviceType(device)
        // NO FAKE DATA - Skip devices without device type info
        if (!deviceType || !globalSelectedDeviceTypes.includes(deviceType)) return false
      }

      // Memory range filter
      if (globalSelectedMemoryRanges.length > 0) {
        const memoryRange = getMemoryRange(device)
        // NO FAKE DATA - Skip devices without real memory info
        if (!memoryRange || !globalSelectedMemoryRanges.includes(memoryRange)) return false
      }

      // Storage range filter
      if (globalSelectedStorageRanges.length > 0) {
        // This would need storage calculation logic here
        // Skipping for now to avoid complexity
      }

      return true
    })

    // Count by model
    const counts: { [key: string]: number } = {}
    
    filteredDevices.forEach(device => {
      const model = getModelName(device)
      // NO FAKE DATA - Skip devices without real model info
      if (!model) return
      counts[model] = (counts[model] || 0) + 1
    })

    // Get top models - no need to filter "Unknown Model" since we don't generate it
    const sortedModels = Object.entries(counts)
      .sort(([, a], [, b]) => b - a) // Sort by count descending

    const total = Object.values(counts).reduce((sum, count) => sum + count, 0)

    // Color palette
    const colors = [
      '#3b82f6', // blue-500
      '#06b6d4', // cyan-500
      '#10b981', // emerald-500
      '#84cc16', // lime-500
      '#eab308', // yellow-500
      '#f97316', // orange-500
      '#ef4444', // red-500
      '#8b5cf6', // violet-500
      '#ec4899', // pink-500
      '#14b8a6'  // teal-500
    ]

    return sortedModels.map(([model, count], index) => {
      const percentage = total > 0 ? (count / total) * 100 : 0
      const isSelected = selectedModels.includes(model)
      const isGreyedOut = selectedModels.length > 0 && !isSelected
      
      return {
        name: model,
        count,
        percentage,
        color: colors[index % colors.length],
        isSelected,
        isGreyedOut
      }
    })
  }, [devices, selectedModels, globalSelectedPlatforms, globalSelectedProcessors, globalSelectedArchitectures, globalSelectedDeviceTypes, globalSelectedMemoryRanges, globalSelectedStorageRanges])

  const total = useMemo(() => {
    return hardwareData.reduce((sum, item) => sum + item.count, 0)
  }, [hardwareData])

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded w-1/2 mb-3"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i}>
                <div className="flex justify-between mb-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/3"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/6"></div>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Models</h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">{total} devices</span>
      </div>
      
      <div className="space-y-1 max-h-136 overflow-y-auto">
        {hardwareData.map(item => (
          <div 
            key={item.name}
            className={`cursor-pointer rounded-lg p-2 transition-all hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
              item.isSelected ? 'bg-blue-50 dark:bg-blue-900/30' : ''
            }`}
            onClick={() => onModelToggle && onModelToggle(item.name)}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`text-sm font-medium transition-colors ${
                item.isGreyedOut 
                  ? 'text-gray-400 dark:text-gray-500' 
                  : item.isSelected
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-900 dark:text-white'
              }`}>{item.name}</span>
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
            <div 
              className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 transition-opacity duration-200 ${
                item.isGreyedOut ? 'opacity-30' : ''
              }`}
            >
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

export default HardwareTypeChart

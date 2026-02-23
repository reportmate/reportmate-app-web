/**
 * Processor Distribution Bar Chart Component
 * Shows distribution of processor types across devices
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

interface ProcessorDistributionChartProps {
  devices: Device[]
  loading?: boolean
  className?: string
  selectedProcessors?: string[]
  onProcessorToggle?: (processor: string) => void
  // Global filter context for visual feedback
  globalSelectedPlatforms?: string[]
  globalSelectedModels?: string[]
  globalSelectedArchitectures?: string[]
  globalSelectedDeviceTypes?: string[]
  globalSelectedMemoryRanges?: string[]
  globalSelectedStorageRanges?: string[]
}

interface ProcessorData {
  processor: string
  count: number
  percentage: number
  color: string
  isSelected: boolean
  isGreyedOut?: boolean
}

export function ProcessorDistributionChart({ 
  devices, 
  loading = false, 
  className = '',
  selectedProcessors = [],
  onProcessorToggle,
  globalSelectedPlatforms = [],
  globalSelectedModels = [],
  globalSelectedArchitectures = [],
  globalSelectedDeviceTypes = [],
  globalSelectedMemoryRanges = [],
  globalSelectedStorageRanges = []
}: ProcessorDistributionChartProps) {
  const processorData = useMemo(() => {
    if (!devices || devices.length === 0) return []

    // Helper function to get processor name
    const getProcessorName = (device: Device): string => {
      // Try different processor field locations
      const processor = device.processor || 
                       device.modules?.hardware?.processor ||
                       (device as any).raw?.processor ||
                       'Unknown Processor'

      if (typeof processor === 'string') {
        return processor
      }

      if (typeof processor === 'object' && processor !== null) {
        return processor.name || processor.model || processor.brand || 'Unknown Processor'
      }

      return 'Unknown Processor'
    }

    // Helper function to simplify processor name for grouping
    const simplifyProcessorName = (processorName: string): string => {
      const name = processorName.toLowerCase()
      
      // Intel processors
      if (name.includes('intel')) {
        if (name.includes('core i9')) return 'Intel Core i9'
        if (name.includes('core i7')) return 'Intel Core i7'
        if (name.includes('core i5')) return 'Intel Core i5'
        if (name.includes('core i3')) return 'Intel Core i3'
        if (name.includes('xeon')) return 'Intel Xeon'
        if (name.includes('pentium')) return 'Intel Pentium'
        if (name.includes('celeron')) return 'Intel Celeron'
        return 'Intel Other'
      }
      
      // AMD processors
      if (name.includes('amd')) {
        if (name.includes('ryzen 9')) return 'AMD Ryzen 9'
        if (name.includes('ryzen 7')) return 'AMD Ryzen 7'
        if (name.includes('ryzen 5')) return 'AMD Ryzen 5'
        if (name.includes('ryzen 3')) return 'AMD Ryzen 3'
        if (name.includes('epyc')) return 'AMD EPYC'
        if (name.includes('threadripper')) return 'AMD Threadripper'
        return 'AMD Other'
      }
      
      // Apple processors
      if (name.includes('apple') || name.includes('m1') || name.includes('m2') || name.includes('m3')) {
        if (name.includes('m3')) return 'Apple M3'
        if (name.includes('m2')) return 'Apple M2'
        if (name.includes('m1')) return 'Apple M1'
        return 'Apple Silicon'
      }
      
      // Qualcomm processors
      if (name.includes('qualcomm') || name.includes('snapdragon')) {
        return 'Qualcomm Snapdragon'
      }
      
      return processorName // Return original if no pattern matches
    }

    // Helper functions for filtering (same pattern as other charts)
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
      
      // Default to Desktop for unknown (most enterprise devices are desktops)
      return 'Desktop'
    }

    const getMemoryRange = (memory: any): string => {
      if (!memory) return 'Unknown'
      const memGb = parseFloat(memory)
      if (isNaN(memGb)) return 'Unknown'
      if (memGb <= 8) return '8 GB'
      if (memGb <= 16) return '9-16 GB'
      if (memGb <= 32) return '17-32 GB'
      if (memGb <= 64) return '33-64 GB'
      return '>64 GB'
    }

    const getStorageRange = (device: Device): string => {
      // Calculate total storage
      const storage = device.modules?.hardware?.storage || (device as any).storage
      if (!Array.isArray(storage)) return 'Unknown'
      
      const totalBytes = storage.reduce((sum, drive) => {
        const capacity = drive.capacity || drive.totalSize || 0
        return sum + (typeof capacity === 'number' ? capacity : 0)
      }, 0)
      
      const storageGB = Math.round(totalBytes / (1024 * 1024 * 1024))
      
      if (storageGB === 0) return 'Unknown'
      if (storageGB <= 128) return '128 GB'
      if (storageGB <= 256) return '129-256 GB'
      if (storageGB <= 512) return '257-512 GB'
      if (storageGB <= 1024) return '513 GB-1 TB'
      if (storageGB <= 2048) return '1-2 TB'
      if (storageGB <= 4096) return '2-4 TB'
      return '>4 TB'
    }

    const getDevicePlatform = (device: Device): 'Windows' | 'Macintosh' | 'Other' => {
      return getDevicePlatformLabel(device)
    }

    const getArchitecture = (device: Device): string => {
      return device.architecture || 
             (device.modules?.hardware?.processor as any)?.architecture ||
             device.modules?.system?.operatingSystem?.architecture ||
             (device as any).raw?.architecture ||
             'x64'
    }

    // Apply global filters to get the relevant device subset
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
        const arch = getArchitecture(device)
        if (!globalSelectedArchitectures.includes(arch)) return false
      }

      // Device type filter
      if (globalSelectedDeviceTypes.length > 0) {
        const deviceType = getDeviceType(device)
        if (!globalSelectedDeviceTypes.includes(deviceType)) return false
      }

      // Memory range filter
      if (globalSelectedMemoryRanges.length > 0) {
        const memoryRange = getMemoryRange((device as any).memory)
        if (!globalSelectedMemoryRanges.includes(memoryRange)) return false
      }

      // Storage range filter
      if (globalSelectedStorageRanges.length > 0) {
        const storageRange = getStorageRange(device)
        if (!globalSelectedStorageRanges.includes(storageRange)) return false
      }

      return true
    })

    // Count devices by processor type
    const processorCounts: { [key: string]: number } = {}
    
    filteredDevices.forEach(device => {
      const processorName = getProcessorName(device)
      const simplifiedName = simplifyProcessorName(processorName)
      if (simplifiedName !== 'Unknown Processor') { // Don't show unknown processors
        processorCounts[simplifiedName] = (processorCounts[simplifiedName] || 0) + 1
      }
    })

    // Sort by count (most common first)
    const sortedProcessors = Object.entries(processorCounts)
      .sort(([, a], [, b]) => b - a) // Sort by count descending

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
      '#6b7280'  // gray-500
    ]

    const total = Object.values(processorCounts).reduce((sum, count) => sum + count, 0)
    
    return sortedProcessors.map(([processor, count], index) => {
      const percentage = total > 0 ? (count / total) * 100 : 0
      const isSelected = selectedProcessors.includes(processor)
      
      return {
        processor,
        count,
        percentage,
        color: colors[index % colors.length],
        isSelected,
        isGreyedOut: count === 0
      }
    })
  }, [devices, globalSelectedPlatforms, globalSelectedModels, globalSelectedArchitectures, globalSelectedDeviceTypes, globalSelectedMemoryRanges, globalSelectedStorageRanges, selectedProcessors])

  const total = useMemo(() => {
    return processorData.reduce((sum: number, item) => sum + item.count, 0)
  }, [processorData])

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Processor</h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">{total} devices</span>
      </div>
      
      <div className="space-y-1 max-h-136 overflow-y-auto">
        {processorData.map((item) => (
          <div 
            key={item.processor}
            className={`cursor-pointer rounded-lg p-2 transition-all hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
              item.isSelected ? 'bg-blue-50 dark:bg-blue-900/30' : ''
            }`}
            onClick={() => onProcessorToggle?.(item.processor)}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`text-sm font-medium transition-colors ${
                item.isGreyedOut 
                  ? 'text-gray-400 dark:text-gray-500' 
                  : item.isSelected
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-900 dark:text-white'
              }`}>{item.processor}</span>
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
        
        {processorData.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-400 dark:text-gray-600 text-sm">
              No processor data available
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProcessorDistributionChart

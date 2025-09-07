/**
 * Hardware Model Chart Component
 * Shows distributioexport function HardwareModelChart({ 
  devices, 
  loading = false, 
    // Count by model
    const counts: { [key: string]: number } = {}
    const platformCounts: { [key: string]: number } = {} // Debug platform counts
    
    filteredDevices.forEach(device => {
      const model = getModel(device)
      const platform = getPlatform(device) // Debug
      counts[model] = (counts[model] || 0) + 1
      platformCounts[platform] = (platformCounts[platform] || 0) + 1 // Debug
    })
    
    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log('Platform distribution:', platformCounts)
      console.log('Total devices:', filteredDevices.length)
      console.log('Selected platforms:', selectedPlatforms)
    }Name = '', 
  selectedPlatforms = [],
  onPlatformToggle,
  selectedModels = [],
  onModelToggle 
}: HardwareModelChartProps) {ware models across devices
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
  selectedPlatforms?: string[]
  onPlatformToggle?: (platform: string) => void
  selectedModels?: string[]
  onModelToggle?: (model: string) => void
  // Global filter context for visual feedback
  globalSelectedMemoryRanges?: string[]
  globalSelectedArchitectures?: string[]
  globalSelectedDeviceTypes?: string[]
}

interface HardwareModelData {
  name: string
  count: number
  percentage: number
  color: string
  isSelected?: boolean
  isGreyedOut?: boolean
}

export function HardwareModelChart({ 
  devices, 
  loading = false, 
  className = '',
  selectedPlatforms = [],
  onPlatformToggle,
  selectedModels = [],
  onModelToggle,
  globalSelectedMemoryRanges = [],
  globalSelectedArchitectures = [],
  globalSelectedDeviceTypes = []
}: HardwareModelChartProps) {
  const hardwareData = useMemo(() => {
    if (!devices || devices.length === 0) return []

    // Filter devices based on global filters (excluding our own filters)
    const getMemoryRange = (memory: any): string => {
      if (!memory) return 'Unknown'
      const memGb = parseFloat(memory)
      if (isNaN(memGb)) return 'Unknown'
      if (memGb <= 8) return '≤8 GB'
      if (memGb <= 16) return '9-16 GB'
      if (memGb <= 32) return '17-32 GB'
      if (memGb <= 64) return '33-64 GB'
      return '>64 GB'
    }

    const getDeviceType = (device: Device): string => {
      const model = getModel(device)
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

    // Apply global filters to get synchronized data
    const filteredDevices = devices.filter(device => {
      // Memory filter
      if (globalSelectedMemoryRanges.length > 0) {
        const memoryRange = getMemoryRange(device.memory)
        if (!globalSelectedMemoryRanges.includes(memoryRange)) return false
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

    // Helper function to determine if device is Windows or Mac
    const getPlatform = (device: Device): 'Windows' | 'Macintosh' | 'Other' => {
      const model = getModel(device)
      
      // Debug logging to see what models we have
      if (process.env.NODE_ENV === 'development') {
        console.log('Chart platform detection for device:', device.serialNumber || device.deviceId, 'Model:', model)
      }
      
      if (model.toLowerCase().includes('macbook') || 
          model.toLowerCase().includes('imac') || 
          model.toLowerCase().includes('mac mini') ||
          model.toLowerCase().includes('mac pro') ||
          model.toLowerCase().includes('mac studio')) {
        return 'Macintosh'
      }
      // Most other devices are Windows
      return 'Windows'
    }

    // Count all models from full dataset (to show all possible options)
    const allModelCounts: { [key: string]: number } = {}
    devices.forEach(device => {
      const model = getModel(device)
      allModelCounts[model] = (allModelCounts[model] || 0) + 1
    })

    // Count models from filtered devices (for synchronized percentages)
    const filteredCounts: { [key: string]: number } = {}
    const platformCounts: { [key: string]: number } = {} // Debug platform counts
    
    filteredDevices.forEach(device => {
      const model = getModel(device)
      const platform = getPlatform(device) // Debug
      filteredCounts[model] = (filteredCounts[model] || 0) + 1
      platformCounts[platform] = (platformCounts[platform] || 0) + 1 // Debug
    })
    
    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log('Platform distribution:', platformCounts)
      console.log('Total filtered devices:', filteredDevices.length)
      console.log('Selected platforms:', selectedPlatforms)
    }

    // Convert to array with percentages and selection status
    const total = filteredDevices.length
    const colors = [
      '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
      '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1',
      '#14b8a6', '#fbbf24', '#f87171', '#a78bfa', '#22d3ee'
    ]

    // Use all models but show filtered counts and percentages
    return Object.entries(allModelCounts)
      .map(([name, allCount], index) => {
        const filteredCount = filteredCounts[name] || 0
        
        // Check if this model should be considered selected based on platform filters
        const isModelPlatformSelected = selectedPlatforms.length === 0 || 
          devices.some(device => {
            const deviceModel = getModel(device)
            const devicePlatform = getPlatform(device)
            return deviceModel === name && selectedPlatforms.includes(devicePlatform)
          })
        
        // Final selection state considers both model selection and platform selection
        const isSelected = (selectedModels.length === 0 || selectedModels.includes(name)) && 
                          isModelPlatformSelected
        
        // Model is grayed out if it has no devices in filtered data
        const isGreyedOut = filteredCount === 0
        
        return {
          name,
          count: filteredCount, // Show filtered count
          percentage: total > 0 ? Math.round((filteredCount / total) * 100) : 0, // Show filtered percentage
          color: colors[index % colors.length],
          isSelected,
          isGreyedOut
        }
      })
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)) // Sort by count, then name
      .slice(0, 15) // Show top 15 models to account for some having 0 count
  }, [devices, selectedPlatforms, selectedModels, globalSelectedMemoryRanges, globalSelectedArchitectures, globalSelectedDeviceTypes])

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/3"></div>
          
          {/* Platform Filter Buttons - Always visible even while loading */}
          {onPlatformToggle && (
            <div className="flex gap-2">
              <button
                onClick={() => onPlatformToggle('Windows')}
                className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                  selectedPlatforms.includes('Windows')
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                Windows
              </button>
              <button
                onClick={() => onPlatformToggle('Macintosh')}
                className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                  selectedPlatforms.includes('Macintosh')
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                Macintosh
              </button>
            </div>
          )}
        </div>
        <div className="animate-pulse">
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
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Hardware Models
          </h3>
          
          {/* Platform Filter Buttons - Always visible */}
          {onPlatformToggle && (
            <div className="flex gap-2">
              <button
                onClick={() => onPlatformToggle('Windows')}
                className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                  selectedPlatforms.includes('Windows')
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                Windows
              </button>
              <button
                onClick={() => onPlatformToggle('Macintosh')}
                className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                  selectedPlatforms.includes('Macintosh')
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                Macintosh
              </button>
            </div>
          )}
        </div>
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
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Hardware Models
        </h3>
        
        {/* Platform Filter Buttons */}
        {onPlatformToggle && (
          <div className="flex gap-2">
            <button
              onClick={() => onPlatformToggle('Windows')}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                selectedPlatforms.includes('Windows')
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              Windows
            </button>
            <button
              onClick={() => onPlatformToggle('Macintosh')}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                selectedPlatforms.includes('Macintosh')
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              Macintosh
            </button>
          </div>
        )}
      </div>
      
      <div className="space-y-3">
        {hardwareData.map(item => (
          <div key={item.name} className="group">
            <div 
              className="flex items-center cursor-pointer rounded-lg p-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
              onClick={() => onModelToggle && onModelToggle(item.name)}
            >
              {/* Label */}
              <div className={`w-40 text-sm font-medium truncate transition-colors ${
                item.isGreyedOut 
                  ? 'text-gray-400 dark:text-gray-500' 
                  : 'text-gray-900 dark:text-white'
              }`}>
                {item.name}
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
                            : selectedModels.length > 0 
                              ? 'opacity-40' 
                              : 'opacity-100'
                      }`}
                      style={{ 
                        width: `${maxCount > 0 ? (item.count / maxCount) * 100 : 0}%`,
                        backgroundColor: item.color
                      }}
                    ></div>
                    
                    {/* Count label inside bar */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-xs font-medium mix-blend-difference transition-colors ${
                        item.isGreyedOut ? 'text-gray-400' : 'text-white'
                      }`}>
                        {item.count}
                      </span>
                    </div>
                  </div>
                  
                  {/* Percentage */}
                  <div className={`ml-3 text-sm w-12 text-right transition-colors ${
                    item.isGreyedOut
                      ? 'text-gray-400 dark:text-gray-500'
                      : item.isSelected 
                        ? 'text-blue-600 dark:text-blue-400 font-medium' 
                      : selectedModels.length > 0 
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

export default HardwareModelChart

/**
 * Storage Breakdown Bar Chart Component
 * Shows distribution of storage sizes across devices
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
      storage?: any[]
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
  storage?: any[]
}

interface StorageBreakdownChartProps {
  devices: Device[]
  loading?: boolean
  className?: string
  selectedStorageRanges?: string[]
  onStorageRangeToggle?: (range: string) => void
  // Global filter context for visual feedback
  globalSelectedPlatforms?: string[]
  globalSelectedModels?: string[]
  globalSelectedArchitectures?: string[]
  globalSelectedDeviceTypes?: string[]
  globalSelectedMemoryRanges?: string[]
}

interface StorageData {
  range: string
  count: number
  percentage: number
  color: string
  isSelected: boolean
  isGreyedOut?: boolean
}

export function StorageBreakdownChart({ 
  devices, 
  loading = false, 
  className = '',
  selectedStorageRanges = [],
  onStorageRangeToggle,
  globalSelectedPlatforms = [],
  globalSelectedModels = [],
  globalSelectedArchitectures = [],
  globalSelectedDeviceTypes = [],
  globalSelectedMemoryRanges = []
}: StorageBreakdownChartProps) {
  const storageData = useMemo(() => {
    if (!devices || devices.length === 0) return []

    // Helper function to get total storage size in GB
    const getTotalStorageGB = (device: Device): number => {
      // Try the modules.hardware.storage structure first
      if (device.modules?.hardware?.storage && Array.isArray(device.modules.hardware.storage)) {
        const totalBytes = device.modules.hardware.storage.reduce((sum, drive) => {
          const capacity = drive.capacity || drive.totalSize || 0
          return sum + (typeof capacity === 'number' ? capacity : 0)
        }, 0)
        return Math.round(totalBytes / (1024 * 1024 * 1024))
      }

      // Try direct storage field
      const storageField = device.storage || (device as any).storage
      if (Array.isArray(storageField)) {
        const totalBytes = storageField.reduce((sum, drive) => {
          const capacity = drive.capacity || drive.totalSize || 0
          return sum + (typeof capacity === 'number' ? capacity : 0)
        }, 0)
        return Math.round(totalBytes / (1024 * 1024 * 1024))
      }

      return 0
    }

    // Helper function to categorize storage into specific sizes
    const getStorageSize = (storageGB: number): string | null => {
      if (storageGB === 0) return null // Don't include devices with no storage data
      
      // Map to common storage sizes
      if (storageGB >= 3500) return '4 TB'
      if (storageGB >= 1800) return '2 TB'
      if (storageGB >= 900) return '1 TB'
      if (storageGB >= 450) return '512 GB'
      if (storageGB >= 200) return '256 GB'
      if (storageGB >= 100) return '128 GB'
      if (storageGB >= 50) return '64 GB'
      return '32 GB'
    }
    
    // Helper function to format storage size for display
    const formatStorageSize = (storageGB: number): string => {
      if (storageGB >= 1000) {
        const tb = storageGB / 1024
        return `${tb.toFixed(1)} TB`
      }
      return `${storageGB} GB`
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

    const getArchitecture = (device: Device): string => {
      return device.architecture || 
             device.modules?.hardware?.processor?.architecture ||
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

      return true
    })

    // Count devices by storage size
    const storageCounts: { [key: string]: number } = {}
    
    filteredDevices.forEach(device => {
      const storageGB = getTotalStorageGB(device)
      const size = getStorageSize(storageGB)
      if (size) { // Only count devices with storage data
        storageCounts[size] = (storageCounts[size] || 0) + 1
      }
    })

    // Define all possible sizes in order and colors
    const sizes = ['32 GB', '64 GB', '128 GB', '256 GB', '512 GB', '1 TB', '2 TB', '4 TB']
    const colors = [
      '#3b82f6', // blue-500
      '#06b6d4', // cyan-500
      '#10b981', // emerald-500
      '#84cc16', // lime-500
      '#eab308', // yellow-500
      '#f97316', // orange-500
      '#ef4444'  // red-500
    ]

    const total = Object.values(storageCounts).reduce((sum, count) => sum + count, 0)
    
    return sizes
      .map((size, index) => {
        const count = storageCounts[size] || 0
        const percentage = total > 0 ? (count / total) * 100 : 0
        const isSelected = selectedStorageRanges.includes(size)
        
        return {
          size,
          count,
          percentage,
          color: colors[index],
          isSelected,
          isGreyedOut: count === 0 // Grey out sizes with no devices
        }
      })
      .filter(item => item.count > 0) // Don't show sizes with no devices
  }, [devices, globalSelectedPlatforms, globalSelectedModels, globalSelectedArchitectures, globalSelectedDeviceTypes, globalSelectedMemoryRanges, selectedStorageRanges])

  const total = useMemo(() => {
    return storageData.reduce((sum: number, item) => sum + item.count, 0)
  }, [storageData])

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
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Storage</h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">{total} devices</span>
      </div>
      
      <div className="space-y-2">
        {storageData.map((item) => (
          <div 
            key={item.size}
            className="cursor-pointer rounded-lg p-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
            onClick={() => onStorageRangeToggle?.(item.size)}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`text-sm font-medium transition-colors ${
                item.isGreyedOut 
                  ? 'text-gray-400 dark:text-gray-500' 
                  : 'text-gray-900 dark:text-white'
              }`}>{item.size}</span>
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
        
        {storageData.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-400 dark:text-gray-600 text-sm">
              No storage data available
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default StorageBreakdownChart

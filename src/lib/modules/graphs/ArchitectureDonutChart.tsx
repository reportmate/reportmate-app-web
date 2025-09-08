/**
 * Architecture Donut Chart Component
 * Modern donut chart showing x64 vs ARM64 distribution
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
    system?: {
      operatingSystem?: {
        architecture?: string
      }
      hardwareInfo?: {
        manufacturer?: string
        model?: string
      }
    }
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
  }
  memory?: string | number | {
    totalPhysical?: number
    availablePhysical?: number
  }
}

interface ArchitectureDonutChartProps {
  devices: Device[]
  loading?: boolean
  className?: string
  selectedArchitectures?: string[]
  onArchitectureToggle?: (architecture: string) => void
  // Global filter context for visual feedback
  globalSelectedPlatforms?: string[]
  globalSelectedModels?: string[]
  globalSelectedMemoryRanges?: string[]
  globalSelectedDeviceTypes?: string[]
}

interface ArchData {
  architecture: string
  count: number
  percentage: number
  color: string
  isSelected: boolean
  isGreyedOut?: boolean
}

export function ArchitectureDonutChart({ 
  devices, 
  loading = false, 
  className = '', 
  selectedArchitectures = [],
  onArchitectureToggle,
  globalSelectedPlatforms = [],
  globalSelectedModels = [],
  globalSelectedMemoryRanges = [],
  globalSelectedDeviceTypes = []
}: ArchitectureDonutChartProps) {
  const archData = useMemo(() => {
    if (!devices || devices.length === 0) return []

    // Helper function to get architecture from device (using exact same logic as table)
    const getArchitecture = (device: Device): string => {
      // Debug logging
      if (process.env.NODE_ENV === 'development') {
        console.log('Architecture debug for device:', device.serialNumber || device.name || device.deviceName, {
          directArch: device.architecture,
          hardwareProcessor: device.modules?.hardware?.processor?.architecture,
          systemOS: device.modules?.system?.operatingSystem?.architecture,
          rawProcessor: (device as any).raw?.processor?.architecture,
          rawArch: (device as any).raw?.architecture,
          device: device
        })
      }

      // Use exact same logic as table
      let architecture = 'Unknown'
      
      // First try from the hardware record architecture field
      if (device.architecture) {
        architecture = device.architecture
      }
      // Try from device modules if available
      else if (device.modules?.hardware?.processor?.architecture) {
        architecture = device.modules.hardware.processor.architecture
      }
      // Try from system module
      else if (device.modules?.system?.operatingSystem?.architecture) {
        architecture = device.modules.system.operatingSystem.architecture
      }
      // Try from raw processor data
      else if ((device as any).raw?.processor?.architecture) {
        architecture = (device as any).raw.processor.architecture
      }
      // Try from raw data architecture field
      else if ((device as any).raw?.architecture) {
        architecture = (device as any).raw.architecture
      }
      
      return normalizeArchitecture(architecture, device)
    }

    // Helper function to normalize architecture names with enhanced ARM64 detection
    const normalizeArchitecture = (arch: string, device: Device): string => {
      if (!arch) return 'Unknown'
      
      // Check for ARM64 indicators in processor and graphics data (same as table logic)
      const processorText = ((device as any).processor || '').toString().toLowerCase()
      const graphicsText = ((device as any).graphics || '').toString().toLowerCase()
      
      // Check if this is an ARM64 device based on processor/graphics
      const isARM64Device = processorText.includes('snapdragon') || 
                           processorText.includes('apple m') || 
                           processorText.includes('apple silicon') ||
                           graphicsText.includes('qualcomm adreno') ||
                           graphicsText.includes('apple gpu')
      
      // If we detected ARM64 indicators, override the architecture
      if (isARM64Device) {
        return 'ARM64'
      }
      
      const normalized = arch.toLowerCase().trim()
      
      // Normalize common architecture variations
      if (normalized.includes('arm64') || normalized.includes('aarch64')) return 'ARM64'
      if (normalized.includes('x64') || normalized.includes('amd64') || normalized.includes('x86_64') || normalized.includes('64-bit')) return 'x64'
      if (normalized.includes('x86') && !normalized.includes('64')) return 'x86'
      if (normalized.includes('ia64')) return 'IA64'
      
      // Return original if no normalization needed
      return arch
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

      // Memory range filter
      if (globalSelectedMemoryRanges.length > 0) {
        const memoryRange = getMemoryRange(device.memory)
        if (!globalSelectedMemoryRanges.includes(memoryRange)) return false
      }

      // Device type filter
      if (globalSelectedDeviceTypes.length > 0) {
        const deviceType = getDeviceType(device)
        if (!globalSelectedDeviceTypes.includes(deviceType)) return false
      }

      return true
    })

    // Count architectures from full dataset (to show all possible architectures)
    const allArchCounts: { [key: string]: number } = {}
    devices.forEach(device => {
      const architecture = getArchitecture(device)
      allArchCounts[architecture] = (allArchCounts[architecture] || 0) + 1
    })

    // Count architectures from filtered dataset (for synchronized percentages)
    const filteredArchCounts: { [key: string]: number } = {}
    filteredDevices.forEach(device => {
      const architecture = getArchitecture(device)
      filteredArchCounts[architecture] = (filteredArchCounts[architecture] || 0) + 1
    })

    // Convert to array with percentages
    const total = filteredDevices.length
    const archColors = {
      'x64': '#f59e0b',      // Amber
      'ARM64': '#ef4444',    // Red  
      'x86': '#8b5cf6',      // Purple
      'IA64': '#06b6d4',     // Cyan
      'Unknown': '#6b7280'   // Gray
    }

    // Use all architectures but show filtered counts and percentages
    return Object.entries(allArchCounts)
      .filter(([architecture]) => architecture !== 'Unknown') // Don't show unknown architectures
      .map(([architecture, allCount]) => {
      const filteredCount = filteredArchCounts[architecture] || 0
      
      return {
        architecture,
        count: filteredCount, // Show filtered count
        percentage: total > 0 ? Math.round((filteredCount / total) * 100) : 0, // Show filtered percentage
        color: archColors[architecture as keyof typeof archColors] || '#6b7280',
        isSelected: selectedArchitectures.length === 0 || selectedArchitectures.includes(architecture),
        isGreyedOut: filteredCount === 0
      }
    }).sort((a, b) => b.count - a.count || a.architecture.localeCompare(b.architecture))
  }, [devices, selectedArchitectures, globalSelectedPlatforms, globalSelectedModels, globalSelectedMemoryRanges, globalSelectedDeviceTypes])

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/3 mb-4"></div>
          <div className="w-48 h-48 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto"></div>
        </div>
      </div>
    )
  }

  if (!archData || archData.length === 0) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Architecture Distribution</h3>
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          <p>No architecture data available</p>
        </div>
      </div>
    )
  }

  // Calculate angles for pie chart
  const total = archData.reduce((sum, item) => sum + item.count, 0)
  let currentAngle = 0
  const pieSlices = archData.map(item => {
    const angle = (item.count / total) * 360
    const slice = {
      ...item,
      startAngle: currentAngle,
      endAngle: currentAngle + angle,
      angle
    }
    currentAngle += angle
    return slice
  })

  // Generate SVG path for donut slice
  const createSlicePath = (centerX: number, centerY: number, outerRadius: number, innerRadius: number, startAngle: number, endAngle: number) => {
    // Special case for 100% (full circle) - draw two overlapping semicircles
    if (endAngle - startAngle >= 359.9) {
      return [
        'M', centerX - outerRadius, centerY,
        'A', outerRadius, outerRadius, 0, 0, 1, centerX + outerRadius, centerY,
        'A', outerRadius, outerRadius, 0, 0, 1, centerX - outerRadius, centerY,
        'M', centerX - innerRadius, centerY,
        'A', innerRadius, innerRadius, 0, 0, 0, centerX + innerRadius, centerY,
        'A', innerRadius, innerRadius, 0, 0, 0, centerX - innerRadius, centerY,
        'Z'
      ].join(' ')
    }
    
    const startOuter = polarToCartesian(centerX, centerY, outerRadius, endAngle)
    const endOuter = polarToCartesian(centerX, centerY, outerRadius, startAngle)
    const startInner = polarToCartesian(centerX, centerY, innerRadius, endAngle)
    const endInner = polarToCartesian(centerX, centerY, innerRadius, startAngle)
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'
    
    return [
      'M', startOuter.x, startOuter.y,
      'A', outerRadius, outerRadius, 0, largeArcFlag, 0, endOuter.x, endOuter.y,
      'L', endInner.x, endInner.y,
      'A', innerRadius, innerRadius, 0, largeArcFlag, 1, startInner.x, startInner.y,
      'Z'
    ].join(' ')
  }

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    }
  }

  const centerX = 100
  const centerY = 100
  const outerRadius = 80
  const innerRadius = 45

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Architecture</h3>
      
      {/* Legend Above Chart */}
      <div className="space-y-1 mb-3">
        {archData.map(item => (
          <div 
            key={item.architecture} 
            className="flex items-center cursor-pointer rounded-lg p-1 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
            onClick={() => onArchitectureToggle && onArchitectureToggle(item.architecture)}
          >
            <div 
              className={`w-3 h-3 rounded-full mr-2 transition-opacity ${
                item.isGreyedOut ? 'opacity-30' : 'opacity-100'
              }`}
              style={{ backgroundColor: item.color }}
            ></div>
            <div className="text-sm min-w-0 flex-1">
              <span className={`font-medium transition-colors whitespace-nowrap ${
                item.isGreyedOut
                  ? 'text-gray-400 dark:text-gray-500'
                  : item.isSelected 
                    ? 'text-blue-600 dark:text-blue-400' 
                    : selectedArchitectures.length > 0 
                      ? 'text-gray-400 dark:text-gray-500' 
                      : 'text-gray-900 dark:text-white'
              }`}>
                {item.architecture}
              </span>
              <span className={`ml-2 transition-colors whitespace-nowrap ${
                item.isGreyedOut
                  ? 'text-gray-400 dark:text-gray-500'
                  : item.isSelected 
                    ? 'text-blue-500 dark:text-blue-400' 
                  : selectedArchitectures.length > 0 
                    ? 'text-gray-400 dark:text-gray-500' 
                    : 'text-gray-500 dark:text-gray-400'
              }`}>
                {item.count} ({item.percentage}%)
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Donut Chart */}
      <div className="flex justify-center">
        <svg width="200" height="200" viewBox="0 0 200 200" className="w-48 h-48">
          {pieSlices.map((slice, index) => (
            <path
              key={slice.architecture}
              d={createSlicePath(centerX, centerY, outerRadius, innerRadius, slice.startAngle, slice.endAngle)}
              fill={slice.color}
              stroke="white"
              strokeWidth="2"
              className={`transition-all duration-200 cursor-pointer ${
                slice.isGreyedOut 
                  ? 'opacity-30' 
                  : slice.isSelected 
                    ? 'opacity-100' 
                    : selectedArchitectures.length > 0 
                      ? 'opacity-40' 
                      : 'opacity-100'
              } hover:opacity-80`}
              onClick={() => onArchitectureToggle && onArchitectureToggle(slice.architecture)}
            />
          ))}
        </svg>
      </div>
    </div>
  )
}

export default ArchitectureDonutChart

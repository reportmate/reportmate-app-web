/**
 * Device Type Donut Chart Component
 * Modern donut chart showing Desktop vs Laptop distribution
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

interface DeviceTypeDonutChartProps {
  devices: Device[]
  loading?: boolean
  className?: string
  selectedDeviceTypes?: string[]
  onDeviceTypeToggle?: (deviceType: string) => void
  // Global filter context for visual feedback
  globalSelectedPlatforms?: string[]
  globalSelectedModels?: string[]
  globalSelectedMemoryRanges?: string[]
  globalSelectedArchitectures?: string[]
}

interface TypeData {
  type: string
  count: number
  percentage: number
  color: string
  isSelected: boolean
  isGreyedOut?: boolean
}

export function DeviceTypeDonutChart({ 
  devices, 
  loading = false, 
  className = '', 
  selectedDeviceTypes = [],
  onDeviceTypeToggle,
  globalSelectedPlatforms = [],
  globalSelectedModels = [],
  globalSelectedMemoryRanges = [],
  globalSelectedArchitectures = []
}: DeviceTypeDonutChartProps) {
  const typeData = useMemo(() => {
    if (!devices || devices.length === 0) return []

    // Helper function to get device type (using exact same logic as table/hardware categorization)
    const getDeviceType = (device: Device): string => {
      // Get model using exact same logic as HardwareModelChart
      const model = device?.model || 
                   device?.modules?.hardware?.model ||
                   device?.modules?.system?.hardwareInfo?.model ||
                   (device as any).raw?.model ||
                   (device as any).raw?.system?.hardwareInfo?.model ||
                   (device as any).raw?.hardware?.model ||
                   'Unknown Model'

      // Categorize based on model
      return categorizeDeviceType(model)
    }

    // Categorize device type from model
    const categorizeDeviceType = (model: string): string => {
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

      // Architecture filter
      if (globalSelectedArchitectures.length > 0) {
        const arch = device.architecture || 'Unknown'
        if (!globalSelectedArchitectures.includes(arch)) return false
      }

      return true
    })

    // Count device types from full dataset (to show all possible types)
    const allTypeCounts: { [key: string]: number } = {}
    devices.forEach((device: Device) => {
      const type = getDeviceType(device)
      allTypeCounts[type] = (allTypeCounts[type] || 0) + 1
    })

    // Count device types from filtered dataset (for synchronized percentages)
    const filteredTypeCounts: { [key: string]: number } = {}
    filteredDevices.forEach((device: Device) => {
      const type = getDeviceType(device)
      filteredTypeCounts[type] = (filteredTypeCounts[type] || 0) + 1
    })
    // Convert to array with percentages
    const total = filteredDevices.length
    const typeColors = {
      'Desktop': '#3b82f6',  // Blue
      'Laptop': '#10b981',   // Green
    }

    // Use all device types but show filtered counts and percentages
    return Object.entries(allTypeCounts)
      .map(([type, allCount]) => {
        const filteredCount = filteredTypeCounts[type] || 0
        
        return {
          type,
          count: filteredCount, // Show filtered count
          percentage: total > 0 ? Math.round((filteredCount / total) * 100) : 0, // Show filtered percentage
          color: typeColors[type as keyof typeof typeColors] || '#6b7280',
          isSelected: selectedDeviceTypes.length === 0 || selectedDeviceTypes.includes(type),
          isGreyedOut: filteredCount === 0
        }
      })
      .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type))
  }, [devices, selectedDeviceTypes, globalSelectedPlatforms, globalSelectedModels, globalSelectedMemoryRanges, globalSelectedArchitectures])

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

  if (!typeData || typeData.length === 0) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Device Type Distribution</h3>
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          <p>No device type data available</p>
        </div>
      </div>
    )
  }

  // Calculate angles for donut chart
  const total = typeData.reduce((sum, item) => sum + item.count, 0)
  let currentAngle = 0
  const pieSlices = typeData.map(item => {
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
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Device Type</h3>
      
      {/* Donut Chart */}
      <div className="flex justify-center mb-4">
        <svg width="200" height="200" viewBox="0 0 200 200" className="w-48 h-48">
          {pieSlices.map((slice, index) => (
            <path
              key={slice.type}
              d={createSlicePath(centerX, centerY, outerRadius, innerRadius, slice.startAngle, slice.endAngle)}
              fill={slice.color}
              stroke="white"
              strokeWidth="2"
              className={`transition-all duration-200 cursor-pointer ${
                slice.isGreyedOut 
                  ? 'opacity-30' 
                  : slice.isSelected 
                    ? 'opacity-100' 
                    : selectedDeviceTypes.length > 0 
                      ? 'opacity-40' 
                      : 'opacity-100'
              } hover:opacity-80`}
              onClick={() => onDeviceTypeToggle && onDeviceTypeToggle(slice.type)}
            />
          ))}
        </svg>
      </div>

      {/* Legend Below Chart */}
      <div className="space-y-1">
        {typeData.map(item => (
          <div 
            key={item.type} 
            className="flex items-center cursor-pointer rounded-lg p-1 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
            onClick={() => onDeviceTypeToggle && onDeviceTypeToggle(item.type)}
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
                    : selectedDeviceTypes.length > 0 
                      ? 'text-gray-400 dark:text-gray-500' 
                      : 'text-gray-900 dark:text-white'
              }`}>
                {item.type}
              </span>
              <span className={`ml-2 transition-colors whitespace-nowrap ${
                item.isGreyedOut
                  ? 'text-gray-400 dark:text-gray-500'
                  : item.isSelected 
                    ? 'text-blue-500 dark:text-blue-400' 
                  : selectedDeviceTypes.length > 0 
                    ? 'text-gray-400 dark:text-gray-500' 
                    : 'text-gray-500 dark:text-gray-400'
              }`}>
                ({item.count})
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default DeviceTypeDonutChart

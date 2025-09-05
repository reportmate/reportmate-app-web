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
}

interface ArchData {
  architecture: string
  count: number
  percentage: number
  color: string
}

export function ArchitectureDonutChart({ devices, loading = false, className = '' }: ArchitectureDonutChartProps) {
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

    // Count architectures
    const archCounts: { [key: string]: number } = {}
    
    devices.forEach(device => {
      const architecture = getArchitecture(device)
      archCounts[architecture] = (archCounts[architecture] || 0) + 1
    })

    // Convert to array with percentages
    const total = devices.length
    const archColors = {
      'x64': '#3b82f6',
      'ARM64': '#10b981',
      'x86': '#f59e0b',
      'IA64': '#8b5cf6',
      'Unknown': '#6b7280'
    }

    return Object.entries(archCounts).map(([architecture, count]) => ({
      architecture,
      count,
      percentage: Math.round((count / total) * 100),
      color: archColors[architecture as keyof typeof archColors] || '#6b7280'
    })).sort((a, b) => b.count - a.count)
  }, [devices])

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
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Architecture Distribution</h3>
      
      <div className="flex items-center justify-between">
        {/* Pie Chart */}
        <div className="flex-shrink-0">
          <svg width="200" height="200" viewBox="0 0 200 200" className="w-48 h-48">
            {pieSlices.map((slice, index) => (
              <path
                key={slice.architecture}
                d={createSlicePath(centerX, centerY, outerRadius, innerRadius, slice.startAngle, slice.endAngle)}
                fill={slice.color}
                stroke="white"
                strokeWidth="2"
                className="hover:opacity-80 transition-opacity"
              />
            ))}
          </svg>
        </div>

        {/* Legend */}
        <div className="ml-6 space-y-2">
          {archData.map(item => (
            <div key={item.architecture} className="flex items-center">
              <div 
                className="w-3 h-3 rounded-full mr-3"
                style={{ backgroundColor: item.color }}
              ></div>
              <div className="text-sm">
                <span className="font-medium text-gray-900 dark:text-white">
                  {item.architecture}
                </span>
                <span className="text-gray-500 dark:text-gray-400 ml-2">
                  {item.count} ({item.percentage}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center">
        Total devices: {total}
      </div>
    </div>
  )
}

export default ArchitectureDonutChart

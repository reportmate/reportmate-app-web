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
}

interface TypeData {
  type: string
  count: number
  percentage: number
  color: string
}

export function DeviceTypeDonutChart({ devices, loading = false, className = '' }: DeviceTypeDonutChartProps) {
  const typeData = useMemo(() => {
    if (!devices || devices.length === 0) return []

    // Helper function to get device type (using exact same logic as table/hardware categorization)
    const getDeviceType = (device: Device): string => {
      // Debug logging
      if (process.env.NODE_ENV === 'development') {
        console.log('Device type debug for device:', device.serialNumber || device.name || device.deviceName, {
          directModel: device.model,
          hardwareModel: device.modules?.hardware?.model,
          systemModel: device.modules?.system?.hardwareInfo?.model,
          rawModel: (device as any).raw?.model,
          rawSystemModel: (device as any).raw?.system?.hardwareInfo?.model,
          rawHardwareModel: (device as any).raw?.hardware?.model,
          device: device
        })
      }

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

    // Count device types
    const typeCounts: { [key: string]: number } = {}
    
    devices.forEach((device: Device) => {
      const type = getDeviceType(device)
      typeCounts[type] = (typeCounts[type] || 0) + 1
    })

    // Convert to array with percentages
    const total = devices.length
    const typeColors = {
      'Desktop': '#3b82f6',  // Blue
      'Laptop': '#10b981',   // Green
    }

    return Object.entries(typeCounts)
      .map(([type, count]) => ({
        type,
        count,
        percentage: Math.round((count / total) * 100),
        color: typeColors[type as keyof typeof typeColors] || '#6b7280'
      }))
      .sort((a, b) => b.count - a.count)
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
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Device Type Distribution</h3>
      
      <div className="flex items-center justify-between">
        {/* Donut Chart */}
        <div className="flex-shrink-0">
          <svg width="200" height="200" viewBox="0 0 200 200" className="w-48 h-48">
            {pieSlices.map((slice, index) => (
              <path
                key={slice.type}
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
          {typeData.map(item => (
            <div key={item.type} className="flex items-center">
              <div 
                className="w-4 h-4 rounded-full mr-3 flex-shrink-0"
                style={{ backgroundColor: item.color }}
              ></div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {item.type}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {item.count} devices ({item.percentage}%)
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default DeviceTypeDonutChart

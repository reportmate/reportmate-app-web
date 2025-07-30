/**
 * OS Version Bar Chart Component
 * Extracted from OSVersionWidget for dedicated graph organization
 */

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Device {
  deviceId: string
  serialNumber: string
  name: string
  model?: string
  os?: string // Legacy field for backward compatibility
  lastSeen: string
  status: 'active' | 'stale' | 'missing' | 'warning' | 'error' | 'offline'
  uptime?: string
  location?: string
  ipAddress?: string
  ipAddressV4?: string
  ipAddressV6?: string
  macAddress?: string
  totalEvents: number
  lastEventTime: string
  architecture?: string
  processor?: string
  memory?: string
  // Modular data structure
  modules?: {
    system?: {
      operatingSystem?: {
        name: string
        version: string
        build: string
        architecture: string
        displayVersion?: string
        edition?: string
      }
    }
  }
}

interface OSVersionBarChartProps {
  devices: Device[]
  loading: boolean
  osType: 'macOS' | 'Windows'
}

// Helper function to process OS versions
const processOSVersions = (devices: Device[], osType: 'macOS' | 'Windows') => {
  if (devices.length === 0) {
    return []
  }
  
  const versions: { [key: string]: { count: number; displayName: string } } = {}

  devices.forEach(device => {
    // Get OS data from modular structure first, fallback to legacy field
    const osInfo = device.modules?.system?.operatingSystem
    const osString = osInfo?.name || device.os || 'Unknown'
    const osVersion = osInfo?.version || ''
    const osDisplayVersion = osInfo?.displayVersion || ''
    const osBuild = osInfo?.build || ''
    
    if (osType === 'macOS') {
      // macOS detection and parsing
      const osLower = osString.toLowerCase()
      if (osLower.includes('macos') || osLower.includes('mac os') || osLower.includes('darwin')) {
        let version = 'Unknown'
        
        if (osVersion) {
          // Use the structured version data
          const versionMatch = osVersion.match(/^(\d+\.\d+(?:\.\d+)?)/)
          if (versionMatch) {
            version = versionMatch[1]
          }
        } else if (osString) {
          // Fallback to parsing from name
          const versionMatch = osString.match(/(\d+\.\d+(?:\.\d+)?)/)
          if (versionMatch) {
            version = versionMatch[1]
          }
        }
        
        if (!versions[version]) {
          versions[version] = { count: 0, displayName: version }
        }
        versions[version].count += 1
      }
    } else {
      // Windows detection and parsing
      const osLower = osString.toLowerCase()
      if (osLower.includes('windows') || osLower.includes('microsoft windows')) {
        let displayVersion = 'Unknown'
        let groupingKey = 'Unknown'
        
        if (osInfo?.name && osInfo?.build) {
          // Extract version number from name (e.g., "Windows 11" -> "11")
          const nameMatch = osInfo.name.match(/Windows\s+(\d+)/)
          const versionNumber = nameMatch ? nameMatch[1] : osInfo.name
          // For display: version number + build (e.g., "11 - 26100")
          displayVersion = `${versionNumber} - ${osInfo.build}`
          // For grouping: use the clean version number (e.g., "10.0.26100")
          groupingKey = osInfo.version || displayVersion
        } else if (osInfo?.name) {
          // Just OS name if no build available
          displayVersion = osInfo.name
          groupingKey = osInfo.version || displayVersion
        } else if (osVersion) {
          // Fallback to version field
          displayVersion = osVersion
          groupingKey = osVersion
        } else if (osString) {
          // Legacy fallback for old data format
          const osLower = osString.toLowerCase()
          if (osLower.includes('windows 11') || osLower.includes('win 11')) {
            displayVersion = 'Windows 11'
            groupingKey = 'Windows 11'
          } else if (osLower.includes('windows 10') || osLower.includes('win 10')) {
            displayVersion = 'Windows 10'
            groupingKey = 'Windows 10'
          } else if (osLower.includes('windows 8') || osLower.includes('win 8')) {
            displayVersion = 'Windows 8'
            groupingKey = 'Windows 8'
          } else if (osLower.includes('windows 7') || osLower.includes('win 7')) {
            displayVersion = 'Windows 7'
            groupingKey = 'Windows 7'
          }
        }
        
        // Group by version number for chart bars, but display the full name with build
        if (!versions[groupingKey]) {
          versions[groupingKey] = { count: 0, displayName: displayVersion }
        } else {
          // If we already have this version, make sure we use the most detailed display name
          if (displayVersion.includes(' - ') && !versions[groupingKey].displayName.includes(' - ')) {
            versions[groupingKey].displayName = displayVersion
          }
        }
        versions[groupingKey].count += 1
      }
    }
  })

  // Sort versions appropriately
  if (osType === 'macOS') {
    return Object.entries(versions)
      .map(([version, versionData]) => ({ 
        version: versionData.displayName, 
        count: versionData.count 
      }))
      .sort((a, b) => {
        if (a.version === 'Unknown') return 1
        if (b.version === 'Unknown') return -1
        return parseFloat(b.version) - parseFloat(a.version)
      })
  } else {
    return Object.entries(versions)
      .map(([version, versionData]) => ({ 
        version: versionData.displayName, 
        count: versionData.count 
      }))
      .sort((a, b) => {
        if (a.version === 'Unknown') return 1
        if (b.version === 'Unknown') return -1
        
        // Simple version comparison for clean version strings
        // Extract version numbers for comparison
        const extractVersionNumber = (ver: string) => {
          const match = ver.match(/Windows\s+(\d+)/)
          return match ? parseInt(match[1]) : 0
        }
        
        const versionA = extractVersionNumber(a.version)
        const versionB = extractVersionNumber(b.version)
        
        // Sort by Windows version number (11, 10, 8, 7, etc.)
        return versionB - versionA
      })
  }
}

export const OSVersionBarChart: React.FC<OSVersionBarChartProps> = ({ devices, loading, osType }) => {
  const [localDevices, setLocalDevices] = useState<Device[]>([])
  const [localLoading, setLocalLoading] = useState(true)
  
  // Fetch devices directly if not provided via props
  useEffect(() => {
    const fetchDevices = async () => {
      if (devices.length === 0 && loading) {
        try {
          console.log(`[OSVersionBarChart ${osType}] Fetching devices directly from API`)
          const response = await fetch('/api/devices')
          if (response.ok) {
            const data = await response.json()
            console.log(`[OSVersionBarChart ${osType}] Got ${data.length} devices from API:`, data.map((d: Device) => ({
              name: d.name,
              serialNumber: d.serialNumber,
              os: d.os,
              modules: d.modules ? {
                system: d.modules.system ? {
                  operatingSystem: d.modules.system.operatingSystem
                } : 'NO_SYSTEM_MODULE'
              } : 'NO_MODULES'
            })))
            setLocalDevices(data)
            setLocalLoading(false)
          }
        } catch (error) {
          console.error(`[OSVersionBarChart ${osType}] API fetch error:`, error)
          setLocalLoading(false)
        }
      } else {
        setLocalDevices(devices)
        setLocalLoading(loading)
      }
    }
    
    fetchDevices()
  }, [devices, loading, osType])

  // Use local state if props are empty, otherwise use props
  const effectiveDevices = devices.length > 0 ? devices : localDevices
  const effectiveLoading = devices.length > 0 ? loading : localLoading

  if (effectiveLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const versionData = processOSVersions(effectiveDevices, osType)
  
  if (versionData.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400">No {osType} devices found</p>
      </div>
    )
  }

  const maxCount = Math.max(...versionData.map(item => item.count))
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316']

  return (
    <div className="space-y-3">
      {versionData.map((item, index) => {
        const percentage = Math.round((item.count / effectiveDevices.length) * 100)
        const barWidth = (item.count / maxCount) * 100
        const color = colors[index % colors.length]
        
        return (
          <div 
            key={item.version}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
          >
            <div className="w-32 text-sm font-medium text-gray-700 dark:text-gray-300 truncate" title={item.version}>
              {item.version}
            </div>
            <div className="flex-1 flex items-center gap-3">
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-6 relative overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                  style={{ 
                    width: `${barWidth}%`, 
                    backgroundColor: color,
                    minWidth: item.count > 0 ? '8px' : '0px'
                  }}
                >
                  <span className="text-xs font-medium text-white">
                    {item.count}
                  </span>
                </div>
              </div>
              <div className="w-12 text-sm text-gray-600 dark:text-gray-400 text-right">
                {percentage}%
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

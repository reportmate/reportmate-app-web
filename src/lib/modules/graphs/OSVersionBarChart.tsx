/**
 * OS Version Bar Chart Component
 * Extracted from OSVersionWidget for dedicated graph organization
 */

import React, { useState, useEffect } from 'react'

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
        featureUpdate?: string
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
  console.log(`[OSVersionBarChart ${osType}] Processing ${devices.length} devices`)
  
  // Debug: log sample device structures
  if (devices.length > 0) {
    console.log(`[OSVersionBarChart ${osType}] Sample device structure:`, {
      deviceId: devices[0].deviceId,
      hasModules: !!devices[0].modules,
      hasSystemModule: !!devices[0].modules?.system,
      hasOperatingSystem: !!devices[0].modules?.system?.operatingSystem,
      legacyOs: devices[0].os,
      modulesKeys: devices[0].modules ? Object.keys(devices[0].modules) : []
    })
  }
  
  if (devices.length === 0) {
    return []
  }
  
  const versions: { [key: string]: { count: number; displayName: string } } = {}

  devices.forEach(device => {
    // Get OS data from modular structure first, fallback to legacy field
    const osInfo = device.modules?.system?.operatingSystem
    const osString = osInfo?.name || device.os || 'Unknown'
    const osVersion = osInfo?.version || ''
    const _osDisplayVersion = osInfo?.displayVersion || ''
    const _osBuild = osInfo?.build || ''
    
    console.log(`[processOSVersions ${osType}] Processing device:`, {
      deviceName: device.name,
      osString,
      osInfo: osInfo ? {
        name: osInfo.name,
        version: osInfo.version,
        build: osInfo.build,
        featureUpdate: osInfo.featureUpdate
      } : 'NO_OS_INFO'
    })
    
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
        
        if (osInfo?.name && osInfo?.version) {
          // Extract Windows version number from name (e.g., "Windows 11" -> "11")
          const nameMatch = osInfo.name.match(/Windows\s+(\d+)/)
          const windowsVersion = nameMatch ? nameMatch[1] : '0'
          
          // Extract build from version (after last dot in version string)
          // Version format: "10.0.26100" -> build is "26100"
          const versionParts = osInfo.version.split('.')
          const build = versionParts.length > 2 ? versionParts[2] : '0'
          
          // Get feature update from the featureUpdate field
          const featureUpdate = osInfo.featureUpdate || device.modules?.system?.operatingSystem?.featureUpdate || '0'
          
          console.log(`[processOSVersions Windows] Version processing:`, {
            deviceName: device.name,
            windowsVersion,
            build,
            featureUpdate,
            versionParts,
            osInfoName: osInfo.name,
            osInfoVersion: osInfo.version
          })
          
          // Create full version string: "11.0.26100.4652.0"
          groupingKey = `${windowsVersion}.0.${build}.${featureUpdate}`
          
          // Create display version: "11.26100.4652.0" (without the .0 after Windows version)
          displayVersion = `${windowsVersion}.${build}.${featureUpdate}`
          
          console.log(`[processOSVersions Windows] Generated versions:`, {
            groupingKey,
            displayVersion
          })
          
        } else if (osInfo?.name && osInfo?.build) {
          // Fallback: use build directly if version parsing fails
          const nameMatch = osInfo.name.match(/Windows\s+(\d+)/)
          const windowsVersion = nameMatch ? nameMatch[1] : osInfo.name
          const featureUpdate = osInfo.featureUpdate || device.modules?.system?.operatingSystem?.featureUpdate || '0'
          displayVersion = `${windowsVersion}.${osInfo.build}.${featureUpdate}`
          groupingKey = displayVersion
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
          if (displayVersion.includes('.') && displayVersion.split('.').length > versions[groupingKey].displayName.split('.').length) {
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
        
        // Parse macOS versions like "15.2.0", "14.7.2", etc.
        const parseVersion = (ver: string) => {
          const parts = ver.split('.').map(part => parseInt(part) || 0)
          return {
            major: parts[0] || 0,
            minor: parts[1] || 0,
            patch: parts[2] || 0
          }
        }
        
        const versionA = parseVersion(a.version)
        const versionB = parseVersion(b.version)
        
        // Compare major version first
        if (versionA.major !== versionB.major) {
          return versionB.major - versionA.major
        }
        
        // Then minor version
        if (versionA.minor !== versionB.minor) {
          return versionB.minor - versionA.minor
        }
        
        // Finally patch version
        return versionB.patch - versionA.patch
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
        
        // Parse Windows versions like "11.26100.4652", "10.19045.3803", or "Windows 11"
        const parseWindowsVersion = (ver: string) => {
          // Handle simple "Windows X" format
          const simpleMatch = ver.match(/Windows\s+(\d+)$/)
          if (simpleMatch) {
            return {
              major: parseInt(simpleMatch[1]),
              build: 0,
              feature: 0
            }
          }
          
          // Handle detailed format like "11.26100.4652" or "Windows 11.26100.4652"
          const detailedMatch = ver.match(/(?:Windows\s+)?(\d+)\.(\d+)\.(\d+)/)
          if (detailedMatch) {
            return {
              major: parseInt(detailedMatch[1]),
              build: parseInt(detailedMatch[2]),
              feature: parseInt(detailedMatch[3])
            }
          }
          
          // Fallback
          return { major: 0, build: 0, feature: 0 }
        }
        
        const versionA = parseWindowsVersion(a.version)
        const versionB = parseWindowsVersion(b.version)
        
        // Compare major version first (11 > 10 > 8 > 7)
        if (versionA.major !== versionB.major) {
          return versionB.major - versionA.major
        }
        
        // Then build number (newer builds first)
        if (versionA.build !== versionB.build) {
          return versionB.build - versionA.build
        }
        
        // Finally feature update (newer first)
        return versionB.feature - versionA.feature
      })
  }
}

export const OSVersionBarChart: React.FC<OSVersionBarChartProps> = ({ devices, loading, osType }) => {
  const [localDevices, setLocalDevices] = useState<Device[]>([])
  const [localLoading, setLocalLoading] = useState(true)
  
  // Add debugging for props at component entry
  console.log(`[OSVersionBarChart ${osType}] === COMPONENT ENTRY DEBUG ===`)
  console.log(`[OSVersionBarChart ${osType}] Props received:`, {
    devicesCount: devices.length,
    loading,
    osType,
    firstDeviceDebug: devices[0] ? {
      name: devices[0].name,
      os: devices[0].os,
      serialNumber: devices[0].serialNumber,
      hasModules: !!devices[0].modules,
      moduleKeys: devices[0].modules ? Object.keys(devices[0].modules) : [],
      hasSystemModule: !!devices[0].modules?.system,
      systemModuleKeys: devices[0].modules?.system ? Object.keys(devices[0].modules.system) : [],
      hasOperatingSystem: !!devices[0].modules?.system?.operatingSystem,
      operatingSystemData: devices[0].modules?.system?.operatingSystem
    } : 'NO_DEVICES'
  })
  
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
  
  // Debug logging
  console.log(`[OSVersionBarChart ${osType}] Processing ${effectiveDevices.length} devices`)
  effectiveDevices.forEach((device, index) => {
    if (index < 3) { // Only log first 3 devices to avoid spam
      console.log(`[OSVersionBarChart ${osType}] Device ${index}:`, {
        name: device.name,
        serialNumber: device.serialNumber,
        os: device.os,
        modules: device.modules ? {
          system: device.modules.system ? {
            operatingSystem: device.modules.system.operatingSystem
          } : 'NO_SYSTEM_MODULE'
        } : 'NO_MODULES'
      })
    }
  })
  console.log(`[OSVersionBarChart ${osType}] Processed version data:`, versionData)
  
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
    <div 
      className="max-h-64 overflow-y-auto space-y-3 no-scrollbar"
    >
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

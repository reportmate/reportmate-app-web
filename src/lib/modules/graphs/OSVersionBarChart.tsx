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
  platform?: string  // Fast API platform detection  
  lastSeen: string
  status: string  // Made flexible to handle API response variations
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
  // New OS version field from enhanced devices API
  osVersion?: {
    name?: string
    version?: string
    build?: string
    edition?: string
    displayVersion?: string
    featureUpdate?: string
  }
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
  if (devices.length === 0) {
    return []
  }

  // Helper function to get platform from device (trust API platform field)
  const detectPlatformFromSerial = (device: Device): 'Windows' | 'macOS' | 'Unknown' => {
    // CRITICAL FIX: Trust the API platform field - it's already correctly detected
    if (device.platform) {
      const platformLower = device.platform.toLowerCase()
      if (platformLower === 'windows') return 'Windows'
      if (platformLower === 'macos') return 'macOS'
    }
    
    // Fallback: Check system module OS info
    const systemOS = device.modules?.system?.operatingSystem?.name?.toLowerCase()
    if (systemOS) {
      if (systemOS.includes('windows')) return 'Windows'
      if (systemOS.includes('mac') || systemOS.includes('darwin')) return 'macOS'
    }

    return 'Unknown'
  }
  
  const versions: { [key: string]: { count: number; displayName: string } } = {}

  devices.forEach(device => {
    // FAST FIX: Use platform field first, then fallback to detailed OS info
    let osString = ''
    let osInfo = null
    
    // Get OS data from new osVersion field first, then fallback to legacy modular structure
    osInfo = device.osVersion || device.modules?.system?.operatingSystem
    
    // Use fast platform field as primary OS detection method
    if (device.platform) {
      osString = device.platform
    } else {
      // CRITICAL FIX: Try serial number pattern detection
      const detectedPlatform = detectPlatformFromSerial(device)
      if (detectedPlatform !== 'Unknown') {
        osString = detectedPlatform
      } else {
        // Fallback to osInfo or legacy os field
        osString = osInfo?.name || device.os || 'Unknown'
      }
    }
    
    const osVersion = osInfo?.version || ''
    const _osDisplayVersion = osInfo?.displayVersion || ''
    const _osBuild = osInfo?.build || ''
    
    if (osType === 'macOS') {
      // macOS detection and parsing
      const osLower = osString.toLowerCase()
      if (osLower.includes('macos') || osLower.includes('mac os') || osLower.includes('darwin') || osString === 'macOS') {
        let version = 'Unknown'
        
        if (osVersion) {
          // Use the structured version data
          const versionMatch = osVersion.match(/^(\d+\.\d+(?:\.\d+)?)/)
          if (versionMatch) {
            version = versionMatch[1]
          }
        } else if (osInfo?.name && osInfo.name !== osString) {
          // Fallback to parsing from detailed name
          const versionMatch = osInfo.name.match(/(\d+\.\d+(?:\.\d+)?)/)
          if (versionMatch) {
            version = versionMatch[1]
          }
        } else {
          // 🚨🚨🚨 NO FAKE DATA ALLOWED - Skip devices without real OS info 🚨🚨🚨
          // Per copilot-instructions.md: "NEVER EVER CREATE FAKE DATA"
          return // Skip this device entirely
        }
        
        if (!versions[version]) {
          versions[version] = { count: 0, displayName: version }
        }
        versions[version].count += 1
      }
    } else {
      // Windows detection and parsing
      const osLower = osString.toLowerCase()
      if (osLower.includes('windows') || osLower.includes('microsoft windows') || osString === 'Windows') {
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
          
          // Create full version string: "11.0.26100.4652.0"
          groupingKey = `${windowsVersion}.0.${build}.${featureUpdate}`
          
          // Create display version: "11.26100.4652.0" (without the .0 after Windows version)
          displayVersion = `${windowsVersion}.${build}.${featureUpdate}`
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
        } else {
          // 🚨🚨🚨 NO FAKE DATA ALLOWED - Skip devices without real OS info 🚨🚨🚨
          // Per copilot-instructions.md: "NEVER EVER CREATE FAKE DATA"
          return // Skip this device entirely
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
      .filter(item => {
        // Filter out generic "Windows" entry if it has 0% or if we have other specific versions
        if (item.version === 'Windows') {
           const totalDevices = devices.length
           const percentage = Math.round((item.count / totalDevices) * 100)
           // If 0% or if we have other versions, hide it
           // We check if there are other versions by checking if the filtered list would be empty without this check
           // But here we are inside filter. 
           // Logic: Hide "Windows" if percentage is 0 OR if there are other entries in the original versions object
           const hasOtherVersions = Object.keys(versions).length > 1
           if (percentage === 0 || hasOtherVersions) return false
        }
        return true
      })
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
  // Fetch devices directly if not provided via props
  useEffect(() => {
    const fetchDevices = async () => {
      // Only fetch if we have no devices AND we're loading
      // Don't fetch if we already have devices from props
      if (devices.length === 0 && loading) {
        try {
          const response = await fetch('/api/devices?includeOSVersions=true')
          if (response.ok) {
            const data = await response.json()
            setLocalDevices(data.devices || [])
          }
        } catch (error) {
          console.error(`[OSVersionBarChart ${osType}] API fetch error:`, error)
        } finally {
          setLocalLoading(false)
        }
      } else {
        // Use the devices provided via props
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

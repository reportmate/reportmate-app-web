/**
 * OS Version Tracking Widgets
 * Displays macOS and Windows version distributions with interactive charts
 */

import React from 'react'
import { useRouter } from 'next/navigation'

interface Device {
  id: string
  name: string
  model?: string
  os?: string
  lastSeen: string
  status: 'online' | 'offline' | 'warning' | 'error'
  uptime?: string
  location?: string
  serialNumber?: string
  ipAddress?: string
  totalEvents: number
  lastEventTime: string
}

interface OSVersionWidgetProps {
  devices: Device[]
  loading: boolean
  osType: 'macOS' | 'Windows'
}

// Helper function to process OS versions
const processOSVersions = (devices: Device[], osType: 'macOS' | 'Windows') => {
  if (devices.length === 0) {
    return []
  }
  
  const versions: { [key: string]: number } = {}

  devices.forEach(device => {
    if (device.os) {
      const os = device.os.toLowerCase()
      
      if (osType === 'macOS') {
        // Check if OS is in new Windows format first (e.g., "11.0.22631.2861" or "10.0.19045.3803")
        const windowsNewFormatMatch = device.os.match(/^(\d{1,2})\.(\d+)\.(\d+)\.(\d+)$/)
        // Check if OS is in macOS version format (e.g., "15.2.0", "14.7.2")
        const macOSVersionMatch = device.os.match(/^(\d{1,2}\.\d+\.\d+)$/)
        
        if (macOSVersionMatch && (device.model?.toLowerCase().includes('mac') || device.model?.toLowerCase().includes('imac'))) {
          // macOS device with version in format "15.2.0"
          const version = macOSVersionMatch[1]
          versions[version] = (versions[version] || 0) + 1
        } else if (os.includes('macos') || os.includes('mac os') || os.includes('darwin')) {
          // Legacy macOS format "macOS 15.2.0" - extract version
          const versionMatch = device.os.match(/(\d+\.\d+\.\d+)/);
          const version = versionMatch ? versionMatch[1] : 'Unknown'
          versions[version] = (versions[version] || 0) + 1
        }
      } else if (osType === 'Windows') {
        // Check if OS is in new Windows format first (e.g., "11.0.22631.2861" or "10.0.19045.3803")
        const windowsNewFormatMatch = device.os.match(/^(\d{1,2})\.(\d+)\.(\d+)\.(\d+)$/)
        
        if (windowsNewFormatMatch) {
          // Already in new Windows format (e.g., "11.0.22631.2861" or "10.0.19045.3803")
          versions[device.os] = (versions[device.os] || 0) + 1
        } else if (os.includes('windows') || os.includes('win')) {
          // Legacy Windows format - extract and convert to new format
          let version = 'Unknown'
          
          // Look for build number in format (Build 22631.2861) or (Build 22631)
          const buildMatch = device.os.match(/\(build\s+(\d+)(?:\.(\d+))?\)/i)
          
          if (buildMatch) {
            const buildNumber = buildMatch[1]
            const revision = buildMatch[2] || '0'
            
            // Both Windows 10 and 11 use 10.0 as major.minor according to Microsoft
            // The build number determines if it's Windows 10 or 11
            const buildNum = parseInt(buildNumber)
            
            if (buildNum >= 22000) {
              // Windows 11 (builds 22000+) - but we'll display as 11.0 for simplicity
              version = `11.0.${buildNumber}.${revision}`
            } else if (buildNum >= 10240) {
              // Windows 10 (builds 10240-21999)
              version = `10.0.${buildNumber}.${revision}`
            } else {
              // Older Windows versions
              if (os.includes('windows 8') || os.includes('win 8')) {
                version = `8.0.${buildNumber}.${revision}`
              } else if (os.includes('windows 7') || os.includes('win 7')) {
                version = `7.0.${buildNumber}.${revision}`
              } else {
                // Generic fallback
                version = `10.0.${buildNumber}.${revision}`
              }
            }
          } else {
            // Fallback for devices without build info - use legacy detection
            if (os.includes('windows 11') || os.includes('win 11')) {
              version = '11.0.22000.0'
            } else if (os.includes('windows 10') || os.includes('win 10')) {
              version = '10.0.19041.0'
            } else if (os.includes('windows 8') || os.includes('win 8')) {
              version = '8.0.9200.0'
            } else if (os.includes('windows 7') || os.includes('win 7')) {
              version = '7.0.7600.0'
            }
          }
          versions[version] = (versions[version] || 0) + 1
        }
      }
    }
  })

  // Sort versions appropriately
  if (osType === 'macOS') {
    return Object.entries(versions)
      .sort(([a], [b]) => {
        if (a === 'Unknown') return 1
        if (b === 'Unknown') return -1
        return parseFloat(b) - parseFloat(a)
      })
  } else {
    return Object.entries(versions)
      .sort(([a], [b]) => {
        if (a === 'Unknown') return 1
        if (b === 'Unknown') return -1
        
        // Parse versions in format major.minor.build.revision
        const parseVersion = (ver: string) => {
          const parts = ver.split('.').map(num => parseInt(num) || 0)
          return {
            major: parts[0] || 0,
            minor: parts[1] || 0,
            build: parts[2] || 0,
            revision: parts[3] || 0
          }
        }
        
        const versionA = parseVersion(a)
        const versionB = parseVersion(b)
        
        // Compare major version first
        if (versionA.major !== versionB.major) {
          return versionB.major - versionA.major
        }
        
        // Then minor version
        if (versionA.minor !== versionB.minor) {
          return versionB.minor - versionA.minor
        }
        
        // Then build number
        if (versionA.build !== versionB.build) {
          return versionB.build - versionA.build
        }
        
        // Finally revision
        return versionB.revision - versionA.revision
      })
  }
}

// Generate color for each OS version
const getOSColor = (index: number, total: number, isMacOS: boolean) => {
  if (isMacOS) {
    // macOS colors - blue gradient
    const hue = 220 + (index * 15) % 60 // Blues and purples
    return `hsl(${hue}, 70%, ${60 + (index * 5) % 25}%)`
  } else {
    // Windows colors - green gradient  
    const hue = 140 + (index * 15) % 60 // Greens and teals
    return `hsl(${hue}, 70%, ${60 + (index * 5) % 25}%)`
  }
}

export const OSVersionWidget: React.FC<OSVersionWidgetProps> = ({ devices, loading, osType }) => {
  const router = useRouter()
  const osVersions = loading || devices.length === 0 ? [] : processOSVersions(devices, osType)
  
  // Get max count for scaling bars
  const maxCount = Math.max(...osVersions.map(([, count]) => count), 1)

  const handleOSVersionClick = (version: string, isMacOS: boolean) => {
    // For filtering, we'll search for just the version number
    // This allows matching both "macOS 15.2.0" and "15.2.0" format data
    let searchQuery = version
    
    // For both macOS and Windows, search for just the version number
    // This will match devices with OS like "macOS 15.2.0" when searching for "15.2.0"
    router.push(`/devices?search=${encodeURIComponent(searchQuery)}`)
  }

  const icon = osType === 'macOS' ? (
    <svg className="w-6 h-6 text-red-500 dark:text-red-300" fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  ) : (
    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 24 24">
      <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z"/>
    </svg>
  )

  const colorClass = osType === 'macOS' ? 'bg-red-100 dark:bg-red-900' : 'bg-blue-100 dark:bg-blue-900'

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 ${colorClass} rounded-lg flex items-center justify-center`}>
            {icon}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {osType} Versions
            </h2>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        {osVersions.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
              {osType === 'macOS' ? (
                <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.71,19.5C18.71,19.5 21,15.3 21,12A9,9 0 0,0 12,3A9,9 0 0,0 3,12C3,15.3 5.29,19.5 5.29,19.5L7.58,19.5L9,14L9.5,13L10.5,13L11,14L12.5,19.5L18.71,19.5Z"/>
                </svg>
              ) : (
                <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M2,12H11V2H2V12M9,4V10H4V4H9M22,12H13V2H22V12M20,4V10H15V4H20M2,22H11V12H2V22M9,14V20H4V14H9M22,22H13V12H22V22M20,14V20H15V14H20Z"/>
                </svg>
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No {osType} devices found
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {osVersions.map(([version, count], index) => {
              const percentage = Math.round((count / devices.length) * 100)
              const barWidth = (count / maxCount) * 100
              const color = getOSColor(index, osVersions.length, osType === 'macOS')
              
              return (
                <div 
                  key={version} 
                  className="flex items-center gap-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors"
                  onClick={() => handleOSVersionClick(version, osType === 'macOS')}
                >
                  <div className={`${osType === 'Windows' ? 'w-36' : 'w-20'} text-sm font-medium text-gray-900 dark:text-white text-left`}>
                    {version}
                  </div>
                  <div className="flex-1 flex items-center gap-3">
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-6 relative overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                        style={{ 
                          width: `${barWidth}%`, 
                          backgroundColor: color,
                          minWidth: count > 0 ? '8px' : '0px'
                        }}
                      >
                        <span className="text-xs font-medium text-white">
                          {count}
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
        )}
      </div>
    </div>
  )
}

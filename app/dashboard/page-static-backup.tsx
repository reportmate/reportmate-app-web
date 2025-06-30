"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useLiveEvents } from "./hooks"
import { formatRelativeTime, formatExactTime } from "../../src/lib/time"

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

export default function DashboardPage() {
  const { events, connectionStatus, lastUpdateTime, mounted, addEvent } = useLiveEvents()
  const [timeUpdateCounter, setTimeUpdateCounter] = useState(0)
  const [devices, setDevices] = useState<Device[]>([])
  const [devicesLoading, setDevicesLoading] = useState(true)
  const [deviceNameMap, setDeviceNameMap] = useState<Record<string, string>>({})
  const router = useRouter()

  // Create device name mapping function
  const getDeviceName = (deviceId: string) => {
    return deviceNameMap[deviceId] || deviceId
  }

  // Function to handle OS version click
  const handleOSVersionClick = (version: string, isMacOS: boolean) => {
    // For filtering, we'll search for just the version number
    // This allows matching both "macOS 15.2.0" and "15.2.0" format data
    let searchQuery = version
    
    // For both macOS and Windows, search for just the version number
    // This will match devices with OS like "macOS 15.2.0" when searching for "15.2.0"
    router.push(`/devices?search=${encodeURIComponent(searchQuery)}`)
  }

  // Process OS versions from devices
  const processOSVersions = () => {
    if (devices.length === 0) {
      return { macOS: [], windows: [] }
    }
    
    const macOSVersions: { [key: string]: number } = {}
    const windowsVersions: { [key: string]: number } = {}

    devices.forEach(device => {
      if (device.os) {
        const os = device.os.toLowerCase()
        
        // Check if OS is in new Windows format first (e.g., "11.0.22631.2861" or "10.0.19045.3803")
        const windowsNewFormatMatch = device.os.match(/^(\d{1,2})\.(\d+)\.(\d+)\.(\d+)$/)
        // Check if OS is in macOS version format (e.g., "15.2.0", "14.7.2")
        const macOSVersionMatch = device.os.match(/^(\d{1,2}\.\d+\.\d+)$/)
        
        if (macOSVersionMatch && (device.model?.toLowerCase().includes('mac') || device.model?.toLowerCase().includes('imac'))) {
          // macOS device with version in format "15.2.0"
          const version = macOSVersionMatch[1]
          macOSVersions[version] = (macOSVersions[version] || 0) + 1
        } else if (os.includes('macos') || os.includes('mac os') || os.includes('darwin')) {
          // Legacy macOS format "macOS 15.2.0" - extract version
          const versionMatch = device.os.match(/(\d+\.\d+\.\d+)/);
          const version = versionMatch ? versionMatch[1] : 'Unknown'
          macOSVersions[version] = (macOSVersions[version] || 0) + 1
        } else if (windowsNewFormatMatch) {
          // Already in new Windows format (e.g., "11.0.22631.2861" or "10.0.19045.3803")
          windowsVersions[device.os] = (windowsVersions[device.os] || 0) + 1
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
          windowsVersions[version] = (windowsVersions[version] || 0) + 1
        } else {
          // Unknown OS format
        }
      }
    })

    // Sort by version number (descending), with build numbers properly sorted
    const sortedMacOS = Object.entries(macOSVersions)
      .sort(([a], [b]) => {
        if (a === 'Unknown') return 1
        if (b === 'Unknown') return -1
        return parseFloat(b) - parseFloat(a)
      })

    const sortedWindows = Object.entries(windowsVersions)
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

    return { macOS: sortedMacOS, windows: sortedWindows }
  }

  // Only process OS versions when devices are loaded and not empty
  const osVersions = devicesLoading || devices.length === 0 
    ? { macOS: [], windows: [] } 
    : processOSVersions()

  // Get max count for scaling bars
  const getMaxCount = () => {
    const macOSCounts = osVersions.macOS.map(([, count]) => count)
    const windowsCounts = osVersions.windows.map(([, count]) => count)
    return Math.max(...macOSCounts, ...windowsCounts, 1)
  }

  const maxCount = getMaxCount()

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

  // Fetch devices data
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const response = await fetch('/api/device')
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.devices) {
            // Sort devices by lastSeen descending (newest first)
            const sortedDevices = data.devices.sort((a: Device, b: Device) => 
              new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
            )
            setDevices(sortedDevices)
            
            // Build device name mapping (serial -> name)
            const nameMap: Record<string, string> = {}
            data.devices.forEach((device: Device) => {
              if (device.serialNumber && device.name) {
                nameMap[device.serialNumber] = device.name
              }
              // Also map by ID in case that's used
              nameMap[device.id] = device.name
            })
            setDeviceNameMap(nameMap)
          }
        }
      } catch (error) {
        console.error('Failed to fetch devices:', error)
      } finally {
        setDevicesLoading(false)
      }
    }

    fetchDevices()
  }, [])

  // Update relative times every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeUpdateCounter(prev => prev + 1)
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  // Calculate stats
  const stats = {
    total: events.length,
    errors: events.filter(e => e.kind.toLowerCase() === 'error').length,
    warnings: events.filter(e => e.kind.toLowerCase() === 'warning').length,
    success: events.filter(e => e.kind.toLowerCase() === 'success').length,
    devices: new Set(events.map(e => e.device)).size
  }

  // Status configuration
  const getStatusConfig = (kind: string) => {
    switch (kind.toLowerCase()) {
      case 'error': 
        return { bg: 'bg-red-500', text: 'text-red-700 dark:text-red-300', badge: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' }
      case 'warning': 
        return { bg: 'bg-yellow-500', text: 'text-yellow-700 dark:text-yellow-300', badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' }
      case 'success': 
        return { bg: 'bg-green-500', text: 'text-green-700 dark:text-green-300', badge: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' }
      case 'info': 
        return { bg: 'bg-blue-500', text: 'text-blue-700 dark:text-blue-300', badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' }
      case 'system': 
        return { bg: 'bg-purple-500', text: 'text-purple-700 dark:text-purple-300', badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' }
      default: 
        return { bg: 'bg-gray-500', text: 'text-gray-700 dark:text-gray-300', badge: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' }
    }
  }

  const getConnectionStatus = () => {
    switch (connectionStatus) {
      case 'connected':
        return { text: 'Live', color: 'text-green-600 dark:text-green-400', dot: 'bg-green-500' }
      case 'connecting':
        return { text: 'Connecting', color: 'text-yellow-600 dark:text-yellow-400', dot: 'bg-yellow-500' }
      case 'polling':
        return { text: 'Polling', color: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' }
      default:
        return { text: 'Offline', color: 'text-red-600 dark:text-red-400', dot: 'bg-red-500' }
    }
  }

  const status = getConnectionStatus()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black" suppressHydrationWarning>
      {/* Header */}
      <header className="bg-white dark:bg-black border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-white flex items-center justify-center">
                  <img 
                    src="/reportmate-logo.png" 
                    alt="ReportMate" 
                    className="w-8 h-8 object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    ReportMate
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400 hidden sm:block">
                    Endpoint Monitoring Dashboard
                  </p>
                </div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-3">
              {/* Connection status */}
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700">
                <div className={`w-2 h-2 rounded-full ${status.dot} animate-pulse`}></div>
                <span className={`text-sm font-medium ${status.color}`}>
                  {status.text}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Two-column layout: Column A (67%) + Column B (33%) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Column A (67% width) - 3 Stats Cards + Events Table */}
          <div className="lg:col-span-2 space-y-8">
            {/* Stats Cards - 3 widgets in a row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Link 
                href="/events?filter=success"
                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md dark:hover:border-gray-600 transition-all duration-200 cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
                    <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400 group-hover:text-green-700 dark:group-hover:text-green-300 transition-colors">
                      {stats.success}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                      Success
                    </p>
                  </div>
                </div>
              </Link>

              <Link 
                href="/events?filter=warning"
                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md dark:hover:border-gray-600 transition-all duration-200 cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
                    <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 group-hover:text-yellow-700 dark:group-hover:text-yellow-300 transition-colors">
                      {stats.warnings}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                      Warnings
                    </p>
                  </div>
                </div>
              </Link>

              <Link 
                href="/events?filter=error"
                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md dark:hover:border-gray-600 transition-all duration-200 cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
                    <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400 group-hover:text-red-700 dark:group-hover:text-red-300 transition-colors">
                      {stats.errors}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                      Errors
                    </p>
                  </div>
                </div>
              </Link>
            </div>

            {/* Events Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden h-[600px] flex flex-col">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Recent Events
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Live activity from your fleet
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Last update: {mounted && lastUpdateTime ? formatRelativeTime(lastUpdateTime.toISOString()) : 'Loading...'}
                    </div>
                    <Link
                      href="/events"
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                    >
                      <span>View All</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
              
              {events.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8l-2 2m0 0l-2-2m2 2v6" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      No events yet
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      Waiting for fleet events to arrive. Send a test event to get started.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-hidden">
                  <div className="overflow-x-auto hide-scrollbar h-full">
                    <table className="w-full table-fixed min-w-full">
                      <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                        <tr>
                          <th className="w-20 px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="w-56 px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Device
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden md:table-cell">
                            Message
                          </th>
                          <th className="w-44 px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Time
                          </th>
                        </tr>
                      </thead>
                    </table>
                    <div className="overflow-y-auto hide-scrollbar" style={{ height: 'calc(100% - 48px)' }}>
                      <table className="w-full table-fixed min-w-full">
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {events.slice(0, 50).map((event) => {
                            const statusConfig = getStatusConfig(event.kind)
                            return (
                              <tr 
                                key={event.id} 
                                className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                              >
                                <td className="w-20 px-3 py-2.5">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusConfig.badge}`}>
                                    {event.kind}
                                  </span>
                                </td>
                                <td className="w-56 px-3 py-2.5">
                                  <Link
                                    href={`/device/${encodeURIComponent(event.device)}`}
                                    className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors block truncate"
                                  >
                                    {getDeviceName(event.device)}
                                  </Link>
                                </td>
                                <td className="px-3 py-2.5 hidden md:table-cell">
                                  <div className="text-sm text-gray-900 dark:text-white truncate">
                                    {typeof event.payload === 'object' && event.payload !== null ? 
                                      (event.payload as any).message || JSON.stringify(event.payload) : 
                                      String(event.payload)}
                                  </div>
                                </td>
                                <td className="w-44 px-3 py-2.5">
                                  <div className="text-sm text-gray-600 dark:text-gray-400">
                                    <div className="font-medium truncate">
                                      {formatRelativeTime(event.ts)}
                                    </div>
                                    <div className="text-xs opacity-75 truncate" title={formatExactTime(event.ts)}>
                                      {formatExactTime(event.ts)}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Column B (33% width) - Total Devices Widget + New Clients Table */}
          <div className="lg:col-span-1 space-y-8">
            {/* Total Devices Widget */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {devices.length}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Total Devices
                    </p>
                  </div>
                </div>
                <Link
                  href="/devices"
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                >
                  <span>All Clients</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* New Clients Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden h-[600px] flex flex-col">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    New Clients
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Recently discovered devices
                  </p>
                </div>
              </div>

              {devicesLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-6 h-6 mx-auto mb-2 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Loading devices...</p>
                  </div>
                </div>
              ) : devices.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                      No devices found
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Devices will appear here when they report in
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-auto hide-scrollbar">
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {devices.slice(0, 8).map((device) => {
                      const getStatusColor = (status: string) => {
                        switch (status) {
                          case 'online': return 'bg-green-500'
                          case 'warning': return 'bg-yellow-500'
                          case 'error': return 'bg-red-500'
                          default: return 'bg-gray-500'
                        }
                      }

                      return (
                        <Link
                          key={device.id}
                          href={`/device/${device.id}`}
                          className="block p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${getStatusColor(device.status)} flex-shrink-0`}></div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {device.name}
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                {device.model}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                {formatRelativeTime(device.lastSeen)}
                              </div>
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* OS Version Tracking - 50/50 Split */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* macOS Versions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    macOS Versions
                  </h2>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              {osVersions.macOS.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.71,19.5C18.71,19.5 21,15.3 21,12A9,9 0 0,0 12,3A9,9 0 0,0 3,12C3,15.3 5.29,19.5 5.29,19.5L7.58,19.5L9,14L9.5,13L10.5,13L11,14L12.5,19.5L18.71,19.5Z"/>
                    </svg>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    No macOS devices found
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {osVersions.macOS.map(([version, count], index) => {
                    const percentage = Math.round((count / devices.length) * 100)
                    const barWidth = (count / maxCount) * 100
                    const color = getOSColor(index, osVersions.macOS.length, true)
                    
                    return (
                      <div 
                        key={version} 
                        className="flex items-center gap-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors"
                        onClick={() => handleOSVersionClick(version, true)}
                      >
                        <div className="w-20 text-sm font-medium text-gray-900 dark:text-white text-left">
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

          {/* Windows Versions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Windows Versions
                  </h2>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              {osVersions.windows.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M2,12H11V2H2V12M9,4V10H4V4H9M22,12H13V2H22V12M20,4V10H15V4H20M2,22H11V12H2V22M9,14V20H4V14H9M22,22H13V12H22V22M20,14V20H15V14H20Z"/>
                    </svg>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    No Windows devices found
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {osVersions.windows.map(([version, count], index) => {
                    const percentage = Math.round((count / devices.length) * 100)
                    const barWidth = (count / maxCount) * 100
                    const color = getOSColor(index, osVersions.windows.length, false)
                    
                    return (
                      <div 
                        key={version} 
                        className="flex items-center gap-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors"
                        onClick={() => handleOSVersionClick(version, false)}
                      >
                        <div className="w-36 text-sm font-medium text-gray-900 dark:text-white text-left">
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
        </div>
      </div>
    </div>
  )
}

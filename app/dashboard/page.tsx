"use client"

// Force dynamic rendering and disable caching for security
export const dynamic = 'force-dynamic'

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import ErrorBoundary from "../../src/components/ErrorBoundary"
import { WarningStatsWidget, ErrorStatsWidget } from "../../src/lib/modules/widgets/DashboardStats"
import { RecentEventsTable } from "../../src/lib/modules/widgets/RecentEventsWidget"
import { NewClientsWidget } from "../../src/lib/modules/widgets/NewClientsWidget"
import { OSVersionWidget } from "../../src/lib/modules/widgets/OSVersionWidget"
import { StatusWidget } from "../../src/lib/modules/widgets/StatusWidget"
import { PlatformDistributionWidget } from "../../src/lib/modules/widgets/PlatformDistributionWidget"
import { DashboardSkeleton } from "../../src/components/skeleton/DashboardSkeleton"
import { useLiveEvents } from "./hooks"
import { DevicePageNavigation } from "../../src/components/navigation/DevicePageNavigation"
import { DeviceSearchField } from "../../src/components/search/DeviceSearchField"
import { useComponentTracker, memoryManager } from "../../src/lib/memory-utils"
import { PerformanceMonitor } from "../../src/components/PerformanceMonitor"
import { SignalRStatus } from "../../src/components/SignalRStatus"
import { MemoryWarning } from "../../src/components/MemoryWarning"
import { optimizeDevicesArray, optimizeEventForMemory, checkMemoryUsage, triggerMemoryCleanup } from "../../src/lib/memory-optimization"

// Import the same hooks and types from the original dashboard

interface Device {
  deviceId: string      // Internal UUID (unique)
  serialNumber: string  // Human-readable unique identifier
  name: string
  model?: string
  os?: string
  platform?: string     // Fast API platform field
  lastSeen: string
  createdAt?: string    // Registration date - when device first appeared in ReportMate
  status: string        // Made flexible to handle API response variations
  uptime?: string
  location?: string
  ipAddress?: string
  totalEvents: number
  lastEventTime: string
  assetTag?: string     // Asset tag for primary display
  // Modular structure from API
  modules?: {
    inventory?: {
      uuid?: string
      owner?: string
      usage?: string
      catalog?: string
      version?: string
      assetTag?: string
      deviceId?: string
      location?: string
      moduleId?: string
      department?: string
      deviceName?: string
      collectedAt?: string
      serialNumber?: string
    }
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
    [key: string]: unknown;
  }
}

// Reuse the live events hook from the original dashboard

export default function Dashboard() {
  const componentId = useComponentTracker('Dashboard')
  const { events, connectionStatus, lastUpdateTime, mounted } = useLiveEvents()
  const [devices, setDevices] = useState<Device[]>([])
  const [devicesLoading, setDevicesLoading] = useState(true)
  const [deviceNameMap, setDeviceNameMap] = useState<Record<string, string>>({})
  const [, setTimeUpdateCounter] = useState(0)

  // Debug current state
  console.log('[DASHBOARD DEBUG] Component render:', {
    devicesCount: devices.length,
    devicesLoading,
    devicesState: devices.length > 0 ? 'HAS_DEVICES' : 'EMPTY_DEVICES'
  })

  // Memory monitoring and cleanup
  useEffect(() => {
    const interval = setInterval(() => {
      const memoryCheck = checkMemoryUsage()
      if (memoryCheck.warning && memoryCheck.usage > 200) {
        console.warn(`[DASHBOARD] Critical memory usage: ${memoryCheck.usage}MB - triggering cleanup`)
        triggerMemoryCleanup()
      }
    }, 60000) // Check every minute
    
    return () => clearInterval(interval)
  }, [])

  // Log memory status every 5 minutes in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const interval = setInterval(() => {
        memoryManager.logMemoryStatus('Dashboard')
      }, 300000) // 5 minutes
      
      return () => clearInterval(interval)
    }
  }, [])

  // Function to fetch OS data for dashboard charts
  const fetchOSDataForCharts = async (devices: Device[]) => {
    if (devices.length === 0) return
    
    try {
      console.log('[DASHBOARD] Fetching OS data for charts from first 20 devices')
      const containerApiUrl = 'https://reportmate-functions-api.blackdune-79551938.canadacentral.azurecontainerapps.io'
      
      // Get first 20 devices for sampling
      const sampleDevices = devices.slice(0, 20)
      
      const osPromises = sampleDevices.map(async (device: Device) => {
        try {
          const response = await fetch(`${containerApiUrl}/api/device/${device.serialNumber}`, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' },
            signal: AbortSignal.timeout(3000)
          })
          
          if (response.ok) {
            const deviceData = await response.json()
            const osData = deviceData.device?.modules?.system?.operatingSystem
            
            if (osData) {
              return {
                serialNumber: device.serialNumber,
                platform: osData.name?.toLowerCase().includes('windows') ? 'Windows' : 'macOS',
                osVersion: osData.displayVersion || osData.version || 'Unknown',
                osVersionForGraphs: osData.name?.toLowerCase().includes('windows') 
                  ? `${osData.major || 10}.${osData.build}.${osData.featureUpdate || '0'}`
                  : `${osData.major}.${osData.minor}.${osData.patch}`,
                osData: osData
              }
            }
          }
          return null
        } catch (error) {
          return null
        }
      })
      
      const results = await Promise.allSettled(osPromises)
      const successfulResults = results
        .filter(r => r.status === 'fulfilled' && r.value)
        .map(r => (r as PromiseFulfilledResult<any>).value)
      
      console.log(`[DASHBOARD] Got OS data for ${successfulResults.length} devices`)
      
      // Update devices with OS data
      setDevices(prevDevices => 
        prevDevices.map(device => {
          const osResult = successfulResults.find(r => r.serialNumber === device.serialNumber)
          if (osResult) {
            return {
              ...device,
              platform: osResult.platform,
              os: osResult.osVersion,
              modules: {
                ...device.modules,
                system: {
                  operatingSystem: osResult.osData
                }
              }
            }
          }
          return device
        })
      )
      
    } catch (error) {
      console.error('[DASHBOARD] Error fetching OS data for charts:', error)
    }
  }

  // Fetch devices data (same as original dashboard)
  useEffect(() => {
    let timeoutId: NodeJS.Timeout

    const fetchDevices = async () => {
      // Reduced debug logging to prevent memory issues (CRITICAL FIX)
      if (process.env.NODE_ENV === 'development') {
        // Fetching devices from API
      }
      
      // Set a timeout to prevent waiting forever
      timeoutId = setTimeout(() => {
        if (process.env.NODE_ENV === 'development') {
          // Fetch timeout reached after 15 seconds
        }
        setDevicesLoading(false)
        setDevices([])
      }, 15000) // 15 second timeout

      try {
        // FIXED: Use regular devices API to get ALL devices for accurate counts
        // Fetch directly from container API since local /api/devices has issues
        const containerApiUrl = 'https://reportmate-functions-api.blackdune-79551938.canadacentral.azurecontainerapps.io'
        const response = await fetch(`${containerApiUrl}/api/devices`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        })
        
        // Minimal response logging (CRITICAL MEMORY FIX)
        if (!response.ok) {
          console.error('[DASHBOARD] API Error:', response.status)
          throw new Error(`HTTP ${response.status}`)
        }
        
        if (response.ok) {
          const text = await response.text()
          
          if (!text.trim()) {
            console.error('[DASHBOARD] Empty response body!')
            throw new Error('Empty response from API')
          }
          
          let data
          try {
            data = JSON.parse(text)
          } catch (jsonError) {
            console.error('[DASHBOARD] JSON Parse Error:', jsonError)
            throw new Error('Invalid JSON response from API')
          }
          
          // Minimal data logging (CRITICAL MEMORY FIX)
          if (process.env.NODE_ENV === 'development' && Array.isArray(data)) {
            // Received device data from API
          }
          
          // Handle local inventory API response format: direct array of processed devices
          let deviceArray = []
          if (Array.isArray(data)) {
            // Local inventory API returns direct array format
            deviceArray = data
          } else if (data.success && Array.isArray(data.devices)) {
            // Azure Functions API format (fallback)
            deviceArray = data.devices
          } else {
            console.error('[DASHBOARD] Unexpected response format:', typeof data)
            throw new Error('Unexpected response format from API')
          }
          
          if (deviceArray.length > 0) {
            // MEMORY OPTIMIZATION: Use optimized processing
            const optimizedDevices = optimizeDevicesArray(deviceArray)
            
            // SIMPLIFIED: Process devices with or without inventory data  
            const processedDevices = optimizedDevices.map((device: any) => {
              // Get inventory from modules if available, otherwise use device properties directly
              const inventory = device.modules?.inventory || {}
              
              return {
                deviceId: device.deviceId || device.id,
                serialNumber: device.serialNumber || device.deviceId,
                // Use device name directly, fallback to inventory if available
                name: device.name || inventory.deviceName || device.deviceName || device.serialNumber,
                assetTag: device.assetTag || inventory.assetTag,
                location: device.location || inventory.location,
                usage: device.usage || inventory.usage,
                catalog: device.catalog || inventory.catalog,
                department: device.department || inventory.department,
                owner: device.owner || inventory.owner,
                lastSeen: device.lastSeen || device.timestamp,
                createdAt: device.createdAt,
                status: device.status || 'unknown',
                platform: device.platform, // CRITICAL: Preserve platform field from API
                totalEvents: device.totalEvents || 0,
                lastEventTime: device.lastEventTime || device.lastSeen,
                modules: device.modules // Preserve modules if present
              }
            })
            
            // Sort devices by lastSeen descending (newest first)
            const sortedDevices = processedDevices.sort((a: Device, b: Device) => 
              new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
            )
            
            // Setting device state
            // Removed detailed device array logging to prevent memory issues
            console.log('[DASHBOARD DEBUG] About to set devices state:', {
              processedDevicesLength: processedDevices.length,
              sortedDevicesLength: sortedDevices.length,
              firstDeviceDebug: sortedDevices[0] ? {
                name: sortedDevices[0].name,
                serialNumber: sortedDevices[0].serialNumber,
                status: sortedDevices[0].status,
                hasModules: !!sortedDevices[0].modules,
                inventoryName: sortedDevices[0].modules?.inventory?.deviceName
              } : null
            })
            
            try {
              setDevices(sortedDevices)
              setDevicesLoading(false)
              
              console.log('[DASHBOARD DEBUG] Devices state set successfully')
              
              // Fetch OS version data for charts after devices are loaded
              fetchOSDataForCharts(sortedDevices)
              
              // Clear the timeout since we got data
              if (timeoutId) {
                clearTimeout(timeoutId)
              }
              
              // State update completed successfully
              // Removed final devices state log to save memory
            } catch (error) {
              console.error('[DASHBOARD] Error setting devices:', error)
            }
            
            // Build device name mapping (serial -> name)
            // ENHANCED: Map all possible device identifiers to inventory device names
            const nameMap: Record<string, string> = {}
            processedDevices.forEach((device: Device) => {
              // Get the proper device name from inventory or fallback chain
              const deviceName = device.name // This already includes inventory.deviceName from processing above
              
              if (deviceName) {
                // Map all possible identifiers that events might use
                if (device.serialNumber) {
                  nameMap[device.serialNumber] = deviceName
                }
                if (device.deviceId) {
                  nameMap[device.deviceId] = deviceName
                }
                // Also map any asset tag to the device name
                if (device.assetTag) {
                  nameMap[device.assetTag] = deviceName
                }
                // Map inventory device name to itself (in case events use that)
                if (device.modules?.inventory?.deviceName) {
                  nameMap[device.modules.inventory.deviceName] = deviceName
                }
              }
              
              // Device name mapped for device
            })
            // Removed device mapping debug log to save memory
            setDeviceNameMap(nameMap)
          } else if (data.success && data.devices) {
            // Removed wrapped format debug log to save memory
            // Process devices to extract inventory data while preserving ALL modules
            const processedDevices = data.devices.map((device: Device) => {
              const inventory = device.modules?.inventory || {}
              return {
                ...device,
                // Preserve all modules (including system)
                modules: { ...device.modules },
                platform: device.platform, // Preserve fast API platform field
                assetTag: inventory.assetTag,
                name: inventory.deviceName || device.name || device.serialNumber || 'Unknown Device'
              }
            })
            
            // Sort devices by lastSeen descending (newest first)
            const sortedDevices = processedDevices.sort((a: Device, b: Device) => 
              new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
            )
            setDevices(sortedDevices)
            setDevicesLoading(false)
            
            // Build device name mapping (serial -> name)
            // ENHANCED: Map all possible device identifiers to inventory device names
            const nameMap: Record<string, string> = {}
            processedDevices.forEach((device: Device) => {
              // Get the proper device name from inventory or fallback chain
              const deviceName = device.name // This already includes inventory.deviceName from processing above
              
              if (deviceName) {
                // Map all possible identifiers that events might use
                if (device.serialNumber) {
                  nameMap[device.serialNumber] = deviceName
                }
                if (device.deviceId) {
                  nameMap[device.deviceId] = deviceName
                }
                // Also map any asset tag to the device name
                if (device.assetTag) {
                  nameMap[device.assetTag] = deviceName
                }
                // Map inventory device name to itself (in case events use that)
                if (device.modules?.inventory?.deviceName) {
                  nameMap[device.modules.inventory.deviceName] = deviceName
                }
              }
              
              // Device name mapped for device
            })
            // Removed wrapped format device mapping debug log to save memory
            setDeviceNameMap(nameMap)
          } else {
            // Unrecognized data format from API
            setDevicesLoading(false)
          }
        } else {
          console.error('[DASHBOARD] Response not OK:', response.status, response.statusText)
          // Failed API response
          setDevicesLoading(false)
        }
      } catch (error) {
        console.error('[DASHBOARD] Error in fetchDevices:', error)
        // Error details removed to save memory
        // Setting device loading to false due to error
        
        // Clear the timeout
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
        
        setDevicesLoading(false)
        // Set empty devices array to prevent widgets from waiting indefinitely
        setDevices([])
      }
    }

    // Removed useEffect trigger log to save memory
    fetchDevices()

    // Cleanup function
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
    
    // TEMPORARY FIX: Direct API call to ensure devices data is loaded
    const loadDevicesDirectly = async () => {
      try {
        // Fetch directly from container API
        const containerApiUrl = 'https://reportmate-functions-api.blackdune-79551938.canadacentral.azurecontainerapps.io'
        const response = await fetch(`${containerApiUrl}/api/devices`)
        if (response.ok) {
          const data = await response.json()
          // Got devices from direct API call
          if (data && data.devices && data.devices.length > 0) {
            setDevices(data.devices)
            setDevicesLoading(false)
            // Successfully set devices state
          }
        }
      } catch (error) {
        console.error('[DASHBOARD] Direct API error:', error)
      }
    }
    
    // Call direct API after a short delay
    setTimeout(loadDevicesDirectly, 1000)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentionally running once on mount
  }, [])

  // Update relative times every 60 seconds (increased from 30 to reduce processing)
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeUpdateCounter(prev => prev + 1)
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  // Debug: Log devices state changes (DISABLED - causes memory issues)
  useEffect(() => {
    // Only log basic info in development and limit frequency
    if (process.env.NODE_ENV === 'development' && devices.length > 0) {
      // Devices loaded successfully
      // Removed detailed device mapping to prevent memory issues
    }
  }, [devices.length, devicesLoading]) // Use devices.length instead of full array

  // Show skeleton while data is loading
  if (devicesLoading) {
    return <DashboardSkeleton />
  }

    // DEBUG: Add unique timestamp to force re-render 
    // Removed render timestamp log to save memory
    
    // Dashboard rendering with current device state

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black" suppressHydrationWarning>
      {/* Header */}
      <header className="bg-white dark:bg-black border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 w-full">
            {/* Brand */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden">
                  <Image 
                    src="/reportmate-logo.png" 
                    alt="ReportMate" 
                    width={40}
                    height={40}
                    className="object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    ReportMate
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400 hidden sm:block">
                    Endpoint Monitoring
                  </p>
                </div>
              </div>
            </div>
            
            {/* Device Search Field - Aligned with Recent Events table and extends to buttons */}
            <div className="hidden md:flex flex-1 items-center">
              {/* Spacer to align search field with Column B (Recent Events table) - 35% width + gap - adjustment */}
              <div className="flex-1 max-w-[calc(10%+7.7rem)]"></div>
              
              {/* Search field that grows to fill available space up to the buttons */}
              <div className="flex-1 mr-4">
                <DeviceSearchField 
                  className="w-full"
                  placeholder="Find device by name, serial, or asset tag"
                  preloadedDevices={devices}
                />
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-2">
              <DevicePageNavigation className="flex items-center gap-2" currentPage="dashboard" />
              
              {/* Settings Gear Icon */}
              <Link
                href="/settings"
                className="p-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                title="Settings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Two-column layout: Column A (30%) + Column B (70%) */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
          {/* Column A (30% width) - Status Widget + Error/Warning Stats + New Clients Table */}
          <div className="lg:col-span-3 space-y-8">
            {/* Device Status Widget */}
            <ErrorBoundary fallback={<div className="p-4 bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">Error loading status chart</div>}>
              <StatusWidget devices={devices} loading={devicesLoading} />
            </ErrorBoundary>

            {/* Error and Warning Stats Cards */}
            <ErrorBoundary fallback={<div className="p-4 bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">Error loading stats</div>}>
              <div className="grid grid-cols-1 gap-4">
                <ErrorStatsWidget events={events} devices={devices} />
                <WarningStatsWidget events={events} devices={devices} />
              </div>
            </ErrorBoundary>

            {/* New Clients Table */}
            <ErrorBoundary fallback={<div className="p-4 bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">Error loading devices list</div>}>
              <NewClientsWidget devices={devices} loading={devicesLoading} />
            </ErrorBoundary>
          </div>

          {/* Column B (70% width) - Recent Events + OS Version Charts */}
          <div className="lg:col-span-7 space-y-8">
            {/* Recent Events Table */}
            <ErrorBoundary fallback={<div className="p-4 bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">Error loading events</div>}>
              <RecentEventsTable
                events={events}
                connectionStatus={connectionStatus}
                lastUpdateTime={lastUpdateTime}
                mounted={mounted}
                deviceNameMap={deviceNameMap}
              />
            </ErrorBoundary>

            {/* Platform Distribution - Full Width */}
            <ErrorBoundary fallback={<div className="p-4 bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">Error loading platform stats</div>}>
              <PlatformDistributionWidget devices={devices as any} loading={devicesLoading} />
            </ErrorBoundary>

            {/* OS Version Tracking - 50/50 Split */}
            <ErrorBoundary fallback={<div className="p-4 bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">Error loading OS stats</div>}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* macOS Versions */}
                <OSVersionWidget devices={devices} loading={devicesLoading} osType="macOS" />
                
                {/* Windows Versions */}
                <OSVersionWidget devices={devices} loading={devicesLoading} osType="Windows" />
              </div>
            </ErrorBoundary>
          </div>
        </div>
      </div>
      
      <PerformanceMonitor />
      <MemoryWarning />
    </div>
  )
}

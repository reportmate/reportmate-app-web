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

// Import the same hooks and types from the original dashboard

interface Device {
  deviceId: string      // Internal UUID (unique)
  serialNumber: string  // Human-readable unique identifier
  name: string
  model?: string
  os?: string
  lastSeen: string
  createdAt?: string    // Registration date - when device first appeared in ReportMate
  status: 'active' | 'stale' | 'missing' | 'warning' | 'error' | 'offline'
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
  const { events, connectionStatus, lastUpdateTime, mounted } = useLiveEvents()
  const [devices, setDevices] = useState<Device[]>([])
  const [devicesLoading, setDevicesLoading] = useState(true)
  const [deviceNameMap, setDeviceNameMap] = useState<Record<string, string>>({})
  const [, setTimeUpdateCounter] = useState(0)

  // Fetch devices data (same as original dashboard)
  useEffect(() => {
    let timeoutId: NodeJS.Timeout

    const fetchDevices = async () => {
      console.log('[DASHBOARD] 🚀 Starting fetchDevices...')
      console.log('[DASHBOARD] Current state - devices.length:', devices.length, 'devicesLoading:', devicesLoading)
      
      // Set a timeout to prevent waiting forever
      timeoutId = setTimeout(() => {
        console.log('[DASHBOARD] ⏰ Timeout reached - setting loading to false')
        setDevicesLoading(false)
        setDevices([])
      }, 15000) // 15 second timeout

      try {
        console.log('[DASHBOARD] Fetching from /api/devices...')
        // Use production API 
        const response = await fetch('/api/devices', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        })
        console.log('[DASHBOARD] Response status:', response.status, response.statusText)
        console.log('[DASHBOARD] Response ok:', response.ok)
        
        if (response.ok) {
          console.log('[DASHBOARD] Response OK, parsing JSON...')
          const text = await response.text()
          console.log('[DASHBOARD] Raw response text length:', text.length)
          
          if (!text.trim()) {
            console.error('[DASHBOARD] Empty response body!')
            throw new Error('Empty response from API')
          }
          
          let data
          try {
            data = JSON.parse(text)
          } catch (jsonError) {
            console.error('[DASHBOARD] JSON Parse Error:', jsonError)
            console.error('[DASHBOARD] Raw response:', text.substring(0, 500))
            throw new Error('Invalid JSON response from API')
          }
          
          console.log('[DASHBOARD] Received device data:', data)
          console.log('[DASHBOARD] Is array?', Array.isArray(data))
          console.log('[DASHBOARD] Data length:', Array.isArray(data) ? data.length : 'N/A')
          
          // Handle both response formats: {success: true, devices: [...]} or direct array
          if (Array.isArray(data)) {
            console.log('[DASHBOARD] Processing array format...')
            // Process devices to extract inventory data while preserving ALL modules
            const processedDevices = data.map((device: Device) => {
              const inventory = device.modules?.inventory || {}
              const modules = device.modules
              
              console.log('[DASHBOARD] Device modules available:', Object.keys(device.modules || {}))
              console.log('[DASHBOARD] System module present:', !!modules?.system)
              if (modules?.system) {
                console.log('[DASHBOARD] System module OS data:', !!modules.system.operatingSystem)
              }
              
              return {
                ...device,
                // Preserve all modules (including system) by copying as-is
                modules: { ...device.modules },
                // Extract inventory fields for backwards compatibility
                assetTag: inventory.assetTag,
                name: inventory.deviceName || device.name || device.serialNumber || 'Unknown Device'
              }
            })
            
            // Sort devices by lastSeen descending (newest first)
            const sortedDevices = processedDevices.sort((a: Device, b: Device) => 
              new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
            )
            
            console.log('[DASHBOARD] Setting devices:', sortedDevices.length, 'devices')
            console.log('[DASHBOARD] First device:', sortedDevices[0])
            console.log('[DASHBOARD] Devices being set:', sortedDevices.map(d => ({ 
              name: d.name, 
              status: d.status, 
              serialNumber: d.serialNumber,
              deviceId: d.deviceId,
              hasStatus: !!d.status
            })))
            
            try {
              setDevices(sortedDevices)
              setDevicesLoading(false)
              
              // Clear the timeout since we got data
              if (timeoutId) {
                clearTimeout(timeoutId)
              }
              
              console.log('[DASHBOARD] Successfully called setDevices and setDevicesLoading(false)')
              console.log('[DASHBOARD] Final devices state will be:', {
                count: sortedDevices.length,
                loading: false,
                firstDeviceStatus: sortedDevices[0]?.status,
                statusCounts: sortedDevices.reduce((acc, d) => {
                  acc[d.status] = (acc[d.status] || 0) + 1
                  return acc
                }, {} as Record<string, number>)
              })
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
              
              console.log('[DASHBOARD] Device name mapping for:', device.serialNumber, ':', {
                serialNumber: device.serialNumber,
                deviceId: device.deviceId,
                assetTag: device.assetTag,
                inventoryDeviceName: device.modules?.inventory?.deviceName,
                mappedName: deviceName
              })
            })
            console.log('[DASHBOARD] Final device name map:', nameMap)
            setDeviceNameMap(nameMap)
          } else if (data.success && data.devices) {
            console.log('[DASHBOARD] Processing wrapped format...')
            // Process devices to extract inventory data while preserving ALL modules
            const processedDevices = data.devices.map((device: Device) => {
              const inventory = device.modules?.inventory || {}
              return {
                ...device,
                // Preserve all modules (including system)
                modules: { ...device.modules },
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
              
              console.log('[DASHBOARD] Device name mapping for:', device.serialNumber, ':', {
                serialNumber: device.serialNumber,
                deviceId: device.deviceId,
                assetTag: device.assetTag,
                inventoryDeviceName: device.modules?.inventory?.deviceName,
                mappedName: deviceName
              })
            })
            console.log('[DASHBOARD] Final device name map (wrapped format):', nameMap)
            setDeviceNameMap(nameMap)
          } else {
            console.log('[DASHBOARD] Unrecognized data format:', data)
            setDevicesLoading(false)
          }
        } else {
          console.error('[DASHBOARD] ❌ Response not OK:', response.status, response.statusText)
          console.log('[DASHBOARD] Setting devicesLoading(false) due to failed response')
          setDevicesLoading(false)
        }
      } catch (error) {
        console.error('[DASHBOARD] ❌ Error in fetchDevices:', error)
        console.error('[DASHBOARD] Error details:', {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          name: error instanceof Error ? error.name : 'Unknown'
        })
        console.log('[DASHBOARD] Setting devicesLoading(false) due to error')
        
        // Clear the timeout
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
        
        setDevicesLoading(false)
        // Set empty devices array to prevent widgets from waiting indefinitely
        setDevices([])
      }
    }

    console.log('[DASHBOARD] useEffect triggered, calling fetchDevices()...')
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
        const response = await fetch('/api/devices')
        if (response.ok) {
          const data = await response.json()
          console.log('[DASHBOARD] Direct API: Got devices:', data.length, 'devices')
          if (data && data.length > 0) {
            setDevices(data)
            setDevicesLoading(false)
            console.log('[DASHBOARD] Direct API: Successfully set devices state')
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

  // Update relative times every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeUpdateCounter(prev => prev + 1)
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  // Debug: Log devices state changes
  useEffect(() => {
    console.log('[DASHBOARD] Devices state changed:', devices.length, 'devices loaded:', !devicesLoading)
    console.log('[DASHBOARD] Current devices:', devices.map(d => ({ 
      name: d.name, 
      status: d.status, 
      serialNumber: d.serialNumber 
    })))
  }, [devices, devicesLoading])

  // Show skeleton while data is loading
  if (devicesLoading) {
    return <DashboardSkeleton />
  }

  // Debug log for render
  console.log('[DASHBOARD] Rendering with:', {
    devicesCount: devices.length,
    devicesLoading,
    firstDevice: devices[0] ? {
      name: devices[0].name,
      status: devices[0].status,
      serialNumber: devices[0].serialNumber
    } : null
  })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black" suppressHydrationWarning>
      {/* Header */}
      <header className="bg-white dark:bg-black border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
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

            {/* OS Version Tracking - 50/50 Split */}
            <ErrorBoundary fallback={<div className="p-4 bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">Error loading OS stats</div>}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* macOS Versions */}
                <OSVersionWidget devices={devices} loading={devicesLoading} osType="macOS" />
                
                {/* Windows Versions */}
                <OSVersionWidget devices={devices} loading={devicesLoading} osType="Windows" />
              </div>
            </ErrorBoundary>

            {/* Platform Distribution - Full Width */}
            <ErrorBoundary fallback={<div className="p-4 bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">Error loading platform stats</div>}>
              <PlatformDistributionWidget devices={devices as any} loading={devicesLoading} />
            </ErrorBoundary>
          </div>
        </div>
      </div>
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import ErrorBoundary from "../../src/components/ErrorBoundary"
import { ThemeToggle } from "../../src/components/theme-toggle"
import { SuccessStatsWidget, WarningStatsWidget, ErrorStatsWidget, DevicesStatsWidget } from "../../src/lib/modules/widgets/DashboardStats"
import { RecentEventsWidget } from "../../src/lib/modules/widgets/RecentEventsWidget"
import { NewClientsWidget } from "../../src/lib/modules/widgets/NewClientsWidget"
import { OSVersionWidget } from "../../src/lib/modules/widgets/OSVersionWidget"
import { ConnectionStatusWidget } from "../../src/lib/modules/widgets/ConnectionStatusWidget"
import { useLiveEvents } from "./hooks"

// Import the same hooks and types from the original dashboard
interface FleetEvent {
  id: string
  device: string
  kind: string
  ts: string
  payload: Record<string, unknown>
}

interface Device {
  deviceId: string      // Internal UUID (unique)
  serialNumber: string  // Human-readable unique identifier
  name: string
  model?: string
  os?: string
  lastSeen: string
  status: 'active' | 'stale' | 'warning' | 'error'
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
  }
}

// Reuse the live events hook from the original dashboard

export default function DashboardPage() {
  const { events, connectionStatus, lastUpdateTime, mounted, addEvent } = useLiveEvents()
  const [timeUpdateCounter, setTimeUpdateCounter] = useState(0)
  const [devices, setDevices] = useState<Device[]>([])
  const [devicesLoading, setDevicesLoading] = useState(true)
  const [deviceNameMap, setDeviceNameMap] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Fetch devices data (same as original dashboard)
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        setError(null)
        // Use Next.js API route
        const response = await fetch('/api/devices', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        })
        if (response.ok) {
          const data = await response.json()
          // Handle both response formats: {success: true, devices: [...]} or direct array
          if (Array.isArray(data)) {
            // Process devices to extract inventory data
            const processedDevices = data.map((device: any) => {
              const inventory = device.modules?.inventory || {}
              return {
                ...device,
                assetTag: inventory.assetTag,
                name: inventory.deviceName || device.name || device.hostname || 'Unknown Device'
              }
            })
            
            // Sort devices by lastSeen descending (newest first)
            const sortedDevices = processedDevices.sort((a: Device, b: Device) => 
              new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
            )
            setDevices(sortedDevices)
            
            // Build device name mapping (serial -> name)
            const nameMap: Record<string, string> = {}
            processedDevices.forEach((device: Device) => {
              if (device.serialNumber && device.name) {
                nameMap[device.serialNumber] = device.name
              }
              // Also map by deviceId in case that's used
              nameMap[device.deviceId] = device.name
            })
            setDeviceNameMap(nameMap)
          } else if (data.success && data.devices) {
            // Process devices to extract inventory data
            const processedDevices = data.devices.map((device: any) => {
              const inventory = device.modules?.inventory || {}
              return {
                ...device,
                assetTag: inventory.assetTag,
                name: inventory.deviceName || device.name || device.hostname || 'Unknown Device'
              }
            })
            
            // Sort devices by lastSeen descending (newest first)
            const sortedDevices = processedDevices.sort((a: Device, b: Device) => 
              new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
            )
            setDevices(sortedDevices)
            
            // Build device name mapping (serial -> name)
            const nameMap: Record<string, string> = {}
            processedDevices.forEach((device: Device) => {
              if (device.serialNumber && device.name) {
                nameMap[device.serialNumber] = device.name
              }
              // Also map by deviceId in case that's used
              nameMap[device.deviceId] = device.name
            })
            setDeviceNameMap(nameMap)
          }
        }
      } catch (error) {
        console.error('Failed to fetch devices:', error)
        setError(`Failed to load devices: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
                  <img 
                    src="/reportmate-logo.png" 
                    alt="ReportMate" 
                    className="w-full h-full object-contain"
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
              {/* Connection Status */}
              <ConnectionStatusWidget 
                connectionStatus={connectionStatus}
              />
              
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
        {/* Two-column layout: Column A (67%) + Column B (33%) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Column A (67% width) - 3 Stats Cards + Events Table */}
          <div className="lg:col-span-2 space-y-8">
            {/* Stats Cards - 3 widgets in a row */}
            <ErrorBoundary fallback={<div className="p-4 bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">Error loading stats</div>}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <SuccessStatsWidget events={events} />
                <WarningStatsWidget events={events} />
                <ErrorStatsWidget events={events} />
              </div>
            </ErrorBoundary>

            {/* Events Table */}
            <ErrorBoundary fallback={<div className="p-4 bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">Error loading events</div>}>
              <RecentEventsWidget
                events={events}
                connectionStatus={connectionStatus}
                lastUpdateTime={lastUpdateTime}
                mounted={mounted}
                deviceNameMap={deviceNameMap}
              />
            </ErrorBoundary>
          </div>

          {/* Column B (33% width) - Total Devices Widget + New Clients Table */}
          <div className="lg:col-span-1 space-y-8">
            {/* Total Devices Widget */}
            <ErrorBoundary fallback={<div className="p-4 bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">Error loading devices stats</div>}>
              <DevicesStatsWidget devices={devices} />
            </ErrorBoundary>

            {/* New Clients Table */}
            <ErrorBoundary fallback={<div className="p-4 bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">Error loading devices list</div>}>
              <NewClientsWidget devices={devices} loading={devicesLoading} />
            </ErrorBoundary>
          </div>
        </div>

        {/* OS Version Tracking - 50/50 Split */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* macOS Versions */}
          <ErrorBoundary fallback={<div className="p-4 bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">Error loading macOS stats</div>}>
            <OSVersionWidget devices={devices} loading={devicesLoading} osType="macOS" />
          </ErrorBoundary>

          {/* Windows Versions */}
          <ErrorBoundary fallback={<div className="p-4 bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">Error loading Windows stats</div>}>
            <OSVersionWidget devices={devices} loading={devicesLoading} osType="Windows" />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  )
}

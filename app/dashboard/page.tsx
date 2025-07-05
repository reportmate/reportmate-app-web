"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import ErrorBoundary from "../../src/components/ErrorBoundary"
import { SuccessStatsWidget, WarningStatsWidget, ErrorStatsWidget, DevicesStatsWidget } from "../../src/lib/modules/widgets/DashboardStats"
import { RecentEventsWidget } from "../../src/lib/modules/widgets/RecentEventsWidget"
import { NewClientsWidget } from "../../src/lib/modules/widgets/NewClientsWidget"
import { OSVersionWidget } from "../../src/lib/modules/widgets/OSVersionWidget"

// Import the same hooks and types from the original dashboard
interface FleetEvent {
  id: string
  device: string
  kind: string
  ts: string
  payload: Record<string, unknown>
}

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

// Reuse the live events hook from the original dashboard
import { useLiveEvents } from "../dashboard/hooks"

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
        // Use Azure Functions API with environment variable for cloud-agnostic deployment
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://reportmate.ecuad.ca'
        const response = await fetch(`${apiBaseUrl}/api/devices`)
        if (response.ok) {
          const data = await response.json()
          // Handle both response formats: {success: true, devices: [...]} or direct array
          if (Array.isArray(data)) {
            // Sort devices by lastSeen descending (newest first)
            const sortedDevices = data.sort((a: Device, b: Device) => 
              new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
            )
            setDevices(sortedDevices)
            
            // Build device name mapping (serial -> name)
            const nameMap: Record<string, string> = {}
            data.forEach((device: Device) => {
              if (device.serialNumber && device.name) {
                nameMap[device.serialNumber] = device.name
              }
              // Also map by ID in case that's used
              nameMap[device.id] = device.name
            })
            setDeviceNameMap(nameMap)
          } else if (data.success && data.devices) {
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
              {/* Navigation */}
              <nav className="flex items-center gap-4">
                <Link
                  href="/devices"
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Devices
                </Link>
                <Link
                  href="/events"
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Events
                </Link>
                <Link
                  href="/modules"
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Modules
                </Link>
                <Link
                  href="/settings"
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Settings
                </Link>
              </nav>
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

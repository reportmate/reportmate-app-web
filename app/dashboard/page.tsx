"use client"

// Force dynamic rendering and disable caching for security
export const dynamic = 'force-dynamic'

import { useEffect, useState, useMemo, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import ErrorBoundary from "../../src/components/ErrorBoundary"
import { WarningStatsWidget, ErrorStatsWidget, InstallStatsData } from "../../src/lib/modules/widgets/DashboardStats"
import { RecentEventsTable } from "../../src/lib/modules/widgets/RecentEventsWidget"
import { NewClientsWidget } from "../../src/lib/modules/widgets/NewClientsWidget"
import { OSVersionWidget } from "../../src/lib/modules/widgets/OSVersionWidget"
import { StatusWidget } from "../../src/lib/modules/widgets/StatusWidget"
import { PlatformDistributionWidget } from "../../src/lib/modules/widgets/PlatformDistributionWidget"
import { DashboardSkeleton } from "../../src/components/skeleton/DashboardSkeleton"
import { useLiveEvents } from "./hooks"
import { DevicePageNavigation } from "../../src/components/navigation/DevicePageNavigation"
import { DeviceSearchField } from "../../src/components/search/DeviceSearchField"
import { calculateDeviceStatus } from "../../src/lib/data-processing"

interface InventorySummary {
  deviceName?: string
  assetTag?: string
  serialNumber?: string
  location?: string
  department?: string
  usage?: string
  catalog?: string
  owner?: string
}

// NEW CLEAN API FORMAT - Updated for FastAPI container response
interface Device {
  deviceId: string      // Internal UUID (unique)
  serialNumber: string  // Human-readable unique identifier
  deviceName: string    // Device name from API (replaces old 'name' field)
  lastSeen: string
  status: string
  // Required fields for compatibility with existing components
  name: string          // Required for widgets - will be set from deviceName or inventory.deviceName
  // Additional fields that we'll extract from modules for compatibility
  assetTag?: string     // Will be extracted from inventory module
  location?: string     // Will be extracted from inventory module
  department?: string   // Will be extracted from inventory module
  usage?: string
  catalog?: string
  owner?: string
  platform?: string     // Will be derived from system.operatingSystem
  os?: string           // Will be derived from system.operatingSystem
  // Clean modular structure from new API
  inventory?: InventorySummary
  modules?: {
    inventory?: InventorySummary
    system?: {
      operatingSystem?: {
        name?: string
        version?: string
        build?: string
        architecture?: string
        displayVersion?: string
        edition?: string
        featureUpdate?: string
        major?: string
        minor?: string
        patch?: string
      }
    }
  }
  // Legacy fields for compatibility with existing widgets
  totalEvents?: number   // Optional aggregated metrics
  lastEventTime?: string // Optional aggregated metrics
  createdAt?: string
}

// Reuse the live events hook from the original dashboard

export default function Dashboard() {
  // Component tracking disabled for performance
  const { events, connectionStatus, lastUpdateTime, mounted, loadingProgress, loadingMessage } = useLiveEvents()
  const [devices, setDevices] = useState<Device[]>([])
  const [devicesLoading, setDevicesLoading] = useState(true) // Start with true to show loading
  const [, setTimeUpdateCounter] = useState(0)
  const [installStats, setInstallStats] = useState<InstallStatsData | null>(null)
  const [installStatsLoading, setInstallStatsLoading] = useState(true)
  
  // Memoize device name map to avoid recalculating on every render
  const deviceNameMap = useMemo(() => {
    const nameMap: Record<string, string> = {}
    devices.forEach((device) => {
      if (device.serialNumber) {
        nameMap[device.serialNumber] = device.name
      }
      if (device.deviceId && device.deviceId !== device.serialNumber) {
        nameMap[device.deviceId] = device.name
      }
      if (device.assetTag) {
        nameMap[device.assetTag] = device.name
      }
    })
    return nameMap
  }, [devices])
  
  // CONSOLIDATED API FETCH: Single /api/dashboard call for all data
  // Eliminates separate calls for devices + install stats (2 calls → 1)
  useEffect(() => {
    let aborted = false

    const fetchDashboardData = async () => {
      try {
        setDevicesLoading(true)
        setInstallStatsLoading(true)
        
        // Single consolidated API call
        const response = await fetch('/api/dashboard?eventsLimit=50', { cache: 'no-store' })

        if (!response.ok) {
          throw new Error(`Failed to load dashboard data: ${response.status}`)
        }

        const data = await response.json()
        
        // Process devices from consolidated response
        const rawDevices: any[] = Array.isArray(data?.devices) ? data.devices : []

        const transformedDevices: Device[] = rawDevices.map((apiDevice: any) => {
          const inventory = apiDevice.inventory || apiDevice.modules?.inventory || {}
          const systemOS = apiDevice.modules?.system?.operatingSystem || {}
          const deviceName = inventory.deviceName || apiDevice.name || apiDevice.deviceName || apiDevice.serialNumber
          const assetTag = inventory.assetTag || apiDevice.assetTag
          
          // Platform is provided directly by FastAPI
          const platform = apiDevice.platform || (systemOS.name?.toLowerCase().includes('windows')
            ? 'Windows'
            : systemOS.name?.toLowerCase().includes('mac')
              ? 'macOS'
              : 'Unknown')
          
          // OS version from FastAPI includes complete system module data
          const osVersion = apiDevice.osVersion || systemOS.displayVersion || systemOS.version || apiDevice.os || 'Unknown'
          const calculatedStatus = calculateDeviceStatus(apiDevice.lastSeen)

          // Build modules object with complete OS data from FastAPI
          const modules: Device['modules'] = {}
          if (Object.keys(inventory).length > 0) {
            modules.inventory = inventory
          }
          if (Object.keys(systemOS).length > 0) {
            modules.system = { operatingSystem: systemOS }
          }

          const device: Device = {
            deviceId: apiDevice.deviceId,
            serialNumber: apiDevice.serialNumber,
            deviceName,
            lastSeen: apiDevice.lastSeen,
            status: calculatedStatus,
            name: deviceName,
            assetTag,
            location: inventory.location || apiDevice.location,
            department: inventory.department || apiDevice.department,
            usage: inventory.usage || apiDevice.usage,
            catalog: inventory.catalog || apiDevice.catalog,
            owner: inventory.owner || apiDevice.owner,
            platform,
            os: osVersion,
            modules: modules && Object.keys(modules).length > 0 ? modules : undefined,
            inventory: Object.keys(inventory).length > 0 ? inventory : undefined,
            totalEvents: apiDevice.totalEvents ?? 0,
            lastEventTime: apiDevice.lastEventTime ?? apiDevice.lastSeen,
            createdAt: apiDevice.createdAt ?? apiDevice.registrationDate,
          }

          return device
        })

        if (aborted) {
          return
        }

        // Sort devices by lastSeen (newest first)
        transformedDevices.sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime())
        setDevices(transformedDevices)
        
        // Set install stats from consolidated response
        if (data.installStats) {
          setInstallStats(data.installStats)
        }
      } catch (error) {
        if (!aborted) {
          console.error('[DASHBOARD] Dashboard data fetch failed:', error)
          setDevices([])
          setInstallStats(null)
        }
      } finally {
        if (!aborted) {
          setDevicesLoading(false)
          setInstallStatsLoading(false)
        }
      }
    }

    fetchDashboardData()
    
    // Refresh every 10 minutes
    const interval = setInterval(fetchDashboardData, 600000)

    return () => {
      aborted = true
      clearInterval(interval)
    }
  }, [])

  // Update relative times every 2 minutes (reduced from 60s to decrease processing)
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeUpdateCounter(prev => prev + 1)
    }, 120000)
    return () => clearInterval(interval)
  }, [])

  // Install stats are now fetched with consolidated /api/dashboard call
  // No separate fetch needed

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
                  preloadedDevices={devices as any}
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
              <StatusWidget devices={devices as any} loading={devicesLoading} />
            </ErrorBoundary>

            {/* Error and Warning Stats Cards */}
            <ErrorBoundary fallback={<div className="p-4 bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">Error loading stats</div>}>
              <div className="grid grid-cols-1 gap-4">
                <ErrorStatsWidget installStats={installStats} isLoading={installStatsLoading} />
                <WarningStatsWidget installStats={installStats} isLoading={installStatsLoading} />
              </div>
            </ErrorBoundary>

            {/* New Clients Table */}
            <ErrorBoundary fallback={<div className="p-4 bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">Error loading devices list</div>}>
              <NewClientsWidget devices={devices as any} loading={devicesLoading} />
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
                isLoading={connectionStatus === 'connecting' && events.length === 0}
                loadingProgress={loadingProgress}
                loadingMessage={loadingMessage}
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
                <OSVersionWidget devices={devices as any} loading={devicesLoading} osType="macOS" />
                
                {/* Windows Versions */}
                <OSVersionWidget devices={devices as any} loading={devicesLoading} osType="Windows" />
              </div>
            </ErrorBoundary>
          </div>
        </div>
      </div>
      
      {/* Performance monitors disabled for memory optimization */}
    </div>
  )
}

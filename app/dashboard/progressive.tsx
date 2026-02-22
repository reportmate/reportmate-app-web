/**
 * Progressive Dashboard - Shows content immediately, no 3-minute wait
 */

"use client"

// Force dynamic rendering and disable caching for security
export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import ErrorBoundary from "../../src/components/ErrorBoundary"
import { useLiveEvents } from "./hooks"
import { DevicePageNavigation } from "../../src/components/navigation/DevicePageNavigation"
import { DeviceSearchField } from "../../src/components/search/DeviceSearchField"
import { useComponentTracker } from "../../src/lib/memory-utils"
import { PerformanceMonitor } from "../../src/components/PerformanceMonitor"
import { MemoryWarning } from "../../src/components/MemoryWarning"
import { DashboardSkeleton } from "../../src/components/skeleton/DashboardSkeleton"

// ORIGINAL widgets - NO DESIGN CHANGES!
import { OSVersionWidget } from "../../src/lib/modules/widgets/OSVersionWidget"
import { PlatformDistributionWidget } from "../../src/lib/modules/widgets/PlatformDistributionWidget"
import { WarningStatsWidget, ErrorStatsWidget } from "../../src/lib/modules/widgets/DashboardStats"
import { RecentEventsTable } from "../../src/lib/modules/widgets/RecentEventsWidget"
import { StatusWidget } from "../../src/lib/modules/widgets/StatusWidget"
import { NewClientsWidget } from "../../src/lib/modules/widgets/NewClientsWidget"

export default function ProgressiveDashboard() {
  useComponentTracker('ProgressiveDashboard')
  const { events, connectionStatus, lastUpdateTime, mounted, loadingProgress, loadingMessage } = useLiveEvents()
  const [, setTimeUpdateCounter] = useState(0)
  
  // State for FAST devices list that loads immediately (inventory only)
  const [fastDevices, setFastDevices] = useState<any[]>([])
  const [fastLoading, setFastLoading] = useState(true)
  
  // State for ALL devices data with system info (loads in background)
  const [allDevices, setAllDevices] = useState<any[]>([])

  // Load FAST devices list first (inventory only - shows within 3 seconds)
  useEffect(() => {
    const loadFastDevices = async () => {
      try {
        const response = await fetch('/api/modules/devices-list', {
          cache: 'no-store'
        })

        if (response.ok) {
          const devices = await response.json()
          setFastDevices(devices)
          setFastLoading(false)
        }
      } catch (error) {
        console.error('[PROGRESSIVE DASHBOARD] Error loading fast devices:', error)
        setFastLoading(false)
      }
    }

    loadFastDevices()
  }, [])

  // Load ALL devices data for charts (loads in background - takes ~3 minutes)
  useEffect(() => {
    const loadAllDevicesData = async () => {
      try {
        const response = await fetch('/api/devices', {
          cache: 'no-store'
        })

        if (response.ok) {
          const devices = await response.json()
          setAllDevices(devices)
        }
      } catch (error) {
        console.error('[PROGRESSIVE DASHBOARD] Error loading all devices data:', error)
      }
    }

    loadAllDevicesData()
  }, [])

  // Update relative times every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeUpdateCounter(prev => prev + 1)
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  // Use the best available device data: ALL devices if loaded, otherwise FAST devices
  const displayDevices = allDevices.length > 0 ? allDevices : fastDevices

  const deviceNameMap = useMemo(() => {
    const map: Record<string, string> = {}
    displayDevices.forEach(device => {
      const name = device?.modules?.inventory?.deviceName || device?.name || device?.deviceName
        || device?.modules?.hardware?.system?.computer_name || device?.modules?.hardware?.system?.hostname
        || device?.serialNumber
      const serial = device?.serialNumber
      const deviceId = device?.deviceId
      const assetTag = device?.modules?.inventory?.assetTag || device?.assetTag

      if (name) {
        if (serial) map[serial] = name
        if (deviceId && deviceId !== serial) map[deviceId] = name
        if (assetTag) map[assetTag] = name
      }
    })
    return map
  }, [displayDevices])

  // Show skeleton only while FAST devices are loading (<3 seconds)
  if (fastLoading) {
    return <DashboardSkeleton />
  }

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
            
            {/* Device Search Field */}
            <div className="hidden md:flex flex-1 items-center">
              <div className="flex-1 max-w-[calc(10%+7.7rem)]"></div>
              <div className="flex-1 mr-4">
                <DeviceSearchField 
                  className="w-full"
                  placeholder="Find device by name, serial, or asset tag"
                  preloadedDevices={displayDevices}
                />
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-2">
              <DevicePageNavigation className="flex items-center gap-2" currentPage="dashboard" />
              
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
        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
          
          {/* Column A (30% width) - Status + Stats + Clients */}
          <div className="lg:col-span-3 space-y-8">
            {/* Device Status Widget - ORIGINAL DESIGN */}
            <ErrorBoundary fallback={<div className="p-4 bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">Error loading status chart</div>}>
              <StatusWidget devices={displayDevices} loading={false} />
            </ErrorBoundary>

            {/* Error and Warning Stats - ORIGINAL DESIGN */}
            <ErrorBoundary fallback={<div className="p-4 bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">Error loading stats</div>}>
              <div className="grid grid-cols-1 gap-4">
                <ErrorStatsWidget devices={displayDevices} />
                <WarningStatsWidget devices={displayDevices} />
              </div>
            </ErrorBoundary>

            {/* New Clients Widget - ORIGINAL DESIGN */}
            <ErrorBoundary fallback={<div className="p-4 bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">Error loading devices list</div>}>
              <NewClientsWidget devices={displayDevices} loading={false} />
            </ErrorBoundary>
          </div>

          {/* Column B (70% width) - Events + Charts */}
          <div className="lg:col-span-7 space-y-8">
            {/* Recent Events Table - Loads immediately */}
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

            {/* Platform Distribution - ORIGINAL DESIGN */}
            <ErrorBoundary fallback={<div className="p-4 bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">Error loading platform stats</div>}>
              <PlatformDistributionWidget devices={displayDevices as any} loading={false} />
            </ErrorBoundary>

            {/* OS Version Charts - ORIGINAL DESIGN */}
            <ErrorBoundary fallback={<div className="p-4 bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">Error loading OS stats</div>}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <OSVersionWidget devices={displayDevices} loading={false} osType="macOS" />
                <OSVersionWidget devices={displayDevices} loading={false} osType="Windows" />
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
"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import ErrorBoundary from "../../src/components/ErrorBoundary"
import { WarningStatsWidget, ErrorStatsWidget, InstallStatsData } from "../../src/lib/modules/widgets/DashboardStats"
import { RecentEventsTable } from "../../src/lib/modules/widgets/RecentEventsWidget"
import { NewClientsWidget } from "../../src/lib/modules/widgets/NewClientsWidget"
import { OSVersionPieWidget } from "../../src/components/widgets/OSVersionPieWidget"
import { StatusWidget } from "../../src/lib/modules/widgets/StatusWidget"
import { PlatformDistributionWidget } from "../../src/lib/modules/widgets/PlatformDistributionWidget"
import { DashboardSkeleton } from "../../src/components/skeleton/DashboardSkeleton"
import { calculateDeviceStatus } from "../../src/lib/data-processing"
import { preloadInstallsData } from "../../src/hooks/useInstallsData"
import { usePlatformFilterSafe, getDevicePlatform } from "../../src/providers/PlatformFilterProvider"

// WebPubSub message types for JSON subprotocol
interface WebPubSubMessage {
  type: "message" | "system" | "ack"
  from?: string
  group?: string
  data?: unknown
  dataType?: string
  event?: string
  connectionId?: string
  userId?: string
  message?: string
}

// FleetEvent interface for events from consolidated API
interface FleetEvent {
  id: string
  device: string
  deviceName?: string
  kind: string
  ts: string
  message?: string
  payload: Record<string, unknown>
  serialNumber?: string
}

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

export default function ClientDashboard() {
  // All data comes from consolidated /api/dashboard call
  // Eliminates separate events API call for faster load
  const [events, setEvents] = useState<FleetEvent[]>([])
  const [devices, setDevices] = useState<Device[]>([])
  const [devicesLoading, setDevicesLoading] = useState(true)
  const [, setTimeUpdateCounter] = useState(0)
  const [installStats, setInstallStats] = useState<InstallStatsData | null>(null)
  const [installStatsLoading, setInstallStatsLoading] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<string>("connecting")
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null)
  const [mounted, setMounted] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 })
  const [loadingMessage, setLoadingMessage] = useState<string>('')
  const _fetchAbortRef = useRef(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5
  const { platformFilter, isPlatformVisible } = usePlatformFilterSafe()
  
  // Filter devices by platform
  const filteredDevices = useMemo(() => {
    if (platformFilter === 'all') return devices
    return devices.filter(device => isPlatformVisible(getDevicePlatform(device)))
  }, [devices, platformFilter, isPlatformVisible])
  
  // Filter events by platform - only show events from devices that match the platform filter
  const filteredEvents = useMemo(() => {
    if (platformFilter === 'all') return events
    
    // Create a Set of serial numbers from filtered devices for fast lookup
    const visibleSerialNumbers = new Set(filteredDevices.map(d => d.serialNumber))
    
    // Filter events to only include those from visible devices
    return events.filter(event => visibleSerialNumbers.has(event.device))
  }, [events, filteredDevices, platformFilter])
  
  // Mark as mounted
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // Memoize device name map to avoid recalculating on every render
  const deviceNameMap = useMemo(() => {
    const nameMap: Record<string, string> = {}
    devices.forEach((device) => {
      // Only map entries with meaningful names (not Unknown or same as serial)
      const name = device.name
      const isMeaningful = name && name.toLowerCase() !== 'unknown' && name !== device.serialNumber
      if (device.serialNumber && isMeaningful) {
        nameMap[device.serialNumber] = name
      }
      if (device.deviceId && device.deviceId !== device.serialNumber && isMeaningful) {
        nameMap[device.deviceId] = name
      }
      if (device.assetTag && isMeaningful) {
        nameMap[device.assetTag] = name
      }
    })
    return nameMap
  }, [devices])
  
  // CONSOLIDATED API FETCH: Single /api/dashboard call for devices + installStats
  // Events come via SignalR WebSocket for real-time updates
  useEffect(() => {
    let aborted = false

    const fetchDashboardData = async (isInitialLoad = false) => {
      try {
        if (isInitialLoad) {
          setDevicesLoading(true)
          setInstallStatsLoading(true)
        }
        
        // Single consolidated API call
        const response = await fetch('/api/dashboard?eventsLimit=200', { cache: 'no-store' })

        if (!response.ok) {
          throw new Error(`Failed to load dashboard data: ${response.status}`)
        }

        const data = await response.json()
        
        // Process devices from consolidated response
        const rawDevices: any[] = Array.isArray(data?.devices) ? data.devices : []

        const transformedDevices: Device[] = rawDevices.map((apiDevice: any) => {
          const inventory = apiDevice.inventory || apiDevice.modules?.inventory || {}
          const systemOS = apiDevice.modules?.system?.operatingSystem || {}
          // NOTE: installs data is NOT included in dashboard response (too large ~26MB)
          // Error/warning counts come from pre-calculated installStats instead
          const deviceName = inventory.deviceName || apiDevice.name || apiDevice.deviceName
            || apiDevice.modules?.hardware?.system?.computer_name || apiDevice.modules?.hardware?.system?.hostname
            || apiDevice.serialNumber
          const assetTag = inventory.assetTag || apiDevice.assetTag
          
          // Platform is provided directly by FastAPI
          const platform = apiDevice.platform || (systemOS.name?.toLowerCase().includes('windows')
            ? 'Windows'
            : systemOS.name?.toLowerCase().includes('mac')
              ? 'macOS'
              : 'Unknown')
          
          // OS version string for display - used for compatibility with legacy components
          const osVersionString = systemOS.displayVersion || systemOS.version || apiDevice.osVersion || apiDevice.os || 'Unknown'
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
            os: osVersionString,
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
        
        // Set events from consolidated response (initial load or fallback)
        // Deduplicate events by ID before setting state
        if (isInitialLoad && data.events && Array.isArray(data.events)) {
          const seenIds = new Set<string>()
          const uniqueEvents = data.events.filter((event: FleetEvent) => {
            if (seenIds.has(event.id)) {
              return false // Skip duplicate
            }
            seenIds.add(event.id)
            return true
          })
          setEvents(uniqueEvents)
          setLoadingProgress({ current: uniqueEvents.length, total: uniqueEvents.length })
          setLoadingMessage('Events loaded')
        }
        
        setLastUpdateTime(new Date())
        
        // Prefetch installs data in background for faster navigation to /devices/installs
        // This starts loading the data that will be needed if user clicks on Errors/Warnings
        if (isInitialLoad) {
          preloadInstallsData()
        }
      } catch (error) {
        if (!aborted) {
          console.error('[DASHBOARD] Dashboard data fetch failed:', error)
          if (isInitialLoad) {
            setDevices([])
            setInstallStats(null)
            setEvents([])
          }
          setConnectionStatus('error')
        }
      } finally {
        if (!aborted && isInitialLoad) {
          setDevicesLoading(false)
          setInstallStatsLoading(false)
        }
      }
    }

    // Initial load
    fetchDashboardData(true)
    
    // Refresh devices/installStats every 30 seconds
    // Events come via SignalR WebSocket for real-time
    const interval = setInterval(() => fetchDashboardData(false), 30000)

    return () => {
      aborted = true
      clearInterval(interval)
    }
  }, [])

  // SignalR WebSocket connection for real-time events
  useEffect(() => {
    let isActive = true
    let reconnectTimeout: NodeJS.Timeout | null = null

    async function connectWebSocket() {
      if (!isActive) return

      try {
        // Check if WebPubSub is enabled
        const isEnabled = process.env.NEXT_PUBLIC_ENABLE_SIGNALR === "true"
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL

        if (!isEnabled || !apiBaseUrl) {
          setConnectionStatus('polling')
          return
        }

        setConnectionStatus('connecting')

        // Get negotiate token from API with timeout
        const negotiateResponse = await Promise.race([
          fetch(`${apiBaseUrl}/api/negotiate?device=dashboard`),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Negotiate timeout')), 10000)
          )
        ]) as Response

        if (!negotiateResponse.ok) {
          throw new Error(`Negotiate failed: ${negotiateResponse.status}`)
        }

        const negotiateData = await negotiateResponse.json()

        if (negotiateData.error || !negotiateData.url) {
          throw new Error(negotiateData.error || 'WebPubSub not available')
        }

        if (!isActive) return

        // Connect using native WebSocket with Azure Web PubSub JSON subprotocol
        const ws = new WebSocket(negotiateData.url, 'json.webpubsub.azure.v1')
        wsRef.current = ws

        ws.onopen = () => {
          if (!isActive) {
            ws.close()
            return
          }
          setConnectionStatus('connected')
          reconnectAttemptsRef.current = 0
          setLastUpdateTime(new Date())
        }

        ws.onmessage = (event) => {
          if (!isActive) return
          try {
            const message: WebPubSubMessage = JSON.parse(event.data)

            if (message.type === 'message') {
              const eventData = message.data as FleetEvent
              if (eventData && eventData.id) {
                setEvents(prev => {
                  // Avoid duplicates
                  const exists = prev.some(e => e.id === eventData.id)
                  if (exists) return prev
                  // Add new event at the beginning, keep last 50
                  return [eventData, ...prev].slice(0, 50)
                })
                setLastUpdateTime(new Date())
              }
            }
          } catch {
            // Silently ignore parse errors
          }
        }

        ws.onerror = () => {
          // Error handled in onclose
        }

        ws.onclose = () => {
          wsRef.current = null

          if (!isActive) return

          // Attempt reconnect with exponential backoff
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000)
            reconnectAttemptsRef.current++
            setConnectionStatus('reconnecting')
            reconnectTimeout = setTimeout(connectWebSocket, delay)
          } else {
            setConnectionStatus('polling')
          }
        }
      } catch {
        if (isActive) {
          setConnectionStatus('polling')
        }
      }
    }

    // Start WebSocket connection
    connectWebSocket()

    return () => {
      isActive = false

      // Cleanup WebSocket connection
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }

      // Cleanup reconnect timeout
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
        reconnectTimeout = null
      }
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black" suppressHydrationWarning>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Two-column layout: Column A (30%) + Column B (70%) */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
          {/* Column A (30% width) - Status Widget + Error/Warning Stats + New Clients Table */}
          <div className="lg:col-span-3 space-y-8">
            {/* Device Status Widget */}
            <ErrorBoundary fallback={<div className="p-4 bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">Error loading status chart</div>}>
              <StatusWidget devices={filteredDevices as any} loading={devicesLoading} />
            </ErrorBoundary>

            {/* Error and Warning Stats Cards - Side by Side (only show when viewing all platforms) */}
            {platformFilter === 'all' && (
              <ErrorBoundary fallback={<div className="p-4 bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">Error loading stats</div>}>
                <div className="grid grid-cols-2 gap-4">
                  <ErrorStatsWidget installStats={installStats} isLoading={installStatsLoading} />
                  <WarningStatsWidget installStats={installStats} isLoading={installStatsLoading} />
                </div>
              </ErrorBoundary>
            )}

            {/* New Clients Table */}
            <ErrorBoundary fallback={<div className="p-4 bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">Error loading devices list</div>}>
              <NewClientsWidget devices={filteredDevices as any} loading={devicesLoading} />
            </ErrorBoundary>
          </div>

          {/* Column B (70% width) - Recent Events + OS Version Charts */}
          <div className="lg:col-span-7 space-y-8">
            {/* Recent Events Table */}
            <ErrorBoundary fallback={<div className="p-4 bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">Error loading events</div>}>
              <RecentEventsTable
                events={filteredEvents}
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
              <PlatformDistributionWidget devices={filteredDevices as any} loading={devicesLoading} />
            </ErrorBoundary>

            {/* OS Version Tracking - Conditional display based on platform filter */}
            <ErrorBoundary fallback={<div className="p-4 bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">Error loading OS stats</div>}>
              {(() => {
                const showMac = platformFilter === 'all' || platformFilter === 'macOS'
                const showWin = platformFilter === 'all' || platformFilter === 'Windows'
                const gridCols = showMac && showWin ? 'lg:grid-cols-2' : 'lg:grid-cols-1'
                
                return (
                  <div className={`grid grid-cols-1 ${gridCols} gap-6`}>
                    {/* macOS Versions - only show when filtering macOS or all */}
                    {showMac && (
                      <OSVersionPieWidget devices={filteredDevices as any} loading={devicesLoading} osType="macOS" />
                    )}
                    
                    {/* Windows Versions - only show when filtering Windows or all */}
                    {showWin && (
                      <OSVersionPieWidget devices={filteredDevices as any} loading={devicesLoading} osType="Windows" />
                    )}
                  </div>
                )
              })()}
            </ErrorBoundary>
          </div>
        </div>
      </div>
      
      {/* Performance monitors disabled for memory optimization */}
    </div>
  )
}

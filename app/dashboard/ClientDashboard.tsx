"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import ErrorBoundary from "../../src/components/ErrorBoundary"
import type { InstallStatsData } from "../../src/lib/modules/widgets/DashboardStats"
import { RecentEventsTable } from "../../src/lib/modules/widgets/RecentEventsWidget"
import { NewClientsWidget } from "../../src/lib/modules/widgets/NewClientsWidget"
import { OSVersionPieWidget } from "../../src/components/widgets/OSVersionPieWidget"
import { StatusWidget } from "../../src/lib/modules/widgets/StatusWidget"
import { PlatformDistributionWidget } from "../../src/lib/modules/widgets/PlatformDistributionWidget"
import { AppUsageCard, CheckinGaps, InsightCardById, InstallHealthHero, ManagementToolLogs, useDashboardInsights, useInsightLayout, type InsightContext } from "../../src/lib/modules/widgets/InsightWidgets"
import { DashboardSkeleton } from "../../src/components/skeleton/DashboardSkeleton"
import { calculateDeviceStatus, type InventoryState } from "../../src/lib/data-processing"
import { usePlatformFilterSafe, getDevicePlatform } from "../../src/providers/PlatformFilterProvider"
import { cachedAt, peekCached, rememberCached, trackedFetch } from "../../src/lib/data-cache"
import type { InsightCardKey } from "../../src/lib/dashboard/insights"
import { RefreshErrorBanner } from "../../src/components/ui/RefreshErrorBanner"
import { SkeletonTimeout } from "@/src/components/ui/SkeletonTimeout"

/** The dashboard's own data, kept across navigation so a return renders instantly. */
const DASHBOARD_CACHE_KEY = "dashboard:view"
interface DashboardView {
  devices: Device[]
  events: FleetEvent[]
  installStats: InstallStatsData | null
}

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

// FleetEvent interface for events from /api/events
interface FleetEvent {
  id: string
  device: string
  deviceName?: string
  assetTag?: string
  platform?: string
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
  inventoryState?: InventoryState
}

/** Columns 2 and 3 (revisions 5 and 6). Narrower layouts keep this order. */
const COLUMN_2 = ["directoryServices", "userAccounts", "connectivityProblems", "protectionGaps", "expiringCertificates"] as const
const COLUMN_3_BEFORE_APP_USAGE = ["updateDebt", "storage"] as const
const COLUMN_3_AFTER_APP_USAGE = ["softwareRisk", "rebootDebt"] as const

export default function ClientDashboard() {
  // All data comes from consolidated /api/dashboard call
  // Eliminates separate events API call for faster load
  const [cachedView] = useState(() => peekCached<DashboardView>(DASHBOARD_CACHE_KEY))
  // A failed background refresh keeps the data on screen and shows a banner
  const [dashboardRefreshError, setDashboardRefreshError] = useState<string | null>(null)
  const [dashboardRetrying, setDashboardRetrying] = useState(false)
  const refreshDashboardRef = useRef<() => Promise<void>>(async () => {})
  const [events, setEvents] = useState<FleetEvent[]>(() => cachedView?.events ?? [])
  const [devices, setDevices] = useState<Device[]>(() => cachedView?.devices ?? [])
  const [devicesLoading, setDevicesLoading] = useState(!cachedView)
  const [, setTimeUpdateCounter] = useState(0)
  const [installStats, setInstallStats] = useState<InstallStatsData | null>(() => cachedView?.installStats ?? null)
  const [, setInstallStatsLoading] = useState(!cachedView)
  const [connectionStatus, setConnectionStatus] = useState<string>("connecting")
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null)
  const [mounted, setMounted] = useState(false)
  const [loadingProgress] = useState({ current: 0, total: 0 })
  const [loadingMessage] = useState<string>('')
  const _fetchAbortRef = useRef(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5
  const { platformFilter, isPlatformVisible } = usePlatformFilterSafe()
  const insights = useDashboardInsights(platformFilter)
  const layout = useInsightLayout()
  
  // Filter devices by platform
  const filteredDevices = useMemo(() => {
    if (platformFilter === 'all') return devices
    return devices.filter(device => isPlatformVisible(getDevicePlatform(device)))
  }, [devices, platformFilter, isPlatformVisible])
  
  // Filter events by platform using the event's own platform field (populated by /api/events)
  const filteredEvents = useMemo(() => {
    if (platformFilter === 'all') return events
    return events.filter(event => isPlatformVisible(event.platform || 'Unknown'))
  }, [events, platformFilter, isPlatformVisible])
  
  const insightCtx: InsightContext = useMemo(() => ({ insights, platformFilter }), [insights, platformFilter])

  // Keep the latest view for the next visit
  useEffect(() => {
    if (devicesLoading || devices.length === 0) return
    rememberCached<DashboardView>(DASHBOARD_CACHE_KEY, { devices, events, installStats })
  }, [devices, events, installStats, devicesLoading])

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
  

  // CONSOLIDATED API FETCH: Single /api/dashboard call for devices + installStats + events
  // Events use a per-type window function on the backend so all types are represented
  useEffect(() => {
    let aborted = false

    const fetchDashboardData = async (isInitialLoad = false) => {
      try {
        // A return visit already shows the cached view; this is a background refresh
        const hasCache = peekCached(DASHBOARD_CACHE_KEY) !== undefined
        if (isInitialLoad && !hasCache) {
          setDevicesLoading(true)
          setInstallStatsLoading(true)
        }
        
        // Single consolidated API call
        const response = await trackedFetch('/api/dashboard', { cache: 'no-store' }, { background: !isInitialLoad || hasCache })

        if (!response.ok) {
          throw new Error(`Failed to load dashboard data: ${response.status}`)
        }
        setDashboardRefreshError(null)

        const data = await response.json()
        
        // Process devices from consolidated response
        const rawDevices: any[] = Array.isArray(data?.devices) ? data.devices : []

        if (!isInitialLoad) {
          // Background refresh — guard against empty rawDevices clearing device state
          if (rawDevices.length > 0) {
            setDevices(prev => {
              if (prev.length === 0) return prev
              const lookup = new Map(rawDevices.map((d: any) => [d.serialNumber, d]))
              let changed = false
              const updated = prev.map(device => {
                const fresh = lookup.get(device.serialNumber)
                if (!fresh) return device
                const newStatus = calculateDeviceStatus(fresh.lastSeen, {}, false, fresh.inventoryState)
                if (device.lastSeen !== fresh.lastSeen || device.status !== newStatus) {
                  changed = true
                  return { ...device, lastSeen: fresh.lastSeen, status: newStatus }
                }
                return device
              })
              if (rawDevices.length !== prev.length) {
                changed = true
              }
              return changed ? updated : prev
            })
            if (data.installStats) {
              setInstallStats(data.installStats)
            }
          }
          // Merge new events from background refresh
          if (Array.isArray(data.events) && data.events.length > 0) {
            const freshEvents = data.events as FleetEvent[]
            setEvents(prev => {
              const existingIds = new Set(prev.map(e => e.id))
              const newEvents = freshEvents.filter(e => !existingIds.has(e.id))
              if (newEvents.length === 0) return prev
              return [...newEvents, ...prev]
                .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
                .slice(0, 1000)
            })
          }
          setLastUpdateTime(new Date())
          setConnectionStatus(prev => prev === 'error' ? 'polling' : prev)
          return
        }

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
          const calculatedStatus = calculateDeviceStatus(apiDevice.lastSeen, {}, false, apiDevice.inventoryState)

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
            inventoryState: apiDevice.inventoryState ?? undefined,
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

        // Set events from consolidated response (per-type diverse, pre-sorted by backend)
        if (Array.isArray(data.events) && data.events.length > 0) {
          setEvents(data.events as FleetEvent[])
        }
        
        setLastUpdateTime(new Date())
        
        // Recover from transient error state on successful fetch
        setConnectionStatus(prev => prev === 'error' ? 'polling' : prev)
        
        // No background prefetch of /api/v1/installs/filters here: that
        // response is ~27MB raw, and pulling plus parsing it on every
        // dashboard visit (with a 5-minute SWR refresh) starved the page
        // that was actually on screen. The /installs page fetches it when
        // it is opened.
      } catch (error) {
        if (!aborted) {
          console.error('[DASHBOARD] Dashboard data fetch failed:', error)
          if (isInitialLoad && peekCached(DASHBOARD_CACHE_KEY) === undefined) {
            setDevices([])
            setInstallStats(null)
            setConnectionStatus('error')
          } else {
            setDashboardRefreshError(error instanceof Error ? error.message : 'Refresh failed')
          }
          // Non-initial refresh failures are transient — don't change
          // connectionStatus since we still have valid data displaying
        }
      } finally {
        if (!aborted && isInitialLoad) {
          setDevicesLoading(false)
          setInstallStatsLoading(false)
        }
      }
    }

    refreshDashboardRef.current = () => fetchDashboardData(false)

    // Initial load
    fetchDashboardData(true)
    
    // Refresh devices + installStats + events every 30 seconds. This runs even
    // while the WebSocket is connected: the socket carries events only, whereas
    // this call is also the sole source of the device list and of the
    // pre-aggregated installStats behind the Errors/Warnings tiles. Skipping it
    // while connected froze those tiles against a live-updating event table.
    const interval = setInterval(() => {
      fetchDashboardData(false)
    }, 30000)

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
        // Opt out only by setting the flag to "false" explicitly. The previous
        // version required NEXT_PUBLIC_ENABLE_SIGNALR === "true", which tied the
        // live feed to a build arg on the deploy pipeline; when that arg was
        // dropped the feature went dark with no other signal.
        if (process.env.NEXT_PUBLIC_ENABLE_SIGNALR === "false") {
          setConnectionStatus('polling')
          return
        }

        setConnectionStatus('connecting')

        // Negotiate through the same-origin BFF proxy, never the public FastAPI
        // URL. Minting a live-stream token requires authentication, and only the
        // proxy holds the internal secret — the browser calling FastAPI directly
        // got a 401 every time, which is why this hub logged zero connections
        // for the whole time the feature was nominally enabled.
        const negotiateResponse = await Promise.race([
          fetch('/api/v1/negotiate?device=dashboard', { cache: 'no-store' }),
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
                  // Add new event at the beginning, keep last 300
                  return [eventData, ...prev].slice(0, 1000)
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
    return <SkeletonTimeout page><DashboardSkeleton /></SkeletonTimeout>
  }

  const appUsage = (
    <ErrorBoundary fallback={<div className="p-4 bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">Error loading app usage</div>}>
      <AppUsageCard platformFilter={platformFilter} />
    </ErrorBoundary>
  )
  /** Column 3's cards in order; App Usage spans `appUsageSpan` in a grid. */
  const column3Cards = (appUsageSpan = "") => (
    <>
      {COLUMN_3_BEFORE_APP_USAGE.map(id => <InsightCardById key={id} id={id} ctx={insightCtx} />)}
      <div className={appUsageSpan}>{appUsage}</div>
      {COLUMN_3_AFTER_APP_USAGE.map(id => <InsightCardById key={id} id={id} ctx={insightCtx} />)}
    </>
  )
  const newClients = (
    <ErrorBoundary fallback={<div className="p-4 bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">Error loading devices list</div>}>
      <NewClientsWidget devices={filteredDevices as any} loading={devicesLoading} />
    </ErrorBoundary>
  )

  const cards = (ids: readonly InsightCardKey[]) => ids.map(id => <InsightCardById key={id} id={id} ctx={insightCtx} />)
  const column1 = (
    <>
      {/* Device Status Widget */}
      <ErrorBoundary fallback={<div className="p-4 bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">Error loading status chart</div>}>
        <StatusWidget devices={filteredDevices as any} loading={devicesLoading} />
      </ErrorBoundary>

      {/* Install Health replaces the Errors and Warnings tiles */}
      <ErrorBoundary fallback={<div className="p-4 bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">Error loading install health</div>}>
        <InstallHealthHero ctx={insightCtx} />
      </ErrorBoundary>

      {/* Management Tools Logs, then Check-in Gaps at the foot of column 1 */}
      <ErrorBoundary fallback={<div className="p-4 bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">Error loading management tools logs</div>}>
        <ManagementToolLogs ctx={insightCtx} />
      </ErrorBoundary>
      <ErrorBoundary fallback={<div className="p-4 bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">Error loading check-in gaps</div>}>
        <CheckinGaps ctx={insightCtx} />
      </ErrorBoundary>
    </>
  )
  const column2Cards = (
    <>
      {newClients}
      {cards(COLUMN_2)}
    </>
  )
  const eventsColumn = (
    <>
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
          const gridCols = showMac && showWin && layout !== 'desktop' ? 'lg:grid-cols-2' : 'lg:grid-cols-1'
          
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
    </>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black" suppressHydrationWarning>
      <div className="page-container px-4 sm:px-6 lg:px-8 py-8">
        {(() => {
          // Keep the last good data on screen; say a refresh failed and when the data is from
          const insightsFailed = !!insights.data && !!insights.error
          const error = dashboardRefreshError || (insightsFailed ? insights.error : null)
          if (!error) return null
          const updatedAt = dashboardRefreshError
            ? (lastUpdateTime ?? cachedAt(DASHBOARD_CACHE_KEY))
            : insights.data?.generatedAt ? Date.parse(insights.data.generatedAt) : null
          return (
            <RefreshErrorBanner
              className="mb-6 w-fit"
              error={error}
              updatedAt={updatedAt}
              retrying={dashboardRetrying || insights.loading}
              onRetry={async () => {
                setDashboardRetrying(true)
                insights.refresh()
                try { await refreshDashboardRef.current() } finally { setDashboardRetrying(false) }
              }}
            />
          )
        })()}
        {/* Layout per docs/DASHBOARD-WIDGETS.md: independent column stacks at
            every width, never a grid row under the columns.
            Wide (>= 2200px): column 1 | column 2 | column 3 | events.
            Desktop (>= 1680px): column 1 + Uptime Overview | column 2 + App
            Usage | events + Update Debt, Storage, Software Risk.
            Laptop: column 1 + column 3 without App Usage | events + App Usage
            + column 2 (2fr / 3fr), one stack after the other below the lg
            breakpoint. Balanced by measured card heights. */}
        {layout === "wide" && (
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)] gap-8 items-start">
            <div className="space-y-8">{column1}</div>
            <div className="space-y-8">{column2Cards}</div>
            <div className="space-y-8">{column3Cards()}</div>
            <div className="space-y-8">{eventsColumn}</div>
          </div>
        )}
        {layout === "desktop" && (
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)] gap-8 items-start">
            <div className="space-y-8">
              {column1}
              {cards(["rebootDebt"])}
            </div>
            <div className="space-y-8">
              {column2Cards}
              {appUsage}
            </div>
            <div className="space-y-8">
              {eventsColumn}
              {cards(["updateDebt", "storage", "softwareRisk"])}
            </div>
          </div>
        )}
        {layout === "narrow" && (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-8 items-start">
            <div className="space-y-8">
              {column1}
              {cards(["updateDebt", "storage", "softwareRisk", "rebootDebt"])}
            </div>
            <div className="space-y-8">
              {eventsColumn}
              {appUsage}
              {column2Cards}
            </div>
          </div>
        )}
      </div>
      
      {/* Performance monitors disabled for memory optimization */}
    </div>
  )
}

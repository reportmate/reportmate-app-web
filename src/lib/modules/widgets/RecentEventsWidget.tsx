/**
 * Recent Events Table
 * Displays live event feed with real-time updates and intelligent event bundling
 */

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { formatRelativeTime } from '../../time'

interface FleetEvent {
  id: string
  device: string
  kind: string
  ts: string
  message?: string // User-friendly message from database
  payload: Record<string, unknown> | string
}

interface BundledEvent {
  id: string
  device: string
  kind: string
  ts: string
  message: string
  count: number
  eventIds: string[]
  isBundle: boolean
  bundledKinds: string[]
}

interface RecentEventsTableProps {
  events: FleetEvent[]
  connectionStatus: string
  lastUpdateTime: Date | null
  mounted: boolean
  deviceNameMap: Record<string, string>
  isLoading?: boolean
}

// Helper function to bundle related events intelligently
const bundleEvents = (events: FleetEvent[]): BundledEvent[] => {
  if (!events.length) return []

  // Sort events by timestamp (newest first)
  const sortedEvents = [...events].sort((a, b) => 
    new Date(b.ts).getTime() - new Date(a.ts).getTime()
  )

  const bundled: BundledEvent[] = []
  const processed = new Set<string>()

  for (const event of sortedEvents) {
    if (processed.has(event.id)) continue

    // Find other events from the same device within 2 minutes that should be bundled
    const bundleTimeWindow = 2 * 60 * 1000 // 2 minutes in ms
    const eventTime = new Date(event.ts).getTime()
    
    const relatedEvents = sortedEvents.filter(other => 
      !processed.has(other.id) &&
      other.device === event.device &&
      Math.abs(new Date(other.ts).getTime() - eventTime) <= bundleTimeWindow &&
      shouldBundleTogether(event, other)
    )

    // If we found related events, create a bundle
    if (relatedEvents.length > 1) {
      const bundleKinds = [...new Set(relatedEvents.map(e => e.kind))]
      const primaryKind = getBundlePrimaryKind(bundleKinds)
      
      // Mark all related events as processed
      relatedEvents.forEach(e => processed.add(e.id))

      bundled.push({
        id: `bundle-${event.device}-${eventTime}`,
        device: event.device,
        kind: primaryKind,
        ts: event.ts, // Use the primary event's timestamp
        message: createBundleMessage(relatedEvents, bundleKinds),
        count: relatedEvents.length,
        eventIds: relatedEvents.map(e => e.id),
        isBundle: true,
        bundledKinds: bundleKinds
      })
    } else {
      // Single event, add as-is
      processed.add(event.id)
      bundled.push({
        id: event.id,
        device: event.device,
        kind: event.kind,
        ts: event.ts,
        message: event.message || formatPayloadPreview(event.payload),
        count: 1,
        eventIds: [event.id],
        isBundle: false,
        bundledKinds: [event.kind]
      })
    }
  }

  return bundled.slice(0, 50) // Limit to 50 items
}

// Determine if two events should be bundled together
const shouldBundleTogether = (event1: FleetEvent, event2: FleetEvent): boolean => {
  // Same device is required (already checked in caller)
  
  // Bundle events of the same type (info + info, error + error, etc.)
  if (event1.kind === event2.kind) return true
  
  // Bundle success/info events together (data collection events)
  const dataCollectionTypes = new Set(['success', 'info', 'system'])
  if (dataCollectionTypes.has(event1.kind) && dataCollectionTypes.has(event2.kind)) {
    return true
  }
  
  // Don't bundle errors or warnings with other types
  if (['error', 'warning'].includes(event1.kind) || ['error', 'warning'].includes(event2.kind)) {
    return event1.kind === event2.kind
  }
  
  return false
}

// Get the primary kind for a bundle (errors and warnings take precedence)
const getBundlePrimaryKind = (kinds: string[]): string => {
  if (kinds.includes('error')) return 'error'
  if (kinds.includes('warning')) return 'warning'
  if (kinds.includes('success')) return 'success'
  return kinds[0] || 'info'
}

// Create a smart message for bundled events
const createBundleMessage = (events: FleetEvent[], kinds: string[]): string => {
  const kindCounts = kinds.reduce((acc, kind) => {
    acc[kind] = (acc[kind] || 0) + events.filter(e => e.kind === kind).length
    return acc
  }, {} as Record<string, number>)

  // Check if these are module data collection events
  const moduleEvents = events.filter(event => {
    const message = event.message || formatPayloadPreview(event.payload)
    return message.includes('module reported data') || message.includes('modules reported data')
  })

  if (moduleEvents.length === events.length) {
    // All events are module data collection - create a smart summary
    const moduleNames = new Set<string>()
    
    events.forEach(event => {
      const message = event.message || formatPayloadPreview(event.payload)
      // Extract module names from messages like "Hardware module reported data"
      const matches = message.match(/^(\w+) module reported data$/i)
      if (matches) {
        moduleNames.add(matches[1])
      }
    })
    
    const moduleArray = Array.from(moduleNames)
    if (moduleArray.length === 1) {
      return `${moduleArray[0]} module data collection`
    } else if (moduleArray.length <= 3) {
      return `${moduleArray.join(', ')} modules data collection`
    } else {
      return `${moduleArray.length} modules data collection completed`
    }
  }

  // For mixed event types, create a summary
  const parts: string[] = []
  
  if (kindCounts.error) {
    parts.push(`${kindCounts.error} error${kindCounts.error > 1 ? 's' : ''}`)
  }
  if (kindCounts.warning) {
    parts.push(`${kindCounts.warning} warning${kindCounts.warning > 1 ? 's' : ''}`)
  }
  if (kindCounts.success) {
    parts.push(`${kindCounts.success} success event${kindCounts.success > 1 ? 's' : ''}`)
  }
  if (kindCounts.info || kindCounts.system) {
    const infoCount = (kindCounts.info || 0) + (kindCounts.system || 0)
    parts.push(`${infoCount} info event${infoCount > 1 ? 's' : ''}`)
  }

  return parts.length > 0 ? parts.join(', ') : `${events.length} events occurred`
}

// Helper function to get event status configuration
const getStatusConfig = (kind: string) => {
  switch (kind.toLowerCase()) {
    case 'error': 
      return { bg: 'bg-red-400', text: 'text-red-600 dark:text-red-200', badge: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200' }
    case 'warning': 
      return { bg: 'bg-yellow-500', text: 'text-yellow-700 dark:text-yellow-300', badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' }
    case 'success': 
      return { bg: 'bg-green-500', text: 'text-green-700 dark:text-green-300', badge: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' }
    case 'info': 
      return { bg: 'bg-blue-500', text: 'text-blue-700 dark:text-blue-300', badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' }
    default: 
      return { bg: 'bg-gray-500', text: 'text-gray-700 dark:text-gray-300', badge: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' }
  }
}

// Helper function to safely display payload - enhanced for ReportMate events
const formatPayloadPreview = (payload: Record<string, unknown> | string) => {
  try {
    if (!payload) return 'No payload'
    
    // Handle string payloads directly
    if (typeof payload === 'string') {
      return payload.length > 120 ? payload.substring(0, 120) + '...' : payload
    }
    
    if (typeof payload !== 'object') {
      return String(payload).substring(0, 80)
    }

    const payloadObj = payload as any

    // **PRIORITY 1: Look for direct message field (ReportMate events)**
    if (payloadObj.message && typeof payloadObj.message === 'string') {
      const message = payloadObj.message
      return message.length > 120 ? message.substring(0, 120) + '...' : message
    }

    // **PRIORITY 2: Look for summary field (API summaries)**
    if (payloadObj.summary && typeof payloadObj.summary === 'string') {
      return payloadObj.summary
    }

    // **PRIORITY 3: Handle modules_processed structure (data collection events)**
    if (payloadObj.modules_processed && typeof payloadObj.modules_processed === 'number') {
      const moduleCount = payloadObj.modules_processed
      const enabledModules = payloadObj.enabled_modules
      
      if (Array.isArray(enabledModules) && enabledModules.length > 0) {
        if (moduleCount === 1) {
          const capitalizedModule = enabledModules[0].charAt(0).toUpperCase() + enabledModules[0].slice(1)
          return `${capitalizedModule} module reported data`
        } else if (moduleCount <= 3) {
          const capitalizedModules = enabledModules.slice(0, moduleCount).map(module => 
            module.charAt(0).toUpperCase() + module.slice(1)
          )
          return `${capitalizedModules.join(', ')} modules reported data`
        } else {
          return `All ${moduleCount} modules reported data`
        }
      }
      
      return `${moduleCount} modules reported data`
    }

    // **PRIORITY 4: Handle moduleCount structure (older format)**
    if (payloadObj.moduleCount && payloadObj.modules && Array.isArray(payloadObj.modules)) {
      const moduleCount = payloadObj.moduleCount
      const modules = payloadObj.modules
      if (moduleCount === 1) {
        return `${modules[0].charAt(0).toUpperCase() + modules[0].slice(1)} module reported data`
      } else if (moduleCount <= 3) {
        const capitalizedModules = modules.map((module: string) => 
          module.charAt(0).toUpperCase() + module.slice(1)
        )
        return `${capitalizedModules.join(', ')} modules reported data`
      } else {
        return `All modules reported data`
      }
    }

    // **PRIORITY 5: Handle full device report structure**
    if (payloadObj.modules && typeof payloadObj.modules === 'object') {
      const moduleNames = Object.keys(payloadObj.modules)
      const moduleCount = moduleNames.length
      
      if (moduleCount === 1) {
        return `${moduleNames[0].charAt(0).toUpperCase() + moduleNames[0].slice(1)} module reported data`
      } else if (moduleCount <= 3) {
        const capitalizedModules = moduleNames.map(module => 
          module.charAt(0).toUpperCase() + module.slice(1)
        )
        return `${capitalizedModules.join(', ')} modules reported data`
      } else {
        return `All modules reported data`
      }
    }

    // **PRIORITY 6: Handle sanitized payload summaries**
    if (payloadObj.message && payloadObj.dataSize && payloadObj.truncated) {
      // This is a sanitized large payload
      if (payloadObj.keys && Array.isArray(payloadObj.keys)) {
        const keys = payloadObj.keys
        if (keys.includes('modules') || keys.includes('device_name') || keys.includes('client_version')) {
          return 'System data collection completed'
        }
      }
      return 'Data collection completed'
    }

    // **PRIORITY 7: Look for other common message fields**
    if (payloadObj.description) {
      return String(payloadObj.description).substring(0, 120)
    }
    if (payloadObj.title) {
      return String(payloadObj.title).substring(0, 120)
    }
    if (payloadObj.event_message) {
      return String(payloadObj.event_message).substring(0, 120)
    }

    // **FALLBACK: Create a descriptive summary**
    const keys = Object.keys(payloadObj)
    if (keys.length === 0) return 'Empty event data'
    
    // Check for known patterns in key names
    if (keys.some(k => k.includes('module') || k.includes('install') || k.includes('system'))) {
      return 'System event occurred'
    }
    
    if (keys.length === 1) {
      const key = keys[0]
      const value = payloadObj[key]
      if (typeof value === 'string' && value.length < 50) {
        return `${key}: ${value}`
      } else if (typeof value === 'number') {
        return `${key}: ${value}`
      }
    }
    
    // Last resort - show key count but make it more user-friendly
    if (keys.length <= 3) {
      return `Event with ${keys.join(', ')} data`
    } else {
      return `Complex event (${keys.length} data fields)`
    }
    
  } catch (_error) {
    return 'Event data (parsing error)'
  }
}

// Helper function to get device display name
const getDeviceName = (deviceId: string, deviceNameMap: Record<string, string>) => {
  // Enhanced device name resolution with multiple fallback strategies
  
  // First, try the device name map (preferred)
  if (deviceNameMap[deviceId]) {
    return deviceNameMap[deviceId]
  }
  
  // Check if deviceId looks like a serial number pattern and try to find a friendly name
  // Serial numbers are usually short alphanumeric strings
  if (deviceId && deviceId.length < 50 && !deviceId.includes('-')) {
    // Look through the map to see if this serial has a mapped name
    const mappedName = Object.entries(deviceNameMap).find(([key, value]) => 
      key === deviceId || key.includes(deviceId)
    )?.[1]
    if (mappedName) {
      return mappedName
    }
  }
  
  // Check if deviceId is a UUID format and try to find corresponding name
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (uuidPattern.test(deviceId)) {
    // Look for any mapped name that corresponds to this UUID
    const correspondingName = Object.values(deviceNameMap).find(name => name && name !== deviceId)
    if (correspondingName) {
      return correspondingName
    }
  }
  
  // If deviceId looks like an asset tag (short, alphanumeric), show it nicely
  if (deviceId && deviceId.length <= 10 && /^[A-Z0-9]+$/i.test(deviceId)) {
    return `Asset ${deviceId}` // e.g., "Asset A004733"
  }
  
  // Final fallback - return the deviceId but truncate if it's too long (UUID case)
  if (deviceId && deviceId.length > 20) {
    return `Device ${deviceId.substring(0, 8)}...` // e.g., "Device 79349310..."
  }
  
  return deviceId || 'Unknown Device'
}

export const RecentEventsTable: React.FC<RecentEventsTableProps> = ({ 
  events, 
  connectionStatus, 
  lastUpdateTime, 
  mounted, 
  deviceNameMap,
  isLoading = false
}) => {
  const [isHovered, setIsHovered] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  // Bundle related events intelligently
  const bundledEvents = useMemo(() => bundleEvents(events), [events])

  const handleMouseEnter = () => {
    setIsHovered(true)
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    // Set 1-second delay for tooltip
    timeoutRef.current = setTimeout(() => {
      setShowTooltip(true)
    }, 1000)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    setShowTooltip(false)
    // Clear timeout if user leaves before tooltip shows
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  // Enhanced connection status with tooltips
  const getConnectionStatusWithTooltip = (connectionStatus: string) => {
    switch (connectionStatus) {
      case 'connected':
        return { 
          text: 'Live', 
          color: 'text-green-600 dark:text-green-400', 
          dot: 'bg-green-500',
          show: true,
          tooltip: 'Real-time connection is active and working'
        }
      case 'polling':
        return { 
          text: 'Polling', 
          color: 'text-green-600 dark:text-green-400', 
          dot: 'bg-green-500',
          show: true,
          tooltip: 'HTTP polling /api/events every 5 seconds'
        }
      case 'connecting':
      case 'reconnecting':
        // Don't show "Connecting" pill since top of page already has one
        return { 
          text: 'Connecting', 
          color: 'text-yellow-600 dark:text-yellow-400', 
          dot: 'bg-yellow-500',
          show: false,  // Hide this status as requested by user
          tooltip: 'Real-time connection handshake in progress'
        }
      case 'error':
      case 'disconnected':
      default:
        return { 
          text: 'Offline', 
          color: 'text-red-600 dark:text-red-400', 
          dot: 'bg-red-500',
          show: true,
          tooltip: 'Connection failed, events may be delayed'
        }
    }
  }

  const status = getConnectionStatusWithTooltip(connectionStatus)

  const _getEventIcon = (kind: string) => {
    switch (kind.toLowerCase()) {
      case 'error':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        )
      case 'warning':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        )
      case 'success':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )
      default:
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        )
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden h-[632px] flex flex-col">
      <Link
        href="/events"
        className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 block hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Events
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Live activity from fleet
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Connection Status with expansion and tooltip */}
            {status.show && (
              <div className="relative">
                <div 
                  className={`flex items-center h-6 rounded-full bg-gray-100 dark:bg-gray-700 transition-all duration-300 ease-in-out ${
                    isHovered ? 'px-3 justify-start' : 'w-6 justify-center'
                  }`}
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                >
                  <div className={`w-2 h-2 rounded-full ${status.dot} flex-shrink-0`}></div>
                  <div className={`transition-all duration-300 ease-in-out ${
                    isHovered ? 'opacity-100 w-auto ml-2' : 'opacity-0 w-0 ml-0'
                  }`}>
                    <span className={`text-sm font-medium ${status.color} whitespace-nowrap`}>
                      {status.text}
                    </span>
                  </div>
                </div>
                
                {/* Custom Tooltip */}
                {showTooltip && (
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white dark:text-gray-100 text-sm font-medium rounded-lg shadow-lg whitespace-nowrap z-50 border border-gray-700 dark:border-gray-600">
                    {status.tooltip}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900 dark:border-b-gray-700"></div>
                  </div>
                )}
              </div>
            )}
            {mounted && lastUpdateTime && (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Last update: {formatRelativeTime(lastUpdateTime.toISOString())}
              </div>
            )}
          </div>
        </div>
      </Link>
      
      {events.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            {isLoading || connectionStatus === 'connecting' || connectionStatus === 'reconnecting' ? (
              // Loading state
              <>
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Loading events...
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Connecting to the event stream to retrieve latest activity.
                </p>
              </>
            ) : (
              // No events state
              <>
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
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          {isLoading || connectionStatus === 'connecting' || connectionStatus === 'reconnecting' ? (
            // Loading skeleton
            <div className="overflow-x-auto overlay-scrollbar h-full">
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
              <div className="overflow-y-auto overlay-scrollbar" style={{ height: 'calc(100% - 48px)' }}>
                <table className="w-full table-fixed min-w-full">
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {[...Array(8)].map((_, index) => (
                      <tr key={index} className="animate-pulse">
                        <td className="w-20 px-3 py-2.5">
                          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-12"></div>
                        </td>
                        <td className="w-56 px-3 py-2.5">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                        </td>
                        <td className="px-3 py-2.5 hidden md:table-cell">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
                        </td>
                        <td className="w-44 px-3 py-2.5">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            // Bundled events table
            <div className="overflow-x-auto overlay-scrollbar h-full">
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
              <div className="overflow-y-auto overlay-scrollbar" style={{ height: 'calc(100% - 48px)' }}>
                <table className="w-full table-fixed min-w-full">
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {bundledEvents.map((bundledEvent: BundledEvent) => {
                      const statusConfig = getStatusConfig(bundledEvent.kind)
                      return (
                        <tr 
                          key={bundledEvent.id} 
                          className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <td className="w-20 px-3 py-2.5">
                            <div className="flex items-center gap-1">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusConfig.badge}`}>
                                {bundledEvent.kind === 'system' ? 'info' : bundledEvent.kind}
                              </span>
                            </div>
                          </td>
                          <td className="w-56 px-3 py-2.5">
                            <Link
                              href={`/device/${encodeURIComponent(bundledEvent.device)}`}
                              className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors block truncate"
                            >
                              {getDeviceName(bundledEvent.device, deviceNameMap)}
                            </Link>
                          </td>
                          <td className="px-3 py-2.5 hidden md:table-cell">
                            <div className="text-sm text-gray-900 dark:text-white truncate">
                              {bundledEvent.message}
                              {bundledEvent.isBundle && bundledEvent.bundledKinds.length > 1 && (
                                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                  ({bundledEvent.bundledKinds.join(', ')})
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="w-44 px-3 py-2.5">
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              <div className="font-medium truncate">
                                {formatRelativeTime(bundledEvent.ts)}
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
          )}
        </div>
      )}
    </div>
  )
}

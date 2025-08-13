/**
 * Recent Events Table
 * Displays live event feed with real-time updates and intelligent event bundling
 */

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { formatRelativeTime } from '../../time'
import { bundleEvents, formatPayloadPreview, type FleetEvent, type BundledEvent } from '../../eventBundling'

interface RecentEventsTableProps {
  events: FleetEvent[]
  connectionStatus: string
  lastUpdateTime: Date | null
  mounted: boolean
  deviceNameMap: Record<string, string>
  isLoading?: boolean
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

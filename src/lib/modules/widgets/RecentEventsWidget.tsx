/**
 * Recent Events Widget
 * Displays live event feed with real-time updates
 */

import React from 'react'
import Link from 'next/link'
import { formatRelativeTime } from '../../time'

interface FleetEvent {
  id: string
  device: string
  kind: string
  ts: string
  payload: Record<string, unknown> | string
}

interface RecentEventsWidgetProps {
  events: FleetEvent[]
  connectionStatus: string
  lastUpdateTime: Date | null
  mounted: boolean
  deviceNameMap: Record<string, string>
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

// Helper function to get connection status configuration
const getConnectionStatus = (connectionStatus: string) => {
  switch (connectionStatus) {
    case 'connected':
      return { 
        text: 'Live', 
        color: 'text-green-600 dark:text-green-400', 
        dot: 'bg-green-500',
        show: true
      }
    case 'polling':
      return { 
        text: 'Polling', 
        color: 'text-blue-600 dark:text-blue-400', 
        dot: 'bg-blue-500',
        show: true
      }
    case 'connecting':
    case 'reconnecting':
      // Don't show "Connecting" pill since top of page already has one
      return { 
        text: 'Connecting', 
        color: 'text-yellow-600 dark:text-yellow-400', 
        dot: 'bg-yellow-500',
        show: false  // Hide this status as requested by user
      }
    case 'error':
    case 'disconnected':
    default:
      return { 
        text: 'Offline', 
        color: 'text-red-600 dark:text-red-400', 
        dot: 'bg-red-500',
        show: true
      }
  }
}

export const RecentEventsWidget: React.FC<RecentEventsWidgetProps> = ({ 
  events, 
  connectionStatus, 
  lastUpdateTime, 
  mounted, 
  deviceNameMap 
}) => {
  const status = getConnectionStatus(connectionStatus)

  const getDeviceName = (deviceId: string) => {
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

  // Helper function to safely display payload - enhanced with device name logic
  const formatPayloadPreview = (payload: Record<string, unknown> | string) => {
    try {
      if (!payload) return 'No payload'
      
      // Handle summarized payloads (from our new API structure)
      if (typeof payload === 'object' && payload.summary) {
        return payload.summary
      }
      
      // Handle message-based payloads
      if (typeof payload === 'object' && (payload as any).message) {
        return (payload as any).message
      }
      
      // Handle module count payloads
      if (typeof payload === 'object' && (payload as any).moduleCount && (payload as any).modules) {
        const moduleCount = (payload as any).moduleCount
        const modules = (payload as any).modules
        if (moduleCount === 1) {
          return `${modules[0]} data reported`
        } else if (moduleCount <= 3) {
          return `${modules.join(', ')} data reported`
        } else {
          return `All modules reported`
        }
      }
      
      // Handle string payloads
      if (typeof payload === 'string') {
        return payload.length > 80 ? payload.substring(0, 80) + '...' : payload
      }
      
      // For other objects, try to find a meaningful representation
      if (typeof payload === 'object') {
        // Check if this is a full device report (contains multiple modules)
        if ((payload as any).modules && typeof (payload as any).modules === 'object') {
          const moduleCount = Object.keys((payload as any).modules).length
          const moduleNames = Object.keys((payload as any).modules).slice(0, 3)
          
          if (moduleCount > 3) {
            return `All modules reported`
          } else {
            return `${moduleNames.join(', ')} data reported`
          }
        }
        
        // Check for new structure with modules_processed
        if ((payload as any).modules_processed && typeof (payload as any).modules_processed === 'number') {
          const modulesProcessed = (payload as any).modules_processed
          if (modulesProcessed === 1) {
            return `Single module reported`
          } else if (modulesProcessed <= 3) {
            return `${modulesProcessed} modules reported`
          } else {
            return `All modules reported`
          }
        }
        
        // Check for common event types
        if ((payload as any).component || (payload as any).moduleType || (payload as any).clientVersion) {
          const parts = []
          if ((payload as any).message) parts.push((payload as any).message)
          
          const summary = parts.join(' • ')
          return summary.length > 80 ? summary.substring(0, 80) + '...' : summary || 'Info event'
        }
        
        // Check if it's a large data payload summary (from sanitization)
        if ((payload as any).message && (payload as any).dataSize && (payload as any).truncated) {
          // This is a sanitized large payload, try to create a better summary
          if ((payload as any).keys && Array.isArray((payload as any).keys)) {
            const keys = (payload as any).keys
            if (keys.includes('modules') || keys.includes('device_name') || keys.includes('client_version')) {
              return 'All modules reported'
            }
          }
          return 'Data collection completed'
        }
        
        // Fallback for complex objects
        const keys = Object.keys(payload)
        if (keys.length === 0) return 'Empty payload'
        if (keys.length > 3) {
          return `Data collection completed`
        }
        
        // Try to stringify, but with strict size limit
        const stringified = JSON.stringify(payload)
        if (stringified.length > 80) {
          return `Data collection completed`
        }
        return stringified.substring(0, 80)
      }
      
      return String(payload).substring(0, 80)
    } catch (_error) {
      return 'Complex payload'
    }
  }

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
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
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
                  {events.slice(0, 50).map((event) => {
                    const statusConfig = getStatusConfig(event.kind)
                    return (
                      <tr 
                        key={event.id} 
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <td className="w-20 px-3 py-2.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusConfig.badge}`}>
                            {event.kind === 'system' ? 'info' : event.kind}
                          </span>
                        </td>
                        <td className="w-56 px-3 py-2.5">
                          <Link
                            href={`/device/${encodeURIComponent(event.device)}`}
                            className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors block truncate"
                          >
                            {getDeviceName(event.device)}
                          </Link>
                        </td>
                        <td className="px-3 py-2.5 hidden md:table-cell">
                          <div className="text-sm text-gray-900 dark:text-white truncate">
                            {formatPayloadPreview(event.payload)}
                          </div>
                        </td>
                        <td className="w-44 px-3 py-2.5">
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            <div className="font-medium truncate">
                              {formatRelativeTime(event.ts)}
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
        </div>
      )}
    </div>
  )
}

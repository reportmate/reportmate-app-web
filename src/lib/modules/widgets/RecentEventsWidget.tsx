/**
 * Recent Events Widget
 * Displays live event feed with real-time updates
 */

import React from 'react'
import Link from 'next/link'
import { formatRelativeTime, formatExactTime } from '../../time'

interface FleetEvent {
  id: string
  device: string
  kind: string
  ts: string
  payload: Record<string, unknown>
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
    case 'system': 
      return { bg: 'bg-purple-500', text: 'text-purple-700 dark:text-purple-300', badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' }
    default: 
      return { bg: 'bg-gray-500', text: 'text-gray-700 dark:text-gray-300', badge: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' }
  }
}

const getConnectionStatus = (connectionStatus: string) => {
  switch (connectionStatus) {
    case 'connected':
      return { text: 'Live', color: 'text-green-600 dark:text-green-400', dot: 'bg-green-500' }
    case 'connecting':
      return { text: 'Connecting', color: 'text-yellow-600 dark:text-yellow-400', dot: 'bg-yellow-500' }
    case 'polling':
      return { text: 'Polling', color: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' }
    default:
      return { text: 'Offline', color: 'text-red-500 dark:text-red-300', dot: 'bg-red-400' }
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
    return deviceNameMap[deviceId] || deviceId
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden h-[600px] flex flex-col">
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
              Live activity from your fleet
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Connection status */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700">
              <div className={`w-2 h-2 rounded-full ${status.dot} animate-pulse`}></div>
              <span className={`text-sm font-medium ${status.color}`}>
                {status.text}
              </span>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Last update: {mounted && lastUpdateTime ? formatRelativeTime(lastUpdateTime.toISOString()) : 'Loading...'}
            </div>
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
          <div className="overflow-x-auto hide-scrollbar h-full">
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
            <div className="overflow-y-auto hide-scrollbar" style={{ height: 'calc(100% - 48px)' }}>
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
                            {event.kind}
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
                            {typeof event.payload === 'object' && event.payload !== null ? 
                              (event.payload as any).message || JSON.stringify(event.payload) : 
                              String(event.payload)}
                          </div>
                        </td>
                        <td className="w-44 px-3 py-2.5">
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            <div className="font-medium truncate">
                              {formatRelativeTime(event.ts)}
                            </div>
                            <div className="text-xs opacity-75 truncate" title={formatExactTime(event.ts)}>
                              {formatExactTime(event.ts)}
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

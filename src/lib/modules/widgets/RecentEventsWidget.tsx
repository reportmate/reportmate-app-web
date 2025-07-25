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

  const formatPayloadPreview = (payload: Record<string, unknown> | string) => {
    try {
      if (typeof payload === 'string') {
        return payload.length > 100 ? payload.substring(0, 100) + '...' : payload
      }
      
      if (payload && typeof payload === 'object') {
        // Show key information from payload
        const entries = Object.entries(payload).slice(0, 3)
        if (entries.length === 0) return 'Empty payload'
        
        return entries.map(([key, value]) => {
          const valueStr = String(value)
          const truncatedValue = valueStr.length > 30 ? valueStr.substring(0, 30) + '...' : valueStr
          return `${key}: ${truncatedValue}`
        }).join(', ')
      }
      
      return 'No payload data'
    } catch (error) {
      return 'Invalid payload data'
    }
  }

  const getEventIcon = (kind: string) => {
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
      case 'system':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
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
                            {(() => {
                              try {
                                if (!event.payload) return 'No payload'
                                if (typeof event.payload === 'string') {
                                  const str = event.payload
                                  return str.substring(0, 80) + (str.length > 80 ? '...' : '')
                                }
                                if (typeof event.payload !== 'object') return String(event.payload).substring(0, 80)
                                
                                // Check if payload has a message property
                                if ((event.payload as any).message) return String((event.payload as any).message).substring(0, 80)
                                
                                // For objects, show a safe summary instead of stringifying
                                const keys = Object.keys(event.payload)
                                if (keys.length === 0) return 'Empty payload'
                                if (keys.length > 3) {
                                  return `Large object (${keys.length} fields): ${keys.slice(0, 2).join(', ')}...`
                                }
                                
                                // For very small objects, try to show them
                                const str = JSON.stringify(event.payload)
                                if (str.length > 80) {
                                  return `Data (${str.length} chars): ${keys.slice(0, 2).join(', ')}`
                                }
                                return str.substring(0, 80)
                              } catch (error) {
                                return 'Complex payload'
                              }
                            })()}
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

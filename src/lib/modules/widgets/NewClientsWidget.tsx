/**
 * New Clients Widget
 * Displays recently discovered devices
 */

import React from 'react'
import Link from 'next/link'
import { formatRelativeTime } from '../../time'

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

interface NewClientsWidgetProps {
  devices: Device[]
  loading: boolean
}

export const NewClientsWidget: React.FC<NewClientsWidgetProps> = ({ devices, loading }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500'
      case 'warning': return 'bg-yellow-500'
      case 'error': return 'bg-red-400'
      default: return 'bg-gray-500'
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden h-[600px] flex flex-col">
      <Link
        href="/devices"
        className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 block hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              New Clients
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Recently discovered devices
            </p>
          </div>
          <div className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </Link>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-6 h-6 mx-auto mb-2 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Loading devices...</p>
          </div>
        </div>
      ) : devices.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
              No devices found
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Devices will appear here when they report in
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto hide-scrollbar">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {devices.slice(0, 8).map((device) => (
              <Link
                key={device.id}
                href={`/device/${device.id}`}
                className="block p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(device.status)} flex-shrink-0`}></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {device.name}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                      {device.model}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {formatRelativeTime(device.lastSeen)}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

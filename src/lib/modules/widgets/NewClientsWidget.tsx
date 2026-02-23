/**
 * New Clients Widget
 * Displays recently discovered devices - simplified version
 */

import React from 'react'
import Link from 'next/link'
import { formatRelativeTime } from '../../time'

interface Device {
  deviceId: string      // Internal UUID (unique)
  serialNumber: string  // Human-readable unique identifier
  name: string
  model?: string
  os?: string
  lastSeen: string
  createdAt?: string    // Registration date - when device first appeared in ReportMate
  status: string  // Made flexible to handle API response variations
  uptime?: string
  location?: string
  ipAddress?: string
  totalEvents: number
  lastEventTime: string
  assetTag?: string     // Asset tag directly from API (not nested)
  // Additional fields from enhanced API
  usage?: string
  catalog?: string
  department?: string
  // Modular structure from API (legacy/backup access)
  modules?: {
    inventory?: {
      uuid?: string
      owner?: string
      usage?: string
      catalog?: string
      version?: string
      assetTag?: string
      deviceId?: string
      location?: string
      moduleId?: string
      department?: string
      deviceName?: string
      collectedAt?: string
      serialNumber?: string
    }
  }
}

interface NewClientsWidgetProps {
  devices: Device[]
  loading: boolean
}

export const NewClientsWidget: React.FC<NewClientsWidgetProps> = React.memo(function NewClientsWidget({ devices, loading }) {
  // Filter for NEW devices only (registered in the last 7 days)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  
  const newDevices = devices.filter(device => {
    if (!device.createdAt) return false
    const createdDate = new Date(device.createdAt)
    return createdDate >= sevenDaysAgo
  })
  
  // Sort by registration date (createdAt) descending to show newest first
  const sortedDevices = [...newDevices].sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return dateB - dateA  // Newest registrations first
  })

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden h-[600px] flex flex-col">
      <Link
        href="/devices"
        className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0 block hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              New Clients
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Registered in the last 7 days
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
      ) : sortedDevices.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
              No new clients
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              No devices registered in the last 7 days
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto overlay-scrollbar">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {sortedDevices.slice(0, 10).map((device) => (
              <Link
                key={device.deviceId}
                href={`/device/${encodeURIComponent(device.serialNumber)}`}
                className="block p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {/* Device Info */}
                  <div className="flex-1 min-w-0 pl-4">
                    {/* Primary - Device Name with full fallback chain */}
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {device.modules?.inventory?.deviceName || (device.name && device.name.toLowerCase() !== 'unknown' ? device.name : null) || device.serialNumber}
                    </div>
                    
                    {/* Secondary - Show identifiers but avoid duplication */}
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 pl-2">
                      {(() => {
                        const displayName = device.modules?.inventory?.deviceName || device.name;
                        const isNameSerial = displayName === device.serialNumber;
                        
                        // If we have asset tag and serial, and name isn't the serial
                        if (device.assetTag && device.serialNumber && !isNameSerial) {
                          return `${device.assetTag} | ${device.serialNumber}`;
                        }
                        // If we have asset tag but name is the serial (avoid duplication)
                        else if (device.assetTag && isNameSerial) {
                          return device.assetTag;
                        }
                        // If we have asset tag but no serial
                        else if (device.assetTag && !device.serialNumber) {
                          return device.assetTag;
                        }
                        // If we have serial but name isn't the serial
                        else if (device.serialNumber && !isNameSerial) {
                          return device.serialNumber;
                        }
                        // If name is serial (avoid showing serial twice)
                        else if (isNameSerial) {
                          return '';
                        }
                        else {
                          return 'No identifier available';
                        }
                      })()}
                    </div>
                    
                    {/* Registration Date - Static based on when device first appeared */}
                    <div className="text-xs text-gray-500 dark:text-gray-500 mt-2 pl-2">
                      Registered: {device.createdAt ? formatRelativeTime(device.createdAt) : 'Unknown'}
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
})

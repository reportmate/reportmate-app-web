/**
 * Status Widget
 * Displays device status distribution with a donut chart
 */

import React from 'react'
import Link from 'next/link'
import { StatusDonutChart } from '../graphs'

interface Device {
  deviceId: string
  serialNumber: string
  name: string
  model?: string
  os?: string
  lastSeen: string
  status: string  // Made flexible to handle API response variations
  uptime?: string
  location?: string
  ipAddress?: string
  ipAddressV4?: string
  ipAddressV6?: string
  macAddress?: string
  totalEvents: number
  lastEventTime: string
  architecture?: string
  processor?: string
  memory?: string
}

interface StatusWidgetProps {
  devices: Device[]
  loading: boolean
}

export const StatusWidget: React.FC<StatusWidgetProps> = ({ devices, loading }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <Link href="/devices" className="block">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20,18C20.5,18 21,18.4 21,19V20C21,20.5 20.5,21 20,21H4C3.5,21 3,20.5 3,20V19C3,18.4 3.5,18 4,18H20M4,17C2.9,17 2,16.1 2,15V5C2,3.9 2.9,3 4,3H20C21.1,3 22,3.9 22,5V15C22,16.1 21.1,17 20,17H4M4,5V15H20V5H4Z"/>
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  Fleet Status
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Click to view all devices
                </p>
              </div>
            </div>
            <div className="text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </Link>
      
      <div className="p-6">
        <StatusDonutChart 
          devices={devices}
          loading={loading}
        />
      </div>
    </div>
  )
}

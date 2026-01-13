/**
 * OS Version Pie Widget
 * Dashboard widget wrapper for OS version combined charts (donut + bars)
 * Used specifically on the dashboard for visual overview with drill-down
 */

'use client'

import React from 'react'
import { OSVersionPieChart } from '../../lib/modules/graphs/OSVersionPieChart'

interface Device {
  deviceId: string
  serialNumber: string
  name: string
  platform?: string
  os?: string
  modules?: {
    system?: {
      operatingSystem?: {
        name?: string
        version?: string
        build?: string
        displayVersion?: string
        featureUpdate?: string
      }
    }
  }
  osVersion?: {
    name?: string
    version?: string
    build?: string
    displayVersion?: string
    featureUpdate?: string
  }
}

interface OSVersionPieWidgetProps {
  devices: Device[]
  loading: boolean
  osType: 'macOS' | 'Windows'
}

export const OSVersionPieWidget: React.FC<OSVersionPieWidgetProps> = ({ devices, loading, osType }) => {
  const icon = osType === 'macOS' ? (
    <svg className="w-5 h-5 text-red-500 dark:text-red-300" fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  ) : (
    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 24 24">
      <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z"/>
    </svg>
  )

  const colorClass = osType === 'macOS' ? 'bg-red-100 dark:bg-red-900' : 'bg-blue-100 dark:bg-blue-900'

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 ${colorClass} rounded-lg flex items-center justify-center`}>
            {icon}
          </div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            {osType} Versions
          </h2>
        </div>
      </div>
      
      <div className="px-4 py-3">
        <OSVersionPieChart 
          devices={devices as any}
          loading={loading}
          osType={osType}
        />
      </div>
    </div>
  )
}

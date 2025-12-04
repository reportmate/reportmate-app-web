/**
 * Platform Distribution Widget
 * Dashboard widget for displaying platform distribution charts
 */

import React, { useState } from 'react'
import Link from 'next/link'
import { PlatformDistributionChart } from '../graphs'

interface Device {
  deviceId: string
  serialNumber: string
  name: string
  model?: string
  os?: string
  platform?: string  // API platform detection
  lastSeen: string
  status: string  // Made flexible to handle API response variations
  modules?: {
    system?: {
      operatingSystem?: {
        name: string
        version: string
        build: string
        architecture: string
        displayVersion?: string
        edition?: string
      }
    }
    hardware?: {
      processor?: {
        architecture: string
        name: string
        manufacturer: string
      }
    }
    inventory?: {
      catalog?: string
      usage?: string
    }
  }
}

interface PlatformDistributionWidgetProps {
  devices: Device[]
  loading: boolean
}

export const PlatformDistributionWidget: React.FC<PlatformDistributionWidgetProps> = React.memo(function PlatformDistributionWidget({ 
  devices, 
  loading 
}) {
  const [filters, setFilters] = useState({
    architecture: [] as string[],
    catalog: [] as string[],
    usage: [] as string[]
  })

  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters)
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <Link href="/devices" className="block">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  Platform Distribution
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Windows vs macOS breakdown
                </p>
              </div>
            </div>
            <div className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </Link>
      
      <div className="p-6">
        <PlatformDistributionChart 
          devices={devices}
          loading={loading}
          filters={filters}
          onFilterChange={handleFilterChange}
        />
      </div>
    </div>
  )
})

export default PlatformDistributionWidget

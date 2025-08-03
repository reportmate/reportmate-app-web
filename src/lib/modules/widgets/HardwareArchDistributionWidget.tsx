
ls/**
 * Hardware Architecture Distribution Widget
 * Dashboard widget for displaying hardware architecture distribution charts
 */

import React, { useState } from 'react'
import Link from 'next/link'
import { HardwareArchDistributionChart } from '../graphs'

interface Device {
  deviceId: string
  serialNumber: string
  name: string
  model?: string
  os?: string
  lastSeen: string
  status: 'active' | 'stale' | 'missing' | 'warning' | 'error' | 'offline'
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
        cores?: number
        maxSpeed?: number
      }
      manufacturer?: string
      model?: string
    }
    inventory?: {
      catalog?: string
      usage?: string
    }
  }
}

interface HardwareArchDistributionWidgetProps {
  devices: Device[]
  loading: boolean
}

export const HardwareArchDistributionWidget: React.FC<HardwareArchDistributionWidgetProps> = ({ 
  devices, 
  loading 
}) => {
  const [filters, setFilters] = useState({
    platform: [] as string[],
    manufacturer: [] as string[],
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
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                  Hardware Architecture
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  ARM64, x64, x86_64 distribution
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
        <HardwareArchDistributionChart 
          devices={devices}
          loading={loading}
          filters={filters}
          onFilterChange={handleFilterChange}
        />
      </div>
    </div>
  )
}

export default HardwareArchDistributionWidget

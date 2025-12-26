/**
 * Progressive Devices Card - Shows fast device list while other data loads
 */

import React from 'react'
import { useDevicesList } from '../../hooks/useProgressiveData'
import Link from 'next/link'

export const ProgressiveDevicesCard: React.FC = () => {
  const { devices, loading, error } = useDevicesList()

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Devices
            </h2>
          </div>
        </div>
        <div className="p-6 text-center">
          <p className="text-red-500">Error loading devices: {error}</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Devices
            </h2>
          </div>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2">
            Loading devices...
          </p>
        </div>
      </div>
    )
  }

  const activeDevices = devices.filter(device => device.status === 'active' || device.status === 'online').length
  const staleDevices = devices.filter(device => device.status === 'stale').length
  const missingDevices = devices.filter(device => device.status === 'missing' || (!['active', 'online', 'stale'].includes(device.status))).length

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Devices
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {devices.length} total devices
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                {activeDevices}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Active</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-yellow-600 dark:text-yellow-400">
                {staleDevices}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Stale</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-500 dark:text-gray-400">
                {missingDevices}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Missing</div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {devices.slice(0, 10).map((device) => (
            <Link
              key={device.serial_number}
              href={`/device/${device.serial_number}`}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  device.status === 'active' || device.status === 'online'
                    ? 'bg-green-500' 
                    : device.status === 'stale'
                    ? 'bg-yellow-500'
                    : 'bg-gray-400'
                }`} />
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {device.inventory?.deviceName || device.serial_number}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {device.serial_number}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {device.inventory?.department}
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  {device.inventory?.location}
                </div>
              </div>
            </Link>
          ))}
          
          {devices.length > 10 && (
            <Link
              href="/devices"
              className="block text-center p-3 text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors text-sm font-medium"
            >
              View all {devices.length} devices             </Link>
          )}
        </div>
      </div>
    </div>
  )
}
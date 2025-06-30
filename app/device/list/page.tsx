"use client"

import Link from "next/link"

// Quick device list for testing purposes
const testDevices = [
  { id: 'JY93C5YGGM', name: 'Celeste Martin', model: 'MacBook Air (15-inch, M2, 2023)', os: 'macOS 15.2.0' },
  { id: 'FVFXQ2P3JM', name: 'Alex Chen', model: 'MacBook Pro (16-inch, M3 Pro, 2023)', os: 'macOS 15.2.0' },
  { id: 'C02ZK8WVLVDQ', name: 'Sarah Kim', model: 'iMac (24-inch, M3, 2023)', os: 'macOS 15.2.0' },
  { id: 'WS-ACC-001', name: 'Jennifer Adams', model: 'Dell Precision 5570', os: 'Windows 11 Pro' },
  { id: 'LT-SAL-007', name: 'Marcus Thompson', model: 'Lenovo ThinkPad X1 Carbon Gen 11', os: 'Windows 11 Pro' },
  { id: 'WS-IT-003', name: 'Ryan Martinez', model: 'HP Z4 G5 Workstation', os: 'Windows 11 Pro' }
]

export default function DeviceListPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 h-16">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              Test Device List
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              Available Test Devices
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Click on any device to view its detailed information and test the layout
            </p>
          </div>
          
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {testDevices.map((device) => (
              <Link
                key={device.id}
                href={`/device/${device.id}`}
                className="block px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                      {device.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {device.model}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {device.os} • ID: {device.id}
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
        
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Testing Information
              </h3>
              <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                <p>• Each device has mock data including hardware info, applications, security settings</p>
                <p>• Test different tabs: Info, Managed Installs, Applications, Network, Security, Events</p>
                <p>• Some devices are Mac (macOS) and others are Windows with different layouts</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { formatRelativeTime } from "../../../src/lib/time"
import { DevicePageNavigation } from "../../../src/components/navigation/DevicePageNavigation"

interface Peripheral {
  id: string
  deviceId: string
  deviceName: string
  serialNumber: string
  lastSeen: string
  collectedAt: string
  usbDevices: any[]
  bluetoothDevices: any[]
  printers: any[]
  cameras: any[]
  audioDevices: any[]
  displayDevices: any[]
  inputDevices: any[]
  storageDevices: any[]
  lastUpdated: string
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(10)].map((_, i) => (
        <div key={i} className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      ))}
    </div>
  )
}

function PeripheralsPageContent() {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [peripherals, setPeripherals] = useState<Peripheral[]>([])
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [deviceTypeFilter, setDeviceTypeFilter] = useState('all')
  
  // Sorting state
  const [sortColumn, setSortColumn] = useState<'device' | 'total' | 'lastSeen'>('device')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  
  const handleSort = (column: typeof sortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  useEffect(() => {
    const fetchPeripherals = async () => {
      try {
        const response = await fetch('/api/modules/peripherals', {
          cache: 'no-store',
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        })
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        setPeripherals(data)
      } catch (err) {
        console.error('Error fetching peripherals:', err)
        setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchPeripherals()
  }, [])

  const getDeviceCount = (devices: any[]): number => {
    return Array.isArray(devices) ? devices.length : 0
  }

  const getTotalDevices = (peripheral: Peripheral): number => {
    return getDeviceCount(peripheral.usbDevices) +
           getDeviceCount(peripheral.bluetoothDevices) +
           getDeviceCount(peripheral.printers) +
           getDeviceCount(peripheral.cameras) +
           getDeviceCount(peripheral.audioDevices) +
           getDeviceCount(peripheral.displayDevices) +
           getDeviceCount(peripheral.inputDevices) +
           getDeviceCount(peripheral.storageDevices)
  }

  // Filter peripherals
  const filteredPeripherals = peripherals.filter(peripheral => {
    const matchesSearch = peripheral.deviceName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      peripheral.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      JSON.stringify(peripheral.usbDevices).toLowerCase().includes(searchQuery.toLowerCase()) ||
      JSON.stringify(peripheral.bluetoothDevices).toLowerCase().includes(searchQuery.toLowerCase()) ||
      JSON.stringify(peripheral.printers).toLowerCase().includes(searchQuery.toLowerCase())

    const matchesFilter = deviceTypeFilter === 'all' || (
      (deviceTypeFilter === 'usb' && getDeviceCount(peripheral.usbDevices) > 0) ||
      (deviceTypeFilter === 'bluetooth' && getDeviceCount(peripheral.bluetoothDevices) > 0) ||
      (deviceTypeFilter === 'printers' && getDeviceCount(peripheral.printers) > 0) ||
      (deviceTypeFilter === 'cameras' && getDeviceCount(peripheral.cameras) > 0) ||
      (deviceTypeFilter === 'audio' && getDeviceCount(peripheral.audioDevices) > 0) ||
      (deviceTypeFilter === 'displays' && getDeviceCount(peripheral.displayDevices) > 0) ||
      (deviceTypeFilter === 'input' && getDeviceCount(peripheral.inputDevices) > 0) ||
      (deviceTypeFilter === 'storage' && getDeviceCount(peripheral.storageDevices) > 0)
    )

    return matchesSearch && matchesFilter
  }).sort((a, b) => {
    switch (sortColumn) {
      case 'device':
        const aName = a.deviceName?.toLowerCase() || ''
        const bName = b.deviceName?.toLowerCase() || ''
        return sortDirection === 'asc' ? aName.localeCompare(bName) : bName.localeCompare(aName)
      case 'total':
        const aTotal = getTotalDevices(a)
        const bTotal = getTotalDevices(b)
        return sortDirection === 'asc' ? aTotal - bTotal : bTotal - aTotal
      case 'lastSeen':
        const aDate = a.lastSeen || ''
        const bDate = b.lastSeen || ''
        return sortDirection === 'asc' ? aDate.localeCompare(bDate) : bDate.localeCompare(aDate)
      default:
        return 0
    }
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black animate-pulse">
        <header className="bg-white dark:bg-gray-900 border-b h-16"></header>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <LoadingSkeleton />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black">
        <header className="bg-white dark:bg-gray-900 border-b">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Dashboard
            </Link>
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Peripherals</h1>
          </div>
        </header>
        
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Error Loading Peripherals</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <Link href="/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-sm font-medium hidden sm:inline">Dashboard</span>
              </Link>
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
              <div className="flex items-center gap-3 min-w-0">
                {/* Squircle Icon - Violet to Cyan for Peripherals */}
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-600 dark:from-violet-600 dark:to-cyan-700 flex items-center justify-center shadow-sm">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.8 3.2h6.4a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H8.8a1 1 0 0 1-1-1V4.2a1 1 0 0 1 1-1zM8.8 7.2h6.4a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H8.8a2 2 0 0 1-2-2V9.2a2 2 0 0 1 2-2zM10.4 17.2h3.2a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-3.2a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Right side - Navigation */}
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              {/* Navigation */}
              <div className="hidden lg:flex">
                <DevicePageNavigation className="flex items-center gap-2" />
              </div>

              {/* Mobile Navigation */}
              <div className="lg:hidden">
                <DevicePageNavigation className="flex items-center gap-2" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Connected Peripherals</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  USB, Bluetooth, and other connected devices • {filteredPeripherals.length} devices
                </p>
              </div>
              <div className="flex items-center gap-4">
                {/* Device Type Filter */}
                <select
                  value={deviceTypeFilter}
                  onChange={(e) => setDeviceTypeFilter(e.target.value)}
                  className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-1.5"
                >
                  <option value="all">All Device Types</option>
                  <option value="usb">USB Devices</option>
                  <option value="bluetooth">Bluetooth Devices</option>
                  <option value="printers">Printers</option>
                  <option value="cameras">Cameras</option>
                  <option value="audio">Audio Devices</option>
                  <option value="displays">Display Devices</option>
                  <option value="input">Input Devices</option>
                  <option value="storage">Storage Devices</option>
                </select>

                {/* Search */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search peripherals..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-48 md:w-64 pl-10 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="overflow-auto max-h-[calc(100vh-16rem)]">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
                <tr>
                  <th 
                    onClick={() => handleSort('device')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none"
                  >
                    <div className="flex items-center gap-1">
                      Device
                      {sortColumn === 'device' && (
                        <svg className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700">USB Devices</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700">Bluetooth</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700">Printers</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700">Other Devices</th>
                  <th 
                    onClick={() => handleSort('total')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none"
                  >
                    <div className="flex items-center gap-1">
                      Total
                      {sortColumn === 'total' && (
                        <svg className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('lastSeen')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none"
                  >
                    <div className="flex items-center gap-1">
                      Last Seen
                      {sortColumn === 'lastSeen' && (
                        <svg className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredPeripherals.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.8 3.2h6.4a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H8.8a1 1 0 0 1-1-1V4.2a1 1 0 0 1 1-1zM8.8 7.2h6.4a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H8.8a2 2 0 0 1-2-2V9.2a2 2 0 0 1 2-2zM10.4 17.2h3.2a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-3.2a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1z" />
                        </svg>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">No peripheral records found</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">No peripheral records match your current search.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPeripherals.map((peripheral) => (
                    <tr key={peripheral.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 max-w-56">
                        <Link 
                          href={`/device/${peripheral.deviceId}`}
                          className="group block min-w-0"
                          title={peripheral.deviceName || 'Unknown Device'}
                        >
                          <div className="text-sm font-medium text-cyan-600 group-hover:text-cyan-800 dark:text-cyan-400 dark:group-hover:text-cyan-300 truncate">{peripheral.deviceName}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">
                            {peripheral.serialNumber}
                            {(peripheral as any).assetTag && (
                              <span className="ml-1">| {(peripheral as any).assetTag}</span>
                            )}
                          </div>
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="text-gray-900 dark:text-white font-medium">
                            {getDeviceCount(peripheral.usbDevices)} devices
                          </div>
                          {peripheral.usbDevices && peripheral.usbDevices.length > 0 && (
                            <div className="text-gray-500 dark:text-gray-400 text-xs max-w-xs">
                              {peripheral.usbDevices.slice(0, 2).map((device: any, idx: number) => (
                                <div key={idx} className="truncate">
                                  {device.product_name || device.name || 'Unknown USB Device'}
                                </div>
                              ))}
                              {peripheral.usbDevices.length > 2 && (
                                <div>+{peripheral.usbDevices.length - 2} more...</div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="text-gray-900 dark:text-white font-medium">
                            {getDeviceCount(peripheral.bluetoothDevices)} devices
                          </div>
                          {peripheral.bluetoothDevices && peripheral.bluetoothDevices.length > 0 && (
                            <div className="text-gray-500 dark:text-gray-400 text-xs max-w-xs">
                              {peripheral.bluetoothDevices.slice(0, 2).map((device: any, idx: number) => (
                                <div key={idx} className="truncate">
                                  {device.name || device.address || 'Unknown Bluetooth'}
                                </div>
                              ))}
                              {peripheral.bluetoothDevices.length > 2 && (
                                <div>+{peripheral.bluetoothDevices.length - 2} more...</div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="text-gray-900 dark:text-white font-medium">
                            {getDeviceCount(peripheral.printers)} printers
                          </div>
                          {peripheral.printers && peripheral.printers.length > 0 && (
                            <div className="text-gray-500 dark:text-gray-400 text-xs max-w-xs">
                              {peripheral.printers.slice(0, 2).map((printer: any, idx: number) => (
                                <div key={idx} className="truncate">
                                  {printer.name || printer.display_name || 'Unknown Printer'}
                                </div>
                              ))}
                              {peripheral.printers.length > 2 && (
                                <div>+{peripheral.printers.length - 2} more...</div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {getDeviceCount(peripheral.cameras) > 0 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                              {getDeviceCount(peripheral.cameras)} cameras
                            </span>
                          )}
                          {getDeviceCount(peripheral.audioDevices) > 0 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              {getDeviceCount(peripheral.audioDevices)} audio
                            </span>
                          )}
                          {getDeviceCount(peripheral.displayDevices) > 0 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              {getDeviceCount(peripheral.displayDevices)} displays
                            </span>
                          )}
                          {getDeviceCount(peripheral.inputDevices) > 0 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                              {getDeviceCount(peripheral.inputDevices)} input
                            </span>
                          )}
                          {getDeviceCount(peripheral.storageDevices) > 0 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                              {getDeviceCount(peripheral.storageDevices)} storage
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-medium">
                        {getTotalDevices(peripheral)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {peripheral.lastSeen ? formatRelativeTime(peripheral.lastSeen) : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PeripheralsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-black animate-pulse"></div>}>
      <PeripheralsPageContent />
    </Suspense>
  )
}

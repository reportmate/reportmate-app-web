"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { formatRelativeTime } from "../../../src/lib/time"
import { usePlatformFilterSafe, normalizePlatform } from "../../../src/providers/PlatformFilterProvider"

interface Peripheral {
  id: string
  deviceId: string
  deviceName: string
  serialNumber: string
  lastSeen: string
  collectedAt: string
  platform?: string
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
    <div className="animate-pulse">
      {/* Header Skeleton */}
      <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-64"></div>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-40"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
          </div>
        </div>
      </div>
      
      {/* Widgets Accordion Skeleton */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="w-full px-6 py-3 flex items-center justify-between">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
          <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700/50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-600 rounded mb-3"></div>
                <div className="space-y-2">
                  {[1, 2, 3].map(j => (
                    <div key={j} className="flex items-center justify-between">
                      <div className="h-3 w-20 bg-gray-200 dark:bg-gray-600 rounded"></div>
                      <div className="h-3 w-8 bg-gray-200 dark:bg-gray-600 rounded"></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Table Skeleton */}
      <div className="flex-1 overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3"><div className="h-4 w-16 bg-gray-300 dark:bg-gray-600 rounded"></div></th>
              <th className="px-6 py-3"><div className="h-4 w-20 bg-gray-300 dark:bg-gray-600 rounded"></div></th>
              <th className="px-6 py-3"><div className="h-4 w-20 bg-gray-300 dark:bg-gray-600 rounded"></div></th>
              <th className="px-6 py-3"><div className="h-4 w-16 bg-gray-300 dark:bg-gray-600 rounded"></div></th>
              <th className="px-6 py-3"><div className="h-4 w-24 bg-gray-300 dark:bg-gray-600 rounded"></div></th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {[...Array(8)].map((_, i) => (
              <tr key={i}>
                <td className="px-6 py-4"><div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div></td>
                <td className="px-6 py-4"><div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded"></div></td>
                <td className="px-6 py-4"><div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded"></div></td>
                <td className="px-6 py-4"><div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded"></div></td>
                <td className="px-6 py-4"><div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
  const { platformFilter, isPlatformVisible } = usePlatformFilterSafe()
  
  // Sorting state
  const [sortColumn, setSortColumn] = useState<'device' | 'total' | 'lastSeen'>('device')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [widgetsExpanded, setWidgetsExpanded] = useState(true)
  
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
    // Global platform filter first
    if (platformFilter) {
      const platform = normalizePlatform(peripheral.platform)
      if (!isPlatformVisible(platform)) {
        return false
      }
    }
    
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

  // Calculate peripheral statistics for widgets
  const peripheralStats = {
    // Bluetooth power state
    bluetoothOn: filteredPeripherals.filter(p => 
      p.bluetoothDevices && p.bluetoothDevices.length > 0
    ).length,
    bluetoothOff: filteredPeripherals.filter(p => 
      !p.bluetoothDevices || p.bluetoothDevices.length === 0
    ).length,
    
    // Printer names and counts
    printerNames: filteredPeripherals.reduce((acc, p) => {
      if (p.printers && Array.isArray(p.printers)) {
        p.printers.forEach((printer: any) => {
          const name = printer.name || printer.printerName || 'Unknown Printer'
          acc[name] = (acc[name] || 0) + 1
        })
      }
      return acc
    }, {} as Record<string, number>),
    
    // USB device types
    usbTypes: filteredPeripherals.reduce((acc, p) => {
      if (p.usbDevices && Array.isArray(p.usbDevices)) {
        p.usbDevices.forEach((device: any) => {
          const type = device.class || device.type || device.vendor || 'Unknown'
          acc[type] = (acc[type] || 0) + 1
        })
      }
      return acc
    }, {} as Record<string, number>),
    
    // Total counts
    totalUSB: filteredPeripherals.reduce((sum, p) => sum + getDeviceCount(p.usbDevices), 0),
    totalBluetooth: filteredPeripherals.reduce((sum, p) => sum + getDeviceCount(p.bluetoothDevices), 0),
    totalPrinters: filteredPeripherals.reduce((sum, p) => sum + getDeviceCount(p.printers), 0)
  }

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

  return (
    <div className="h-[calc(100vh-4rem)] bg-gray-50 dark:bg-black flex flex-col overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col min-h-0">
        <div className="flex-1 bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col min-h-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Connected Peripherals</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  USB, Bluetooth, and other connected devices {filteredPeripherals.length} devices
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

          {/* Widgets Accordion */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setWidgetsExpanded(!widgetsExpanded)}
              className="w-full px-6 py-3 flex items-center justify-between bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Widgets</span>
              <svg 
                className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${widgetsExpanded ? 'rotate-90' : 'rotate-180'}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            
            {widgetsExpanded && (
              <div className="px-6 py-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700/50">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Bluetooth Power State Widget */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Bluetooth State</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">Has Devices</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{peripheralStats.bluetoothOn}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-gray-400"></div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">No Devices</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{peripheralStats.bluetoothOff}</span>
                      </div>
                    </div>
                  </div>

                  {/* Printers Widget */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Printers ({peripheralStats.totalPrinters})</h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {Object.entries(peripheralStats.printerNames).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, count]) => (
                        <div key={name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-purple-500"></div>
                            <span className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-[150px]" title={name}>{name}</span>
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{count}</span>
                        </div>
                      ))}
                      {Object.keys(peripheralStats.printerNames).length === 0 && (
                        <span className="text-sm text-gray-500 dark:text-gray-400">No printers found</span>
                      )}
                    </div>
                  </div>

                  {/* USB Devices Widget */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">USB Devices ({peripheralStats.totalUSB})</h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {Object.entries(peripheralStats.usbTypes).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                            <span className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-[150px]" title={type}>{type}</span>
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{count}</span>
                        </div>
                      ))}
                      {Object.keys(peripheralStats.usbTypes).length === 0 && (
                        <span className="text-sm text-gray-500 dark:text-gray-400">No USB devices found</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-auto min-h-0">
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
                {error ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 mb-4 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <p className="text-base font-medium text-gray-900 dark:text-white mb-2">Failed to load peripherals</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{error}</p>
                        <button 
                          onClick={() => window.location.reload()} 
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          Try Again
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : filteredPeripherals.length === 0 ? (
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
                          href={`/device/${peripheral.deviceId}#hardware`}
                          className="group block min-w-0"
                          title={peripheral.deviceName || 'Unknown Device'}
                        >
                          <div className="text-sm font-medium text-gray-900 group-hover:text-gray-700 dark:text-white dark:group-hover:text-gray-200 truncate">{peripheral.deviceName}</div>
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

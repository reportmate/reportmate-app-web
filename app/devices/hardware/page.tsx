"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { formatRelativeTime } from "../../../src/lib/time"
import { DevicePageNavigation } from "../../../src/components/navigation/DevicePageNavigation"

interface HardwareRecord {
  id: string
  deviceId: string
  deviceName: string
  serialNumber: string
  lastSeen: string
  collectedAt: string
  processor: string
  processorSpeed?: string
  processorCores?: number
  memory: string
  memoryModules: any[]
  storage: any[]
  graphics: any[]
  motherboard?: any
  raw?: any
}

function HardwarePageContent() {
  const [hardware, setHardware] = useState<HardwareRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [processorFilter, setProcessorFilter] = useState<string>('all')
  const searchParams = useSearchParams()

  useEffect(() => {
    const urlSearch = searchParams.get('search')
    if (urlSearch) setSearchQuery(urlSearch)
    
    const urlProcessor = searchParams.get('processor')
    if (urlProcessor) setProcessorFilter(urlProcessor)
  }, [searchParams])

  useEffect(() => {
    const fetchHardware = async () => {
      try {
        const response = await fetch('/api/modules/hardware', {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        })
        
        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`)
        }
        
        const data = await response.json()
        
        if (Array.isArray(data)) {
          setHardware(data)
          setError(null)
        } else {
          throw new Error('Invalid API response format')
        }
        
      } catch (error) {
        console.error('❌ Failed to fetch hardware:', error)
        setError(error instanceof Error ? error.message : 'Unknown error')
        setHardware([])
      } finally {
        setLoading(false)
      }
    }

    fetchHardware()
  }, [])

  // Get unique processor families for filter
  const processorFamilies = Array.from(new Set(
    hardware.map(h => {
      if (h.processor.toLowerCase().includes('intel')) return 'Intel'
      if (h.processor.toLowerCase().includes('amd')) return 'AMD'
      if (h.processor.toLowerCase().includes('apple')) return 'Apple'
      return 'Other'
    })
  )).sort()

  // Filter hardware
  const filteredHardware = hardware.filter(h => {
    if (processorFilter !== 'all') {
      const family = h.processor.toLowerCase().includes(processorFilter.toLowerCase())
      if (!family) return false
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      return (
        h.deviceName?.toLowerCase().includes(query) ||
        h.processor?.toLowerCase().includes(query) ||
        h.memory?.toLowerCase().includes(query) ||
        h.serialNumber?.toLowerCase().includes(query)
      )
    }
    
    return true
  })

  const formatMemory = (memory: string | number) => {
    if (typeof memory === 'number') {
      return memory >= 1000000000 ? `${(memory / 1073741824).toFixed(1)} GB` : `${Math.round(memory / 1048576)} MB`
    }
    return memory || 'Unknown'
  }

  const formatStorage = (storage: any[]) => {
    if (!storage || storage.length === 0) return 'No drives'
    const totalSize = storage.reduce((sum, drive) => {
      const size = drive.size || drive.capacity || 0
      return sum + (typeof size === 'number' ? size : 0)
    }, 0)
    if (totalSize > 0) {
      return totalSize >= 1000000000000 ? `${(totalSize / 1099511627776).toFixed(1)} TB` : `${Math.round(totalSize / 1073741824)} GB`
    }
    return `${storage.length} drives`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black animate-pulse">
        <header className="bg-white dark:bg-gray-900 border-b h-16"></header>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex space-x-4">
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/3"></div>
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
                </div>
              ))}
            </div>
          </div>
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
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Hardware</h1>
          </div>
        </header>
        
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Error Loading Hardware</h2>
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
                <svg className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">Hardware</h1>
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
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Hardware Inventory</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Device specifications and components • {filteredHardware.length} devices
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* Search Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search hardware..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-64 pl-10 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <svg className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Device</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Processor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Memory</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Storage</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Graphics</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Last Collected</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredHardware.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                      </svg>
                      <p className="text-lg font-medium mb-1">No hardware data found</p>
                      <p className="text-sm">Try adjusting your search or filter criteria.</p>
                    </td>
                  </tr>
                ) : (
                  filteredHardware.map((hw) => (
                    <tr key={hw.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4">
                        <Link
                          href={`/device/${encodeURIComponent(hw.serialNumber)}`}
                          className="font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          {hw.deviceName}
                        </Link>
                        <div className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                          {hw.serialNumber}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-white">{hw.processor}</div>
                        {hw.processorCores && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {hw.processorCores} cores
                            {hw.processorSpeed && ` • ${hw.processorSpeed}`}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {formatMemory(hw.memory)}
                        {hw.memoryModules?.length > 0 && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {hw.memoryModules.length} modules
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {formatStorage(hw.storage)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {hw.graphics?.length > 0 ? (
                          <div>
                            <div>{hw.graphics[0].name || hw.graphics[0].model || 'Graphics Card'}</div>
                            {hw.graphics.length > 1 && (
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                +{hw.graphics.length - 1} more
                              </div>
                            )}
                          </div>
                        ) : 'Unknown'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {hw.collectedAt ? formatRelativeTime(hw.collectedAt) : '-'}
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

export default function HardwarePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-black animate-pulse"></div>}>
      <HardwarePageContent />
    </Suspense>
  )
}

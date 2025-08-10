"use client"

// Force dynamic rendering and disable caching for inventory page
export const dynamic = 'force-dynamic'

import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { formatRelativeTime } from "../../../src/lib/time"
import { DevicePageNavigation } from "../../../src/components/navigation/DevicePageNavigation"

interface InventoryItem {
  id: string
  deviceId: string
  deviceName: string
  serialNumber: string
  lastSeen: string
  collectedAt: string
  assetTag?: string
  location?: string
  usage?: string
  catalog?: string
  computerName?: string
  domain?: string
  organizationalUnit?: string
  manufacturer?: string
  model?: string
  uuid?: string
  raw?: any
}

function InventoryPageContent() {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [usageFilter, setUsageFilter] = useState<string>('all')
  const [catalogFilter, setCatalogFilter] = useState<string>('all')
  const searchParams = useSearchParams()

  // Initialize search query and filters from URL parameters
  useEffect(() => {
    try {
      const urlSearch = searchParams.get('search')
      if (urlSearch) {
        setSearchQuery(urlSearch)
      }
      
      const urlUsage = searchParams.get('usage')
      if (urlUsage && ['assigned', 'shared'].includes(urlUsage.toLowerCase())) {
        setUsageFilter(urlUsage.toLowerCase())
      }

      const urlCatalog = searchParams.get('catalog')
      if (urlCatalog && ['curriculum', 'staff', 'faculty', 'kiosk'].includes(urlCatalog.toLowerCase())) {
        setCatalogFilter(urlCatalog.toLowerCase())
      }
    } catch (e) {
      console.warn('Failed to get search params:', e)
    }
  }, [searchParams])

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        // Use Next.js API route
        const apiUrl = '/api/modules/inventory'
        const timestamp = new Date().toISOString()
        console.log(`${timestamp} - Fetching inventory from Next.js API route:`, apiUrl)
        
        const response = await fetch(apiUrl, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        })
        
        console.log(`${timestamp} - API Response Status:`, response.status)
        
        if (!response.ok) {
          throw new Error(`API request failed: ${response.status} ${response.statusText}`)
        }
        
        const data = await response.json()
        console.log(`${timestamp} - API response received:`, { 
          type: typeof data, 
          isArray: Array.isArray(data), 
          length: Array.isArray(data) ? data.length : 'N/A'
        })
        
        // The API returns a direct array of inventory items
        let inventoryArray: InventoryItem[]
        
        if (Array.isArray(data)) {
          inventoryArray = data
          console.log('✅ Successfully received inventory array:', inventoryArray.length, 'items')
        } else {
          console.error('❌ Invalid API response format:', data)
          throw new Error('API returned invalid data format')
        }
        
        if (inventoryArray.length === 0) {
          console.warn('⚠️ No inventory found in API response')
          setInventory([])
          setError(null)
        } else {
          console.log('✅ Successfully loaded', inventoryArray.length, 'inventory items from API')
          setInventory(inventoryArray)
          setError(null)
        }
        
      } catch (error) {
        console.error('❌ Failed to fetch inventory:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
        setError(errorMessage)
        setInventory([]) // Set empty array on error
      } finally {
        setLoading(false)
        console.log('✅ Loading state cleared')
      }
    }

    fetchInventory()
  }, [])

  // Filter inventory based on search query and filters
  const filteredInventory = (() => {
    try {
      if (!Array.isArray(inventory)) {
        console.warn('Inventory is not an array:', inventory)
        return []
      }
      
      let filtered = inventory
      
      // Apply usage filter first
      if (usageFilter !== 'all') {
        filtered = filtered.filter(item => {
          try {
            const usage = item.usage?.toLowerCase()
            return usage === usageFilter
          } catch (e) {
            console.warn('Error checking item usage:', item, e)
            return false
          }
        })
      }

      // Apply catalog filter
      if (catalogFilter !== 'all') {
        filtered = filtered.filter(item => {
          try {
            const catalog = item.catalog?.toLowerCase()
            return catalog === catalogFilter
          } catch (e) {
            console.warn('Error checking item catalog:', item, e)
            return false
          }
        })
      }
      
      // Then apply search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        filtered = filtered.filter(item => {
          try {
            return (
              item?.deviceName?.toLowerCase().includes(query) ||
              item?.assetTag?.toLowerCase().includes(query) ||
              item?.serialNumber?.toLowerCase().includes(query) ||
              item?.computerName?.toLowerCase().includes(query) ||
              item?.location?.toLowerCase().includes(query) ||
              item?.manufacturer?.toLowerCase().includes(query) ||
              item?.model?.toLowerCase().includes(query) ||
              item?.uuid?.toLowerCase().includes(query) ||
              item?.domain?.toLowerCase().includes(query) ||
              item?.organizationalUnit?.toLowerCase().includes(query)
            )
          } catch (e) {
            console.warn('Error filtering item:', item, e)
            return false
          }
        })
      }
      
      return filtered
    } catch (e) {
      console.error('Error in filteredInventory:', e)
      return []
    }
  })()

  // Get filter counts
  const getFilterCounts = () => {
    try {
      if (!Array.isArray(inventory)) return { 
        all: 0, assigned: 0, shared: 0, curriculum: 0, staff: 0, faculty: 0, kiosk: 0 
      }
      
      return {
        all: inventory.length,
        assigned: inventory.filter(item => 
          item.usage?.toLowerCase() === 'assigned'
        ).length,
        shared: inventory.filter(item => 
          item.usage?.toLowerCase() === 'shared'
        ).length,
        curriculum: inventory.filter(item => 
          item.catalog?.toLowerCase() === 'curriculum'
        ).length,
        staff: inventory.filter(item => 
          item.catalog?.toLowerCase() === 'staff'
        ).length,
        faculty: inventory.filter(item => 
          item.catalog?.toLowerCase() === 'faculty'
        ).length,
        kiosk: inventory.filter(item => 
          item.catalog?.toLowerCase() === 'kiosk'
        ).length,
      }
    } catch (e) {
      console.error('Error calculating filter counts:', e)
      return { all: 0, assigned: 0, shared: 0, curriculum: 0, staff: 0, faculty: 0, kiosk: 0 }
    }
  }

  const filterCounts = getFilterCounts()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black">
        <div className="animate-pulse">
          {/* Header skeleton */}
          <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-32"></div>
            </div>
          </header>
          
          {/* Content skeleton */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-6">
                <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-48 mb-4"></div>
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
                      <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
                      <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
                      <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
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
                <span className="text-sm font-medium">Dashboard</span>
              </Link>
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                Device Inventory
              </h1>
            </div>
          </div>
        </header>
        
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Error Loading Inventory
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {error}
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => {
                  setError(null)
                  setLoading(true)
                  window.location.reload()
                }}
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Try Again
              </button>
              <Link
                href="/dashboard"
                className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                ← Back to Dashboard
              </Link>
            </div>
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
            {/* Left side - Logo and Title */}
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <Link
                href="/dashboard"
                className="flex items-center gap-1 sm:gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-xs sm:text-sm font-medium hidden sm:inline">Dashboard</span>
              </Link>
              <div className="h-4 sm:h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                    Inventory
                  </h1>
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4 sm:pb-8 pt-4 sm:pt-8">
        {inventory.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 py-16">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-7l2 2-2 2m-2 12l2-2-2-2" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No inventory found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                No device inventory data has been collected yet.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Inventory
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Asset tags, locations, and device identification
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
                    placeholder="Search devices..."
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
            
            {/* Filter Row */}
            <div className="border-b border-gray-200 dark:border-gray-600 px-4 lg:px-6 py-3 bg-gray-50 dark:bg-gray-700">
              <nav className="flex flex-wrap gap-2">
                {[
                  { key: 'all', label: 'All', count: filterCounts.all },
                  { key: 'assigned', label: 'Assigned', count: filterCounts.assigned },
                  { key: 'shared', label: 'Shared', count: filterCounts.shared },
                  { key: 'curriculum', label: 'Curriculum', count: filterCounts.curriculum },
                  { key: 'staff', label: 'Staff', count: filterCounts.staff },
                  { key: 'faculty', label: 'Faculty', count: filterCounts.faculty },
                  { key: 'kiosk', label: 'Kiosk', count: filterCounts.kiosk },
                ].map((filter) => {
                  const isActive = (filter.key === 'all' && usageFilter === 'all' && catalogFilter === 'all') ||
                                 (filter.key !== 'all' && (usageFilter === filter.key || catalogFilter === filter.key))
                  
                  return (
                    <button
                      key={filter.key}
                      onClick={() => {
                        if (filter.key === 'all') {
                          setUsageFilter('all')
                          setCatalogFilter('all')
                        } else if (['assigned', 'shared'].includes(filter.key)) {
                          setUsageFilter(filter.key)
                          setCatalogFilter('all')
                        } else {
                          setCatalogFilter(filter.key)
                          setUsageFilter('all')
                        }
                      }}
                      className={`${
                        isActive
                          ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-500'
                      } px-3 py-1.5 border rounded-lg text-sm font-medium flex items-center gap-2 transition-colors`}
                    >
                      <span className="hidden lg:inline">{filter.label}</span>
                      <span className="lg:hidden">{filter.key === 'all' ? 'All' : filter.label}</span>
                      <span className={`${
                        isActive 
                          ? 'bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200'
                          : 'bg-gray-200 text-gray-700 dark:bg-gray-500 dark:text-gray-200'
                      } inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ml-1`}>
                        {filter.count}
                      </span>
                    </button>
                  )
                })}
              </nav>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Device Name
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Asset Tag
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Serial Number
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Usage / Catalog
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Last Updated
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredInventory.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                        <div className="flex flex-col items-center justify-center">
                          <svg className="w-12 h-12 mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <p className="text-lg font-medium mb-1">No inventory items found</p>
                          <p className="text-sm">
                            {searchQuery 
                              ? `No items match your search "${searchQuery}".`
                              : 'Try adjusting your search or filter criteria.'
                            }
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredInventory.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-4 lg:px-6 py-4">
                        <Link
                          href={`/device/${encodeURIComponent(item.serialNumber)}`}
                          className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 dark:text-white truncate">
                              {item.deviceName || item.computerName || 'Unknown Device'}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                              {item.manufacturer && item.model ? `${item.manufacturer} ${item.model}` : (item.manufacturer || item.model || '')}
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-white font-mono">
                          {item.assetTag || '-'}
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-white font-mono">
                          {item.serialNumber}
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        <div className="flex items-center gap-2">
                          {item.usage && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              item.usage.toLowerCase() === 'assigned' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            }`}>
                              {item.usage}
                            </span>
                          )}
                          {item.catalog && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              item.catalog.toLowerCase() === 'curriculum' 
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                                : item.catalog.toLowerCase() === 'staff'
                                ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                                : item.catalog.toLowerCase() === 'faculty'
                                ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                            }`}>
                              {item.catalog}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {item.location || '-'}
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {item.collectedAt ? formatRelativeTime(item.collectedAt) : '-'}
                        </div>
                      </td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function InventoryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-black">
        <div className="animate-pulse">
          <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-32"></div>
            </div>
          </header>
        </div>
      </div>
    }>
      <InventoryPageContent />
    </Suspense>
  )
}

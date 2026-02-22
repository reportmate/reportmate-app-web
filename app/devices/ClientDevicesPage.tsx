"use client"

import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { formatRelativeTime } from "../../src/lib/time"
import { calculateDeviceStatus } from "../../src/lib/data-processing"
import { CopyButton } from "../../src/components/ui/CopyButton"
import { normalizeKeys } from "../../src/lib/utils/powershell-parser"
import { PlatformBadge } from "../../src/components/ui/PlatformBadge"
import { FitText } from "../../src/components/ui/FitText"
import { usePlatformFilterSafe, getDevicePlatform } from "../../src/providers/PlatformFilterProvider"

interface InventoryItem {
  id: string
  deviceId: string
  deviceName: string
  serialNumber: string
  lastSeen: string
  collectedAt: string
  createdAt?: string
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
  archived?: boolean
  platform?: string
  raw?: any
}

function DevicesPageContent() {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [usageFilter, setUsageFilter] = useState<string>('all')
  const [catalogFilter, setCatalogFilter] = useState<string>('all')
  const [sortColumn, setSortColumn] = useState<string>('deviceName')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const searchParams = useSearchParams()
  const { platformFilter, isPlatformVisible } = usePlatformFilterSafe()

  // Initialize search query and filters from URL parameters
  useEffect(() => {
    try {
      const urlSearch = searchParams.get('search')
      if (urlSearch) {
        setSearchQuery(urlSearch)
      }
      
      const urlStatus = searchParams.get('status')
      if (urlStatus && ['active', 'stale', 'missing'].includes(urlStatus.toLowerCase())) {
        setStatusFilter(urlStatus.toLowerCase())
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
        const response = await fetch('/api/devices', {
          credentials: 'include'
        })
        const data = await response.json()
        
        // FIXED: API returns {devices: [...], count: N} structure
        const devices = data.devices || []
        
        if (Array.isArray(devices) && devices.length > 0) {
          // FIXED: Process devices with correct nested structure from modules.inventory
          const inventoryItems = devices.map((device: any) => {
            // Extract inventory data from modules (where it actually lives)
            // Normalize snake_case to camelCase (API returns asset_tag, device_name, etc.)
            const rawInventory = device.modules?.inventory || {}
            const inventory = normalizeKeys(rawInventory) as any
            const isArchived = device.archived === true
            
            // Calculate status from lastSeen timestamp
            const calculatedStatus = calculateDeviceStatus(device.lastSeen, {}, isArchived)
            
            return {
              id: device.serialNumber || device.deviceId,
              deviceId: device.deviceId,
              // Get deviceName from modules.inventory.deviceName
              deviceName: inventory.deviceName || device.modules?.hardware?.system?.computer_name || device.modules?.hardware?.system?.hostname || device.serialNumber,
              serialNumber: device.serialNumber,
              lastSeen: device.lastSeen,
              collectedAt: device.lastSeen,
              createdAt: device.createdAt,  // Registration date from API
              // Extract all inventory fields from modules.inventory
              assetTag: inventory.assetTag,
              location: inventory.location,
              usage: inventory.usage,
              catalog: inventory.catalog,
              department: inventory.department,
              owner: inventory.owner,
              computerName: inventory.deviceName,
              domain: inventory.domain,
              organizationalUnit: inventory.organizationalUnit,
              manufacturer: inventory.manufacturer,
              model: inventory.model,
              uuid: inventory.uuid || device.deviceId,
              archived: isArchived,
              platform: getDevicePlatform(device),
              raw: { ...device, status: calculatedStatus }
            }
          })
          
                    setInventory(inventoryItems)
        } else {
                    setInventory([])
        }
      } catch (err) {
        console.error('Error fetching inventory:', err)
        setError('Failed to fetch inventory data')
      } finally {
        setLoading(false)
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
      
      // Apply status filter first
      if (statusFilter !== 'all') {
        // Show non-archived devices matching the status
        filtered = filtered.filter(item => {
          try {
            if (item.archived) return false // Never show archived in status filters
            const status = item.raw?.status?.toLowerCase()
            return status === statusFilter
          } catch (e) {
            console.warn('Error checking item status:', item, e)
            return false
          }
        })
      } else {
        // If status is 'all', exclude archived devices by default
        filtered = filtered.filter(item => !item.archived)
      }
      
      // Apply usage filter
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
      
      // Apply global platform filter
      if (platformFilter !== 'all') {
        filtered = filtered.filter(item => isPlatformVisible(item.platform || ''))
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
      
      // Remove duplicates based on serialNumber
      const uniqueFiltered = filtered.reduce((unique: InventoryItem[], item: InventoryItem) => {
        if (!unique.some(existingItem => existingItem.serialNumber === item.serialNumber)) {
          unique.push(item)
        }
        return unique
      }, [])
      
      // Apply sorting
      const sorted = [...uniqueFiltered].sort((a, b) => {
        let aValue: any
        let bValue: any
        
        switch (sortColumn) {
          case 'deviceName':
            aValue = a.deviceName?.toLowerCase() || ''
            bValue = b.deviceName?.toLowerCase() || ''
            break
          case 'assetTag':
            aValue = a.assetTag?.toLowerCase() || ''
            bValue = b.assetTag?.toLowerCase() || ''
            break
          case 'serialNumber':
            aValue = a.serialNumber?.toLowerCase() || ''
            bValue = b.serialNumber?.toLowerCase() || ''
            break
          case 'usage':
            aValue = a.usage?.toLowerCase() || ''
            bValue = b.usage?.toLowerCase() || ''
            break
          case 'catalog':
            aValue = a.catalog?.toLowerCase() || ''
            bValue = b.catalog?.toLowerCase() || ''
            break
          case 'location':
            aValue = a.location?.toLowerCase() || ''
            bValue = b.location?.toLowerCase() || ''
            break
          case 'createdAt':
            aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0
            bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0
            break
          case 'status':
            aValue = a.raw?.status?.toLowerCase() || ''
            bValue = b.raw?.status?.toLowerCase() || ''
            break
          default:
            return 0
        }
        
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
      
                  
      return sorted
    } catch (e) {
      console.error('Error in filteredInventory:', e)
      return []
    }
  })()
  
  // Handle column header click for sorting
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle direction if clicking same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // New column, default to ascending
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  // Calculate base counts (without filters) for reference
  const getBaseCounts = () => {
    try {
      if (!Array.isArray(inventory)) return { all: 0 }
      
      // Remove duplicates first based on serialNumber
      const uniqueInventory = inventory.reduce((unique: InventoryItem[], item: InventoryItem) => {
        if (!unique.some(existingItem => existingItem.serialNumber === item.serialNumber)) {
          unique.push(item)
        }
        return unique
      }, [])
      
      return {
        all: uniqueInventory.length
      }
    } catch (e) {
      console.error('Error calculating base counts:', e)
      return { all: 0 }
    }
  }

  // Get filter counts from search-filtered inventory (dynamic based on current search)
  const getFilterCounts = () => {
    try {
      if (!Array.isArray(inventory)) return { 
        all: 0, assigned: 0, shared: 0, curriculum: 0, staff: 0, faculty: 0, kiosk: 0 
      }
      
      // Start with unique inventory (remove duplicates based on serialNumber)
      const uniqueInventory = inventory.reduce((unique: InventoryItem[], item: InventoryItem) => {
        if (!unique.some(existingItem => existingItem.serialNumber === item.serialNumber)) {
          unique.push(item)
        }
        return unique
      }, [])
      
      // Apply search filter to the unique inventory
      let searchFiltered = uniqueInventory
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        searchFiltered = uniqueInventory.filter(item => {
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
      
      // Calculate counts from search-filtered results
      return {
        all: searchFiltered.filter(item => !item.archived).length,
        active: searchFiltered.filter(item => 
          item.raw?.status?.toLowerCase() === 'active'
        ).length,
        stale: searchFiltered.filter(item => 
          item.raw?.status?.toLowerCase() === 'stale'
        ).length,
        missing: searchFiltered.filter(item => 
          item.raw?.status?.toLowerCase() === 'missing'
        ).length,
        assigned: searchFiltered.filter(item =>
          item.usage?.toLowerCase() === 'assigned'
        ).length,
        shared: searchFiltered.filter(item => 
          item.usage?.toLowerCase() === 'shared'
        ).length,
        curriculum: searchFiltered.filter(item => 
          item.catalog?.toLowerCase() === 'curriculum'
        ).length,
        staff: searchFiltered.filter(item => 
          item.catalog?.toLowerCase() === 'staff'
        ).length,
        faculty: searchFiltered.filter(item => 
          item.catalog?.toLowerCase() === 'faculty'
        ).length,
        kiosk: searchFiltered.filter(item => 
          item.catalog?.toLowerCase() === 'kiosk'
        ).length,
      }
    } catch (e) {
      console.error('Error calculating filter counts:', e)
      return { all: 0, active: 0, stale: 0, missing: 0, assigned: 0, shared: 0, curriculum: 0, staff: 0, faculty: 0, kiosk: 0 }
    }
  }

  const baseCounts = getBaseCounts()
  const filterCounts = getFilterCounts()
  const isFiltered = searchQuery.trim() || statusFilter !== 'all' || usageFilter !== 'all' || catalogFilter !== 'all'

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black">
        <div className="animate-pulse">
          {/* Content skeleton */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4 sm:pb-8 pt-4 sm:pt-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Header section skeleton */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-24 mb-2"></div>
                  <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-48"></div>
                </div>
                <div className="h-10 bg-gray-300 dark:bg-gray-600 rounded w-64"></div>
              </div>
              
              {/* Filter buttons skeleton */}
              <div className="border-b border-gray-200 dark:border-gray-600 px-4 lg:px-6 py-3 bg-gray-50 dark:bg-gray-700">
                <div className="flex flex-wrap gap-2">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-8 bg-gray-300 dark:bg-gray-600 rounded-lg w-20"></div>
                  ))}
                </div>
              </div>

              {/* Table skeleton */}
              <div className="overflow-auto max-h-[calc(100vh-16rem)] table-scrollbar">
                <table className="w-full relative">
                  <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="px-4 lg:px-6 py-3">
                        <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-20"></div>
                      </th>
                      <th className="px-4 lg:px-6 py-3">
                        <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
                      </th>
                      <th className="px-4 lg:px-6 py-3">
                        <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-24"></div>
                      </th>
                      <th className="px-4 lg:px-6 py-3">
                        <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-12"></div>
                      </th>
                      <th className="px-4 lg:px-6 py-3">
                        <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-14"></div>
                      </th>
                      <th className="px-4 lg:px-6 py-3">
                        <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
                      </th>
                      <th className="px-4 lg:px-6 py-3">
                        <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-12"></div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {[...Array(8)].map((_, i) => (
                      <tr key={i}>
                        <td className="px-4 lg:px-6 py-4">
                          <div className="space-y-2">
                            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-32"></div>
                            <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-24"></div>
                          </div>
                        </td>
                        <td className="px-4 lg:px-6 py-4">
                          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-20"></div>
                        </td>
                        <td className="px-4 lg:px-6 py-4">
                          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-28"></div>
                        </td>
                        <td className="px-4 lg:px-6 py-4">
                          <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded-full w-16"></div>
                        </td>
                        <td className="px-4 lg:px-6 py-4">
                          <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded-full w-18"></div>
                        </td>
                        <td className="px-4 lg:px-6 py-4">
                          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-24"></div>
                        </td>
                        <td className="px-4 lg:px-6 py-4">
                          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-8"></div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4 sm:pb-8 pt-4 sm:pt-8">
        {inventory.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 py-16">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No devices found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                No devices have been registered in fleet yet.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Endpoints Fleet: {filteredInventory.length} {isFiltered ? `of ${baseCounts.all}` : ''} devices
                  {isFiltered && (
                    <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
                      (filtered)
                    </span>
                  )}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {isFiltered 
                    ? `Showing filtered results from ${baseCounts.all} total devices`
                    : 'Manage and monitor all devices in fleet'
                  }
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
              <nav className="flex flex-wrap gap-2 items-center">
                {/* Status Filters */}
                {[
                  { key: 'active', label: 'Active', count: filterCounts.active, type: 'status', colors: 'bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200 dark:bg-emerald-900 dark:text-emerald-300 dark:border-emerald-600 dark:hover:bg-emerald-800' },
                  { key: 'stale', label: 'Stale', count: filterCounts.stale, type: 'status', colors: 'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200 dark:bg-amber-900 dark:text-amber-300 dark:border-amber-600 dark:hover:bg-amber-800' },
                  { key: 'missing', label: 'Missing', count: filterCounts.missing, type: 'status', colors: 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-800' },
                ].map((filter) => {
                  const isActive = statusFilter === filter.key
                  
                  return (
                    <button
                      key={filter.key}
                      onClick={() => setStatusFilter(statusFilter === filter.key ? 'all' : filter.key)}
                      className={`${
                        isActive
                          ? filter.colors
                          : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-500'
                      } px-3 py-1.5 border rounded-lg text-sm font-medium flex items-center gap-2 transition-colors`}
                    >
                      <span>{filter.label}</span>
                      <span className={`${
                        isActive 
                          ? 'bg-white/20 text-current'
                          : 'bg-gray-200 text-gray-700 dark:bg-gray-500 dark:text-gray-200'
                      } inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ml-1`}>
                        {filter.count}
                      </span>
                    </button>
                  )
                })}
                
                {/* Separator - Status/Usage */}
                <div className="flex items-center px-2">
                  <div className="h-6 w-px bg-gradient-to-b from-transparent via-gray-300 to-transparent dark:via-gray-500"></div>
                </div>
                
                {/* Usage Filters */}
                {[
                  { key: 'assigned', label: 'Assigned', count: filterCounts.assigned, type: 'usage', colors: 'bg-yellow-100 text-yellow-700 border-yellow-300 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-300 dark:border-yellow-600 dark:hover:bg-yellow-800' },
                  { key: 'shared', label: 'Shared', count: filterCounts.shared, type: 'usage', colors: 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-600 dark:hover:bg-blue-800' },
                ].map((filter) => {
                  const isActive = usageFilter === filter.key
                  
                  return (
                    <button
                      key={filter.key}
                      onClick={() => setUsageFilter(usageFilter === filter.key ? 'all' : filter.key)}
                      className={`${
                        isActive
                          ? filter.colors
                          : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-500'
                      } px-3 py-1.5 border rounded-lg text-sm font-medium flex items-center gap-2 transition-colors`}
                    >
                      <span>{filter.label}</span>
                      <span className={`${
                        isActive 
                          ? 'bg-white/20 text-current'
                          : 'bg-gray-200 text-gray-700 dark:bg-gray-500 dark:text-gray-200'
                      } inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ml-1`}>
                        {filter.count}
                      </span>
                    </button>
                  )
                })}
                
                {/* Separator - Usage/Catalog */}
                <div className="flex items-center px-2">
                  <div className="h-6 w-px bg-gradient-to-b from-transparent via-gray-300 to-transparent dark:via-gray-500"></div>
                </div>
                
                {/* Catalog Filters */}
                {[
                  { key: 'curriculum', label: 'Curriculum', count: filterCounts.curriculum, type: 'catalog', colors: 'bg-teal-100 text-teal-700 border-teal-300 hover:bg-teal-200 dark:bg-teal-900 dark:text-teal-300 dark:border-teal-600 dark:hover:bg-teal-800' },
                  { key: 'staff', label: 'Staff', count: filterCounts.staff, type: 'catalog', colors: 'bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200 dark:bg-orange-900 dark:text-orange-300 dark:border-orange-600 dark:hover:bg-orange-800' },
                  { key: 'faculty', label: 'Faculty', count: filterCounts.faculty, type: 'catalog', colors: 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200 dark:bg-red-900 dark:text-red-300 dark:border-red-600 dark:hover:bg-red-800' },
                  { key: 'kiosk', label: 'Kiosk', count: filterCounts.kiosk, type: 'catalog', colors: 'bg-cyan-100 text-cyan-700 border-cyan-300 hover:bg-cyan-200 dark:bg-cyan-900 dark:text-cyan-300 dark:border-cyan-600 dark:hover:bg-cyan-800' },
                ].map((filter) => {
                  const isActive = catalogFilter === filter.key
                  
                  return (
                    <button
                      key={filter.key}
                      onClick={() => setCatalogFilter(catalogFilter === filter.key ? 'all' : filter.key)}
                      className={`${
                        isActive
                          ? filter.colors
                          : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-500'
                      } px-3 py-1.5 border rounded-lg text-sm font-medium flex items-center gap-2 transition-colors`}
                    >
                      <span>{filter.label}</span>
                      <span className={`${
                        isActive 
                          ? 'bg-white/20 text-current'
                          : 'bg-gray-200 text-gray-700 dark:bg-gray-500 dark:text-gray-200'
                      } inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ml-1`}>
                        {filter.count}
                      </span>
                    </button>
                  )
                })}
              </nav>
            </div>

            <div className="overflow-auto max-h-[calc(100vh-16rem)] table-scrollbar">
              <table className="w-full relative">
                <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('deviceName')}
                        className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-100 transition-colors"
                      >
                        Device Name
                        {sortColumn === 'deviceName' && (
                          <span className="text-gray-400">
                            {sortDirection === 'asc' ? '' : ''}
                          </span>
                        )}
                      </button>
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('assetTag')}
                        className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-100 transition-colors"
                      >
                        Asset Tag
                        {sortColumn === 'assetTag' && (
                          <span className="text-gray-400">
                            {sortDirection === 'asc' ? '' : ''}
                          </span>
                        )}
                      </button>
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('serialNumber')}
                        className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-100 transition-colors"
                      >
                        Serial Number
                        {sortColumn === 'serialNumber' && (
                          <span className="text-gray-400">
                            {sortDirection === 'asc' ? '' : ''}
                          </span>
                        )}
                      </button>
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('usage')}
                        className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-100 transition-colors"
                      >
                        Usage
                        {sortColumn === 'usage' && (
                          <span className="text-gray-400">
                            {sortDirection === 'asc' ? '' : ''}
                          </span>
                        )}
                      </button>
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('catalog')}
                        className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-100 transition-colors"
                      >
                        Catalog
                        {sortColumn === 'catalog' && (
                          <span className="text-gray-400">
                            {sortDirection === 'asc' ? '' : ''}
                          </span>
                        )}
                      </button>
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('location')}
                        className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-100 transition-colors"
                      >
                        Location
                        {sortColumn === 'location' && (
                          <span className="text-gray-400">
                            {sortDirection === 'asc' ? '' : ''}
                          </span>
                        )}
                      </button>
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-36">
                      <button
                        onClick={() => handleSort('lastSeen')}
                        className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-100 transition-colors"
                      >
                        Last Seen
                        {sortColumn === 'lastSeen' && (
                          <span className="text-gray-400">
                            {sortDirection === 'asc' ? '' : ''}
                          </span>
                        )}
                      </button>
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('status')}
                        className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-100 transition-colors"
                      >
                        Status
                        {sortColumn === 'status' && (
                          <span className="text-gray-400">
                            {sortDirection === 'asc' ? '' : ''}
                          </span>
                        )}
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {error ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-12 h-12 mb-4 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <p className="text-base font-medium text-gray-900 dark:text-white mb-1">Failed to load devices</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{error}</p>
                          <button
                            onClick={() => window.location.reload()}
                            className="inline-flex items-center px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                          >
                            Try Again
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : filteredInventory.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
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
                    <tr key={`${item.serialNumber}-${item.id}`} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-4 lg:px-6 py-4" style={{ maxWidth: '220px' }}>
                        <div className="flex items-center gap-2">
                          <Link 
                            href={`/device/${encodeURIComponent(item.serialNumber)}`}
                            className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 min-w-0 flex-1"
                            title={item.deviceName || 'Unknown Device'}
                          >
                            <FitText minFontSize={11} maxFontSize={16}>
                              {item.deviceName || 'Unknown Device'}
                            </FitText>
                          </Link>
                          <PlatformBadge platform={item.platform || ''} size="sm" />
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="text-sm text-gray-900 dark:text-white font-mono">
                            {item.assetTag || '-'}
                          </div>
                          {item.assetTag && <CopyButton value={item.assetTag} />}
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="text-sm text-gray-900 dark:text-white font-mono">
                            {item.serialNumber}
                          </div>
                          <CopyButton value={item.serialNumber} />
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        {item.usage ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            item.usage.toLowerCase() === 'assigned' 
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          }`}>
                            {item.usage}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        {item.catalog ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            item.catalog.toLowerCase() === 'curriculum' 
                              ? 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200'
                              : item.catalog.toLowerCase() === 'staff'
                              ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                              : item.catalog.toLowerCase() === 'faculty'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              : item.catalog.toLowerCase() === 'kiosk'
                              ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                          }`}>
                            {item.catalog}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {item.location || '-'}
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4" style={{ maxWidth: '120px' }}>
                        <FitText minFontSize={10} maxFontSize={14} className="text-gray-500 dark:text-gray-400">
                          {item.lastSeen ? formatRelativeTime(item.lastSeen) : '-'}
                        </FitText>
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        {(() => {
                          // Use archived flag first, then status from API
                          const isArchived = item.archived === true
                          const status = isArchived ? 'archived' : (item.raw?.status || 'missing')
                          const getStatusColor = (status: string) => {
                            switch (status.toLowerCase()) {
                              case 'active':
                                return 'text-green-700 dark:text-green-400'
                              case 'stale':
                                return 'text-yellow-700 dark:text-yellow-400'
                              case 'archived':
                                return 'text-slate-500 dark:text-slate-400'
                              case 'missing':
                              default:
                                return 'text-gray-700 dark:text-gray-400'
                            }
                          }
                          
                          return (
                            <span 
                              className={`text-sm font-medium ${getStatusColor(status)}`}
                              title={isArchived ? 'Device is archived' : `Last seen: ${formatRelativeTime(item.lastSeen)}`}
                            >
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </span>
                          )
                        })()}
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

export default function ClientDevicesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-black">
        <div className="animate-pulse">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-32"></div>
          </div>
        </div>
      </div>
    }>
      <DevicesPageContent />
    </Suspense>
  )
}

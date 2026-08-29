"use client"

import { useEffect, useState, useMemo, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { formatRelativeTime } from "../../src/lib/time"
import { calculateDeviceStatus } from "../../src/lib/data-processing"
import { CopyButton } from "../../src/components/ui/CopyButton"
import { normalizeKeys } from "../../src/lib/utils/powershell-parser"
import { PlatformBadge } from "../../src/components/ui/PlatformBadge"
import { usePlatformFilterSafe, getDevicePlatform } from "../../src/providers/PlatformFilterProvider"
import DeviceFilters, { FilterOptions } from "../../src/components/shared/DeviceFilters"
import { useScrollCollapse } from "../../src/hooks/useScrollCollapse"

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
  department?: string
  area?: string
  fleet?: string
  computerName?: string
  hostname?: string
  domain?: string
  organizationalUnit?: string
  manufacturer?: string
  model?: string
  uuid?: string
  archived?: boolean
  platform?: string
  raw?: any
}

// Case-insensitive membership test — selections come from URL params and from
// inventory values that differ in casing between platforms.
const includesCI = (list: string[], value?: string | null) =>
  list.some(v => v.toLowerCase() === (value || '').toLowerCase())

function DevicesPageContent() {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [selectedUsages, setSelectedUsages] = useState<string[]>([])
  const [selectedCatalogs, setSelectedCatalogs] = useState<string[]>([])
  const [selectedAreas, setSelectedAreas] = useState<string[]>([])
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [selectedFleets, setSelectedFleets] = useState<string[]>([])
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [sortColumn, setSortColumn] = useState<string>('deviceName')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const searchParams = useSearchParams()
  const { platformFilter, isPlatformVisible } = usePlatformFilterSafe()

  const { tableContainerRef, effectiveFiltersExpanded } = useScrollCollapse(
    { filters: filtersExpanded },
    { enabled: !loading }
  )

  const toggleIn = (setter: React.Dispatch<React.SetStateAction<string[]>>) => (value: string) =>
    setter(prev => (includesCI(prev, value) ? prev.filter(v => v.toLowerCase() !== value.toLowerCase()) : [...prev, value]))

  const toggleStatus = toggleIn(setSelectedStatuses)
  const toggleUsage = toggleIn(setSelectedUsages)
  const toggleCatalog = toggleIn(setSelectedCatalogs)
  const toggleArea = toggleIn(setSelectedAreas)
  const toggleLocation = toggleIn(setSelectedLocations)
  const toggleFleet = toggleIn(setSelectedFleets)

  const clearAllSelections = () => {
    setSelectedStatuses([]); setSelectedUsages([]); setSelectedCatalogs([])
    setSelectedAreas([]); setSelectedLocations([]); setSelectedFleets([])
  }

  // Initialize search query and selections from URL parameters. Each dimension
  // accepts a comma-separated list so deep links can preselect more than one pill.
  useEffect(() => {
    try {
      const urlSearch = searchParams.get('search')
      if (urlSearch) {
        setSearchQuery(urlSearch)
      }

      const list = (key: string) =>
        (searchParams.get(key) || '').split(',').map(v => v.trim()).filter(Boolean)

      const status = list('status')
      if (status.length) setSelectedStatuses(status)
      const usage = list('usage')
      if (usage.length) setSelectedUsages(usage)
      const catalog = list('catalog')
      if (catalog.length) setSelectedCatalogs(catalog)
      const area = list('area')
      if (area.length) setSelectedAreas(area)
      const location = list('location')
      if (location.length) setSelectedLocations(location)
      const fleet = list('fleet')
      if (fleet.length) setSelectedFleets(fleet)
    } catch (e) {
      console.warn('Failed to get search params:', e)
    }
  }, [searchParams])

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const response = await fetch('/api/v1/devices', {
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
              // Area is a distinct inventory dimension where collected; every
              // other report falls back to department, so match that here.
              area: inventory.area || inventory.department,
              fleet: inventory.fleet,
              owner: inventory.owner,
              computerName: inventory.deviceName,
              hostname: device.hostname || device.modules?.network?.hostname,
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
          // Dedupe by serial number once at fetch time, so the render-path
          // filters and counters below never repeat the O(n^2) scan.
          const seen = new Set<string>()
          const uniqueItems = inventoryItems.filter((item: InventoryItem) => {
            if (!item.serialNumber || seen.has(item.serialNumber)) return false
            seen.add(item.serialNumber)
            return true
          })

          setInventory(uniqueItems)
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

  // Search predicate shared by the table filter and the counter row.
  const matchesSearch = (item: InventoryItem, query: string) => (
    item?.deviceName?.toLowerCase().includes(query) ||
    item?.assetTag?.toLowerCase().includes(query) ||
    item?.serialNumber?.toLowerCase().includes(query) ||
    item?.computerName?.toLowerCase().includes(query) ||
    item?.hostname?.toLowerCase().includes(query) ||
    item?.location?.toLowerCase().includes(query) ||
    item?.manufacturer?.toLowerCase().includes(query) ||
    item?.model?.toLowerCase().includes(query) ||
    item?.uuid?.toLowerCase().includes(query) ||
    item?.domain?.toLowerCase().includes(query) ||
    item?.organizationalUnit?.toLowerCase().includes(query)
  )

  // Filter inventory based on search query and filters. Memoized: with ~900
  // rows this previously re-ran (with an O(n^2) dedup) on every render.
  const filteredInventory = useMemo(() => {
    try {
      if (!Array.isArray(inventory)) {
        console.warn('Inventory is not an array:', inventory)
        return []
      }

      // Archived devices are never listed here regardless of selections
      let filtered = inventory.filter(item => !item.archived)

      // Apply the Selections accordion dimensions (multi-select, OR within a
      // dimension and AND across dimensions)
      if (selectedStatuses.length > 0) {
        filtered = filtered.filter(item => includesCI(selectedStatuses, item.raw?.status))
      }
      if (selectedUsages.length > 0) {
        filtered = filtered.filter(item => includesCI(selectedUsages, item.usage))
      }
      if (selectedCatalogs.length > 0) {
        filtered = filtered.filter(item => includesCI(selectedCatalogs, item.catalog))
      }
      if (selectedAreas.length > 0) {
        filtered = filtered.filter(item => includesCI(selectedAreas, item.area || item.department))
      }
      if (selectedLocations.length > 0) {
        filtered = filtered.filter(item => includesCI(selectedLocations, item.location))
      }
      if (selectedFleets.length > 0) {
        filtered = filtered.filter(item => includesCI(selectedFleets, item.fleet))
      }

      // Apply global platform filter
      if (platformFilter !== 'all') {
        filtered = filtered.filter(item => isPlatformVisible(item.platform || ''))
      }

      // Then apply search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        filtered = filtered.filter(item => matchesSearch(item, query))
      }

      // Apply sorting (inventory is already unique by serial number)
      const sorted = [...filtered].sort((a, b) => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inventory, selectedStatuses, selectedUsages, selectedCatalogs, selectedAreas, selectedLocations,
      selectedFleets, platformFilter, isPlatformVisible, searchQuery, sortColumn, sortDirection])

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

  // Base count (without filters) for reference; inventory is already unique.
  const baseCounts = useMemo(() => ({ all: Array.isArray(inventory) ? inventory.length : 0 }), [inventory])

  // Options offered by the Selections accordion, drawn from the live inventory
  // so a dimension with no collected data hides itself rather than showing
  // dead pills.
  const filterOptions: FilterOptions = useMemo(() => {
    const active = Array.isArray(inventory) ? inventory.filter(i => !i.archived) : []
    const distinct = (pick: (item: InventoryItem) => string | undefined | null) =>
      Array.from(new Set(active.map(pick).filter(Boolean) as string[])).sort()
    return {
      statuses: distinct(i => i.raw?.status),
      usages: distinct(i => i.usage),
      catalogs: distinct(i => i.catalog),
      areas: distinct(i => i.area || i.department),
      locations: distinct(i => i.location),
      fleets: distinct(i => i.fleet),
    }
  }, [inventory])

  // Device count per location drives proportional pill sizing in the accordion
  const locationCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    if (Array.isArray(inventory)) {
      inventory.forEach(item => {
        if (!item.archived && item.location) counts[item.location] = (counts[item.location] || 0) + 1
      })
    }
    return counts
  }, [inventory])

  const totalSelections = selectedStatuses.length + selectedUsages.length + selectedCatalogs.length +
    selectedAreas.length + selectedLocations.length + selectedFleets.length
  const isFiltered = Boolean(searchQuery.trim()) || totalSelections > 0

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black">
        <div className="animate-pulse">
          {/* Content skeleton */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4 sm:pb-8 pt-4 sm:pt-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Header section skeleton — title, subtitle, search box */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="space-y-2">
                  <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-64"></div>
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-72"></div>
                </div>
                <div className="h-9 bg-gray-300 dark:bg-gray-600 rounded-lg w-64"></div>
              </div>

              {/* Selections accordion skeleton — collapsed, matching the real header bar */}
              <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex items-center justify-between">
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-20"></div>
                <div className="h-5 w-5 bg-gray-300 dark:bg-gray-600 rounded"></div>
              </div>

              {/* Table skeleton — same eight columns the loaded table renders */}
              <div className="overflow-auto max-h-[calc(100vh-16rem)] table-scrollbar">
                <table className="w-full relative">
                  <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10 shadow-sm">
                    <tr>
                      {['w-24', 'w-16', 'w-24', 'w-12', 'w-14', 'w-16', 'w-16', 'w-12'].map((width, i) => (
                        <th key={i} className="px-4 lg:px-6 py-3 text-left">
                          <div className={`h-3 bg-gray-300 dark:bg-gray-600 rounded ${width}`}></div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {/* Enough rows to fill a typical viewport, so the card does not
                        visibly grow when the real rows arrive */}
                    {[...Array(15)].map((_, i) => (
                      <tr key={i}>
                        {/* Device name + platform badge */}
                        <td className="px-4 lg:px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-32"></div>
                            <div className="h-4 w-4 bg-gray-300 dark:bg-gray-600 rounded flex-shrink-0"></div>
                          </div>
                        </td>
                        {/* Asset tag + copy button */}
                        <td className="px-4 lg:px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-20"></div>
                            <div className="h-3 w-3 bg-gray-300 dark:bg-gray-600 rounded flex-shrink-0"></div>
                          </div>
                        </td>
                        {/* Serial number + copy button */}
                        <td className="px-4 lg:px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-24"></div>
                            <div className="h-3 w-3 bg-gray-300 dark:bg-gray-600 rounded flex-shrink-0"></div>
                          </div>
                        </td>
                        {/* Usage pill */}
                        <td className="px-4 lg:px-6 py-4">
                          <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded-full w-16"></div>
                        </td>
                        {/* Catalog pill */}
                        <td className="px-4 lg:px-6 py-4">
                          <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded-full w-20"></div>
                        </td>
                        {/* Location */}
                        <td className="px-4 lg:px-6 py-4">
                          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-12"></div>
                        </td>
                        {/* Last seen */}
                        <td className="px-4 lg:px-6 py-4">
                          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-20"></div>
                        </td>
                        {/* Status */}
                        <td className="px-4 lg:px-6 py-4">
                          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-12"></div>
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
            
            {/* Selections accordion (shared component, same as every other report) */}
            <DeviceFilters
              filterOptions={filterOptions}
              selectedStatuses={selectedStatuses}
              selectedCatalogs={selectedCatalogs}
              selectedAreas={selectedAreas}
              selectedLocations={selectedLocations}
              selectedFleets={selectedFleets}
              selectedUsages={selectedUsages}
              onStatusToggle={toggleStatus}
              onCatalogToggle={toggleCatalog}
              onAreaToggle={toggleArea}
              onLocationToggle={toggleLocation}
              onFleetToggle={toggleFleet}
              onUsageToggle={toggleUsage}
              onClearAll={clearAllSelections}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              expanded={effectiveFiltersExpanded}
              onToggle={() => setFiltersExpanded(!filtersExpanded)}
              locationCounts={locationCounts}
            />

            <div ref={tableContainerRef} className="overflow-auto max-h-[calc(100vh-16rem)] table-scrollbar">
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
                            <TailTruncate text={item.deviceName || 'Unknown Device'} />
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
                        <span className="block truncate text-sm text-gray-500 dark:text-gray-400">
                          {item.lastSeen ? formatRelativeTime(item.lastSeen) : '-'}
                        </span>
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

// Truncate in the middle so a numbered name keeps its number: the head
// ellipsises, the last three characters always stay put.
function TailTruncate({ text, keep = 3 }: { text: string; keep?: number }) {
  if (text.length <= keep + 1) return <span className="block truncate">{text}</span>
  return (
    <span className="flex min-w-0">
      <span className="truncate">{text.slice(0, -keep)}</span>
      <span className="shrink-0">{text.slice(-keep)}</span>
    </span>
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

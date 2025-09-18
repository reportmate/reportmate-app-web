"use client"

import { useState, useEffect, Suspense, useMemo } from 'react'
import Link from 'next/link'
import { DevicePageNavigation } from '../../../src/components/navigation/DevicePageNavigation'
import { formatRelativeTime } from '../../../src/lib/time'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

interface FilterOptions {
  managedInstalls: string[]
  otherInstalls: string[]
  totalManagedInstalls: number
  totalOtherInstalls: number
  usages: string[]
  catalogs: string[]
  rooms: string[]
  fleets: string[]
  devicesWithData: number
}

interface InstallRecord {
  id: string
  deviceId: string
  deviceName: string
  serialNumber: string
  lastSeen: string
  name: string
  version?: string
  status?: string
  source?: string
  usage?: string
  catalog?: string
  room?: string
  fleet?: string
}

function InstallsPageContent() {
  const [installs, setInstalls] = useState<InstallRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [filtersLoading, setFiltersLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Filter state
  const [selectedInstalls, setSelectedInstalls] = useState<string[]>([])
  const [selectedUsages, setSelectedUsages] = useState<string[]>([])
  const [selectedCatalogs, setSelectedCatalogs] = useState<string[]>([])
  const [selectedRooms, setSelectedRooms] = useState<string[]>([])
  const [selectedFleets, setSelectedFleets] = useState<string[]>([])
  
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    managedInstalls: [],
    otherInstalls: [],
    totalManagedInstalls: 0,
    totalOtherInstalls: 0,
    usages: [],
    catalogs: [],
    rooms: [],
    fleets: [],
    devicesWithData: 0
  })

  // Filter toggle functions
  const toggleInstall = (install: string) => {
    setSelectedInstalls(prev => 
      prev.includes(install) 
        ? prev.filter(s => s !== install)
        : [...prev, install]
    )
  }

  const toggleUsage = (usage: string) => {
    setSelectedUsages(prev => 
      prev.includes(usage.toLowerCase()) 
        ? prev.filter(u => u !== usage.toLowerCase())
        : [...prev, usage.toLowerCase()]
    )
  }

  const toggleCatalog = (catalog: string) => {
    setSelectedCatalogs(prev => 
      prev.includes(catalog.toLowerCase()) 
        ? prev.filter(c => c !== catalog.toLowerCase())
        : [...prev, catalog.toLowerCase()]
    )
  }

  const toggleRoom = (room: string) => {
    setSelectedRooms(prev => 
      prev.includes(room) 
        ? prev.filter(r => r !== room)
        : [...prev, room]
    )
  }

  const toggleFleet = (fleet: string) => {
    setSelectedFleets(prev => 
      prev.includes(fleet) 
        ? prev.filter(f => f !== fleet)
        : [...prev, fleet]
    )
  }

  const clearAllFilters = () => {
    setSelectedInstalls([])
    setSelectedUsages([])
    setSelectedCatalogs([])
    setSelectedRooms([])
    setSelectedFleets([])
  }

  // Fetch filter options
  const fetchFilterOptions = async () => {
    try {
      setFiltersLoading(true)
      
      const response = await fetch('/api/devices/installs/filters', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      
      if (!response.ok) {
        // Fallback to applications filters if installs not available
        console.warn('Installs filters not available, using applications as fallback')
        const fallbackResponse = await fetch('/api/devices/applications/filters')
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json()
          setFilterOptions({
            managedInstalls: fallbackData.managedApplications || [],
            otherInstalls: fallbackData.otherApplications || [],
            totalManagedInstalls: fallbackData.totalManagedApplications || 0,
            totalOtherInstalls: fallbackData.totalOtherApplications || 0,
            usages: fallbackData.usages || [],
            catalogs: fallbackData.catalogs || [],
            rooms: fallbackData.rooms || [],
            fleets: fallbackData.fleets || [],
            devicesWithData: fallbackData.devicesWithData || 0
          })
        }
        return
      }

      const data = await response.json()
      setFilterOptions(data)
    } catch (error) {
      console.error('Error fetching filter options:', error)
      setError('Failed to load filter options')
    } finally {
      setFiltersLoading(false)
    }
  }

  // Generate report function
  const handleGenerateReport = async () => {
    if (selectedInstalls.length === 0) {
      setError('Please select at least one install to generate the report.')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      selectedInstalls.forEach(install => params.append('installs', install))
      selectedUsages.forEach(usage => params.append('usages', usage))
      selectedCatalogs.forEach(catalog => params.append('catalogs', catalog))
      selectedRooms.forEach(room => params.append('rooms', room))
      selectedFleets.forEach(fleet => params.append('fleets', fleet))

      const response = await fetch(`/api/devices/installs?${params}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setInstalls(data)
    } catch (error) {
      console.error('Error generating installs report:', error)
      setError(error instanceof Error ? error.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Filter installs based on search query
  const filteredInstalls = useMemo(() => {
    if (!searchQuery) return installs
    
    return installs.filter(install => 
      install.deviceName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      install.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      install.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      install.version?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      install.source?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [installs, searchQuery])

  useEffect(() => {
    fetchFilterOptions()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
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
                {/* Installs Icon - Emerald color and correct path */}
                <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                    Installs Report
                  </h1>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <div className="hidden lg:flex">
                <DevicePageNavigation className="flex items-center gap-2" />
              </div>
              <div className="lg:hidden">
                <DevicePageNavigation className="flex items-center gap-2" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4 sm:pb-8 pt-4 sm:pt-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Installs Report {filteredInstalls.length > 0 && `(${filteredInstalls.length})`}
                {(selectedInstalls.length > 0 || selectedUsages.length > 0 || selectedCatalogs.length > 0 || selectedRooms.length > 0 || selectedFleets.length > 0) && installs.length > 0 && (
                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
                    (filtered)
                  </span>
                )}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {installs.length === 0 
                  ? 'Select managed installs and criteria to generate report'
                  : `Showing ${filteredInstalls.length} of ${installs.length} install records`
                }
              </p>
            </div>
            
            {/* Action Section */}
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
                  placeholder="Search to filter installs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-64 pl-10 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
              
              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {filteredInstalls.length > 0 && (
                  <button
                    onClick={() => {
                      const csvContent = [
                        ['Device Name', 'Serial Number', 'Install', 'Version', 'Status', 'Source', 'Usage', 'Catalog', 'Room', 'Fleet', 'Last Seen'].join(','),
                        ...filteredInstalls.map(install => [
                          install.deviceName,
                          install.serialNumber,
                          install.name,
                          install.version || '',
                          install.status || '',
                          install.source || '',
                          install.usage || '',
                          install.catalog || '',
                          install.room || '',
                          install.fleet || '',
                          formatRelativeTime(install.lastSeen)
                        ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
                      ].join('\n')
                      
                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
                      const link = document.createElement('a')
                      const url = URL.createObjectURL(blob)
                      link.setAttribute('href', url)
                      link.setAttribute('download', `installs-report-${new Date().toISOString().split('T')[0]}.csv`)
                      link.style.visibility = 'hidden'
                      document.body.appendChild(link)
                      link.click()
                      document.body.removeChild(link)
                    }}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export CSV
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg dark:bg-red-900 dark:border-red-700 dark:text-red-200">
              {error}
            </div>
          )}

          {/* Filter Clouds Section */}
          {!filtersLoading && (
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700">
              <div className="space-y-4">
                
                {/* Inventory Filter Sections - Top */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* Usage Filter */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Usage {selectedUsages.length > 0 && `(${selectedUsages.length} selected)`}
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {(filterOptions.usages || []).map(usage => (
                        <button
                          key={usage}
                          onClick={() => toggleUsage(usage)}
                          className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                            selectedUsages.includes(usage.toLowerCase())
                              ? 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-600'
                              : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-500'
                          }`}
                        >
                          {usage}
                        </button>
                      ))}
                      {(!filterOptions.usages || filterOptions.usages.length === 0) && (
                        <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                          No usage data available
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Catalog Filter */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Catalog {selectedCatalogs.length > 0 && `(${selectedCatalogs.length} selected)`}
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {(filterOptions.catalogs || []).map(catalog => (
                        <button
                          key={catalog}
                          onClick={() => toggleCatalog(catalog)}
                          className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                            selectedCatalogs.includes(catalog.toLowerCase())
                              ? 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-900 dark:text-teal-200 dark:border-teal-600'
                              : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-500'
                          }`}
                        >
                          {catalog}
                        </button>
                      ))}
                      {(!filterOptions.catalogs || filterOptions.catalogs.length === 0) && (
                        <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                          No catalog data available
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Fleet Filter */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Fleet {selectedFleets.length > 0 && `(${selectedFleets.length} selected)`}
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {(filterOptions.fleets || []).map(fleet => (
                        <button
                          key={fleet}
                          onClick={() => toggleFleet(fleet)}
                          className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                            selectedFleets.includes(fleet)
                              ? 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900 dark:text-orange-200 dark:border-orange-600'
                              : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-500'
                          }`}
                        >
                          {fleet}
                        </button>
                      ))}
                      {(!filterOptions.fleets || filterOptions.fleets.length === 0) && (
                        <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                          No fleet data available
                        </span>
                      )}
                    </div>
                  </div>

                </div>

                {/* Room Filter Cloud - Full Width */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Room {selectedRooms.length > 0 && `(${selectedRooms.length} selected)`}
                    </h3>
                  </div>
                  <div className="h-20 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-800">
                    <div className="flex flex-wrap gap-1">
                      {(filterOptions.rooms || [])
                        .filter(room => room.toLowerCase().includes(searchQuery.toLowerCase()))
                        .slice(0, 200).map(room => (
                        <button
                          key={room}
                          onClick={() => toggleRoom(room)}
                          className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                            selectedRooms.includes(room)
                              ? 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900 dark:text-purple-200 dark:border-purple-600'
                              : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-500'
                          }`}
                        >
                          {room}
                        </button>
                      ))}
                      {(filterOptions.rooms || []).filter(room => room.toLowerCase().includes(searchQuery.toLowerCase())).length > 200 && (
                        <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                          +{(filterOptions.rooms || []).filter(room => room.toLowerCase().includes(searchQuery.toLowerCase())).length - 200} more (search to filter)
                        </span>
                      )}
                      {(!filterOptions.rooms || filterOptions.rooms.length === 0) && (
                        <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                          No room data available
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Installs Filter Cloud - SMART FILTERING */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Installs {selectedInstalls.length > 0 && `(${selectedInstalls.length} selected)`}
                    </h3>
                    {(filterOptions.managedInstalls || []).length > 0 && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {(filterOptions.managedInstalls || []).length} managed • {(filterOptions.otherInstalls || []).length} unmanaged
                      </span>
                    )}
                  </div>
                  <div className="h-32 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-800">
                    <div className="flex flex-wrap gap-1">
                      
                      {/* Managed Installs */}
                      {(filterOptions.managedInstalls || [])
                        .filter((name: string) => name.toLowerCase().includes(searchQuery.toLowerCase()))
                        .slice(0, 100).map((install: string) => (
                        <button
                          key={install}
                          onClick={() => toggleInstall(install)}
                          className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                            selectedInstalls.includes(install)
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900 dark:text-emerald-200 dark:border-emerald-600'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-800/50 dark:text-emerald-300 dark:border-emerald-600 dark:hover:bg-emerald-800'
                          }`}
                        >
                          {install} ⭐
                        </button>
                      ))}
                      
                      {/* Other Installs */}
                      {(filterOptions.otherInstalls || [])
                        .filter((name: string) => name.toLowerCase().includes(searchQuery.toLowerCase()))
                        .slice(0, 100).map((install: string) => (
                        <button
                          key={install}
                          onClick={() => toggleInstall(install)}
                          className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                            selectedInstalls.includes(install)
                              ? 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600'
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 dark:hover:bg-gray-700'
                          }`}
                        >
                          {install}
                        </button>
                      ))}
                      
                      {((!filterOptions.managedInstalls || filterOptions.managedInstalls.length === 0) && (!filterOptions.otherInstalls || filterOptions.otherInstalls.length === 0)) && (
                        <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                          No installs data available
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Main Action Buttons - Positioned Under Filters */}
                <div className="flex justify-center gap-3">
                  <button
                    onClick={handleGenerateReport}
                    disabled={loading || selectedInstalls.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm rounded-lg transition-colors"
                  >
                    {loading && <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>}
                    Generate Report
                  </button>
                  
                  {(selectedInstalls.length > 0 || selectedUsages.length > 0 || selectedCatalogs.length > 0 || selectedRooms.length > 0 || selectedFleets.length > 0) && (
                    <button
                      onClick={clearAllFilters}
                      className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded-lg transition-colors"
                    >
                      Clear All Filters
                    </button>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* Loading State */}
          {filtersLoading && (
            <div className="px-6 py-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Loading filter options...</p>
            </div>
          )}

          {/* Results Section */}
          {installs.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Device</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Install</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Version</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Source</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Inventory</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Last Seen</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredInstalls.map((install) => (
                    <tr key={install.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{install.deviceName}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{install.serialNumber}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">{install.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">{install.version || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          install.status === 'installed' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : install.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {install.status || 'unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">{install.source || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {install.usage && <div>{install.usage}</div>}
                          {install.catalog && <div>{install.catalog}</div>}
                          {install.room && <div>{install.room}</div>}
                          {install.fleet && <div>{install.fleet}</div>}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">{formatRelativeTime(install.lastSeen)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Empty State - Only show when not loading and no installs */}
          {!filtersLoading && installs.length === 0 && (
            <div className="px-6 py-12 text-center">
            <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Generate Your Installs Report
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Select managed installs from the filter clouds above and click "Generate Report" to view installation data across your devices.
            </p>
          </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function InstallsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading installs...</p>
        </div>
      </div>
    }>
      <InstallsPageContent />
    </Suspense>
  )
}
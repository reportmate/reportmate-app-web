"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { extractNetwork } from "../../../src/lib/data-processing/modules/network"
import { useDeviceData } from "../../../src/hooks/useDeviceData"
import { usePlatformFilterSafe, getDevicePlatform } from "../../../src/providers/PlatformFilterProvider"
import { Copy } from "lucide-react"

interface NetworkDevice {
  id: string
  deviceId: string
  deviceName: string
  serialNumber: string
  assetTag?: string
  lastSeen: string
  collectedAt: string
  operatingSystem: string
  osVersion: string | null
  buildNumber: string | null
  uptime: number | null
  bootTime: string | null
  raw: any
}

function NetworkPageContent() {
  const [networkDevices, setNetworkDevices] = useState<NetworkDevice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [connectionFilter, setConnectionFilter] = useState<'all' | 'wired' | 'wireless'>('all')
  const searchParams = useSearchParams()
  const { platformFilter, isPlatformVisible } = usePlatformFilterSafe()
  
  // Sorting state
  const [sortColumn, setSortColumn] = useState<'device' | 'ip' | 'mac' | 'network'>('device')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  
  // Filters accordion state
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [widgetsExpanded, setWidgetsExpanded] = useState(true)
  const [selectedUsages, setSelectedUsages] = useState<string[]>([])
  const [selectedCatalogs, setSelectedCatalogs] = useState<string[]>([])
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  
  const handleSort = (column: typeof sortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  // Toggle functions for filters
  const toggleUsage = (usage: string) => {
    setSelectedUsages(prev => 
      prev.includes(usage) ? prev.filter(u => u !== usage) : [...prev, usage]
    )
  }
  
  const toggleCatalog = (catalog: string) => {
    setSelectedCatalogs(prev => 
      prev.includes(catalog) ? prev.filter(c => c !== catalog) : [...prev, catalog]
    )
  }
  
  const toggleLocation = (location: string) => {
    setSelectedLocations(prev => 
      prev.includes(location) ? prev.filter(l => l !== location) : [...prev, location]
    )
  }
  
  const clearAllFilters = () => {
    setSelectedUsages([])
    setSelectedCatalogs([])
    setSelectedLocations([])
    setConnectionFilter('all')
    setSearchQuery('')
  }
  
  const totalActiveFilters = selectedUsages.length + selectedCatalogs.length + selectedLocations.length + 
    (connectionFilter !== 'all' ? 1 : 0)

  // Use useDeviceData hook to get devices with inventory data
  const { devices } = useDeviceData({
    includeModuleData: false
  })

  useEffect(() => {
    const urlSearch = searchParams.get('search')
    if (urlSearch) setSearchQuery(urlSearch)
  }, [searchParams])

  useEffect(() => {
    const fetchNetworkDevices = async () => {
      try {
        // Use the network API to get device data with network modules
        const response = await fetch('/api/modules/network', {
          cache: 'no-store',
          credentials: 'include',
          headers: { 'Cache-Control': 'no-cache' }
        })
        
        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`)
        }
        
        const data = await response.json()
        
        if (Array.isArray(data)) {
          setNetworkDevices(data)
          setError(null)
        } else {
          throw new Error('Invalid API response format')
        }
        
      } catch (error) {
        console.error('Failed to fetch network devices:', error)
        setError(error instanceof Error ? error.message : 'Unknown error')
        setNetworkDevices([])
      } finally {
        setLoading(false)
      }
    }

    fetchNetworkDevices()
  }, [])

  // Filter and process network devices
  const processedNetworkDevices = networkDevices.map(networkDevice => {
    // Create a device object in the format expected by extractNetwork
    const deviceData = {
      id: networkDevice.deviceId,
      name: networkDevice.deviceName,
      modules: networkDevice.raw ? { network: networkDevice.raw } : undefined
    }
    
    const networkInfo = extractNetwork(deviceData)
    
    return {
      ...networkDevice,
      networkInfo
    }
  })

  // Extract unique filter options from devices (inventory data)
  const filterOptions = {
    usages: Array.from(new Set(
      devices.map(d => d.modules?.inventory?.usage).filter(Boolean)
    )).sort() as string[],
    catalogs: Array.from(new Set(
      devices.map(d => d.modules?.inventory?.catalog).filter(Boolean)
    )).sort() as string[],
    locations: Array.from(new Set(
      devices.map(d => d.modules?.inventory?.location).filter(Boolean)
    )).sort() as string[]
  }

  // Calculate wireless statistics for widgets
  const wirelessStats = {
    // Wireless State counts
    wirelessOff: processedNetworkDevices.filter(n => {
      const state = n.networkInfo.wirelessState?.toLowerCase() || ''
      return state === 'off' || state === 'disabled'
    }).length,
    wirelessOn: processedNetworkDevices.filter(n => {
      const state = n.networkInfo.wirelessState?.toLowerCase() || ''
      return state === 'on' || state === 'enabled' || state === 'disconnected'
    }).length,
    wirelessConnected: processedNetworkDevices.filter(n => {
      const state = n.networkInfo.wirelessState?.toLowerCase() || ''
      const connectionType = n.networkInfo.connectionType?.toLowerCase() || ''
      return state === 'connected' || (connectionType.includes('wireless') || connectionType.includes('wifi'))
    }).length,
    
    // Network names and counts
    networkNames: processedNetworkDevices.reduce((acc, n) => {
      const ssid = n.networkInfo.ssid || n.networkInfo.networkName || 'Unknown'
      if (ssid && ssid !== 'Unknown' && ssid !== 'N/A') {
        acc[ssid] = (acc[ssid] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>),
    
    // Security types
    securityTypes: processedNetworkDevices.reduce((acc, n) => {
      const security = n.networkInfo.wirelessSecurity || n.networkInfo.securityType || 'Unknown'
      if (security && security !== 'Unknown' && security !== 'N/A') {
        acc[security] = (acc[security] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>),
    
    // Signal quality distribution
    signalExcellent: processedNetworkDevices.filter(n => {
      const signal = n.networkInfo.signalStrength || 0
      return signal >= 75
    }).length,
    signalGood: processedNetworkDevices.filter(n => {
      const signal = n.networkInfo.signalStrength || 0
      return signal >= 50 && signal < 75
    }).length,
    signalFair: processedNetworkDevices.filter(n => {
      const signal = n.networkInfo.signalStrength || 0
      return signal >= 25 && signal < 50
    }).length,
    signalPoor: processedNetworkDevices.filter(n => {
      const signal = n.networkInfo.signalStrength || 0
      return signal > 0 && signal < 25
    }).length
  }

  const filteredNetworkDevices = processedNetworkDevices.filter(n => {
    // Find the corresponding device from the main devices API to get inventory data
    const deviceFromMainAPI = devices.find(d => 
      d.deviceId === n.deviceId || 
      d.serialNumber === n.serialNumber
    )
    const inventory = deviceFromMainAPI?.modules?.inventory

    // Global platform filter first
    if (platformFilter) {
      const platform = getDevicePlatform(deviceFromMainAPI || n)
      if (!isPlatformVisible(platform)) {
        return false
      }
    }

    // Connection type filter
    if (connectionFilter !== 'all') {
      const connectionType = n.networkInfo.connectionType?.toLowerCase() || ''
      if (connectionFilter === 'wired') {
        if (!(connectionType.includes('ethernet') || connectionType.includes('wired'))) {
          return false
        }
      } else if (connectionFilter === 'wireless') {
        if (!(connectionType.includes('wireless') || connectionType.includes('wifi'))) {
          return false
        }
      }
    }

    // Inventory-based filters
    if (selectedUsages.length > 0 && !selectedUsages.includes(inventory?.usage || '')) return false
    if (selectedCatalogs.length > 0 && !selectedCatalogs.includes(inventory?.catalog || '')) return false
    if (selectedLocations.length > 0 && !selectedLocations.includes(inventory?.location || '')) return false

    // Search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      return (
        n.deviceName?.toLowerCase().includes(query) ||
        n.networkInfo.ipAddress?.toLowerCase().includes(query) ||
        n.networkInfo.macAddress?.toLowerCase().includes(query) ||
        n.networkInfo.ssid?.toLowerCase().includes(query) ||
        n.networkInfo.connectionType?.toLowerCase().includes(query) ||
        n.networkInfo.dnsAddress?.toLowerCase().includes(query) ||
        n.networkInfo.hostname?.toLowerCase().includes(query) ||
        n.serialNumber?.toLowerCase().includes(query) ||
        n.assetTag?.toLowerCase().includes(query) ||
        n.networkInfo.interfaces?.some((iface: any) => 
          iface.name?.toLowerCase().includes(query) ||
          iface.ipAddress?.toLowerCase().includes(query) ||
          iface.macAddress?.toLowerCase().includes(query)
        )
      )
    }
    return true
  }).sort((a, b) => {
    let aValue: string = ''
    let bValue: string = ''
    
    switch (sortColumn) {
      case 'device':
        aValue = a.deviceName?.toLowerCase() || ''
        bValue = b.deviceName?.toLowerCase() || ''
        break
      case 'ip':
        aValue = a.networkInfo.ipAddress?.toLowerCase() || ''
        bValue = b.networkInfo.ipAddress?.toLowerCase() || ''
        break
      case 'mac':
        aValue = a.networkInfo.macAddress?.toLowerCase() || ''
        bValue = b.networkInfo.macAddress?.toLowerCase() || ''
        break
      case 'network':
        aValue = a.networkInfo.ssid?.toLowerCase() || a.networkInfo.connectionType?.toLowerCase() || ''
        bValue = b.networkInfo.ssid?.toLowerCase() || b.networkInfo.connectionType?.toLowerCase() || ''
        break
    }
    
    if (sortDirection === 'asc') {
      return aValue.localeCompare(bValue)
    } else {
      return bValue.localeCompare(aValue)
    }
  })

  // Helper function to copy text to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }
  }

  // Helper function to get IPv4 address
  const getIPv4Address = (ipAddress: string | undefined): string | undefined => {
    if (!ipAddress || ipAddress === 'N/A') return undefined;
    
    // If it's a single IP, check if it's IPv4
    if (!ipAddress.includes(',')) {
      // IPv4 pattern: xxx.xxx.xxx.xxx
      const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
      return ipv4Pattern.test(ipAddress.trim()) ? ipAddress.trim() : undefined;
    }
    
    // If it's multiple IPs, find the first IPv4
    const ips = ipAddress.split(',').map(ip => ip.trim());
    const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    return ips.find(ip => ipv4Pattern.test(ip));
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-4rem)] bg-gray-50 dark:bg-black flex flex-col overflow-hidden">
        <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-0 flex flex-col min-h-0">
          <div className="flex-1 bg-white dark:bg-gray-800 rounded-t-xl shadow-sm border border-gray-200 dark:border-gray-700 border-b-0 flex flex-col min-h-0 overflow-hidden animate-pulse">
            {/* Title Skeleton */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <div className="h-6 w-48 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
                  <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
                <div className="flex items-center gap-4">
                  {/* Search skeleton */}
                  <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                  {/* Connection filters skeleton */}
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                    <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                  </div>
                  <div className="h-8 w-28 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                </div>
              </div>
            </div>

            {/* Selections Accordion Skeleton */}
            <div className="border-b border-gray-200 dark:border-gray-700">
              <div className="w-full px-6 py-3 flex items-center justify-between">
                <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            </div>

            {/* Widgets Accordion Skeleton */}
            <div className="border-b border-gray-200 dark:border-gray-700">
              <div className="w-full px-6 py-3 flex items-center justify-between">
                <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700/50">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                      <div className="h-4 w-24 bg-gray-200 dark:bg-gray-600 rounded mb-3"></div>
                      <div className="space-y-2">
                        {[1, 2, 3].map(j => (
                          <div key={j} className="flex items-center justify-between">
                            <div className="h-3 w-16 bg-gray-200 dark:bg-gray-600 rounded"></div>
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
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 w-48"><div className="h-4 w-16 bg-gray-300 dark:bg-gray-600 rounded"></div></th>
                    <th className="px-6 py-3 w-48"><div className="h-4 w-24 bg-gray-300 dark:bg-gray-600 rounded"></div></th>
                    <th className="px-6 py-3 w-32"><div className="h-4 w-20 bg-gray-300 dark:bg-gray-600 rounded"></div></th>
                    <th className="px-6 py-3 w-40"><div className="h-4 w-24 bg-gray-300 dark:bg-gray-600 rounded"></div></th>
                    <th className="px-6 py-3 w-44"><div className="h-4 w-24 bg-gray-300 dark:bg-gray-600 rounded"></div></th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {[...Array(8)].map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3 w-48">
                        <div className="flex flex-col justify-center h-12 space-y-1">
                          <div className="h-4 w-36 bg-gray-200 dark:bg-gray-700 rounded"></div>
                          <div className="h-3 w-28 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        </div>
                      </td>
                      <td className="px-6 py-3 w-48"><div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded"></div></td>
                      <td className="px-6 py-3 w-32"><div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div></td>
                      <td className="px-6 py-3 w-40"><div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div></td>
                      <td className="px-6 py-3 w-44"><div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* Commented out full-page error - using inline table error instead
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Error Loading Network Data</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }
  */

  return (
    <div className="h-[calc(100vh-4rem)] bg-gray-50 dark:bg-black flex flex-col overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-0 flex flex-col min-h-0">
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-t-xl shadow-sm border border-gray-200 dark:border-gray-700 border-b-0 flex flex-col min-h-0 overflow-hidden">
          {/* Title Section */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Network Configuration</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  IP addresses, MAC addresses, and connectivity status {filteredNetworkDevices.length} devices
                </p>
              </div>
              {loading ? (
                /* Loading Progress Bar */
                <div className="flex-1 min-w-0 ml-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 truncate">
                          Loading network data...
                        </p>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div className="bg-teal-600 h-2 rounded-full transition-all duration-1000 ease-out animate-pulse w-2/3"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  {/* Search Field */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Search devices, IPs, MACs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="block w-48 md:w-64 pl-10 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>
                  
                  {/* Connection Type Filters */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setConnectionFilter(connectionFilter === 'wired' ? 'all' : 'wired')}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                        connectionFilter === 'wired'
                          ? 'bg-green-100 border-green-300 text-green-800 dark:bg-green-900 dark:border-green-700 dark:text-green-200'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                      }`}
                    >
                      Wired
                    </button>
                    <button
                      onClick={() => setConnectionFilter(connectionFilter === 'wireless' ? 'all' : 'wireless')}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                        connectionFilter === 'wireless'
                          ? 'bg-teal-100 border-teal-300 text-teal-800 dark:bg-teal-900 dark:border-teal-700 dark:text-teal-200'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                      }`}
                    >
                      Wireless
                    </button>
                  </div>
                  
                  {/* Export to CSV Button */}
                  <button
                    onClick={() => {
                      // Build CSV from filtered data only
                      const headers = ['Device Name', 'Serial Number', 'Asset Tag', 'IP Address', 'MAC Address', 'Connection Type', 'Network/SSID', 'DNS']
                      const rows = filteredNetworkDevices.map(n => {
                        const ipv4 = getIPv4Address(n.networkInfo.ipAddress)
                        return [
                          n.deviceName || '',
                          n.serialNumber || '',
                          n.assetTag || '',
                          ipv4 || n.networkInfo.ipAddress || '',
                          n.networkInfo.macAddress || '',
                          n.networkInfo.connectionType || '',
                          n.networkInfo.ssid || '',
                          n.networkInfo.dnsAddress || ''
                        ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
                      })
                      
                      const csv = [headers.join(','), ...rows].join('\n')
                      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                      const url = URL.createObjectURL(blob)
                      const link = document.createElement('a')
                      link.href = url
                      link.download = `network-report-${new Date().toISOString().split('T')[0]}.csv`
                      document.body.appendChild(link)
                      link.click()
                      document.body.removeChild(link)
                      URL.revokeObjectURL(url)
                    }}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                    title="Export filtered devices to CSV"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export to CSV
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Filters Accordion Section */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Selections</span>
                {totalActiveFilters > 0 && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                    {totalActiveFilters} active
                  </span>
                )}
              </div>
              <svg 
                className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${filtersExpanded ? 'rotate-90' : 'rotate-180'}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            
            {filtersExpanded && (
              <div className="px-6 pb-4 space-y-4">
                {/* Usage Filter */}
                {filterOptions.usages.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Usage</div>
                    <div className="flex flex-wrap gap-2">
                      {filterOptions.usages.map(usage => (
                        <button
                          key={usage}
                          onClick={() => toggleUsage(usage)}
                          className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                            selectedUsages.includes(usage)
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700'
                              : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                          }`}
                        >
                          {usage}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Catalog Filter */}
                {filterOptions.catalogs.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Catalog</div>
                    <div className="flex flex-wrap gap-2">
                      {filterOptions.catalogs.map(catalog => (
                        <button
                          key={catalog}
                          onClick={() => toggleCatalog(catalog)}
                          className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                            selectedCatalogs.includes(catalog)
                              ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-200 border-teal-300 dark:border-teal-700'
                              : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                          }`}
                        >
                          {catalog}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Location Filter */}
                {filterOptions.locations.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Location</div>
                    <div className="flex flex-wrap gap-2">
                      {filterOptions.locations.map(location => (
                        <button
                          key={location}
                          onClick={() => toggleLocation(location)}
                          className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                            selectedLocations.includes(location)
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700'
                              : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                          }`}
                        >
                          {location}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Widgets Accordion */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setWidgetsExpanded(!widgetsExpanded)}
              className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Wireless State Widget */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Wireless State</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-gray-400"></div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">Off</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{wirelessStats.wirelessOff}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">On</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{wirelessStats.wirelessOn}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">Connected</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{wirelessStats.wirelessConnected}</span>
                      </div>
                    </div>
                  </div>

                  {/* Wireless Networks Widget */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Wireless Networks</h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {Object.entries(wirelessStats.networkNames).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => (
                        <div key={name} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-[120px]" title={name}>{name}</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{count}</span>
                        </div>
                      ))}
                      {Object.keys(wirelessStats.networkNames).length === 0 && (
                        <span className="text-sm text-gray-500 dark:text-gray-400">No networks detected</span>
                      )}
                    </div>
                  </div>

                  {/* Wireless Security Widget */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Wireless Security</h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {Object.entries(wirelessStats.securityTypes).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-[120px]" title={type}>{type}</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{count}</span>
                        </div>
                      ))}
                      {Object.keys(wirelessStats.securityTypes).length === 0 && (
                        <span className="text-sm text-gray-500 dark:text-gray-400">No data available</span>
                      )}
                    </div>
                  </div>

                  {/* Signal Quality Widget */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Signal Quality</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">Excellent</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{wirelessStats.signalExcellent}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-teal-500"></div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">Good</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{wirelessStats.signalGood}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">Fair</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{wirelessStats.signalFair}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">Poor</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{wirelessStats.signalPoor}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-auto min-h-0">
            <table className="min-w-full table-fixed divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
                <tr>
                  <th 
                    onClick={() => handleSort('device')}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-56 bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none"
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-48 bg-gray-50 dark:bg-gray-700">DNS Address</th>
                  <th 
                    onClick={() => handleSort('ip')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-32 bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none"
                  >
                    <div className="flex items-center gap-1">
                      IP Address
                      {sortColumn === 'ip' && (
                        <svg className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('mac')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-40 bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none"
                  >
                    <div className="flex items-center gap-1">
                      MAC Address
                      {sortColumn === 'mac' && (
                        <svg className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('network')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-44 bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none"
                  >
                    <div className="flex items-center gap-1">
                      Connection
                      {sortColumn === 'network' && (
                        <svg className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredNetworkDevices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                      </svg>
                      <p className="text-lg font-medium mb-1">No network devices found</p>
                      <p className="text-sm">Try adjusting your search criteria.</p>
                    </td>
                  </tr>
                ) : (
                  filteredNetworkDevices.map((networkDevice: NetworkDevice & { networkInfo: any }) => {
                    const ipv4Address = getIPv4Address(networkDevice.networkInfo.ipAddress)
                    
                    return (
                      <tr key={networkDevice.deviceId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-3 w-56">
                          <div className="flex flex-col justify-center h-12 min-w-0">
                            <Link
                              href={`/device/${encodeURIComponent(networkDevice.deviceId)}#network`}
                              className="group block min-w-0"
                              title={networkDevice.deviceName || 'Unknown Device'}
                            >
                              <span className="font-medium text-gray-900 group-hover:text-gray-700 dark:text-white dark:group-hover:text-gray-200 text-sm leading-tight block truncate">
                                {networkDevice.deviceName || 'Unknown Device'}
                              </span>
                            </Link>
                            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 font-mono leading-tight">
                              <span className="truncate max-w-32">{networkDevice.serialNumber}</span>
                              <button
                                onClick={() => copyToClipboard(networkDevice.serialNumber)}
                                className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
                                title="Copy serial number"
                              >
                                <Copy size={10} />
                              </button>
                              {networkDevice.assetTag && (
                                <>
                                  <span>|</span>
                                  <span className="truncate max-w-20">{networkDevice.assetTag}</span>
                                  <button
                                    onClick={() => copyToClipboard(networkDevice.assetTag!)}
                                    className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
                                    title="Copy asset tag"
                                  >
                                    <Copy size={10} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2 h-12">
                            <span className="text-sm text-gray-900 dark:text-white font-mono whitespace-nowrap">
                              {networkDevice.networkInfo.dnsAddress || networkDevice.networkInfo.hostname || 'N/A'}
                            </span>
                            {(networkDevice.networkInfo.dnsAddress || networkDevice.networkInfo.hostname) && (
                              <button
                                onClick={() => copyToClipboard(networkDevice.networkInfo.dnsAddress || networkDevice.networkInfo.hostname)}
                                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
                                title="Copy DNS address"
                              >
                                <Copy size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2 h-12">
                            <span className="text-sm text-gray-900 dark:text-white font-mono whitespace-nowrap">
                              {ipv4Address || networkDevice.networkInfo.ipAddress || 'N/A'}
                            </span>
                            {(ipv4Address || networkDevice.networkInfo.ipAddress) && (
                              <button
                                onClick={() => copyToClipboard(ipv4Address || networkDevice.networkInfo.ipAddress)}
                                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
                                title="Copy IP address"
                              >
                                <Copy size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2 h-12">
                            <span className="text-sm text-gray-900 dark:text-white font-mono whitespace-nowrap">
                              {networkDevice.networkInfo.macAddress || 'N/A'}
                            </span>
                            {networkDevice.networkInfo.macAddress && (
                              <button
                                onClick={() => copyToClipboard(networkDevice.networkInfo.macAddress)}
                                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
                                title="Copy MAC address"
                              >
                                <Copy size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex flex-col justify-center h-12">
                            {(() => {
                              // Detect connection types
                              const hasWired = networkDevice.networkInfo.connectionType && 
                                (networkDevice.networkInfo.connectionType.toLowerCase().includes('ethernet') || 
                                 networkDevice.networkInfo.connectionType.toLowerCase().includes('wired'));
                              
                              const hasWireless = networkDevice.networkInfo.ssid || 
                                networkDevice.networkInfo.networkName ||
                                (networkDevice.networkInfo.connectionType && 
                                 networkDevice.networkInfo.connectionType.toLowerCase().includes('wireless'));
                              
                              // Build connection display
                              const connections: string[] = [];
                              if (hasWired) connections.push('Wired');
                              if (hasWireless) {
                                const ssid = networkDevice.networkInfo.ssid || networkDevice.networkInfo.networkName;
                                connections.push(ssid ? ssid : 'Wireless');
                              }
                              
                              const connectionDisplay = connections.length > 0 ? connections.join(' + ') : 'N/A';
                              
                              // Get protocol/band for wireless
                              let protocolBand = null;
                              if (hasWireless) {
                                if (networkDevice.networkInfo.protocol) {
                                  protocolBand = networkDevice.networkInfo.protocol;
                                } else if (networkDevice.networkInfo.band) {
                                  protocolBand = networkDevice.networkInfo.band;
                                } else if (networkDevice.networkInfo.wirelessStandard) {
                                  protocolBand = networkDevice.networkInfo.wirelessStandard;
                                } else if (networkDevice.networkInfo.frequency) {
                                  protocolBand = networkDevice.networkInfo.frequency;
                                }
                                
                                if (!protocolBand && networkDevice.networkInfo.interfaces && Array.isArray(networkDevice.networkInfo.interfaces)) {
                                  const activeInterface = networkDevice.networkInfo.interfaces.find((iface: any) => 
                                    iface.isActive || iface.status === 'Active' || iface.status === 'Connected'
                                  );
                                  if (activeInterface) {
                                    if (activeInterface.wirelessProtocol && activeInterface.wirelessBand) {
                                      protocolBand = `${activeInterface.wirelessProtocol} - ${activeInterface.wirelessBand}`;
                                    } else if (activeInterface.wirelessProtocol) {
                                      protocolBand = activeInterface.wirelessProtocol;
                                    } else if (activeInterface.wirelessBand) {
                                      protocolBand = activeInterface.wirelessBand;
                                    }
                                  }
                                }
                                
                                if (protocolBand) {
                                  protocolBand = protocolBand.replace(/\s+\(([^)]+)\)$/, ' - $1');
                                }
                              }
                              
                              return (
                                <>
                                  <span className="text-sm text-gray-900 dark:text-white">{connectionDisplay}</span>
                                  {protocolBand && protocolBand !== 'N/A' && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400">{protocolBand}</span>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function NetworkPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-black animate-pulse"></div>}>
      <NetworkPageContent />
    </Suspense>
  )
}

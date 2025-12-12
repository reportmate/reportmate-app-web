"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { DevicePageNavigation } from "../../../src/components/navigation/DevicePageNavigation"
import { extractNetwork } from "../../../src/lib/data-processing/modules/network"
import { useDeviceData } from "../../../src/hooks/useDeviceData"
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
  
  // Sorting state
  const [sortColumn, setSortColumn] = useState<'device' | 'ip' | 'mac' | 'network'>('device')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  
  // Filters accordion state
  const [filtersExpanded, setFiltersExpanded] = useState(false)
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
        console.error('❌ Failed to fetch network devices:', error)
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

  const filteredNetworkDevices = processedNetworkDevices.filter(n => {
    // Find the corresponding device from the main devices API to get inventory data
    const deviceFromMainAPI = devices.find(d => 
      d.deviceId === n.deviceId || 
      d.serialNumber === n.serialNumber
    )
    const inventory = deviceFromMainAPI?.modules?.inventory

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
      <div className="min-h-screen bg-gray-50 dark:bg-black">
        <header className="bg-white dark:bg-gray-900 border-b animate-pulse">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
            <div className="h-5 w-5 bg-gray-300 dark:bg-gray-600 rounded"></div>
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
            <div className="h-5 w-16 bg-gray-300 dark:bg-gray-600 rounded"></div>
          </div>
        </header>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-0">
          <div className="bg-white dark:bg-gray-800 rounded-t-xl shadow-sm border border-gray-200 dark:border-gray-700 border-b-0 overflow-hidden animate-pulse">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <div className="h-6 w-48 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
                  <div className="h-4 w-64 bg-gray-300 dark:bg-gray-600 rounded"></div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-16 bg-gray-300 dark:bg-gray-600 rounded"></div>
                    <div className="h-8 w-20 bg-gray-300 dark:bg-gray-600 rounded"></div>
                  </div>
                  <div className="h-8 w-48 bg-gray-300 dark:bg-gray-600 rounded"></div>
                </div>
              </div>
            </div>

            <div className="overflow-y-auto overflow-x-hidden h-[calc(100vh-280px)]">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 w-52"><div className="h-4 w-16 bg-gray-300 dark:bg-gray-600 rounded"></div></th>
                    <th className="px-6 py-3 w-56"><div className="h-4 w-24 bg-gray-300 dark:bg-gray-600 rounded"></div></th>
                    <th className="px-6 py-3 w-36"><div className="h-4 w-20 bg-gray-300 dark:bg-gray-600 rounded"></div></th>
                    <th className="px-6 py-3 w-44"><div className="h-4 w-24 bg-gray-300 dark:bg-gray-600 rounded"></div></th>
                    <th className="px-6 py-3 w-40"><div className="h-4 w-18 bg-gray-300 dark:bg-gray-600 rounded"></div></th>
                    <th className="px-6 py-3"><div className="h-4 w-28 bg-gray-300 dark:bg-gray-600 rounded"></div></th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {[...Array(8)].map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3 w-52">
                        <div className="flex flex-col justify-center h-12 space-y-1">
                          <div className="h-4 w-36 bg-gray-300 dark:bg-gray-600 rounded"></div>
                          <div className="h-3 w-28 bg-gray-300 dark:bg-gray-600 rounded"></div>
                        </div>
                      </td>
                      <td className="px-6 py-3 w-56">
                        <div className="flex items-center gap-2 h-12">
                          <div className="h-4 w-40 bg-gray-300 dark:bg-gray-600 rounded font-mono"></div>
                          <div className="h-4 w-4 bg-gray-300 dark:bg-gray-600 rounded flex-shrink-0"></div>
                        </div>
                      </td>
                      <td className="px-6 py-3 w-36">
                        <div className="flex items-center gap-2 h-12">
                          <div className="h-4 w-24 bg-gray-300 dark:bg-gray-600 rounded font-mono"></div>
                          <div className="h-4 w-4 bg-gray-300 dark:bg-gray-600 rounded flex-shrink-0"></div>
                        </div>
                      </td>
                      <td className="px-6 py-3 w-44">
                        <div className="flex items-center gap-2 h-12">
                          <div className="h-4 w-32 bg-gray-300 dark:bg-gray-600 rounded font-mono"></div>
                          <div className="h-4 w-4 bg-gray-300 dark:bg-gray-600 rounded flex-shrink-0"></div>
                        </div>
                      </td>
                      <td className="px-6 py-3 w-40">
                        <div className="flex items-center h-12">
                          <div className="h-4 w-24 bg-gray-300 dark:bg-gray-600 rounded"></div>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center h-12">
                          <div className="h-4 w-32 bg-gray-300 dark:bg-gray-600 rounded"></div>
                        </div>
                      </td>
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
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Network</h1>
          </div>
        </header>
        
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
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
                <svg className="w-5 h-5 text-teal-600 dark:text-teal-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                </svg>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">Network</h1>
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-0">
        <div className="bg-white dark:bg-gray-800 rounded-t-xl shadow-sm border border-gray-200 dark:border-gray-700 border-b-0 overflow-hidden">
          {/* Title Section */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Network Configuration • {filteredNetworkDevices.length} devices</h2>
              </div>
              <div className="flex items-center gap-4">
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
                        ? 'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-200'
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
                  Export CSV
                </button>
              </div>
            </div>
          </div>

          {/* Filters Accordion Section */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filters</span>
                {totalActiveFilters > 0 && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                    {totalActiveFilters} active
                  </span>
                )}
              </div>
              <svg 
                className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${filtersExpanded ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
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

          {/* Search Section */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search devices, IPs, MACs, DNS, asset tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              {(totalActiveFilters > 0 || searchQuery) && (
                <button
                  onClick={clearAllFilters}
                  className="px-4 py-2 text-sm font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border border-yellow-300 dark:border-yellow-700 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors whitespace-nowrap"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          <div className="overflow-y-auto overflow-x-hidden h-[calc(100vh-280px)]">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
                <tr>
                  <th 
                    onClick={() => handleSort('device')}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-52 bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none"
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-56 bg-gray-50 dark:bg-gray-700">DNS Address</th>
                  <th 
                    onClick={() => handleSort('ip')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-36 bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none"
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
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-44 bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none"
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
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-40 bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none"
                  >
                    <div className="flex items-center gap-1">
                      Network
                      {sortColumn === 'network' && (
                        <svg className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700">Protocol/Band</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredNetworkDevices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
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
                        <td className="px-4 py-3 w-52">
                          <div className="flex flex-col justify-center h-12">
                            <Link
                              href={`/device/${encodeURIComponent(networkDevice.deviceId)}#network`}
                              className="font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm leading-tight truncate max-w-48"
                            >
                              {networkDevice.deviceName || 'Unknown Device'}
                            </Link>
                            <div className="text-xs text-gray-500 dark:text-gray-400 font-mono leading-tight truncate max-w-48">
                              {networkDevice.serialNumber}
                              {networkDevice.assetTag && (
                                <span> | {networkDevice.assetTag}</span>
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
                          <div className="flex items-center h-12">
                            <span className="text-sm text-gray-900 dark:text-white whitespace-nowrap">
                              {(networkDevice.networkInfo.connectionType && 
                                (networkDevice.networkInfo.connectionType.toLowerCase().includes('ethernet') || 
                                 networkDevice.networkInfo.connectionType.toLowerCase().includes('wired'))) 
                                ? '' 
                                : (networkDevice.networkInfo.ssid || networkDevice.networkInfo.networkName || 'N/A')}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center h-12">
                            <span className="text-sm text-gray-900 dark:text-white whitespace-nowrap">
                              {(() => {
                                // Try to get protocol/band from various sources
                                let protocolBand = null;
                                
                                // First try direct fields
                                if (networkDevice.networkInfo.protocol) {
                                  protocolBand = networkDevice.networkInfo.protocol;
                                } else if (networkDevice.networkInfo.band) {
                                  protocolBand = networkDevice.networkInfo.band;
                                } else if (networkDevice.networkInfo.wirelessStandard) {
                                  protocolBand = networkDevice.networkInfo.wirelessStandard;
                                } else if (networkDevice.networkInfo.frequency) {
                                  protocolBand = networkDevice.networkInfo.frequency;
                                }
                                
                                // If not found, try to get from active interface
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
                                
                                // Clean up the display format
                                if (protocolBand) {
                                  // Replace patterns like " (2.4 GHz (6))" with " - 2.4 GHz (6)"
                                  protocolBand = protocolBand.replace(/\s+\(([^)]+)\)$/, ' - $1');
                                }
                                
                                return protocolBand && protocolBand !== 'N/A' ? protocolBand : '';
                              })()}
                            </span>
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

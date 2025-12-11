"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { DevicePageNavigation } from "../../../src/components/navigation/DevicePageNavigation"
import { extractNetwork } from "../../../src/lib/data-processing/modules/network"
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

  const filteredNetworkDevices = processedNetworkDevices.filter(n => {
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
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Network Configuration</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Network interfaces and connectivity • {filteredNetworkDevices.length} devices
                </p>
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

                {/* Search Input */}
                <div className="relative">
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
                    className="block w-96 md:w-[32rem] pl-10 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-y-auto overflow-x-hidden h-[calc(100vh-280px)]">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-52">Device</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-56">DNS Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-36">IP Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-44">MAC Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-40">Network</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Protocol/Band</th>
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

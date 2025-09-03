"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { formatRelativeTime } from "../../../src/lib/time"
import { DevicePageNavigation } from "../../../src/components/navigation/DevicePageNavigation"
import { extractNetwork } from "../../../src/lib/data-processing/modules"

interface NetworkDevice {
  id: string
  deviceId: string
  deviceName: string
  serialNumber: string
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
  const searchParams = useSearchParams()

  useEffect(() => {
    const urlSearch = searchParams.get('search')
    if (urlSearch) setSearchQuery(urlSearch)
  }, [searchParams])

  useEffect(() => {
    const fetchNetworkDevices = async () => {
      try {
        // Use the same API as the system page to get device data with modules
        const response = await fetch('/api/modules/system', {
          cache: 'no-store',
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
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      return (
        n.deviceName?.toLowerCase().includes(query) ||
        n.networkInfo.ipAddress?.toLowerCase().includes(query) ||
        n.networkInfo.macAddress?.toLowerCase().includes(query) ||
        n.networkInfo.ssid?.toLowerCase().includes(query) ||
        n.networkInfo.connectionType?.toLowerCase().includes(query) ||
        n.serialNumber?.toLowerCase().includes(query) ||
        n.networkInfo.interfaces?.some((iface: any) => 
          iface.name?.toLowerCase().includes(query) ||
          iface.ipAddress?.toLowerCase().includes(query) ||
          iface.macAddress?.toLowerCase().includes(query)
        )
      )
    }
    return true
  })

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

  const getActiveInterface = (interfaces: any[]) => {
    if (!interfaces || !Array.isArray(interfaces)) return null;
    return interfaces.find((iface: any) => 
      iface.isActive === true || iface.status === 'Active' || iface.status === 'Connected'
    );
  }

  const getInterfaceType = (iface: any) => {
    if (!iface?.type) return 'Unknown'
    const type = iface.type.toLowerCase()
    if (type.includes('ethernet') || type.includes('wired')) return 'Ethernet'
    if (type.includes('wireless') || type.includes('802.11') || type.includes('wifi')) return 'Wi-Fi'
    if (type.includes('bluetooth')) return 'Bluetooth'
    if (type.includes('loopback')) return 'Loopback'
    return 'Other'
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Network Configuration</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Network interfaces and connectivity • {filteredNetworkDevices.length} devices
                </p>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search network"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-48 md:w-64 pl-10 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Device</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Connection</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">IP Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">MAC Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Network Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Interfaces</th>
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
                    const activeInterface = getActiveInterface(networkDevice.networkInfo.interfaces)
                    const ipv4Address = getIPv4Address(networkDevice.networkInfo.ipAddress)
                    
                    return (
                      <tr key={networkDevice.deviceId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4">
                          <Link
                            href={`/device/${encodeURIComponent(networkDevice.deviceId)}`}
                            className="font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            {networkDevice.deviceName || 'Unknown Device'}
                          </Link>
                          <div className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                            {networkDevice.serialNumber}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {networkDevice.networkInfo.connectionType ? (
                              <>
                                <div className={`w-2 h-2 rounded-full ${
                                  networkDevice.networkInfo.connectionType.toLowerCase().includes('wireless') || 
                                  networkDevice.networkInfo.connectionType.toLowerCase().includes('wifi') 
                                    ? 'bg-blue-400' 
                                    : networkDevice.networkInfo.connectionType.toLowerCase().includes('ethernet') || 
                                      networkDevice.networkInfo.connectionType.toLowerCase().includes('wired')
                                    ? 'bg-green-400'
                                    : 'bg-gray-400'
                                }`} />
                                <span className="text-sm text-gray-900 dark:text-white">
                                  {networkDevice.networkInfo.connectionType}
                                </span>
                              </>
                            ) : (
                              <span className="text-sm text-gray-500 dark:text-gray-400">Unknown</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-mono">
                          {ipv4Address || networkDevice.networkInfo.ipAddress || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-mono">
                          {networkDevice.networkInfo.macAddress || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                          {networkDevice.networkInfo.ssid || networkDevice.networkInfo.networkName || 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            {networkDevice.networkInfo.interfaces && Array.isArray(networkDevice.networkInfo.interfaces) ? (
                              <div className="space-y-1">
                                {networkDevice.networkInfo.interfaces.slice(0, 2).map((iface: any, idx: number) => (
                                  <div key={idx} className="flex items-center gap-2">
                                    <div className={`w-1.5 h-1.5 rounded-full ${
                                      iface.isActive || iface.status === 'Active' || iface.status === 'Connected' 
                                        ? 'bg-green-400' 
                                        : 'bg-gray-400'
                                    }`} />
                                    <span className="text-gray-900 dark:text-white text-xs">
                                      {iface.name || 'Unknown'} ({getInterfaceType(iface)})
                                    </span>
                                  </div>
                                ))}
                                {networkDevice.networkInfo.interfaces.length > 2 && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    +{networkDevice.networkInfo.interfaces.length - 2} more
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-500 dark:text-gray-400">No interfaces</span>
                            )}
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

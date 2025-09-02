"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { formatRelativeTime } from "../../../src/lib/time"
import { DevicePageNavigation } from "../../../src/components/navigation/DevicePageNavigation"

interface NetworkRecord {
  id: string
  deviceId: string
  deviceName: string
  serialNumber: string
  lastSeen: string
  collectedAt: string
  interfaces: any[]
  primaryInterface?: any
  ipAddresses: string[]
  dnsServers: string[]
  gateway?: string
  hostname?: string
  domain?: string
  raw?: any
}

function NetworkPageContent() {
  const [network, setNetwork] = useState<NetworkRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const searchParams = useSearchParams()

  useEffect(() => {
    const urlSearch = searchParams.get('search')
    if (urlSearch) setSearchQuery(urlSearch)
  }, [searchParams])

  useEffect(() => {
    const fetchNetwork = async () => {
      try {
        const response = await fetch('/api/modules/network', {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        })
        
        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`)
        }
        
        const data = await response.json()
        
        if (Array.isArray(data)) {
          setNetwork(data)
          setError(null)
        } else {
          throw new Error('Invalid API response format')
        }
        
      } catch (error) {
        console.error('❌ Failed to fetch network:', error)
        setError(error instanceof Error ? error.message : 'Unknown error')
        setNetwork([])
      } finally {
        setLoading(false)
      }
    }

    fetchNetwork()
  }, [])

  // Filter network data
  const filteredNetwork = network.filter(n => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      return (
        n.deviceName?.toLowerCase().includes(query) ||
        n.hostname?.toLowerCase().includes(query) ||
        n.domain?.toLowerCase().includes(query) ||
        n.gateway?.toLowerCase().includes(query) ||
        n.ipAddresses?.some(ip => ip.toLowerCase().includes(query)) ||
        n.serialNumber?.toLowerCase().includes(query)
      )
    }
    return true
  })

  const getInterfaceType = (iface: any) => {
    if (!iface.name) return 'Unknown'
    const name = iface.name.toLowerCase()
    if (name.includes('ethernet') || name.includes('eth')) return 'Ethernet'
    if (name.includes('wifi') || name.includes('wireless') || name.includes('wlan')) return 'Wi-Fi'
    if (name.includes('bluetooth') || name.includes('bt')) return 'Bluetooth'
    if (name.includes('loopback') || name.includes('lo')) return 'Loopback'
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
                  Network interfaces and connectivity • {filteredNetwork.length} devices
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Hostname</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">IP Addresses</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Interfaces</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Gateway</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Domain</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredNetwork.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                      </svg>
                      <p className="text-lg font-medium mb-1">No network data found</p>
                      <p className="text-sm">Try adjusting your search criteria.</p>
                    </td>
                  </tr>
                ) : (
                  filteredNetwork.map((net) => (
                    <tr key={net.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4">
                        <Link
                          href={`/device/${encodeURIComponent(net.serialNumber)}`}
                          className="font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          {net.deviceName}
                        </Link>
                        <div className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                          {net.serialNumber}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {net.hostname || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {net.ipAddresses?.slice(0, 3).map((ip, idx) => (
                            <div key={idx} className="text-sm text-gray-900 dark:text-white font-mono">
                              {ip}
                            </div>
                          ))}
                          {net.ipAddresses?.length > 3 && (
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              +{net.ipAddresses.length - 3} more
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {net.interfaces?.slice(0, 3).map((iface, idx) => (
                            <span key={idx} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              getInterfaceType(iface) === 'Ethernet' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : getInterfaceType(iface) === 'Wi-Fi'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                            }`}>
                              {getInterfaceType(iface)}
                            </span>
                          ))}
                          {net.interfaces?.length > 3 && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              +{net.interfaces.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-mono">
                        {net.gateway || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {net.domain || '-'}
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

export default function NetworkPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-black animate-pulse"></div>}>
      <NetworkPageContent />
    </Suspense>
  )
}

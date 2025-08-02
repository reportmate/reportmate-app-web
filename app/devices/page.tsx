"use client"

// Force dynamic rendering and disable caching for devices page
export const dynamic = 'force-dynamic'

import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import { formatRelativeTime } from "../../src/lib/time"
import { DevicesPageSkeleton } from "../../src/components/skeleton/DevicesPageSkeleton"

interface Device {
  deviceId: string      // Internal UUID (unique)
  serialNumber: string  // Human-readable unique identifier
  name: string
  assetTag?: string     // Asset tag from inventory
  os?: string
  lastSeen: string
  status: 'active' | 'stale' | 'missing' | 'warning' | 'error'
  uptime?: string
  location?: string
  ipAddress?: string
  totalEvents: number
  lastEventTime: string
  modules?: {
    inventory?: {
      assetTag?: string
      deviceName?: string
      location?: string
      usage?: string  // 'Assigned' or 'Shared'
      catalog?: string  // 'Curriculum', 'Staff', 'Faculty', 'Kiosk'
    }
  }
}

function DevicesPageContent() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [usageFilter, setUsageFilter] = useState<string>('all')
  const searchParams = useSearchParams()

  // Initialize search query and usage filter from URL parameters
  useEffect(() => {
    try {
      const urlSearch = searchParams.get('search')
      if (urlSearch) {
        setSearchQuery(urlSearch)
      }
      
      const urlUsage = searchParams.get('usage')
      if (urlUsage && ['assigned', 'shared', 'curriculum', 'staff', 'faculty', 'kiosk'].includes(urlUsage.toLowerCase())) {
        setUsageFilter(urlUsage.toLowerCase())
      }
    } catch (e) {
      console.warn('Failed to get search params:', e)
    }
  }, [searchParams])

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        // Use Next.js API route
        const apiUrl = '/api/devices'
        const timestamp = new Date().toISOString()
        console.log(`${timestamp} - Fetching devices from Next.js API route:`, apiUrl)
        
        const response = await fetch(apiUrl, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        })
        
        console.log(`${timestamp} - API Response Status:`, response.status)
        console.log(`${timestamp} - API Response Headers:`, Object.fromEntries(response.headers.entries()))
        
        if (!response.ok) {
          throw new Error(`API request failed: ${response.status} ${response.statusText}`)
        }
        
        const data = await response.json()
        console.log(`${timestamp} - API response received:`, { 
          type: typeof data, 
          isArray: Array.isArray(data), 
          length: Array.isArray(data) ? data.length : 'N/A',
          fetchedAt: response.headers.get('X-Fetched-At'),
          keys: Array.isArray(data) ? [] : Object.keys(data || {})
        })
        
        // The API returns a direct array of devices
        let devicesArray: Device[]
        
        if (Array.isArray(data)) {
          devicesArray = data
          console.log('✅ Successfully received devices array:', devicesArray.length, 'devices')
        } else {
          console.error('❌ Invalid API response format:', data)
          throw new Error('API returned invalid data format')
        }
        
        if (devicesArray.length === 0) {
          console.warn('⚠️ No devices found in API response')
          setDevices([])
          setError(null)
        } else {
          console.log('✅ Successfully loaded', devicesArray.length, 'devices from API')
          setDevices(devicesArray)
          setError(null)
        }
        
      } catch (error) {
        console.error('❌ Failed to fetch devices:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
        setError(errorMessage)
        setDevices([]) // Set empty array on error
      } finally {
        // ALWAYS clear loading state
        setLoading(false)
        console.log('✅ Loading state cleared')
      }
    }

    fetchDevices()
  }, [])

  // Filter devices based on search query and usage filter with error handling
  const filteredDevices = (() => {
    try {
      if (!Array.isArray(devices)) {
        console.warn('Devices is not an array:', devices)
        return []
      }
      
      let filtered = devices
      
      // Apply usage filter first
      if (usageFilter !== 'all') {
        filtered = filtered.filter(device => {
          try {
            // Check usage field for 'assigned' and 'shared'
            if (usageFilter === 'assigned' || usageFilter === 'shared') {
              const usage = device.modules?.inventory?.usage?.toLowerCase()
              return usage === usageFilter
            }
            // Check catalog field for 'curriculum', 'staff', 'faculty', 'kiosk'
            else if (['curriculum', 'staff', 'faculty', 'kiosk'].includes(usageFilter)) {
              const catalog = device.modules?.inventory?.catalog?.toLowerCase()
              return catalog === usageFilter
            }
            return false
          } catch (e) {
            console.warn('Error checking device usage:', device, e)
            return false
          }
        })
      }
      
      // Then apply search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        filtered = filtered.filter(device => {
          try {
            return (
              device?.name?.toLowerCase().includes(query) ||
              device?.assetTag?.toLowerCase().includes(query) ||
              device?.os?.toLowerCase().includes(query) ||
              device?.serialNumber?.toLowerCase().includes(query) ||
              device?.ipAddress?.toLowerCase().includes(query) ||
              device?.deviceId?.toLowerCase().includes(query) ||
              device?.modules?.inventory?.deviceName?.toLowerCase().includes(query) ||
              device?.modules?.inventory?.location?.toLowerCase().includes(query)
            )
          } catch (e) {
            console.warn('Error filtering device:', device, e)
            return false
          }
        })
      }
      
      return filtered
    } catch (e) {
      console.error('Error in filteredDevices:', e)
      return []
    }
  })()

  // Get usage filter counts
  const getUsageFilterCounts = () => {
    try {
      if (!Array.isArray(devices)) return { 
        all: 0, assigned: 0, shared: 0, curriculum: 0, staff: 0, faculty: 0, kiosk: 0 
      }
      
      return {
        all: devices.length,
        assigned: devices.filter(device => 
          device.modules?.inventory?.usage?.toLowerCase() === 'assigned'
        ).length,
        shared: devices.filter(device => 
          device.modules?.inventory?.usage?.toLowerCase() === 'shared'
        ).length,
        curriculum: devices.filter(device => 
          device.modules?.inventory?.catalog?.toLowerCase() === 'curriculum'
        ).length,
        staff: devices.filter(device => 
          device.modules?.inventory?.catalog?.toLowerCase() === 'staff'
        ).length,
        faculty: devices.filter(device => 
          device.modules?.inventory?.catalog?.toLowerCase() === 'faculty'
        ).length,
        kiosk: devices.filter(device => 
          device.modules?.inventory?.catalog?.toLowerCase() === 'kiosk'
        ).length,
      }
    } catch (e) {
      console.error('Error calculating usage filter counts:', e)
      return { all: 0, assigned: 0, shared: 0, curriculum: 0, staff: 0, faculty: 0, kiosk: 0 }
    }
  }

  const usageFilterCounts = getUsageFilterCounts()

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900'
      case 'warning': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900'
      case 'error': return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900'
      case 'stale': return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800'
      case 'missing': return 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900'
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800' // Treat any unknown status as stale
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )
      case 'warning':
        return (
          <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        )
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        )
      case 'missing':
        return (
          <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        )
      default:
        return (
          <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        )
    }
  }

  if (loading) {
    return <DevicesPageSkeleton />
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
                All Devices
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
              Error Loading Devices
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {error}
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => {
                  setError(null)
                  setLoading(true)
                  // Trigger a re-fetch by forcing component re-render
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
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                  <Image 
                    src="/reportmate-logo.png" 
                    alt="ReportMate Logo" 
                    width={40}
                    height={40}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                    All Devices
                  </h1>
                </div>
              </div>
            </div>
            
            {/* Right side - Navigation, Search, Settings */}
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              {/* Navigation - Hidden on small screens */}
              <nav className="hidden lg:flex items-center gap-4">
                <Link
                  href="/events"
                  className="flex items-center gap-2 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                  title="Events"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium">Events</span>
                </Link>
              </nav>

              {/* Search Input - Priority item, scales down but stays visible */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2 sm:pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-32 sm:w-48 md:w-64 lg:w-80 pl-8 sm:pl-10 pr-8 sm:pr-3 py-1.5 sm:py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-2 sm:pr-3 flex items-center"
                  >
                    <svg className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Navigation link for small screens */}
              <Link
                href="/events"
                className="lg:hidden p-1.5 sm:p-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                title="Events"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </Link>

              {/* Settings */}
              <Link
                href="/settings"
                className="p-1.5 sm:p-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                title="Settings"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Usage Filter Tabs */}
        <div className="mb-6 sm:mb-8">
          <div className="border-b border-gray-200 dark:border-gray-700">
            {/* Desktop filter tabs */}
            <nav className="hidden sm:flex -mb-px space-x-4 lg:space-x-8 overflow-x-auto overlay-scrollbar">
              {[
                { key: 'all', label: 'All Devices', count: usageFilterCounts.all },
                { key: 'assigned', label: 'Assigned', count: usageFilterCounts.assigned },
                { key: 'shared', label: 'Shared', count: usageFilterCounts.shared },
                { key: 'curriculum', label: 'Curriculum', count: usageFilterCounts.curriculum },
                { key: 'staff', label: 'Staff', count: usageFilterCounts.staff },
                { key: 'faculty', label: 'Faculty', count: usageFilterCounts.faculty },
                { key: 'kiosk', label: 'Kiosk', count: usageFilterCounts.kiosk },
              ].map((filter) => {
                const isActive = usageFilter === filter.key
                
                return (
                  <button
                    key={filter.key}
                    onClick={() => setUsageFilter(filter.key)}
                    className={`${
                      isActive
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors flex-shrink-0`}
                  >
                    {filter.key === 'assigned' && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    )}
                    {filter.key === 'shared' && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    )}
                    {filter.key === 'curriculum' && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                      </svg>
                    )}
                    {filter.key === 'staff' && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <rect x="2" y="7" width="20" height="12" rx="2" ry="2" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 13h8" />
                      </svg>
                    )}
                    {filter.key === 'faculty' && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    )}
                    {filter.key === 'kiosk' && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 21l8 0" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 17l0 4" />
                      </svg>
                    )}
                    <span className="hidden md:inline">{filter.label}</span>
                    <span className="md:hidden">{filter.key === 'all' ? 'All' : filter.label}</span>
                    <span className={`${
                      isActive 
                        ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    } inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium`}>
                      {filter.count}
                    </span>
                  </button>
                )
              })}
            </nav>

            {/* Mobile filter dropdown */}
            <div className="sm:hidden pb-4">
              <div className="relative">
                <select
                  value={usageFilter}
                  onChange={(e) => setUsageFilter(e.target.value)}
                  className="appearance-none block w-full pl-3 pr-10 py-2.5 text-base border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm cursor-pointer"
                >
                  {[
                    { key: 'all', label: 'All Devices', count: usageFilterCounts.all },
                    { key: 'assigned', label: 'Assigned Devices', count: usageFilterCounts.assigned },
                    { key: 'shared', label: 'Shared Devices', count: usageFilterCounts.shared },
                    { key: 'curriculum', label: 'Curriculum Devices', count: usageFilterCounts.curriculum },
                    { key: 'staff', label: 'Staff Devices', count: usageFilterCounts.staff },
                    { key: 'faculty', label: 'Faculty Devices', count: usageFilterCounts.faculty },
                    { key: 'kiosk', label: 'Kiosk Devices', count: usageFilterCounts.kiosk },
                  ].map((filter) => (
                    <option key={filter.key} value={filter.key}>
                      {filter.label} ({filter.count})
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 dark:text-gray-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {devices.length === 0 ? (
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
        ) : filteredDevices.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 py-16">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No {usageFilter === 'all' ? '' : usageFilter} devices found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {searchQuery 
                  ? `No devices match your search "${searchQuery}"${usageFilter !== 'all' ? ` in ${usageFilter} devices` : ''}.`
                  : usageFilter !== 'all' 
                    ? `No devices are marked as "${usageFilter}" in the inventory.`
                    : 'Try adjusting your search or filter criteria.'
                }
              </p>
              {(searchQuery || usageFilter !== 'all') && (
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 justify-center">
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      Clear Search
                    </button>
                  )}
                  {usageFilter !== 'all' && (
                    <button
                      onClick={() => setUsageFilter('all')}
                      className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                    >
                      Show All Devices
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Mobile and Tablet View - Cards */}
            <div className="md:hidden">
              <div className="space-y-3">
                {filteredDevices.map((device) => (
                  <Link
                    key={device.deviceId}
                    href={`/device/${encodeURIComponent(device.serialNumber)}`}
                    className="block"
                  >
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {getStatusIcon(device.status)}
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(device.status)}`}>
                              {device.status}
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
                          {formatRelativeTime(device.lastSeen)}
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <div className="font-medium text-gray-900 dark:text-white text-sm mb-1">
                          {device.name || device.serialNumber}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                          <div>Asset: {device.modules?.inventory?.assetTag || device.assetTag || 'No asset tag'}</div>
                          <div className="font-mono">{device.serialNumber}</div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Desktop View - Table */}
            <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Endpoints Fleet
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Manage and monitor all devices in fleet
                  </p>
                </div>
                <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex flex-wrap gap-2 sm:gap-4">
                    <span>{filteredDevices.filter(d => d.status === 'active').length} active</span>
                    <span>{filteredDevices.filter(d => d.status === 'warning').length} warnings</span>
                    <span>{filteredDevices.filter(d => d.status === 'error').length} errors</span>
                    <span>{filteredDevices.filter(d => d.status === 'stale').length} stale</span>
                    <span>{filteredDevices.filter(d => d.status === 'missing').length} missing</span>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full table-fixed">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="w-32 px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="w-48 px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Device
                      </th>
                      <th className="w-32 px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Asset Tag
                      </th>
                      <th className="w-40 px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Serial Number
                      </th>
                      <th className="w-32 px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Last Seen
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredDevices.map((device) => (
                      <Link
                        key={device.deviceId}
                        href={`/device/${encodeURIComponent(device.serialNumber)}`}
                        className="table-row hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                      >
                        <td className="w-32 px-4 lg:px-6 py-4">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(device.status)}
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(device.status)}`}>
                              {device.status}
                            </span>
                          </div>
                        </td>
                        <td className="w-48 px-4 lg:px-6 py-4">
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 dark:text-white truncate">
                              {device.name || device.serialNumber}
                            </div>
                          </div>
                        </td>
                        <td className="w-32 px-4 lg:px-6 py-4">
                          <div className="text-sm text-gray-900 dark:text-white truncate">
                            {device.modules?.inventory?.assetTag || device.assetTag || '-'}
                          </div>
                        </td>
                        <td className="w-40 px-4 lg:px-6 py-4">
                          <div className="text-sm text-gray-900 dark:text-white font-mono truncate">
                            {device.serialNumber}
                          </div>
                        </td>
                        <td className="w-32 px-4 lg:px-6 py-4">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {formatRelativeTime(device.lastSeen)}
                          </div>
                        </td>
                      </Link>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function DevicesPage() {
  return (
    <Suspense fallback={<DevicesPageSkeleton />}>
      <DevicesPageContent />
    </Suspense>
  )
}

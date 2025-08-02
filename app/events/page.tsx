"use client"

// Force dynamic rendering and disable caching for events page
export const dynamic = 'force-dynamic'

import React, { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { formatRelativeTime, formatExactTime } from "../../src/lib/time"
import { EventsPageSkeleton } from "../../src/components/skeleton/EventsPageSkeleton"

// Force dynamic rendering for this page to avoid SSG issues with useSearchParams

interface Event {
  id: string
  device: string
  kind: string
  ts: string
  payload: Record<string, unknown> | string
}

// Interface for payload data
interface EventPayload {
  summary?: string;
  message?: string;
  moduleCount?: number;
  modules?: string[] | Record<string, unknown>;
  modules_processed?: number;
  collection_type?: string;
  [key: string]: unknown;
}

// Helper function to safely display payload
const safeDisplayPayload = (payload: EventPayload | string | null | undefined): string => {
  try {
    if (!payload) return 'No payload'
    
    // Handle string payloads first
    if (typeof payload === 'string') {
      return payload.length > 100 ? payload.substring(0, 100) + '...' : payload
    }
    
    // Now handle object payloads
    if (typeof payload === 'object') {
      // Handle summarized payloads (from our new API structure)
      if (payload.summary) {
        return payload.summary
      }
      
      // Handle message-based payloads
      if (payload.message) {
        return payload.message
      }
      
      // Handle module count payloads
      if (payload.moduleCount && payload.modules && Array.isArray(payload.modules)) {
        if (payload.moduleCount === 1) {
          return `Reported ${payload.modules[0]} module data`
        } else if (payload.moduleCount <= 3) {
          return `Reported ${payload.modules.join(', ')} modules data`
        } else {
          return `Reported ${payload.moduleCount} modules data`
        }
      }
      // Check if this is a full device report (contains multiple modules)
      if (payload.modules && typeof payload.modules === 'object') {
        const moduleCount = Object.keys(payload.modules).length
        const moduleNames = Object.keys(payload.modules).slice(0, 3)
        
        if (moduleCount > 3) {
          return `Reported ${moduleCount} modules data (${moduleNames.join(', ')}, +${moduleCount - 3} more)`
        } else {
          return `Reported ${moduleNames.join(', ')} module${moduleCount > 1 ? 's' : ''} data`
        }
      }
      
      // Check for new structure with modules_processed
      if (payload.modules_processed && typeof payload.modules_processed === 'number') {
        const parts = []
        // Simplify collection type to just "report" format
        if (payload.collection_type) {
          const reportType = payload.collection_type.toLowerCase() === 'full' ? 'Full report' : `${payload.collection_type} report`
          parts.push(reportType)
        }
        if (payload.modules_processed) parts.push(`${payload.modules_processed} modules`)
        // Remove client version from the display
        
        return parts.length > 0 ? parts.join(' • ') : `Data collection completed`
      }
      
      // Check for common event types
      if (payload.component || payload.moduleType || payload.clientVersion) {
        const parts = []
        if (payload.message) parts.push(payload.message)
        if (payload.component) parts.push(`Component: ${payload.component}`)
        if (payload.moduleType) parts.push(`Module: ${payload.moduleType}`)
        if (payload.clientVersion) parts.push(`Client: ${payload.clientVersion}`)
        
        const summary = parts.join(' • ')
        return summary.length > 100 ? summary.substring(0, 100) + '...' : summary
      }
      
      // Fallback for complex objects - show a more descriptive summary
      const keys = Object.keys(payload)
      if (keys.length === 0) return 'Empty payload'
      if (keys.length > 5) {
        return `Large data object (${keys.length} properties): ${keys.slice(0, 3).join(', ')}...`
      }
      
      // Try to stringify, but with strict size limit
      const stringified = JSON.stringify(payload)
      if (stringified.length > 150) {
        return `Complex data (${stringified.length} chars) - Properties: ${keys.slice(0, 3).join(', ')}...`
      }
      return stringified.substring(0, 150)
    }
    
    return String(payload).substring(0, 100)
  } catch (_error) {
    return 'Complex payload (non-serializable)'
  }
}

function EventsPageContent() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null)
  const [copiedEventId, setCopiedEventId] = useState<string | null>(null)
  const [deviceNameMap, setDeviceNameMap] = useState<Record<string, string>>({})
  const [fullPayloads, setFullPayloads] = useState<Record<string, unknown>>({})
  const [loadingPayloads, setLoadingPayloads] = useState<Set<string>>(new Set())
  const searchParams = useSearchParams()
  
  const EVENTS_PER_PAGE = 10
  
  // Valid event categories - filter out everything else
  const VALID_EVENT_KINDS = ['system', 'info', 'error', 'warning', 'success', 'data_collection']

  // Initialize filter from URL parameters
  useEffect(() => {
    const urlFilter = searchParams.get('filter')
    if (urlFilter && ['success', 'warning', 'error', 'info', 'data_collection'].includes(urlFilter)) {
      setFilterType(urlFilter)
    }
  }, [searchParams])

  // Fetch device name mappings
  useEffect(() => {
    const fetchDeviceNames = async () => {
      try {
        const response = await fetch('/api/devices', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        })
        if (response.ok) {
          const data = await response.json()
          // Handle both response formats: direct array or {success: true, devices: [...]}
          const devices = Array.isArray(data) ? data : (data.devices || [])
          
          // Build device name mapping (serial -> name)
          const nameMap: Record<string, string> = {}
          devices.forEach((device: Record<string, unknown>) => {
            if (device.serialNumber) {
              // Use inventory deviceName if available, otherwise fall back to name or serialNumber
              const deviceName = device.modules?.inventory?.deviceName || device.name || device.serialNumber
              nameMap[device.serialNumber] = deviceName
            }
          })
          setDeviceNameMap(nameMap)
        }
      } catch (error) {
        console.error('Failed to fetch device names:', error)
        // Continue without device name mapping
      }
    }

    fetchDeviceNames()
  }, [])

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        console.log('[EVENTS PAGE] Fetching events...')
        // Use Next.js API route
        const response = await fetch('/api/events')
        if (!response.ok) {
          throw new Error('Failed to fetch events')
        }
        
        const data = await response.json()
        console.log('[EVENTS PAGE] Raw API response:', data)
        
        // API returns: {success: true, events: [...]}
        if (data.success && Array.isArray(data.events)) {
          console.log('[EVENTS PAGE] Sample event structure:', data.events[0])
          console.log('[EVENTS PAGE] Event timestamps:', data.events.map((e: any) => ({ id: e.id, ts: e.ts, timestamp: e.timestamp })).slice(0, 3))
          
          // Filter events to only include valid categories
          const filteredEvents = data.events.filter((event: Event) => 
            VALID_EVENT_KINDS.includes(event.kind?.toLowerCase())
          )
          console.log('[EVENTS PAGE] Filtered events count:', filteredEvents.length)
          setEvents(filteredEvents)
        } else {
          console.error('[EVENTS PAGE] Invalid events data received:', data)
          setError('Invalid events data received from API')
        }
      } catch (error) {
        console.error('Failed to fetch events:', error)
        setError((error as Error).message)
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [])

  // Filter events based on selected type
  const filteredEvents = events.filter(event => {
    if (filterType === 'all') return true
    return event.kind.toLowerCase() === filterType.toLowerCase()
  })

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [filterType])

  // Calculate pagination
  const totalPages = Math.ceil(filteredEvents.length / EVENTS_PER_PAGE)
  const startIndex = (currentPage - 1) * EVENTS_PER_PAGE
  const endIndex = startIndex + EVENTS_PER_PAGE
  const currentEvents = filteredEvents.slice(startIndex, endIndex)

  // Helper function to format full payload for display
  const formatFullPayload = (payload: any): string => {
    try {
      if (!payload) return 'No payload'
      if (typeof payload === 'string') return payload
      return JSON.stringify(payload, null, 2)
    } catch (error) {
      return 'Error formatting payload: ' + String(payload)
    }
  }

  // Function to fetch full payload lazily from dedicated endpoint
  const fetchFullPayload = async (eventId: string) => {
    if (fullPayloads[eventId] || loadingPayloads.has(eventId)) {
      return // Already loaded or loading
    }

    setLoadingPayloads(prev => new Set(prev).add(eventId))
    
    try {
      console.log(`[EVENTS PAGE] Fetching full payload for event: ${eventId}`)
      const response = await fetch(`/api/events/${encodeURIComponent(eventId)}/payload`)
      
      if (response.ok) {
        const data = await response.json()
        console.log(`[EVENTS PAGE] Successfully fetched full payload for ${eventId}`)
        
        setFullPayloads(prev => ({
          ...prev,
          [eventId]: data.payload
        }))
      } else {
        console.error(`[EVENTS PAGE] Failed to fetch payload for ${eventId}:`, response.status)
        // Fallback to the existing payload from events list
        const event = events.find(e => e.id === eventId)
        if (event) {
          setFullPayloads(prev => ({
            ...prev,
            [eventId]: event.payload
          }))
        }
      }
    } catch (error) {
      console.error(`[EVENTS PAGE] Error fetching payload for ${eventId}:`, error)
      // Fallback to the existing payload from events list
      const event = events.find(e => e.id === eventId)
      if (event) {
        setFullPayloads(prev => ({
          ...prev,
          [eventId]: event.payload
        }))
      }
    } finally {
      setLoadingPayloads(prev => {
        const newSet = new Set(prev)
        newSet.delete(eventId)
        return newSet
      })
    }
  }

  // Helper function to copy payload to clipboard
  const copyToClipboard = async (text: string, eventId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedEventId(eventId);
      // Reset the copied state after 2 seconds
      setTimeout(() => setCopiedEventId(null), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedEventId(eventId);
      setTimeout(() => setCopiedEventId(null), 2000);
    }
  };

  const getStatusConfig = (kind: string) => {
    switch (kind.toLowerCase()) {
      case 'error': 
        return { 
          bg: 'bg-red-500', 
          text: 'text-red-700 dark:text-red-300', 
          badge: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
          icon: (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          )
        }
      case 'warning': 
        return { 
          bg: 'bg-yellow-500', 
          text: 'text-yellow-700 dark:text-yellow-300', 
          badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
          icon: (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          )
        }
      case 'success': 
        return { 
          bg: 'bg-green-500', 
          text: 'text-green-700 dark:text-green-300', 
          badge: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
          icon: (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          )
        }
      case 'info': 
        return { 
          bg: 'bg-blue-500', 
          text: 'text-blue-700 dark:text-blue-300', 
          badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
          icon: (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          )
        }
      case 'system': 
        return { 
          bg: 'bg-purple-500', 
          text: 'text-purple-700 dark:text-purple-300', 
          badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
          icon: (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
            </svg>
          )
        }
      default: 
        return { 
          bg: 'bg-gray-500', 
          text: 'text-gray-700 dark:text-gray-300', 
          badge: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
          icon: (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          )
        }
    }
  }

  const getFilterCounts = () => {
    return {
      all: events.length,
      success: events.filter(e => e.kind.toLowerCase() === 'success').length,
      warning: events.filter(e => e.kind.toLowerCase() === 'warning').length,
      error: events.filter(e => e.kind.toLowerCase() === 'error').length,
      info: events.filter(e => e.kind.toLowerCase() === 'info').length,
      system: events.filter(e => e.kind.toLowerCase() === 'system').length,
    }
  }

  const filterCounts = getFilterCounts()

  if (loading) {
    return <EventsPageSkeleton />
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
                All Events
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
              Error Loading Events
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {error}
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              ← Back to Dashboard
            </Link>
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
                  <img 
                    src="/reportmate-logo.png" 
                    alt="ReportMate Logo" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                    All Events
                  </h1>
                </div>
              </div>
            </div>

            {/* Right side - Navigation, Search, Settings */}
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              {/* Navigation - Hidden on small screens */}
              <nav className="hidden lg:flex items-center gap-4">
                <Link
                  href="/devices"
                  className="flex items-center gap-2 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                  title="Devices"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm font-medium">Devices</span>
                </Link>
              </nav>

              {/* Search - Priority item, scales down but stays visible */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2 sm:pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search"
                  className="block w-32 sm:w-48 md:w-64 lg:w-80 pl-8 sm:pl-10 pr-3 py-1.5 sm:py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Navigation link for small screens */}
              <Link
                href="/devices"
                className="lg:hidden p-1.5 sm:p-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                title="Devices"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
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
        {/* Filter Tabs */}
        <div className="mb-6 sm:mb-8">
          <div className="border-b border-gray-200 dark:border-gray-700">
            {/* Desktop filter tabs */}
            <nav className="hidden sm:flex -mb-px space-x-4 lg:space-x-8 overflow-x-auto overlay-scrollbar">
              {[
                { key: 'all', label: 'All Events', count: filterCounts.all },
                { key: 'success', label: 'Success', count: filterCounts.success },
                { key: 'warning', label: 'Warnings', count: filterCounts.warning },
                { key: 'error', label: 'Errors', count: filterCounts.error },
                { key: 'info', label: 'Info', count: filterCounts.info },
                { key: 'system', label: 'System', count: filterCounts.system },
              ].map((filter) => {
                const isActive = filterType === filter.key
                const statusConfig = filter.key !== 'all' ? getStatusConfig(filter.key) : null
                
                return (
                  <button
                    key={filter.key}
                    onClick={() => setFilterType(filter.key)}
                    className={`${
                      isActive
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors flex-shrink-0`}
                  >
                    {statusConfig && (
                      <div className={`w-4 h-4 ${statusConfig.text}`}>
                        {statusConfig.icon}
                      </div>
                    )}
                    <span className="hidden md:inline">{filter.label}</span>
                    <span className="md:hidden">{filter.key === 'all' ? 'All' : filter.label.split(' ')[0]}</span>
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
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="appearance-none block w-full pl-3 pr-10 py-2.5 text-base border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm cursor-pointer"
                >
                  {[
                    { key: 'all', label: 'All Events', count: filterCounts.all },
                    { key: 'success', label: 'Success Events', count: filterCounts.success },
                    { key: 'warning', label: 'Warning Events', count: filterCounts.warning },
                    { key: 'error', label: 'Error Events', count: filterCounts.error },
                    { key: 'info', label: 'Info Events', count: filterCounts.info },
                    { key: 'system', label: 'System Events', count: filterCounts.system },
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

        {/* Events Table */}
        {filteredEvents.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 py-16">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8l-2 2m0 0l-2-2m2 2v6" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No {filterType === 'all' ? '' : filterType} events found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {filterType === 'all' 
                  ? 'No events have been received yet from fleet.'
                  : `No ${filterType} events match your current filter.`}
              </p>
              {filterType !== 'all' && (
                <button
                  onClick={() => setFilterType('all')}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Show All Events
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table View (lg and up) */}
            <div className="hidden lg:block bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 table-fixed">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="w-20 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="w-28 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="w-40 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Device
                      </th>
                      <th className="w-64 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Message
                      </th>
                      <th className="w-44 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="w-32 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {currentEvents.map((event) => {
                      const statusConfig = getStatusConfig(event.kind)
                      const isExpanded = expandedEvent === event.id
                      
                      return (
                        <React.Fragment key={event.id}>
                          <tr className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap overflow-hidden">
                              <div className="text-xs font-mono text-gray-600 dark:text-gray-400 truncate">
                                {event.id}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap overflow-hidden">
                              <div className="flex items-center gap-2">
                                <div className={`w-4 h-4 flex-shrink-0 ${statusConfig.text}`}>
                                  {statusConfig.icon}
                                </div>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusConfig.badge} truncate`}>
                                  {event.kind}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap overflow-hidden">
                              <Link
                                href={`/device/${encodeURIComponent(event.device)}`}
                                className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors block truncate"
                                title={deviceNameMap[event.device] || event.device}
                              >
                                {deviceNameMap[event.device] || event.device}
                              </Link>
                            </td>
                            <td className="px-6 py-4 overflow-hidden">
                              <div className="text-sm text-gray-900 dark:text-white truncate">
                                {safeDisplayPayload(event.payload)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap overflow-hidden">
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                <div className="font-medium truncate">
                                  {event.ts ? formatRelativeTime(event.ts) : 'Unknown time'}
                                </div>
                                <div className="text-xs opacity-75 truncate" title={event.ts ? formatExactTime(event.ts) : 'No timestamp'}>
                                  {event.ts ? formatExactTime(event.ts) : 'No timestamp'}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium overflow-hidden">
                              <button
                                onClick={async (e) => {
                                  e.preventDefault()
                                  if (isExpanded) {
                                    setExpandedEvent(null)
                                  } else {
                                    setExpandedEvent(event.id)
                                    // Fetch full payload when expanding
                                    await fetchFullPayload(event.id)
                                  }
                                }}
                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 truncate"
                                disabled={loadingPayloads.has(event.id)}
                              >
                                {loadingPayloads.has(event.id) ? (
                                  <>
                                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    Loading...
                                  </>
                                ) : (
                                  <>
                                    {isExpanded ? 'Hide' : 'Show'} Payload
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isExpanded ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                                    </svg>
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={6} className="px-0 py-0 bg-gray-50 dark:bg-gray-900">
                                <div className="px-6 py-4">
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                                        {fullPayloads[event.id] ? 'Full Raw Payload' : 'Raw Payload (from events list)'}
                                      </h4>
                                      <button
                                        onClick={() => {
                                          const payloadToShow = fullPayloads[event.id] || event.payload
                                          copyToClipboard(formatFullPayload(payloadToShow), event.id)
                                        }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors flex-shrink-0"
                                        title="Copy payload to clipboard"
                                      >
                                        {copiedEventId === event.id ? (
                                          <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Copied!
                                          </>
                                        ) : (
                                          <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                            Copy
                                          </>
                                        )}
                                      </button>
                                    </div>
                                    {loadingPayloads.has(event.id) ? (
                                      <div className="flex items-center justify-center py-8">
                                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                          <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                          </svg>
                                          Loading full payload...
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="bg-gray-900 dark:bg-gray-950 rounded-lg overflow-hidden">
                                        <div className="overflow-auto max-h-96">
                                          <pre className="p-4 text-sm text-gray-100 whitespace-pre-wrap break-all min-w-0">
                                            <code className="block break-all min-w-0">{formatFullPayload(fullPayloads[event.id] || event.payload)}</code>
                                          </pre>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tablet Table View (md to lg) - Horizontally scrollable */}
            <div className="hidden md:block lg:hidden bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                        ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                        Device
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                        Message
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                        Time
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {currentEvents.map((event) => {
                      const statusConfig = getStatusConfig(event.kind)
                      const isExpanded = expandedEvent === event.id
                      
                      return (
                        <React.Fragment key={event.id}>
                          <tr className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-xs font-mono text-gray-600 dark:text-gray-400">
                                {event.id}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className={`w-4 h-4 flex-shrink-0 ${statusConfig.text}`}>
                                  {statusConfig.icon}
                                </div>
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize ${statusConfig.badge}`}>
                                  {event.kind}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <Link
                                href={`/device/${encodeURIComponent(event.device)}`}
                                className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                                title={deviceNameMap[event.device] || event.device}
                              >
                                {deviceNameMap[event.device] || event.device}
                              </Link>
                            </td>
                            <td className="px-4 py-3 max-w-xs">
                              <div className="text-sm text-gray-900 dark:text-white truncate">
                                {safeDisplayPayload(event.payload)}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                <div className="font-medium">
                                  {event.ts ? formatRelativeTime(event.ts) : 'Unknown time'}
                                </div>
                                <div className="text-xs opacity-75">
                                  {event.ts ? formatExactTime(event.ts).split(' ')[1] : 'No timestamp'}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={async (e) => {
                                  e.preventDefault()
                                  if (isExpanded) {
                                    setExpandedEvent(null)
                                  } else {
                                    setExpandedEvent(event.id)
                                    await fetchFullPayload(event.id)
                                  }
                                }}
                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                                disabled={loadingPayloads.has(event.id)}
                              >
                                {loadingPayloads.has(event.id) ? (
                                  <span className="text-xs">Loading...</span>
                                ) : (
                                  <span className="text-xs">{isExpanded ? 'Hide' : 'Show'}</span>
                                )}
                              </button>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={6} className="px-0 py-0 bg-gray-50 dark:bg-gray-900">
                                <div className="px-4 py-3">
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                                        Raw Payload
                                      </h4>
                                      <button
                                        onClick={() => {
                                          const payloadToShow = fullPayloads[event.id] || event.payload
                                          copyToClipboard(formatFullPayload(payloadToShow), event.id)
                                        }}
                                        className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                      >
                                        {copiedEventId === event.id ? 'Copied!' : 'Copy'}
                                      </button>
                                    </div>
                                    <div className="bg-gray-100 dark:bg-gray-800 rounded p-3 overflow-auto">
                                      <pre className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-all">
                                        <code>{formatFullPayload(fullPayloads[event.id] || event.payload)}</code>
                                      </pre>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card View (sm and below) */}
            <div className="block md:hidden space-y-4">
              {currentEvents.map((event) => {
                const statusConfig = getStatusConfig(event.kind)
                const isExpanded = expandedEvent === event.id
                
                return (
                  <div key={event.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                    {/* Card Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 flex-shrink-0 ${statusConfig.text}`}>
                          {statusConfig.icon}
                        </div>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize ${statusConfig.badge}`}>
                          {event.kind}
                        </span>
                      </div>
                      <div className="text-xs font-mono text-gray-500 dark:text-gray-400">
                        #{event.id}
                      </div>
                    </div>

                    {/* Device */}
                    <div className="mb-3">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Device</div>
                      <Link
                        href={`/device/${encodeURIComponent(event.device)}`}
                        className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors text-sm"
                      >
                        {deviceNameMap[event.device] || event.device}
                      </Link>
                    </div>

                    {/* Message */}
                    <div className="mb-3">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Message</div>
                      <div className="text-sm text-gray-900 dark:text-white break-words">
                        {safeDisplayPayload(event.payload)}
                      </div>
                    </div>

                    {/* Time and Actions */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          {event.ts ? formatRelativeTime(event.ts) : 'Unknown time'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-500">
                          {event.ts ? formatExactTime(event.ts) : 'No timestamp'}
                        </div>
                      </div>
                      <button
                        onClick={async (e) => {
                          e.preventDefault()
                          if (isExpanded) {
                            setExpandedEvent(null)
                          } else {
                            setExpandedEvent(event.id)
                            await fetchFullPayload(event.id)
                          }
                        }}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                        disabled={loadingPayloads.has(event.id)}
                      >
                        {loadingPayloads.has(event.id) ? 'Loading...' : (isExpanded ? 'Hide Payload' : 'Show Payload')}
                      </button>
                    </div>

                    {/* Expanded Payload */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                            Raw Payload
                          </h4>
                          <button
                            onClick={() => {
                              const payloadToShow = fullPayloads[event.id] || event.payload
                              copyToClipboard(formatFullPayload(payloadToShow), event.id)
                            }}
                            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                          >
                            {copiedEventId === event.id ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-900 rounded p-3 overflow-auto max-h-64">
                          <pre className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-all">
                            <code>{formatFullPayload(fullPayloads[event.id] || event.payload)}</code>
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6 rounded-b-xl">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                      <span className="font-medium">{Math.min(endIndex, filteredEvents.length)}</span> of{' '}
                      <span className="font-medium">{filteredEvents.length}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Previous</span>
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                      
                      {/* Page numbers */}
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => {
                          // Show first page, last page, current page, and 2 pages before/after current
                          return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 2
                        })
                        .map((page, index, array) => (
                          <React.Fragment key={page}>
                            {/* Add ellipsis if there's a gap */}
                            {index > 0 && page - array[index - 1] > 1 && (
                              <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300">
                                ...
                              </span>
                            )}
                            <button
                              onClick={() => setCurrentPage(page)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                page === currentPage
                                  ? 'z-10 bg-blue-50 dark:bg-blue-900 border-blue-500 text-blue-600 dark:text-blue-400'
                                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                              }`}
                            >
                              {page}
                            </button>
                          </React.Fragment>
                        ))}
                      
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Next</span>
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function EventsPage() {
  return (
    <Suspense fallback={<EventsPageSkeleton />}>
      <EventsPageContent />
    </Suspense>
  )
}

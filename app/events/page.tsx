"use client"

// Force dynamic rendering and disable caching for events page
export const dynamic = 'force-dynamic'

import React, { useEffect, useState, Suspense, useMemo } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { formatRelativeTime, formatExactTime } from "../../src/lib/time"
import { EventsPageSkeleton } from "../../src/components/skeleton/EventsPageSkeleton"
import { DevicePageNavigation } from "../../src/components/navigation/DevicePageNavigation"
import { bundleEvents, formatPayloadPreview, type FleetEvent, type BundledEvent } from "../../src/lib/eventBundling"

// Helper function to get circular status icons (from RecentEventsWidget)
const getStatusIcon = (kind: string) => {
  switch (kind.toLowerCase()) {
    case 'success':
      return (
        <div className="w-6 h-6 bg-green-400 rounded-full flex items-center justify-center" title="Success">
          <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )
    case 'warning':
      return (
        <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center" title="Warning">
          <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM11 14a1 1 0 11-2 0 1 1 0 012 0zm-1-4a1 1 0 011 1v2a1 1 0 11-2 0v-2a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
        </div>
      )
    case 'error':
      return (
        <div className="w-6 h-6 bg-red-400 rounded-full flex items-center justify-center" title="Error">
          <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
      )
    case 'info':
      return (
        <div className="w-6 h-6 bg-blue-400 rounded-full flex items-center justify-center" title="Info">
          <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </div>
      )
    case 'system':
      return (
        <div className="w-6 h-6 bg-purple-400 rounded-full flex items-center justify-center" title="System">
          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
      )
    default:
      return (
        <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center" title="Unknown">
          <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
        </div>
      )
  }
}

// Force dynamic rendering for this page to avoid SSG issues with useSearchParams

// Use FleetEvent type directly instead of empty interface
type Event = FleetEvent

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

// Helper function to get event message - uses shared bundling utilities
const getEventMessage = (event: BundledEvent): string => {
  if (event.isBundle) {
    return event.message || 'Bundle of events' // Already processed by bundling logic
  }
  
  // **PRIORITY 1: Use event-level message field if available (from database)**
  if (event.message && typeof event.message === 'string') {
    return event.message.length > 150 ? event.message.substring(0, 150) + '...' : event.message;
  }
  
  // **PRIORITY 2: Fallback to payload message extraction**
  const originalEvent = event as unknown as Event
  return formatPayloadPreview(originalEvent.payload);
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
      // **PRIORITY 1: Look for direct message field (ReportMate events)**
      if (payload.message && typeof payload.message === 'string') {
        const message = payload.message
        return message.length > 150 ? message.substring(0, 150) + '...' : message
      }
      
      // Handle summarized payloads (from our new API structure)
      if (payload.summary) {
        return payload.summary
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
        return `System event (${keys.length} properties): ${keys.slice(0, 3).join(', ')}...`
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
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null)
  const [copiedEventId, setCopiedEventId] = useState<string | null>(null)
  const [deviceNameMap, setDeviceNameMap] = useState<Record<string, string>>({})
  const [inventoryMap, setInventoryMap] = useState<Record<string, { deviceName: string; serialNumber: string; assetTag?: string }>>({})
  const [fullPayloads, setFullPayloads] = useState<Record<string, unknown>>({})
  const [loadingPayloads, setLoadingPayloads] = useState<Set<string>>(new Set())
  const [totalEvents, setTotalEvents] = useState(0)
  
  // Date range state (default to last 48 hours)
  const [startDate, setStartDate] = useState(() => {
    const date = new Date()
    date.setTime(date.getTime() - (48 * 60 * 60 * 1000)) // 48 hours ago in milliseconds
    return date.toISOString().split('T')[0] // YYYY-MM-DD format
  })
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0] // Today
  })
  
  // Filter counts from API (show total counts regardless of current page)
  // REMOVED: No longer displaying counts in filter buttons
  
  const searchParams = useSearchParams()
  
  const EVENTS_PER_PAGE = 100  // 100 events per page for /events page
  
  // Valid event categories - filter out everything else
  const VALID_EVENT_KINDS = ['system', 'info', 'error', 'warning', 'success', 'data_collection']

  // Bundle events using the shared bundling logic
  const bundledEvents: BundledEvent[] = useMemo(() => {
    if (!events.length) return []
    
    // Convert events to FleetEvent format and bundle them
    const fleetEvents: FleetEvent[] = events.map(event => ({
      id: event.id,
      device: event.device,
      kind: event.kind,
      ts: event.ts,
      message: (event as any).message,
      payload: event.payload
    }))
    
    return bundleEvents(fleetEvents)
  }, [events])

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
          
          // Handle the response format from /api/devices  
          let devices = []
          if (Array.isArray(data)) {
            // Direct array format
            devices = data
          } else if (data.success && Array.isArray(data.devices)) {
            // Wrapped format: {success: true, devices: [...]}
            devices = data.devices
          }
          
          // Build device name mapping (serial -> name) and inventory mapping
          const nameMap: Record<string, string> = {}
          const inventoryMap: Record<string, { deviceName: string; serialNumber: string; assetTag?: string }> = {}
          
          devices.forEach((device: any) => {
            if (device.serialNumber) {
              // Get inventory from the correct nested path (like dashboard does)
              const inventory = device.modules?.inventory || {}
              const deviceName = inventory.deviceName || device.name || device.serialNumber
              
              nameMap[device.serialNumber as string] = deviceName as string
              
              // Build inventory data mapping
              inventoryMap[device.serialNumber as string] = {
                deviceName: deviceName as string,
                serialNumber: device.serialNumber as string,
                assetTag: inventory.assetTag || undefined
              }
            }
          })
          setDeviceNameMap(nameMap)
          setInventoryMap(inventoryMap)
          console.log('[EVENTS PAGE] Device inventory loaded from /api/devices:', { devices: devices.length, nameMap, inventoryMap })
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
        setLoading(true)
        console.log('[EVENTS PAGE] Fetching events with pagination and date range...', { 
          currentPage, 
          EVENTS_PER_PAGE, 
          startDate, 
          endDate 
        })
        
        // Calculate offset for API pagination
        const offset = (currentPage - 1) * EVENTS_PER_PAGE
        
        // Build query parameters
        const queryParams = new URLSearchParams()
        queryParams.append('limit', EVENTS_PER_PAGE.toString())
        queryParams.append('offset', offset.toString())
        if (startDate) {
          // Convert YYYY-MM-DD to ISO string with start of day
          const startDateTime = new Date(startDate + 'T00:00:00.000Z').toISOString()
          queryParams.append('startDate', startDateTime)
        }
        if (endDate) {
          // Convert YYYY-MM-DD to ISO string with end of day
          const endDateTime = new Date(endDate + 'T23:59:59.999Z').toISOString()
          queryParams.append('endDate', endDateTime)
        }
        
        // Use Next.js API route with pagination and date filtering parameters
        const apiUrl = `/api/events?${queryParams.toString()}`
        const response = await fetch(apiUrl)
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
          
          setEvents(filteredEvents)
          
          // Set API filter counts (total counts for the date range, not just current page)
          // REMOVED: No longer displaying counts in filter buttons
          
          // Set total events count for pagination (if provided by API)
          if (data.totalEvents) {
            setTotalEvents(data.totalEvents)
          } else {
            // If we get less than requested, we've reached the end
            if (filteredEvents.length < EVENTS_PER_PAGE) {
              setTotalEvents(offset + filteredEvents.length)
            } else {
              // Estimate total (this will be corrected when we reach the end)
              setTotalEvents(Math.max(totalEvents, offset + EVENTS_PER_PAGE + 1))
            }
          }
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
  }, [currentPage, EVENTS_PER_PAGE, startDate, endDate]) // Re-fetch when page or date range changes

  // Filter events based on selected type and search query (client-side)
  const filteredEvents = bundledEvents.filter(event => {
    // Filter by type first
    const typeMatch = filterType === 'all' || (event.bundledKinds || []).some(kind => kind.toLowerCase() === filterType.toLowerCase())
    
    // Then filter by search query if provided
    if (!searchQuery.trim()) {
      return typeMatch
    }
    
    const query = searchQuery.toLowerCase()
    const searchMatch = (
      event.id.toLowerCase().includes(query) ||
      event.device.toLowerCase().includes(query) ||
      (event.bundledKinds || []).some(kind => kind.toLowerCase().includes(query)) ||
      getEventMessage(event).toLowerCase().includes(query) ||
      (deviceNameMap[event.device] && deviceNameMap[event.device].toLowerCase().includes(query))
    )
    
    return typeMatch && searchMatch
  })

  // Reset to page 1 when filter or search changes, but NOT when page changes
  useEffect(() => {
    setCurrentPage(1)
  }, [filterType, searchQuery])

  // Calculate pagination for filtered events (client-side pagination on current page)
  const totalPages = Math.ceil(filteredEvents.length / EVENTS_PER_PAGE)
  const startIndex = 0 // Always show from start since we're paginating server-side
  const endIndex = filteredEvents.length
  const currentEvents = filteredEvents // Show all filtered events from current server page

  // Calculate actual total pages based on total events and whether we're filtering
  const actualTotalPages = searchQuery.trim() || filterType !== 'all' 
    ? totalPages // Use client-side calculation when filtering
    : Math.ceil(totalEvents / EVENTS_PER_PAGE) // Use server-side total when not filtering

  // Helper function to format full payload for display
  const formatFullPayload = (payload: any): string => {
    try {
      if (!payload) return 'No payload'
      if (typeof payload === 'string') return payload
      
      // Handle bundled events with multiple payloads
      if (payload.isBundle && payload.payloads) {
        let result = `Bundle Summary:\n`
        result += `- Event Count: ${payload.count}\n`
        result += `- Event Types: ${(payload.bundledKinds || []).join(', ')}\n`
        result += `- Message: ${payload.message}\n\n`
        result += `Individual Event Payloads:\n`
        result += `${'='.repeat(50)}\n\n`
        
        payload.payloads.forEach((item: any, index: number) => {
          result += `Event ${index + 1} (ID: ${item.eventId}):\n`
          result += `${'-'.repeat(30)}\n`
          if (item.error) {
            result += `Error: ${item.error}\n`
          } else {
            result += typeof item.payload === 'string' 
              ? item.payload 
              : JSON.stringify(item.payload, null, 2)
          }
          result += `\n\n`
        })
        
        return result
      }
      
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

    // Ensure eventId is a string
    const eventIdStr = String(eventId)
    setLoadingPayloads(prev => new Set(prev).add(eventIdStr))
    
    try {
      console.log(`[EVENTS PAGE] Fetching full payload for event: ${eventIdStr}`)
      
      // For bundled events, we need to handle them differently
      if (eventIdStr.startsWith('bundle-')) {
        // For bundled events, fetch payloads from all constituent events
        const bundledEvent = filteredEvents.find(e => e.id === eventIdStr)
        if (bundledEvent && bundledEvent.isBundle && bundledEvent.eventIds) {
          // Fetching payloads for bundled events
          
          // Fetch payloads for all bundled events in parallel with timeout
          const payloadPromises = bundledEvent.eventIds.map(async (realEventId: string) => {
            try {
              // Create timeout promise
              const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Request timeout after 30 seconds')), 30000)
              })
              
              const fetchPromise = fetch(`/api/events/${realEventId}/payload`)
              const response = await Promise.race([fetchPromise, timeoutPromise]) as Response
              
              if (!response.ok) {
                console.error(`[EVENTS PAGE] Failed to fetch payload for event ${realEventId}: ${response.status}`)
                return { eventId: realEventId, error: `Failed to fetch (${response.status})` }
              }
              const data = await response.json()
              return { eventId: realEventId, payload: data.payload || 'No payload data' }
            } catch (error) {
              console.error(`[EVENTS PAGE] Error fetching payload for event ${realEventId}:`, error)
              const errorMessage = error instanceof Error ? error.message : 'Unknown error'
              return { eventId: realEventId, error: errorMessage }
            }
          })
          
          const payloadResults = await Promise.all(payloadPromises)
          const bundleInfo = {
            eventIds: bundledEvent.eventIds,
            count: bundledEvent.count,
            bundledKinds: bundledEvent.bundledKinds,
            message: bundledEvent.message,
            payloads: payloadResults,
            isBundle: true
          }
          setFullPayloads(prev => ({
            ...prev,
            [eventIdStr]: bundleInfo
          }))
          return
        }
      }
      
      // For regular events, fetch from API with timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout after 30 seconds')), 30000)
      })
      
      const fetchPromise = fetch(`/api/events/${encodeURIComponent(eventIdStr)}/payload`)
      const response = await Promise.race([fetchPromise, timeoutPromise]) as Response
      
      if (response.ok) {
        const data = await response.json()
        console.log(`[EVENTS PAGE] Successfully fetched full payload for ${eventIdStr}`)
        
        setFullPayloads(prev => ({
          ...prev,
          [eventIdStr]: data.payload
        }))
      } else {
        console.error(`[EVENTS PAGE] Failed to fetch payload for ${eventIdStr}:`, response.status)
        const errorMessage = `Unable to load payload (HTTP ${response.status})`
        // Fallback to showing bundle info for bundled events
        const bundledEvent = filteredEvents.find(e => e.id === eventIdStr)
        if (bundledEvent) {
          setFullPayloads(prev => ({
            ...prev,
            [eventIdStr]: bundledEvent.isBundle ? { 
              message: bundledEvent.message,
              eventIds: bundledEvent.eventIds,
              isBundle: true,
              error: errorMessage 
            } : errorMessage
          }))
        } else {
          setFullPayloads(prev => ({
            ...prev,
            [eventIdStr]: errorMessage
          }))
        }
      }
    } catch (error) {
      console.error(`[EVENTS PAGE] Error fetching payload for ${eventIdStr}:`, error)
      const errorMessage = error instanceof Error ? error.message : 'Error loading payload'
      const bundledEvent = filteredEvents.find(e => e.id === eventIdStr)
      if (bundledEvent) {
        setFullPayloads(prev => ({
          ...prev,
          [eventIdStr]: bundledEvent.isBundle ? { 
            message: bundledEvent.message,
            eventIds: bundledEvent.eventIds,
            isBundle: true,
            error: errorMessage 
          } : errorMessage
        }))
      } else {
        setFullPayloads(prev => ({
          ...prev,
          [eventIdStr]: errorMessage
        }))
      }
    } finally {
      setLoadingPayloads(prev => {
        const newSet = new Set(prev)
        newSet.delete(eventIdStr)
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
          badge: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
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

  // Use API filter counts (total counts for the entire date range, not just current page)
  // REMOVED: No longer displaying counts - filters now work without count display

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
                All
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
                <div className="min-w-0">
                  <h1 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                    All Events
                  </h1>
                </div>
              </div>
            </div>

            {/* Right side - Navigation */}
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              {/* Navigation */}
              <div className="hidden lg:flex">
                <DevicePageNavigation className="flex items-center gap-2" currentPage="events" />
              </div>

              {/* Mobile Navigation */}
              <div className="lg:hidden">
                <DevicePageNavigation className="flex items-center gap-2" currentPage="events" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">


        {/* Events Table */}
        <>
          {/* Desktop Table View (lg and up) */}
          <div className="hidden lg:block bg-white dark:bg-gray-800 rounded-t-xl shadow-sm border-l border-r border-t border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Table Header with Search */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Events Feed
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Real-time activity from fleet
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                  {/* Date Range Picker - Back on left */}
                  <div className="flex items-center gap-2 text-sm">
                    <label className="text-gray-600 dark:text-gray-400 font-medium whitespace-nowrap">
                      Date Range:
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => {
                          setStartDate(e.target.value)
                          setCurrentPage(1) // Reset to first page when date changes
                        }}
                        className="block text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <span className="text-gray-400">to</span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => {
                          setEndDate(e.target.value)
                          setCurrentPage(1) // Reset to first page when date changes
                        }}
                        className="block text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  
                  {/* Search Input - Moved to right */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Search events..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="block w-full sm:w-64 pl-10 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              <div className="overflow-x-auto">
                <table className="w-full table-fixed">
                  <colgroup>
                    <col style={{width: '12%'}} />
                    <col style={{width: '8.5%'}} />
                    <col style={{width: '20%'}} />
                    <col style={{width: '35%'}} />
                    <col style={{width: '12.75%'}} />
                    <col style={{width: '11.75%'}} />
                  </colgroup>
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    {/* Filter Row */}
                    <tr className="border-b border-gray-200 dark:border-gray-600">
                      <td colSpan={6} className="px-6 py-3">
                        {/* Desktop filter tabs */}
                        <nav className="hidden sm:flex flex-wrap gap-2">
                          {[
                            { key: 'success', label: 'Success' },
                            { key: 'warning', label: 'Warnings' },
                            { key: 'error', label: 'Errors' },
                            { key: 'info', label: 'Info' },
                            { key: 'system', label: 'System' },
                          ].map((filter) => {
                            const isActive = filterType === filter.key
                            const statusConfig = getStatusConfig(filter.key)
                            
                            return (
                              <button
                                key={filter.key}
                                onClick={() => setFilterType(isActive ? 'all' : filter.key)}
                                className={`${
                                  isActive
                                    ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-600'
                                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-500'
                                } px-3 py-1.5 border rounded-lg text-sm font-medium flex items-center gap-2 transition-colors`}
                              >
                                {statusConfig && (
                                  <div className={`w-4 h-4 flex-shrink-0 -mt-1 ${statusConfig.text}`}>
                                    {statusConfig.icon}
                                  </div>
                                )}
                                <span className="hidden md:inline">{filter.label}</span>
                                <span className="md:hidden">{filter.label.split(' ')[0]}</span>
                              </button>
                            )
                          })}
                        </nav>
                        {/* Mobile filter dropdown */}
                        <div className="sm:hidden">
                          <div className="relative">
                            <select
                              value={filterType}
                              onChange={(e) => setFilterType(e.target.value)}
                              className="appearance-none block w-full pl-3 pr-10 py-2 text-sm border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm cursor-pointer"
                            >
                              {[
                                { key: 'all', label: 'All Events' },
                                { key: 'success', label: 'Success Events' },
                                { key: 'warning', label: 'Warning Events' },
                                { key: 'error', label: 'Error Events' },
                                { key: 'info', label: 'Info Events' },
                                { key: 'system', label: 'System Events' },
                              ].map((filter) => (
                                <option key={filter.key} value={filter.key}>
                                  {filter.label}
                                </option>
                              ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 dark:text-gray-500">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                    {/* Header Row */}
                    <tr>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Device
                      </th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Message
                      </th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Payloads
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {currentEvents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                          <div className="flex flex-col items-center justify-center">
                            <svg className="w-12 h-12 mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-lg font-medium mb-1">No events found</p>
                            <p className="text-sm">Try adjusting your filter settings</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      currentEvents.map((event) => {
                      const statusConfig = getStatusConfig(event.kind)
                      const isExpanded = expandedEvent === event.id
                      
                      return (
                        <React.Fragment key={event.id}>
                          <tr className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                            <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center justify-center">
                                {getStatusIcon(event.kind)}
                              </div>
                            </td>
                            <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                              <span 
                                className="text-sm text-gray-900 dark:text-gray-100 font-mono truncate block max-w-20" 
                                title={`#${event.id}`}
                              >
                                #{event.id}
                              </span>
                            </td>
                            <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                              <div>
                                <Link
                                  href={`/device/${encodeURIComponent(event.device)}#events`}
                                  className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors block truncate"
                                  title={inventoryMap[event.device]?.deviceName || event.device}
                                >
                                  {inventoryMap[event.device]?.deviceName || event.device}
                                </Link>
                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {event.device}
                                  {inventoryMap[event.device]?.assetTag && (
                                    <span className="ml-2 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                                      {inventoryMap[event.device].assetTag}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 lg:px-6 py-4">
                              <div className="text-sm text-gray-900 dark:text-white truncate">
                                {getEventMessage(event)}
                              </div>
                            </td>
                            <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                <div className="font-medium truncate">
                                  {event.ts ? formatRelativeTime(event.ts) : 'Unknown time'}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium">
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
                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 flex items-center justify-center"
                                disabled={loadingPayloads.has(event.id)}
                              >
                                {loadingPayloads.has(event.id) ? (
                                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                )}
                              </button>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={6} className="px-0 py-0 bg-gray-50 dark:bg-gray-900">
                                <div className="px-6 py-4">
                                  <div className="space-y-3">
                                    {/* Event Details */}
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center gap-4">
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-mono">
                                          #{event.id}
                                        </span>
                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                          <div className="font-medium">Full Timestamp:</div>
                                          <div className="text-xs">{event.ts ? formatExactTime(event.ts) : 'No timestamp'}</div>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                                          {fullPayloads[event.id] ? 'Full Raw Payload' : 'Raw Payload (from events list)'}
                                        </h4>
                                      </div>
                                      <button
                                        onClick={() => {
                                          const payloadToShow = fullPayloads[event.id] || (event.isBundle ? 
                                            { message: event.message, eventIds: event.eventIds, count: event.count, isBundle: true } : 
                                            'No payload available')
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
                                            <code className="block break-all min-w-0">{formatFullPayload(fullPayloads[event.id] || (event.isBundle ? 
                                              { message: event.message, eventIds: event.eventIds, count: event.count, isBundle: true } : 
                                              'No payload available'))}</code>
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
                    }))}
                  </tbody>
                </table>
              </div>
              {/* Bottom border for desktop table */}
              <div className="border-b border-gray-200 dark:border-gray-700"></div>
            </div>

            {/* Tablet Table View (md to lg) - Horizontally scrollable */}
            <div className="hidden md:block lg:hidden bg-white dark:bg-gray-800 rounded-t-xl shadow-sm border-l border-r border-t border-gray-200 dark:border-gray-700">
              {/* Table Header with Search */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Events Feed
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Real-time activity from all fleet devices
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                  {/* Date Range Picker - Back on left */}
                  <div className="flex items-center gap-2 text-xs">
                    <label className="text-gray-600 dark:text-gray-400 font-medium whitespace-nowrap">
                      Date:
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => {
                          setStartDate(e.target.value)
                          setCurrentPage(1)
                        }}
                        className="block text-xs border border-gray-300 dark:border-gray-600 rounded px-1.5 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <span className="text-gray-400 text-xs">to</span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => {
                          setEndDate(e.target.value)
                          setCurrentPage(1)
                        }}
                        className="block text-xs border border-gray-300 dark:border-gray-600 rounded px-1.5 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  {/* Search Input - Moved to right */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Search events..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="block w-full sm:w-48 pl-9 pr-7 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute inset-y-0 right-0 pr-2 flex items-center"
                      >
                        <svg className="h-3 w-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full table-fixed">
                  <colgroup>
                    <col style={{width: '12%'}} />
                    <col style={{width: '8.5%'}} />
                    <col style={{width: '20%'}} />
                    <col style={{width: '35%'}} />
                    <col style={{width: '12.75%'}} />
                    <col style={{width: '11.75%'}} />
                  </colgroup>
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    {/* Filter Row */}
                    <tr className="border-b border-gray-200 dark:border-gray-600">
                      <td colSpan={6} className="px-4 py-3">
                        {/* Desktop filter tabs */}
                        <nav className="hidden sm:flex flex-wrap gap-2">
                          {[
                            { key: 'success', label: 'Success' },
                            { key: 'warning', label: 'Warnings' },
                            { key: 'error', label: 'Errors' },
                            { key: 'info', label: 'Info' },
                            { key: 'system', label: 'System' },
                          ].map((filter) => {
                            const isActive = filterType === filter.key
                            const statusConfig = getStatusConfig(filter.key)
                            
                            return (
                              <button
                                key={filter.key}
                                onClick={() => setFilterType(isActive ? 'all' : filter.key)}
                                className={`${
                                  isActive
                                    ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-600'
                                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-500'
                                } px-3 py-1.5 border rounded-lg text-sm font-medium flex items-center gap-2 transition-colors`}
                              >
                                {statusConfig && (
                                  <div className={`w-4 h-4 flex-shrink-0 -mt-1 ${statusConfig.text}`}>
                                    {statusConfig.icon}
                                  </div>
                                )}
                                <span className="hidden lg:inline">{filter.label}</span>
                                <span className="lg:hidden">{filter.label.split(' ')[0]}</span>
                              </button>
                            )
                          })}
                        </nav>
                        {/* Mobile filter dropdown */}
                        <div className="sm:hidden">
                          <div className="relative">
                            <select
                              value={filterType}
                              onChange={(e) => setFilterType(e.target.value)}
                              className="appearance-none block w-full pl-3 pr-10 py-2 text-sm border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm cursor-pointer"
                            >
                              {[
                                { key: 'all', label: 'All Events' },
                                { key: 'success', label: 'Success Events' },
                                { key: 'warning', label: 'Warning Events' },
                                { key: 'error', label: 'Error Events' },
                                { key: 'info', label: 'Info Events' },
                                { key: 'system', label: 'System Events' },
                              ].map((filter) => (
                                <option key={filter.key} value={filter.key}>
                                  {filter.label}
                                </option>
                              ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 dark:text-gray-500">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                    {/* Header Row */}
                    <tr>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Device
                      </th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Message
                      </th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Payloads
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {currentEvents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                          <div className="flex flex-col items-center justify-center">
                            <svg className="w-12 h-12 mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-lg font-medium mb-1">No events found</p>
                            <p className="text-sm">Try adjusting your filter settings</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      currentEvents.map((event) => {
                      const statusConfig = getStatusConfig(event.kind)
                      const isExpanded = expandedEvent === event.id
                      
                      return (
                        <React.Fragment key={event.id}>
                          <tr className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                            <td className="px-4 lg:px-6 py-3 whitespace-nowrap">
                              <div className="flex items-center justify-center">
                                {getStatusIcon(event.kind)}
                              </div>
                            </td>
                            <td className="px-4 lg:px-6 py-3 whitespace-nowrap">
                              <span 
                                className="text-sm text-gray-900 dark:text-gray-100 font-mono max-w-20 block truncate"
                                title={`#${event.id}`}
                              >
                                #{event.id}
                              </span>
                            </td>
                            <td className="px-4 lg:px-6 py-3 whitespace-nowrap">
                              <div>
                                <Link
                                  href={`/device/${encodeURIComponent(event.device)}#events`}
                                  className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors block truncate"
                                  title={inventoryMap[event.device]?.deviceName || event.device}
                                >
                                  {inventoryMap[event.device]?.deviceName || event.device}
                                </Link>
                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {event.device}
                                  {inventoryMap[event.device]?.assetTag && (
                                    <span className="ml-1 px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                                      {inventoryMap[event.device].assetTag}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 max-w-xs">
                              <div className="text-sm text-gray-900 dark:text-white truncate">
                                {getEventMessage(event)}
                              </div>
                            </td>
                            <td className="px-4 lg:px-6 py-3 whitespace-nowrap">
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                <div className="font-medium truncate">
                                  {event.ts ? formatRelativeTime(event.ts) : 'Unknown time'}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 lg:px-6 py-3 whitespace-nowrap text-sm font-medium">
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
                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 flex items-center justify-center"
                                disabled={loadingPayloads.has(event.id)}
                              >
                                {loadingPayloads.has(event.id) ? (
                                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
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
                                      <div className="flex items-center gap-2">
                                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                                          Raw Payload
                                        </h4>
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-mono">
                                          #{event.id}
                                        </span>
                                      </div>
                                      <button
                                        onClick={() => {
                                          const payloadToShow = fullPayloads[event.id] || (event.isBundle ? 
                                            { message: event.message, eventIds: event.eventIds, count: event.count, isBundle: true } : 
                                            'No payload available')
                                          copyToClipboard(formatFullPayload(payloadToShow), event.id)
                                        }}
                                        className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                      >
                                        {copiedEventId === event.id ? 'Copied!' : 'Copy'}
                                      </button>
                                    </div>
                                    <div className="bg-gray-100 dark:bg-gray-800 rounded p-3 overflow-auto">
                                      <pre className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-all">
                                        <code>{formatFullPayload(fullPayloads[event.id] || (event.isBundle ? 
                                          { message: event.message, eventIds: event.eventIds, count: event.count, isBundle: true } : 
                                          'No payload available'))}</code>
                                      </pre>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    }))}
                  </tbody>
                </table>
              </div>
              {/* Bottom border for tablet table */}
              <div className="border-b border-gray-200 dark:border-gray-700"></div>
            </div>

            {/* Mobile Card View (sm and below) */}
            <div className="block md:hidden space-y-4">
              {/* Search Header for Mobile */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex flex-col gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Events Feed
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Real-time activity from all fleet devices
                    </p>
                  </div>
                  {/* Date Range Picker */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                      Date Range
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => {
                          setStartDate(e.target.value)
                          setCurrentPage(1)
                        }}
                        className="flex-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-gray-400 text-sm">to</span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => {
                          setEndDate(e.target.value)
                          setCurrentPage(1)
                        }}
                        className="flex-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
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
                      placeholder="Search events..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="block w-full pl-9 pr-7 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute inset-y-0 right-0 pr-2 flex items-center"
                      >
                        <svg className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              {currentEvents.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
                  <div className="flex flex-col items-center justify-center text-center">
                    <svg className="w-12 h-12 mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-lg font-medium mb-1 text-gray-900 dark:text-white">No events found</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Try adjusting your filter settings</p>
                  </div>
                </div>
              ) : (
                currentEvents.map((event) => {
                const statusConfig = getStatusConfig(event.kind)
                const isExpanded = expandedEvent === event.id
                
                return (
                  <div key={event.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                    {/* Card Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusIcon(event.kind)}
                        <span 
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-mono max-w-24 truncate"
                          title={`#${event.id}`}
                        >
                          #{event.id}
                        </span>
                      </div>
                    </div>

                    {/* Device */}
                    <div className="mb-3">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Device</div>
                      <div>
                        <Link
                          href={`/device/${encodeURIComponent(event.device)}#events`}
                          className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors text-sm block"
                        >
                          {inventoryMap[event.device]?.deviceName || event.device}
                        </Link>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {event.device}
                          {inventoryMap[event.device]?.assetTag && (
                            <span className="ml-2 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                              {inventoryMap[event.device].assetTag}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Message */}
                    <div className="mb-3">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Message</div>
                      <div className="text-sm text-gray-900 dark:text-white break-words">
                        {getEventMessage(event)}
                      </div>
                    </div>

                    {/* Time and Actions */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          {event.ts ? formatRelativeTime(event.ts) : 'Unknown time'}
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
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium flex items-center justify-center"
                        disabled={loadingPayloads.has(event.id)}
                      >
                        {loadingPayloads.has(event.id) ? (
                          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        )}
                      </button>
                    </div>

                    {/* Expanded Payload */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        {/* Event Details */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span 
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-mono max-w-24 truncate"
                              title={`#${event.id}`}
                            >
                              #{event.id}
                            </span>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              <div className="font-medium">Full Timestamp:</div>
                              <div>{event.ts ? formatExactTime(event.ts) : 'No timestamp'}</div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                              Raw Payload
                            </h4>
                          </div>
                          <button
                            onClick={() => {
                              const payloadToShow = fullPayloads[event.id] || (event.isBundle ? 
                                { message: event.message, eventIds: event.eventIds, count: event.count, isBundle: true } : 
                                'No payload available')
                              copyToClipboard(formatFullPayload(payloadToShow), event.id)
                            }}
                            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                          >
                            {copiedEventId === event.id ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-900 rounded p-3 overflow-auto max-h-64">
                          <pre className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-all">
                            <code>{formatFullPayload(fullPayloads[event.id] || (event.isBundle ? 
                              { message: event.message, eventIds: event.eventIds, count: event.count, isBundle: true } : 
                              'No payload available'))}</code>
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                )
              }))}
            </div>

            {/* Pagination */}
            {actualTotalPages > 1 && (
              <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-l border-r border-b border-gray-200 dark:border-gray-700 sm:px-6 rounded-b-xl shadow-sm">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, actualTotalPages))}
                    disabled={currentPage === actualTotalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Showing page <span className="font-medium">{currentPage}</span> of{' '}
                      <span className="font-medium">{actualTotalPages}</span> 
                      {searchQuery.trim() || filterType !== 'all' ? (
                        <span className="ml-1 text-gray-500">({filteredEvents.length} filtered events)</span>
                      ) : (
                        <span className="ml-1 text-gray-500">({totalEvents.toLocaleString()} total events)</span>
                      )}
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
                      {Array.from({ length: actualTotalPages }, (_, i) => i + 1)
                        .filter(page => {
                          // Show first page, last page, current page, and 2 pages before/after current
                          return page === 1 || page === actualTotalPages || Math.abs(page - currentPage) <= 2
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
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, actualTotalPages))}
                        disabled={currentPage === actualTotalPages}
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

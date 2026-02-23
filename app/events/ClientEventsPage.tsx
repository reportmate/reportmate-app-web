"use client"

// Force dynamic rendering and disable caching for events page
export const dynamic = 'force-dynamic'

import React, { useEffect, useState, Suspense, useMemo, useRef, useCallback } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { formatRelativeTime, formatExactTime } from "../../src/lib/time"
import { EventsPageSkeleton } from "../../src/components/skeleton/EventsPageSkeleton"
import { bundleEvents, formatPayloadPreview, type FleetEvent, type BundledEvent } from "../../src/lib/eventBundling"
import { CopyButton } from "../../src/components/ui/CopyButton"
import { usePlatformFilterSafe, normalizePlatform } from "../../src/providers/PlatformFilterProvider"

const VALID_EVENT_KINDS: ReadonlyArray<string> = ['system', 'info', 'error', 'warning', 'success', 'data_collection']

// Helper function to get status icons matching the filter button style (no circles)
const getStatusIcon = (kind: string) => {
  switch (kind.toLowerCase()) {
    case 'success':
      return (
        <div className="w-5 h-5 text-green-500" title="Success">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
      )
    case 'warning':
      return (
        <div className="w-5 h-5 text-yellow-500" title="Warning">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
      )
    case 'error':
      return (
        <div className="w-5 h-5 text-red-500" title="Error">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
      )
    case 'info':
      return (
        <div className="w-5 h-5 text-blue-500" title="Info">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </div>
      )
    case 'system':
      return (
        <div className="w-5 h-5 text-purple-500" title="System">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
          </svg>
        </div>
      )
    default:
      return (
        <div className="w-5 h-5 text-gray-400" title="Unknown">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </div>
      )
  }
}

// Helper to format event ID for display (handles bundle IDs cleanly)
const formatEventId = (id: string | number, eventIds?: string[]): string => {
  const idStr = String(id)
  if (idStr.startsWith('bundle-')) {
    // For bundles, show the first event ID from the bundle
    if (eventIds && eventIds.length > 0) {
      return `#${eventIds[0]}`
    }
    return 'Bundle'
  }
  return `#${idStr}`
}

// Helper to check if ID is a bundle ID
const isBundleId = (id: string | number): boolean => {
  return String(id).startsWith('bundle-')
}

// Get styling for filter buttons (matching EventsTab.tsx design)
function getFilterStyles(key: string, isActive: boolean) {
  const baseColors: Record<string, { active: string; inactive: string }> = {
    success: {
      active: 'bg-green-700 text-white border-green-800 shadow-md dark:bg-green-600 dark:border-green-700',
      inactive: 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200 hover:border-green-300 dark:bg-green-900/40 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900/60'
    },
    warning: {
      active: 'bg-yellow-600 text-white border-yellow-700 shadow-md dark:bg-yellow-500 dark:border-yellow-600',
      inactive: 'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200 hover:border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-400 dark:border-yellow-800 dark:hover:bg-yellow-900/60'
    },
    error: {
      active: 'bg-red-700 text-white border-red-800 shadow-md dark:bg-red-600 dark:border-red-700',
      inactive: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200 hover:border-red-300 dark:bg-red-900/40 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/60'
    },
    info: {
      active: 'bg-blue-700 text-white border-blue-800 shadow-md dark:bg-blue-600 dark:border-blue-700',
      inactive: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200 hover:border-blue-300 dark:bg-blue-900/40 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900/60'
    },
    system: {
      active: 'bg-purple-700 text-white border-purple-800 shadow-md dark:bg-purple-600 dark:border-purple-700',
      inactive: 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200 hover:border-purple-300 dark:bg-purple-900/40 dark:text-purple-400 dark:border-purple-800 dark:hover:bg-purple-900/60'
    },
  }
  return baseColors[key]?.[isActive ? 'active' : 'inactive'] || baseColors.info.inactive
}

// Force dynamic rendering for this page to avoid SSG issues with useSearchParams

// Use FleetEvent type directly instead of empty interface
type Event = FleetEvent

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

function EventsPageContent() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null)
  // Device name map removed - events API now includes deviceName and assetTag directly
  const [fullPayloads, setFullPayloads] = useState<Record<string, unknown>>({})
  const [loadingPayloads, setLoadingPayloads] = useState<Set<string>>(new Set())
  const [, setTotalEvents] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const { platformFilter, isPlatformVisible } = usePlatformFilterSafe()
  
  // Ref for infinite scroll sentinel
  const loadMoreRef = useRef<HTMLDivElement>(null)
  
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
  
  const EVENTS_PER_PAGE = 100  // 100 events per batch for infinite scroll
  
  // Valid event categories - filter out everything else
  // Bundle events using the shared bundling logic
  const bundledEvents: BundledEvent[] = useMemo(() => {
    if (!events.length) return []
    
    // Convert events to FleetEvent format and bundle them
    const fleetEvents: FleetEvent[] = events.map(event => ({
      id: event.id,
      device: event.device,
      deviceName: (event as any).deviceName,
      assetTag: (event as any).assetTag,
      platform: (event as any).platform,
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

  // Device names fetch removed - events API now includes deviceName and assetTag directly

  // Fetch events function for infinite scroll
  const fetchEvents = useCallback(async (currentOffset: number, isLoadMore: boolean = false) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true)
      } else {
        setLoading(true)
      }
      
      // Build query parameters
      const queryParams = new URLSearchParams()
      queryParams.append('limit', EVENTS_PER_PAGE.toString())
      queryParams.append('offset', currentOffset.toString())
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
      
      // API returns: {success: true, events: [...]}
      if (data.success && Array.isArray(data.events)) {
        
        // Filter events to only include valid categories
        const newEvents = data.events.filter((event: Event) => 
          VALID_EVENT_KINDS.includes(event.kind?.toLowerCase())
        )
        
        if (isLoadMore) {
          // Append to existing events
          setEvents(prev => [...prev, ...newEvents])
        } else {
          // Replace events (initial load or filter change)
          setEvents(newEvents)
        }
        
        // Check if there are more events to load
        setHasMore(newEvents.length >= EVENTS_PER_PAGE)
        
        // Update offset for next load
        setOffset(currentOffset + newEvents.length)
        
        // Set total events count if provided by API
        if (data.totalEvents) {
          setTotalEvents(data.totalEvents)
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
      setLoadingMore(false)
    }
  }, [startDate, endDate, EVENTS_PER_PAGE])

  // Initial fetch when date range changes
  useEffect(() => {
    setEvents([])
    setOffset(0)
    setHasMore(true)
    fetchEvents(0, false)
  }, [startDate, endDate, fetchEvents])

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          fetchEvents(offset, true)
        }
      },
      { threshold: 0.1 }
    )

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }

    return () => observer.disconnect()
  }, [hasMore, loading, loadingMore, offset, fetchEvents])

  // Filter events based on platform, selected type and search query (client-side)
  const filteredEvents = bundledEvents.filter(event => {
    // Filter by platform first (global filter)
    if (platformFilter) {
      const eventPlatform = normalizePlatform((event as any).platform)
      if (!isPlatformVisible(eventPlatform)) {
        return false
      }
    }
    
    // Filter by type
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
      (event.deviceName && event.deviceName.toLowerCase().includes(query)) ||
      (event.assetTag && event.assetTag.toLowerCase().includes(query))
    )
    
    return typeMatch && searchMatch
  })

  // currentEvents is just filteredEvents for infinite scroll (no client-side pagination)
  const currentEvents = filteredEvents

  // Helper function to format full payload for display
  const formatFullPayload = (payload: any): string => {
    try {
      if (!payload) return 'No payload'
      if (typeof payload === 'string') return payload
      
      // Handle bundled events with multiple payloads
      if (payload.isBundle && payload.payloads) {
        // Extract module names from all payloads
        const moduleNames = new Set<string>()
        payload.payloads.forEach((item: any) => {
          const p = item.payload
          if (p?.modules && Array.isArray(p.modules)) {
            p.modules.forEach((mod: string) => moduleNames.add(mod))
          } else if (p?.modules_processed && Array.isArray(p.modules_processed)) {
            p.modules_processed.forEach((mod: string) => moduleNames.add(mod))
          } else if (p?.moduleData && typeof p.moduleData === 'object') {
            Object.keys(p.moduleData).forEach((mod: string) => moduleNames.add(mod))
          }
          // Detect Installs module by its characteristic keys
          if (p?.full_installs_data || p?.module_status || (p?.session_id && (p?.success_count !== undefined || p?.error_count !== undefined))) {
            moduleNames.add('installs')
          }
        })
        
        let result = `Bundle Summary:\n`
        result += `- Event Count: ${payload.count}\n`
        if (moduleNames.size > 0) {
          const capitalizedModules = Array.from(moduleNames).map(mod => 
            mod.charAt(0).toUpperCase() + mod.slice(1)
          ).sort()
          result += `- Modules: ${capitalizedModules.join(', ')}\n`
        }
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
            const payloadData = item.payload
            // Check if this is an Installs module event
            if (payloadData?.full_installs_data || payloadData?.module_status) {
              result += `Module(s): Installs\n`
              if (payloadData.run_type) {
                result += `Run Type: ${payloadData.run_type}\n`
              }
              if (payloadData.session_id) {
                result += `Session ID: ${payloadData.session_id}\n`
              }
              result += `\n--- Installs Data ---\n`
            }
            result += typeof payloadData === 'string' 
              ? payloadData 
              : JSON.stringify(payloadData, null, 2)
          }
          result += `\n\n`
        })
        
        return result
      }
      
      return JSON.stringify(payload, null, 2)
    } catch (error) {
      console.error('Failed to format payload for display:', error)
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
      // Check if this is a bundled event
      const eventObj = filteredEvents.find(e => e.id === eventIdStr)
      const isBundle = eventIdStr.startsWith('bundle-') || (eventObj && eventObj.isBundle)
      
      // For bundled events, we need to handle them differently
      if (isBundle) {
        // For bundled events, fetch payloads from all constituent events
        const bundledEvent = eventObj || filteredEvents.find(e => e.id === eventIdStr)
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

  // Show error inline in the table instead of full-page error
  // This provides better UX - user can still see the page structure
  /*
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
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }
  */

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
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
                        onChange={(e) => setStartDate(e.target.value)}
                        className="block text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <span className="text-gray-400">to</span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
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
              <div className="overflow-auto max-h-[calc(100vh-16rem)]">
                <table className="w-full table-fixed relative border-collapse">
                  <colgroup>
                    <col style={{width: '6%'}} />
                    <col style={{width: '9%'}} />
                    <col style={{width: '18%'}} />
                    <col style={{width: '40%'}} />
                    <col style={{width: '14%'}} />
                    <col style={{width: '13%'}} />
                  </colgroup>
                  <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10 shadow-sm">
                    {/* Filter Row */}
                    <tr className="border-b border-gray-200 dark:border-gray-600">
                      <td colSpan={6} className="px-6 py-2 h-14">
                        {/* Desktop filter tabs - full width */}
                        <nav className="hidden sm:grid grid-cols-5 gap-2 w-full">
                          {[
                            { key: 'success', label: 'Success' },
                            { key: 'warning', label: 'Warnings' },
                            { key: 'error', label: 'Errors' },
                            { key: 'info', label: 'Info' },
                            { key: 'system', label: 'System' },
                          ].map((filter) => {
                            const isActive = filterType === filter.key
                            
                            return (
                              <button
                                key={filter.key}
                                onClick={() => setFilterType(isActive ? 'all' : filter.key)}
                                className={`flex items-center justify-center gap-2 px-3 py-1.5 border rounded-lg text-sm font-medium transition-colors ${getFilterStyles(filter.key, isActive)}`}
                              >
                                {getStatusIcon(filter.key)}
                                <span>{filter.label}</span>
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
                      const isExpanded = expandedEvent === event.id
                      
                      return (
                        <React.Fragment key={event.id}>
                          <tr 
                            className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                            onClick={async () => {
                              if (isExpanded) {
                                setExpandedEvent(null)
                              } else {
                                setExpandedEvent(event.id)
                                await fetchFullPayload(event.id)
                              }
                            }}
                          >
                            <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center justify-center">
                                {getStatusIcon(event.kind)}
                              </div>
                            </td>
                            <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                              <span 
                                className="text-sm text-gray-900 dark:text-gray-100 font-mono" 
                                title={isBundleId(event.id) ? `Bundle: ${event.eventIds?.join(', ') || event.id}` : `#${event.id}`}
                              >
                                {formatEventId(event.id, event.eventIds)}
                              </span>
                            </td>
                            <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                              <div>
                                <Link
                                  href={`/device/${encodeURIComponent(event.device)}#events`}
                                  className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors block truncate"
                                  title={event.deviceName || event.device}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {event.deviceName || event.device}
                                </Link>
                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {event.device}
                                  {event.assetTag && (
                                    <span className="ml-2 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                                      {event.assetTag}
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
                                      <CopyButton 
                                        value={formatFullPayload(fullPayloads[event.id] || (event.isBundle ? 
                                          { message: event.message, eventIds: event.eventIds, count: event.count, isBundle: true } : 
                                          'No payload available'))}
                                        size="md"
                                      />
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
                        onChange={(e) => setStartDate(e.target.value)}
                        className="block text-xs border border-gray-300 dark:border-gray-600 rounded px-1.5 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <span className="text-gray-400 text-xs">to</span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
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
                <table className="w-full table-fixed border-collapse">
                  <colgroup>
                    <col style={{width: '6%'}} />
                    <col style={{width: '9%'}} />
                    <col style={{width: '18%'}} />
                    <col style={{width: '40%'}} />
                    <col style={{width: '14%'}} />
                    <col style={{width: '13%'}} />
                  </colgroup>
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    {/* Filter Row */}
                    <tr className="border-b border-gray-200 dark:border-gray-600">
                      <td colSpan={6} className="px-4 py-2 h-14">
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
                                } w-32 justify-center px-3 py-1.5 border rounded-lg text-sm font-medium flex items-center gap-2 transition-colors`}
                              >
                                {statusConfig && (
                                  <div className={`w-4 h-4 shrink-0 -mt-1 ${statusConfig.text}`}>
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
                    {error ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <div className="w-12 h-12 mb-4 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <p className="text-base font-medium text-gray-900 dark:text-white mb-1">Failed to load events</p>
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
                    ) : currentEvents.length === 0 ? (
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
                      const isExpanded = expandedEvent === event.id
                      
                      return (
                        <React.Fragment key={event.id}>
                          <tr 
                            className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                            onClick={async () => {
                              if (isExpanded) {
                                setExpandedEvent(null)
                              } else {
                                setExpandedEvent(event.id)
                                await fetchFullPayload(event.id)
                              }
                            }}
                          >
                            <td className="px-4 lg:px-6 py-3 whitespace-nowrap">
                              <div className="flex items-center justify-center">
                                {getStatusIcon(event.kind)}
                              </div>
                            </td>
                            <td className="px-4 lg:px-6 py-3 whitespace-nowrap">
                              <span 
                                className="text-sm text-gray-900 dark:text-gray-100 font-mono"
                                title={isBundleId(event.id) ? `Bundle: ${event.eventIds?.join(', ') || event.id}` : `#${event.id}`}
                              >
                                {formatEventId(event.id, event.eventIds)}
                              </span>
                            </td>
                            <td className="px-4 lg:px-6 py-3 whitespace-nowrap">
                              <div>
                                <Link
                                  href={`/device/${encodeURIComponent(event.device)}#events`}
                                  className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors block truncate"
                                  title={event.deviceName || event.device}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {event.deviceName || event.device}
                                </Link>
                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {event.device}
                                  {event.assetTag && (
                                    <span className="ml-1 px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                                      {event.assetTag}
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
                                      <CopyButton 
                                        value={formatFullPayload(fullPayloads[event.id] || (event.isBundle ? 
                                          { message: event.message, eventIds: event.eventIds, count: event.count, isBundle: true } : 
                                          'No payload available'))}
                                        size="md"
                                      />
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
                        onChange={(e) => setStartDate(e.target.value)}
                        className="flex-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-gray-400 text-sm">to</span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
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
                const isExpanded = expandedEvent === event.id
                
                return (
                  <div 
                    key={event.id} 
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 cursor-pointer"
                    onClick={async () => {
                      if (isExpanded) {
                        setExpandedEvent(null)
                      } else {
                        setExpandedEvent(event.id)
                        await fetchFullPayload(event.id)
                      }
                    }}
                  >
                    {/* Card Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusIcon(event.kind)}
                        <span 
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-mono"
                          title={isBundleId(event.id) ? `Bundle: ${event.eventIds?.join(', ') || event.id}` : `#${event.id}`}
                        >
                          {formatEventId(event.id, event.eventIds)}
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
                          onClick={(e) => e.stopPropagation()}
                        >
                          {event.deviceName || event.device}
                        </Link>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {event.device}
                          {event.assetTag && (
                            <span className="ml-2 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                              {event.assetTag}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Message */}
                    <div className="mb-3">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Message</div>
                      <div className="text-sm text-gray-900 dark:text-white wrap-break-word">
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
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-mono"
                              title={isBundleId(event.id) ? `Bundle: ${event.eventIds?.join(', ') || event.id}` : `#${event.id}`}
                            >
                              {formatEventId(event.id, event.eventIds)}
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
                          <CopyButton 
                            value={formatFullPayload(fullPayloads[event.id] || (event.isBundle ? 
                              { message: event.message, eventIds: event.eventIds, count: event.count, isBundle: true } : 
                              'No payload available'))}
                            size="md"
                          />
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

            {/* Infinite scroll sentinel and loading indicator */}
            <div 
              ref={loadMoreRef}
              className="flex items-center justify-center py-6"
            >
              {loadingMore && (
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-sm">Loading more events...</span>
                </div>
              )}
              {!hasMore && events.length > 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Showing all {events.length.toLocaleString()} events
                </p>
              )}
            </div>
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

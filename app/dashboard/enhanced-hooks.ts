"use client"

import { useEffect, useState, useCallback } from "react"

export interface FleetEvent {
  id: string
  device: string
  kind: string
  ts: string
  payload: Record<string, unknown>
}

export interface ConnectionHealth {
  status: 'connected' | 'connecting' | 'error' | 'polling'
  lastUpdate: Date | null
  consecutiveErrors: number
  latency: number | null
  eventsReceived: number
}

export function useEnhancedLiveEvents() {
  const [events, setEvents] = useState<FleetEvent[]>([])
  const [connectionHealth, setConnectionHealth] = useState<ConnectionHealth>({
    status: 'connecting',
    lastUpdate: null,
    consecutiveErrors: 0,
    latency: null,
    eventsReceived: 0
  })
  const [mounted, setMounted] = useState(false)

  // Enhanced polling with exponential backoff
  const [pollingInterval, setPollingInterval] = useState(5000) // Start with 5 seconds
  const [isPolling, setIsPolling] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Calculate adaptive polling interval based on connection health
  const calculatePollingInterval = useCallback((consecutiveErrors: number, hasRecentEvents: boolean) => {
    if (consecutiveErrors === 0 && hasRecentEvents) {
      return 3000 // Fast polling when everything is working and events are flowing
    }
    if (consecutiveErrors === 0) {
      return 5000 // Normal polling when stable
    }
    if (consecutiveErrors < 3) {
      return 10000 // Slower when some errors
    }
    return Math.min(30000, 5000 * Math.pow(2, consecutiveErrors)) // Exponential backoff, max 30s
  }, [])

  // Enhanced event fetching with performance monitoring
  const fetchEvents = useCallback(async (): Promise<{success: boolean, newEventsCount: number, latency: number}> => {
    const startTime = Date.now()
    
    try {
      const response = await Promise.race([
        fetch('/api/events', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 15000)
        )
      ])

      const latency = Date.now() - startTime

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      let newEventsCount = 0

      if (data.success && data.events) {
        setEvents(prev => {
          const existingIds = new Set(prev.map(e => e.id))
          const newEvents = data.events
            .filter((e: FleetEvent) => !existingIds.has(e.id))
            .map(sanitizeEventForDisplay)
          
          newEventsCount = newEvents.length
          
          if (newEvents.length > 0 || prev.length === 0) {
            const updatedEvents = prev.length === 0 
              ? data.events.slice(-100).map(sanitizeEventForDisplay)
              : [...newEvents, ...prev].slice(0, 100)
            
            return updatedEvents
          }
          return prev
        })
      }

      return { success: true, newEventsCount, latency }
    } catch (error) {
      console.error("Enhanced polling failed:", error)
      return { success: false, newEventsCount: 0, latency: Date.now() - startTime }
    }
  }, [])

  // Enhanced event sanitization
  const sanitizeEventForDisplay = (event: any): FleetEvent => {
    try {
      return {
        id: String(event.id || `event-${Date.now()}-${Math.random()}`),
        device: String(event.device_id || event.device || 'unknown'),
        kind: String(event.kind || 'info'),
        ts: String(event.timestamp || event.ts || new Date().toISOString()),
        payload: sanitizePayloadForDisplay(event.payload)
      }
    } catch (error) {
      console.error("Error sanitizing event:", error)
      return {
        id: `error-${Date.now()}`,
        device: 'unknown',
        kind: 'error',
        ts: new Date().toISOString(),
        payload: { message: 'Error processing event', error: String(error) }
      }
    }
  }

  const sanitizePayloadForDisplay = (payload: any): Record<string, unknown> => {
    try {
      if (!payload) return {}
      if (typeof payload === 'string') {
        try {
          // Try to parse JSON strings
          const parsed = JSON.parse(payload)
          return createSafeDisplayPayload(parsed)
        } catch {
          return { message: payload.substring(0, 200) }
        }
      }
      if (typeof payload !== 'object') return { value: String(payload).substring(0, 200) }
      
      // Check if this is a modular data payload and preserve essential fields for formatting
      if (payload.modules_processed && typeof payload.modules_processed === 'number') {
        const essentialData = {
          modules_processed: payload.modules_processed,
          collection_type: payload.collection_type,
          enabled_modules: Array.isArray(payload.enabled_modules) ? payload.enabled_modules.slice(0, 15) : undefined,
          device_name: payload.device_name,
          client_version: payload.client_version
        }
        
        // Test if this small essential data can be safely stringified
        try {
          const test = JSON.stringify(essentialData)
          if (test.length < 500) {
            return essentialData
          }
        } catch (error) {
          // Fallback if essential data fails
        }
      }
      
      const safePayload = createSafeDisplayPayload(payload)
      const test = JSON.stringify(safePayload)
      
      if (test.length > 1000) {
        return {
          message: 'Large data payload (summarized)',
          dataSize: test.length,
          keys: Object.keys(payload).slice(0, 3),
          type: String(payload.type || 'unknown').substring(0, 20),
          truncated: true,
          // Preserve key fields for message formatting
          ...(payload.modules_processed && { modules_processed: payload.modules_processed }),
          ...(payload.collection_type && { collection_type: payload.collection_type }),
          ...(payload.enabled_modules && Array.isArray(payload.enabled_modules) && { 
            enabled_modules: payload.enabled_modules.slice(0, 3) 
          })
        }
      }
      
      return safePayload
    } catch (error) {
      return {
        message: 'Complex data payload',
        type: typeof payload,
        error: 'Serialization failed'
      }
    }
  }

  const createSafeDisplayPayload = (obj: any, depth = 0): any => {
    const maxDepth = 2
    
    if (depth > maxDepth) return '[Max depth reached]'
    if (obj === null || obj === undefined) return obj
    
    if (typeof obj !== 'object') {
      const str = String(obj)
      return str.length > 100 ? str.substring(0, 100) + '...' : str
    }
    
    if (Array.isArray(obj)) {
      return obj.slice(0, 3).map(item => createSafeDisplayPayload(item, depth + 1))
    }
    
    const result: any = {}
    const keys = Object.keys(obj).slice(0, 5)
    
    for (const key of keys) {
      if (key.length > 30) continue
      try {
        result[key] = createSafeDisplayPayload(obj[key], depth + 1)
      } catch {
        result[key] = '[Error]'
      }
    }
    
    return result
  }

  // Enhanced polling loop with adaptive intervals
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null
    let isActive = true
    let currentInterval = 5000 // Local variable to avoid dependency issues

    const poll = async () => {
      if (!isActive) return

      setIsPolling(true)
      const result = await fetchEvents()
      
      if (!isActive) {
        setIsPolling(false)
        return
      }

      const now = new Date()
      const hasRecentEvents = result.newEventsCount > 0

      setConnectionHealth(prev => {
        const newConsecutiveErrors = result.success ? 0 : prev.consecutiveErrors + 1
        const newInterval = calculatePollingInterval(newConsecutiveErrors, hasRecentEvents)
        currentInterval = newInterval // Update local variable
        setPollingInterval(newInterval) // Update state for display purposes

        return {
          status: result.success ? 'polling' : 'error',
          lastUpdate: result.success ? now : prev.lastUpdate,
          consecutiveErrors: newConsecutiveErrors,
          latency: result.latency,
          eventsReceived: prev.eventsReceived + result.newEventsCount
        }
      })

      console.log(`🔄 Poll completed: ${result.success ? '✅' : '❌'} | ` +
                 `New events: ${result.newEventsCount} | ` +
                 `Latency: ${result.latency}ms | ` +
                 `Next poll: ${currentInterval}ms`)

      setIsPolling(false)

      // Schedule next poll with current interval
      if (isActive) {
        timeoutId = setTimeout(poll, currentInterval)
      }
    }

    // Start polling
    console.log("🚀 Enhanced dashboard polling started")
    poll()

    return () => {
      isActive = false
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      setIsPolling(false)
    }
  }, [fetchEvents, calculatePollingInterval])

  // Utility function to add events manually (for testing or external integration)
  const addEvent = useCallback((event: FleetEvent) => {
    setEvents(prev => [event, ...prev].slice(0, 100))
    setConnectionHealth(prev => ({
      ...prev,
      lastUpdate: new Date(),
      eventsReceived: prev.eventsReceived + 1
    }))
  }, [])

  return { 
    events, 
    connectionHealth,
    mounted,
    addEvent,
    // Legacy compatibility
    connectionStatus: connectionHealth.status,
    lastUpdateTime: connectionHealth.lastUpdate
  }
}

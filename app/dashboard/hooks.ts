"use client"

import { useEffect, useState, useCallback, useRef } from "react"

export interface FleetEvent {
  id: string
  device: string
  kind: string
  ts: string
  message?: string // User-friendly message from database
  payload: Record<string, unknown>
}

// WebPubSub message types for JSON subprotocol
interface WebPubSubMessage {
  type: "message" | "system" | "ack"
  from?: string
  group?: string
  data?: unknown
  dataType?: string
  event?: string
  connectionId?: string
  userId?: string
  message?: string
}

export function useLiveEvents() {
  const [events, setEvents] = useState<FleetEvent[]>([])
  const [connectionStatus, setConnectionStatus] = useState<string>("connecting")
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null)
  const [mounted, setMounted] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 })
  const [loadingMessage, setLoadingMessage] = useState<string>('')
  
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5

  // Ensure we're mounted before showing time-dependent data
  useEffect(() => {
    setMounted(true)
    setLastUpdateTime(new Date())
  }, [])

  // Helper function to create safe payload for display with strict limits
  const createSafeDisplayPayload = useCallback((obj: unknown, depth = 0): Record<string, unknown> | string | unknown => {
    const maxDepth = 1 // Keep reduced max depth for display

    if (depth > maxDepth) {
      return '[Max depth reached]'
    }

    if (obj === null || obj === undefined) {
      return obj
    }

    if (typeof obj !== 'object') {
      const str = String(obj)
      return str.length > 30 ? str.substring(0, 30) + '...' : str // Reduced from 50 to 30
    }

    if (Array.isArray(obj)) {
      // Only show first item for display and limit array size
      return obj.slice(0, 1).map(item => createSafeDisplayPayload(item, depth + 1))
    }

    // For objects, be very selective about what we include
    const result: Record<string, unknown> = {}
    const objRecord = obj as Record<string, unknown>
    const keys = Object.keys(objRecord).slice(0, 2) // Reduced from 3 to 2 keys max

    for (const key of keys) {
      if (key.length > 15) continue // Reduced from 20, skip long keys
      try {
        result[key] = createSafeDisplayPayload(objRecord[key], depth + 1)
      } catch {
        result[key] = '[Error]'
      }
    }

    return result
  }, [])

  // Helper function to sanitize payload for safe display
  const sanitizePayloadForDisplay = useCallback((payload: unknown): Record<string, unknown> => {
    try {
      if (!payload) return {}
      if (typeof payload === 'string') return { message: payload.substring(0, 100) } // Reduced from 200
      if (typeof payload !== 'object') return { value: String(payload).substring(0, 100) } // Reduced from 200
      
      const payloadObj = payload as Record<string, unknown>
      
      // Check if this is a modular data payload and preserve essential fields for formatting
      if (payloadObj.modules_processed && typeof payloadObj.modules_processed === 'number') {
        const essentialData = {
          modules_processed: payloadObj.modules_processed,
          collection_type: payloadObj.collection_type,
          enabled_modules: Array.isArray(payloadObj.enabled_modules) ? payloadObj.enabled_modules.slice(0, 5) : undefined, // Reduced from 15
          device_name: payloadObj.device_name,
          client_version: payloadObj.client_version
        }
        
        // Test if this small essential data can be safely stringified
        try {
          const test = JSON.stringify(essentialData)
          if (test.length < 200) { // Reduced from 300
            return essentialData
          }
        } catch {
          // Fallback if essential data fails
        }
      }
      
      // Create a safer version with limited depth
      const safePayload = createSafeDisplayPayload(payload)
      
      // Test if payload can be safely stringified
      const test = JSON.stringify(safePayload)
      
      // If payload is still too large, summarize it more aggressively
      if (test.length > 300) { // Reduced from 500 bytes
        const summary: Record<string, unknown> = {
          message: 'Large payload (summarized)',
          dataSize: test.length,
          keys: Object.keys(payloadObj).slice(0, 1), // Reduced from 2 to 1
          truncated: true
        }
        
        // Preserve only the most essential fields
        if (payloadObj.modules_processed) {
          summary.modules_processed = payloadObj.modules_processed
        }
        
        return summary
      }
      
      return safePayload as Record<string, unknown>
    } catch (error) {
      console.warn("Payload contains non-serializable data, creating safe version:", error)
      return {
        message: 'Complex payload (non-serializable)',
        type: typeof payload,
        hasCircularRefs: true
      }
    }
  }, [createSafeDisplayPayload])

  // Helper function to sanitize events for safe display
  const sanitizeEventForDisplay = useCallback((event: unknown): FleetEvent => {
    try {
      const eventObj = event as Record<string, unknown>
      return {
        id: String(eventObj.id || `event-${Date.now()}`),
        device: String(eventObj.device || 'unknown'),
        kind: String(eventObj.kind || 'info'),
        ts: String(eventObj.ts || new Date().toISOString()),
        message: eventObj.message ? String(eventObj.message) : undefined, // PRESERVE message field from database
        payload: sanitizePayloadForDisplay(eventObj.payload)
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
  }, [sanitizePayloadForDisplay])

  // Main effect to start connection and polling
  useEffect(() => {
    let pollingInterval: NodeJS.Timeout | null = null
    let progressInterval: NodeJS.Timeout | null = null
    let reconnectTimeout: NodeJS.Timeout | null = null
    let isActive = true // Track if component is still active
    
    // Function to fetch events from local API
    async function fetchLocalEvents() {
      try {
        const response = await fetch('/api/events?limit=50')
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.events) {
            setEvents(prev => {
              // If no events exist, load all events initially
              if (prev.length === 0) {
                setLastUpdateTime(new Date())
                
                // Clear progress interval and set to 100%
                if (progressInterval) {
                  clearInterval(progressInterval)
                  progressInterval = null
                }
                const eventCount = data.events.length
                setLoadingProgress({ current: eventCount, total: eventCount })
                setLoadingMessage('Events loaded')
                
                return data.events.slice(-50).map(sanitizeEventForDisplay) // Show last 50 events
              }
              
              // Otherwise, merge new events, avoiding duplicates
              const existingIds = new Set(prev.map(e => e.id))
              const newEvents = data.events
                .filter((e: FleetEvent) => !existingIds.has(e.id))
                .map(sanitizeEventForDisplay)
              if (newEvents.length > 0) {
                setLastUpdateTime(new Date())
                return [...prev, ...newEvents].slice(-50) // Keep last 50 events
              }
              return prev
            })
          }
        }
      } catch (error) {
        // Silently fail - polling will retry
      }
    }
    
    function startPolling() {
      if (pollingInterval || !isActive) return // Already polling or component unmounted
      
      setConnectionStatus("polling")
      
      // Fetch events immediately
      fetchLocalEvents()
      
      // Poll every 60 seconds to reduce browser workload
      pollingInterval = setInterval(() => {
        if (isActive) {
          fetchLocalEvents()
        }
      }, 60000)
    }
    
    async function connectWebSocket() {
      if (!isActive) return
      
      try {
        setConnectionStatus("connecting")
        
        // Start progress simulation
        const estimatedTotal = 50
        let progress = 0
        progressInterval = setInterval(() => {
          if (progress < Math.floor(estimatedTotal * 0.85)) {
            progress += 3
            setLoadingMessage('Connecting to event stream...')
          } else if (progress < Math.floor(estimatedTotal * 0.95)) {
            progress += 1
            setLoadingMessage('Negotiating connection...')
          } else if (progress < Math.floor(estimatedTotal * 0.995)) {
            progress += 0.5
            setLoadingMessage('Loading events...')
          }
          setLoadingProgress({ current: Math.floor(progress), total: estimatedTotal })
        }, 200)
        
        // Check if WebPubSub is enabled
        const isEnabled = process.env.NEXT_PUBLIC_ENABLE_SIGNALR === "true"
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL
        
        if (!apiBaseUrl) {
          throw new Error('NEXT_PUBLIC_API_BASE_URL environment variable is not configured')
        }
        
        if (!isEnabled) {
          if (isActive) {
            if (progressInterval) {
              clearInterval(progressInterval)
              progressInterval = null
            }
            startPolling()
          }
          return
        }
        
        // Get negotiate token from API with timeout
        const negotiateResponse = await Promise.race([
          fetch(`${apiBaseUrl}/api/negotiate?device=dashboard`),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Negotiate timeout')), 10000)
          )
        ]) as Response
        
        if (!negotiateResponse.ok) {
          throw new Error(`Negotiate failed: ${negotiateResponse.status}`)
        }
        
        const negotiateData = await negotiateResponse.json()
        
        // Check if negotiate returned an error
        if (negotiateData.error || !negotiateData.url) {
          console.warn('WebPubSub negotiate returned error:', negotiateData.error || 'No URL')
          throw new Error(negotiateData.error || 'WebPubSub not available')
        }
        
        if (!isActive) return
        
        // Connect using native WebSocket with Azure Web PubSub JSON subprotocol
        const ws = new WebSocket(negotiateData.url, 'json.webpubsub.azure.v1')
        wsRef.current = ws
        
        ws.onopen = () => {
          if (!isActive) {
            ws.close()
            return
          }
          setConnectionStatus("connected")
          reconnectAttemptsRef.current = 0
          setLastUpdateTime(new Date())
          
          // Clear progress interval
          if (progressInterval) {
            clearInterval(progressInterval)
            progressInterval = null
          }
          
          // Fetch initial events
          fetchLocalEvents()
        }
        
        ws.onmessage = (event) => {
          if (!isActive) return
          try {
            const message: WebPubSubMessage = JSON.parse(event.data)
            
            if (message.type === "message") {
              const eventData = message.data as FleetEvent
              if (eventData && eventData.id) {
                setEvents(prev => {
                  const existingIds = new Set(prev.map(e => e.id))
                  if (!existingIds.has(eventData.id)) {
                    const sanitized = sanitizeEventForDisplay(eventData)
                    setLastUpdateTime(new Date())
                    return [sanitized, ...prev].slice(0, 50)
                  }
                  return prev
                })
              }
            }
          } catch (error) {
            console.error("Failed to parse WebSocket message:", error)
          }
        }
        
        ws.onerror = (error) => {
          console.error("WebSocket error:", error)
        }
        
        ws.onclose = (event) => {
          if (!isActive) return
          console.log('WebSocket closed:', event.code, event.reason)
          wsRef.current = null
          
          // Attempt reconnection with exponential backoff
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000)
            reconnectAttemptsRef.current++
            setConnectionStatus("reconnecting")
            
            reconnectTimeout = setTimeout(() => {
              if (isActive) connectWebSocket()
            }, delay)
          } else {
            console.log('Max reconnect attempts reached, falling back to polling')
            startPolling()
          }
        }
        
      } catch (error) {
        if (!isActive) return
        console.error("WebSocket connection failed:", error)
        
        if (progressInterval) {
          clearInterval(progressInterval)
          progressInterval = null
        }
        
        setConnectionStatus("error")
        startPolling()
      }
    }

    connectWebSocket()

    return () => {
      isActive = false
      
      // Cleanup WebSocket connection
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      
      // Cleanup polling interval
      if (pollingInterval) {
        clearInterval(pollingInterval)
        pollingInterval = null
      }
      
      // Cleanup progress interval
      if (progressInterval) {
        clearInterval(progressInterval)
        progressInterval = null
      }
      
      // Cleanup reconnect timeout
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
        reconnectTimeout = null
      }
    }
  }, [sanitizeEventForDisplay])

  return { 
    events, 
    connectionStatus,
    lastUpdateTime,
    mounted,
    loadingProgress,
    loadingMessage,
    addEvent: (event: FleetEvent) => {
      setEvents(prev => [event, ...prev].slice(-50)) // Reduced from 100 to 50 events
      setLastUpdateTime(new Date())
    }
  }
}

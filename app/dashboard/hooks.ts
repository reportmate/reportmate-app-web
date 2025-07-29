"use client"

import { useEffect, useState, useCallback } from "react"
import { HubConnectionBuilder, HubConnection, LogLevel } from "@microsoft/signalr"

export interface FleetEvent {
  id: string
  device: string
  kind: string
  ts: string
  payload: Record<string, unknown>
}

export function useLiveEvents() {
  const [events, setEvents] = useState<FleetEvent[]>([])
  const [connectionStatus, setConnectionStatus] = useState<string>("connecting")
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null)
  const [mounted, setMounted] = useState(false)

  // Ensure we're mounted before showing time-dependent data
  useEffect(() => {
    setMounted(true)
    setLastUpdateTime(new Date())
  }, [])

  // Function to fetch events from local API
  const fetchLocalEvents = useCallback(async () => {
    try {
      const response = await fetch('/api/events')
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.events) {
          setEvents(prev => {
            // If no events exist, load all events initially
            if (prev.length === 0) {
              console.log("Loading initial events:", data.events.length)
              setLastUpdateTime(new Date())
              return data.events.slice(-100).map(sanitizeEventForDisplay) // Keep only last 100 events
            }
            
            // Otherwise, merge new events, avoiding duplicates
            const existingIds = new Set(prev.map(e => e.id))
            const newEvents = data.events
              .filter((e: FleetEvent) => !existingIds.has(e.id))
              .map(sanitizeEventForDisplay)
            if (newEvents.length > 0) {
              setLastUpdateTime(new Date())
              return [...prev, ...newEvents].slice(-100) // Keep only last 100 events
            }
            return prev
          })
        }
      }
    } catch (error) {
      console.error("Failed to fetch local events:", error)
    }
  }, [])

  // Helper function to sanitize events for safe display
  const sanitizeEventForDisplay = (event: unknown): FleetEvent => {
    try {
      const eventObj = event as Record<string, unknown>
      return {
        id: String(eventObj.id || `event-${Date.now()}`),
        device: String(eventObj.device || 'unknown'),
        kind: String(eventObj.kind || 'info'),
        ts: String(eventObj.ts || new Date().toISOString()),
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
  }

  // Helper function to sanitize payload for safe display
  const sanitizePayloadForDisplay = (payload: unknown): Record<string, unknown> => {
    try {
      if (!payload) return {}
      if (typeof payload === 'string') return { message: payload.substring(0, 200) }
      if (typeof payload !== 'object') return { value: String(payload).substring(0, 200) }
      
      const payloadObj = payload as Record<string, unknown>
      
      // Check if this is a modular data payload and preserve essential fields for formatting
      if (payloadObj.modules_processed && typeof payloadObj.modules_processed === 'number') {
        const essentialData = {
          modules_processed: payloadObj.modules_processed,
          collection_type: payloadObj.collection_type,
          enabled_modules: Array.isArray(payloadObj.enabled_modules) ? payloadObj.enabled_modules.slice(0, 15) : undefined,
          device_name: payloadObj.device_name,
          client_version: payloadObj.client_version
        }
        
        // Test if this small essential data can be safely stringified
        try {
          const test = JSON.stringify(essentialData)
          if (test.length < 300) {
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
      if (test.length > 500) { // Reduced from 1000 to 500 bytes
        const summary: Record<string, unknown> = {
          message: 'Large data payload (summarized)',
          dataSize: test.length,
          keys: Object.keys(payloadObj).slice(0, 2), // Reduced from 3 to 2
          type: String(payloadObj.type || 'unknown').substring(0, 15), // Reduced from 20 to 15
          truncated: true
        }
        
        // Preserve key fields for message formatting
        if (payloadObj.modules_processed) {
          summary.modules_processed = payloadObj.modules_processed
        }
        if (payloadObj.collection_type) {
          summary.collection_type = payloadObj.collection_type
        }
        if (payloadObj.enabled_modules && Array.isArray(payloadObj.enabled_modules)) {
          summary.enabled_modules = payloadObj.enabled_modules.slice(0, 3)
        }
        // Only preserve essential fields
        if (payloadObj.message) {
          summary.originalMessage = String(payloadObj.message).substring(0, 30) // Reduced from 50 to 30
        }
        
        return summary
      }
      
      return safePayload as Record<string, unknown>
    } catch (error) {
      console.warn("Payload contains non-serializable data, creating safe version:", error)
      return {
        message: 'Complex data payload (non-serializable)',
        type: typeof payload,
        keys: Object.keys(payload || {}).slice(0, 3),
        hasCircularRefs: true,
        error: 'JSON.stringify failed - likely circular references'
      }
    }
  }

  // Helper function to create safe payload for display with strict limits
  const createSafeDisplayPayload = (obj: unknown, depth = 0): Record<string, unknown> | string | unknown => {
    const maxDepth = 1 // Keep reduced max depth for display
    
    if (depth > maxDepth) {
      return '[Max depth reached]'
    }
    
    if (obj === null || obj === undefined) {
      return obj
    }
    
    if (typeof obj !== 'object') {
      const str = String(obj)
      return str.length > 50 ? str.substring(0, 50) + '...' : str // Reduced from 100 to 50
    }
    
    if (Array.isArray(obj)) {
      // Only show first item for display
      return obj.slice(0, 1).map(item => createSafeDisplayPayload(item, depth + 1))
    }
    
    // For objects, be very selective about what we include
    const result: Record<string, unknown> = {}
    const objRecord = obj as Record<string, unknown>
    const keys = Object.keys(objRecord).slice(0, 3) // Reduced from 5 to 3 keys max
    
    for (const key of keys) {
      if (key.length > 20) continue // Skip long keys
      try {
        result[key] = createSafeDisplayPayload(objRecord[key], depth + 1)
      } catch {
        result[key] = '[Error]'
      }
    }
    
    return result
  }

  useEffect(() => {
    let connection: HubConnection | null = null
    let pollingInterval: NodeJS.Timeout | null = null
    
    console.log("Dashboard initialized - starting event polling")
    
    async function startConnection() {
      try {
        setConnectionStatus("connecting")
        
        // Check if SignalR is enabled
        const isSignalREnabled = process.env.NEXT_PUBLIC_ENABLE_SIGNALR === "true"
        const apiBaseUrl = process.env.API_BASE_URL
        
        if (!apiBaseUrl) {
          throw new Error('API_BASE_URL environment variable is not configured')
        }
        
        if (!isSignalREnabled) {
          console.log("SignalR disabled, using polling mode...")
          setConnectionStatus("polling")
          startPolling()
          return
        }
        
        console.log("🚀 Starting SignalR connection...")
        
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
        console.log("✅ Negotiate successful, connecting to SignalR...")
        
        // Build SignalR connection
        connection = new HubConnectionBuilder()
          .withUrl(negotiateData.url)
          .withAutomaticReconnect()
          .configureLogging(LogLevel.Information)
          .build()
        
        // Set up event handlers
        connection.on("event", (eventData: FleetEvent) => {
          console.log("📡 Received SignalR event:", eventData)
          setEvents(prev => [eventData, ...prev].slice(-100))
          setLastUpdateTime(new Date())
        })
        
        connection.onreconnecting(() => {
          console.log("🔄 SignalR reconnecting...")
          setConnectionStatus("connecting")
        })
        
        connection.onreconnected(() => {
          console.log("✅ SignalR reconnected")
          setConnectionStatus("connected")
          setLastUpdateTime(new Date())
        })
        
        connection.onclose(() => {
          console.log("❌ SignalR connection closed, falling back to polling")
          setConnectionStatus("error")
          startPolling()
        })
        
        // Start the connection
        await connection.start()
        console.log("✅ SignalR connected successfully")
        setConnectionStatus("connected")
        setLastUpdateTime(new Date())
        
        // Also fetch initial events via polling to get any missed events
        fetchLocalEvents()
        
      } catch (error) {
        console.error("❌ Failed to start SignalR connection:", error)
        setConnectionStatus("error")
        
        console.log("🔄 SignalR connection failed, falling back to polling mode")
        startPolling()
      }
    }

    function startPolling() {
      if (pollingInterval) return // Already polling
      
      setConnectionStatus("polling")
      console.log("Starting polling fallback")
      
      // Fetch events immediately
      fetchLocalEvents()
      
      // Poll every 5 seconds
      pollingInterval = setInterval(fetchLocalEvents, 5000)
    }

    startConnection()

    return () => {
      // Cleanup SignalR connection
      if (connection) {
        connection.stop().catch(err => console.warn("Error stopping SignalR connection:", err))
      }
      
      // Cleanup polling interval
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
    }
  }, [fetchLocalEvents])

  return { 
    events, 
    connectionStatus,
    lastUpdateTime,
    mounted,
    addEvent: (event: FleetEvent) => {
      setEvents(prev => [event, ...prev].slice(-100))
      setLastUpdateTime(new Date())
    }
  }
}

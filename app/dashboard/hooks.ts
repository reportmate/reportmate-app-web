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
  const sanitizeEventForDisplay = (event: any): FleetEvent => {
    try {
      return {
        id: String(event.id || `event-${Date.now()}`),
        device: String(event.device || 'unknown'),
        kind: String(event.kind || 'info'),
        ts: String(event.ts || new Date().toISOString()),
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

  // Helper function to sanitize payload for safe display
  const sanitizePayloadForDisplay = (payload: any): Record<string, unknown> => {
    try {
      if (!payload) return {}
      if (typeof payload === 'string') return { message: payload.substring(0, 200) }
      if (typeof payload !== 'object') return { value: String(payload).substring(0, 200) }
      
      // Create a safer version with limited depth
      const safePayload = createSafeDisplayPayload(payload)
      
      // Test if payload can be safely stringified
      const test = JSON.stringify(safePayload)
      
      // If payload is still too large, summarize it more aggressively
      if (test.length > 1000) { // Reduced from 2000 to 1000
        return {
          message: 'Large data payload (summarized)',
          dataSize: test.length,
          keys: Object.keys(payload).slice(0, 3), // Reduced from 5 to 3
          type: String(payload.type || 'unknown').substring(0, 20),
          truncated: true,
          // Only preserve essential fields
          ...(payload.message && { 
            originalMessage: String(payload.message).substring(0, 50) 
          })
        }
      }
      
      return safePayload
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
  const createSafeDisplayPayload = (obj: any, depth = 0): any => {
    const maxDepth = 1 // Reduced max depth for display
    
    if (depth > maxDepth) {
      return '[Max depth reached]'
    }
    
    if (obj === null || obj === undefined) {
      return obj
    }
    
    if (typeof obj !== 'object') {
      const str = String(obj)
      return str.length > 100 ? str.substring(0, 100) + '...' : str // Reduced from 200 to 100
    }
    
    if (Array.isArray(obj)) {
      // Only show first 2 items for display
      return obj.slice(0, 2).map(item => createSafeDisplayPayload(item, depth + 1))
    }
    
    // For objects, be very selective about what we include
    const result: any = {}
    const keys = Object.keys(obj).slice(0, 5) // Reduced from 8 to 5
    
    for (const key of keys) {
      try {
        if (key.length > 30) continue // Reduced from 50 to 30
        result[key] = createSafeDisplayPayload(obj[key], depth + 1)
      } catch (error) {
        result[key] = '[Error processing value]'
      }
    }
    
    return result
  }

  useEffect(() => {
    let connection: HubConnection | null = null
    let pollingInterval: NodeJS.Timeout | null = null
    
    // Don't add fake test events - just start with empty state
    console.log("Dashboard initialized - starting event polling")
    
    async function startConnection() {
      try {
        setConnectionStatus("connecting")
        
        // Check if SignalR is enabled
        const isSignalREnabled = process.env.NEXT_PUBLIC_ENABLE_SIGNALR === "true"
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL
        
        if (!isSignalREnabled || !apiBaseUrl) {
          console.log("SignalR disabled or missing config, using polling mode...")
          setConnectionStatus("polling")
          startPolling()
          return
        }
        
        console.log("🚀 Starting SignalR connection...")
        
        // Get negotiate token from Azure Functions with timeout
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

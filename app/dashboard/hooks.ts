"use client"

import { useEffect, useState, useCallback } from "react"
import { HubConnectionBuilder, HubConnection, LogLevel } from "@microsoft/signalr"

export interface FleetEvent {
  id: string
  device: string
  kind: string
  ts: string
  message?: string // User-friendly message from database
  payload: Record<string, unknown>
}

export function useLiveEvents() {
  const [events, setEvents] = useState<FleetEvent[]>([])
  const [connectionStatus, setConnectionStatus] = useState<string>("connecting")
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null)
  const [mounted, setMounted] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 })
  const [loadingMessage, setLoadingMessage] = useState<string>('')

  // IMMEDIATE LOGGING - this should show up right when hook is called
  console.log("🔥 useLiveEvents hook called!")
  console.log("🔥 Environment variables at hook call time:")
  console.log("  - NEXT_PUBLIC_ENABLE_SIGNALR:", process.env.NEXT_PUBLIC_ENABLE_SIGNALR)
  console.log("  - NEXT_PUBLIC_API_BASE_URL:", process.env.NEXT_PUBLIC_API_BASE_URL)
  console.log("  - typeof process.env.NEXT_PUBLIC_ENABLE_SIGNALR:", typeof process.env.NEXT_PUBLIC_ENABLE_SIGNALR)
  console.log("  - process.env keys count:", Object.keys(process.env).length)
  console.log("  - NEXT_PUBLIC keys:", Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC')))

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
    console.log("🎯 MAIN useEffect executing!")
    
    let connection: HubConnection | null = null
    let pollingInterval: NodeJS.Timeout | null = null
    let progressInterval: NodeJS.Timeout | null = null
    let isActive = true // Track if component is still active
    
    console.log("Dashboard initialized - starting event polling")
    console.log("Environment debug:")
    console.log("- NEXT_PUBLIC_ENABLE_SIGNALR:", JSON.stringify(process.env.NEXT_PUBLIC_ENABLE_SIGNALR))
    console.log("- API_BASE_URL:", JSON.stringify(process.env.API_BASE_URL))
    console.log("- typeof NEXT_PUBLIC_ENABLE_SIGNALR:", typeof process.env.NEXT_PUBLIC_ENABLE_SIGNALR)
    
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
                console.log("Loading initial events:", data.events.length)
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
        console.error("Failed to fetch local events:", error)
      }
    }
    
    async function startConnection() {
      try {
        if (!isActive) return // Don't start if component unmounted
        
        setConnectionStatus("connecting")
        
        // Start progress simulation
        const estimatedTotal = 50 // Expected number of events to load
        let progress = 0
        progressInterval = setInterval(() => {
          if (progress < Math.floor(estimatedTotal * 0.85)) {
            progress += 3 // Fast to 85%
            setLoadingMessage('Connecting to event stream...')
          } else if (progress < Math.floor(estimatedTotal * 0.95)) {
            progress += 1 // Medium to 95%
            setLoadingMessage('Negotiating connection...')
          } else if (progress < Math.floor(estimatedTotal * 0.995)) {
            progress += 0.5 // Slow to 99.5%
            setLoadingMessage('Loading events...')
          }
          setLoadingProgress({ current: Math.floor(progress), total: estimatedTotal })
        }, 200)
        
        // Check if SignalR is enabled
        const isSignalREnabled = process.env.NEXT_PUBLIC_ENABLE_SIGNALR === "true"
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL
        
        console.log("🔧 Environment check:")
        console.log("  NEXT_PUBLIC_ENABLE_SIGNALR:", process.env.NEXT_PUBLIC_ENABLE_SIGNALR)
        console.log("  NEXT_PUBLIC_API_BASE_URL:", process.env.NEXT_PUBLIC_API_BASE_URL)
        console.log("  isSignalREnabled:", isSignalREnabled)
        
        if (!apiBaseUrl) {
          throw new Error('NEXT_PUBLIC_API_BASE_URL environment variable is not configured')
        }
        
        if (!isSignalREnabled) {
          console.log("❌ SignalR disabled in environment config, using polling mode...")
          if (isActive) {
            setConnectionStatus("polling")
            startPolling()
          }
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
        
        if (!isActive) return // Check again before creating connection
        
        // Build SignalR connection for Azure Web PubSub
        connection = new HubConnectionBuilder()
          .withUrl(negotiateData.url, {
            accessTokenFactory: () => negotiateData.accessToken
          })
          .withAutomaticReconnect([0, 2000, 10000, 30000]) // Limit reconnect attempts
          .configureLogging(LogLevel.Information) // Increase logging to see what's happening
          .build()
        
        // Set up event handlers
        connection.on("event", (eventData: FleetEvent) => {
          if (!isActive) return // Don't process events if component unmounted
          console.log("📡 Received SignalR event:", eventData)
          setEvents(prev => {
            const sanitized = sanitizeEventForDisplay(eventData)
            return [sanitized, ...prev].slice(0, 50) // Reduced from 100 to 50 events max
          })
          setLastUpdateTime(new Date())
        })
        
        connection.onreconnecting(() => {
          if (!isActive) return
          console.log("🔄 SignalR reconnecting...")
          setConnectionStatus("connecting")
        })
        
        connection.onreconnected(() => {
          if (!isActive) return
          console.log("✅ SignalR reconnected")
          setConnectionStatus("connected")
          setLastUpdateTime(new Date())
        })
        
        connection.onclose(() => {
          if (!isActive) return
          console.log("❌ SignalR connection closed, falling back to polling")
          setConnectionStatus("error")
          startPolling()
        })
        
        // Start the connection
        await connection.start()
        if (!isActive) return
        
        console.log("✅ SignalR connected successfully")
        setConnectionStatus("connected")
        setLastUpdateTime(new Date())
        
        // Clear progress interval on successful connection
        if (progressInterval) {
          clearInterval(progressInterval)
          progressInterval = null
        }
        
        // Also fetch initial events via polling to get any missed events
        fetchLocalEvents()
        
      } catch (error) {
        if (!isActive) return
        
        console.error("❌ Failed to start SignalR connection:", error)
        setConnectionStatus("error")
        
        console.log("🔄 SignalR connection failed, falling back to polling mode")
        console.log("💡 To enable SignalR: Set NEXT_PUBLIC_ENABLE_SIGNALR=true and ensure /api/negotiate endpoint exists")
        startPolling()
      }
    }

    function startPolling() {
      if (pollingInterval || !isActive) return // Already polling or component unmounted
      
      setConnectionStatus("polling")
      console.log("📡 Starting HTTP polling mode (every 10 seconds)")
      
      // Fetch events immediately
      fetchLocalEvents()
      
      // Poll every 30 seconds to reduce browser workload
      pollingInterval = setInterval(() => {
        if (isActive) {
          fetchLocalEvents()
        }
      }, 30000)
    }

    startConnection()

    return () => {
      // Mark component as inactive
      isActive = false
      
      // Cleanup SignalR connection
      if (connection) {
        connection.off("event") // Remove event handlers
        connection.stop().catch(err => console.warn("Error stopping SignalR connection:", err))
        connection = null
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
      
      console.log("Dashboard hooks cleanup completed")
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

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
              return data.events.slice(-100) // Keep only last 100 events
            }
            
            // Otherwise, merge new events, avoiding duplicates
            const existingIds = new Set(prev.map(e => e.id))
            const newEvents = data.events.filter((e: FleetEvent) => !existingIds.has(e.id))
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

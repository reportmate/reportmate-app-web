"use client"

import { useEffect, useState } from "react"
import { HubConnection, HubConnectionBuilder, LogLevel } from "@microsoft/signalr"

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
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date())

  useEffect(() => {
    let connection: HubConnection | null = null
    let pollingInterval: NodeJS.Timeout | null = null
    
    const startSignalR = async () => {
      try {
        setConnectionStatus("connecting")
        
        // Get API base URL from environment
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL;
        if (!apiBaseUrl) {
          throw new Error('API_BASE_URL or NEXT_PUBLIC_API_BASE_URL environment variable is required for SignalR');
        }
        
        // Get connection info from negotiate endpoint
        const negotiateResponse = await fetch(`${apiBaseUrl}/api/negotiate`)
        if (!negotiateResponse.ok) {
          throw new Error(`Negotiate failed: ${negotiateResponse.status}`)
        }
        
        const connectionInfo = await negotiateResponse.json()
        
        // Check if negotiate returned an error (WebPubSub not configured)
        if (connectionInfo.error || !connectionInfo.url) {
          throw new Error(connectionInfo.error || 'SignalR not available')
        }
        
        // Build SignalR connection
        connection = new HubConnectionBuilder()
          .withUrl(connectionInfo.url, {
            accessTokenFactory: () => connectionInfo.accessToken
          })
          .withAutomaticReconnect([0, 2000, 10000, 30000])
          .configureLogging(LogLevel.Warning) // Reduce logging noise
          .build()
        
        // Set up event handlers
        connection.on("event", (event: FleetEvent) => {
          setEvents((prev: FleetEvent[]) => {
            const existingIds = new Set(prev.map(e => e.id))
            if (!existingIds.has(event.id)) {
              setLastUpdateTime(new Date())
              return [event, ...prev].slice(0, 50)
            }
            return prev
          })
        })
        
        // Handle reconnection
        connection.onreconnected(() => {
          setConnectionStatus("connected")
        })
        
        connection.onreconnecting(() => {
          setConnectionStatus("reconnecting")
        })
        
        connection.onclose(() => {
          setConnectionStatus("disconnected")
        })
        
        // Start connection
        await connection.start()
        setConnectionStatus("connected")
        
        // Load initial events via HTTP
        await loadInitialEvents()
        
      } catch (error) {
        console.error("❌ SignalR connection failed:", error)
        setConnectionStatus("failed")
        // Fallback to polling
        startPolling()
      }
    }
    
    const loadInitialEvents = async () => {
      try {
        const response = await fetch('/api/events')
        if (response.ok) {
          const data = await response.json()
          const recentEvents = data.events || []
          
          if (recentEvents.length > 0) {
            setEvents(recentEvents.slice(0, 50))
            setLastUpdateTime(new Date())
          }
        }
      } catch (error) {
        console.error("❌ Failed to load initial events:", error)
      }
    }
    
    const startPolling = () => {
      setConnectionStatus("polling")
      
      const poll = async () => {
        try {
          const response = await fetch('/api/events')
          if (response.ok) {
            const data = await response.json()
            const recentEvents = data.events || []
            
            if (recentEvents.length > 0) {
              setEvents((prev: FleetEvent[]) => {
                const existingIds = new Set(prev.map(e => e.id))
                const newEvents = recentEvents.filter((e: FleetEvent) => !existingIds.has(e.id))
                if (newEvents.length > 0) {
                  setLastUpdateTime(new Date())
                  return [...newEvents, ...prev].slice(0, 50)
                }
                return prev
              })
            }
          }
        } catch (error) {
          console.error("❌ Polling failed:", error)
        }
      }
      
      poll()
      pollingInterval = setInterval(poll, 60000) // Poll every 60 seconds (reduced from 10)
    }
    
    // Try SignalR first, fall back to polling if it fails
    startSignalR()

    return () => {
      if (connection) {
        connection.stop()
      }
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
    }
  }, [])

  return { 
    events, 
    connectionStatus,
    lastUpdateTime,
    addEvent: (event: FleetEvent) => {
      setEvents(prev => [event, ...prev].slice(0, 50))
      setLastUpdateTime(new Date())
    }
  }
}

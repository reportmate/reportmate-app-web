"use client"

import { useEffect, useState, useRef, useCallback } from "react"

export interface FleetEvent {
  id: string
  device: string
  kind: string
  ts: string
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
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date())
  
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const cleanup = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
  }, [])

  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return // Already polling
    
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
        console.error("Polling failed:", error)
      }
    }
    
    poll()
    pollingIntervalRef.current = setInterval(poll, 60000) // Poll every 60 seconds
  }, [])

  const loadInitialEvents = useCallback(async () => {
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
      console.error("Failed to load initial events:", error)
    }
  }, [])

  const connectWebSocket = useCallback(async () => {
    try {
      setConnectionStatus("connecting")
      
      // Get API base URL from environment
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL
      if (!apiBaseUrl) {
        throw new Error('API_BASE_URL environment variable is required')
      }
      
      // Get connection info from negotiate endpoint
      const negotiateResponse = await fetch(`${apiBaseUrl}/api/negotiate?device=dashboard`)
      if (!negotiateResponse.ok) {
        throw new Error(`Negotiate failed: ${negotiateResponse.status}`)
      }
      
      const connectionInfo = await negotiateResponse.json()
      
      // Check if negotiate returned an error
      if (connectionInfo.error || !connectionInfo.url) {
        throw new Error(connectionInfo.error || 'WebPubSub not available')
      }
      
      // Connect using native WebSocket with Azure Web PubSub JSON subprotocol
      // The URL already contains the access_token as a query parameter
      const ws = new WebSocket(connectionInfo.url, 'json.webpubsub.azure.v1')
      wsRef.current = ws
      
      ws.onopen = () => {
        console.log('WebPubSub connected')
        setConnectionStatus("connected")
        reconnectAttempts.current = 0
        setLastUpdateTime(new Date())
        
        // Load initial events via HTTP
        loadInitialEvents()
      }
      
      ws.onmessage = (event) => {
        try {
          const message: WebPubSubMessage = JSON.parse(event.data)
          
          // Handle different message types
          if (message.type === "message") {
            // Messages from server via sendToAll
            const eventData = message.data as FleetEvent
            if (eventData && eventData.id) {
              setEvents((prev: FleetEvent[]) => {
                const existingIds = new Set(prev.map(e => e.id))
                if (!existingIds.has(eventData.id)) {
                  setLastUpdateTime(new Date())
                  return [eventData, ...prev].slice(0, 50)
                }
                return prev
              })
            }
          } else if (message.type === "system") {
            // System messages (connected, disconnected, etc.)
            console.log('WebPubSub system message:', message.event)
          }
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error)
        }
      }
      
      ws.onerror = (error) => {
        console.error("WebSocket error:", error)
      }
      
      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason)
        wsRef.current = null
        
        // Attempt reconnection with exponential backoff
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000)
          reconnectAttempts.current++
          setConnectionStatus("reconnecting")
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket()
          }, delay)
        } else {
          // Max reconnects reached, fall back to polling
          console.log('Max reconnect attempts reached, falling back to polling')
          startPolling()
        }
      }
      
    } catch (error) {
      console.error("WebSocket connection failed:", error)
      setConnectionStatus("failed")
      startPolling()
    }
  }, [loadInitialEvents, startPolling])

  useEffect(() => {
    // Check if SignalR/WebPubSub is enabled
    const isEnabled = process.env.NEXT_PUBLIC_ENABLE_SIGNALR === "true"
    
    if (!isEnabled) {
      startPolling()
      return cleanup
    }
    
    // Try WebSocket first
    connectWebSocket()
    
    return cleanup
  }, [connectWebSocket, startPolling, cleanup])

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
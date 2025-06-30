"use client"

import { useEffect, useState } from "react"
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
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date())

  useEffect(() => {
    let connection: HubConnection | null = null
    let pollingInterval: NodeJS.Timeout | null = null
    
    // Initialize with empty events array - no fake test events
    console.log("🚀 SignalR client initialized")
    
    const startPolling = () => {
      console.log("🔄 Starting polling mode")
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
                return [...newEvents, ...prev].slice(0, 100)
              })
              setLastUpdateTime(new Date())
            }
          }
        } catch (error) {
          console.error("❌ Polling failed:", error)
        }
      }
      
      poll()
      pollingInterval = setInterval(poll, 5000)
    }
    
    // For now, just use polling since SignalR has connection issues
    startPolling()

    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
      // Connection cleanup is handled elsewhere due to polling approach
    }
  }, [])

  return { 
    events, 
    connectionStatus,
    lastUpdateTime,
    addEvent: (event: FleetEvent) => {
      setEvents(prev => [event, ...prev].slice(0, 100))
      setLastUpdateTime(new Date())
    }
  }
}

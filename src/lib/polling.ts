"use client"

import { useEffect, useState } from "react"
import { FleetEvent } from "./signalr"

// Polling-based approach as fallback
export function usePollingEvents() {
  const [events, setEvents] = useState<FleetEvent[]>([])

  useEffect(() => {
    // Fetch real events from the API
    
    const fetchEvents = async () => {
      try {
        // Fetch real events from the API
        const response = await fetch('/api/events')
        if (response.ok) {
          const newEvents: FleetEvent[] = await response.json()
          
          // Update events, keeping only recent ones (last hour)
          setEvents(prev => {
            const oneHourAgo = Date.now() - 3600000
            const recentEvents = prev.filter(e => new Date(e.ts).getTime() > oneHourAgo)
            
            // Merge new events with existing ones, avoiding duplicates
            const eventIds = new Set(recentEvents.map(e => e.id))
            const uniqueNewEvents = newEvents.filter(e => !eventIds.has(e.id))
            
            return [...uniqueNewEvents, ...recentEvents].slice(0, 100) // Keep last 100 events
          })
        }
      } catch (error) {
        console.error("Polling failed:", error)
      }
    }

    // Poll every 60 seconds (reduced from 10 to save resources)
    const interval = setInterval(fetchEvents, 60000)
    
    // Initial fetch
    fetchEvents()

    return () => clearInterval(interval)
  }, [])

  return events
}

// WebSocket test function
export function testWebSocketConnection() {
  return new Promise((resolve, reject) => {
    const apiBaseUrl = process.env.API_BASE_URL
    
    if (!apiBaseUrl) {
      reject(new Error('API_BASE_URL environment variable not configured'))
      return
    }
    
    fetch(`${apiBaseUrl}/api/negotiate?device=test`)
      .then(res => res.json())
      .then(connectionInfo => {
        
        const ws = new WebSocket(connectionInfo.url, "json.webpubsub.azure.v1")
        
        ws.onopen = () => {
          ws.close()
          resolve("Connection successful")
        }
        
        ws.onerror = (error) => {
          console.error("❌ WebSocket test failed:", error)
          reject(error)
        }
        
        ws.onclose = (event) => {
          if (event.code !== 1000) {
            console.error("Connection closed with error:", event.code, event.reason)
            reject(new Error(`Connection closed: ${event.code} ${event.reason}`))
          }
        }
        
        // Timeout after 10 seconds
        setTimeout(() => {
          if (ws.readyState === WebSocket.CONNECTING) {
            ws.close()
            reject(new Error("Connection timeout"))
          }
        }, 10000)
      })
      .catch(reject)
  })
}

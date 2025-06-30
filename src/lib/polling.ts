"use client"

import { useEffect, useState } from "react"
import { FleetEvent } from "./signalr"

// Polling-based approach as fallback
export function usePollingEvents() {
  const [events, setEvents] = useState<FleetEvent[]>([])

  useEffect(() => {
    // Create a simple API endpoint that returns recent events
    // This is a temporary solution while we debug WebSocket
    
    const fetchEvents = async () => {
      try {
        // For now, create mock events to test the UI
        const mockEvent: FleetEvent = {
          id: `mock-${Date.now()}`,
          device: "test-device",
          kind: "ping",
          ts: new Date().toISOString(),
          payload: { test: true, timestamp: new Date().toISOString() }
        }
        
        // Only add if we don't have recent mock events
        setEvents(prev => {
          const recentMock = prev.find(e => e.device === "test-device" && 
            Date.now() - new Date(e.ts).getTime() < 30000)
          if (recentMock) return prev
          return [mockEvent, ...prev]
        })
      } catch (error) {
        console.error("Polling failed:", error)
      }
    }

    // Poll every 10 seconds
    const interval = setInterval(fetchEvents, 10000)
    
    // Initial fetch
    fetchEvents()

    return () => clearInterval(interval)
  }, [])

  return events
}

// WebSocket test function
export function testWebSocketConnection() {
  return new Promise((resolve, reject) => {
    fetch('https://reportmate-api.azurewebsites.net/api/negotiate?device=test')
      .then(res => res.json())
      .then(connectionInfo => {
        console.log("Negotiate successful:", connectionInfo)
        
        const ws = new WebSocket(connectionInfo.url, "json.webpubsub.azure.v1")
        
        ws.onopen = () => {
          console.log("✅ WebSocket test connection successful")
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

/**
 * Memory management utilities for ReportMate
 * Helps prevent memory leaks and optimize performance
 */

interface ComponentTracker {
  [componentName: string]: {
    mounted: number
    unmounted: number
    active: string[]
  }
}

class MemoryManager {
  private static instance: MemoryManager
  private componentTracker: ComponentTracker = {}
  private intervals: Map<string, NodeJS.Timeout> = new Map()
  private connections: Map<string, any> = new Map()
  
  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager()
    }
    return MemoryManager.instance
  }

  // Track component mounting/unmounting
  trackComponent(componentName: string, instanceId: string, mounted: boolean) {
    if (!this.componentTracker[componentName]) {
      this.componentTracker[componentName] = {
        mounted: 0,
        unmounted: 0,
        active: []
      }
    }

    const tracker = this.componentTracker[componentName]
    
    if (mounted) {
      tracker.mounted++
      tracker.active.push(instanceId)
    } else {
      tracker.unmounted++
      tracker.active = tracker.active.filter(id => id !== instanceId)
    }

    // Log warning if there are too many active instances
    if (tracker.active.length > 10) {
      console.warn(`[Memory Warning] Too many active instances of ${componentName}: ${tracker.active.length}`)
    }
  }

  // Register and manage intervals
  registerInterval(key: string, interval: NodeJS.Timeout) {
    // Clear existing interval if it exists
    this.clearInterval(key)
    this.intervals.set(key, interval)
  }

  clearInterval(key: string) {
    const interval = this.intervals.get(key)
    if (interval) {
      clearInterval(interval)
      this.intervals.delete(key)
    }
  }

  // Register and manage connections (SignalR, WebSocket, etc.)
  registerConnection(key: string, connection: any) {
    this.connections.set(key, connection)
  }

  closeConnection(key: string) {
    const connection = this.connections.get(key)
    if (connection) {
      if (typeof connection.stop === 'function') {
        connection.stop().catch((err: Error) => console.warn('Error stopping connection:', err))
      } else if (typeof connection.close === 'function') {
        connection.close()
      }
      this.connections.delete(key)
    }
  }

  // Memory monitoring
  getMemoryStats() {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory
      return {
        usedJSHeapSize: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
        totalJSHeapSize: Math.round(memory.totalJSHeapSize / 1024 / 1024), // MB
        jsHeapSizeLimit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024), // MB
      }
    }
    return null
  }

  // Component tracking stats
  getComponentStats() {
    return this.componentTracker
  }

  // Cleanup all resources
  cleanup() {
    // Clear all intervals
    this.intervals.forEach((interval, _key) => {
      clearInterval(interval)
    })
    this.intervals.clear()

    // Close all connections
    this.connections.forEach((connection, key) => {
      this.closeConnection(key)
    })
  }

  // Log memory status
  logMemoryStatus(context?: string) {
    const memStats = this.getMemoryStats()
    const compStats = this.getComponentStats()
    
    // Warn if memory usage is high
    if (memStats && memStats.usedJSHeapSize > 100) { // 100MB threshold
      console.warn(`[Memory Warning] High memory usage: ${memStats.usedJSHeapSize}MB`)
    }
  }
}

// Hook for component tracking
export function useComponentTracker(componentName: string) {
  const instanceId = React.useRef(`${componentName}-${Date.now()}-${Math.random()}`)
  const manager = MemoryManager.getInstance()

  React.useEffect(() => {
    const id = instanceId.current
    manager.trackComponent(componentName, id, true)
    
    return () => {
      manager.trackComponent(componentName, id, false)
    }
  }, [componentName, manager])

  return instanceId.current
}

// Hook for managed intervals
export function useManagedInterval(
  callback: () => void, 
  delay: number | null, 
  key?: string
) {
  const manager = MemoryManager.getInstance()
  const keyRef = React.useRef(key || `interval-${Date.now()}-${Math.random()}`)

  React.useEffect(() => {
    const intervalKey = keyRef.current
    if (delay !== null) {
      const interval = setInterval(callback, delay)
      manager.registerInterval(intervalKey, interval)
      
      return () => {
        manager.clearInterval(intervalKey)
      }
    }
    return () => {
      manager.clearInterval(intervalKey)
    }
  }, [callback, delay, manager])
}

// Global cleanup function for page unload
export function setupGlobalCleanup() {
  if (typeof window !== 'undefined') {
    const handleBeforeUnload = () => {
      MemoryManager.getInstance().cleanup()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    
    // Also cleanup when navigating away in SPA
    const handlePopState = () => {
      MemoryManager.getInstance().cleanup()
    }
    
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('popstate', handlePopState)
    }
  }
}

// Export singleton instance
export const memoryManager = MemoryManager.getInstance()

// React import
import React from 'react'

/**
 * Memory optimization utilities for ReportMate dashboard
 * Helps reduce memory consumption and prevent memory leaks
 */

interface Device {
  deviceId: string
  serialNumber: string
  name: string
  model?: string
  os?: string
  lastSeen: string
  createdAt?: string
  status: string
  uptime?: string
  location?: string
  ipAddress?: string
  totalEvents: number
  lastEventTime: string
  assetTag?: string
  modules?: {
    [key: string]: any
  }
}

interface Event {
  id: string
  deviceId: string
  timestamp: string
  eventType: string
  message: string
  [key: string]: any
}

interface MemoryCheckResult {
  usage: number
  warning: boolean
  limit: number
}

/**
 * Optimize devices array by removing unnecessary data and limiting array size
 */
export function optimizeDevicesArray(devices: Device[]): Device[] {
  if (!Array.isArray(devices)) {
    return []
  }

  // Limit to most recent 1000 devices to prevent memory issues
  const limitedDevices = devices.slice(0, 1000)

  return limitedDevices.map(device => ({
    deviceId: device.deviceId || '',
    serialNumber: device.serialNumber || '',
    name: device.name || device.serialNumber || 'Unknown Device',
    model: device.model,
    os: device.os,
    lastSeen: device.lastSeen || new Date().toISOString(),
    createdAt: device.createdAt,
    status: device.status || 'unknown',
    uptime: device.uptime,
    location: device.location,
    ipAddress: device.ipAddress,
    totalEvents: device.totalEvents || 0,
    lastEventTime: device.lastEventTime || device.lastSeen || new Date().toISOString(),
    assetTag: device.assetTag,
    // Preserve modules but limit depth to prevent memory bloat
    modules: device.modules ? limitObjectDepth(device.modules, 3) : undefined
  }))
}

/**
 * Optimize event for memory by removing large payloads and limiting data
 */
export function optimizeEventForMemory(event: Event): Event {
  if (!event) return event

  const optimized: Event = {
    id: event.id || '',
    deviceId: event.deviceId || '',
    timestamp: event.timestamp || new Date().toISOString(),
    eventType: event.eventType || 'info',
    message: typeof event.message === 'string' ? event.message.slice(0, 500) : '' // Limit message length
  }

  // Add only essential properties, skip large payloads
  const essentialKeys = ['severity', 'source', 'category', 'serialNumber']
  essentialKeys.forEach(key => {
    if (event[key] !== undefined) {
      optimized[key] = event[key]
    }
  })

  return optimized
}

/**
 * Check current memory usage and return warning status
 */
export function checkMemoryUsage(): MemoryCheckResult {
  if (typeof performance !== 'undefined' && (performance as any).memory) {
    const memory = (performance as any).memory
    const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024)
    const limitMB = Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
    
    return {
      usage: usedMB,
      warning: usedMB > 150, // Warning at 150MB
      limit: limitMB
    }
  }

  // Fallback if memory API is not available
  return {
    usage: 0,
    warning: false,
    limit: 0
  }
}

/**
 * Trigger memory cleanup operations
 */
export function triggerMemoryCleanup(): void {
  try {
    // Force garbage collection if available (only works in dev/debug environments)
    if (typeof (window as any).gc === 'function') {
      (window as any).gc()
    }

    // Clear any unused caches
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          if (name.includes('old') || name.includes('temp')) {
            caches.delete(name)
          }
        })
      })
    }

    // Suggestion to reload if memory usage is critical
    const memCheck = checkMemoryUsage()
    if (memCheck.usage > 300) { // 300MB threshold for reload suggestion
      console.warn('[Memory] Critical memory usage detected. Consider reloading the page.')
      
      // Show user notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('ReportMate Memory Warning', {
          body: `High memory usage (${memCheck.usage}MB). Consider refreshing the page.`,
          icon: '/reportmate-logo.png'
        })
      }
    }
  } catch (error) {
    console.warn('[Memory] Cleanup failed:', error)
  }
}

/**
 * Limit object depth to prevent deeply nested objects from consuming too much memory
 */
function limitObjectDepth(obj: any, maxDepth: number, currentDepth = 0): any {
  if (currentDepth >= maxDepth || obj === null || typeof obj !== 'object') {
    return obj
  }

  if (Array.isArray(obj)) {
    // Limit array size to prevent memory issues
    return obj.slice(0, 100).map(item => limitObjectDepth(item, maxDepth, currentDepth + 1))
  }

  const result: any = {}
  for (const [key, value] of Object.entries(obj)) {
    result[key] = limitObjectDepth(value, maxDepth, currentDepth + 1)
  }
  
  return result
}

/**
 * Memory-safe array operations
 */
export const memoryUtils = {
  /**
   * Safely slice array with memory checks
   */
  safeSlice<T>(arr: T[], start = 0, end?: number): T[] {
    if (!Array.isArray(arr)) return []
    
    const maxItems = 10000 // Prevent arrays from getting too large
    const actualEnd = end ? Math.min(end, start + maxItems) : Math.min(arr.length, start + maxItems)
    
    return arr.slice(start, actualEnd)
  },

  /**
   * Safely filter array with memory checks
   */
  safeFilter<T>(arr: T[], predicate: (item: T) => boolean, maxResults = 1000): T[] {
    if (!Array.isArray(arr)) return []
    
    const results: T[] = []
    for (const item of arr) {
      if (results.length >= maxResults) break
      if (predicate(item)) {
        results.push(item)
      }
    }
    
    return results
  },

  /**
   * Safely map array with memory checks
   */
  safeMap<T, U>(arr: T[], mapper: (item: T) => U, maxItems = 1000): U[] {
    if (!Array.isArray(arr)) return []
    
    return arr.slice(0, maxItems).map(mapper)
  }
}
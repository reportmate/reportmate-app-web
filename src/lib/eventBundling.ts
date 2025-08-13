/**
 * Event bundling utilities for ReportMate dashboard
 * Groups similar events together to reduce clutter in the UI
 */

export interface FleetEvent {
  id: string
  device: string
  kind: string
  ts: string
  message?: string
  payload?: Record<string, unknown> | string | null
}

export interface BundledEvent extends FleetEvent {
  isBundle?: boolean
  count?: number
  firstEventTime?: string
  lastEventTime?: string
  bundledEvents?: FleetEvent[]
  bundledKinds?: string[]
  eventIds?: string[]
}

/**
 * Bundle similar events together
 */
export function bundleEvents(events: FleetEvent[]): BundledEvent[] {
  if (!events || events.length === 0) return []

  const eventMap = new Map<string, BundledEvent>()
  const bundledResults: BundledEvent[] = []

  // Sort events by timestamp (newest first)
  const sortedEvents = [...events].sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())

  for (const event of sortedEvents) {
    const bundleKey = `${event.device}-${event.kind}-${getBundleCategory(event)}`
    
    if (eventMap.has(bundleKey)) {
      const existing = eventMap.get(bundleKey)!
      existing.count = (existing.count || 1) + 1
      existing.lastEventTime = event.ts // Most recent
      existing.bundledEvents = existing.bundledEvents || []
      existing.bundledEvents.push(event)
      existing.isBundle = existing.count > 1
      
      // Update bundledKinds to include all unique kinds
      if (existing.bundledKinds && !existing.bundledKinds.includes(event.kind)) {
        existing.bundledKinds.push(event.kind)
      }
      
      // Update eventIds to include all event IDs
      existing.eventIds = existing.eventIds || []
      existing.eventIds.push(event.id)
      
      // Update message for bundle
      if (existing.count > 1) {
        existing.message = `${getBundleCategory(event)} (${existing.count} events)`
      }
    } else {
      // Create new bundle entry
      const bundledEvent: BundledEvent = {
        ...event,
        count: 1,
        firstEventTime: event.ts,
        lastEventTime: event.ts,
        bundledEvents: [event],
        bundledKinds: [event.kind],
        eventIds: [event.id],
        isBundle: false
      }
      eventMap.set(bundleKey, bundledEvent)
      bundledResults.push(bundledEvent)
    }
  }

  // Sort results by most recent event time
  return bundledResults.sort((a, b) => 
    new Date(b.lastEventTime || b.ts).getTime() - new Date(a.lastEventTime || a.ts).getTime()
  )
}

/**
 * Get a category for bundling similar events
 */
function getBundleCategory(event: FleetEvent): string {
  const message = event.message || formatPayloadPreview(event.payload)
  
  // Data collection events
  if (message.includes('modules data collection completed') || 
      message.includes('module reported data') ||
      message.includes('data collection')) {
    return 'Data Collection'
  }
  
  // System events
  if (message.includes('system') || event.kind === 'system') {
    return 'System Activity'
  }
  
  // Error events
  if (message.includes('error') || event.kind === 'error') {
    return 'Errors'
  }
  
  // Warning events
  if (message.includes('warning') || event.kind === 'warning') {
    return 'Warnings'
  }
  
  // Default to message preview
  return message.substring(0, 30)
}

/**
 * Format event payload for preview
 */
export function formatPayloadPreview(payload: Record<string, unknown> | string | null | undefined): string {
  if (!payload) return 'No details'
  
  if (typeof payload === 'string') {
    return payload.length > 100 ? payload.substring(0, 100) + '...' : payload
  }
  
  if (typeof payload === 'object') {
    // Extract meaningful information from payload
    const payloadObj = payload as Record<string, unknown>
    
    // Check for common payload fields
    if (payloadObj.message) {
      const msg = String(payloadObj.message)
      return msg.length > 100 ? msg.substring(0, 100) + '...' : msg
    }
    
    if (payloadObj.summary) {
      const summary = String(payloadObj.summary)
      return summary.length > 100 ? summary.substring(0, 100) + '...' : summary
    }
    
    if (payloadObj.moduleCount || payloadObj.modules_processed) {
      const count = payloadObj.moduleCount || payloadObj.modules_processed
      return `${count} modules data collection completed`
    }
    
    if (payloadObj.collection_type) {
      return `${payloadObj.collection_type} collection completed`
    }
    
    // Try to extract first meaningful string value
    for (const [key, value] of Object.entries(payloadObj)) {
      if (typeof value === 'string' && value.length > 5) {
        return value.length > 100 ? value.substring(0, 100) + '...' : value
      }
    }
    
    // Fallback to JSON preview
    try {
      const jsonStr = JSON.stringify(payload)
      return jsonStr.length > 100 ? jsonStr.substring(0, 100) + '...' : jsonStr
    } catch {
      return 'Complex payload data'
    }
  }
  
  return String(payload)
}

/**
 * Get event severity level
 */
export function getEventSeverity(event: FleetEvent): 'info' | 'warning' | 'error' | 'success' {
  const kind = event.kind?.toLowerCase() || 'info'
  const message = (event.message || '').toLowerCase()
  
  if (kind.includes('error') || message.includes('error') || message.includes('failed')) {
    return 'error'
  }
  
  if (kind.includes('warning') || message.includes('warning') || message.includes('warn')) {
    return 'warning'
  }
  
  if (kind.includes('success') || message.includes('success') || message.includes('completed')) {
    return 'success'
  }
  
  return 'info'
}

/**
 * Check if event should be hidden from main view
 */
export function shouldHideEvent(event: FleetEvent): boolean {
  const message = (event.message || '').toLowerCase()
  
  // Hide very repetitive system events
  if (message.includes('heartbeat') || 
      message.includes('ping') ||
      message.includes('keepalive')) {
    return true
  }
  
  return false
}

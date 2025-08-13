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
  isBundle: boolean
  count: number
  eventIds: string[]
  bundledKinds: string[]
}

/**
 * Bundle similar events together intelligently (from RecentEventsWidget)
 */
export function bundleEvents(events: FleetEvent[]): BundledEvent[] {
  if (!events.length) return []

  // Sort events by timestamp (newest first)
  const sortedEvents = [...events].sort((a, b) => 
    new Date(b.ts).getTime() - new Date(a.ts).getTime()
  )

  const bundled: BundledEvent[] = []
  const processed = new Set<string>()

  for (const event of sortedEvents) {
    if (processed.has(event.id)) continue

    // Find other events from the same device within 2 minutes that should be bundled
    const bundleTimeWindow = 2 * 60 * 1000 // 2 minutes in ms
    const eventTime = new Date(event.ts).getTime()
    
    const relatedEvents = sortedEvents.filter(other => 
      !processed.has(other.id) &&
      other.device === event.device &&
      Math.abs(new Date(other.ts).getTime() - eventTime) <= bundleTimeWindow &&
      shouldBundleTogether(event, other)
    )

    // If we found related events, create a bundle
    if (relatedEvents.length > 1) {
      const bundleKinds = [...new Set(relatedEvents.map(e => e.kind))]
      const primaryKind = getBundlePrimaryKind(bundleKinds)
      
      // Mark all related events as processed
      relatedEvents.forEach(e => processed.add(e.id))

      bundled.push({
        id: `bundle-${event.device}-${eventTime}`,
        device: event.device,
        kind: primaryKind,
        ts: event.ts, // Use the primary event's timestamp
        message: createBundleMessage(relatedEvents, bundleKinds),
        count: relatedEvents.length,
        eventIds: relatedEvents.map(e => e.id),
        isBundle: true,
        bundledKinds: bundleKinds
      })
    } else {
      // Single event, add as-is
      processed.add(event.id)
      bundled.push({
        id: event.id,
        device: event.device,
        kind: event.kind,
        ts: event.ts,
        message: event.message || formatPayloadPreview(event.payload),
        count: 1,
        eventIds: [event.id],
        isBundle: false,
        bundledKinds: [event.kind]
      })
    }
  }

  return bundled.slice(0, 50) // Limit to 50 items
}

// Determine if two events should be bundled together
function shouldBundleTogether(event1: FleetEvent, event2: FleetEvent): boolean {
  // Same device is required (already checked in caller)
  
  // Bundle events of the same type (info + info, error + error, etc.)
  if (event1.kind === event2.kind) return true
  
  // Bundle success/info events together (data collection events)
  const dataCollectionTypes = new Set(['success', 'info', 'system'])
  if (dataCollectionTypes.has(event1.kind) && dataCollectionTypes.has(event2.kind)) {
    return true
  }
  
  // Don't bundle errors or warnings with other types
  if (['error', 'warning'].includes(event1.kind) || ['error', 'warning'].includes(event2.kind)) {
    return event1.kind === event2.kind
  }
  
  return false
}

// Get the primary kind for a bundle (errors and warnings take precedence)
function getBundlePrimaryKind(kinds: string[]): string {
  if (kinds.includes('error')) return 'error'
  if (kinds.includes('warning')) return 'warning'
  if (kinds.includes('success')) return 'success'
  return kinds[0] || 'info'
}

// Create a smart message for bundled events
function createBundleMessage(events: FleetEvent[], kinds: string[]): string {
  const kindCounts = kinds.reduce((acc, kind) => {
    acc[kind] = (acc[kind] || 0) + events.filter(e => e.kind === kind).length
    return acc
  }, {} as Record<string, number>)

  // Check if these are module data collection events
  const moduleEvents = events.filter(event => {
    const message = event.message || formatPayloadPreview(event.payload)
    return message.includes('module reported data') || message.includes('modules reported data')
  })

  if (moduleEvents.length === events.length) {
    // All events are module data collection - create a smart summary
    const moduleNames = new Set<string>()
    
    events.forEach(event => {
      const message = event.message || formatPayloadPreview(event.payload)
      // Extract module names from messages like "Hardware module reported data"
      const matches = message.match(/^(\w+) module reported data$/i)
      if (matches) {
        moduleNames.add(matches[1])
      }
    })
    
    const moduleArray = Array.from(moduleNames)
    if (moduleArray.length === 1) {
      return `${moduleArray[0]} module data collection`
    } else if (moduleArray.length <= 3) {
      return `${moduleArray.join(', ')} modules data collection`
    } else {
      return `${moduleArray.length} modules data collection completed`
    }
  }

  // For mixed event types, create a summary
  const parts: string[] = []
  
  if (kindCounts.error) {
    parts.push(`${kindCounts.error} error${kindCounts.error > 1 ? 's' : ''}`)
  }
  if (kindCounts.warning) {
    parts.push(`${kindCounts.warning} warning${kindCounts.warning > 1 ? 's' : ''}`)
  }
  if (kindCounts.success) {
    parts.push(`${kindCounts.success} success event${kindCounts.success > 1 ? 's' : ''}`)
  }
  if (kindCounts.info || kindCounts.system) {
    const infoCount = (kindCounts.info || 0) + (kindCounts.system || 0)
    parts.push(`${infoCount} info event${infoCount > 1 ? 's' : ''}`)
  }

  return parts.length > 0 ? parts.join(', ') : `${events.length} events occurred`
}

/**
 * Format event payload for preview - enhanced for ReportMate events
 */
export function formatPayloadPreview(payload: Record<string, unknown> | string | null | undefined): string {
  try {
    if (!payload) return 'No payload'
    
    // Handle string payloads directly
    if (typeof payload === 'string') {
      return payload.length > 120 ? payload.substring(0, 120) + '...' : payload
    }
    
    if (typeof payload !== 'object') {
      return String(payload).substring(0, 80)
    }

    const payloadObj = payload as any

    // **PRIORITY 1: Look for direct message field (ReportMate events)**
    if (payloadObj.message && typeof payloadObj.message === 'string') {
      const message = payloadObj.message
      return message.length > 120 ? message.substring(0, 120) + '...' : message
    }

    // **PRIORITY 2: Look for summary field (API summaries)**
    if (payloadObj.summary && typeof payloadObj.summary === 'string') {
      return payloadObj.summary
    }

    // **PRIORITY 3: Handle modules_processed structure (data collection events)**
    if (payloadObj.modules_processed && typeof payloadObj.modules_processed === 'number') {
      const moduleCount = payloadObj.modules_processed
      const enabledModules = payloadObj.enabled_modules
      
      if (Array.isArray(enabledModules) && enabledModules.length > 0) {
        if (moduleCount === 1) {
          const capitalizedModule = enabledModules[0].charAt(0).toUpperCase() + enabledModules[0].slice(1)
          return `${capitalizedModule} module reported data`
        } else if (moduleCount <= 3) {
          const capitalizedModules = enabledModules.slice(0, moduleCount).map(module => 
            module.charAt(0).toUpperCase() + module.slice(1)
          )
          return `${capitalizedModules.join(', ')} modules reported data`
        } else {
          return `All ${moduleCount} modules reported data`
        }
      }
      
      return `${moduleCount} modules reported data`
    }

    // **PRIORITY 4: Handle moduleCount structure (older format)**
    if (payloadObj.moduleCount && payloadObj.modules && Array.isArray(payloadObj.modules)) {
      const moduleCount = payloadObj.moduleCount
      const modules = payloadObj.modules
      if (moduleCount === 1) {
        return `${modules[0].charAt(0).toUpperCase() + modules[0].slice(1)} module reported data`
      } else if (moduleCount <= 3) {
        const capitalizedModules = modules.map((module: string) => 
          module.charAt(0).toUpperCase() + module.slice(1)
        )
        return `${capitalizedModules.join(', ')} modules reported data`
      } else {
        return `All modules reported data`
      }
    }

    // **PRIORITY 5: Handle full device report structure**
    if (payloadObj.modules && typeof payloadObj.modules === 'object') {
      const moduleNames = Object.keys(payloadObj.modules)
      const moduleCount = moduleNames.length
      
      if (moduleCount === 1) {
        return `${moduleNames[0].charAt(0).toUpperCase() + moduleNames[0].slice(1)} module reported data`
      } else if (moduleCount <= 3) {
        const capitalizedModules = moduleNames.map(module => 
          module.charAt(0).toUpperCase() + module.slice(1)
        )
        return `${capitalizedModules.join(', ')} modules reported data`
      } else {
        return `All modules reported data`
      }
    }

    // **PRIORITY 6: Handle sanitized payload summaries**
    if (payloadObj.message && payloadObj.dataSize && payloadObj.truncated) {
      // This is a sanitized large payload
      if (payloadObj.keys && Array.isArray(payloadObj.keys)) {
        const keys = payloadObj.keys
        if (keys.includes('modules') || keys.includes('device_name') || keys.includes('client_version')) {
          return 'System data collection completed'
        }
      }
      return 'Data collection completed'
    }

    // **PRIORITY 7: Look for other common message fields**
    if (payloadObj.description) {
      return String(payloadObj.description).substring(0, 120)
    }
    if (payloadObj.title) {
      return String(payloadObj.title).substring(0, 120)
    }
    if (payloadObj.event_message) {
      return String(payloadObj.event_message).substring(0, 120)
    }

    // **FALLBACK: Create a descriptive summary**
    const keys = Object.keys(payloadObj)
    if (keys.length === 0) return 'Empty event data'
    
    // Check for known patterns in key names
    if (keys.some(k => k.includes('module') || k.includes('install') || k.includes('system'))) {
      return 'System event occurred'
    }
    
    if (keys.length === 1) {
      const key = keys[0]
      const value = payloadObj[key]
      if (typeof value === 'string' && value.length < 50) {
        return `${key}: ${value}`
      } else if (typeof value === 'number') {
        return `${key}: ${value}`
      }
    }
    
    // Last resort - show key count but make it more user-friendly
    if (keys.length <= 3) {
      return `Event with ${keys.join(', ')} data`
    } else {
      return `Complex event (${keys.length} data fields)`
    }
    
  } catch (_error) {
    return 'Event data (parsing error)'
  }
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

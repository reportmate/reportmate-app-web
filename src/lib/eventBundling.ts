/**
 * Event bundling utilities for ReportMate dashboard
 * Groups similar events together to reduce clutter in the UI
 */

export interface FleetEvent {
  id: string
  device: string
  deviceName?: string  // Enhanced with actual device name from API
  assetTag?: string    // Asset tag from inventory
  platform?: string    // Platform from system.operatingSystem.name (Windows/macOS)
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
  // Error/warning details for expandable rows (lazy-loaded)
  errorMessages?: string[]
  warningMessages?: string[]
  failedItems?: Array<{ name: string; displayName: string; error: string }>
  warningItems?: Array<{ name: string; displayName: string; warning: string }>
  hasExpandableDetails?: boolean  // True if event has error/warning details to show
}

/**
 * Bundle similar events together intelligently (from RecentEventsWidget)
 */
export function bundleEvents(events: FleetEvent[]): BundledEvent[] {
  if (!events.length) return []

  // STEP 1: Deduplicate events by ID before processing
  // This handles cases where the API returns duplicate events
  const seenIds = new Set<string>()
  const uniqueEvents = events.filter(event => {
    if (seenIds.has(event.id)) {
      return false // Skip duplicate
    }
    seenIds.add(event.id)
    return true
  })

  // Sort events by timestamp (newest first)
  const sortedEvents = [...uniqueEvents].sort((a, b) => 
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

      // Generate truly unique bundle ID: combine device + timestamp + sorted event IDs hash
      // This ensures two bundles from the same device at the same time still have unique IDs
      const sortedEventIds = relatedEvents.map(e => e.id).sort().join('-')
      const bundleId = `bundle-${event.device}-${eventTime}-${sortedEventIds.substring(0, 20)}`

      // Extract error/warning details from bundled events
      const bundledDetails = extractErrorWarningDetails(relatedEvents)

      bundled.push({
        id: bundleId,
        device: event.device,
        deviceName: event.deviceName,  // Preserve device name from primary event
        assetTag: event.assetTag,      // Preserve asset tag from primary event
        platform: event.platform,      // Preserve platform from primary event
        kind: primaryKind,
        ts: event.ts, // Use the primary event's timestamp
        message: createBundleMessage(relatedEvents, bundleKinds),
        count: relatedEvents.length,
        eventIds: relatedEvents.map(e => e.id),
        isBundle: true,
        bundledKinds: bundleKinds,
        ...bundledDetails
      })
    } else {
      // Single event, add as-is with error/warning details extracted
      processed.add(event.id)
      const singleEventDetails = extractErrorWarningDetails([event])
      
      bundled.push({
        id: event.id,
        device: event.device,
        deviceName: event.deviceName,  // Preserve device name
        assetTag: event.assetTag,      // Preserve asset tag
        platform: event.platform,      // Preserve platform
        kind: event.kind,
        ts: event.ts,
        message: event.message || formatPayloadPreview(event.payload),
        payload: event.payload,
        count: 1,
        eventIds: [event.id],
        isBundle: false,
        bundledKinds: [event.kind],
        ...singleEventDetails
      })
    }
  }

  return bundled // Return all bundled events (API already limits to 1000)
}

/**
 * Extract error/warning messages and items from event payloads
 * Used for both single events and bundled events
 */
function extractErrorWarningDetails(events: FleetEvent[]): Partial<BundledEvent> {
  const errorMessages: string[] = []
  const warningMessages: string[] = []
  const failedItems: Array<{ name: string; displayName: string; error: string }> = []
  const warningItems: Array<{ name: string; displayName: string; warning: string }> = []
  
  for (const event of events) {
    if (!event.payload || typeof event.payload !== 'object') continue
    
    const payload = event.payload as Record<string, unknown>
    
    // Extract error messages array
    if (Array.isArray(payload.error_messages)) {
      errorMessages.push(...(payload.error_messages as string[]))
    }
    
    // Extract warning messages array
    if (Array.isArray(payload.warning_messages)) {
      warningMessages.push(...(payload.warning_messages as string[]))
    }
    
    // Extract failed items array
    if (Array.isArray(payload.failed_items)) {
      for (const item of payload.failed_items as Array<Record<string, string>>) {
        failedItems.push({
          name: item.name || 'Unknown',
          displayName: item.displayName || item.name || 'Unknown',
          error: item.error || ''
        })
      }
    }
    
    // Extract warning items array
    if (Array.isArray(payload.warning_items)) {
      for (const item of payload.warning_items as Array<Record<string, string>>) {
        warningItems.push({
          name: item.name || 'Unknown',
          displayName: item.displayName || item.name || 'Unknown',
          warning: item.warning || ''
        })
      }
    }
  }
  
  // Determine if event has expandable details
  const hasExpandableDetails = 
    errorMessages.length > 0 || 
    warningMessages.length > 0 || 
    failedItems.length > 0 || 
    warningItems.length > 0

  return {
    errorMessages: errorMessages.length > 0 ? errorMessages : undefined,
    warningMessages: warningMessages.length > 0 ? warningMessages : undefined,
    failedItems: failedItems.length > 0 ? failedItems : undefined,
    warningItems: warningItems.length > 0 ? warningItems : undefined,
    hasExpandableDetails
  }
}

// Determine if two events should be bundled together
function shouldBundleTogether(event1: FleetEvent, event2: FleetEvent): boolean {
  // Same device is required (already checked in caller)

  // Never bundle warning or error events — each run's warning/error is distinct and must be visible
  if (event1.kind === 'error' || event1.kind === 'warning' ||
      event2.kind === 'error' || event2.kind === 'warning') {
    return false
  }

  // Bundle success/info/system events together (routine data collection events)
  const dataCollectionTypes = new Set(['success', 'info', 'system'])
  if (dataCollectionTypes.has(event1.kind) && dataCollectionTypes.has(event2.kind)) {
    return true
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
    return message.includes('data reported') || 
           message.includes('module reported data') || 
           message.includes('modules reported data')
  })

  if (moduleEvents.length === events.length) {
    // All events are module data collection - use the actual event message if there's only one,
    // or if all events share the same message
    if (events.length === 1 && events[0].message) {
      return events[0].message
    }
    const uniqueMessages = [...new Set(events.map(e => e.message).filter(Boolean))]
    if (uniqueMessages.length === 1 && uniqueMessages[0]) {
      return uniqueMessages[0]
    }

    // Multiple different messages — create a smart summary
    const moduleNames = new Set<string>()
    
    events.forEach(event => {
      const payloadObj = event.payload as any
      
      // Try to extract module names from payload first (most reliable)
      if (Array.isArray(payloadObj?.modules_processed)) {
        payloadObj.modules_processed.forEach((mod: string) => moduleNames.add(mod))
      } else if (Array.isArray(payloadObj?.metadata?.enabledModules)) {
        payloadObj.metadata.enabledModules.forEach((mod: string) => moduleNames.add(mod))
      } else {
        // Fallback to extracting from message
        const message = event.message || formatPayloadPreview(event.payload)
        const matches = message.match(/^(\w+)(?:,\s*(\w+))?(?:,\s*(\w+))?\s+data reported$/i)
        if (matches) {
          for (let i = 1; i <= 3; i++) {
            if (matches[i]) moduleNames.add(matches[i])
          }
        } else {
          // Try pattern: "Hardware module reported data"
          const singleMatch = message.match(/^(\w+)\s+(?:module\s+)?(?:reported|data)/i)
          if (singleMatch) {
            moduleNames.add(singleMatch[1])
          }
        }
      }
    })
    
    const moduleArray = Array.from(moduleNames).map(mod => 
      mod.charAt(0).toUpperCase() + mod.slice(1)
    )
    
    if (moduleArray.length === 1) {
      return `${moduleArray[0]} data reported`
    } else if (moduleArray.length <= 3) {
      return `${moduleArray.join(', ')} data reported`
    } else {
      return `${moduleArray.length} modules data reported`
    }
  }

  // For mixed event types, try to extract module info even if not pure data collection
  const moduleNames = new Set<string>()
  events.forEach(event => {
    const payloadObj = event.payload as any
    if (Array.isArray(payloadObj?.modules_processed)) {
      payloadObj.modules_processed.forEach((mod: string) => moduleNames.add(mod))
    } else if (Array.isArray(payloadObj?.metadata?.enabledModules)) {
      payloadObj.metadata.enabledModules.forEach((mod: string) => moduleNames.add(mod))
    }
    // Detect Installs module by its characteristic payload keys
    if (payloadObj?.full_installs_data || payloadObj?.module_status || payloadObj?.session_id) {
      moduleNames.add('installs')
    }
  })
  
  // If we found module names, use them even for mixed events
  if (moduleNames.size > 0) {
    const moduleArray = Array.from(moduleNames).map(mod => 
      mod.charAt(0).toUpperCase() + mod.slice(1)
    )
    if (moduleArray.length === 1) {
      return `${moduleArray[0]} data reported`
    } else if (moduleArray.length <= 3) {
      return `${moduleArray.join(', ')} data reported`
    } else {
      return `${moduleArray.length} modules data reported`
    }
  }
  
  // For mixed event types without module info, create a summary
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
    // Check if modules_processed is an array (new format from Windows client)
    if (Array.isArray(payloadObj.modules_processed) && payloadObj.modules_processed.length > 0) {
      const modules = payloadObj.modules_processed as string[]
      const capitalizedModules = modules.map(module => 
        module.charAt(0).toUpperCase() + module.slice(1)
      )
      
      if (modules.length === 1) {
        return `${capitalizedModules[0]} data reported`
      } else {
        return `${capitalizedModules.join(', ')} data reported`
      }
    }
    
    // Handle legacy format where modules_processed is a number
    if (payloadObj.modules_processed && typeof payloadObj.modules_processed === 'number') {
      const moduleCount = payloadObj.modules_processed
      const enabledModules = payloadObj.enabled_modules
      
      if (Array.isArray(enabledModules) && enabledModules.length > 0) {
        if (moduleCount === 1) {
          const capitalizedModule = enabledModules[0].charAt(0).toUpperCase() + enabledModules[0].slice(1)
          return `${capitalizedModule} data reported`
        } else if (moduleCount <= 3) {
          const capitalizedModules = enabledModules.slice(0, moduleCount).map(module => 
            module.charAt(0).toUpperCase() + module.slice(1)
          )
          return `${capitalizedModules.join(', ')} data reported`
        } else {
          return `All ${moduleCount} modules data reported`
        }
      }
      
      return `${moduleCount} modules data reported`
    }
    
    // Also check metadata.enabledModules (Windows client format)
    if (payloadObj.metadata?.enabledModules && Array.isArray(payloadObj.metadata.enabledModules)) {
      const modules = payloadObj.metadata.enabledModules as string[]
      const capitalizedModules = modules.map(module => 
        module.charAt(0).toUpperCase() + module.slice(1)
      )
      
      if (modules.length === 1) {
        return `${capitalizedModules[0]} data reported`
      } else {
        return `${capitalizedModules.join(', ')} data reported`
      }
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
    
    // **PRIORITY 8: Handle Cimian/installs events (full_installs_data, session_id, run_type patterns)**
    if (keys.includes('full_installs_data') || keys.includes('module_status')) {
      // This is an Installs module event
      return 'Installs data reported'
    }
    if (keys.includes('session_id') || keys.includes('run_type') || keys.includes('runType')) {
      // Also check if this looks like an installs event with session data
      if (keys.includes('success_count') || keys.includes('error_count') || keys.includes('warning_count')) {
        return 'Installs data reported'
      }
      const runType = payloadObj.run_type || payloadObj.runType
      if (runType) {
        const runTypeStr = String(runType).charAt(0).toUpperCase() + String(runType).slice(1).toLowerCase()
        return `${runTypeStr} software update check`
      }
      return 'Software update activity'
    }
    
    // **PRIORITY 9: Handle device/collection events**
    if (keys.includes('device_id') || keys.includes('deviceId') || keys.includes('serial_number')) {
      if (keys.includes('collection_type') || keys.includes('collectionType')) {
        return 'Device data collection'
      }
      return 'Device event'
    }
    
    // **PRIORITY 10: Handle client version updates**
    if (keys.includes('client_version') || keys.includes('clientVersion')) {
      const version = payloadObj.client_version || payloadObj.clientVersion
      if (version) {
        return `Client version ${version}`
      }
    }
    
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
    
    // Last resort - show more descriptive message
    if (keys.length <= 3) {
      // Format keys nicely (convert snake_case to Title Case)
      const formattedKeys = keys.map(k => 
        k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      )
      return `Event: ${formattedKeys.join(', ')}`
    } else {
      return `System event (${keys.length} fields)`
    }
    
  } catch (_error) {
    console.error('[EVENT BUNDLING] Failed to generate payload summary:', _error)
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

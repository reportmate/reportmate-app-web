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

  // Never bundle warning, error, or success events — these carry meaningful messages
  // (e.g. "Firefox v134.0 installed", "item has an error!") that must remain visible
  if (event1.kind === 'error' || event1.kind === 'warning' || event1.kind === 'success' ||
      event2.kind === 'error' || event2.kind === 'warning' || event2.kind === 'success') {
    return false
  }

  // Only bundle info/system events together (routine data collection events)
  const dataCollectionTypes = new Set(['info', 'system'])
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

// Create a message for bundled info/system events.
// Since success/warning/error are never bundled, this only handles routine data collection bundles.
function createBundleMessage(events: FleetEvent[], _kinds: string[]): string {
  // If all events share the same message, use it
  const uniqueMessages = [...new Set(events.map(e => e.message).filter(Boolean))]
  if (uniqueMessages.length === 1 && uniqueMessages[0]) {
    return uniqueMessages[0]
  }

  // Extract module names from all bundled events
  const allModules = new Set<string>()
  for (const event of events) {
    const payloadObj = event.payload as any
    if (payloadObj) {
      const names = extractModuleNames(payloadObj)
      names.forEach(n => allModules.add(n))
    }
  }

  if (allModules.size > 0) {
    const capitalized = Array.from(allModules).map(m => m.charAt(0).toUpperCase() + m.slice(1))
    if (capitalized.length <= 3) {
      return `${capitalized.join(', ')} data reported`
    }
    return `${capitalized.length} modules data reported`
  }

  return `${events.length} data collection events`
}

/**
 * Format event payload for preview when event.message is missing.
 * This is a FALLBACK only — the client should always provide a message.
 * Uses a consistent format: "X data reported" for module events.
 */
export function formatPayloadPreview(payload: Record<string, unknown> | string | null | undefined): string {
  try {
    if (!payload) return 'No details'
    
    if (typeof payload === 'string') {
      return payload.length > 120 ? payload.substring(0, 120) + '...' : payload
    }
    
    if (typeof payload !== 'object') {
      return String(payload).substring(0, 80)
    }

    const payloadObj = payload as any

    // 1. Direct message field (client-provided)
    if (payloadObj.message && typeof payloadObj.message === 'string') {
      const message = payloadObj.message
      return message.length > 120 ? message.substring(0, 120) + '...' : message
    }

    // 2. Summary field
    if (payloadObj.summary && typeof payloadObj.summary === 'string') {
      return payloadObj.summary
    }

    // 3. Module list — build consistent "X, Y data reported" message
    const moduleNames = extractModuleNames(payloadObj)
    if (moduleNames.length > 0) {
      const capitalized = moduleNames.map(m => m.charAt(0).toUpperCase() + m.slice(1))
      if (capitalized.length <= 3) {
        return `${capitalized.join(', ')} data reported`
      }
      return `${capitalized.length} modules data reported`
    }

    // 4. Fallback for events with no recognizable structure
    const keys = Object.keys(payloadObj)
    if (keys.length === 0) return 'Event recorded'
    return 'Data reported'
    
  } catch (_error) {
    console.error('[EVENT BUNDLING] Failed to generate payload summary:', _error)
    return 'Event recorded'
  }
}

/**
 * Extract module names from various payload formats.
 */
function extractModuleNames(payloadObj: any): string[] {
  // Array format: modules_processed: ["system", "hardware"]
  if (Array.isArray(payloadObj.modules_processed) && payloadObj.modules_processed.length > 0) {
    return payloadObj.modules_processed
  }
  // Number format: modules_processed: 5, enabled_modules: [...]
  if (typeof payloadObj.modules_processed === 'number' && Array.isArray(payloadObj.enabled_modules)) {
    return payloadObj.enabled_modules
  }
  // Windows metadata format
  if (Array.isArray(payloadObj.metadata?.enabledModules)) {
    return payloadObj.metadata.enabledModules
  }
  // Legacy: moduleCount + modules array
  if (Array.isArray(payloadObj.modules)) {
    return payloadObj.modules
  }
  // Object keys format: modules: { system: {...}, hardware: {...} }
  if (payloadObj.modules && typeof payloadObj.modules === 'object' && !Array.isArray(payloadObj.modules)) {
    return Object.keys(payloadObj.modules)
  }
  return []
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

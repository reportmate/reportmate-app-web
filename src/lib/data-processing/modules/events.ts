/**
 * Events Module - Reader Only
 * Frontend reads pre-processed events data from device collection
 * NO heavy processing - device should provide clean, standardized data
 */

export interface EventsInfo {
  totalEvents: number
  recentEvents: number
  errorEvents: number
  warningEvents: number
  events: EventItem[]
  lastUpdated?: string
}

export interface EventItem {
  id: string
  ts: string
  kind: string
  device: string
  payload: any
  summary?: string
}

/**
 * Extract events information from device modules and events array
 * READER ONLY: Expects device to provide pre-processed, clean data
 */
export function extractEvents(deviceModules: any, eventsArray?: any[]): EventsInfo {
  // Events are typically provided separately, not in modules
  const events = eventsArray || []
  
  console.log('[EVENTS MODULE] Processing events data:', {
    eventsCount: events.length,
    hasEventsArray: !!eventsArray,
    sampleEvent: events[0] ? JSON.stringify(events[0]).substring(0, 200) : 'No events'
  })

  // Process and categorize events
  const processedEvents: EventItem[] = events.map((event: any, index: number) => ({
    id: event.id || `event-${index}`,
    ts: event.ts || event.timestamp || event.created_at || new Date().toISOString(),
    kind: event.kind || event.type || 'info',
    device: event.device || 'unknown',
    payload: event.payload || {},
    summary: event.summary || event.message
  }))

  // Categorize events
  const errorEvents = processedEvents.filter(e => e.kind === 'error').length
  const warningEvents = processedEvents.filter(e => e.kind === 'warning').length
  
  // Recent events (last 24 hours)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const recentEvents = processedEvents.filter(e => new Date(e.ts) > oneDayAgo).length

  return {
    totalEvents: processedEvents.length,
    recentEvents,
    errorEvents,
    warningEvents,
    events: processedEvents,
    lastUpdated: new Date().toISOString()
  }
}

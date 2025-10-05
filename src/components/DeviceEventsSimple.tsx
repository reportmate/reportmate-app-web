import React, { useState } from 'react';
import { normalizeEventKind, severityToBadgeClasses } from '../lib/events/normalize';
import { CopyButton } from './ui/CopyButton';

interface EventDto {
  id: string;
  name: string;
  message?: string; // User-friendly message from the database
  raw: Record<string, unknown> | string;
  kind?: string;
  ts?: string;
}

// Type for payload objects that might have various properties
interface PayloadObject extends Record<string, unknown> {
  summary?: string;
  message?: string;
  moduleCount?: number;
  modules?: string[] | Record<string, unknown>;
  modules_processed?: number;
  component?: string;
  moduleType?: string;
  clientVersion?: string;
}

// Helper function to get event type styling
const getEventTypeConfig = (kind?: string) => {
  const severity = normalizeEventKind(kind || '')
  const badgeClass = severityToBadgeClasses(severity)
  
  // Get dot color based on severity
  let dotColor = 'bg-gray-500'
  switch (severity) {
    case 'success': dotColor = 'bg-green-500'; break
    case 'warning': dotColor = 'bg-yellow-500'; break
    case 'error': dotColor = 'bg-red-500'; break
    case 'info': dotColor = 'bg-blue-500'; break
  }
  
  return { bg: badgeClass, dot: dotColor }
}

// Helper function to format timestamp
const formatTimestamp = (ts?: string): string => {
  if (!ts) return 'No timestamp'
  
  try {
    const date = new Date(ts)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInSeconds = Math.floor(diffInMs / 1000)
    const diffInMinutes = Math.floor(diffInSeconds / 60)
    const diffInHours = Math.floor(diffInMinutes / 60)
    
    if (diffInSeconds < 60) {
      return 'just now'
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  } catch {
    return 'Invalid timestamp'
  }
}

export default function DeviceEvents({ events }: { events: EventDto[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedEventId, setCopiedEventId] = useState<string | null>(null);
  const [fullPayloads, setFullPayloads] = useState<Record<string, unknown>>({});
  const [loadingPayloads, setLoadingPayloads] = useState<Set<string>>(new Set());
  const eventsPerPage = 10;

  // Valid event categories - filter out everything else
  const VALID_EVENT_KINDS = ['info', 'error', 'warning', 'success'];
  
  // Filter events to only include valid categories
  const filteredEvents = events.filter(event => 
    !event.kind || VALID_EVENT_KINDS.includes(event.kind.toLowerCase())
  );

  // Calculate pagination
  const totalPages = Math.ceil(filteredEvents.length / eventsPerPage);
  const startIndex = (currentPage - 1) * eventsPerPage;
  const endIndex = startIndex + eventsPerPage;
  const currentEvents = filteredEvents.slice(startIndex, endIndex);

  // Helper function to format JSON for display with NO truncation
  const formatPayload = (raw: Record<string, unknown> | string): string => {
    if (typeof raw === 'string') {
      return raw;
    }
    
    try {
      return JSON.stringify(raw, null, 2);
    } catch {
      return `Error formatting payload: ${String(raw)}`;
    }
  };

  // Function to fetch full payload lazily from dedicated endpoint
  const fetchFullPayload = async (eventId: string) => {
    if (fullPayloads[eventId] || loadingPayloads.has(eventId)) {
      return // Already loaded or loading
    }

    // Ensure eventId is a string
    const eventIdStr = String(eventId)
    setLoadingPayloads(prev => new Set(prev).add(eventIdStr))
    
    try {
      console.log(`[DEVICE EVENTS SIMPLE] Fetching full payload for event: ${eventIdStr}`)
      
      // For bundled events, we need to handle them differently
      if (eventIdStr.startsWith('bundle-')) {
        // For bundled events, fetch payloads from all constituent events
        const bundledEvent = events.find(e => e.id === eventIdStr)
        if (bundledEvent && (bundledEvent as any).raw?.bundledEvents) {
          const bundledEventIds = (bundledEvent as any).raw.bundledEvents
          console.log(`[DEVICE EVENTS SIMPLE] Fetching payloads for ${bundledEventIds.length} bundled events`)
          
          // Fetch payloads for all bundled events in parallel with timeout
          const payloadPromises = bundledEventIds.map(async (realEventId: string) => {
            try {
              // Create timeout promise
              const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Request timeout after 30 seconds')), 30000)
              })
              
              const fetchPromise = fetch(`/api/events/${realEventId}/payload`)
              const response = await Promise.race([fetchPromise, timeoutPromise]) as Response
              
              if (!response.ok) {
                console.error(`[DEVICE EVENTS SIMPLE] Failed to fetch payload for event ${realEventId}: ${response.status}`)
                return { eventId: realEventId, error: `Failed to fetch (${response.status})` }
              }
              const data = await response.json()
              return { eventId: realEventId, payload: data.payload || 'No payload data' }
            } catch (error) {
              console.error(`[DEVICE EVENTS SIMPLE] Error fetching payload for event ${realEventId}:`, error)
              const errorMessage = error instanceof Error ? error.message : 'Unknown error'
              return { eventId: realEventId, error: errorMessage }
            }
          })
          
          const payloadResults = await Promise.all(payloadPromises)
          const bundleInfo = {
            eventIds: bundledEventIds,
            count: (bundledEvent as any).raw?.count || bundledEventIds.length,
            message: bundledEvent.message || (bundledEvent as any).raw?.message,
            payloads: payloadResults,
            isBundle: true
          }
          setFullPayloads(prev => ({
            ...prev,
            [eventIdStr]: bundleInfo
          }))
          return
        }
      }
      
      // For regular events, fetch from API with timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout after 30 seconds')), 30000)
      })
      
      const fetchPromise = fetch(`/api/events/${encodeURIComponent(eventIdStr)}/payload`)
      const response = await Promise.race([fetchPromise, timeoutPromise]) as Response
      
      if (response.ok) {
        const data = await response.json()
        console.log(`[DEVICE EVENTS SIMPLE] Successfully fetched full payload for ${eventIdStr}`)
        
        setFullPayloads(prev => ({
          ...prev,
          [eventIdStr]: data.payload
        }))
      } else {
        console.error(`[DEVICE EVENTS SIMPLE] Failed to fetch payload for ${eventIdStr}:`, response.status)
        const errorMessage = `Unable to load payload (HTTP ${response.status})`
        // Fallback to the existing payload from events list
        const event = events.find(e => e.id === eventIdStr)
        if (event) {
          setFullPayloads(prev => ({
            ...prev,
            [eventIdStr]: (event as any).isBundle ? { 
              message: event.message,
              eventIds: (event as any).raw?.bundledEvents,
              isBundle: true,
              error: errorMessage 
            } : errorMessage
          }))
        } else {
          setFullPayloads(prev => ({
            ...prev,
            [eventIdStr]: errorMessage
          }))
        }
      }
    } catch (error) {
      console.error(`[DEVICE EVENTS SIMPLE] Error fetching payload for ${eventIdStr}:`, error)
      const errorMessage = error instanceof Error ? error.message : 'Error loading payload'
      // Fallback to the existing payload from events list
      const event = events.find(e => e.id === eventIdStr)
      if (event) {
        setFullPayloads(prev => ({
          ...prev,
          [eventIdStr]: (event as any).isBundle ? { 
            message: event.message,
            eventIds: (event as any).raw?.bundledEvents,
            isBundle: true,
            error: errorMessage 
          } : errorMessage
        }))
      } else {
        setFullPayloads(prev => ({
          ...prev,
          [eventIdStr]: errorMessage
        }))
      }
    } finally {
      setLoadingPayloads(prev => {
        const newSet = new Set(prev)
        newSet.delete(eventIdStr)
        return newSet
      })
    }
  }

  const formatFullPayload = (payload: any): string => {
    try {
      if (!payload) return 'No payload'
      if (typeof payload === 'string') return payload
      
      // Handle bundled events with multiple payloads
      if (payload.isBundle && payload.payloads) {
        let result = `Bundle Summary:\n`
        result += `- Event Count: ${payload.count}\n`
        result += `- Message: ${payload.message}\n\n`
        result += `Individual Event Payloads:\n`
        result += `${'='.repeat(50)}\n\n`
        
        payload.payloads.forEach((item: any, index: number) => {
          result += `Event ${index + 1} (ID: ${item.eventId}):\n`
          result += `${'-'.repeat(30)}\n`
          if (item.error) {
            result += `Error: ${item.error}\n`
          } else {
            result += typeof item.payload === 'string' 
              ? item.payload 
              : JSON.stringify(item.payload, null, 2)
          }
          result += `\n\n`
        })
        
        return result
      }
      
      return JSON.stringify(payload, null, 2)
    } catch (error) {
      return 'Error formatting payload: ' + String(payload)
    }
  }

  // Helper function to extract message from event data - using simplified logic
  const getEventMessage = (ev: EventDto): string => {
    try {
      // **PRIORITY 1: Use the message field from EventDto if available**
      if (ev.message && typeof ev.message === 'string') {
        return ev.message.length > 100 ? ev.message.substring(0, 100) + '...' : ev.message;
      }

      const payload = ev.raw
      
      if (!payload) return 'No payload'
      
      // Handle string payloads
      if (typeof payload === 'string') {
        return payload.length > 100 ? payload.substring(0, 100) + '...' : payload
      }
      
      // Handle object payloads - only as fallback when message field is not available
      if (typeof payload === 'object') {
        const payloadObj = payload as PayloadObject;
        
        // Handle summarized payloads
        if (payloadObj.summary) {
          return payloadObj.summary
        }
        
        // Handle message-based payloads
        if (payloadObj.message) {
          return payloadObj.message
        }
        
        // Handle module count payloads
        if (payloadObj.moduleCount && payloadObj.modules) {
          const moduleCount = payloadObj.moduleCount
          const modules = payloadObj.modules
          
          // Handle array of module names
          if (Array.isArray(modules)) {
            if (moduleCount === 1) {
              return `Module ${modules[0].charAt(0).toUpperCase() + modules[0].slice(1)} data reported`
            } else if (moduleCount <= 3) {
              const capitalizedModules = modules.map((module: string) => 
                module.charAt(0).toUpperCase() + module.slice(1)
              )
              return `Modules ${capitalizedModules.join(', ')} data reported`
            } else {
              return `All modules data reported`
            }
          }
        }
        
        // Handle full device reports (contains multiple modules)
        if (payloadObj.modules && typeof payloadObj.modules === 'object' && !Array.isArray(payloadObj.modules)) {
          const modules = payloadObj.modules as Record<string, unknown>;
          const moduleCount = Object.keys(modules).length
          const moduleNames = Object.keys(modules).slice(0, 3)
          
          if (moduleCount > 3) {
            return `All modules data reported`
          } else {
            const capitalizedModules = moduleNames.map(module => 
              module.charAt(0).toUpperCase() + module.slice(1)
            )
            return `Modules ${capitalizedModules.join(', ')} data reported`
          }
        }
        
        // Handle new structure with modules_processed (array format from Windows client)
        if (Array.isArray(payloadObj.modules_processed) && payloadObj.modules_processed.length > 0) {
          const modules = payloadObj.modules_processed as string[]
          const capitalizedModules = modules.map(mod => 
            mod.charAt(0).toUpperCase() + mod.slice(1)
          )
          
          if (modules.length === 1) {
            return `${capitalizedModules[0]} data reported`
          } else {
            return `${capitalizedModules.join(', ')} data reported`
          }
        }
        
        // Also check metadata.enabledModules (Windows client format)
        const metadata = payloadObj.metadata as any
        if (metadata?.enabledModules && Array.isArray(metadata.enabledModules)) {
          const modules = metadata.enabledModules as string[]
          const capitalizedModules = modules.map(mod => 
            mod.charAt(0).toUpperCase() + mod.slice(1)
          )
          
          if (modules.length === 1) {
            return `${capitalizedModules[0]} data reported`
          } else {
            return `${capitalizedModules.join(', ')} data reported`
          }
        }
        
        // Legacy format with modules_processed as number
        if (payloadObj.modules_processed && typeof payloadObj.modules_processed === 'number') {
          const modulesProcessed = payloadObj.modules_processed
          if (modulesProcessed === 1) {
            return `Single module data reported`
          } else if (modulesProcessed <= 3) {
            return `${modulesProcessed} modules data reported`
          } else {
            return `All modules data reported`
          }
        }
        
        // Handle common event types
        if (payloadObj.component || payloadObj.moduleType || payloadObj.clientVersion) {
          const parts = []
          if (payloadObj.message) parts.push(payloadObj.message)
          
          const summary = parts.join(' • ')
          return summary.length > 100 ? summary.substring(0, 100) + '...' : summary || 'System event'
        }
        
        // Fallback for complex objects
        const keys = Object.keys(payload)
        if (keys.length === 0) return 'Empty payload'
        if (keys.length > 5) {
          return `Complex data (${keys.length} properties)`
        }
        
        try {
          const stringified = JSON.stringify(payload)
          if (stringified.length > 150) {
            return `Data collection completed`
          }
          return stringified.substring(0, 150)
        } catch {
          return 'Complex data object'
        }
      }
      
      return String(payload).substring(0, 100)
    } catch {
      return 'System event'
    }
  }

  return (
    <div className="space-y-4 w-full max-w-full overflow-hidden">
      {filteredEvents.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Valid Events</h3>
          <p className="text-gray-600 dark:text-gray-400">No events of valid types (system, info, error, warning, success) found.</p>
        </div>
      ) : (
        <>
          {/* Pagination Controls - Top */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredEvents.length)} of {filteredEvents.length} events
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {currentEvents.map(ev => (
            <article key={ev.id} className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 w-full max-w-full overflow-hidden min-w-0">
              <header className="flex justify-between items-center gap-4 min-w-0">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Event Type Pill */}
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getEventTypeConfig(ev.kind).bg} flex-shrink-0`}>
                    {normalizeEventKind(ev.kind || '')}
                  </span>
                  
                  {/* Event ID Badge */}
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-mono flex-shrink-0">
                    #{ev.id}
                  </span>
                  
                  {/* Event Message - Hidden on mobile (sm and below) */}
                  <span className="font-medium text-gray-900 dark:text-white truncate flex-1 min-w-0 hidden md:block">
                    {getEventMessage(ev)}
                  </span>
                  
                  {/* Timestamp */}
                  <span className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">
                    {formatTimestamp(ev.ts)}
                  </span>
                </div>
                
                <button 
                  onClick={() => {
                    const isOpening = expanded !== ev.id;
                    setExpanded(e => (e === ev.id ? null : ev.id));
                    
                    // Auto-fetch full payload when opening, just like the main events page
                    if (isOpening) {
                      fetchFullPayload(ev.id);
                    }
                  }}
                  className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors flex-shrink-0"
                  aria-expanded={expanded === ev.id}
                  aria-controls={`payload-${ev.id}`}
                >
                  {expanded === ev.id ? 'Hide' : 'Show'} Payload
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={expanded === ev.id ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                  </svg>
                </button>
              </header>

              {expanded === ev.id && (
                <div 
                  id={`payload-${ev.id}`}
                  className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                        {fullPayloads[ev.id] ? 'Full Raw Payload' : 'Raw Payload (from events list)'}
                      </h4>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-mono">
                        #{ev.id}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CopyButton 
                        value={formatFullPayload(fullPayloads[ev.id] || ev.raw)}
                        size="md"
                      />
                    </div>
                  </div>
                  <div className="relative bg-gray-900 dark:bg-gray-950 rounded-lg border border-gray-700 overflow-hidden">
                    {loadingPayloads.has(ev.id) ? (
                      <div className="flex items-center justify-center py-8 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Loading full payload...
                        </div>
                      </div>
                    ) : (
                      <pre className="overflow-x-auto overflow-y-auto max-h-96 overlay-scrollbar p-4 text-sm text-gray-100 whitespace-pre-wrap w-full min-w-0" style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}>
                        <code className="block whitespace-pre-wrap break-all" style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}>
                          {formatFullPayload(fullPayloads[ev.id] || ev.raw)}
                        </code>
                      </pre>
                    )}
                  </div>
                </div>
              )}
            </article>
          ))}

          {/* Pagination Controls - Bottom */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
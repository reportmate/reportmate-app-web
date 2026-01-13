import React, { useState } from 'react';
import { CopyButton } from './ui/CopyButton';

interface EventDto {
  id: string;
  name: string;
  message?: string; // User-friendly message from the database
  raw: Record<string, unknown> | string;
  kind?: string;
  ts?: string;
  device?: string;
}

interface DeviceEventsProps {
  events: EventDto[];
}

export default function DeviceEvents({ events }: DeviceEventsProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [fullPayloads, setFullPayloads] = useState<Record<string, unknown>>({});
  const [loadingPayloads, setLoadingPayloads] = useState<Set<string>>(new Set());

  const toggleExpanded = (eventId: string) => {
    const isOpening = expanded !== eventId;
    setExpanded(current => current === eventId ? null : eventId);
    
    // Auto-fetch full payload when opening, just like the main events page
    if (isOpening) {
      fetchFullPayload(eventId);
    }
  };

  // Function to fetch full payload lazily from dedicated endpoint
  const fetchFullPayload = async (eventId: string) => {
    if (fullPayloads[eventId] || loadingPayloads.has(eventId)) {
      return // Already loaded or loading
    }

    setLoadingPayloads(prev => new Set(prev).add(eventId))
    
    try {
      const response = await fetch(`/api/events/${encodeURIComponent(eventId)}/payload`)
      
      if (response.ok) {
        const data = await response.json()
        
        setFullPayloads(prev => ({
          ...prev,
          [eventId]: data.payload
        }))
      } else {
        console.error(`[DEVICE EVENTS] Failed to fetch payload for ${eventId}:`, response.status)
        // Fallback to the existing payload from events list
        const event = events.find(e => e.id === eventId)
        if (event) {
          setFullPayloads(prev => ({
            ...prev,
            [eventId]: event.raw
          }))
        }
      }
    } catch (error) {
      console.error(`[DEVICE EVENTS] Error fetching payload for ${eventId}:`, error)
      // Fallback to the existing payload from events list
      const event = events.find(e => e.id === eventId)
      if (event) {
        setFullPayloads(prev => ({
          ...prev,
          [eventId]: event.raw
        }))
      }
    } finally {
      setLoadingPayloads(prev => {
        const newSet = new Set(prev)
        newSet.delete(eventId)
        return newSet
      })
    }
  }

  // Helper function to format full payload for display
  const formatFullPayload = (payload: any): string => {
    try {
      if (!payload) return 'No payload'
      if (typeof payload === 'string') return payload
      return JSON.stringify(payload, null, 2)
    } catch (_error) {
      console.error('[DEVICE EVENTS] Failed to format payload for display:', _error)
      return 'Error formatting payload: ' + String(payload)
    }
  }

  const getEventKindBadge = (kind?: string) => {
    if (!kind) return null;
    
    const kindLower = kind.toLowerCase();
    let badgeClasses = 'inline-flex items-center px-2 py-1 rounded text-xs font-medium ';
    
    switch (kindLower) {
      case 'error':
        badgeClasses += 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
        break;
      case 'warning':
        badgeClasses += 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
        break;
      case 'success':
        badgeClasses += 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
        break;
      case 'info':
        badgeClasses += 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
        break;
      default:
        badgeClasses += 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
    
    return (
      <span className={badgeClasses}>
        {kind}
      </span>
    );
  };

  const formatTimestamp = (ts?: string) => {
    if (!ts) return null;
    try {
      // Use our consistent YYYY-MM-DD HH:MM:ss format
      const date = new Date(ts)
      if (isNaN(date.getTime())) {
        return ts;
      }
      
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      const seconds = String(date.getSeconds()).padStart(2, '0')
      
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
    } catch {
      return ts;
    }
  };

  return (
    <div className="space-y-4">
      {events.map(ev => (
        <article key={ev.id} className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="p-4">
            <header className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="font-medium text-gray-900 dark:text-white truncate">
                  {ev.name}
                </span>
                {ev.kind && getEventKindBadge(ev.kind)}
                {ev.ts && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {formatTimestamp(ev.ts)}
                  </span>
                )}
              </div>
              
              <button
                onClick={() => toggleExpanded(ev.id)}
                className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                aria-expanded={expanded === ev.id}
                aria-controls={`payload-${ev.id}`}
              >
                {expanded === ev.id ? 'Hide Payload' : 'Show Payload'}
                {expanded === ev.id ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>
            </header>

            {/* Accordion Content */}
            {expanded === ev.id && (
              <div
                id={`payload-${ev.id}`}
                className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                    {fullPayloads[ev.id] ? 'Full Raw Payload' : 'Raw Payload (from events list)'}
                  </h4>
                  <div className="flex items-center gap-2">
                    <CopyButton 
                      value={formatFullPayload(fullPayloads[ev.id] || ev.raw)}
                      size="md"
                    />
                  </div>
                </div>
                <div className="relative">
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
                    <pre className="max-w-full overflow-x-auto rounded-lg bg-gray-900 dark:bg-gray-950 p-4 text-sm text-gray-100 border border-gray-700">
                      <code className="whitespace-pre-wrap break-all">
                        {formatFullPayload(fullPayloads[ev.id] || ev.raw)}
                      </code>
                    </pre>
                  )}
                </div>
              </div>
            )}
          </div>
        </article>
      ))}
      
      {events.length === 0 && (
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-600 dark:text-gray-400">No events found</p>
        </div>
      )}
    </div>
  );
}

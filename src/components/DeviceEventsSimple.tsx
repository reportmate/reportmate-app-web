import React, { useState } from 'react';

interface EventDto {
  id: string;
  name: string;
  raw: Record<string, unknown> | string;
  kind?: string;
  ts?: string;
}

// Helper function to get event type styling
const getEventTypeConfig = (kind?: string) => {
  switch (kind?.toLowerCase()) {
    case 'error': 
      return { bg: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', dot: 'bg-red-500' }
    case 'warning': 
      return { bg: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', dot: 'bg-yellow-500' }
    case 'success': 
      return { bg: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', dot: 'bg-green-500' }
    case 'info': 
      return { bg: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', dot: 'bg-blue-500' }
    case 'system': 
      return { bg: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200', dot: 'bg-purple-500' }
    default: 
      return { bg: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200', dot: 'bg-gray-500' }
  }
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
  } catch (error) {
    return 'Invalid timestamp'
  }
}

export default function DeviceEvents({ events }: { events: EventDto[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedEventId, setCopiedEventId] = useState<string | null>(null);
  const eventsPerPage = 10;

  // Calculate pagination
  const totalPages = Math.ceil(events.length / eventsPerPage);
  const startIndex = (currentPage - 1) * eventsPerPage;
  const endIndex = startIndex + eventsPerPage;
  const currentEvents = events.slice(startIndex, endIndex);

  // Helper function to format JSON for display with NO truncation
  const formatPayload = (raw: Record<string, unknown> | string): string => {
    if (typeof raw === 'string') {
      return raw;
    }
    
    try {
      return JSON.stringify(raw, null, 2);
    } catch (error) {
      return `Error formatting payload: ${String(raw)}`;
    }
  };

  // Helper function to extract message from event data
  const getEventMessage = (ev: EventDto): string => {
    // Try to extract message from raw payload
    if (typeof ev.raw === 'object' && ev.raw !== null) {
      const payload = ev.raw as Record<string, unknown>;
      if (payload.message && typeof payload.message === 'string') {
        return payload.message;
      }
      if (payload.description && typeof payload.description === 'string') {
        return payload.description;
      }
      if (payload.summary && typeof payload.summary === 'string') {
        return payload.summary;
      }
    }
    
    // If raw is a string, show a preview of it
    if (typeof ev.raw === 'string') {
      return ev.raw.substring(0, 100) + (ev.raw.length > 100 ? '...' : '');
    }
    
    // For complex objects, show a meaningful summary
    if (typeof ev.raw === 'object' && ev.raw !== null) {
      const payload = ev.raw as Record<string, unknown>;
      const keys = Object.keys(payload);
      
      if (keys.length > 0) {
        try {
          const stringified = JSON.stringify(payload);
          return `Data (${stringified.length} chars): ${keys.slice(0, 3).join(', ')}`;
        } catch (error) {
          return `Complex data: ${keys.slice(0, 3).join(', ')}`;
        }
      }
    }
    
    // Fallback to event name
    return ev.name || 'No message';
  };

  // Helper function to copy payload to clipboard
  const copyToClipboard = async (text: string, eventId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedEventId(eventId);
      // Reset the copied state after 2 seconds
      setTimeout(() => setCopiedEventId(null), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedEventId(eventId);
      setTimeout(() => setCopiedEventId(null), 2000);
    }
  };

  return (
    <div className="space-y-4 w-full max-w-full overflow-hidden">
      {/* Pagination Controls - Top */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Showing {startIndex + 1} to {Math.min(endIndex, events.length)} of {events.length} events
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
                {ev.kind || 'unknown'}
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
              onClick={() => setExpanded(e => (e === ev.id ? null : ev.id))}
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
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                  Raw Payload
                </h4>
                <button
                  onClick={() => copyToClipboard(formatPayload(ev.raw), ev.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  title="Copy payload to clipboard"
                >
                  {copiedEventId === ev.id ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy
                    </>
                  )}
                </button>
              </div>
              <div className="relative bg-gray-900 dark:bg-gray-950 rounded-lg border border-gray-700 overflow-hidden">
                <pre className="overflow-x-auto overflow-y-auto max-h-96 p-4 text-sm text-gray-100 whitespace-pre-wrap w-full min-w-0" style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}>
                  <code className="block whitespace-pre-wrap break-all" style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}>
                    {formatPayload(ev.raw)}
                  </code>
                </pre>
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
    </div>
  );
}

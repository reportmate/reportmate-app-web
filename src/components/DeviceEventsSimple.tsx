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

  // Helper function to format JSON for display with proper constraints
  const formatPayload = (raw: Record<string, unknown> | string): string => {
    if (typeof raw === 'string') {
      // If it's already a string, limit its length
      if (raw.length > 3000) {
        return raw.substring(0, 3000) + '\n... (truncated - original length: ' + raw.length + ' characters)';
      }
      return raw;
    }
    
    try {
      const stringified = JSON.stringify(raw, null, 2);
      
      // For very large objects, truncate before formatting
      if (stringified.length > 5000) {
        const truncated = stringified.substring(0, 5000);
        return truncated + '\n... (truncated - original length: ' + stringified.length + ' characters)';
      }
      
      return stringified;
    } catch (error) {
      return `Error formatting payload: ${String(raw).substring(0, 500)}...`;
    }
  };

  return (
    <div className="space-y-4 w-full max-w-full overflow-hidden">
      {events.map(ev => (
        <article key={ev.id} className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 w-full max-w-full overflow-hidden min-w-0">
          <header className="flex justify-between items-center gap-4 min-w-0">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Event Type Pill */}
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getEventTypeConfig(ev.kind).bg} flex-shrink-0`}>
                {ev.kind || 'unknown'}
              </span>
              
              {/* Event Name */}
              <span className="font-medium text-gray-900 dark:text-white truncate flex-1 min-w-0">
                {ev.name}
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
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Raw Payload
              </h4>
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
    </div>
  );
}

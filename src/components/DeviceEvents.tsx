import React, { useState } from 'react';

interface EventDto {
  id: string;
  name: string;
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

  const toggleExpanded = (eventId: string) => {
    setExpanded(current => current === eventId ? null : eventId);
  };

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
                Payload
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
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Raw Payload
                </h4>
                <div className="relative">
                  <pre className="max-w-full overflow-x-auto rounded-lg bg-gray-900 dark:bg-gray-950 p-4 text-sm text-gray-100 border border-gray-700">
                    <code className="whitespace-pre-wrap break-all">
                      {typeof ev.raw === 'string' 
                        ? ev.raw 
                        : JSON.stringify(ev.raw, null, 2)
                      }
                    </code>
                  </pre>
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

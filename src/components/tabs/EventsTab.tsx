/**
 * Events Tab Component
 * Device activity and event history with intelligent event bundling
 */

import React, { useMemo, useState } from 'react'
import DeviceEventsSimple from '../DeviceEventsSimple'
import { bundleEvents, type FleetEvent } from '../../lib/eventBundling'
import { CheckCircle2, XCircle, AlertTriangle, Info, Server } from 'lucide-react'

const VALID_EVENT_KINDS: ReadonlyArray<string> = ['info', 'error', 'warning', 'success', 'system']

// Event type filter configuration
const EVENT_FILTERS = [
  { key: 'success', label: 'Success', icon: CheckCircle2, color: 'green' },
  { key: 'warning', label: 'Warnings', icon: AlertTriangle, color: 'yellow' },
  { key: 'error', label: 'Errors', icon: XCircle, color: 'red' },
  { key: 'info', label: 'Info', icon: Info, color: 'blue' },
  { key: 'system', label: 'System', icon: Server, color: 'purple' },
] as const

// Get styling for filter buttons
function getFilterStyles(key: string, isActive: boolean) {
  const baseColors: Record<string, { active: string; inactive: string }> = {
    success: {
      active: 'bg-green-700 text-white border-green-800 shadow-md dark:bg-green-600 dark:border-green-700',
      inactive: 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200 hover:border-green-300 dark:bg-green-900/40 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900/60'
    },
    warning: {
      active: 'bg-yellow-600 text-white border-yellow-700 shadow-md dark:bg-yellow-500 dark:border-yellow-600',
      inactive: 'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200 hover:border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-400 dark:border-yellow-800 dark:hover:bg-yellow-900/60'
    },
    error: {
      active: 'bg-red-700 text-white border-red-800 shadow-md dark:bg-red-600 dark:border-red-700',
      inactive: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200 hover:border-red-300 dark:bg-red-900/40 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/60'
    },
    info: {
      active: 'bg-blue-700 text-white border-blue-800 shadow-md dark:bg-blue-600 dark:border-blue-700',
      inactive: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200 hover:border-blue-300 dark:bg-blue-900/40 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900/60'
    },
    system: {
      active: 'bg-purple-700 text-white border-purple-800 shadow-md dark:bg-purple-600 dark:border-purple-700',
      inactive: 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200 hover:border-purple-300 dark:bg-purple-900/40 dark:text-purple-400 dark:border-purple-800 dark:hover:bg-purple-900/60'
    },
  }
  return baseColors[key]?.[isActive ? 'active' : 'inactive'] || baseColors.info.inactive
}

interface EventData {
  id?: string;
  name?: string;
  kind?: string;
  ts?: string;
  raw?: unknown;
  [key: string]: unknown;
}

interface DeviceWithProcesses {
  processes?: unknown[];
  services?: unknown[];
  [key: string]: unknown;
}

interface EventsTabProps {
  device: DeviceWithProcesses
  events: EventData[]
  data?: Record<string, unknown>
}

export const EventsTab: React.FC<EventsTabProps> = ({ events, data }) => {
  // Filter state - 'all' shows everything, otherwise filter by kind
  const [filterType, setFilterType] = useState<string>('all')
  
  // Filter events to only include valid categories
  const validEvents = useMemo(() => {
    // Check various sources for events (prop, data prop, wrapper objects)
    let rawEvents = events || (data as any)?.events || data || []
    
    // Handle case where rawEvents might be an object wrapping the array
    if (!Array.isArray(rawEvents) && rawEvents && typeof rawEvents === 'object') {
       if (Array.isArray((rawEvents as any).events)) {
         rawEvents = (rawEvents as any).events
       } else if (Array.isArray((rawEvents as any).items)) {
         rawEvents = (rawEvents as any).items
       } else {
         // Fallback: convert object values to array if it looks like a map, or just empty
         rawEvents = []
       }
    }

    if (!Array.isArray(rawEvents)) return []

    return rawEvents.filter((event: any) => 
      event && 
      (event.kind || event.type) && 
      VALID_EVENT_KINDS.includes((event.kind || event.type).toLowerCase())
    )
  }, [events, data])
  
  // Apply intelligent event bundling
  const bundledEvents = useMemo(() => {
    if (!validEvents.length) return []
    
    // Convert to FleetEvent format
    const fleetEvents: FleetEvent[] = validEvents.map(event => ({
      id: event.id || `event-${Math.random()}`,
      device: 'current-device',
      kind: event.kind || 'info',
      ts: event.ts || new Date().toISOString(),
      message: (event as Record<string, unknown>).message as string | undefined,
      payload: (event.raw as Record<string, unknown>) || {}
    }))
    
    return bundleEvents(fleetEvents)
  }, [validEvents])
  
  // Apply filter to bundled events
  const filteredEvents = useMemo(() => {
    if (filterType === 'all') return bundledEvents
    return bundledEvents.filter(event => 
      event.kind.toLowerCase() === filterType.toLowerCase() ||
      event.bundledKinds.some(k => k.toLowerCase() === filterType.toLowerCase())
    )
  }, [bundledEvents, filterType])
  
  // Count events by kind for filter badges
  const eventCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    bundledEvents.forEach(event => {
      const kind = event.kind.toLowerCase()
      counts[kind] = (counts[kind] || 0) + 1
    })
    return counts
  }, [bundledEvents])

  if (!bundledEvents || bundledEvents.length === 0) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-900 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reporting Events</h1>
            <p className="text-base text-gray-600 dark:text-gray-400">Device activity and event monitoring</p>
          </div>
        </div>

        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Events</h3>
          <p className="text-gray-600 dark:text-gray-400">No events have been recorded for this device yet.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Filter Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-900 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reporting Events</h1>
            <p className="text-base text-gray-600 dark:text-gray-400">
              {filterType === 'all' 
                ? `${bundledEvents.length} total events` 
                : `${filteredEvents.length} ${filterType} events`}
            </p>
          </div>
        </div>
        
        {/* Filter Buttons - Desktop */}
        <div className="hidden sm:flex items-center gap-2">
          {EVENT_FILTERS.map((filter) => {
            const isActive = filterType === filter.key
            const count = eventCounts[filter.key] || 0
            const Icon = filter.icon
            return (
              <button
                key={filter.key}
                onClick={() => setFilterType(isActive ? 'all' : filter.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${getFilterStyles(filter.key, isActive)}`}
              >
                <Icon className="w-4 h-4" />
                <span>{filter.label}</span>
                {count > 0 && (
                  <span className={`ml-1 px-1.5 py-0.5 text-xs font-semibold rounded-full ${isActive ? 'bg-white/30 text-white' : 'bg-white/50 dark:bg-black/20'}`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
          {filterType !== 'all' && (
            <button
              onClick={() => setFilterType('all')}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              Clear
            </button>
          )}
        </div>
        
        {/* Filter Dropdown - Mobile */}
        <div className="sm:hidden">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Events ({bundledEvents.length})</option>
            {EVENT_FILTERS.map((filter) => (
              <option key={filter.key} value={filter.key}>
                {filter.label} ({eventCounts[filter.key] || 0})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Events List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          {filteredEvents.length > 0 ? (
            <DeviceEventsSimple events={filteredEvents.map(event => ({
              id: event.id,
              name: event.message ?? event.kind ?? 'Event',
              message: event.message,
              raw: event.isBundle ? 
                  { 
                    bundledEvents: event.eventIds,
                    count: event.count,
                    message: event.message,
                    isBundle: true 
                  } : 
                  {},
              kind: event.kind,
              ts: event.ts,
              count: event.count,
              isBundle: event.isBundle
            }))} />
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400">
                No {filterType} events found.{' '}
                <button 
                  onClick={() => setFilterType('all')} 
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Show all events
                </button>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Debug Accordion */}
      <div className="mt-6">
        <details className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
          <summary className="cursor-pointer px-4 py-3 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Debug API JSON Data</span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              events (raw)
            </span>
          </summary>
          <div className="border-t border-gray-200 dark:border-gray-700">
            <div className="p-4">
              <div className="flex justify-end gap-2 mb-2">
                <button
                  onClick={() => {
                    const jsonString = JSON.stringify(events, null, 2)
                    navigator.clipboard.writeText(jsonString)
                  }}
                  className="px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Copy JSON
                </button>
              </div>
              <pre className="p-4 bg-gray-900 dark:bg-black text-gray-100 text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-[600px] overflow-y-auto rounded border border-gray-700">
                {JSON.stringify(events, null, 2)}
              </pre>
            </div>
          </div>
        </details>
      </div>
    </div>
  )
}

export default EventsTab

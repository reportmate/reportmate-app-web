"use client"

import React, { memo } from 'react'
import { List } from 'react-window'
import Link from 'next/link'
import { formatRelativeTime } from '../lib/time'

export interface VirtualEvent {
  id: string
  device: string
  deviceName?: string
  kind: string
  ts: string
  message?: string
  payload?: Record<string, unknown>
}

interface VirtualizedEventsListProps {
  events: VirtualEvent[]
  deviceNameMap: Record<string, string>
  height: number
  mounted: boolean
}

// Row height for each event
const ROW_HEIGHT = 56

// Memoized event row for performance
const EventRow = memo(({ 
  event, 
  deviceNameMap,
  mounted,
  style 
}: { 
  event: VirtualEvent
  deviceNameMap: Record<string, string>
  mounted: boolean
  style: React.CSSProperties
}) => {
  const getDeviceName = () => {
    if (event.deviceName && event.deviceName !== event.device) {
      return event.deviceName
    }
    return deviceNameMap[event.device] || event.device
  }

  const getKindBadge = (kind: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      error: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', label: 'Error' },
      warning: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300', label: 'Warning' },
      success: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', label: 'Success' },
      info: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', label: 'Info' },
    }
    const badge = badges[kind] || badges.info
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    )
  }

  return (
    <div 
      style={style}
      className="flex items-center px-4 py-2 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
    >
      {/* Type Badge */}
      <div className="w-20 flex-shrink-0">
        {getKindBadge(event.kind)}
      </div>
      
      {/* Device */}
      <div className="w-48 flex-shrink-0 truncate">
        <Link 
          href={`/device/${event.device}`}
          className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline truncate block"
        >
          {getDeviceName()}
        </Link>
        <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
          {event.device}
        </span>
      </div>
      
      {/* Message */}
      <div className="flex-1 min-w-0 px-4">
        <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
          {event.message || 'No message'}
        </p>
      </div>
      
      {/* Time */}
      <div className="w-32 flex-shrink-0 text-right">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {mounted ? formatRelativeTime(event.ts) : '—'}
        </span>
      </div>
    </div>
  )
})

EventRow.displayName = 'EventRow'

/**
 * Virtualized Events List
 * Uses react-window to efficiently render large lists of events
 * Only renders visible rows + overscan for smooth scrolling
 */
export function VirtualizedEventsList({ 
  events, 
  deviceNameMap, 
  height,
  mounted
}: VirtualizedEventsListProps) {
  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        No events to display
      </div>
    )
  }

  return (
    <List
      rowCount={events.length}
      rowHeight={ROW_HEIGHT}
      overscanCount={5}
      rowProps={{}}
      rowComponent={({ index, style }) => {
        const event = events[index]
        return (
          <EventRow 
            event={event || { id: '', device: '', kind: 'info', ts: new Date().toISOString() }} 
            deviceNameMap={deviceNameMap}
            mounted={mounted}
            style={style}
          />
        )
      }}
      style={{ height, width: '100%' }}
      className="scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600"
    />
  )
}

/**
 * Hook to determine if virtualization should be used
 * Returns true if events exceed threshold
 */
export function useVirtualization(eventCount: number, threshold: number = 100): boolean {
  return eventCount > threshold
}

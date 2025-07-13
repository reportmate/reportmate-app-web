/**
 * Events Tab Component
 * Device activity and event history
 */

import React from 'react'
import DeviceEventsSimple from '../DeviceEventsSimple'

interface EventsTabProps {
  device: any
  events: any[]
  data?: any
}

export const EventsTab: React.FC<EventsTabProps> = ({ device, events, data }) => {
  const getEventStatusConfig = (kind: string) => {
    switch (kind.toLowerCase()) {
      case 'success':
        return { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-800 dark:text-green-200', icon: '✓' }
      case 'warning':
        return { bg: 'bg-yellow-100 dark:bg-yellow-900', text: 'text-yellow-800 dark:text-yellow-200', icon: '⚠' }
      case 'error':
        return { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-800 dark:text-red-200', icon: '✗' }
      case 'info':
        return { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-800 dark:text-blue-200', icon: 'ℹ' }
      case 'system':
        return { bg: 'bg-gray-100 dark:bg-gray-900', text: 'text-gray-800 dark:text-gray-200', icon: '⚙' }
      default:
        return { bg: 'bg-gray-100 dark:bg-gray-900', text: 'text-gray-800 dark:text-gray-200', icon: '•' }
    }
  }

  if (!events || events.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Events</h3>
        <p className="text-gray-600 dark:text-gray-400">No events have been recorded for this device yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Events List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Events</h3>
        </div>
        <div className="p-6">
          <DeviceEventsSimple events={events.map(event => ({
            id: event.id,
            name: event.kind || 'Event', // Use event kind as fallback name
            raw: event.payload,
            kind: event.kind,
            ts: event.ts
          }))} />
        </div>
      </div>
    </div>
  )
}

export default EventsTab

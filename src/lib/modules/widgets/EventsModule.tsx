/**
 * Events Module
 * Modular widgets for displaying device events and activity logs
 */

import React from 'react'
import { formatRelativeTime } from '../../time'
import { ExtendedModuleManifest, DeviceWidget, WidgetCondition, DeviceWidgetProps } from '../EnhancedModule'

interface FleetEvent {
  id: string
  device: string
  kind: string
  ts: string
  payload: Record<string, unknown>
}

interface EventsData {
  events?: FleetEvent[]
}

// Helper function to get event status configuration
const getEventStatusConfig = (kind: string) => {
  switch (kind.toLowerCase()) {
    case 'error': 
      return { bg: 'bg-red-500', text: 'text-red-700 dark:text-red-300', badge: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' }
    case 'warning': 
      return { bg: 'bg-yellow-500', text: 'text-yellow-700 dark:text-yellow-300', badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' }
    case 'success': 
      return { bg: 'bg-green-500', text: 'text-green-700 dark:text-green-300', badge: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' }
    case 'info': 
      return { bg: 'bg-blue-500', text: 'text-blue-700 dark:text-blue-300', badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' }
    case 'system': 
      return { bg: 'bg-purple-500', text: 'text-purple-700 dark:text-purple-300', badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' }
    default: 
      return { bg: 'bg-gray-500', text: 'text-gray-700 dark:text-gray-300', badge: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' }
  }
}

// Events Overview Widget
const EventsOverviewWidget: React.FC<DeviceWidgetProps> = ({ device }) => {
  const events = device?.events || []
  const recentEvents = events.slice(0, 5)
  
  // Event statistics
  const eventStats = events.reduce((acc: Record<string, number>, event: FleetEvent) => {
    const kind = event.kind.toLowerCase()
    acc[kind] = (acc[kind] || 0) + 1
    return acc
  }, {})

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Events Overview</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Recent device activity</p>
          </div>
        </div>
      </div>
      <div className="p-6">
        {events.length > 0 ? (
          <div className="space-y-4">
            {/* Event Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{events.length}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Events</div>
              </div>
              {Object.entries(eventStats).slice(0, 3).map(([kind, count]) => {
                const config = getEventStatusConfig(kind)
                return (
                  <div key={kind} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${config.bg}`}></div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">{String(count)}</div>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 capitalize">{kind}</div>
                  </div>
                )
              })}
            </div>

            {/* Recent Events List */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Recent Events</h4>
              <div className="space-y-2">
                {recentEvents.map((event: FleetEvent) => {
                  const statusConfig = getEventStatusConfig(event.kind)
                  return (
                    <div key={event.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-900">
                      <div className={`w-2 h-2 rounded-full ${statusConfig.bg}`}></div>
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${statusConfig.badge}`}>
                        {event.kind}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400 flex-1 truncate">
                        {formatRelativeTime(event.ts)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-600 dark:text-gray-400">No recent events</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Events List Widget
const EventsListWidget: React.FC<DeviceWidgetProps> = ({ device }) => {
  const events = device?.events || []

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Event History</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">Complete list of device events</p>
      </div>
      {events.length > 0 ? (
        <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-96 overflow-y-auto">
          {events.map((event: FleetEvent) => {
            const statusConfig = getEventStatusConfig(event.kind)
            return (
              <div key={event.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <div className="flex items-start gap-4">
                  <div className={`w-3 h-3 rounded-full mt-2 ${statusConfig.bg}`}></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.badge}`}>
                          {event.kind}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {formatRelativeTime(event.ts)}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                        {event.id}
                      </span>
                    </div>
                    <div className="text-sm text-gray-900 dark:text-white mb-2">
                      Device: {event.device}
                    </div>
                    {event.payload && Object.keys(event.payload).length > 0 && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded p-2 font-mono">
                        <pre className="whitespace-pre-wrap text-xs">
                          {JSON.stringify(event.payload, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Events</h3>
          <p className="text-gray-600 dark:text-gray-400">No events have been recorded for this device yet.</p>
        </div>
      )}
    </div>
  )
}

// Events Timeline Widget
const EventsTimelineWidget: React.FC<DeviceWidgetProps> = ({ device }) => {
  const events = device?.events || []
  const recentEvents = events.slice(0, 10)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Events Timeline</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">Chronological event timeline</p>
      </div>
      <div className="p-6">
        {recentEvents.length > 0 ? (
          <div className="space-y-4">
            {recentEvents.map((event: FleetEvent, index: number) => {
              const statusConfig = getEventStatusConfig(event.kind)
              const isLast = index === recentEvents.length - 1
              
              return (
                <div key={event.id} className="relative">
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <div className={`w-4 h-4 rounded-full ${statusConfig.bg} border-2 border-white dark:border-gray-800`}></div>
                      {!isLast && (
                        <div className="absolute top-4 left-2 w-0.5 h-8 bg-gray-200 dark:bg-gray-700"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${statusConfig.badge}`}>
                          {event.kind}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatRelativeTime(event.ts)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-900 dark:text-white">
                        Event ID: {event.id}
                      </div>
                      {event.payload && Object.keys(event.payload).some(key => event.payload[key]) && (
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {Object.keys(event.payload).length} payload field{Object.keys(event.payload).length !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-600 dark:text-gray-400">No events to display</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Module definition
const EventsModule = {
  manifest: {
    id: 'events',
    name: 'Events',
    version: '1.0.0',
    author: 'ReportMate',
    description: 'Event tracking and activity monitoring widgets'
  } as ExtendedModuleManifest,

  deviceWidgets: [
    {
      id: 'events-overview',
      name: 'Events Overview',
      description: 'Summary of recent events and statistics',
      component: EventsOverviewWidget,
      category: 'overview' as const,
      size: 'large' as const,
      conditions: [
        { type: 'has_data', field: 'events', operator: 'exists', value: true }
      ] as WidgetCondition[]
    },
    {
      id: 'events-list',
      name: 'Events List',
      description: 'Complete list of device events',
      component: EventsListWidget,
      category: 'custom' as const,
      size: 'full' as const,
      conditions: [
        { type: 'has_data', field: 'events', operator: 'exists', value: true }
      ] as WidgetCondition[]
    },
    {
      id: 'events-timeline',
      name: 'Events Timeline',
      description: 'Chronological timeline of events',
      component: EventsTimelineWidget,
      category: 'custom' as const,
      size: 'medium' as const,
      conditions: [
        { type: 'has_data', field: 'events', operator: 'exists', value: true }
      ] as WidgetCondition[]
    }
  ] as DeviceWidget[]
}

export default EventsModule

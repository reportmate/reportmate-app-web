/**
 * Events Module
 * Core module for displaying and managing events
 */

import React from 'react'
import { BaseModule } from '../BaseModule'
import { ModuleManifest } from '../ModuleRegistry'
import { formatRelativeTime } from '../../time'

// Events Tab Component
const EventsTab: React.FC<{ deviceId: string }> = ({ deviceId }) => {
  const [events, setEvents] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/events')
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.events) {
            // Filter events for this device
            const deviceEvents = data.events.filter((event: any) => event.device === deviceId)
            setEvents(deviceEvents)
          }
        }
      } catch (error) {
        console.error('Failed to fetch events:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [deviceId])

  const getEventIcon = (kind: string) => {
    switch (kind.toLowerCase()) {
      case 'success':
        return (
          <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )
      case 'warning':
        return (
          <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-yellow-600 dark:text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
        )
      case 'error':
        return (
          <div className="w-8 h-8 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
        )
      case 'info':
      case 'system':
      default:
        return (
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
        )
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading events...</div>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">No events found for this device</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Recent Events ({events.length})
          </h3>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {events.map((event, index) => (
            <div key={event.id || index} className="px-6 py-4">
              <div className="flex items-start space-x-3">
                {getEventIcon(event.kind)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {event.payload?.message || 'Event'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatRelativeTime(event.ts)}
                    </p>
                  </div>
                  <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      event.kind === 'success' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : event.kind === 'warning'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        : event.kind === 'error'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    }`}>
                      {event.kind}
                    </span>
                  </div>
                  {event.payload && Object.keys(event.payload).length > 1 && (
                    <div className="mt-2">
                      <details className="text-sm">
                        <summary className="cursor-pointer text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                          View Details
                        </summary>
                        <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-900 rounded border">
                          <pre className="text-xs text-gray-600 dark:text-gray-300 overflow-x-auto">
                            {JSON.stringify(event.payload, null, 2)}
                          </pre>
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Recent Events Widget for Dashboard
const RecentEventsWidget: React.FC = () => {
  const [events, setEvents] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/events')
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.events) {
            // Take the 5 most recent events
            setEvents(data.events.slice(0, 5))
          }
        }
      } catch (error) {
        console.error('Failed to fetch events:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [])

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
        Recent Events
      </h3>
      
      {events.length === 0 ? (
        <div className="text-gray-500 dark:text-gray-400 text-sm">No recent events</div>
      ) : (
        <div className="space-y-3">
          {events.map((event, index) => (
            <div key={event.id || index} className="flex items-center space-x-3">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                event.kind === 'success' 
                  ? 'bg-green-500'
                  : event.kind === 'warning'
                  ? 'bg-yellow-500'
                  : event.kind === 'error'
                  ? 'bg-red-500'
                  : 'bg-blue-500'
              }`}></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
                  {event.payload?.message || 'Event'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatRelativeTime(event.ts)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Event Stats Widget for Dashboard
const EventStatsWidget: React.FC = () => {
  const [stats, setStats] = React.useState<any>(null)

  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/events')
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.events) {
            const events = data.events
            const now = new Date()
            const last24h = events.filter((e: any) => {
              const eventTime = new Date(e.ts)
              return (now.getTime() - eventTime.getTime()) < (24 * 60 * 60 * 1000)
            })
            
            const stats = {
              total: events.length,
              last24h: last24h.length,
              success: events.filter((e: any) => e.kind === 'success').length,
              warnings: events.filter((e: any) => e.kind === 'warning').length,
              errors: events.filter((e: any) => e.kind === 'error').length,
            }
            setStats(stats)
          }
        }
      } catch (error) {
        console.error('Failed to fetch event stats:', error)
      }
    }

    fetchStats()
  }, [])

  if (!stats) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
        Event Statistics
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Total</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.last24h}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Last 24h</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.success}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Success</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.warnings}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Warnings</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.errors}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Errors</div>
        </div>
      </div>
    </div>
  )
}

export class EventsModule extends BaseModule {
  readonly manifest: ModuleManifest = {
    id: 'events',
    name: 'Events',
    version: '1.0.0',
    description: 'Core module for displaying and managing events',
    author: 'ReportMate Team',
    enabled: true,
    
    dashboardWidgets: [
      {
        id: 'recent-events',
        name: 'Recent Events',
        component: RecentEventsWidget,
        size: 'medium',
        order: 3,
      },
      {
        id: 'event-stats',
        name: 'Event Statistics',
        component: EventStatsWidget,
        size: 'medium',
        order: 4,
      },
    ],
    
    deviceTabs: [
      {
        id: 'events',
        name: 'Events',
        icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
        component: EventsTab,
        order: 10,
      },
    ],
  }

  async onLoad(): Promise<void> {
    this.log('info', 'Events module loaded')
  }
}

export default EventsModule

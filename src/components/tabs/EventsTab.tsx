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

  // Process running on the system that could generate events
  const processes = device?.processes || []
  const services = device?.services || []
  
  // Event statistics
  const eventsByKind = events?.reduce((acc: any, event: any) => {
    const kind = event.kind || 'unknown'
    acc[kind] = (acc[kind] || 0) + 1
    return acc
  }, {}) || {}
  
  const recentEvents = events?.slice(0, 10) || []
  const systemProcesses = processes.filter((p: any) => 
    p.name?.toLowerCase().includes('system') ||
    p.name?.toLowerCase().includes('svchost') ||
    p.name?.toLowerCase().includes('winlogon') ||
    p.name?.toLowerCase().includes('csrss')
  ).length

  if (!events || events.length === 0) {
    return (
      <div className="space-y-8">
        {/* Event Statistics - even when no events */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">0</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Events</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{processes.length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Running Processes</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{services.filter((s: any) => s.status === 'RUNNING').length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Active Services</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{systemProcesses}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">System Processes</div>
          </div>
        </div>
        
        {/* System Activity - show running processes when no events */}
        {processes.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Current System Activity</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active processes that may generate events</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Process</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">PID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Memory</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {processes.slice(0, 10).map((process: any, index: number) => (
                    <tr key={process.pid || index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{process.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 font-mono truncate max-w-xs">
                          {process.cmdline}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-white">
                        {process.pid}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {process.resident_size ? `${Math.round(process.resident_size / 1024 / 1024)} MB` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          process.state === 'R' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                        }`}>
                          {process.state === 'R' ? 'Running' : process.state || 'Unknown'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

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
    <div className="space-y-8">
      {/* Event Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{events.length}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Events</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{eventsByKind.success || 0}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Success Events</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{eventsByKind.error || 0}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Error Events</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{eventsByKind.warning || 0}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Warning Events</div>
        </div>
      </div>

      {/* Event Types Breakdown */}
      {Object.keys(eventsByKind).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Event Types</h3>
          <div className="space-y-3">
            {Object.entries(eventsByKind).map(([kind, count]: [string, any]) => {
              const config = getEventStatusConfig(kind)
              return (
                <div key={kind} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${config.bg} ${config.text} text-sm font-medium`}>
                      {config.icon}
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">{kind}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Events List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Events</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Latest device activity and events</p>
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

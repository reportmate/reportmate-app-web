/**
 * Recent Events Table
 * Displays live event feed with real-time updates and intelligent event bundling
 */

import React, { useState, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import { formatRelativeTime } from '../../time'
import { bundleEvents, formatPayloadPreview, type FleetEvent, type BundledEvent } from '../../eventBundling'
import { SlidersHorizontal } from 'lucide-react'

interface RecentEventsTableProps {
  events: FleetEvent[]
  connectionStatus: string
  lastUpdateTime: Date | null
  mounted: boolean
  deviceNameMap: Record<string, string>
  isLoading?: boolean
  loadingProgress?: { current: number, total: number }
  loadingMessage?: string
}

// Event type filter configuration (Info last — hidden by default)
const EVENT_FILTERS = [
  { key: 'success', label: 'Success' },
  { key: 'warning', label: 'Warnings' },
  { key: 'error', label: 'Errors' },
  { key: 'system', label: 'System' },
  { key: 'info', label: 'Info' },
] as const

// Inline SVG icons matching /events page style
const getFilterIcon = (key: string) => {
  switch (key) {
    case 'success':
      return (
        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      )
    case 'warning':
      return (
        <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      )
    case 'error':
      return (
        <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      )
    case 'system':
      return (
        <svg className="w-4 h-4 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
        </svg>
      )
    case 'info':
      return (
        <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      )
    default:
      return null
  }
}

// Helper function to detect module type from event
const getEventModuleId = (event: BundledEvent): string | null => {
  // Check if the event payload contains module_id
  if (event.payload && typeof event.payload === 'object') {
    const moduleId = (event.payload as any).module_id
    if (moduleId && typeof moduleId === 'string') {
      return moduleId
    }
  }
  
  // Fallback: try to detect module from message content
  const message = event.message?.toLowerCase() || ''
  
  // Common module patterns in messages
  if (message.includes('install') || message.includes('package') || message.includes('cimian')) {
    return 'installs'
  }
  if (message.includes('hardware') || message.includes('cpu') || message.includes('memory') || message.includes('disk')) {
    return 'hardware'
  }
  if (message.includes('network') || message.includes('wifi') || message.includes('ethernet') || message.includes('ip')) {
    return 'network'
  }
  if (message.includes('profile') || message.includes('policy') || message.includes('configuration')) {
    return 'management'  // Profiles merged into Management
  }
  if (message.includes('security') || message.includes('antivirus') || message.includes('firewall') || message.includes('tpm')) {
    return 'security'
  }
  if (message.includes('system') || message.includes('os') || message.includes('operating system')) {
    return 'system'
  }
  if (message.includes('application') || message.includes('software') || message.includes('app')) {
    return 'applications'
  }
  if (message.includes('management') || message.includes('mdm') || message.includes('enrollment')) {
    return 'management'
  }
  
  return null
}

// Helper function to check if event is from a specific module (backward compatibility)
const isInstallsEvent = (event: BundledEvent) => {
  return getEventModuleId(event) === 'installs'
}

// Helper function to get device display name
const getDeviceName = (event: FleetEvent, deviceNameMap: Record<string, string>) => {
  // First priority: Use deviceName from enhanced events API
  if (event.deviceName && event.deviceName !== event.device && event.deviceName.toLowerCase() !== 'unknown') {
    return event.deviceName
  }
  
  // Second priority: Use device name map (legacy)
  const deviceId = event.device
  if (deviceNameMap[deviceId]) {
    return deviceNameMap[deviceId]
  }
  
  // Check if deviceId looks like a serial number pattern and try to find a friendly name
  // Serial numbers are usually short alphanumeric strings
  if (deviceId && deviceId.length < 50 && !deviceId.includes('-')) {
    // Look through the map to see if this serial has a mapped name
    const mappedName = Object.entries(deviceNameMap).find(([key, value]) => 
      key === deviceId || key.includes(deviceId)
    )?.[1]
    if (mappedName) {
      return mappedName
    }
  }
  
  // Check if deviceId is a UUID format and try to find corresponding name
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (uuidPattern.test(deviceId)) {
    // Look for any mapped name that corresponds to this UUID
    const correspondingName = Object.values(deviceNameMap).find(name => name && name !== deviceId)
    if (correspondingName) {
      return correspondingName
    }
  }
  
  // If deviceId looks like an asset tag (short, alphanumeric), show it nicely
  if (deviceId && deviceId.length <= 10 && /^[A-Z0-9]+$/i.test(deviceId)) {
    return deviceId // Return the serial number directly (e.g., "N2YLJFHWRT")
  }
  
  // Final fallback - return the deviceId (serial number) directly
  // If it's a UUID, just show it - better than "Unknown"
  if (deviceId && deviceId.length > 0) {
    return deviceId
  }
  
  return 'Unknown Device'
}

// Helper function to get event status icon
const getStatusIcon = (kind: string) => {
  switch (kind.toLowerCase()) {
    case 'success':
      return (
        <div className="w-6 h-6 bg-green-400 rounded-full flex items-center justify-center" title="Success">
          <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )
    case 'warning':
      return (
        <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center" title="Warning">
          <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM11 14a1 1 0 11-2 0 1 1 0 012 0zm-1-4a1 1 0 011 1v2a1 1 0 11-2 0v-2a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
        </div>
      )
    case 'error':
      return (
        <div className="w-6 h-6 bg-red-400 rounded-full flex items-center justify-center" title="Error">
          <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
      )
    case 'info':
      return (
        <div className="w-6 h-6 bg-blue-400 rounded-full flex items-center justify-center" title="Info">
          <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </div>
      )
    case 'system':
      return (
        <div className="w-6 h-6 bg-purple-400 rounded-full flex items-center justify-center" title="System">
          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
      )
    default:
      return (
        <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center" title="Unknown">
          <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
        </div>
      )
  }
}

export const RecentEventsTable: React.FC<RecentEventsTableProps> = ({ 
  events, 
  connectionStatus, 
  lastUpdateTime, 
  mounted, 
  deviceNameMap,
  isLoading = false,
  loadingProgress = { current: 0, total: 0 },
  loadingMessage = ''
}) => {
  const [isHovered, setIsHovered] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  // Info hidden by default (too noisy) — treated as the "no filter" baseline
  const DEFAULT_HIDDEN = useMemo(() => new Set(['info']), [])
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set(['info']))
  // Only show filter as active when user has deviated from the default state
  const isFilterCustomized = hiddenTypes.size !== DEFAULT_HIDDEN.size ||
    [...hiddenTypes].some(t => !DEFAULT_HIDDEN.has(t))
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)
  // TODO: Accordion functionality disabled for now - will revisit later
  // const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  // Bundle related events intelligently
  const bundledEvents = useMemo(() => bundleEvents(events), [events])
  
  // Filter bundled events based on hidden types
  const filteredEvents = useMemo(() => {
    if (hiddenTypes.size === 0) return bundledEvents
    return bundledEvents.filter(event => !hiddenTypes.has(event.kind.toLowerCase()))
  }, [bundledEvents, hiddenTypes])

  // Toggle a filter type on/off
  const toggleFilter = (key: string) => {
    setHiddenTypes(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }
  
  // TODO: Accordion toggle disabled for now - will revisit later
  // const toggleExpanded = (eventId: string) => {
  //   setExpandedEvents(prev => {
  //     const next = new Set(prev)
  //     if (next.has(eventId)) {
  //       next.delete(eventId)
  //     } else {
  //       next.add(eventId)
  //     }
  //     return next
  //   })
  // }

  const handleMouseEnter = () => {
    setIsHovered(true)
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    // Set 1-second delay for tooltip
    timeoutRef.current = setTimeout(() => {
      setShowTooltip(true)
    }, 1000)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    setShowTooltip(false)
    // Clear timeout if user leaves before tooltip shows
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }

  // Close filter dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false)
      }
    }
    if (filterOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [filterOpen])

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  // Enhanced connection status with tooltips
  const getConnectionStatusWithTooltip = (connectionStatus: string) => {
    switch (connectionStatus) {
      case 'connected':
        return { 
          text: 'Live', 
          color: 'text-green-600 dark:text-green-400', 
          dot: 'bg-green-500',
          show: true,
          tooltip: 'Real-time connection is active and working'
        }
      case 'polling':
        return { 
          text: 'Polling', 
          color: 'text-blue-600 dark:text-blue-400', 
          dot: 'bg-blue-500',
          show: true,
          tooltip: 'HTTP polling /api/events every 10 seconds'
        }
      case 'connecting':
      case 'reconnecting':
        // Don't show "Connecting" pill since top of page already has one
        return { 
          text: 'Connecting', 
          color: 'text-yellow-600 dark:text-yellow-400', 
          dot: 'bg-yellow-500',
          show: false,
          tooltip: 'Real-time connection handshake in progress'
        }
      case 'error':
      case 'disconnected':
      default:
        return { 
          text: 'Offline', 
          color: 'text-red-600 dark:text-red-400', 
          dot: 'bg-red-500',
          show: true,
          tooltip: 'Connection failed, events may be delayed'
        }
    }
  }

  const status = getConnectionStatusWithTooltip(connectionStatus)

  const _getEventIcon = (kind: string) => {
    switch (kind.toLowerCase()) {
      case 'error':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        )
      case 'warning':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        )
      case 'success':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )
      default:
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        )
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden h-[620px] flex flex-col">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0 block">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/events" className="hover:opacity-80 transition-opacity">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Recent Events
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Live activity from fleet
              </p>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            {/* Filter dropdown */}
            <div className="relative" ref={filterRef}>
              <button
                onClick={() => setFilterOpen(!filterOpen)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  isFilterCustomized
                    ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'
                    : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600'
                } hover:bg-gray-200 dark:hover:bg-gray-600`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filter
                {isFilterCustomized && (
                  <span className="ml-0.5 px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200">
                    {5 - hiddenTypes.size}
                  </span>
                )}
              </button>
              {filterOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 py-1">
                  {EVENT_FILTERS.map((filter) => {
                    const isActive = !hiddenTypes.has(filter.key)
                    return (
                      <button
                        key={filter.key}
                        onClick={() => toggleFilter(filter.key)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          isActive
                            ? 'bg-blue-600 border-blue-600 dark:bg-blue-500 dark:border-blue-500'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {isActive && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        {getFilterIcon(filter.key)}
                        <span className="text-gray-700 dark:text-gray-300">{filter.label}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
            {/* Connection Status */}
            {status.show && (
              <div className="relative">
                <div 
                  className={`flex items-center h-6 rounded-full bg-gray-100 dark:bg-gray-700 transition-all duration-300 ease-in-out ${
                    isHovered ? 'px-3 justify-start' : 'w-6 justify-center'
                  }`}
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                >
                  <div className={`w-2 h-2 rounded-full ${status.dot} shrink-0`}></div>
                  <div className={`transition-all duration-300 ease-in-out ${
                    isHovered ? 'opacity-100 w-auto ml-2' : 'opacity-0 w-0 ml-0'
                  }`}>
                    <span className={`text-sm font-medium ${status.color} whitespace-nowrap`}>
                      {status.text}
                    </span>
                  </div>
                </div>
                
                {/* Custom Tooltip */}
                {showTooltip && (
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white dark:text-gray-100 text-sm font-medium rounded-lg shadow-lg whitespace-nowrap z-50 border border-gray-700 dark:border-gray-600">
                    {status.tooltip}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900 dark:border-b-gray-700"></div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {events.length === 0 && (isLoading || connectionStatus === 'connecting' || connectionStatus === 'reconnecting') ? (
        // Loading skeleton - show table structure with skeleton rows
        <div className="flex-1 overflow-hidden">
          <div className="overflow-x-auto overlay-scrollbar h-full">
            <table className="w-full table-fixed min-w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                <tr>
                  <th className="w-20 px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="w-56 px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Device
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden md:table-cell">
                    Message
                  </th>
                  <th className="w-44 px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Time
                  </th>
                </tr>
              </thead>
            </table>
            <div className="overflow-y-auto overlay-scrollbar" style={{ height: 'calc(100% - 48px)' }}>
              <table className="w-full table-fixed min-w-full">
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {[...Array(10)].map((_, index) => (
                    <tr key={index} className="animate-pulse">
                      <td className="w-20 px-3 py-2.5">
                        <div className="flex items-center justify-center">
                          <div className="h-6 w-6 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                        </div>
                      </td>
                      <td className="w-56 px-3 py-2.5">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                      </td>
                      <td className="px-3 py-2.5 hidden md:table-cell">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
                      </td>
                      <td className="w-44 px-3 py-2.5">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {loadingProgress.total > 0 && (
            <div className="absolute bottom-0 left-0 right-0 px-6 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              <div className="w-full space-y-1.5">
                {/* Progress Bar */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                    style={{ 
                      width: loadingProgress.total > 0
                        ? `${(loadingProgress.current / loadingProgress.total) * 100}%`
                        : '0%'
                    }}
                  ></div>
                </div>
                {/* Progress Text */}
                <div className="flex items-center justify-center text-xs text-gray-600 dark:text-gray-400 space-x-1">
                  <span className="font-medium">{loadingProgress.current} / {loadingProgress.total}</span>
                  <span></span>
                  <span>{Math.round((loadingProgress.current / loadingProgress.total) * 100)}%</span>
                  {loadingMessage && (
                    <>
                      <span></span>
                      <span className="text-blue-600 dark:text-blue-400 font-medium">{loadingMessage}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : events.length === 0 ? (
        // Empty state - only show if truly no events and not loading
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8l-2 2m0 0l-2-2m2 2v6" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No events yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Waiting for fleet activity
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          {/* Bundled events table */}
          <div className="overflow-x-auto overlay-scrollbar h-full">
              <table className="w-full table-fixed min-w-full">
                <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                  <tr>
                    <th className="w-20 px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="w-56 px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Device
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden md:table-cell">
                      Message
                    </th>
                    <th className="w-44 px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Time
                    </th>
                  </tr>
                </thead>
              </table>
              <div className="overflow-y-auto overlay-scrollbar" style={{ height: 'calc(100% - 48px)' }}>
                <table className="w-full table-fixed min-w-full">
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredEvents.map((bundledEvent: BundledEvent) => {
                      // TODO: Accordion expand/collapse functionality disabled for now
                      // const isExpanded = expandedEvents.has(bundledEvent.id)
                      // const hasDetails = bundledEvent.hasExpandableDetails
                      
                      return (
                        <React.Fragment key={bundledEvent.id}>
                          <tr 
                            className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            // TODO: Accordion click disabled for now
                            // onClick={hasDetails ? () => toggleExpanded(bundledEvent.id) : undefined}
                          >
                            <td className="w-20 px-3 py-2.5">
                              <div className="flex items-center justify-center">
                                {/* TODO: Accordion chevron disabled for now - just show status icon */}
                                {getStatusIcon(bundledEvent.kind)}
                              </div>
                            </td>
                            <td className="w-56 px-3 py-2.5">
                              <Link
                                href={`/device/${encodeURIComponent(bundledEvent.device)}${(() => {
                                  const kind = bundledEvent.kind.toLowerCase()
                                  const filterMap: Record<string, string> = {
                                    error: 'error,warning,success',
                                    warning: 'warning,success',
                                    success: 'success',
                                  }
                                  const filter = filterMap[kind]
                                  if (filter) return `?filter=${filter}#installs`
                                  const moduleId = getEventModuleId(bundledEvent)
                                  return moduleId ? `#${moduleId}` : ''
                                })()}`}
                                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors block truncate"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {getDeviceName(bundledEvent, deviceNameMap)}
                              </Link>
                            </td>
                            <td className="px-3 py-2.5 hidden md:table-cell">
                              <div className="text-sm text-gray-900 dark:text-white truncate">
                                {bundledEvent.message}
                                {bundledEvent.isBundle && bundledEvent.bundledKinds.length > 1 && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                    ({bundledEvent.bundledKinds.join(', ')})
                                  </span>
                                )}
                                {/* TODO: Accordion hint disabled for now
                                {hasDetails && !isExpanded && (
                                  <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
                                    (click to expand)
                                  </span>
                                )}
                                */}
                              </div>
                            </td>
                            <td className="w-44 px-3 py-2.5">
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                <div className="font-medium truncate">
                                  {formatRelativeTime(bundledEvent.ts)}
                                </div>
                              </div>
                            </td>
                          </tr>
                          
                          {/* TODO: Accordion expanded detail row disabled for now - will revisit later
                          {isExpanded && hasDetails && (
                            <tr className="bg-gray-50 dark:bg-gray-750">
                              <td colSpan={4} className="px-6 py-4">
                                <div className="space-y-3">
                                  {bundledEvent.errorMessages && bundledEvent.errorMessages.length > 0 && (
                                    <div>
                                      <h4 className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide mb-2">
                                        Errors ({bundledEvent.errorMessages.length})
                                      </h4>
                                      <ul className="space-y-1">
                                        {bundledEvent.errorMessages.map((msg, idx) => (
                                          <li key={idx} className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded font-mono">
                                            {msg}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  
                                  {bundledEvent.warningMessages && bundledEvent.warningMessages.length > 0 && (
                                    <div>
                                      <h4 className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 uppercase tracking-wide mb-2">
                                        Warnings ({bundledEvent.warningMessages.length})
                                      </h4>
                                      <ul className="space-y-1">
                                        {bundledEvent.warningMessages.map((msg, idx) => (
                                          <li key={idx} className="text-sm text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1.5 rounded font-mono">
                                            {msg}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  
                                  {bundledEvent.failedItems && bundledEvent.failedItems.length > 0 && (
                                    <div>
                                      <h4 className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide mb-2">
                                        Failed Items ({bundledEvent.failedItems.length})
                                      </h4>
                                      <div className="space-y-2">
                                        {bundledEvent.failedItems.map((item, idx) => (
                                          <div key={idx} className="bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded border-l-2 border-red-400">
                                            <div className="text-sm font-medium text-red-800 dark:text-red-200">
                                              {item.displayName}
                                            </div>
                                            {item.error && (
                                              <div className="text-xs text-red-600 dark:text-red-400 font-mono mt-1">
                                                {item.error}
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {bundledEvent.warningItems && bundledEvent.warningItems.length > 0 && (
                                    <div>
                                      <h4 className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 uppercase tracking-wide mb-2">
                                        Items with Warnings ({bundledEvent.warningItems.length})
                                      </h4>
                                      <div className="space-y-2">
                                        {bundledEvent.warningItems.map((item, idx) => (
                                          <div key={idx} className="bg-yellow-50 dark:bg-yellow-900/20 px-3 py-2 rounded border-l-2 border-yellow-400">
                                            <div className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                                              {item.displayName}
                                            </div>
                                            {item.warning && (
                                              <div className="text-xs text-yellow-600 dark:text-yellow-400 font-mono mt-1">
                                                {item.warning}
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                          */}
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
        </div>
      )}
    </div>
  )
}

/**
 * Launchd Table Component
 * Displays macOS launchd services (daemons and agents) with filtering
 * Similar to Lingon X functionality
 */

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'

export interface LaunchdItem {
  name: string
  label?: string
  path: string
  enabled?: boolean
  status?: string
  state?: string
  type?: string  // LaunchDaemon, LaunchAgent
  source?: string  // System, User, Apple
  runAtLoad?: boolean
  keepAlive?: boolean
  onDemand?: boolean
  disabled?: boolean
  pid?: number | null
  program?: string
  programArguments?: string[]
  username?: string
  managedByProfile?: boolean  // Managed by MDM Profile
  profileIdentifier?: string  // The profile that manages it
  plistContent?: string  // JSON content of the plist file
}

// Helper to format plist JSON content for display
const formatPlistContent = (content: string | undefined): React.ReactNode => {
  if (!content) return <span className="text-gray-400 italic">No plist content available</span>
  
  try {
    const parsed = JSON.parse(content)
    return (
      <pre className="text-xs font-mono whitespace-pre-wrap break-words text-gray-800 dark:text-gray-200">
        {JSON.stringify(parsed, null, 2)}
      </pre>
    )
  } catch {
    // If not JSON, show as-is
    return (
      <pre className="text-xs font-mono whitespace-pre-wrap break-words text-gray-800 dark:text-gray-200">
        {content}
      </pre>
    )
  }
}

interface LaunchdTableProps {
  launchdItems: LaunchdItem[]
  title?: string
  defaultScope?: 'all' | 'system' | 'user' | 'apple'
}

export const LaunchdTable: React.FC<LaunchdTableProps> = ({ 
  launchdItems = [],
  title = 'Background Activity',
  defaultScope = 'system'  // Default to Third-Party as most relevant
}) => {
  const [search, setSearch] = useState('')
  const [scopeFilter, setScopeFilter] = useState<'all' | 'system' | 'user' | 'apple'>(defaultScope)
  const [typeFilter, setTypeFilter] = useState<'all' | 'daemon' | 'agent'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'running' | 'stopped' | 'disabled'>('all')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Toggle row expansion
  const toggleRow = useCallback((rowKey: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev)
      if (newSet.has(rowKey)) {
        newSet.delete(rowKey)
      } else {
        newSet.add(rowKey)
      }
      return newSet
    })
  }, [])
  
  // Handle scrollbar visibility
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let scrollTimeout: NodeJS.Timeout;
    
    const handleScroll = () => {
      container.classList.add('scrolling');
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        container.classList.remove('scrolling');
      }, 1000);
    };

    const handleMouseEnter = () => {
      container.classList.add('scrolling');
    };

    const handleMouseLeave = () => {
      container.classList.remove('scrolling');
    };

    container.addEventListener('scroll', handleScroll);
    container.addEventListener('mouseenter', handleMouseEnter);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      container.removeEventListener('mouseenter', handleMouseEnter);
      container.removeEventListener('mouseleave', handleMouseLeave);
      clearTimeout(scrollTimeout);
    };
  }, []);

  // Handle dropdown clicks outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Categorize items by source/scope
  const categorizeItem = (item: LaunchdItem): 'system' | 'user' | 'apple' => {
    const source = item.source?.toLowerCase() || ''
    const name = (item.name || item.label || '').toLowerCase()
    const path = (item.path || '').toLowerCase()
    
    // Apple items
    if (source === 'apple' || name.startsWith('com.apple.') || path.includes('/system/')) {
      return 'apple'
    }
    // User items
    if (source === 'user' || path.includes(process.env.HOME || '/users/')) {
      return 'user'
    }
    // System items (third-party in /Library)
    return 'system'
  }

  // Get item type (daemon vs agent)
  const getItemType = (item: LaunchdItem): 'daemon' | 'agent' => {
    const type = item.type?.toLowerCase() || ''
    const path = (item.path || '').toLowerCase()
    
    if (type.includes('agent') || path.includes('launchagents')) {
      return 'agent'
    }
    return 'daemon'
  }

  // Get item status category
  const getItemStatus = (item: LaunchdItem): 'running' | 'stopped' | 'disabled' => {
    const status = item.status?.toLowerCase() || ''
    const isDisabled = item.disabled || status === 'disabled' || status === 'unloaded'
    const isRunning = item.pid != null || status === 'running' || status === 'loaded' || status === 'enabled'
    
    if (isDisabled) return 'disabled'
    if (isRunning) return 'running'
    return 'stopped'
  }

  // Filter items based on search and filters
  const filteredItems = useMemo(() => {
    let filtered = launchdItems
    
    // Search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(item => 
        item.name?.toLowerCase().includes(searchLower) ||
        item.label?.toLowerCase().includes(searchLower) ||
        item.path?.toLowerCase().includes(searchLower) ||
        item.program?.toLowerCase().includes(searchLower) ||
        item.status?.toLowerCase().includes(searchLower)
      )
    }
    
    // Scope filter
    if (scopeFilter !== 'all') {
      filtered = filtered.filter(item => categorizeItem(item) === scopeFilter)
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(item => getItemType(item) === typeFilter)
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => getItemStatus(item) === statusFilter)
    }
    
    return filtered
  }, [launchdItems, search, scopeFilter, typeFilter, statusFilter])

  // Calculate counts for filter badges - based on current scope filter
  const counts = useMemo(() => {
    // Base items for scope counts (all items)
    const systemCount = launchdItems.filter(item => categorizeItem(item) === 'system').length
    const userCount = launchdItems.filter(item => categorizeItem(item) === 'user').length
    const appleCount = launchdItems.filter(item => categorizeItem(item) === 'apple').length
    
    // Items after scope filter (for daemon/agent/status counts)
    const scopeFilteredItems = scopeFilter === 'all' 
      ? launchdItems 
      : launchdItems.filter(item => categorizeItem(item) === scopeFilter)
    
    const daemonCount = scopeFilteredItems.filter(item => getItemType(item) === 'daemon').length
    const agentCount = scopeFilteredItems.filter(item => getItemType(item) === 'agent').length
    
    // Status counts
    const runningCount = scopeFilteredItems.filter(item => getItemStatus(item) === 'running').length
    const stoppedCount = scopeFilteredItems.filter(item => getItemStatus(item) === 'stopped').length
    const disabledCount = scopeFilteredItems.filter(item => getItemStatus(item) === 'disabled').length

    return {
      all: launchdItems.length,
      system: systemCount,
      user: userCount,
      apple: appleCount,
      daemon: daemonCount,
      agent: agentCount,
      running: runningCount,
      stopped: stoppedCount,
      disabled: disabledCount
    }
  }, [launchdItems, scopeFilter])

  // Scope filter options
  const scopeOptions = [
    { value: 'all', label: 'All Sources', count: counts.all },
    { value: 'system', label: 'Third-Party (System)', count: counts.system },
    { value: 'user', label: 'User Level', count: counts.user },
    { value: 'apple', label: 'Apple', count: counts.apple },
  ]

  const currentScope = scopeOptions.find(option => option.value === scopeFilter) || scopeOptions[0]

  // Status badge component
  const StatusBadge: React.FC<{ item: LaunchdItem }> = ({ item }) => {
    const status = item.status?.toLowerCase() || ''
    const isActive = item.pid != null || status === 'running' || status === 'loaded' || status === 'enabled'
    const isDisabled = item.disabled || status === 'disabled' || status === 'unloaded'
    const isManaged = item.managedByProfile
    
    return (
      <div className="flex flex-col gap-1 items-start">
        {isManaged && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 whitespace-nowrap" title={item.profileIdentifier || 'Managed by MDM Profile'}>
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Managed
          </span>
        )}
        {isDisabled ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 whitespace-nowrap">
            Disabled
          </span>
        ) : isActive ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 whitespace-nowrap">
            Running
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 whitespace-nowrap">
            Stopped
          </span>
        )}
      </div>
    )
  }

  // Type badge component
  const TypeBadge: React.FC<{ item: LaunchdItem }> = ({ item }) => {
    const type = getItemType(item)
    const scope = categorizeItem(item)
    
    return (
      <div className="flex gap-1">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
          type === 'daemon' 
            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
            : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
        }`}>
          {type === 'daemon' ? 'Daemon' : 'Agent'}
        </span>
        {scope === 'apple' && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
            Apple
          </span>
        )}
      </div>
    )
  }

  if (!launchdItems.length) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="text-center">
          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Launchd Items</h3>
          <p className="text-gray-600 dark:text-gray-400">No launchd data available for this device.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Scope Filter Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center justify-between w-full sm:w-52 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <span className="flex items-center">
                  <span className="truncate">{currentScope.label}</span>
                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">({currentScope.count})</span>
                </span>
                <svg 
                  className={`ml-2 h-4 w-4 text-gray-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {dropdownOpen && (
                <div className="absolute z-[200] mt-1 w-full sm:w-52 bg-white dark:bg-gray-700 shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                  {scopeOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setScopeFilter(option.value as any);
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center justify-between ${
                        scopeFilter === option.value 
                          ? 'bg-blue-50 dark:bg-blue-900 text-blue-900 dark:text-blue-100' 
                          : 'text-gray-900 dark:text-white'
                      }`}
                    >
                      <span>{option.label}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">({option.count})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Type Filter Buttons */}
            <div className="flex border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden">
              <button
                onClick={() => setTypeFilter(typeFilter === 'daemon' ? 'all' : 'daemon')}
                className={`px-3 py-2 text-sm ${
                  typeFilter === 'daemon'
                    ? 'bg-purple-500 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                Daemons ({counts.daemon})
              </button>
              <button
                onClick={() => setTypeFilter(typeFilter === 'agent' ? 'all' : 'agent')}
                className={`px-3 py-2 text-sm border-l border-gray-300 dark:border-gray-600 ${
                  typeFilter === 'agent'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                Agents ({counts.agent})
              </button>
            </div>

            {/* Status Filter Buttons - matching type filter style */}
            <div className="flex border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden">
              {counts.running > 0 && (
                <button
                  onClick={() => setStatusFilter(statusFilter === 'running' ? 'all' : 'running')}
                  className={`px-3 py-2 text-sm ${
                    statusFilter === 'running'
                      ? 'bg-green-500 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  Running ({counts.running})
                </button>
              )}
              {counts.stopped > 0 && (
                <button
                  onClick={() => setStatusFilter(statusFilter === 'stopped' ? 'all' : 'stopped')}
                  className={`px-3 py-2 text-sm border-l border-gray-300 dark:border-gray-600 ${
                    statusFilter === 'stopped'
                      ? 'bg-yellow-500 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  Stopped ({counts.stopped})
                </button>
              )}
              {counts.disabled > 0 && (
                <button
                  onClick={() => setStatusFilter(statusFilter === 'disabled' ? 'all' : 'disabled')}
                  className={`px-3 py-2 text-sm border-l border-gray-300 dark:border-gray-600 ${
                    statusFilter === 'disabled'
                      ? 'bg-gray-500 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  Disabled ({counts.disabled})
                </button>
              )}
            </div>
            
            {/* Search */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                className="block w-full sm:w-64 pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Search by name or path..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
      
      <div className="overflow-hidden">
        <div 
          ref={scrollContainerRef}
          className="max-h-[600px] overflow-auto overlay-scrollbar"
        >
          <table className="w-full min-w-full table-fixed">
            <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
              <tr>
                <th className="w-8 px-2 py-3"></th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Label / Name</th>
                <th className="w-32 px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                <th className="w-36 px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="w-24 px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Run at Load</th>
                <th className="w-24 px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Keep Alive</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredItems.map((item, index) => {
                const rowKey = `${item.name || item.label}-${index}`
                const isExpanded = expandedRows.has(rowKey)
                const hasPlistContent = Boolean(item.plistContent)
                
                return (
                  <React.Fragment key={rowKey}>
                    <tr 
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${hasPlistContent ? 'cursor-pointer' : ''} ${isExpanded ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                      onClick={() => hasPlistContent && toggleRow(rowKey)}
                    >
                      <td className="px-2 py-3 text-center">
                        {hasPlistContent ? (
                          <svg 
                            className={`w-4 h-4 text-blue-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        ) : (
                          <span className="w-4 h-4 block"></span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {item.label || item.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">
                              {item.path || item.program || ''}
                            </div>
                          </div>
                          {hasPlistContent && (
                            <span className="flex-shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" title="Click to view plist configuration">
                              plist
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <TypeBadge item={item} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge item={item} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.runAtLoad ? (
                          <svg className="w-5 h-5 text-green-500 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-gray-300 dark:text-gray-600 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.keepAlive ? (
                          <svg className="w-5 h-5 text-green-500 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-gray-300 dark:text-gray-600 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        )}
                      </td>
                    </tr>
                    {/* Expanded plist content row */}
                    {isExpanded && hasPlistContent && (
                      <tr className="bg-gray-50 dark:bg-gray-900/50">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                                <svg className="w-4 h-4 text-blue-600 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                                Plist Configuration
                              </h4>
                              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 overflow-auto max-h-[400px]">
                                {formatPlistContent(item.plistContent)}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
          {filteredItems.length === 0 && search && (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No items found matching &quot;{search}&quot;
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default LaunchdTable

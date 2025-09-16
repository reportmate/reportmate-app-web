/**
 * Scheduled Tasks Table Component
 * Displays Windows scheduled tasks with filtering and status information
 */

import React, { useState, useMemo, useRef, useEffect } from 'react'
import { formatExactTime } from '../../lib/time'

export interface ScheduledTask {
  name: string
  path: string
  enabled: boolean
  action: string
  hidden: boolean
  state: string
  lastRunTime?: string
  nextRunTime?: string
  lastRunCode: string
  lastRunMessage: string
  status: string
}

interface ScheduledTasksTableProps {
  scheduledTasks: ScheduledTask[]
}

export const ScheduledTasksTable: React.FC<ScheduledTasksTableProps> = ({ 
  scheduledTasks = [] 
}) => {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
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

  // Filter tasks based on search and status
  const filteredTasks = useMemo(() => {
    let filtered = scheduledTasks
    
    if (search.trim()) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(task => 
        task.name?.toLowerCase().includes(searchLower) ||
        task.path?.toLowerCase().includes(searchLower) ||
        task.action?.toLowerCase().includes(searchLower) ||
        task.state?.toLowerCase().includes(searchLower) ||
        task.status?.toLowerCase().includes(searchLower)
      )
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(task => {
        if (statusFilter === 'enabled') return task.enabled
        if (statusFilter === 'disabled') return !task.enabled
        if (statusFilter === 'running') return task.state?.toLowerCase().includes('running')
        if (statusFilter === 'ready') return task.state?.toLowerCase().includes('ready')
        if (statusFilter === 'error') return task.status?.toLowerCase().includes('error') || task.state?.toLowerCase().includes('error')
        return true
      })
    }
    
    return filtered
  }, [scheduledTasks, search, statusFilter])

  // Filter options with labels and counts
  const filterOptions = useMemo(() => {
    const enabled = scheduledTasks.filter(task => task.enabled).length;
    const disabled = scheduledTasks.filter(task => !task.enabled).length;
    const running = scheduledTasks.filter(task => task.state?.toLowerCase().includes('running')).length;
    const ready = scheduledTasks.filter(task => task.state?.toLowerCase().includes('ready')).length;
    const error = scheduledTasks.filter(task => task.status?.toLowerCase().includes('error') || task.state?.toLowerCase().includes('error')).length;

    return [
      { value: 'all', label: 'All Tasks', count: scheduledTasks.length },
      { value: 'enabled', label: 'Enabled Only', count: enabled },
      { value: 'disabled', label: 'Disabled Only', count: disabled },
      { value: 'running', label: 'Running', count: running },
      { value: 'ready', label: 'Ready', count: ready },
      { value: 'error', label: 'Error', count: error },
    ];
  }, [scheduledTasks]);

  const currentFilter = filterOptions.find(option => option.value === statusFilter) || filterOptions[0];

  // Enabled badge component
  const EnabledBadge: React.FC<{ enabled: boolean }> = ({ enabled }) => {
    if (enabled) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          Enabled
        </span>
      )
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
          Disabled
        </span>
      )
    }
  }

  // Status badge component (for Ready/Running/Error only)
  const StatusBadge: React.FC<{ status: string; enabled: boolean }> = ({ status, enabled }) => {
    // If disabled, don't show a separate status
    if (!enabled) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500">
          —
        </span>
      )
    }

    const statusLower = status?.toLowerCase() || ''
    if (statusLower.includes('running')) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          Running
        </span>
      )
    }
    if (statusLower.includes('ready')) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          Ready
        </span>
      )
    }
    if (statusLower.includes('error') || statusLower.includes('failed')) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
          Error
        </span>
      )
    }
    
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
        {status || 'Unknown'}
      </span>
    )
  }

  if (!scheduledTasks.length) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="text-center">
          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Scheduled Tasks</h3>
          <p className="text-gray-600 dark:text-gray-400">No scheduled tasks data available for this device.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Scheduled Tasks</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Windows scheduled tasks and their execution status ({filteredTasks.length} of {scheduledTasks.length} tasks)
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Custom Filter Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center justify-between w-full sm:w-48 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <span className="flex items-center">
                  <span className="truncate">{currentFilter.label}</span>
                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">({currentFilter.count})</span>
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
                <div className="absolute z-50 mt-1 w-full sm:w-48 bg-white dark:bg-gray-700 shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                  {filterOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setStatusFilter(option.value);
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center justify-between ${
                        statusFilter === option.value 
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
            
            {/* Search */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Search tasks..."
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
          className="max-h-96 overflow-auto overlay-scrollbar"
        >
          <table className="w-full min-w-full table-fixed">
            <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
              <tr>
                <th className="w-1/6 px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Task Name</th>
                <th className="w-2/6 px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action</th>
                <th className="w-16 px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Enabled</th>
                <th className="w-16 px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="w-20 px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Last Run</th>
                <th className="w-20 px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Next Run</th>
                <th className="w-20 px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredTasks.map((task, index) => (
                <tr key={`${task.path}-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {task.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">
                        {task.path}
                      </div>
                      {task.hidden && (
                        <div className="mt-1">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                            Hidden
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded p-2 border border-gray-200 dark:border-gray-600 max-h-20 overflow-y-auto">
                      <code className="text-xs font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-all leading-tight">
                        {task.action || 'No action specified'}
                      </code>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <EnabledBadge enabled={task.enabled} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={task.status || task.state} enabled={task.enabled} />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-900 dark:text-white">
                    {task.lastRunTime ? formatExactTime(task.lastRunTime) : 'Never'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-900 dark:text-white">
                    {task.nextRunTime ? formatExactTime(task.nextRunTime) : 'Not scheduled'}
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <div className="text-xs text-gray-900 dark:text-white">
                        {task.lastRunCode || 'N/A'}
                      </div>
                      {task.lastRunMessage && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-pre-wrap break-words leading-tight" title={task.lastRunMessage}>
                          {task.lastRunMessage}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredTasks.length === 0 && search && (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No scheduled tasks found matching &quot;{search}&quot;
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ScheduledTasksTable

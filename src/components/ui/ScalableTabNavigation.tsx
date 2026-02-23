/**
 * Scalable Tab Navigation Component
 * 
 * Provides multiple layout options for handling large numbers of tabs:
 * 1. Icon-only with hover labels (default)
 * 2. Compact multi-row layout
 * 3. Collapsible groups
 * 4. More dropdown for overflow
 */

import React, { useState } from 'react'

export interface TabItem {
  id: string
  label: string
  icon: string
  description: string
  category?: string
}

export interface ScalableTabNavigationProps {
  tabs: TabItem[]
  activeTab: string
  onTabChange: (tabId: string) => void
  layout?: 'icon-hover' | 'compact-multi-row' | 'grouped' | 'overflow-menu'
  maxVisibleTabs?: number
}

export const ScalableTabNavigation: React.FC<ScalableTabNavigationProps> = ({
  tabs,
  activeTab,
  onTabChange,
  layout = 'icon-hover',
  maxVisibleTabs = 8
}) => {
  const [showOverflow, setShowOverflow] = useState(false)

  // Icon-only with hover labels (current implementation)
  if (layout === 'icon-hover') {
    return (
      <nav className="hidden sm:flex -mb-px space-x-2 md:space-x-4 lg:space-x-6 xl:space-x-8 justify-center">
        {tabs.map((tab) => (
          <div key={tab.id} className="relative group">
            <button
              onClick={() => onTabChange(tab.id)}
              className={`tab-button flex items-center justify-center p-3 border-b-2 font-medium text-sm transition-all duration-200 ease-in-out shrink-0 ${
                activeTab === tab.id
                  ? 'active border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-t-lg'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-700/50 rounded-t-lg'
              }`}
              title={tab.description}
            >
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
              </svg>
              <span className={`tab-label-transition overflow-hidden whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'max-w-32 opacity-100 ml-2' 
                  : 'max-w-0 opacity-0 ml-0 group-hover:max-w-32 group-hover:opacity-100 group-hover:ml-2'
              }`}>
                {tab.label}
              </span>
            </button>
          </div>
        ))}
      </nav>
    )
  }

  // Compact multi-row layout
  if (layout === 'compact-multi-row') {
    return (
      <nav className="hidden sm:block -mb-px">
        <div className="flex flex-wrap justify-center gap-1 md:gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-1 px-2 md:px-3 py-2 border rounded-t-lg font-medium text-xs md:text-sm transition-all duration-200 ${
                activeTab === tab.id
                  ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-400'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:border-gray-500'
              }`}
              title={tab.description}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
              </svg>
              <span className="hidden md:inline whitespace-nowrap">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    )
  }

  // Overflow menu layout (shows first N tabs, rest in dropdown)
  if (layout === 'overflow-menu') {
    const visibleTabs = tabs.slice(0, maxVisibleTabs)
    const overflowTabs = tabs.slice(maxVisibleTabs)
    const activeInOverflow = overflowTabs.some(tab => tab.id === activeTab)

    return (
      <nav className="hidden sm:flex -mb-px space-x-2 md:space-x-4">
        {/* Visible tabs */}
        {visibleTabs.map((tab) => (
          <div key={tab.id} className="relative group">
            <button
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 py-3 px-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
              title={tab.description}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
              </svg>
              <span className="hidden lg:inline">{tab.label}</span>
            </button>
          </div>
        ))}

        {/* Overflow dropdown */}
        {overflowTabs.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowOverflow(!showOverflow)}
              className={`flex items-center gap-2 py-3 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeInOverflow
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
              <span className="hidden lg:inline">More</span>
              <svg className={`w-4 h-4 transition-transform ${showOverflow ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown menu */}
            {showOverflow && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-200">
                {overflowTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      onTabChange(tab.id)
                      setShowOverflow(false)
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg ${
                      activeTab === tab.id
                        ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                    title={tab.description}
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                    </svg>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </nav>
    )
  }

  // Grouped layout (group related tabs together)
  if (layout === 'grouped') {
    const groupedTabs = tabs.reduce((groups, tab) => {
      const category = tab.category || 'General'
      if (!groups[category]) groups[category] = []
      groups[category].push(tab)
      return groups
    }, {} as Record<string, TabItem[]>)

    return (
      <nav className="hidden sm:block -mb-px">
        <div className="flex flex-wrap gap-6 justify-center">
          {Object.entries(groupedTabs).map(([category, categoryTabs]) => (
            <div key={category} className="flex flex-col">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 text-center">
                {category}
              </div>
              <div className="flex gap-1">
                {categoryTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`flex items-center justify-center p-2 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                    title={`${tab.label}: ${tab.description}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>
    )
  }

  return null
}

export default ScalableTabNavigation

"use client"

import { usePlatformFilterSafe, Platform } from '../../providers/PlatformFilterProvider'

interface PlatformToggleProps {
  className?: string
}

/**
 * Global platform toggle component
 * Shows Mac/Windows filter buttons that work across all pages
 */
export function PlatformToggle({ className = '' }: PlatformToggleProps) {
  const { platformFilter, setPlatformFilter } = usePlatformFilterSafe()

  const handleToggle = (platform: Platform) => {
    // If already selected, go back to 'all'
    if (platformFilter === platform) {
      setPlatformFilter('all')
    } else {
      setPlatformFilter(platform)
    }
  }

  return (
    <div className={`inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 ${className}`}>
      {/* macOS toggle */}
      <button
        onClick={() => handleToggle('macOS')}
        className={`flex items-center justify-center p-2 rounded-md transition-all ${
          platformFilter === 'macOS'
            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
        }`}
        title={platformFilter === 'macOS' ? 'Showing macOS only - click to show all' : 'Filter to macOS only'}
      >
        <svg className="w-4 h-4 -mt-0.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
        </svg>
      </button>
      
      {/* Windows toggle */}
      <button
        onClick={() => handleToggle('Windows')}
        className={`flex items-center justify-center p-2 rounded-md transition-all ${
          platformFilter === 'Windows'
            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
        }`}
        title={platformFilter === 'Windows' ? 'Showing Windows only - click to show all' : 'Filter to Windows only'}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z"/>
        </svg>
      </button>
    </div>
  )
}

/**
 * Compact version for tight spaces
 */
export function PlatformToggleCompact({ className = '' }: PlatformToggleProps) {
  const { platformFilter, setPlatformFilter } = usePlatformFilterSafe()

  const handleToggle = (platform: Platform) => {
    if (platformFilter === platform) {
      setPlatformFilter('all')
    } else {
      setPlatformFilter(platform)
    }
  }

  return (
    <div className={`inline-flex items-center gap-0.5 ${className}`}>
      <button
        onClick={() => handleToggle('macOS')}
        className={`p-1.5 rounded transition-all ${
          platformFilter === 'macOS'
            ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
            : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
        }`}
        title={platformFilter === 'macOS' ? 'Showing macOS only' : 'Show macOS only'}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
        </svg>
      </button>
      <button
        onClick={() => handleToggle('Windows')}
        className={`p-1.5 rounded transition-all ${
          platformFilter === 'Windows'
            ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
            : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
        }`}
        title={platformFilter === 'Windows' ? 'Showing Windows only' : 'Show Windows only'}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z"/>
        </svg>
      </button>
    </div>
  )
}

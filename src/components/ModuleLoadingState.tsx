/**
 * Module Loading State Component
 * Shows loading, error, or empty states for device modules
 * Uses the same tab-specific skeletons as DeviceDetailSkeleton for consistent UX
 */

import React from 'react'
import {
  InfoTabSkeleton,
  InstallsTabSkeleton,
  ApplicationsTabSkeleton,
  ManagementTabSkeleton,
  HardwareTabSkeleton,
  PeripheralsTabSkeleton,
  SystemTabSkeleton,
  SecurityTabSkeleton,
  NetworkTabSkeleton,
  EventsTabSkeleton,
  IdentityTabSkeleton
} from './skeleton/DeviceDetailSkeleton'

interface ModuleLoadingStateProps {
  moduleName: string
  state: 'loading' | 'error' | 'empty'
  error?: string | null
  icon?: string
  accentColor?: string
  onRetry?: () => void
  isMac?: boolean
}

const getAccentColorClasses = (color: string = 'blue') => {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    blue: { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500' },
    orange: { bg: 'bg-orange-100 dark:bg-orange-900', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-500' },
    purple: { bg: 'bg-purple-100 dark:bg-purple-900', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500' },
    emerald: { bg: 'bg-emerald-100 dark:bg-emerald-900', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500' },
    red: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-600 dark:text-red-400', border: 'border-red-500' },
    teal: { bg: 'bg-teal-100 dark:bg-teal-900', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-500' },
    cyan: { bg: 'bg-cyan-100 dark:bg-cyan-900', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-500' },
    violet: { bg: 'bg-violet-100 dark:bg-violet-900', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-500' },
    yellow: { bg: 'bg-yellow-100 dark:bg-yellow-900', text: 'text-yellow-600 dark:text-yellow-400', border: 'border-yellow-500' },
    monochrome: { bg: 'bg-gray-100 dark:bg-gray-900', text: 'text-gray-900 dark:text-white', border: 'border-gray-500' }
  }
  return colorMap[color] || colorMap.blue
}

// Map module names to their corresponding skeleton components
const getModuleSkeleton = (moduleName: string, isMac?: boolean): React.ReactNode => {
  const skeletonMap: Record<string, React.ReactNode> = {
    info: <InfoTabSkeleton />,
    installs: <InstallsTabSkeleton />,
    applications: <ApplicationsTabSkeleton />,
    management: <ManagementTabSkeleton />,
    hardware: <HardwareTabSkeleton isMac={isMac} />,
    peripherals: <PeripheralsTabSkeleton />,
    system: <SystemTabSkeleton />,
    security: <SecurityTabSkeleton />,
    network: <NetworkTabSkeleton />,
    events: <EventsTabSkeleton />,
    identity: <IdentityTabSkeleton />
  }
  return skeletonMap[moduleName.toLowerCase()] || null
}

export const ModuleLoadingState: React.FC<ModuleLoadingStateProps> = ({
  moduleName,
  state,
  error,
  icon,
  accentColor = 'blue',
  onRetry,
  isMac
}) => {
  const colors = getAccentColorClasses(accentColor)
  
  if (state === 'loading') {
    // Use the specific tab skeleton if available, matching DeviceDetailSkeleton
    const skeleton = getModuleSkeleton(moduleName, isMac)
    if (skeleton) {
      return <>{skeleton}</>
    }
    
    // Fallback for unknown modules (should rarely happen)
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 ${colors.bg} rounded-lg`}></div>
            <div className="space-y-2">
              <div className="h-7 w-40 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-4 w-56 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded" style={{ width: `${60 + i * 5}%` }}></div>
            ))}
          </div>
        </div>
      </div>
    )
  }
  
  if (state === 'error') {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}
              </h1>
              <p className="text-base text-gray-600 dark:text-gray-400">Failed to load module data</p>
            </div>
          </div>
        </div>
        
        {/* Error state */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-red-200 dark:border-red-700 p-12">
          <div className="max-w-md mx-auto text-center space-y-6">
            {/* Error icon */}
            <div className="w-16 h-16 mx-auto bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            
            {/* Error message */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Failed to load {moduleName}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {error || 'An error occurred while loading the module data'}
              </p>
            </div>
            
            {/* Retry button */}
            {onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Retry</span>
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }
  
  // Empty state
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 ${colors.bg} rounded-lg flex items-center justify-center`}>
            {icon && (
              <svg className={`w-6 h-6 ${colors.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
              </svg>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}
            </h1>
            <p className="text-base text-gray-600 dark:text-gray-400">No data available</p>
          </div>
        </div>
      </div>
      
      {/* Empty state */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12">
        <div className="max-w-md mx-auto text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No {moduleName} data
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This module has no data available for this device
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ModuleLoadingState

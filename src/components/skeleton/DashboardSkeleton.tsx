/**
 * Dashboard Skeleton Loading Component
 * Provides skeleton loading states for all dashboard widgets and sections
 */

import React from 'react'

// Status Widget Skeleton (Donut Chart)
const StatusWidgetSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
          <div>
            <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
        </div>
        <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
      </div>
    </div>
    
    <div className="p-6">
      <div className="flex items-center justify-center">
        <div className="w-32 h-32 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
      </div>
      
      <div className="mt-6 space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
              <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
            <div className="h-4 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
        ))}
      </div>
    </div>
  </div>
)

// Stats Card Skeleton (Error/Warning cards)
const StatsCardSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
          <div>
            <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
        </div>
        <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
      </div>
    </div>
    
    <div className="p-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
        <div>
          <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
          <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
      </div>
    </div>
  </div>
)

// New Clients Widget Skeleton
const NewClientsWidgetSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
        <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
      </div>
    </div>
    
    <div className="p-6">
      <div className="space-y-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-3 h-3 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
            <div className="flex-1">
              <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1"></div>
              <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1"></div>
              <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
)

// Recent Events Widget Skeleton
const RecentEventsWidgetSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden h-[600px] flex flex-col">
    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
          <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700">
            <div className="w-2 h-2 bg-gray-200 dark:bg-gray-600 rounded-full animate-pulse"></div>
            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
          </div>
          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          <div className="h-9 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
        </div>
      </div>
    </div>
    
    <div className="flex-1 overflow-hidden">
      <div className="overflow-x-auto hide-scrollbar h-full">
        <table className="w-full table-fixed min-w-full">
          <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
            <tr>
              <th className="w-20 px-3 py-3">
                <div className="h-4 w-12 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
              </th>
              <th className="w-56 px-3 py-3">
                <div className="h-4 w-16 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
              </th>
              <th className="px-3 py-3 hidden md:table-cell">
                <div className="h-4 w-20 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
              </th>
              <th className="w-44 px-3 py-3">
                <div className="h-4 w-12 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
              </th>
            </tr>
          </thead>
        </table>
        <div className="overflow-y-auto hide-scrollbar" style={{ height: 'calc(100% - 48px)' }}>
          <table className="w-full table-fixed min-w-full">
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {[...Array(15)].map((_, i) => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <td className="w-20 px-3 py-2.5">
                    <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                  </td>
                  <td className="w-56 px-3 py-2.5">
                    <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  </td>
                  <td className="px-3 py-2.5 hidden md:table-cell">
                    <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  </td>
                  <td className="w-44 px-3 py-2.5">
                    <div className="space-y-1">
                      <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
)

// Platform Distribution Widget Skeleton
const PlatformDistributionWidgetSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
          <div className="w-6 h-6 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
        </div>
        <div>
          <div className="h-5 w-36 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
      </div>
    </div>
    
    <div className="p-6">
      <div className="space-y-6">
        <div className="flex gap-6">
          {/* Platform bars */}
          <div className="flex-1 space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-blue-200 dark:bg-blue-700 rounded-full animate-pulse"></div>
                    <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  </div>
                  <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-6 relative overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-blue-200 dark:bg-blue-700 animate-pulse flex items-center justify-end pr-2"
                    style={{ width: `${i === 0 ? 100 : Math.random() * 50 + 10}%` }}
                  >
                    <div className="w-4 h-3 bg-white rounded animate-pulse"></div>
                  </div>
                </div>
                <div className="ml-7 text-xs space-y-1">
                  <div className="h-3 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-3 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Filter controls */}
          <div className="w-64 flex-shrink-0 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i}>
                <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
                <div className="flex flex-wrap gap-2">
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
)

// OS Version Widget Skeleton
const OSVersionWidgetSkeleton: React.FC<{ osType: 'macOS' | 'Windows' }> = ({ osType }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 ${osType === 'macOS' ? 'bg-red-100 dark:bg-red-900' : 'bg-blue-100 dark:bg-blue-900'} rounded-lg flex items-center justify-center`}>
          <div className="w-6 h-6 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
        </div>
        <div>
          <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
      </div>
    </div>
    
    <div className="p-6">
      <div className="space-y-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="w-20 text-sm">
              <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
            <div className="flex-1 flex items-center gap-3">
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-6 relative overflow-hidden">
                <div 
                  className="h-full rounded-full bg-gray-300 dark:bg-gray-600 animate-pulse"
                  style={{ width: `${Math.random() * 80 + 20}%` }}
                >
                </div>
              </div>
              <div className="w-12 text-right">
                <div className="h-4 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
)

// Main Dashboard Skeleton Component
export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black" suppressHydrationWarning>
      {/* Header Skeleton */}
      <header className="bg-white dark:bg-black border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                <div>
                  <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1"></div>
                  <div className="h-4 w-36 bg-gray-200 dark:bg-gray-700 rounded animate-pulse hidden sm:block"></div>
                </div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Navigation Buttons Skeleton */}
              {/* Devices Button Skeleton */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
                <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
              
              {/* Events Button Skeleton */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
                <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
              
              {/* Reports Dropdown Skeleton */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
                <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div className="h-4 w-14 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
              
              {/* Settings Icon Skeleton */}
              <div className="w-9 h-9 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse"></div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Two-column layout: Column A (30%) + Column B (70%) */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
          {/* Column A (30% width) - Status Widget + Error/Warning Stats + New Clients Table */}
          <div className="lg:col-span-3 space-y-8">
            {/* Device Status Widget */}
            <StatusWidgetSkeleton />

            {/* Error and Warning Stats Cards */}
            <div className="grid grid-cols-1 gap-4">
              <StatsCardSkeleton />
              <StatsCardSkeleton />
            </div>

            {/* New Clients Table */}
            <NewClientsWidgetSkeleton />
          </div>

          {/* Column B (70% width) - Recent Events + Platform Distribution + OS Version Charts */}
          <div className="lg:col-span-7 space-y-8">
            {/* Recent Events Table */}
            <RecentEventsWidgetSkeleton />

            {/* Platform Distribution - Full Width */}
            <PlatformDistributionWidgetSkeleton />

            {/* OS Version Tracking - 50/50 Split */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* macOS Versions */}
              <OSVersionWidgetSkeleton osType="macOS" />
              
              {/* Windows Versions */}
              <OSVersionWidgetSkeleton osType="Windows" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardSkeleton

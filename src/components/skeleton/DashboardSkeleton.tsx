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
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden h-[582px] flex flex-col">
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
    {/* Header */}
    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
          <div className="w-6 h-6 bg-purple-200 dark:bg-purple-700 rounded animate-pulse"></div>
        </div>
        <div className="space-y-1.5">
          <div className="h-5 w-44 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          <div className="h-3.5 w-36 bg-gray-100 dark:bg-gray-600 rounded animate-pulse"></div>
        </div>
      </div>
    </div>

    {/* Platform cards */}
    <div className="p-6 space-y-3">
      {[70, 30].map((pct, i) => (
        <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Platform icon placeholder */}
            <div className="w-7 h-7 bg-gray-200 dark:bg-gray-600 rounded animate-pulse flex-shrink-0"></div>

            {/* Name + bar */}
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-baseline gap-2">
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div className="h-3 w-8 bg-gray-100 dark:bg-gray-600 rounded animate-pulse"></div>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-purple-800 opacity-30 animate-pulse"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            {/* Count */}
            <div className="h-6 w-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse flex-shrink-0"></div>
            {/* Chevron */}
            <div className="w-4 h-4 bg-gray-100 dark:bg-gray-600 rounded animate-pulse flex-shrink-0"></div>
          </div>
        </div>
      ))}

      {/* Filter pills row */}
      <div className="pt-1 flex flex-wrap items-center gap-1.5">
        <div className="h-3 w-12 bg-gray-100 dark:bg-gray-600 rounded animate-pulse"></div>
        {[16, 20, 14, 18].map((w, i) => (
          <div key={i} className={`h-5 w-${w} bg-gray-100 dark:bg-gray-700 rounded-full animate-pulse`}></div>
        ))}
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
      <div className="flex gap-4 items-center">
        {/* Donut Chart Skeleton */}
        <div className="w-36 h-36 flex-shrink-0 relative">
          <div className="absolute inset-0 rounded-full border-[16px] border-gray-200 dark:border-gray-700 animate-pulse"></div>
        </div>

        {/* Bar Chart Skeleton */}
        <div className="flex-1 space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-24 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="flex-1 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="w-8 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
)

// Main Dashboard Skeleton Component
export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black" suppressHydrationWarning>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Two-column layout: Column A (30%) + Column B (70%) */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
          {/* Column A (30% width) - Status Widget + Error/Warning Stats + New Clients Table */}
          <div className="lg:col-span-3 space-y-8">
            {/* Device Status Widget */}
            <StatusWidgetSkeleton />

            {/* Error and Warning Stats Cards - Side by Side */}
            <div className="grid grid-cols-2 gap-4">
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

/**
 * Hardware Page Skeleton Loading Component
 * Provides skeleton loading states for hardware page with charts and data table
 */

import React from 'react'
import Link from 'next/link'

// Donut Chart Skeleton Component
const DonutChartSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
    {/* Title */}
    <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-3"></div>
    
    {/* Legend Above Chart */}
    <div className="space-y-1 mb-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
          <div className="h-3 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
      ))}
    </div>
    
    {/* Donut Chart Circle */}
    <div className="flex items-center justify-center">
      <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
    </div>
  </div>
)

// Bar Chart Skeleton Component
const BarChartSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
    {/* Title */}
    <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4"></div>
    
    {/* Bar Chart Items */}
    <div className="space-y-2">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="h-3 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gray-300 dark:bg-gray-600 h-2 rounded-full animate-pulse"
              style={{ width: `${Math.random() * 80 + 20}%` }}
            ></div>
          </div>
        </div>
      ))}
    </div>
  </div>
)

// Main Hardware Page Skeleton Component
export const HardwarePageSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      {/* Main Content - Split Layout */}
      <div className="flex h-[calc(100vh-64px)]">
        {/* Left Panel - Charts and Filters (26%) */}
        <div className="w-1/4 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
          <div className="p-4">
            
            {/* Platform Filter Buttons Skeleton */}
            <div className="mb-6">
              <div className="grid grid-cols-2 gap-2">
                <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse"></div>
                <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse"></div>
              </div>
            </div>
            
            {/* Hardware Analytics Charts Skeleton */}
            <div className="space-y-6">
              {/* Device Type and Architecture - Side by Side */}
              <div className="grid grid-cols-2 gap-4">
                <DonutChartSkeleton />
                <DonutChartSkeleton />
              </div>
              
              {/* Memory Chart */}
              <BarChartSkeleton />
              
              {/* Storage Chart */}
              <BarChartSkeleton />
              
              {/* Hardware Type Chart */}
              <BarChartSkeleton />
              
              {/* Processor Chart */}
              <BarChartSkeleton />
              
              {/* Graphics Chart */}
              <BarChartSkeleton />
            </div>
          </div>
        </div>

        {/* Right Content - Hardware Table (75%) */}
        <div className="flex-1 bg-white dark:bg-gray-800 overflow-hidden">
          <div className="h-full flex flex-col">
            {/* Content Header Skeleton */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Devices Specs</h2>
                    <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                  </div>
                  <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-1"></div>
                </div>
                <div className="flex items-center gap-4">
                  {/* Search Input Skeleton */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <div className="block w-256 pl-10 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse h-9"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Hardware Table Skeleton */}
            <div className="flex-1 overflow-auto">
              <table className="w-full table-auto divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-48 min-w-0">
                      <div className="h-3 w-12 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-32 min-w-0">
                      <div className="h-3 w-10 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-40 min-w-0">
                      <div className="h-3 w-16 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-32 min-w-0">
                      <div className="h-3 w-12 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-32 min-w-0">
                      <div className="h-3 w-14 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-32 min-w-0">
                      <div className="h-3 w-16 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-36 min-w-0">
                      <div className="h-3 w-18 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-32 min-w-0">
                      <div className="h-3 w-16 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {Array.from({ length: 12 }).map((_, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      {/* Device */}
                      <td className="px-4 py-3 w-48 min-w-0">
                        <div className="space-y-1">
                          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                          <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                        </div>
                      </td>
                      {/* Model */}
                      <td className="px-4 py-3 w-32 min-w-0">
                        <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      </td>
                      {/* Architecture */}
                      <td className="px-4 py-3 w-40 min-w-0">
                        <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      </td>
                      {/* Processor */}
                      <td className="px-4 py-3 w-32 min-w-0">
                        <div className="space-y-1">
                          <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                          <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                        </div>
                      </td>
                      {/* Memory */}
                      <td className="px-4 py-3 w-32 min-w-0">
                        <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      </td>
                      {/* Storage */}
                      <td className="px-4 py-3 w-32 min-w-0">
                        <div className="space-y-1">
                          <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                          <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                        </div>
                      </td>
                      {/* Graphics */}
                      <td className="px-4 py-3 w-36 min-w-0">
                        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      </td>
                      {/* Last Seen */}
                      <td className="px-4 py-3 w-32 min-w-0">
                        <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HardwarePageSkeleton

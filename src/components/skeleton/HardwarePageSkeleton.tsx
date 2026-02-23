/**
 * Hardware Page Skeleton Loading Component
 * Provides skeleton loading states for accordion-based hardware page
 */

import React from 'react'

// Main Hardware Page Skeleton Component
export const HardwarePageSkeleton: React.FC = () => {
  return (
    <div className="h-[calc(100vh-4rem)] bg-gray-50 dark:bg-black flex flex-col overflow-hidden">
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-0 flex flex-col min-h-0">
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-t-xl shadow-sm border border-gray-200 dark:border-gray-700 border-b-0 flex flex-col min-h-0 overflow-hidden">
          
          {/* Title Section Skeleton */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
                <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
              <div className="flex items-center gap-4">
                {/* Platform Filters Skeleton */}
                <div className="flex items-center gap-2">
                  <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                  <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                </div>
                {/* Search Input Skeleton */}
                <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                {/* Export Button Skeleton */}
                <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Selections Accordion Skeleton */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="px-6 py-3 flex items-center justify-between">
              <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
          </div>

          {/* Widgets Accordion Skeleton - Expanded */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="px-6 py-3 flex items-center justify-between">
              <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
            {/* Widget Charts Skeleton - Type/Architecture stacked left, Models, Processor, Graphics, Memory/Storage stacked */}
            <div className="px-6 pb-4">
              <div className="flex gap-6 overflow-x-auto pb-2">
                {/* Type & Architecture Stacked - w-56 */}
                <div className="shrink-0 w-56 flex flex-col gap-4">
                  <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                  <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                </div>
                {/* Models - w-96 */}
                <div className="shrink-0 w-96 h-64 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                {/* Processor - w-80 */}
                <div className="shrink-0 w-80 h-64 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                {/* Graphics - w-80 */}
                <div className="shrink-0 w-80 h-64 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                {/* Memory & Storage Stacked - w-64 */}
                <div className="shrink-0 w-64 flex flex-col gap-4">
                  <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                  <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Hardware Table Skeleton */}
          <div className="flex-1 overflow-auto min-h-0">
            <table className="w-full table-fixed">
              <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 w-56 bg-gray-50 dark:bg-gray-700">
                    <div className="h-3 w-12 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
                  </th>
                  <th className="px-4 py-3 w-40 bg-gray-50 dark:bg-gray-700">
                    <div className="h-3 w-10 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
                  </th>
                  <th className="px-4 py-3 w-48 bg-gray-50 dark:bg-gray-700">
                    <div className="h-3 w-16 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
                  </th>
                  <th className="px-4 py-3 w-32 bg-gray-50 dark:bg-gray-700">
                    <div className="h-3 w-14 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
                  </th>
                  <th className="px-4 py-3 w-24 bg-gray-50 dark:bg-gray-700">
                    <div className="h-3 w-12 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
                  </th>
                  <th className="px-4 py-3 w-24 bg-gray-50 dark:bg-gray-700">
                    <div className="h-3 w-14 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
                  </th>
                  <th className="px-4 py-3 w-20 bg-gray-50 dark:bg-gray-700">
                    <div className="h-3 w-8 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {Array.from({ length: 12 }).map((_, index) => (
                  <tr key={index}>
                    {/* Device */}
                    <td className="px-4 py-3 w-56">
                      <div className="space-y-1">
                        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                        <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      </div>
                    </td>
                    {/* Model */}
                    <td className="px-4 py-3 w-40">
                      <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    </td>
                    {/* Processor */}
                    <td className="px-4 py-3 w-48">
                      <div className="space-y-1">
                        <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                        <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      </div>
                    </td>
                    {/* Graphics */}
                    <td className="px-4 py-3 w-32">
                      <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    </td>
                    {/* Memory */}
                    <td className="px-4 py-3 w-24">
                      <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    </td>
                    {/* Storage */}
                    <td className="px-4 py-3 w-24">
                      <div className="space-y-1">
                        <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                        <div className="h-3 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      </div>
                    </td>
                    {/* Architecture */}
                    <td className="px-4 py-3 w-20">
                      <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
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
}

export default HardwarePageSkeleton

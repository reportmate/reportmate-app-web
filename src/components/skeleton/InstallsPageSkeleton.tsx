import React from 'react'

/**
 * InstallsPageSkeleton - Loading skeleton for the /devices/installs page
 * 
 * Structure matches the actual page layout:
 * - 3 "Items with" stat cards (Errors, Warnings, Pending) at top
 * - 2-3 tables for errors/warnings/pending items
 * - 3 config widgets row (Software Repos, Versions, Manifests)
 * - Main config report table
 */
export const InstallsPageSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      {/* Main Content */}
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Main Card Container */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div>
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-40 animate-pulse"></div>
              <div className="h-4 bg-gray-100 dark:bg-gray-600 rounded w-64 mt-2 animate-pulse"></div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse"></div>
            </div>
          </div>

          {/* Widgets Accordion Header */}
          <div className="w-full px-6 py-3 flex items-center justify-between bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse"></div>
            </div>
            <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>

          {/* Items with Errors/Warnings/Pending Cards - 3 columns */}
          <div className="px-6 py-4 grid grid-cols-1 lg:grid-cols-3 gap-6 border-b border-gray-200 dark:border-gray-700">
            {/* Items with Errors */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-red-200 dark:bg-red-900/50 rounded-full animate-pulse"></div>
                  <div className="h-5 bg-gray-200 dark:bg-gray-600 rounded w-32 animate-pulse"></div>
                </div>
                <div className="h-5 bg-red-100 dark:bg-red-900/30 rounded w-14 animate-pulse"></div>
              </div>
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex justify-between items-center py-1">
                    <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-36 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-8 animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Items with Warnings */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-amber-200 dark:bg-amber-900/50 rounded-full animate-pulse"></div>
                  <div className="h-5 bg-gray-200 dark:bg-gray-600 rounded w-36 animate-pulse"></div>
                </div>
                <div className="h-5 bg-amber-100 dark:bg-amber-900/30 rounded w-14 animate-pulse"></div>
              </div>
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex justify-between items-center py-1">
                    <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-32 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-8 animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Items with Pending */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-cyan-200 dark:bg-cyan-900/50 rounded-full animate-pulse"></div>
                  <div className="h-5 bg-gray-200 dark:bg-gray-600 rounded w-32 animate-pulse"></div>
                </div>
                <div className="h-5 bg-cyan-100 dark:bg-cyan-900/30 rounded w-14 animate-pulse"></div>
              </div>
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex justify-between items-center py-1">
                    <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-28 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-8 animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Config Widgets Row - 4 columns: Software Repos | Munki Versions | Cimian Versions | Manifests */}
          <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 border-b border-gray-200 dark:border-gray-700">
            {/* Software Repos */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
              <div className="h-5 bg-gray-200 dark:bg-gray-600 rounded w-28 mb-4 animate-pulse"></div>
              <div className="h-40 space-y-3 overflow-hidden">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between">
                      <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-48 animate-pulse"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-12 animate-pulse"></div>
                    </div>
                    <div className="h-2 bg-blue-200 dark:bg-blue-900/30 rounded-full w-full animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Munki Versions */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
              <div className="h-5 bg-gray-200 dark:bg-gray-600 rounded w-32 mb-4 animate-pulse"></div>
              <div className="h-40 space-y-3 overflow-hidden">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between">
                      <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-24 animate-pulse"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-16 animate-pulse"></div>
                    </div>
                    <div className="h-2 bg-emerald-200 dark:bg-emerald-900/30 rounded-full animate-pulse" style={{ width: `${85 - i * 15}%` }}></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cimian Versions */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
              <div className="h-5 bg-gray-200 dark:bg-gray-600 rounded w-32 mb-4 animate-pulse"></div>
              <div className="h-40 space-y-3 overflow-hidden">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between">
                      <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-28 animate-pulse"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-16 animate-pulse"></div>
                    </div>
                    <div className="h-2 bg-emerald-200 dark:bg-emerald-900/30 rounded-full animate-pulse" style={{ width: `${90 - i * 20}%` }}></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Manifests */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
              <div className="h-5 bg-gray-200 dark:bg-gray-600 rounded w-20 mb-4 animate-pulse"></div>
              <div className="h-40 space-y-3 overflow-hidden">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between">
                      <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-36 animate-pulse"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-8 animate-pulse"></div>
                    </div>
                    <div className="h-2 bg-purple-200 dark:bg-purple-900/30 rounded-full animate-pulse" style={{ width: `${80 - i * 15}%` }}></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Filters Accordion */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="w-full px-6 py-3 flex items-center justify-between bg-white dark:bg-gray-800">
              <div className="flex items-center gap-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-14 animate-pulse"></div>
              </div>
              <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <div className="w-full h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Config Report Table */}
          <div className="overflow-x-auto max-h-[calc(100vh-400px)] overflow-y-auto rounded-b-xl">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              {/* Table Header */}
              <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Device
                  </th>
                  <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" title="Installed">
                    <svg className="w-4 h-4 mx-auto text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </th>
                  <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" title="Pending">
                    <svg className="w-4 h-4 mx-auto text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </th>
                  <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" title="Errors">
                    <svg className="w-4 h-4 mx-auto text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </th>
                  <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" title="Warnings">
                    <svg className="w-4 h-4 mx-auto text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </th>
                  <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" title="Removed">
                    <svg className="w-4 h-4 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Manifest / Repo
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Last Seen
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Version
                  </th>
                </tr>
              </thead>
              {/* Skeleton Rows */}
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {[...Array(12)].map((_, i) => (
                  <tr key={i}>
                    {/* Device column */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          {/* Platform badge skeleton */}
                          <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-28 animate-pulse"></div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-3 bg-gray-100 dark:bg-gray-600 rounded w-20 animate-pulse"></div>
                          <div className="h-3 bg-gray-100 dark:bg-gray-600 rounded w-14 animate-pulse"></div>
                        </div>
                      </div>
                    </td>
                    {/* # column */}
                    <td className="px-2 py-3">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-6 mx-auto animate-pulse"></div>
                    </td>
                    {/* Installed column */}
                    <td className="px-2 py-3">
                      <div className="h-4 bg-green-100 dark:bg-green-900/30 rounded w-6 mx-auto animate-pulse"></div>
                    </td>
                    {/* Pending column */}
                    <td className="px-2 py-3">
                      <div className="h-4 bg-cyan-100 dark:bg-cyan-900/30 rounded w-6 mx-auto animate-pulse"></div>
                    </td>
                    {/* Errors column */}
                    <td className="px-2 py-3">
                      <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-6 mx-auto animate-pulse"></div>
                    </td>
                    {/* Warnings column */}
                    <td className="px-2 py-3">
                      <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-6 mx-auto animate-pulse"></div>
                    </td>
                    {/* Removed column */}
                    <td className="px-2 py-3">
                      <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-6 mx-auto animate-pulse"></div>
                    </td>
                    {/* Manifest / Repo column */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1.5">
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-44 animate-pulse"></div>
                        <div className="h-2.5 bg-gray-100 dark:bg-gray-600 rounded w-36 animate-pulse"></div>
                      </div>
                    </td>
                    {/* Last Seen column */}
                    <td className="px-3 py-3">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse"></div>
                    </td>
                    {/* Version column */}
                    <td className="px-3 py-3">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse"></div>
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

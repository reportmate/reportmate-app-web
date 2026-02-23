import React from 'react'

export const DevicesPageSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Mobile and Tablet View - Cards */}
        <div className="md:hidden">
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      <div className="w-16 h-5 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  <div className="w-16 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
                
                <div className="mt-3">
                  <div className="w-32 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1"></div>
                  <div className="space-y-1">
                    <div className="w-40 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    <div className="w-28 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop View - Table */}
        <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Endpoints Fleet
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Manage and monitor all devices in fleet
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                {/* Status Summary */}
                <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex flex-wrap gap-2 sm:gap-4">
                    <span><div className="w-3 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse inline-block"></div> Active</span>
                    <span><div className="w-3 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse inline-block"></div> Stale</span>
                    <span><div className="w-3 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse inline-block"></div> Missing</span>
                  </div>
                </div>
                {/* Search Input */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search devices..."
                    disabled
                    className="block w-full sm:w-64 pl-10 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full table-fixed">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  {/* Filter Row */}
                  <tr className="border-b border-gray-200 dark:border-gray-600">
                    <td colSpan={5} className="px-4 lg:px-6 py-3">
                      {/* Desktop filter tabs */}
                      <nav className="hidden sm:flex flex-wrap gap-2">
                        {Array.from({ length: 7 }).map((_, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border transition-colors"
                          >
                            <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse -mt-1"></div>
                            <div className="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                            <div className="w-6 h-4 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                          </div>
                        ))}
                      </nav>

                      {/* Mobile filter dropdown */}
                      <div className="sm:hidden">
                        <div className="relative">
                          <select
                            disabled
                            className="appearance-none block w-full pl-3 pr-10 py-2 text-sm border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm cursor-pointer"
                          >
                            <option>Loading device filters...</option>
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 dark:text-gray-500">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                  {/* Header Row */}
                  <tr>
                    <th className="w-32 px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="w-48 px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Device
                    </th>
                    <th className="w-32 px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Asset Tag
                    </th>
                    <th className="w-40 px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Serial Number
                    </th>
                    <th className="w-32 px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Last Seen
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {Array.from({ length: 12 }).map((_, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer">
                      <td className="w-32 px-4 lg:px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                          <div className="w-16 h-5 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                        </div>
                      </td>
                      <td className="w-48 px-4 lg:px-6 py-4">
                        <div className="min-w-0">
                          <div className="w-32 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1"></div>
                        </div>
                      </td>
                      <td className="w-32 px-4 lg:px-6 py-4">
                        <div className="w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      </td>
                      <td className="w-40 px-4 lg:px-6 py-4">
                        <div className="w-28 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      </td>
                      <td className="w-32 px-4 lg:px-6 py-4">
                        <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
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

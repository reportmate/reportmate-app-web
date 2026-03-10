import React from 'react'

export const EventsPageSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Mobile Card View */}
        <div className="md:hidden">
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    <div className="w-16 h-5 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                  </div>
                  <div className="w-20 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
                <div className="mb-2">
                  <div className="w-28 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1"></div>
                  <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="w-24 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="w-16 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Events Feed</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Real-time activity from fleet</p>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search events..."
                disabled
                className="block w-full sm:w-64 pl-10 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-auto max-h-[calc(100vh-16rem)]">
            <table className="w-full table-fixed relative border-collapse">
              <colgroup>
                <col style={{width: '6%'}} />
                <col style={{width: '24%'}} />
                <col style={{width: '43%'}} />
                <col style={{width: '14%'}} />
                <col style={{width: '13%'}} />
              </colgroup>
              <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10 shadow-sm">
                {/* Filter Row */}
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <td colSpan={5} className="px-6 py-2 h-14">
                    <nav className="hidden sm:grid grid-cols-5 gap-2 w-full">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-center gap-2 px-3 py-1.5 border rounded-lg transition-colors"
                        >
                          <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse flex-shrink-0"></div>
                          <div className="w-14 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                        </div>
                      ))}
                    </nav>
                    <div className="sm:hidden">
                      <select disabled className="appearance-none block w-full pl-3 pr-10 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm">
                        <option>Loading event filters...</option>
                      </select>
                    </div>
                  </td>
                </tr>
                {/* Header Row */}
                <tr>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Device</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Message</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Time</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Payloads</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {Array.from({ length: 12 }).map((_, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-4 lg:px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                        <div className="w-14 h-5 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4">
                      <div className="w-32 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1"></div>
                      <div className="w-20 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    </td>
                    <td className="px-4 lg:px-6 py-4">
                      <div className="w-48 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    </td>
                    <td className="px-4 lg:px-6 py-4">
                      <div className="space-y-1">
                        <div className="w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                        <div className="w-24 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4">
                      <div className="w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
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

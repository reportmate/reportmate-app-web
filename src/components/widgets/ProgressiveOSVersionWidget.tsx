/**
 * Progressive OS Version Widget - Loads independently
 */

import React from 'react'
import { useChartData } from '../../hooks/useProgressiveData'

interface ProgressiveOSVersionWidgetProps {
  osType: 'macOS' | 'Windows'
}

export const ProgressiveOSVersionWidget: React.FC<ProgressiveOSVersionWidgetProps> = ({ osType }) => {
  const { chartData, loading, error } = useChartData()
  
  const icon = osType === 'macOS' ? (
    <svg className="w-6 h-6 text-red-500 dark:text-red-300" fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  ) : (
    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 24 24">
      <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z"/>
    </svg>
  )

  const colorClass = osType === 'macOS' ? 'bg-red-100 dark:bg-red-900' : 'bg-blue-100 dark:bg-blue-900'

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${colorClass} rounded-lg flex items-center justify-center`}>
              {icon}
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {osType} Versions
            </h2>
          </div>
        </div>
        <div className="p-6 text-center">
          <p className="text-red-500">Error loading chart data</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${colorClass} rounded-lg flex items-center justify-center`}>
              {icon}
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {osType} Versions
            </h2>
          </div>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    )
  }

  // Filter OS versions for the requested OS type
  const filteredVersions = chartData.charts.osVersions.filter(item => {
    // Ensure version is a string before calling toLowerCase
    const version = (typeof item.version === 'string' ? item.version : String(item.version || '')).toLowerCase()
    if (osType === 'Windows') {
      return version.includes('windows') || version.includes('microsoft windows')
    } else {
      return version.includes('macos') || version.includes('mac os') || version.includes('darwin')
    }
  })

  if (filteredVersions.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${colorClass} rounded-lg flex items-center justify-center`}>
              {icon}
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {osType} Versions
            </h2>
          </div>
        </div>
        <div className="p-6 text-center">
          <p className="text-gray-500 dark:text-gray-400">No {osType} devices found</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Sampled {chartData.sampledDevices} of {chartData.totalDevices} devices
          </p>
        </div>
      </div>
    )
  }

  const maxCount = Math.max(...filteredVersions.map(item => item.count))
  const totalFilteredDevices = filteredVersions.reduce((sum, item) => sum + item.count, 0)
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316']

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 ${colorClass} rounded-lg flex items-center justify-center`}>
            {icon}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {osType} Versions
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {filteredVersions.length} versions from {chartData.sampledDevices} sampled devices
            </p>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        <div className="max-h-64 overflow-y-auto space-y-3">
          {filteredVersions.map((item, index) => {
            const percentage = Math.round((item.count / totalFilteredDevices) * 100)
            const barWidth = (item.count / maxCount) * 100
            const color = colors[index % colors.length]
            
            return (
              <div key={item.version} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
                <div className="w-32 text-sm font-medium text-gray-700 dark:text-gray-300 truncate" title={item.version}>
                  {item.version}
                </div>
                <div className="flex-1 flex items-center gap-3">
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-6 relative overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                      style={{ 
                        width: `${barWidth}%`, 
                        backgroundColor: color,
                        minWidth: item.count > 0 ? '8px' : '0px'
                      }}
                    >
                      <span className="text-xs font-medium text-white">
                        {item.count}
                      </span>
                    </div>
                  </div>
                  <div className="w-12 text-sm text-gray-600 dark:text-gray-400 text-right">
                    {percentage}%
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
/**
 * Progressive Platform Distribution Widget - Loads independently
 */

import React from 'react'
import { useChartData } from '../../hooks/useProgressiveData'

export const ProgressivePlatformDistributionWidget: React.FC = () => {
  const { chartData, loading, error } = useChartData()

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Platform Distribution
            </h2>
          </div>
        </div>
        <div className="p-6 text-center">
          <p className="text-red-500">Error loading platform data</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Platform Distribution
            </h2>
          </div>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        </div>
      </div>
    )
  }

  const platforms = chartData.charts.platforms
  const totalDevices = platforms.reduce((sum: number, item: any) => sum + item.count, 0)
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4']

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Platform Distribution
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              From {chartData.sampledDevices} sampled devices
            </p>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        <div className="flex justify-center mb-6">
          <div className="relative w-48 h-48">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              {platforms.map((platform: any, index: number) => {
                const percentage = (platform.count / totalDevices) * 100
                const circumference = 2 * Math.PI * 40
                const strokeDasharray = (percentage / 100) * circumference
                const strokeDashoffset = platforms
                  .slice(0, index)
                  .reduce((acc: number, p: any) => acc + ((p.count / totalDevices) * circumference), 0)
                
                return (
                  <circle
                    key={platform.platform}
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke={colors[index % colors.length]}
                    strokeWidth="8"
                    strokeDasharray={`${strokeDasharray} ${circumference}`}
                    strokeDashoffset={-strokeDashoffset}
                    className="transition-all duration-500"
                  />
                )
              })}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {totalDevices}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Total
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {platforms.map((platform: any, index: number) => {
            const percentage = Math.round((platform.count / totalDevices) * 100)
            const color = colors[index % colors.length]
            
            return (
              <div key={platform.platform} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {platform.platform}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {platform.count} devices
                  </span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white w-12 text-right">
                    {percentage}%
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
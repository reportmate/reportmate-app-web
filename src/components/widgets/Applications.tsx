/**
 * Applications Widget
 * Displays installed applications summary
 */

import React from 'react'

interface ApplicationInfo {
  id: string
  name: string
  displayName?: string
  path?: string
  version: string
  bundle_version?: string
  last_modified?: number
  obtained_from?: string
  runtime_environment?: string
  info?: string
  has64bit?: boolean
  signed_by?: string
  publisher?: string
  category?: string
  installDate?: string
  size?: string
  bundleId?: string
}

interface ApplicationsData {
  totalApps: number
  installedApps: ApplicationInfo[]
}

interface Device {
  id: string
  name: string
  applications?: ApplicationsData
}

interface ApplicationsWidgetProps {
  device: Device
}

const getApplicationsIcon = () => (
  <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
)

export const ApplicationsWidget: React.FC<ApplicationsWidgetProps> = ({ device }) => {
  const { applications } = device
  const hasApplications = applications && applications.totalApps > 0

  // Get top 5 applications for preview
  const topApps = applications?.installedApps?.slice(0, 5) || []

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
            {getApplicationsIcon()}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Applications</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {applications ? `${applications.totalApps} installed` : 'Installed software'}
            </p>
          </div>
        </div>
      </div>
      <div className="p-6">
        {hasApplications ? (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Applications</span>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                {applications.totalApps}
              </span>
            </div>

            {/* Top Applications Preview */}
            {topApps.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 block">
                  Recent Applications
                </label>
                <div className="space-y-2">
                  {topApps.map((app, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {app.displayName || app.name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          {app.version && <span>v{app.version}</span>}
                          {app.publisher && <span>• {app.publisher}</span>}
                        </div>
                      </div>
                      {app.size && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                          {app.size}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                
                {applications.totalApps > 5 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                    And {applications.totalApps - 5} more applications...
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-gray-600 dark:text-gray-400">No application data available</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ApplicationsWidget

/**
 * Installs Tab Component
 * Managed software installations and updates
 */

import React from 'react'
import { ManagedInstallsTable } from '../tables'
import { processInstallsData } from '../../lib/data-processing/component-data'

interface InstallsTabProps {
  device: any
  data?: any
}

export const InstallsTab: React.FC<InstallsTabProps> = ({ device, data }) => {
  // Use the processed installs data which includes configuration
  const installsData = data || processInstallsData(device)

  return (
    <div className="space-y-6">
      {/* Header with Icon - Consistent with other tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Managed Installs</h1>
            <p className="text-base text-gray-600 dark:text-gray-400">Software installation management and configuration</p>
          </div>
        </div>
        {/* Total Packages - Top Right */}
        {installsData.totalPackages > 0 && (
          <div className="text-right">
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Packages</div>
            <div className="text-xl font-semibold text-blue-600 dark:text-blue-400">
              {installsData.totalPackages.toLocaleString()}
            </div>
          </div>
        )}
      </div>

      {/* Managed Installs with Configuration */}
      <ManagedInstallsTable data={installsData} />
    </div>
  )
}

export default InstallsTab

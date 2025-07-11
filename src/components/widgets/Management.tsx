/**
 * Device Management Services Widget
 * Displays device management and enrollment status
 */

import React from 'react'

interface ManagementProfile {
  id: string
  name: string
  organization?: string
  installed?: boolean
  verified?: boolean
}

interface ManagementData {
  enrolled: boolean
  enrolled_via_dep: boolean
  server_url?: string | null
  user_approved?: boolean
  organization?: string | null
  department?: string | null
  vendor?: string | null
  profiles?: ManagementProfile[]
  restrictions?: Record<string, any>
  apps?: any[]
}

interface Device {
  id: string
  name: string
  management?: ManagementData
}

interface ManagementWidgetProps {
  device: Device
}

const getManagementIcon = () => (
  <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
)

const getStatusBadge = (enrolled: boolean, userApproved?: boolean) => {
  if (enrolled && userApproved) {
    return "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
  } else if (enrolled && !userApproved) {
    return "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
  } else {
    return "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
  }
}

export const ManagementWidget: React.FC<ManagementWidgetProps> = ({ device }) => {
  const { management } = device

  if (!management) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
              {getManagementIcon()}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Management</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Device management status</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <p className="text-gray-600 dark:text-gray-400">Management information not available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
            {getManagementIcon()}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Management</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Device management status</p>
          </div>
        </div>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          {/* Enrollment Status */}
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Enrollment Status</label>
            <span className={getStatusBadge(management.enrolled, management.user_approved)}>
              {management.enrolled ? (management.user_approved ? 'Enrolled & Approved' : 'Enrolled (Pending Approval)') : 'Not Enrolled'}
            </span>
          </div>

          {/* Organization */}
          {management.organization && (
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Organization</label>
              <p className="text-gray-900 dark:text-white">{management.organization}</p>
            </div>
          )}

          {/* Department */}
          {management.department && (
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Department</label>
              <p className="text-gray-900 dark:text-white">{management.department}</p>
            </div>
          )}

          {/* DEP Enrollment */}
          {management.enrolled_via_dep && (
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">DEP Enrollment</label>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                Yes
              </span>
            </div>
          )}

          {/* Server URL */}
          {management.server_url && (
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Management Server</label>
              <p className="text-gray-900 dark:text-white text-sm font-mono break-all">{management.server_url}</p>
            </div>
          )}

          {/* Profiles Count */}
          {management.profiles && management.profiles.length > 0 && (
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Installed Profiles</label>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {management.profiles.length}
              </span>
            </div>
          )}

          {/* Apps Count */}
          {management.apps && management.apps.length > 0 && (
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Managed Apps</label>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {management.apps.length}
              </span>
            </div>
          )}

          {/* Restrictions */}
          {management.restrictions && Object.keys(management.restrictions).length > 0 && (
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Restrictions</label>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {Object.keys(management.restrictions).length}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ManagementWidget

/**
 * Management Tab Component
 * Comprehensive device management status and enrollment details
 * Based on the rich Management widget with enhanced tab layout
 * 
 * SNAKE_CASE: All fields match API response format directly
 */

import React from 'react'
import { Icons } from '../widgets/shared'
import { CopyButton } from '../ui/CopyButton'

interface ManagementTabProps {
  device: Record<string, unknown>
}

export const ManagementTab: React.FC<ManagementTabProps> = ({ device }) => {
  // Access management data from modular structure or fallback to device level (snake_case)
  const management = (device as any).modules?.management || (device as any).management

  if (!management) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
          {Icons.management}
        </div>
        <div className="text-gray-500 dark:text-gray-400 text-lg font-medium mb-2">
          No Management Data Available
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          This device does not have management enrollment information.
        </p>
        {/* DEBUG INFO */}
        <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900 rounded-lg text-left max-w-2xl mx-auto">
          <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">Debug Info:</h4>
          <pre className="text-xs text-yellow-700 dark:text-yellow-300 mt-2 overflow-auto">
            {JSON.stringify({
              hasModules: !!device.modules,
              moduleKeys: device.modules ? Object.keys(device.modules) : [],
              hasManagement: !!management,
              management: management ? JSON.stringify(management).substring(0, 500) + '...' : null
            }, null, 2)}
          </pre>
        </div>
      </div>
    )
  }

  // Extract key data from the management structure (snake_case from API)
  const isEnrolled = management?.mdm_enrollment?.is_enrolled || false
  const provider = management?.mdm_enrollment?.provider
  const enrollmentType = management?.mdm_enrollment?.enrollment_type
  const tenantName = management?.tenant_details?.tenant_name
  const deviceAuthStatus = management?.device_details?.device_auth_status
  const profileCount = management?.profiles?.length || 0

  // Helper functions
  const formatExpiryDate = (dateString?: string) => {
    if (!dateString) return 'Unknown'
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Icon - Mimic Security Tab */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-yellow-200 dark:bg-yellow-800 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-yellow-700 dark:text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Device Management Service</h1>
            <p className="text-base text-gray-600 dark:text-gray-400">Enrollment, Policies, and Identity Status</p>
          </div>
        </div>
        {/* Provider - Top Right, Smaller Size */}
        {provider && (
          <div className="text-right mr-8">
            <div className="text-sm text-gray-500 dark:text-gray-400">Provider</div>
            <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
              {provider}
            </div>
          </div>
        )}
      </div>

      {/* Top Row - Split 60/40 between Enrollment Status and Management Resources */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Card - Enrollment Status (60% - 3 columns) */}
        <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Enrollment Status</h3>
          <div className="space-y-4">
            {/* Primary Enrollment Status with pill on right */}
            <div className="flex items-center justify-between">
              <span className="text-base font-medium text-gray-900 dark:text-white">Enrollment Status</span>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                isEnrolled 
                  ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                  : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
              }`}>
                {isEnrolled ? 'Enrolled' : 'Not Enrolled'}
              </span>
            </div>

            {/* Enrollment Type with conditional color */}
            {enrollmentType && (
              <div className="flex items-center justify-between">
                <span className="text-base font-medium text-gray-900 dark:text-white">Enrollment Type</span>
                {(() => {
                  let displayType = enrollmentType
                  if (displayType === 'Hybrid Entra Join') displayType = 'Domain Joined'
                  if (displayType === 'Entra Join') displayType = 'Entra Joined'
                  const isYellow = displayType === 'Domain Joined'
                  return (
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      isYellow 
                        ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                        : 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                    }`}>
                      {displayType}
                    </span>
                  )
                })()}
              </div>
            )}

            {/* Device Auth Status with pill on right */}
            {deviceAuthStatus && (
              <div className="flex items-center justify-between">
                <span className="text-base font-medium text-gray-900 dark:text-white">Device Authentication</span>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  deviceAuthStatus === 'SUCCESS' 
                    ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                    : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                }`}>
                  {deviceAuthStatus === 'SUCCESS' ? 'Success' : deviceAuthStatus}
                </span>
              </div>
            )}
          </div>

          {/* Organization */}
          {isEnrolled && tenantName && (
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Device Details</h3>
              <div className="space-y-4">

                <div className="flex items-start">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Organization:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white ml-4">{tenantName}</span>
                </div>

                {/* Intune Device ID with copy button (snake_case from API) */}
                {management?.device_details?.intune_device_id && (
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Intune ID:</span>
                    <div className="flex items-center gap-2 ml-4">
                      <span className="text-sm font-mono text-gray-900 dark:text-gray-100">
                        {management.device_details.intune_device_id}
                      </span>
                      <CopyButton value={management.device_details.intune_device_id} />
                    </div>
                  </div>
                )}

                {/* Entra Object ID with copy button (snake_case from API) */}
                {management?.device_details?.entra_object_id && (
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Object ID:</span>
                    <div className="flex items-center gap-2 ml-4">
                      <span className="text-sm font-mono text-gray-900 dark:text-gray-100">
                        {management.device_details.entra_object_id}
                      </span>
                      <CopyButton value={management.device_details.entra_object_id} />
                    </div>
                  </div>
                )}

                {profileCount > 0 && (
                  <div className="flex items-start">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Profiles:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white ml-4">{profileCount}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Domain Trust Status - Only for Domain Joined (Hybrid Entra Join) devices (snake_case from API) */}
          {(enrollmentType === 'Hybrid Entra Join' || enrollmentType === 'Domain Joined') && management?.domain_trust && (
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Domain Trust Status</h3>
              <div className="space-y-3">
                {/* Trust Status with pill */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Secure Channel</span>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    management.domain_trust.secure_channel_valid === true
                      ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                      : management.domain_trust.secure_channel_valid === false
                      ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                      : 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300'
                  }`}>
                    {management.domain_trust.secure_channel_valid === true ? 'Valid' : 
                     management.domain_trust.secure_channel_valid === false ? 'Invalid' : 'Unknown'}
                  </span>
                </div>

                {/* Domain Name */}
                {management.domain_trust.domain_name && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Domain</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {management.domain_trust.domain_name}
                    </span>
                  </div>
                )}

                {/* Domain Controller */}
                {management.domain_trust.domain_controller && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Domain Controller</span>
                    <span className="text-sm font-mono text-gray-900 dark:text-white text-xs">
                      {management.domain_trust.domain_controller}
                    </span>
                  </div>
                )}

                {/* Trust Status */}
                {management.domain_trust.trust_status && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Trust Status</span>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      management.domain_trust.trust_status === 'Healthy' || management.domain_trust.trust_status === 'Success' || management.domain_trust.trust_status === 'Trusted'
                        ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                        : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                    }`}>
                      {management.domain_trust.trust_status}
                    </span>
                  </div>
                )}

                {/* Machine Password Age */}
                {management.domain_trust.machine_password_age_days !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Password Age</span>
                    <span className={`text-sm font-medium ${
                      management.domain_trust.machine_password_age_days > 30
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      {management.domain_trust.machine_password_age_days} days
                    </span>
                  </div>
                )}

                {/* Last Checked */}
                {management.domain_trust.last_checked && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Last Checked</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {formatExpiryDate(management.domain_trust.last_checked)}
                    </span>
                  </div>
                )}

                {/* Error Message if present */}
                {management.domain_trust.error_message && (
                  <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <div className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-red-700 dark:text-red-300">{management.domain_trust.error_message}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Management URL - Move to bottom (snake_case from API) */}
          {management?.mdm_enrollment?.management_url && (
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Management URL</div>
              <div className="text-sm font-mono text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-900 rounded-md px-3 py-2 break-all">
                {management.mdm_enrollment.management_url}
              </div>
            </div>
          )}
        </div>

        {/* Right Card - Management Resources (40% - 2 columns) */}
        {isEnrolled && (
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Management Resources</h3>
            
            <div className="grid grid-cols-1 gap-6">
              <div className="text-left">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {profileCount}
                </div>
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Profiles
                </div>
              </div>
              
              <div className="text-left">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {management?.compliance_policies?.length || 0}
                </div>
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Compliance Policies
                </div>
              </div>
              
              <div className="text-left">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {management?.metadata?.applications?.length || 0}
                </div>
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Managed Apps
                </div>
              </div>
            </div>

            {/* Compliance Status with pill on right (snake_case from API) */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              {management?.compliance_policies && management.compliance_policies.length > 0 ? (
                <div className="flex items-center justify-between">
                  <span className="text-base font-medium text-gray-900 dark:text-white">Compliance Policies Applied</span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                    {management.compliance_policies.length} policies
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-base font-medium text-gray-900 dark:text-white">Compliance</span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300">
                    No policies applied
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Configuration Profiles */}
      {isEnrolled && management.profiles && management.profiles.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Configuration Profiles
            </h2>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Profile Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Installed
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {management.profiles.map((profile: any, index: number) => (
                    <tr key={profile.id || index}>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {profile.display_name || profile.name || 'Unknown Profile'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                        {profile.type || 'Configuration'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          (profile.status || profile.install_state || '').toLowerCase().includes('install') 
                            ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                            : (profile.status || profile.install_state || '').toLowerCase().includes('pending') 
                            ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300' 
                            : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                        }`}>
                          {profile.status || profile.install_state || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                        {profile.install_date ? formatExpiryDate(profile.install_date) : 'Unknown'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Debug Accordion for API Data */}
      <div className="mt-6">
        <details className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
          <summary className="cursor-pointer px-4 py-3 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Debug API JSON Data</span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              device.modules.management
            </span>
          </summary>
          <div className="border-t border-gray-200 dark:border-gray-700">
            <div className="p-4">
              <div className="flex justify-end gap-2 mb-2">
                <button
                  onClick={() => {
                    const jsonString = JSON.stringify((device as any)?.modules?.management, null, 2)
                    navigator.clipboard.writeText(jsonString)
                  }}
                  className="px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Copy JSON
                </button>
              </div>
              <pre className="p-4 bg-gray-900 dark:bg-black text-gray-100 text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-[600px] overflow-y-auto rounded border border-gray-700">
                {JSON.stringify((device as any)?.modules?.management, null, 2)}
              </pre>
            </div>
          </div>
        </details>
      </div>
    </div>
  )
}

export default ManagementTab

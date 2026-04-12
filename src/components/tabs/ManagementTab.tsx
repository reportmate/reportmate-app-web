/**
 * Management Tab Component
 * Comprehensive device management status and enrollment details
 * Supports both:
 * - Mac: osquery-style snake_case fields and string booleans
 * - Windows: Legacy camelCase fields with native booleans
 */

import React, { useState, useMemo } from 'react'
import { Icons } from '../widgets/shared'
import { convertPowerShellObjects } from '../../lib/utils/powershell-parser'
import { CopyButton } from '../ui/CopyButton'

// Helper to parse osquery boolean strings ("true", "false", "1", "0") to boolean
function parseBool(value: any): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const lower = value.toLowerCase()
    return lower === 'true' || lower === '1' || lower === 'yes'
  }
  return false
}

// Parse MDM certificate data - handles nested JSON in 'output' field from osquery
function parseMdmCertificate(mdmCertificate: any): {
  push_topic?: string
  scep_url?: string
  certificate_name?: string
  certificate_subject?: string
  certificate_issuer?: string
  certificate_expires?: string
  mdm_provider?: string
} {
  if (!mdmCertificate) return {}
  
  // If there's an output field with JSON string, parse it
  if (mdmCertificate.output && typeof mdmCertificate.output === 'string') {
    try {
      // Clean up the JSON string - handle osquery's escaped format with semicolons INSIDE quotes
      let cleanJson = mdmCertificate.output
        .replace(/";\\",/g, '",')       // Fix: "value";\", → "value",
        .replace(/";\\"\n/g, '"\n')     // Fix: "value";\" \n → "\n
        .replace(/";\s*,/g, '",')       // Fix: "value"; , → "value",
        .replace(/";\s*\n/g, '"\n')     // Fix: "value"; \n → "\n
        .replace(/\\";\s*,/g, '",')     // Fix: \"value\"; , → ",
        .replace(/\\";\s*\n/g, '"\n')   // Fix: \"value\"; \n → "\n
        .replace(/";"/g, '","')         // Fix: "value";" → "value","
        .trim()
      
      const parsed = JSON.parse(cleanJson)
      return {
        push_topic: parsed.push_topic,
        scep_url: parsed.scep_url,
        certificate_name: parsed.certificate_name,
        certificate_subject: parsed.certificate_subject,
        certificate_issuer: parsed.certificate_issuer,
        certificate_expires: parsed.certificate_expires,
        mdm_provider: parsed.mdm_provider
      }
    } catch (e) {
      console.warn('Failed to parse mdm_certificate.output:', e, mdmCertificate.output)
    }
  }
  
  // Fallback to direct field access (snake_case and camelCase)
  return {
    push_topic: mdmCertificate.push_topic || mdmCertificate.pushTopic,
    scep_url: mdmCertificate.scep_url || mdmCertificate.scepUrl,
    certificate_name: mdmCertificate.certificate_name || mdmCertificate.certificateName,
    certificate_subject: mdmCertificate.certificate_subject || mdmCertificate.certificateSubject,
    certificate_issuer: mdmCertificate.certificate_issuer || mdmCertificate.certificateIssuer,
    certificate_expires: mdmCertificate.certificate_expires || mdmCertificate.certificateExpires,
    mdm_provider: mdmCertificate.mdm_provider || mdmCertificate.mdmProvider
  }
}

// Detect MDM provider from certificate data first, then server URL
function detectMdmProvider(serverUrl?: string, certificateData?: ReturnType<typeof parseMdmCertificate>): string | undefined {
  // PRIORITY 1: Explicit provider from certificate (most reliable)
  if (certificateData?.mdm_provider) {
    return certificateData.mdm_provider
  }
  
  // PRIORITY 2: Certificate issuer (very reliable for open-source MDMs)
  if (certificateData?.certificate_issuer) {
    const issuer = certificateData.certificate_issuer.toLowerCase()
    if (issuer.includes('micromdm')) return 'MicroMDM'
    if (issuer.includes('nanomdm')) return 'NanoMDM'
    if (issuer.includes('jamf')) return 'Jamf Pro'
    if (issuer.includes('microsoft')) return 'Microsoft Intune'
    if (issuer.includes('mosyle')) return 'Mosyle'
    if (issuer.includes('kandji')) return 'Kandji'
    if (issuer.includes('addigy')) return 'Addigy'
    if (issuer.includes('simplemdm')) return 'SimpleMDM'
    if (issuer.includes('workspace one') || issuer.includes('vmware')) return 'Workspace ONE'
    if (issuer.includes('meraki')) return 'Cisco Meraki'
  }
  
  // PRIORITY 3: Server URL patterns (fallback)
  if (!serverUrl) return undefined
  const url = serverUrl.toLowerCase()
  
  // Open-source MDMs first - check for explicit micromdm/nanomdm in URL
  if (url.includes('micromdm')) return 'MicroMDM'
  if (url.includes('nanomdm')) return 'NanoMDM'
  
  // Commercial MDMs - be more specific with patterns
  if (url.includes('jamf') || url.includes('jamfcloud')) return 'Jamf Pro'
  if (url.includes('manage.microsoft.com') || url.includes('intune')) return 'Microsoft Intune'
  if (url.includes('mosyle')) return 'Mosyle'
  if (url.includes('kandji')) return 'Kandji'
  if (url.includes('addigy')) return 'Addigy'
  if (url.includes('simplemdm')) return 'SimpleMDM'
  // NOTE: Removed 'awsmdm' pattern - it's too generic and causes false positives
  // Only match explicit AirWatch/Workspace ONE patterns
  if (url.includes('airwatch.com') || url.includes('workspaceone')) return 'Workspace ONE'
  if (url.includes('meraki')) return 'Cisco Meraki'
  if (url.includes('maas360')) return 'MaaS360'
  if (url.includes('mobileiron') || url.includes('ivanti')) return 'Ivanti'
  
  // No provider detected from URL - return undefined instead of guessing
  return undefined
}

// Detect if data is from a Mac based on Mac-specific fields in mdmEnrollment
function detectMacFromData(mdmEnrollment: any): boolean {
  // Mac osquery mdm table has these specific fields
  return !!(mdmEnrollment?.installed_from_dep !== undefined ||
            mdmEnrollment?.installedFromDep !== undefined ||
            mdmEnrollment?.user_approved !== undefined ||
            mdmEnrollment?.userApproved !== undefined ||
            mdmEnrollment?.dep_capable !== undefined ||
            mdmEnrollment?.depCapable !== undefined ||
            mdmEnrollment?.has_scep_payload !== undefined ||
            mdmEnrollment?.hasScepPayload !== undefined ||
            mdmEnrollment?.checkin_url !== undefined ||
            mdmEnrollment?.checkinUrl !== undefined)
}

interface ManagementTabProps {
  device: Record<string, unknown>
}

export const ManagementTab: React.FC<ManagementTabProps> = ({ device }) => {
  // State for profile accordion expansion
  const [expandedProfiles, setExpandedProfiles] = useState<Set<string>>(new Set())
  // State for managed policies accordion expansion
  const [expandedPolicies, setExpandedPolicies] = useState<Set<string>>(new Set())
  // State for profiles search
  const [profileSearch, setProfileSearch] = useState('')
  // State for policies search
  const [policySearch, setPolicySearch] = useState('')
  
  // Access management data from modular structure or fallback to device level
  const rawManagement = (device as any).modules?.management || (device as any).management

  // Parse PowerShell objects to proper JavaScript objects
  const management = convertPowerShellObjects(rawManagement)

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

  // Extract key data from the management structure - support both snake_case (Mac) and camelCase (Windows)
  const mdmEnrollment = management.mdm_enrollment || management.mdmEnrollment || {}
  const mdmCertificateRaw = management.mdm_certificate || management.mdmCertificate || {}
  const deviceState = management.device_state || management.deviceState
  const tenantDetails = management.tenant_details || management.tenantDetails || {}
  const deviceDetails = management.device_details || management.deviceDetails || {}
  // NOTE: compliance_status removed from management module - moved to security module
  const remoteManagement = management.remote_management || management.remoteManagement || {}
  const installedProfiles = management.installed_profiles || management.installedProfiles || []
  const profiles = management.profiles || []
  const managedPolicies = management.managed_policies || management.managedPolicies || []
  const adeConfiguration = management.ade_configuration || management.adeConfiguration || {}
  const deviceIdentifiers = management.device_identifiers || management.deviceIdentifiers || {}
  
  // Toggle profile expansion
  const toggleProfile = (identifier: string) => {
    setExpandedProfiles(prev => {
      const newSet = new Set(prev)
      if (newSet.has(identifier)) {
        newSet.delete(identifier)
      } else {
        newSet.add(identifier)
      }
      return newSet
    })
  }
  
  // Toggle policy domain expansion
  const togglePolicy = (domain: string) => {
    setExpandedPolicies(prev => {
      const newSet = new Set(prev)
      if (newSet.has(domain)) {
        newSet.delete(domain)
      } else {
        newSet.add(domain)
      }
      return newSet
    })
  }
  
  // Filter profiles by search
  const filteredProfiles = useMemo(() => {
    if (!profileSearch.trim()) return installedProfiles
    const search = profileSearch.toLowerCase()
    return installedProfiles.filter((profile: any) => {
      const name = (profile.name || profile.identifier || '').toLowerCase()
      const identifier = (profile.identifier || '').toLowerCase()
      const org = (profile.organization || '').toLowerCase()
      return name.includes(search) || identifier.includes(search) || org.includes(search)
    })
  }, [installedProfiles, profileSearch])
  
  // Filter managed policies by search
  const filteredPolicies = useMemo(() => {
    if (!policySearch.trim()) return managedPolicies
    const search = policySearch.toLowerCase()
    return managedPolicies.filter((policy: any) => {
      const domain = (policy.domain || '').toLowerCase()
      // Also check individual settings for search term
      const settings = policy.settings || []
      const settingsMatch = settings.some((s: any) => 
        (s.name || '').toLowerCase().includes(search) ||
        (s.value || '').toLowerCase().includes(search)
      )
      return domain.includes(search) || settingsMatch
    })
  }, [managedPolicies, policySearch])
  
  // Parse the MDM certificate (handles nested JSON in 'output' field)
  const mdmCertificate = parseMdmCertificate(mdmCertificateRaw)
  
  // Parse enrolled status - osquery returns string "true"/"false", Windows returns boolean
  const isEnrolled = parseBool(mdmEnrollment.enrolled) || 
                     parseBool(mdmEnrollment.is_enrolled) || 
                     parseBool(mdmEnrollment.isEnrolled) || 
                     false
  
  // Get server URL and detect provider (certificate data takes priority)
  const serverUrl = mdmEnrollment.server_url || mdmEnrollment.serverUrl
  const provider = detectMdmProvider(serverUrl, mdmCertificate) || mdmEnrollment.provider
  
  // Enrollment type - Mac uses ADE/User Approved, Windows uses Entra/Domain Join
  // Detect Mac from platform field OR from Mac-specific MDM fields in data
  const platform = (device as any).platform?.toLowerCase() || ''
  const isMac = platform === 'macos' || platform === 'darwin' || platform === 'mac' || detectMacFromData(mdmEnrollment)
  
  let enrollmentType: string | undefined
  if (isMac) {
    const installedFromDep = parseBool(mdmEnrollment.installed_from_dep || mdmEnrollment.installedFromDep)
    const userApproved = parseBool(mdmEnrollment.user_approved || mdmEnrollment.userApproved)
    
    if (installedFromDep) {
      enrollmentType = 'Automated Device Enrollment'
    } else if (userApproved) {
      enrollmentType = 'User Approved Enrollment'
    } else if (isEnrolled) {
      enrollmentType = 'MDM Enrolled'
    }
  } else {
    enrollmentType = mdmEnrollment.enrollment_type || mdmEnrollment.enrollmentType || deviceState?.status
  }
  
  const tenantName = tenantDetails.tenant_name || tenantDetails.tenantName || tenantDetails.organization
  const deviceAuthStatus = deviceDetails.device_auth_status || deviceDetails.deviceAuthStatus
  const profileCount = installedProfiles.length || profiles.length || 0
  
  // Mac-specific data - ADE configuration and device identifiers
  // NOTE: Compliance moved to Security tab, Remote Management may move to Security/Remote Access
  
  // Windows-specific data - Autopilot configuration, Primary User, Management Name
  const autopilotConfig = management.autopilot_config || management.autopilotConfig
  const primaryUser = deviceDetails.primary_user || deviceDetails.primaryUser
  const managementName = deviceDetails.management_name || deviceDetails.managementName
  
  // Get compliance policies and managed apps for summary
  const compliancePolicies = management.compliance_policies || management.compliancePolicies || []
  const managedApps = management.managed_apps || management.managedApps || []
  const compliancePolicyCount = compliancePolicies.length
  const managedAppCount = managedApps.length

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

  // Extract expiry date from validity range string
  // Input: "[ 2025-03-25 22:47:56.000 UTC -- 2035-03-25 23:17:56.000 UTC ]"
  // Output: "Mar 25, 2035"
  const formatCertificateValidity = (validityString?: string) => {
    if (!validityString) return 'Unknown'
    
    // Try to parse the end date from the range
    const match = validityString.match(/--\s*(\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2}:\d{2}(?:\.\d{3})?)?\s*(?:UTC)?)/)
    if (match && match[1]) {
      try {
        const endDate = new Date(match[1])
        return endDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      } catch {
        // Fallback to original string if parsing fails
      }
    }
    
    // If no match or parsing failed, return original
    return validityString
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
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Enrollment</h3>
          <div className="space-y-4">
            {/* Primary Enrollment Status with pill next to label */}
            <div className="flex items-center gap-3">
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
              <div className="flex items-center gap-3">
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

            {/* Device Auth Status with pill next to label */}
            {deviceAuthStatus && (
              <div className="flex items-center gap-3">
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

            {/* User Principal Name - who enrolled the device */}
            {(mdmEnrollment.user_principal_name || mdmEnrollment.userPrincipalName) && (
              <div className="flex items-start">
                <span className="text-base font-medium text-gray-900 dark:text-white">Enrolled By</span>
                <span className="text-base font-medium text-gray-900 dark:text-white ml-3">{mdmEnrollment.user_principal_name || mdmEnrollment.userPrincipalName}</span>
              </div>
            )}
          </div>

          {/* Windows: Autopilot Configuration */}
          {isEnrolled && !isMac && (management.autopilot_config || management.autopilotConfig) && (() => {
            const autopilot = management.autopilot_config || management.autopilotConfig
            return (
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Windows Autopilot</h3>
                <div className="space-y-3">
                  {/* Status Pills - Two columns */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Assigned Status */}
                    {autopilot.assigned !== undefined && (
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Assigned</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          parseBool(autopilot.assigned)
                            ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                        }`}>
                          {parseBool(autopilot.assigned) ? 'Yes' : 'No'}
                        </span>
                      </div>
                    )}

                    {/* Enrollment Status Page */}
                    {autopilot.enrollment_status_page_enabled !== undefined && (
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Enrollment Status Page</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          parseBool(autopilot.enrollment_status_page_enabled)
                            ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                        }`}>
                          {parseBool(autopilot.enrollment_status_page_enabled) ? 'Yes' : 'No'}
                        </span>
                      </div>
                    )}

                    {/* Activated Status */}
                    {autopilot.activated !== undefined && (
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Activated</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          parseBool(autopilot.activated)
                            ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                        }`}>
                          {parseBool(autopilot.activated) ? 'Yes' : 'No'}
                        </span>
                      </div>
                    )}

                    {/* Deployment Phase */}
                    {autopilot.deployment_phase && (
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Phase</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          autopilot.deployment_phase === 'Completed'
                            ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                            : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                        }`}>
                          {autopilot.deployment_phase}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Additional Details */}
                  {(autopilot.profile_name || autopilot.group_tag || autopilot.tenant_domain || autopilot.tenant_id || autopilot.deployment_mode || autopilot.join_method) && (
                    <div className="pt-3 space-y-2">
                      {autopilot.profile_name && (
                        <div className="flex items-start">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[100px]">Profile</span>
                          <span className="text-sm text-gray-900 dark:text-white ml-3">{autopilot.profile_name}</span>
                        </div>
                      )}
                      {autopilot.group_tag && (
                        <div className="flex items-start">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[100px]">Group Tag</span>
                          <span className="text-sm text-gray-900 dark:text-white ml-3">{autopilot.group_tag}</span>
                        </div>
                      )}
                      {autopilot.tenant_domain && (
                        <div className="flex items-start">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[100px]">Tenant</span>
                          <span className="text-sm text-gray-900 dark:text-white ml-3">{autopilot.tenant_domain}</span>
                        </div>
                      )}
                      {autopilot.tenant_id && (
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[100px]">Tenant ID</span>
                          <div className="flex items-center gap-2 ml-3">
                            <span className="text-sm font-mono text-gray-900 dark:text-white">{autopilot.tenant_id}</span>
                            <CopyButton value={autopilot.tenant_id} />
                          </div>
                        </div>
                      )}
                      {autopilot.deployment_mode && (
                        <div className="flex items-start">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[100px]">Mode</span>
                          <span className="text-sm text-gray-900 dark:text-white ml-3">{autopilot.deployment_mode}</span>
                        </div>
                      )}
                      {autopilot.join_method && (
                        <div className="flex items-start">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[100px]">Join Method</span>
                          <span className="text-sm text-gray-900 dark:text-white ml-3">{autopilot.join_method}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })()}

          {/* Organization */}
          {isEnrolled && tenantName && (
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Device Details</h3>
              <div className="space-y-4">

                {/* Management Name (device name in Intune portal) */}
                {managementName && (
                  <div className="flex items-start">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[100px]">Management Name</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white ml-3">{managementName}</span>
                  </div>
                )}

                {/* Primary User - who has self-service device action access */}
                {primaryUser && (
                  <div className="flex items-start">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[100px]">Primary User</span>
                    <div className="flex items-center gap-2 ml-3">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{primaryUser}</span>
                      <CopyButton value={primaryUser} />
                    </div>
                  </div>
                )}

                {/* User Principal Name - who enrolled the device */}
                {(mdmEnrollment.user_principal_name || mdmEnrollment.userPrincipalName) && (
                  <div className="flex items-start">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[100px]">Enrolled By</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white ml-3">{mdmEnrollment.user_principal_name || mdmEnrollment.userPrincipalName}</span>
                  </div>
                )}

                {/* Intune Device ID with copy button - support both snake_case and camelCase */}
                {(deviceDetails?.intune_device_id || deviceDetails?.intuneDeviceId) && (
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[100px]">Intune ID</span>
                    <div className="flex items-center gap-2 ml-3">
                      <span className="text-sm font-mono text-gray-900 dark:text-gray-100">
                        {deviceDetails.intune_device_id || deviceDetails.intuneDeviceId}
                      </span>
                      <CopyButton value={deviceDetails.intune_device_id || deviceDetails.intuneDeviceId} />
                    </div>
                  </div>
                )}

                {/* Entra Object ID with copy button - support both snake_case and camelCase */}
                {(deviceDetails?.entra_object_id || deviceDetails?.entraObjectId) && (
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[100px]">Object ID</span>
                    <div className="flex items-center gap-2 ml-3">
                      <span className="text-sm font-mono text-gray-900 dark:text-gray-100">
                        {deviceDetails.entra_object_id || deviceDetails.entraObjectId}
                      </span>
                      <CopyButton value={deviceDetails.entra_object_id || deviceDetails.entraObjectId} />
                    </div>
                  </div>
                )}

                {/* Last Sync Time */}
                {management.last_sync && (
                  <div className="flex items-start">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[100px]">Last Sync</span>
                    <span className="text-sm text-gray-900 dark:text-white ml-3">{formatExpiryDate(management.last_sync)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mac: Enrollment Details */}
          {isEnrolled && isMac && (
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Enrollment Details</h3>
              <div className="space-y-4">
                {/* Enrollment Status Pills - Two columns */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Installed from DEP/ADE */}
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">ADE Enrolled</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      parseBool(mdmEnrollment.installed_from_dep || mdmEnrollment.installedFromDep)
                        ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}>
                      {parseBool(mdmEnrollment.installed_from_dep || mdmEnrollment.installedFromDep) ? 'Yes' : 'No'}
                    </span>
                  </div>

                  {/* User Approved */}
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">User Approved</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      parseBool(mdmEnrollment.user_approved || mdmEnrollment.userApproved)
                        ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}>
                      {parseBool(mdmEnrollment.user_approved || mdmEnrollment.userApproved) ? 'Yes' : 'No'}
                    </span>
                  </div>

                  {/* DEP/ADE Capable */}
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">ADE Capable</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      parseBool(mdmEnrollment.dep_capable || mdmEnrollment.depCapable)
                        ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}>
                      {parseBool(mdmEnrollment.dep_capable || mdmEnrollment.depCapable) ? 'Yes' : 'No'}
                    </span>
                  </div>

                  {/* SCEP Payload */}
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">SCEP Certificate</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      parseBool(mdmEnrollment.has_scep_payload || mdmEnrollment.hasScepPayload)
                        ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}>
                      {parseBool(mdmEnrollment.has_scep_payload || mdmEnrollment.hasScepPayload) ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>

                {/* MDM Server URL - Full URL visible */}
                {serverUrl && (
                  <div className="flex flex-col gap-1 pt-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Server URL</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-gray-900 dark:text-white break-all bg-gray-50 dark:bg-gray-900 px-2 py-1 rounded">
                        {serverUrl}
                      </span>
                      <CopyButton value={serverUrl} />
                    </div>
                  </div>
                )}

                {/* Check-in URL - Full URL visible */}
                {(mdmEnrollment.checkin_url || mdmEnrollment.checkinUrl) && (
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Check-in URL</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-gray-900 dark:text-white break-all bg-gray-50 dark:bg-gray-900 px-2 py-1 rounded">
                        {mdmEnrollment.checkin_url || mdmEnrollment.checkinUrl}
                      </span>
                      <CopyButton value={mdmEnrollment.checkin_url || mdmEnrollment.checkinUrl} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mac: APNs Push Topic - Important for troubleshooting */}
          {isEnrolled && isMac && mdmCertificate.push_topic && (
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Push Notification</h3>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">APNs Push Topic</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-gray-900 dark:text-white break-all bg-gray-50 dark:bg-gray-900 px-2 py-1 rounded">
                    {mdmCertificate.push_topic}
                  </span>
                  <CopyButton value={mdmCertificate.push_topic} />
                </div>
              </div>
            </div>
          )}

          {/* Mac: ADE Configuration (if activated or assigned) */}
          {isEnrolled && isMac && (parseBool(adeConfiguration.activated) || parseBool(adeConfiguration.assigned)) && (
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">ADE Configuration</h3>
              <div className="space-y-3">
                {/* ADE Assigned/Activated */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Assigned</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      parseBool(adeConfiguration.assigned)
                        ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}>
                      {parseBool(adeConfiguration.assigned) ? 'Yes' : 'No'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Activated</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      parseBool(adeConfiguration.activated)
                        ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}>
                      {parseBool(adeConfiguration.activated) ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>

                {/* Organization */}
                {adeConfiguration.organization && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Organization</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {adeConfiguration.organization}
                    </span>
                  </div>
                )}

                {/* Support Contact */}
                {(adeConfiguration.support_phone || adeConfiguration.support_email) && (
                  <div className="space-y-2">
                    {adeConfiguration.support_phone && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Support Phone</span>
                        <span className="text-sm text-gray-900 dark:text-white">
                          {adeConfiguration.support_phone}
                        </span>
                      </div>
                    )}
                    {adeConfiguration.support_email && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Support Email</span>
                        <span className="text-sm text-gray-900 dark:text-white">
                          {adeConfiguration.support_email}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Windows: Autopilot Configuration (equivalent to Mac ADE) */}
          {isEnrolled && !isMac && autopilotConfig && (autopilotConfig.assigned || autopilotConfig.activated) && (
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Windows Autopilot</h3>
              <div className="space-y-3">
                {/* Autopilot Assigned/Activated */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Assigned</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      autopilotConfig.assigned
                        ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}>
                      {autopilotConfig.assigned ? 'Yes' : 'No'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Activated</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      autopilotConfig.activated
                        ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}>
                      {autopilotConfig.activated ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>

                {/* Deployment Mode */}
                {autopilotConfig.deployment_mode && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Deployment Mode</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {autopilotConfig.deployment_mode}
                    </span>
                  </div>
                )}

                {/* Profile Name */}
                {autopilotConfig.profile_name && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Profile</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {autopilotConfig.profile_name}
                    </span>
                  </div>
                )}

                {/* Group Tag */}
                {autopilotConfig.group_tag && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Group Tag</span>
                    <span className="text-sm font-mono text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 px-2 py-1 rounded">
                      {autopilotConfig.group_tag}
                    </span>
                  </div>
                )}

                {/* Enrollment Status Page */}
                {autopilotConfig.enrollment_status_page_enabled !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Enrollment Status Page</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      autopilotConfig.enrollment_status_page_enabled
                        ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}>
                      {autopilotConfig.enrollment_status_page_enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                )}

                {/* Deployment Phase */}
                {autopilotConfig.deployment_phase && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Deployment Phase</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {autopilotConfig.deployment_phase}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Domain Trust Status - Only for Domain Joined (Hybrid Entra Join) devices */}
          {/* Support both snake_case and camelCase */}
          {(enrollmentType === 'Hybrid Entra Join' || enrollmentType === 'Domain Joined') && (management.domain_trust || management.domainTrust) && (() => {
            const domainTrust = management.domain_trust || management.domainTrust
            return (
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Domain Trust Status</h3>
              <div className="space-y-3">
                {/* Trust Status with pill */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Secure Channel</span>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    (domainTrust.secure_channel_valid ?? domainTrust.secureChannelValid) === true
                      ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                      : (domainTrust.secure_channel_valid ?? domainTrust.secureChannelValid) === false
                      ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                      : 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300'
                  }`}>
                    {(domainTrust.secure_channel_valid ?? domainTrust.secureChannelValid) === true ? 'Valid' : 
                     (domainTrust.secure_channel_valid ?? domainTrust.secureChannelValid) === false ? 'Invalid' : 'Unknown'}
                  </span>
                </div>

                {/* Domain Name */}
                {(domainTrust.domain_name || domainTrust.domainName) && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Domain</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {domainTrust.domain_name || domainTrust.domainName}
                    </span>
                  </div>
                )}

                {/* Domain Controller */}
                {(domainTrust.domain_controller || domainTrust.domainController) && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Domain Controller</span>
                    <span className="text-sm font-mono text-gray-900 dark:text-white text-xs">
                      {domainTrust.domain_controller || domainTrust.domainController}
                    </span>
                  </div>
                )}

                {/* Trust Status */}
                {(domainTrust.trust_status || domainTrust.trustStatus) && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Trust Status</span>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      (domainTrust.trust_status || domainTrust.trustStatus) === 'Healthy' || (domainTrust.trust_status || domainTrust.trustStatus) === 'Success' || (domainTrust.trust_status || domainTrust.trustStatus) === 'Trusted'
                        ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                        : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                    }`}>
                      {domainTrust.trust_status || domainTrust.trustStatus}
                    </span>
                  </div>
                )}

                {/* Machine Password Age */}
                {(domainTrust.machine_password_age_days ?? domainTrust.machinePasswordAgeDays) !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Password Age</span>
                    <span className={`text-sm font-medium ${
                      (domainTrust.machine_password_age_days ?? domainTrust.machinePasswordAgeDays) > 30
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      {domainTrust.machine_password_age_days ?? domainTrust.machinePasswordAgeDays} days
                    </span>
                  </div>
                )}

                {/* Last Checked */}
                {(domainTrust.last_checked || domainTrust.lastChecked) && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Last Checked</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {formatExpiryDate(domainTrust.last_checked || domainTrust.lastChecked)}
                    </span>
                  </div>
                )}

                {/* Error Message if present */}
                {(domainTrust.error_message || domainTrust.errorMessage) && (
                  <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <div className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-red-700 dark:text-red-300">{domainTrust.error_message || domainTrust.errorMessage}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            )
          })()}

          {/* Management URL - Move to bottom */}
          {management.mdmEnrollment?.managementUrl && (
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Management URL</div>
              <div className="text-sm font-mono text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-900 rounded-md px-3 py-2 break-all">
                {management.mdmEnrollment.managementUrl}
              </div>
            </div>
          )}
        </div>

        {/* Right Card - Certificate (40% - 2 columns) */}
        {isEnrolled && (
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            {/* Mac: Certificate Card */}
            {isMac ? (
              <>
                {/* Certificate Wrapper with gradient background */}
                <div className="bg-gradient-to-b from-amber-100/8 to-amber-200/12 dark:from-yellow-900/5 dark:to-yellow-900/15 rounded-lg border border-amber-300/30 dark:border-yellow-700/25 p-5">
                  {/* Header with Seal Icon */}
                  <div className="flex items-start gap-4 mb-5">
                    <div className="flex-shrink-0">
                      <svg className="w-12 h-12 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">Certificate</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Device authentication</p>
                    </div>
                  </div>

                  {/* Certificate Details */}
                  <div className="space-y-4">
                    {/* Identity */}
                    {mdmCertificate.certificate_name && (
                      <div>
                        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Identity</div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {mdmCertificate.certificate_name}
                        </div>
                      </div>
                    )}

                    {/* Issued By */}
                    {mdmCertificate.certificate_issuer && (
                      <div>
                        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Issued By</div>
                        <div className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                          {mdmCertificate.certificate_issuer}
                        </div>
                      </div>
                    )}

                    {/* Valid Until */}
                    {mdmCertificate.certificate_expires && (
                      <div>
                        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Valid Until</div>
                        <div className={`text-sm font-medium ${
                          (() => {
                            try {
                              const expiry = new Date(mdmCertificate.certificate_expires)
                              const now = new Date()
                              const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                              if (daysUntilExpiry < 0) return 'text-red-600 dark:text-red-400'
                              if (daysUntilExpiry < 30) return 'text-yellow-600 dark:text-yellow-400'
                              return 'text-green-600 dark:text-green-400'
                            } catch { return 'text-gray-900 dark:text-white' }
                          })()
                        }`}>
                          {formatExpiryDate(mdmCertificate.certificate_expires)}
                        </div>
                      </div>
                    )}

                    {/* Organization - from ADE Configuration */}
                    {adeConfiguration.organization && (
                      <div>
                        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Organization</div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {adeConfiguration.organization}
                        </div>
                      </div>
                    )}

                    {/* SCEP Server URL */}
                    {mdmCertificate.scep_url && (
                      <div>
                        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">SCEP Server</div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-gray-900 dark:text-white break-all">
                            {mdmCertificate.scep_url}
                          </span>
                          <CopyButton value={mdmCertificate.scep_url} />
                        </div>
                      </div>
                    )}

                    {/* No certificate data - show placeholder */}
                    {!mdmCertificate.certificate_name && !mdmCertificate.certificate_issuer && (
                      <div className="py-2">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Certificate details not available</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Configuration Profiles Count */}
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Configuration Profiles</span>
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">{profileCount}</span>
                  </div>
                </div>
                </>
            ) : !isMac && tenantName ? (
              /* Windows: Certificate Card */
              <>
                {/* Certificate Wrapper with gradient background */}
                <div className="bg-gradient-to-b from-amber-100/8 to-amber-200/12 dark:from-yellow-900/5 dark:to-yellow-900/15 rounded-lg border border-amber-300/30 dark:border-yellow-700/25 p-5">
                  {/* Header with Seal Icon */}
                  <div className="flex items-start gap-4 mb-5">
                    <div className="flex-shrink-0">
                      <svg className="w-12 h-12 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">Certificate</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Entra ID authentication credential</p>
                    </div>
                  </div>

                  {/* Certificate Details */}
                  <div className="space-y-4">
                    {/* Organization */}
                    <div>
                      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Organization</div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {tenantName}
                      </div>
                    </div>

                    {/* Certificate Validity */}
                    {(deviceDetails.device_certificate_validity || deviceDetails.deviceCertificateValidity) && (
                      <div>
                        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Valid Until</div>
                        <div className={`text-sm font-medium ${
                          (() => {
                            try {
                              const validityStr = deviceDetails.device_certificate_validity || deviceDetails.deviceCertificateValidity
                              const match = validityStr.match(/--\s*(\d{4}-\d{2}-\d{2})/)
                              if (match && match[1]) {
                                const expiry = new Date(match[1])
                                const now = new Date()
                                const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                                if (daysUntilExpiry < 0) return 'text-red-600 dark:text-red-400'
                                if (daysUntilExpiry < 30) return 'text-yellow-600 dark:text-yellow-400'
                                return 'text-green-600 dark:text-green-400'
                              }
                              return 'text-gray-900 dark:text-white'
                            } catch { return 'text-gray-900 dark:text-white' }
                          })()
                        }`}>
                          {(() => {
                            const validityStr = deviceDetails.device_certificate_validity || deviceDetails.deviceCertificateValidity
                            const match = validityStr.match(/--\s*(\d{4}-\d{2}-\d{2})/)
                            if (match && match[1]) {
                              return formatExpiryDate(match[1])
                            }
                            return 'Unknown'
                          })()}
                        </div>
                      </div>
                    )}

                    {/* Thumbprint */}
                    {(deviceDetails.thumbprint || deviceDetails.Thumbprint) && (
                      <div>
                        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Thumbprint</div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-gray-900 dark:text-white">
                            {deviceDetails.thumbprint || deviceDetails.Thumbprint}
                          </span>
                          <CopyButton value={deviceDetails.thumbprint || deviceDetails.Thumbprint} />
                        </div>
                      </div>
                    )}

                    {/* Key Container ID */}
                    {(deviceDetails.key_container_id || deviceDetails.keyContainerId) && (
                      <div>
                        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Key Container ID</div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-gray-900 dark:text-white">
                            {deviceDetails.key_container_id || deviceDetails.keyContainerId}
                          </span>
                          <CopyButton value={deviceDetails.key_container_id || deviceDetails.keyContainerId} />
                        </div>
                      </div>
                    )}

                    {/* Key Provider */}
                    {(deviceDetails.key_provider || deviceDetails.keyProvider) && (
                      <div>
                        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Key Provider</div>
                        <div className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                          {deviceDetails.key_provider || deviceDetails.keyProvider}
                        </div>
                      </div>
                    )}

                    {/* TPM Protected */}
                    {(deviceDetails.tmp_protected !== undefined || deviceDetails.tpmProtected !== undefined) && (
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">TPM Protected</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          parseBool(deviceDetails.tmp_protected ?? deviceDetails.tpmProtected)
                            ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                            : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                        }`}>
                          {parseBool(deviceDetails.tmp_protected ?? deviceDetails.tpmProtected) ? 'Yes' : 'No'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* TODO: Resources at bottom - Currently always 0, needs proper policy/app collection */}
                {/* <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Configuration Profiles</span>
                    <span className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{profileCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Compliance Policies</span>
                    <span className="text-lg font-bold text-green-600 dark:text-green-400">{compliancePolicyCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Managed Apps</span>
                    <span className="text-lg font-bold text-orange-600 dark:text-orange-400">{managedAppCount}</span>
                  </div>
                </div> */}
              </>
            ) : (
              /* Fallback: Simple Management Resources */
              <>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Management Resources</h3>
                
                <div className="grid grid-cols-1 gap-6">
                  <div className="text-left">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {profileCount}
                    </div>
                    <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Configuration Profiles
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      MDM policy areas applied
                    </p>
                  </div>
                  
                  <div className="text-left">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {compliancePolicyCount}
                    </div>
                    <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Compliance Policies
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      Security & health requirements
                    </p>
                  </div>
                  
                  <div className="text-left">
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {managedAppCount}
                    </div>
                    <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Managed Apps
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      Apps deployed via MDM
                    </p>
                  </div>
                </div>

                {/* Compliance Status with pill on right */}
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  {compliancePolicyCount > 0 ? (
                    <div className="flex items-center justify-between">
                      <span className="text-base font-medium text-gray-900 dark:text-white">Compliance Policies</span>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                        {compliancePolicyCount} applied
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
              </>
            )}
          </div>
        )}
      </div>

      {/* Configuration Profiles Section (Mac) - Accordion style like SystemTab Background Activity */}
      {isMac && filteredProfiles.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Configuration Profiles</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Management profiles installed on this device ({filteredProfiles.length} of {installedProfiles.length} profiles)
                </p>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  className="block w-full sm:w-64 pl-9 pr-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  placeholder="Search profiles..."
                  value={profileSearch}
                  onChange={(e) => setProfileSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          {/* Profiles Accordion List */}
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredProfiles.map((profile: any, index: number) => {
              const identifier = profile.identifier || `profile-${index}`
              const isExpanded = expandedProfiles.has(identifier)
              const payloads = profile.payloads || []
              const payloadCount = payloads.length || profile.payload_count || 0
              const isVerified = profile.verification_state === 'verified'
              const isRemovalDisallowed = profile.removal_disallowed === true || profile.removal_disallowed === 'true'
              
              return (
                <div key={identifier} className="group">
                  {/* Profile Header Row - Clickable */}
                  <button
                    onClick={() => toggleProfile(identifier)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      {/* Expand/Collapse Icon */}
                      <svg 
                        className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`} 
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      
                      {/* Profile Icon */}
                      <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      
                      {/* Profile Name and Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {profile.name || identifier}
                          </span>
                          {/* Locked Badge */}
                          {isRemovalDisallowed && (
                            <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {profile.organization || 'Unknown Organization'}
                        </div>
                      </div>
                    </div>
                    
                    {/* Right Side Badges */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {payloadCount > 0 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {payloadCount} payload{payloadCount !== 1 ? 's' : ''}
                        </span>
                      )}
                      {/* User scope badge (e.g., "System Level") */}
                      {profile.user && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {profile.user}
                        </span>
                      )}
                      {/* Method badge: Only show for legacy MCX profiles */}
                      {profile.method === 'Emulated' && (
                        <span 
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                          title="Emulated via MCX (Managed Client for X) - legacy method"
                        >
                          Legacy MCX
                        </span>
                      )}
                    </div>
                  </button>
                  
                  {/* Expanded Profile Details */}
                  {isExpanded && (
                    <div className="px-6 pb-4 bg-gray-50 dark:bg-gray-900/30 border-t border-gray-200 dark:border-gray-700">
                      {/* Profile Metadata */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
                        <div>
                          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Identifier</div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-900 dark:text-white font-mono break-all">
                              {identifier}
                            </span>
                            <CopyButton value={identifier} />
                          </div>
                        </div>
                        {profile.uuid && (
                          <div>
                            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">UUID</div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-900 dark:text-white font-mono break-all">
                                {profile.uuid}
                              </span>
                              <CopyButton value={profile.uuid} />
                            </div>
                          </div>
                        )}
                        {profile.install_date && (
                          <div>
                            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Installed</div>
                            <div className="text-xs text-gray-900 dark:text-white font-mono">
                              {typeof profile.install_date === 'string' && profile.install_date.includes('at')
                                ? profile.install_date.split(' at ')[0].split(', ').slice(0, 2).join(', ')
                                : profile.install_date}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Profile Description */}
                      {profile.description && (
                        <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-900/50 rounded-lg">
                          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Description</div>
                          <div className="text-sm text-gray-700 dark:text-gray-300">{profile.description}</div>
                        </div>
                      )}
                      
                      {/* Payloads Section */}
                      {payloads.length > 0 && (
                        <div className="mt-2">
                          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">Payloads</div>
                          <div className="space-y-2">
                            {payloads.map((payload: any, pIndex: number) => (
                              <div key={pIndex} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                                <div className="px-4 py-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                      {payload.display_name || payload.type || 'Unknown Payload'}
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                      {payload.type}
                                    </span>
                                  </div>
                                  
                                  {/* Payload Settings */}
                                  {payload.settings && Object.keys(payload.settings).length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                                      <table className="w-full text-xs">
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                          {Object.entries(payload.settings).map(([key, value], sIndex) => (
                                            <tr key={sIndex}>
                                              <td className="py-1.5 pr-4 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap align-top">
                                                {key}
                                              </td>
                                              <td className="py-1.5 text-gray-900 dark:text-white break-all">
                                                {typeof value === 'boolean' ? (
                                                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                                                    value ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                                  }`}>
                                                    {value ? 'Yes' : 'No'}
                                                  </span>
                                                ) : typeof value === 'object' ? (
                                                  <pre className="text-xs font-mono whitespace-pre-wrap">{JSON.stringify(value, null, 2)}</pre>
                                                ) : (
                                                  String(value)
                                                )}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                  
                                  {/* Raw Data Fallback */}
                                  {payload.raw_data && !payload.settings && (
                                    <details className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                                      <summary className="text-xs text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">
                                        View Raw Data
                                      </summary>
                                      <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-900 rounded text-xs font-mono whitespace-pre-wrap overflow-x-auto">
                                        {payload.raw_data}
                                      </pre>
                                    </details>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Managed Policies Section (Mac) - Grouped by domain */}
      {isMac && filteredPolicies.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Managed Preferences</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Managed settings from /Library/Managed Preferences/ ({filteredPolicies.length} of {managedPolicies.length} domains)
                </p>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  className="block w-full sm:w-64 pl-9 pr-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  placeholder="Search preferences..."
                  value={policySearch}
                  onChange={(e) => setPolicySearch(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          {/* Managed Policies Accordion List */}
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredPolicies.map((policy: any, index: number) => {
              const domain = policy.domain || `domain-${index}`
              const isExpanded = expandedPolicies.has(domain)
              const settings = policy.settings || []
              const settingCount = settings.length || policy.setting_count || 0
              
              return (
                <div key={domain} className="group">
                  {/* Policy Domain Header - Clickable */}
                  <button
                    onClick={() => togglePolicy(domain)}
                    className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Expand/Collapse Icon */}
                      <svg 
                        className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`} 
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      
                      {/* Gear Icon */}
                      <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      
                      {/* Domain Name */}
                      <span className="text-sm font-medium text-gray-900 dark:text-white font-mono truncate">
                        {domain}
                      </span>
                    </div>
                    
                    {/* Settings Count */}
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                      {settingCount} setting{settingCount !== 1 ? 's' : ''}
                    </span>
                  </button>
                  
                  {/* Expanded Settings Table */}
                  {isExpanded && settings.length > 0 && (
                    <div className="px-6 pb-4 bg-gray-50 dark:bg-gray-900/30 border-t border-gray-200 dark:border-gray-700">
                      <table className="w-full text-sm mt-3">
                        <thead>
                          <tr className="text-left">
                            <th className="pb-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Key</th>
                            <th className="pb-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {settings.map((setting: any, sIndex: number) => (
                            <tr key={sIndex}>
                              <td className="py-2 pr-4 text-gray-600 dark:text-gray-400 font-mono text-xs whitespace-nowrap align-top">
                                {setting.name}
                              </td>
                              <td className="py-2 text-gray-900 dark:text-white break-all text-xs">
                                {setting.value === '1' || setting.value === 'true' ? (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                    Yes
                                  </span>
                                ) : setting.value === '0' || setting.value === 'false' ? (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                                    No
                                  </span>
                                ) : (
                                  <span className="font-mono">{setting.value}</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })}
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

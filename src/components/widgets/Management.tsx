/**
 * Management Widget
 * Displays device management enrollment status and details
 * Supports both:
 * - Mac: osquery output with snake_case fields and string booleans
 * - Windows: Legacy camelCase fields with native booleans
 */

import React from 'react'
import { StatBlock, Stat, StatusBadge, EmptyState, Icons, WidgetColors } from './shared'
import { convertPowerShellObjects } from '../../lib/utils/powershell-parser'

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

// Detect MDM provider from server URL
function detectMdmProvider(serverUrl?: string): string | undefined {
  if (!serverUrl) return undefined
  const url = serverUrl.toLowerCase()
  
  if (url.includes('jamf') || url.includes('jamfcloud')) return 'Jamf Pro'
  if (url.includes('manage.microsoft.com') || url.includes('intune')) return 'Microsoft Intune'
  if (url.includes('mosyle')) return 'Mosyle'
  if (url.includes('kandji')) return 'Kandji'
  if (url.includes('addigy')) return 'Addigy'
  if (url.includes('simplemdm')) return 'SimpleMDM'
  if (url.includes('fleetsmith') || url.includes('fleet')) return 'Fleet'
  if (url.includes('airwatch') || url.includes('awmdm') || url.includes('awsmdm')) return 'Workspace ONE'
  if (url.includes('meraki')) return 'Cisco Meraki'
  if (url.includes('hexnode')) return 'Hexnode'
  if (url.includes('filewave')) return 'FileWave'
  if (url.includes('maas360')) return 'MaaS360'
  if (url.includes('mobileiron') || url.includes('ivanti')) return 'Ivanti'
  
  // Fallback: extract hostname as provider hint
  try {
    const hostname = new URL(url).hostname
    // Return a cleaned-up version of the hostname
    return hostname.split('.')[0].replace(/mdm/i, '').replace(/-/g, ' ').trim() || undefined
  } catch {
    return undefined
  }
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

interface Management {
  deviceState?: {
    status?: string
    deviceName?: string
    entraJoined?: boolean
    domainJoined?: boolean
    virtualDesktop?: boolean
    enterpriseJoined?: boolean
  }
  deviceDetails?: {
    deviceId?: string
    thumbprint?: string
    keyProvider?: string
    tmpProtected?: boolean
    keyContainerId?: string
    deviceAuthStatus?: string
    deviceCertificateValidity?: string
    // Enhanced device identification
    intuneDeviceId?: string
    entraObjectId?: string
  }
  mdmEnrollment?: {
    provider?: string
    isEnrolled?: boolean
    managementUrl?: string
    enrollmentType?: string
    serverUrl?: string
  }
  tenantDetails?: {
    tenantName?: string
    tenantId?: string
    mdmUrl?: string
  }
  userState?: {
    ngcSet?: boolean
    canReset?: boolean
    ngcKeyId?: string
    wamDefaultId?: string
    wamDefaultSet?: boolean
    wamDefaultGUID?: string
    workplaceJoined?: boolean
    wamDefaultAuthority?: string
  }
  ssoState?: {
    cloudTgt?: boolean
    entraPrt?: boolean
    onPremTgt?: boolean
    enterprisePrt?: boolean
    entraPrtAuthority?: string
    kerbTopLevelNames?: string
    entraPrtExpiryTime?: string
    entraPrtUpdateTime?: string
    enterprisePrtAuthority?: string
  }
  diagnosticData?: {
    accessType?: string
    clientTime?: string
    keySignTest?: string
    clientErrorCode?: string
    hostNameUpdated?: boolean
    proxyBypassList?: string
    proxyServerList?: string
    osVersionUpdated?: string
    autoDetectSettings?: boolean
    displayNameUpdated?: string
    lastHostNameUpdate?: string
    autoConfigurationUrl?: string
    entraRecoveryEnabled?: boolean
    executingAccountName?: string
  }
  profiles?: Array<{
    id: string
    name: string
    description: string
    type: string
    status: string
    lastModified: string
  }>
  compliancePolicies?: Array<{
    name?: string
    status?: string
    lastEvaluated?: string
  }>
  metadata?: {
    Certificates?: Array<{
      Issuer: string
      Subject: string
      NotValidAfter: string
      NotValidBefore: string
      SigningAlgorithm: string
    }>
  }
}

interface Device {
  id: string
  name: string
  platform?: string
  management?: Management
  // Modular management data
  modules?: {
    management?: Management
  }
}

interface ManagementWidgetProps {
  device: Device
}

export const ManagementWidget: React.FC<ManagementWidgetProps> = ({ device }) => {
  // Access management data from modular structure or fallback to device level
  const rawManagement = device.modules?.management

  // Parse PowerShell objects but preserve original key names (both snake_case and camelCase)
  // Mac uses osquery-style snake_case, Windows uses legacy camelCase
  // Don't normalize keys - handle both formats in extraction
  const management = convertPowerShellObjects(rawManagement) as any

  // Debug logging to see what data we're getting
  console.log('ManagementWidget DEBUG:', {
    deviceName: device?.name,
    platform: device?.platform,
    hasModules: !!device.modules,
    hasManagement: !!management,
    managementKeys: management ? Object.keys(management) : [],
    // Mac osquery mdm data (snake_case)
    mdm_enrollment: management?.mdm_enrollment,
    mdmEnrollment: management?.mdmEnrollment,
    enrolled: management?.mdm_enrollment?.enrolled || management?.mdmEnrollment?.enrolled,
    server_url: management?.mdm_enrollment?.server_url || management?.mdmEnrollment?.serverUrl,
    // Windows data (camelCase)
    deviceState: management?.deviceState,
    entraJoined: management?.deviceState?.entraJoined
  })


  if (!management) {
    return (
      <StatBlock 
        title="Management" 
        subtitle="Device Management Service"
        icon={Icons.management}
        iconColor={WidgetColors.yellow}
      >
        <EmptyState message="Management information not available" />
      </StatBlock>
    )
  }

  // Extract MDM enrollment data - support both Mac (snake_case) and Windows (camelCase) formats
  const mdmEnrollment = management.mdm_enrollment || management.mdmEnrollment || {}
  
  // Parse enrolled status - osquery returns string "true"/"false", Windows returns boolean
  const isEnrolled = parseBool(mdmEnrollment.enrolled) || 
                     parseBool(mdmEnrollment.isEnrolled) || 
                     parseBool(mdmEnrollment.is_enrolled) || 
                     false
  
  // Get server URL (snake_case from osquery, camelCase from Windows)
  const serverUrl = mdmEnrollment.server_url || mdmEnrollment.serverUrl
  
  // Detect or use provided MDM provider
  const provider = mdmEnrollment.provider || detectMdmProvider(serverUrl)
  
  // Enrollment type - Mac uses ADE/User Approved, Windows uses Entra/Domain Join
  // Detect Mac from platform field OR from Mac-specific MDM fields
  const platformLower = device.platform?.toLowerCase() || ''
  const isMac = platformLower === 'macos' || 
                platformLower === 'darwin' ||
                platformLower === 'mac' ||
                detectMacFromData(mdmEnrollment)
  let enrollmentType: string | undefined
  
  if (isMac) {
    // Mac enrollment types from osquery mdm table
    const installedFromDep = parseBool(mdmEnrollment.installed_from_dep || mdmEnrollment.installedFromDep)
    const userApproved = parseBool(mdmEnrollment.user_approved || mdmEnrollment.userApproved)
    
    if (installedFromDep) {
      enrollmentType = 'ADE Enrolled'
    } else if (userApproved) {
      enrollmentType = 'User Approved'
    } else if (isEnrolled) {
      enrollmentType = 'MDM Enrolled'
    }
  } else {
    // Windows enrollment types
    const rawEnrollmentType = mdmEnrollment.enrollmentType || mdmEnrollment.enrollment_type
    enrollmentType = rawEnrollmentType
    if (enrollmentType === 'Hybrid Entra Join') enrollmentType = 'Domain Joined'
    if (enrollmentType === 'Entra Join') enrollmentType = 'Entra Joined'
  }

  // Device authentication and profile info
  const deviceDetails = management.deviceDetails || management.device_details || {}
  const deviceAuthStatus = deviceDetails.deviceAuthStatus || deviceDetails.device_auth_status
  
  // Profile count - Mac uses installed_profiles, Windows uses profiles
  const installedProfiles = management.installed_profiles || management.installedProfiles || []
  const profiles = management.profiles || []
  const profileCount = installedProfiles.length || profiles.length || 0

  // Device identification information
  const intuneDeviceId = deviceDetails.intuneDeviceId || deviceDetails.intune_device_id
  const entraObjectId = deviceDetails.entraObjectId || deviceDetails.entra_object_id
  
  // Mac compliance status (from osquery security checks)
  const complianceStatus = management.complianceStatus || management.compliance_status || {}
  const complianceScore = complianceStatus.complianceScore ?? complianceStatus.compliance_score
  
  // Mac device identifiers
  const deviceIdentifiers = management.deviceIdentifiers || management.device_identifiers || {}
  const macSerialNumber = deviceIdentifiers.serialNumber || deviceIdentifiers.serial_number || deviceIdentifiers.hardware_serial
  const macUuid = deviceIdentifiers.uuid
  const macAssetTag = deviceIdentifiers.assetTag || deviceIdentifiers.asset_tag

  // Helper function to get enrollment type color
  const getEnrollmentTypeColor = (type?: string) => {
    if (!type) return 'info'
    
    const typeLower = type.toLowerCase()
    
    // Mac enrollment types
    if (typeLower.includes('ade')) return 'success'        // ADE = best, fully managed
    if (typeLower.includes('user approved')) return 'info' // User approved = good
    if (typeLower.includes('mdm enrolled')) return 'info'  // Basic MDM
    
    // Windows enrollment types
    if (typeLower.includes('entra join') || typeLower.includes('azure ad join')) return 'success'
    if (typeLower.includes('domain join')) return 'info'
    if (typeLower.includes('workplace join')) return 'warning'
    
    return 'info'
  }

  return (
    <StatBlock 
      title="Management" 
      subtitle="Device Management Service"
      icon={Icons.management}
      iconColor={WidgetColors.yellow}
    >
      {/* Provider prominently displayed first - made smaller */}
      {provider && (
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">Provider</span>
          <span className="text-base font-medium text-gray-900 dark:text-white">{provider}</span>
        </div>
      )}

      {/* Primary Enrollment Status */}
      <StatusBadge
        label="Enrollment"
        status={isEnrolled ? 'Enrolled' : 'Not Enrolled'}
        type={isEnrolled ? 'success' : 'error'}
      />

      {/* Enrollment Type (replaces Device Status) - with colors */}
      {enrollmentType && (
        <StatusBadge
          label="Enrollment Type"
          status={enrollmentType}
          type={getEnrollmentTypeColor(enrollmentType)}
        />
      )}

      {isEnrolled && (
        <>
          {/* Windows: Device Authentication Status */}
          {deviceAuthStatus && (
            <StatusBadge
              label="Device Auth"
              status={deviceAuthStatus === 'SUCCESS' ? 'Success' : deviceAuthStatus}
              type={deviceAuthStatus === 'SUCCESS' ? 'success' : 'error'}
            />
          )}

          {/* Windows: Intune Device ID with copy button */}
          {intuneDeviceId && (
            <Stat 
              label="Intune ID" 
              value={intuneDeviceId} 
              isMono 
              showCopyButton
            />
          )}

          {/* Windows: Entra Object ID with copy button */}
          {entraObjectId && (
            <Stat 
              label="Object ID" 
              value={entraObjectId} 
              isMono 
              showCopyButton
            />
          )}

          {/* Mac: Compliance Score */}
          {isMac && complianceScore !== undefined && (
            <StatusBadge
              label="Compliance"
              status={`${complianceScore}%`}
              type={complianceScore >= 80 ? 'success' : complianceScore >= 60 ? 'warning' : 'error'}
            />
          )}

          {/* Mac: Server URL (if no specific provider detected) */}
          {isMac && serverUrl && !provider && (
            <Stat 
              label="MDM Server" 
              value={serverUrl.replace(/^https?:\/\//, '').split('/')[0]} 
            />
          )}

          {/* Profiles count */}
          {profileCount > 0 && (
            <Stat 
              label="Profiles" 
              value={profileCount.toString()} 
            />
          )}
        </>
      )}
    </StatBlock>
  )
}

export default ManagementWidget

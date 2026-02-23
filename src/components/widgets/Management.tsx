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
      const parsed = JSON.parse(mdmCertificate.output)
      return {
        push_topic: parsed.push_topic,
        scep_url: parsed.scep_url,
        certificate_name: parsed.certificate_name,
        certificate_subject: parsed.certificate_subject,
        certificate_issuer: parsed.certificate_issuer,
        certificate_expires: parsed.certificate_expires,
        mdm_provider: parsed.mdm_provider
      }
    } catch {
      // If parsing fails, fall through to direct access
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
    if (issuer.includes('mosyle')) return 'Mosyle'
    if (issuer.includes('kandji')) return 'Kandji'
    if (issuer.includes('microsoft')) return 'Microsoft Intune'
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
  
  // Parse MDM certificate data for provider detection
  const mdmCertificate = management.mdm_certificate || management.mdmCertificate
  const certificateData = parseMdmCertificate(mdmCertificate)
  
  // Parse enrolled status - osquery returns string "true"/"false", Windows returns boolean
  const isEnrolled = parseBool(mdmEnrollment.enrolled) || 
                     parseBool(mdmEnrollment.isEnrolled) || 
                     parseBool(mdmEnrollment.is_enrolled) || 
                     false
  
  // Get server URL (snake_case from osquery, camelCase from Windows)
  const serverUrl = mdmEnrollment.server_url || mdmEnrollment.serverUrl
  
  // Detect or use provided MDM provider with certificate data priority
  const provider = mdmEnrollment.provider || detectMdmProvider(serverUrl, certificateData)
  
  // Enrollment type - Mac uses ADE/User Approved, Windows uses Entra/Domain Join
  // Detect Mac from platform field OR from Mac-specific MDM fields
  const platformLower = device.platform?.toLowerCase() || ''
  const isMac = platformLower === 'macos' || 
                platformLower === 'darwin' ||
                platformLower === 'mac' ||
                detectMacFromData(mdmEnrollment)
  let enrollmentType: string | undefined
  
  if (isMac) {
    // Mac enrollment types from osquery mdm table - match ManagementTab naming
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
    // Windows enrollment types
    const rawEnrollmentType = mdmEnrollment.enrollmentType || mdmEnrollment.enrollment_type
    enrollmentType = rawEnrollmentType
    if (enrollmentType === 'Hybrid Entra Join') enrollmentType = 'Domain Joined'
    if (enrollmentType === 'Entra Join') enrollmentType = 'Entra Joined'
  }

  // Device authentication and profile info
  const deviceDetails = management.deviceDetails || management.device_details || {}
  const _deviceAuthStatus = deviceDetails.deviceAuthStatus || deviceDetails.device_auth_status
  
  // Profile count - Mac uses installed_profiles, Windows uses profiles
  const installedProfiles = management.installed_profiles || management.installedProfiles || []
  const profiles = management.profiles || []
  const _profileCount = installedProfiles.length || profiles.length || 0

  // Device identification information
  const intuneDeviceId = deviceDetails.intuneDeviceId || deviceDetails.intune_device_id
  const entraObjectId = deviceDetails.entraObjectId || deviceDetails.entra_object_id
  
  // Organization - from ADE configuration or tenant details
  const adeConfiguration = management.ade_configuration || management.adeConfiguration || {}
  const tenantDetails = management.tenant_details || management.tenantDetails || {}
  const _organization = adeConfiguration.organization || tenantDetails.tenant_name || tenantDetails.tenantName
  
  // Hardware UUID - from top-level device data
  const hardwareUuid = (device as any).deviceId
  
  // Mac compliance status (from osquery security checks)
  const complianceStatus = management.complianceStatus || management.compliance_status || {}
  const _complianceScore = complianceStatus.complianceScore ?? complianceStatus.compliance_score
  
  // Mac device identifiers
  const deviceIdentifiers = management.deviceIdentifiers || management.device_identifiers || {}
  const _macSerialNumber = deviceIdentifiers.serialNumber || deviceIdentifiers.serial_number || deviceIdentifiers.hardware_serial
  const _macUuid = deviceIdentifiers.uuid
  const _macAssetTag = deviceIdentifiers.assetTag || deviceIdentifiers.asset_tag

  // Helper function to get enrollment type color
  const _getEnrollmentTypeColor = (type?: string) => {
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

  // Format certificate expiry
  const formatExpiryDate = (dateStr?: string) => {
    if (!dateStr) return 'Unknown'
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return dateStr
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return dateStr
    }
  }
  
  return (
    <StatBlock 
      title="Management" 
      subtitle="Device Management Service"
      icon={Icons.management}
      iconColor={WidgetColors.yellow}
    >
      {/* Provider */}
      {provider && (
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">Provider</span>
          <span className="text-base font-medium text-gray-900 dark:text-white">{provider}</span>
        </div>
      )}

      {/* Enrollment Status */}
      <StatusBadge
        label="Enrollment"
        status={isEnrolled ? 'Enrolled' : 'Not Enrolled'}
        type={isEnrolled ? 'success' : 'error'}
      />

      {/* Enrollment Type - Automated Device Enrollment and Entra Joined are green */}
      {enrollmentType && (
        <StatusBadge
          label="Enrollment Type"
          status={enrollmentType}
          type={enrollmentType.includes('Automated') || enrollmentType.includes('Entra Joined') ? 'success' : enrollmentType.includes('User Approved') ? 'warning' : 'info'}
        />
      )}

      {/* Windows: Autopilot Activated */}
      {!isMac && (management.autopilot_config || management.autopilotConfig) && (
        <StatusBadge
          label="Autopilot Activated"
          status={parseBool((management.autopilot_config || management.autopilotConfig).activated) ? 'Yes' : 'No'}
          type={parseBool((management.autopilot_config || management.autopilotConfig).activated) ? 'success' : 'info'}
        />
      )}

      {isEnrolled && (
        <>
          {/* Server URL - moved above certificate */}
          {serverUrl && (
            <Stat 
              label="Server" 
              value={serverUrl.replace(/^https?:\/\//, '').split('/')[0]} 
              showCopyButton
            />
          )}
          
          {/* Certificate Expiry - renamed from Certificate Valid */}
          {certificateData.certificate_expires && (
            <Stat 
              label="Certificate Expiry" 
              value={formatExpiryDate(certificateData.certificate_expires)} 
            />
          )}

          {/* Device IDs section - all under horizontal line with consistent formatting */}
          {(hardwareUuid || (!isMac && (intuneDeviceId || entraObjectId))) && (
            <div className="mt-3 pt-2 border-t border-transparent space-y-2">
              {/* Hardware UUID - hide for Intune provider */}
              {hardwareUuid && !provider?.toLowerCase().includes('intune') && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">Hardware UUID</dt>
                  <dd className="mt-1 flex items-center gap-2 min-w-0">
                    <span className="font-mono text-gray-900 dark:text-gray-100 truncate" style={{ fontSize: '11px' }} title={hardwareUuid}>{hardwareUuid}</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(hardwareUuid)}
                      className="flex-shrink-0 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      title="Copy to clipboard"
                    >
                      <svg className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </dd>
                </div>
              )}
              
              {/* Windows: Intune Device ID - only show if provider is Intune */}
              {!isMac && provider?.toLowerCase().includes('intune') && intuneDeviceId && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">Intune UUID</dt>
                  <dd className="mt-1 flex items-center gap-2 min-w-0">
                    <span className="font-mono text-gray-900 dark:text-gray-100 truncate" style={{ fontSize: '11px' }} title={intuneDeviceId}>{intuneDeviceId}</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(intuneDeviceId)}
                      className="flex-shrink-0 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      title="Copy to clipboard"
                    >
                      <svg className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </dd>
                </div>
              )}
              
              {/* Windows: Entra Object ID - only show if provider is NOT Intune */}
              {!isMac && !provider?.toLowerCase().includes('intune') && entraObjectId && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">Object ID</dt>
                  <dd className="mt-1 flex items-center gap-2 min-w-0">
                    <span className="font-mono text-gray-900 dark:text-gray-100 truncate" style={{ fontSize: '11px' }} title={entraObjectId}>{entraObjectId}</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(entraObjectId)}
                      className="flex-shrink-0 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      title="Copy to clipboard"
                    >
                      <svg className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </dd>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </StatBlock>
  )
}

export default ManagementWidget

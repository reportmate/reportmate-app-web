/**
 * Management Widget
 * Displays device management enrollment status and details
 */

import React from 'react'
import { StatBlock, Stat, StatusBadge, EmptyState, Icons, WidgetColors } from './shared'
import { convertPowerShellObjects } from '../../lib/utils/powershell-parser'

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

  // Parse PowerShell objects to proper JavaScript objects
  const management = convertPowerShellObjects(rawManagement)

  // Debug logging to see what data we're getting
  console.log('🔧 ManagementWidget DEBUG:', {
    deviceName: device?.name,
    hasModules: !!device.modules,
    hasManagement: !!management,
    managementKeys: management ? Object.keys(management) : [],
    hasDeviceState: !!management?.deviceState,
    deviceState: management?.deviceState,
    entraJoined: management?.deviceState?.entraJoined,
    ssoState: management?.ssoState,
    entraPrt: management?.ssoState?.entraPrt,
    userState: management?.userState,
    ngcSet: management?.userState?.ngcSet
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

  // Extract key data from the management structure
  const isEnrolled = management.mdmEnrollment?.isEnrolled || false
  const provider = management.mdmEnrollment?.provider
  const enrollmentType = management.mdmEnrollment?.enrollmentType
  const deviceAuthStatus = management.deviceDetails?.deviceAuthStatus
  const profileCount = management.profiles?.length || 0

  // Device identification information
  const intuneDeviceId = management.deviceDetails?.intuneDeviceId
  const entraObjectId = management.deviceDetails?.entraObjectId

  // Helper function to get enrollment type color
  const getEnrollmentTypeColor = (type?: string) => {
    if (!type) return 'info'
    
    switch (type.toLowerCase()) {
      case 'entra join':
      case 'entra joined':
      case 'azure ad join':
        return 'success'
      case 'domain join':
      case 'domain joined':
        return 'info'
      case 'workplace join':
      case 'workplace joined':
        return 'warning'
      default:
        return 'info'
    }
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
          {/* Device Authentication Status - moved up */}
          {deviceAuthStatus && (
            <StatusBadge
              label="Device Auth"
              status={deviceAuthStatus === 'SUCCESS' ? 'Success' : deviceAuthStatus}
              type={deviceAuthStatus === 'SUCCESS' ? 'success' : 'error'}
            />
          )}

          {/* Intune Device ID with copy button */}
          {intuneDeviceId && (
            <Stat 
              label="Intune ID" 
              value={intuneDeviceId} 
              isMono 
              showCopyButton
            />
          )}

          {/* Entra Object ID with copy button */}
          {entraObjectId && (
            <Stat 
              label="Object ID" 
              value={entraObjectId} 
              isMono 
              showCopyButton
            />
          )}

          {/* Profiles count only */}
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

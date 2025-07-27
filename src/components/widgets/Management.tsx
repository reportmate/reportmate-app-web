/**
 * Management Widget
 * Displays device management enrollment status and details
 */

import React from 'react'
import { StatBlock, Stat, StatusBadge, EmptyState, Icons, WidgetColors } from './shared'

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
  const management = device.modules?.management || device.management

  if (!management) {
    return (
      <StatBlock 
        title="Management" 
        subtitle="Enrollment and MDM status"
        icon={Icons.management}
        iconColor={WidgetColors.green}
      >
        <EmptyState message="Management information not available" />
      </StatBlock>
    )
  }

  // Extract key data from the management structure
  const isEnrolled = management.mdmEnrollment?.isEnrolled || false
  const provider = management.mdmEnrollment?.provider
  const enrollmentType = management.mdmEnrollment?.enrollmentType
  const deviceStatus = management.deviceState?.status
  const tenantName = management.tenantDetails?.tenantName
  const deviceAuthStatus = management.deviceDetails?.deviceAuthStatus
  const profileCount = management.profiles?.length || 0
  const certificateCount = management.metadata?.Certificates?.length || 0

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

  const getConnectionStatusColor = (status: boolean) => {
    return status ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
  }

  return (
    <StatBlock 
      title="Management" 
      subtitle="Enrollment and MDM status"
      icon={Icons.management}
      iconColor={WidgetColors.green}
    >
      {/* Primary Enrollment Status */}
      <StatusBadge
        label="Enrollment"
        status={isEnrolled ? 'Enrolled' : 'Not Enrolled'}
        type={isEnrolled ? 'success' : 'error'}
      />

      {/* Device Status */}
      {deviceStatus && (
        <StatusBadge
          label="Device Status"
          status={deviceStatus}
          type={deviceStatus.includes('Joined') ? 'success' : 'warning'}
        />
      )}

      {isEnrolled && (
        <>
          {/* Core Management Info */}
          {provider && (
            <Stat 
              label="Provider" 
              value={provider} 
            />
          )}

          {enrollmentType && (
            <Stat 
              label="Enrollment Type" 
              value={enrollmentType} 
            />
          )}

          {tenantName && (
            <Stat 
              label="Organization" 
              value={tenantName} 
            />
          )}

          {/* Device Authentication Status */}
          {deviceAuthStatus && (
            <StatusBadge
              label="Device Auth"
              status={deviceAuthStatus}
              type={deviceAuthStatus === 'SUCCESS' ? 'success' : 'error'}
            />
          )}

          {/* Compliance Status */}
          {management.compliancePolicies && management.compliancePolicies.length > 0 ? (
            <Stat 
              label="Compliance Policies" 
              value={`${management.compliancePolicies.length} policies`} 
            />
          ) : (
            <StatusBadge
              label="Compliance"
              status="No policies applied"
              type="info"
            />
          )}

          {/* Resource Counts */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            {profileCount > 0 && (
              <Stat 
                label="Profiles" 
                value={profileCount.toString()} 
              />
            )}

            {certificateCount > 0 && (
              <Stat 
                label="Certificates" 
                value={certificateCount.toString()} 
              />
            )}
          </div>

          {/* Identity & Authentication Details */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Identity & Authentication
            </div>
            <div className="space-y-2">
              {/* Domain Status */}
              {management.deviceState?.entraJoined && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Entra Joined:</span>
                  <span className="text-green-600 dark:text-green-400 font-medium">✓ Yes</span>
                </div>
              )}
              
              {management.deviceState?.domainJoined && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Domain Joined:</span>
                  <span className="text-green-600 dark:text-green-400 font-medium">✓ Yes</span>
                </div>
              )}

              {/* SSO Authentication State */}
              {management.ssoState?.entraPrt !== undefined && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Entra PRT:</span>
                  <span className={`font-medium ${getConnectionStatusColor(management.ssoState.entraPrt)}`}>
                    {management.ssoState.entraPrt ? '✓ Active' : '✗ Inactive'}
                  </span>
                </div>
              )}

              {management.ssoState?.cloudTgt !== undefined && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Cloud TGT:</span>
                  <span className={`font-medium ${getConnectionStatusColor(management.ssoState.cloudTgt)}`}>
                    {management.ssoState.cloudTgt ? '✓ Active' : '✗ Inactive'}
                  </span>
                </div>
              )}

              {/* Windows Hello Status */}
              {management.userState?.ngcSet !== undefined && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Windows Hello:</span>
                  <span className={`font-medium ${getConnectionStatusColor(management.userState.ngcSet)}`}>
                    {management.userState.ngcSet ? '✓ Configured' : '✗ Not Set'}
                  </span>
                </div>
              )}

              {/* PRT Expiry */}
              {management.ssoState?.entraPrtExpiryTime && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">PRT Expires:</span>
                  <span className="text-gray-900 dark:text-gray-100 font-mono text-xs">
                    {formatExpiryDate(management.ssoState.entraPrtExpiryTime)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Management URLs */}
          {management.mdmEnrollment?.managementUrl && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Stat 
                label="Management URL" 
                value={management.mdmEnrollment.managementUrl} 
                isMono 
              />
            </div>
          )}
        </>
      )}
    </StatBlock>
  )
}

export default ManagementWidget

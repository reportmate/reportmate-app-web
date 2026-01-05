/**
 * Management Widget
 * Displays device management enrollment status and details
 * 
 * SNAKE_CASE: All properties match API response format directly
 */

import React from 'react'
import { StatBlock, Stat, StatusBadge, EmptyState, Icons, WidgetColors } from './shared'

interface Device {
  id: string
  name: string
  platform?: string
  // Modular management data - snake_case from API
  modules?: {
    management?: {
      device_state?: {
        status?: string
        device_name?: string
        entra_joined?: boolean
        domain_joined?: boolean
        virtual_desktop?: boolean
        enterprise_joined?: boolean
      }
      device_details?: {
        device_id?: string
        thumbprint?: string
        key_provider?: string
        tmp_protected?: boolean
        key_container_id?: string
        device_auth_status?: string
        device_certificate_validity?: string
        intune_device_id?: string
        entra_object_id?: string
      }
      mdm_enrollment?: {
        provider?: string
        is_enrolled?: boolean
        enrollment_id?: string
        enrollment_type?: string
        user_principal_name?: string
      }
      tenant_details?: {
        tenant_name?: string
        tenant_id?: string
        mdm_url?: string
      }
      user_state?: {
        ngc_set?: boolean
        can_reset?: boolean
        ngc_key_id?: string
        wam_default_id?: string
        wam_default_set?: boolean
        wam_default_guid?: string
        workplace_joined?: boolean
        wam_default_authority?: string
      }
      sso_state?: {
        cloud_tgt?: boolean
        entra_prt?: boolean
        on_prem_tgt?: boolean
        enterprise_prt?: boolean
        entra_prt_authority?: string
        kerb_top_level_names?: string
        enterprise_prt_authority?: string
      }
      domain_trust?: {
        domain_name?: string
        trust_status?: string
        error_message?: string
        domain_controller?: string
        secure_channel_valid?: boolean
        computer_account_exists?: boolean
      }
      diagnostic_data?: {
        access_type?: string
        client_time?: string
        key_sign_test?: string
        client_error_code?: string
      }
      profiles?: any[]
      last_sync?: string
      collected_at?: string
      device_id?: string
      module_id?: string
    }
  }
}

interface ManagementWidgetProps {
  device: Device
}

export const ManagementWidget: React.FC<ManagementWidgetProps> = ({ device }) => {
  // Access management data from modules - snake_case from API
  const management = device.modules?.management

  console.log('ManagementWidget DEBUG:', {
    deviceName: device?.name,
    hasModules: !!device.modules,
    hasManagement: !!management,
    managementKeys: management ? Object.keys(management) : [],
    device_state: management?.device_state,
    mdm_enrollment: management?.mdm_enrollment
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

  // Extract key data from the management structure - snake_case from API
  const isEnrolled = management.mdm_enrollment?.is_enrolled || false
  const provider = management.mdm_enrollment?.provider
  const rawEnrollmentType = management.mdm_enrollment?.enrollment_type
  const deviceAuthStatus = management.device_details?.device_auth_status
  const profileCount = management.profiles?.length || 0

  // Device identification information - snake_case from API
  const intuneDeviceId = management.device_details?.intune_device_id
  const entraObjectId = management.device_details?.entra_object_id

  // Transform enrollment type display name
  let enrollmentType = rawEnrollmentType
  if (enrollmentType === 'Hybrid Entra Join') enrollmentType = 'Domain Joined'
  if (enrollmentType === 'Entra Joined') enrollmentType = 'Entra Joined'

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
      {/* Provider prominently displayed first */}
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

      {/* Enrollment Type with colors */}
      {enrollmentType && (
        <StatusBadge
          label="Enrollment Type"
          status={enrollmentType}
          type={getEnrollmentTypeColor(enrollmentType)}
        />
      )}

      {isEnrolled && (
        <>
          {/* Device Authentication Status */}
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

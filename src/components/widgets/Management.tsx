/**
 * Management Widget
 * Displays device management enrollment status and details
 */

import React from 'react'
import { StatBlock, Stat, StatusBadge, EmptyState, Icons, WidgetColors } from './shared'

interface Management {
  enrolled: boolean
  enrolled_via_dep?: boolean
  server_url?: string | null
  user_approved?: boolean
  organization?: string | null
  department?: string | null
  vendor?: string | null
  profiles?: Array<{
    id: string
    name: string
    description: string
    type: string
    status: string
    lastModified: string
  }>
  restrictions?: {
    app_installation?: string
    camera_disabled?: boolean
    screen_recording_disabled?: boolean
    system_preferences_disabled?: boolean
    touch_id_disabled?: boolean
    siri_disabled?: boolean
  }
  apps?: Array<{
    id: string
    name: string
    bundleId: string
    status: string
    source: string
    lastUpdate: string
  }>
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
  const management = device.management || device.modules?.management

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

  return (
    <StatBlock 
      title="Management" 
      subtitle="Enrollment and MDM status"
      icon={Icons.management}
      iconColor={WidgetColors.green}
    >
      {/* Enrollment Status */}
      <StatusBadge
        label="Enrollment"
        status={management.enrolled ? 'Enrolled' : 'Not Enrolled'}
        type={management.enrolled ? 'success' : 'error'}
      />

      {management.enrolled && (
        <>
          {/* Vendor/Organization */}
          {(management.vendor || management.organization) && (
            <Stat 
              label="Vendor" 
              value={(management.vendor || management.organization) || ''} 
            />
          )}

          {/* Platform-specific details */}
          {device.platform === 'macOS' && (
            <>
              {management.enrolled_via_dep !== undefined && (
                <StatusBadge
                  label="DEP Enrollment"
                  status={management.enrolled_via_dep ? 'Yes' : 'No'}
                  type={management.enrolled_via_dep ? 'success' : 'warning'}
                />
              )}
              {management.user_approved !== undefined && (
                <StatusBadge
                  label="User Approved"
                  status={management.user_approved ? 'Yes' : 'No'}
                  type={management.user_approved ? 'success' : 'warning'}
                />
              )}
            </>
          )}

          {device.platform === 'Windows' && (
            <>
              {management.server_url && (
                <Stat 
                  label="Server URL" 
                  value={management.server_url} 
                  isMono 
                />
              )}
            </>
          )}

          {/* Department */}
          {management.department && (
            <Stat label="Department" value={management.department} />
          )}

          {/* Profile count */}
          {management.profiles && management.profiles.length > 0 && (
            <Stat 
              label="Profiles" 
              value={`${management.profiles.length} installed`} 
            />
          )}

          {/* Managed apps count */}
          {management.apps && management.apps.length > 0 && (
            <Stat 
              label="Managed Apps" 
              value={`${management.apps.length} apps`} 
            />
          )}
        </>
      )}
    </StatBlock>
  )
}

export default ManagementWidget

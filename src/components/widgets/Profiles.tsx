/**
 * Profiles Widget
 * Displays configuration profiles and their status
 */

import React from 'react'
import { StatBlock, Stat, StatusBadge, EmptyState, Icons, WidgetColors } from './shared'

interface ProfileInfo {
  id: string
  name: string
  description?: string
  type?: string
  organization?: string
  version?: string
  status?: string
  installDate?: string
  lastModified?: string
  isRemovable?: boolean
  hasPasscode?: boolean
  payloads?: Array<{
    type: string
    displayName?: string
  }>
}

interface ProfilesData {
  totalProfiles: number
  profiles: ProfileInfo[]
  installedProfiles?: ProfileInfo[]
  managedProfiles?: ProfileInfo[]
  userProfiles?: ProfileInfo[]
}

interface Device {
  id: string
  name: string
  // Modular profiles data
  profiles?: ProfilesData
}

interface ProfilesWidgetProps {
  device: Device
}

export const ProfilesWidget: React.FC<ProfilesWidgetProps> = ({ device }) => {
  // Access profiles data from modular structure
  const profiles = device.profiles
  const hasProfilesInfo = profiles && profiles.profiles && profiles.profiles.length > 0

  if (!hasProfilesInfo) {
    return (
      <StatBlock 
        title="Profiles" 
        subtitle="Configuration profiles"
        icon={Icons.profiles}
        iconColor={WidgetColors.blue}
      >
        <EmptyState message="Profile information not available" />
      </StatBlock>
    )
  }

  const managedProfiles = profiles.profiles.filter(p => p.organization).length
  const userProfiles = profiles.profiles.filter(p => !p.organization).length
  const profilesWithPasscode = profiles.profiles.filter(p => p.hasPasscode).length
  const removableProfiles = profiles.profiles.filter(p => p.isRemovable).length

  return (
    <StatBlock 
      title="Profiles" 
      subtitle="Configuration profiles"
      icon={Icons.profiles}
      iconColor={WidgetColors.blue}
    >
      <Stat label="Total Profiles" value={profiles.totalProfiles?.toString() || profiles.profiles.length.toString()} />
      
      {managedProfiles > 0 && (
        <Stat label="Managed Profiles" value={managedProfiles.toString()} />
      )}
      
      {userProfiles > 0 && (
        <Stat label="User Profiles" value={userProfiles.toString()} />
      )}
      
      {profilesWithPasscode > 0 && (
        <Stat label="Passcode Protected" value={profilesWithPasscode.toString()} />
      )}
      
      {removableProfiles > 0 && (
        <Stat label="Removable" value={removableProfiles.toString()} />
      )}
      
      {/* Show recent profiles */}
      {profiles.profiles.slice(0, 3).map((profile, index) => (
        <div key={profile.id || index} className="pt-2 border-t border-gray-200 dark:border-gray-700 first:border-t-0 first:pt-0">
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {profile.name}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {profile.organization && `${profile.organization} `}
            {profile.type || 'Configuration Profile'}
          </div>
          {profile.status && (
            <StatusBadge
              label=""
              status={profile.status}
              type={profile.status === 'Installed' ? 'success' : 'warning'}
            />
          )}
        </div>
      ))}
      
      {profiles.profiles.length > 3 && (
        <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
          +{profiles.profiles.length - 3} more profiles
        </div>
      )}
    </StatBlock>
  )
}

export default ProfilesWidget

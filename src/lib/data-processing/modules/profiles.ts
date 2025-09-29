/**
 * Profiles Module - Reader Only
 * Frontend reads pre-processed profiles data from device collection
 * NO heavy processing - device should provide clean, standardized data
 */

export interface ProfilesInfo {
  totalProfiles: number
  systemProfiles: number
  userProfiles: number
  profiles: ProfileItem[]
  lastUpdated?: string
}

export interface ProfileItem {
  id: string
  displayName: string
  uuid: string
  type: 'Device' | 'User'
  installDate: string
  organization?: string
  description?: string
  payloads?: any[]
  isRemovable: boolean
  hasRemovalPasscode: boolean
  isEncrypted: boolean
}

/**
 * Extract profiles information from device modules
 * READER ONLY: Expects device to provide pre-processed, clean data
 */
export function extractProfiles(deviceModules: any): ProfilesInfo {
  if (!deviceModules?.profiles) {
    console.log('[PROFILES MODULE] No profiles data found in modules')
    return {
      totalProfiles: 0,
      systemProfiles: 0,
      userProfiles: 0,
      profiles: []
    }
  }

  const profilesData = deviceModules.profiles
  
  console.log('[PROFILES MODULE] Reading pre-processed profiles data:', {
    hasIntunePolicies: !!profilesData.intunePolicies,
    policyCount: Array.isArray(profilesData.intunePolicies) ? profilesData.intunePolicies.length : 0,
    hasConfigurationProfiles: !!profilesData.configurationProfiles,
    configProfileCount: Array.isArray(profilesData.configurationProfiles) ? profilesData.configurationProfiles.length : 0
  })

  // Process profiles from different sources
  const profiles: ProfileItem[] = []

  // Add Intune policies - Ensure it's an array
  if (profilesData.intunePolicies && Array.isArray(profilesData.intunePolicies)) {
    profilesData.intunePolicies.forEach((policy: any) => {
      profiles.push({
        id: policy.policyId || 'unknown',
        displayName: policy.policyName || 'Unknown Policy',
        uuid: policy.policyId || 'unknown',
        type: 'Device',
        installDate: policy.assignedDate || policy.lastSync || '',
        organization: 'Microsoft Intune',
        description: policy.policyType || '',
        payloads: Array.isArray(policy.settings) ? policy.settings : [],
        isRemovable: policy.isRemovable !== false,
        hasRemovalPasscode: !!policy.removalPasscode,
        isEncrypted: !!policy.isEncrypted
      })
    })
  }

  // Add configuration profiles - Ensure it's an array
  if (profilesData.configurationProfiles && Array.isArray(profilesData.configurationProfiles)) {
    profilesData.configurationProfiles.forEach((profile: any) => {
      profiles.push({
        id: profile.profileId || profile.uuid || 'unknown',
        displayName: profile.profileName || profile.displayName || 'Unknown Profile',
        uuid: profile.uuid || profile.profileId || 'unknown',
        type: profile.type || 'Device',
        installDate: profile.installDate || '',
        organization: profile.organization || '',
        description: profile.description || '',
        payloads: Array.isArray(profile.payloads) ? profile.payloads : [],
        isRemovable: profile.isRemovable !== false,
        hasRemovalPasscode: !!profile.removalPasscode,
        isEncrypted: !!profile.isEncrypted
      })
    })
  }

  const systemProfiles = profiles.filter(p => p.type === 'Device').length
  const userProfiles = profiles.filter(p => p.type === 'User').length

  return {
    totalProfiles: profiles.length,
    systemProfiles,
    userProfiles,
    profiles,
    lastUpdated: profilesData.lastUpdated
  }
}

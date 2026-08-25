/**
 * Profiles Module - Reader Only
 * Frontend reads pre-processed profiles data from device collection
 * Handles both Windows (structured) and Mac (raw text) formats
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
 * Parse macOS profiles -C/-P output into profile identifiers
 * Format: "_computerlevel[1] attribute: profileIdentifier: com.example.macadmin.OfficePrefs _computerlevel[2]..."
 */
function parseMacProfilesOutput(rawText: string): ProfileItem[] {
  if (!rawText || typeof rawText !== 'string') return []
  
  const profiles: ProfileItem[] = []
  
  // Extract profile identifiers using regex
  // Pattern matches: profileIdentifier: <identifier> (identifier ends at space or underscore)
  // The output format is: "profileIdentifier: com.example.profile _computerlevel[N]"
  const identifierPattern = /profileIdentifier:\s*([a-zA-Z0-9._-]+)/g
  let match: RegExpExecArray | null
  const seenIds = new Set<string>()
  
  while ((match = identifierPattern.exec(rawText)) !== null) {
    const identifier = match[1]
    
    // Skip duplicates
    if (seenIds.has(identifier)) continue
    seenIds.add(identifier)
    
    // Extract display name from identifier (e.g., com.example.macadmin.OfficePrefs -> OfficePrefs)
    const parts = identifier.split('.')
    const displayName = parts[parts.length - 1] || identifier
    
    // Determine organization from identifier
    let organization = 'Unknown'
    if (identifier.includes('micromdm')) {
      organization = 'MicroMDM'
    } else if (identifier.includes('jamf')) {
      organization = 'Jamf'
    } else if (identifier.includes('apple')) {
      organization = 'Apple'
    } else if (parts.length >= 2) {
      // Use reverse domain as organization hint
      organization = parts.slice(0, -1).join('.')
    }
    
    profiles.push({
      id: identifier,
      displayName: displayName,
      uuid: identifier,
      type: 'Device',
      installDate: '',
      organization: organization,
      description: `MDM Configuration Profile: ${identifier}`,
      payloads: [],
      isRemovable: true,
      hasRemovalPasscode: false,
      isEncrypted: false
    })
  }
  
  return profiles
}

/**
 * Extract profiles information from device modules
 * READER ONLY: Expects device to provide pre-processed, clean data
 * Also handles Mac raw profiles output
 */
export function extractProfiles(deviceModules: any): ProfilesInfo {
  // The standalone `profiles` module was folded into `management`, so Windows devices
  // carry their configuration profiles and policies there. macOS still reports the
  // raw `profiles -C`/`-P` output under `profiles`. Read whichever is present: falling
  // back to `management` is what lets Windows policies render in this view at all.
  const profilesData =
    deviceModules?.profiles ||
    deviceModules?.modules?.profiles ||
    deviceModules?.management ||
    deviceModules?.modules?.management

  if (!profilesData) {
    return {
      totalProfiles: 0,
      systemProfiles: 0,
      userProfiles: 0,
      profiles: []
    }
  }
  
  
  // Process profiles from different sources
  const profiles: ProfileItem[] = []

  // Handle Mac raw profiles output (profiles -C / profiles -P)
  if (profilesData?.profiles_C || profilesData?.profiles_P) {
        // Combine both computer-level and user profiles
    const macProfiles = [
      ...parseMacProfilesOutput(profilesData.profiles_C || ''),
      ...parseMacProfilesOutput(profilesData.profiles_P || '')
    ]
    
    // Deduplicate by ID
    const seenIds = new Set<string>()
    macProfiles.forEach(profile => {
      if (!seenIds.has(profile.id)) {
        seenIds.add(profile.id)
        profiles.push(profile)
      }
    })
    
      }

  // Add Intune policies - Ensure it's an array
  if (profilesData?.intunePolicies && Array.isArray(profilesData.intunePolicies)) {
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
  if (profilesData?.configurationProfiles && Array.isArray(profilesData.configurationProfiles)) {
    profilesData.configurationProfiles.forEach((profile: any) => {
      profiles.push({
        id: profile.profileId || profile.uuid || profile.identifier || 'unknown',
        displayName: profile.profileName || profile.displayName || profile.name || 'Unknown Profile',
        uuid: profile.uuid || profile.profileId || profile.identifier || 'unknown',
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
    lastUpdated: profilesData?.lastUpdated
  }
}

/**
 * Profiles Tab Component
 * MDM configuration profiles, policies, and settings
 * Groups policies by their CSP area (Defender, Browser, Privacy, etc.)
 * and shows actual setting names and values
 */

import React, { useState, useMemo, useRef, useEffect } from 'react'
import { formatRelativeTime } from '../../lib/time'

interface PolicySetting {
  name: string
  displayName: string
  value?: string
  type?: string
  isEnabled?: boolean
  description?: string
}

interface PolicyGroup {
  id: string
  displayName: string
  description?: string
  policyType: string
  source: string
  status: string
  settingsCount: number
  settings: PolicySetting[]
}

interface ProfilesTabProps {
  device: any
  data?: any
}

// Check if a string is a UUID/GUID
function isUUID(str: string): boolean {
  if (!str) return false
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

// Clean setting name - remove _ProviderSet, _WinningProvider suffixes
// and convert CamelCase to readable text
function cleanSettingName(name: string): string {
  if (!name) return 'Unknown'
  // Remove metadata suffixes
  let cleaned = name
    .replace(/_ProviderSet$/, '')
    .replace(/_WinningProvider$/, '')
    .replace(/_LastWrite$/, '')
  // Convert CamelCase to spaces
  cleaned = cleaned.replace(/([a-z])([A-Z])/g, '$1 $2')
  return cleaned
}

// Get friendly display name for policy areas
function getPolicyAreaDisplayName(area: string): { name: string; description: string } {
  const areaMap: Record<string, { name: string; description: string }> = {
    'Defender': { name: 'Windows Defender', description: 'Antivirus and threat protection settings' },
    'Browser': { name: 'Microsoft Edge', description: 'Browser security and configuration' },
    'Privacy': { name: 'Privacy', description: 'Privacy and data collection settings' },
    'Security': { name: 'Security', description: 'Windows security settings' },
    'DataProtection': { name: 'Data Protection', description: 'BitLocker and encryption settings' },
    'ApplicationManagement': { name: 'Application Management', description: 'App installation and restrictions' },
    'Wifi': { name: 'Wi-Fi', description: 'Wireless network configuration' },
    'Bluetooth': { name: 'Bluetooth', description: 'Bluetooth settings' },
    'Update': { name: 'Windows Update', description: 'Update delivery and configuration' },
    'WindowsDefenderSecurityCenter': { name: 'Security Center', description: 'Windows Security app settings' },
    'DeviceLock': { name: 'Device Lock', description: 'Lock screen and password policies' },
    'Experience': { name: 'Windows Experience', description: 'User experience settings' },
    'Start': { name: 'Start Menu', description: 'Start menu and taskbar settings' },
    'CredentialProviders': { name: 'Credential Providers', description: 'Authentication provider settings' },
    'CredentialsUI': { name: 'Credentials UI', description: 'Credential prompts and UI' },
    'DeviceGuard': { name: 'Device Guard', description: 'Virtualization-based security' },
    'Kerberos': { name: 'Kerberos', description: 'Kerberos authentication settings' },
    'LanmanWorkstation': { name: 'SMB Workstation', description: 'SMB client settings' },
    'LocalPoliciesSecurityOptions': { name: 'Local Security Options', description: 'Local security policy settings' },
    'MSSecurityGuide': { name: 'Security Guide', description: 'Microsoft security baseline settings' },
    'RemoteDesktopServices': { name: 'Remote Desktop', description: 'RDP settings' },
    'System': { name: 'System', description: 'Core system settings' },
    'TextInput': { name: 'Text Input', description: 'Keyboard and input settings' },
    'UserRights': { name: 'User Rights', description: 'User rights assignments' },
    'WindowsLogon': { name: 'Windows Logon', description: 'Sign-in options and behavior' },
  }
  
  return areaMap[area] || { name: area, description: `${area} configuration settings` }
}

// Type badge colors based on policy area
function getPolicyTypeColor(type: string): string {
  const lowerType = type.toLowerCase()
  if (lowerType.includes('defender') || lowerType.includes('antivirus')) {
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
  }
  if (lowerType.includes('edge') || lowerType.includes('browser')) {
    return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
  }
  if (lowerType.includes('privacy')) {
    return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
  }
  if (lowerType.includes('security') || lowerType.includes('guard')) {
    return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
  }
  if (lowerType.includes('data') || lowerType.includes('bitlocker') || lowerType.includes('encryption')) {
    return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
  }
  if (lowerType.includes('update')) {
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
  }
  if (lowerType.includes('application') || lowerType.includes('app')) {
    return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200'
  }
  if (lowerType.includes('credential') || lowerType.includes('guard')) {
    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
  }
  return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
}

// Source badge colors
function getSourceColor(source: string): string {
  const lowerSource = source.toLowerCase()
  if (lowerSource.includes('intune')) {
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
  }
  if (lowerSource.includes('group policy')) {
    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
  }
  return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
}

// Get status color
function getStatusColor(status: string): string {
  const lowerStatus = status.toLowerCase()
  if (lowerStatus === 'applied' || lowerStatus === 'compliant' || lowerStatus === 'enforced') {
    return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
  }
  if (lowerStatus === 'pending') {
    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
  }
  if (lowerStatus === 'failed' || lowerStatus === 'error') {
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
  }
  return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
}

export const ProfilesTab: React.FC<ProfilesTabProps> = ({ device, data }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedPolicy, setExpandedPolicy] = useState<string | null>(null)
  const [policyTypeFilter, setPolicyTypeFilter] = useState<string>('all')
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Handle scrollbar visibility for macOS-style scrolling
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    let scrollTimeout: NodeJS.Timeout

    const handleScroll = () => {
      container.classList.add('scrolling')
      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        container.classList.remove('scrolling')
      }, 1000)
    }

    const handleMouseEnter = () => {
      container.classList.add('scrolling')
    }

    const handleMouseLeave = () => {
      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        container.classList.remove('scrolling')
      }, 300)
    }

    container.addEventListener('scroll', handleScroll)
    container.addEventListener('mouseenter', handleMouseEnter)
    container.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      container.removeEventListener('scroll', handleScroll)
      container.removeEventListener('mouseenter', handleMouseEnter)
      container.removeEventListener('mouseleave', handleMouseLeave)
      clearTimeout(scrollTimeout)
    }
  }, [])

  // Extract and group policies from the profiles module
  const { policyGroups, policyTypes, totalSettings } = useMemo(() => {
    const allGroups: PolicyGroup[] = []
    const typeSet = new Set<string>()
    let settingsCount = 0

    // Get profiles data from device - support both paths
    const profilesData = device?.modules?.profiles || device?.profiles || data?.profiles || data
    
    if (!profilesData) {
      console.log('[ProfilesTab] No profiles data found')
      return { policyGroups: [], policyTypes: [], totalSettings: 0 }
    }

    console.log('[ProfilesTab] Processing profiles data:', {
      keys: Object.keys(profilesData),
      hasIntunePolicies: !!(profilesData.intune_policies || profilesData.intunePolicies),
      intunePoliciesCount: (profilesData.intune_policies || profilesData.intunePolicies || []).length,
      hasSecurityPolicies: !!(profilesData.security_policies || profilesData.securityPolicies),
      securityPoliciesCount: (profilesData.security_policies || profilesData.securityPolicies || []).length,
      hasRegistryPolicies: !!(profilesData.registry_policies || profilesData.registryPolicies),
      registryPoliciesCount: (profilesData.registry_policies || profilesData.registryPolicies || []).length
    })

    // ============================================
    // INTUNE POLICIES - Group by policy_name (CSP area like Defender, Browser, etc.)
    // Extract settings from the configuration object
    // IMPORTANT: The API returns snake_case keys (intune_policies, policy_name, etc.)
    // Each policy entry may have only ONE configuration setting, so we aggregate
    // all policies with the same policy_name to build complete policy groups
    // ============================================
    const intunePolicies = profilesData.intune_policies || profilesData.intunePolicies || []
    console.log('[ProfilesTab] Processing', intunePolicies.length, 'intune policies')
    
    if (Array.isArray(intunePolicies) && intunePolicies.length > 0) {
      // Group by policy_name (CSP area) - aggregate multiple policy entries into one group
      const groupedByArea: Record<string, { policies: any[], settings: Map<string, { value: string, isEnabled: boolean }> }> = {}
      
      let skippedUUID = 0
      let skippedEmpty = 0
      let processedPolicies = 0
      
      intunePolicies.forEach((policy: any) => {
        const policyName = policy.policy_name || policy.policyName || ''
        
        // Skip UUID policy names - those are just enrollment containers
        if (isUUID(policyName)) {
          skippedUUID++
          return
        }
        if (!policyName) {
          skippedEmpty++
          return
        }
        
        processedPolicies++
        
        if (!groupedByArea[policyName]) {
          groupedByArea[policyName] = { policies: [], settings: new Map() }
        }
        groupedByArea[policyName].policies.push(policy)
        
        // Extract settings from configuration object
        // Each policy entry typically has just 1-2 config keys
        const config = policy.configuration || {}
        const configKeys = Object.keys(config)
        
        configKeys.forEach((key) => {
          const value = config[key]
          // Only process _ProviderSet entries (these have the actual values)
          // Skip _WinningProvider entries (those are just GUIDs pointing to policy provider)
          if (key.endsWith('_ProviderSet')) {
            const cleanName = key.replace(/_ProviderSet$/, '')
            const numValue = parseInt(String(value), 10)
            groupedByArea[policyName].settings.set(cleanName, {
              value: String(value),
              isEnabled: numValue === 1
            })
          } else if (!key.endsWith('_WinningProvider') && !key.endsWith('_LastWrite')) {
            // Handle settings without _ProviderSet suffix (shouldn't happen often)
            if (!groupedByArea[policyName].settings.has(key)) {
              const numValue = parseInt(String(value), 10)
              groupedByArea[policyName].settings.set(key, {
                value: String(value),
                isEnabled: !isNaN(numValue) && numValue === 1
              })
            }
          }
        })
      })
      
      console.log('[ProfilesTab] Intune policies processing:', {
        total: intunePolicies.length,
        skippedUUID,
        skippedEmpty,
        processedPolicies,
        groupsCreated: Object.keys(groupedByArea).length,
        groupDetails: Object.entries(groupedByArea).map(([name, data]) => ({
          name,
          policies: data.policies.length,
          settings: data.settings.size
        }))
      })

      // Convert to PolicyGroup array
      Object.entries(groupedByArea).forEach(([area, groupData]) => {
        // Don't skip groups with 0 settings from configuration - check settings array too
        if (groupData.settings.size === 0) {
          // Try to extract from settings array if configuration was empty
          groupData.policies.forEach((policy: any) => {
            const policySettings = policy.settings || []
            policySettings.forEach((setting: any) => {
              const settingName = setting.name || setting.setting || ''
              const settingValue = setting.value || ''
              // Skip placeholder/empty settings
              if (!settingName || settingName.includes('Policy area exists') || isUUID(settingName)) {
                return
              }
              // Skip metadata settings
              if (settingName.includes('_ProviderSet') || settingName.includes('_WinningProvider') || settingName.includes('_LastWrite')) {
                return
              }
              if (!groupData.settings.has(settingName)) {
                const numValue = parseInt(settingValue, 10)
                groupData.settings.set(settingName, {
                  value: settingValue,
                  isEnabled: setting.is_enabled || setting.isEnabled || (!isNaN(numValue) && numValue === 1)
                })
              }
            })
          })
        }
        
        // Still skip if no settings after all extraction attempts
        if (groupData.settings.size === 0) return
        
        const displayInfo = getPolicyAreaDisplayName(area)
        typeSet.add(displayInfo.name)
        settingsCount += groupData.settings.size

        const settings: PolicySetting[] = Array.from(groupData.settings.entries()).map(([name, info]) => ({
          name,
          displayName: cleanSettingName(name),
          value: info.value,
          isEnabled: info.isEnabled
        }))

        // Sort settings alphabetically
        settings.sort((a, b) => a.displayName.localeCompare(b.displayName))

        allGroups.push({
          id: `intune-${area.toLowerCase().replace(/\s+/g, '-')}`,
          displayName: displayInfo.name,
          description: displayInfo.description,
          policyType: displayInfo.name,
          source: 'Microsoft Intune',
          status: 'Applied',
          settingsCount: settings.length,
          settings
        })
      })
    }

    // ============================================
    // SECURITY POLICIES - Group by policyArea
    // ============================================
    const securityPolicies = profilesData.security_policies || profilesData.securityPolicies || []
    if (Array.isArray(securityPolicies) && securityPolicies.length > 0) {
      const groupedByArea: Record<string, Map<string, { value: string, isEnabled: boolean, compliance: string }>> = {}
      
      securityPolicies.forEach((policy: any) => {
        const area = policy.policy_area || policy.policyArea || 'Security'
        const settingName = policy.setting || ''
        
        // Skip metadata entries
        if (settingName.includes('_ProviderSet') || 
            settingName.includes('_WinningProvider') || 
            settingName.includes('_LastWrite')) {
          return
        }
        
        if (!groupedByArea[area]) {
          groupedByArea[area] = new Map()
        }
        
        const policyName = policy.policy_name || policy.policyName || settingName
        if (!groupedByArea[area].has(policyName)) {
          const numValue = parseInt(policy.value, 10)
          groupedByArea[area].set(policyName, {
            value: policy.value,
            isEnabled: !isNaN(numValue) && numValue === 1,
            compliance: policy.compliance_status || policy.complianceStatus || 'Unknown'
          })
        }
      })

      Object.entries(groupedByArea).forEach(([area, settingsMap]) => {
        if (settingsMap.size === 0) return
        
        // Skip if we already have this area from intunePolicies
        const displayInfo = getPolicyAreaDisplayName(area)
        const existingGroup = allGroups.find(g => g.displayName === displayInfo.name)
        if (existingGroup) {
          // Merge settings into existing group
          settingsMap.forEach((info, name) => {
            if (!existingGroup.settings.find(s => s.name === name)) {
              existingGroup.settings.push({
                name,
                displayName: cleanSettingName(name),
                value: info.value,
                isEnabled: info.isEnabled
              })
              existingGroup.settingsCount++
              settingsCount++
            }
          })
          return
        }
        
        typeSet.add(displayInfo.name)
        settingsCount += settingsMap.size

        const settings: PolicySetting[] = Array.from(settingsMap.entries()).map(([name, info]) => ({
          name,
          displayName: cleanSettingName(name),
          value: info.value,
          isEnabled: info.isEnabled
        }))

        settings.sort((a, b) => a.displayName.localeCompare(b.displayName))

        allGroups.push({
          id: `security-${area.toLowerCase().replace(/\s+/g, '-')}`,
          displayName: displayInfo.name,
          description: displayInfo.description,
          policyType: displayInfo.name,
          source: 'Microsoft Intune',
          status: 'Applied',
          settingsCount: settings.length,
          settings
        })
      })
    }

    // ============================================
    // GROUP POLICIES (registry_policies)
    // ============================================
    const registryPolicies = profilesData.registry_policies || profilesData.registryPolicies || []
    if (Array.isArray(registryPolicies) && registryPolicies.length > 0) {
      const groupedByCategory: Record<string, any[]> = {}
      
      registryPolicies.forEach((policy: any) => {
        const category = policy.category || 'Group Policy'
        if (!groupedByCategory[category]) {
          groupedByCategory[category] = []
        }
        groupedByCategory[category].push(policy)
      })

      Object.entries(groupedByCategory).forEach(([category, policies]) => {
        const displayInfo = getPolicyAreaDisplayName(category)
        typeSet.add(displayInfo.name)
        settingsCount += policies.length

        const settings: PolicySetting[] = policies.map((p: any) => ({
          name: p.value_name || p.valueName || p.key_path || p.keyPath,
          displayName: cleanSettingName(p.value_name || p.valueName || category),
          value: String(p.value),
          type: p.type,
          description: p.key_path || p.keyPath
        }))

        allGroups.push({
          id: `gpo-${category.toLowerCase().replace(/\s+/g, '-')}`,
          displayName: displayInfo.name,
          description: displayInfo.description,
          policyType: displayInfo.name,
          source: 'Group Policy',
          status: 'Applied',
          settingsCount: settings.length,
          settings
        })
      })
    }

    // ============================================
    // GROUP POLICIES (group_policies - alternate key)
    // ============================================
    const groupPolicies = profilesData.group_policies || profilesData.groupPolicies || []
    if (Array.isArray(groupPolicies) && groupPolicies.length > 0) {
      const groupedByCategory: Record<string, any[]> = {}
      
      groupPolicies.forEach((policy: any) => {
        const category = policy.category || 'Group Policy'
        if (!groupedByCategory[category]) {
          groupedByCategory[category] = []
        }
        groupedByCategory[category].push(policy)
      })

      Object.entries(groupedByCategory).forEach(([category, policies]) => {
        // Skip if we already have this category
        const displayInfo = getPolicyAreaDisplayName(category)
        if (allGroups.find(g => g.displayName === displayInfo.name)) return
        
        typeSet.add(displayInfo.name)
        settingsCount += policies.length

        const settings: PolicySetting[] = policies.map((p: any) => ({
          name: p.value_name || p.valueName || p.setting,
          displayName: cleanSettingName(p.value_name || p.valueName || p.setting || category),
          value: String(p.value),
          type: p.type,
          description: p.key_path || p.keyPath
        }))

        allGroups.push({
          id: `gp-${category.toLowerCase().replace(/\s+/g, '-')}`,
          displayName: displayInfo.name,
          description: displayInfo.description,
          policyType: displayInfo.name,
          source: 'Group Policy',
          status: 'Applied',
          settingsCount: settings.length,
          settings
        })
      })
    }

    // ============================================
    // MDM CONFIGURATIONS
    // ============================================
    const mdmConfigs = profilesData.mdm_configurations || profilesData.mdmConfigurations || []
    if (Array.isArray(mdmConfigs) && mdmConfigs.length > 0) {
      // Filter out generic CSP container entries
      const meaningfulConfigs = mdmConfigs.filter((c: any) => {
        const cspName = c.csp_name || c.cspName || ''
        return !['AdmxInstalled', 'current', 'default', 'providers', 'device'].includes(cspName)
      })

      if (meaningfulConfigs.length > 0) {
        typeSet.add('MDM Configuration')
        settingsCount += meaningfulConfigs.length

        const settings: PolicySetting[] = meaningfulConfigs.map((c: any) => ({
          name: c.csp_name || c.cspName,
          displayName: c.csp_name || c.cspName,
          value: c.value,
          description: c.description
        }))

        allGroups.push({
          id: 'mdm-configurations',
          displayName: 'MDM Configuration',
          description: 'Mobile Device Management CSP settings',
          policyType: 'MDM Configuration',
          source: 'Microsoft Intune',
          status: 'Applied',
          settingsCount: settings.length,
          settings
        })
      }
    }

    // Sort groups by settings count (most settings first)
    allGroups.sort((a, b) => b.settingsCount - a.settingsCount)

    console.log('[ProfilesTab] Processed policy groups:', allGroups.length, 'total settings:', settingsCount)

    return {
      policyGroups: allGroups,
      policyTypes: Array.from(typeSet).sort(),
      totalSettings: settingsCount
    }
  }, [device, data])

  // Filter policies based on search and type filter
  const filteredGroups = useMemo(() => {
    let filtered = policyGroups

    // Apply type filter
    if (policyTypeFilter !== 'all') {
      filtered = filtered.filter(p => p.policyType === policyTypeFilter)
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(p =>
        p.displayName.toLowerCase().includes(search) ||
        p.description?.toLowerCase().includes(search) ||
        p.settings.some(s =>
          s.name.toLowerCase().includes(search) ||
          s.displayName.toLowerCase().includes(search) ||
          s.value?.toLowerCase().includes(search)
        )
      )
    }

    return filtered
  }, [policyGroups, policyTypeFilter, searchTerm])

  // Toggle policy expansion
  const togglePolicyExpansion = (policyId: string) => {
    setExpandedPolicy(current => current === policyId ? null : policyId)
  }

  if (policyGroups.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configuration Profiles</h1>
              <p className="text-base text-gray-600 dark:text-gray-400">MDM configuration profiles and policies</p>
            </div>
          </div>
        </div>

        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Configuration Profiles</h3>
          <p className="text-gray-600 dark:text-gray-400">This device does not have any managed configuration installed.</p>
        </div>

        {/* Debug Accordion */}
        <details className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
          <summary className="cursor-pointer px-4 py-3 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-800/50">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Debug API JSON Data</span>
          </summary>
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <pre className="p-4 bg-gray-900 dark:bg-black text-gray-100 text-xs font-mono overflow-auto max-h-[400px] rounded">
              {JSON.stringify(device?.modules?.profiles || device?.profiles, null, 2)}
            </pre>
          </div>
        </details>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configuration Profiles</h1>
            <p className="text-base text-gray-600 dark:text-gray-400">MDM configuration profiles and policies</p>
          </div>
        </div>
        <div className="flex items-center gap-6 mr-8">
          <div className="text-right">
            <div className="text-sm text-gray-500 dark:text-gray-400">Policy Areas</div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{policyGroups.length}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Settings</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalSettings}</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        {/* Filter Bar */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setPolicyTypeFilter('all')}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  policyTypeFilter === 'all'
                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                All ({policyGroups.length})
              </button>
              {policyTypes.map(type => {
                const count = policyGroups.filter(p => p.policyType === type).length
                return (
                  <button
                    key={type}
                    onClick={() => setPolicyTypeFilter(type)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                      policyTypeFilter === type
                        ? getPolicyTypeColor(type)
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {type} ({count})
                  </button>
                )
              })}
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search policies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-64 pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-sm"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <svg className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {(searchTerm || policyTypeFilter !== 'all') && (
          <div className="px-6 py-2 bg-gray-50 dark:bg-gray-900 text-sm text-gray-600 dark:text-gray-400">
            Showing {filteredGroups.length} of {policyGroups.length} policy areas
          </div>
        )}

        {/* Table */}
        <div ref={scrollContainerRef} className="h-[700px] overflow-auto table-scrollbar">
          <table className="w-full min-w-full">
            <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Policy Area</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Source</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Settings</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredGroups.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    {searchTerm ? 'No policies match your search' : 'No policies found'}
                  </td>
                </tr>
              ) : (
                filteredGroups.map((group) => (
                  <React.Fragment key={group.id}>
                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPolicyTypeColor(group.policyType)}`}>
                              {group.displayName}
                            </span>
                          </div>
                          {group.description && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {group.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSourceColor(group.source)}`}>
                          {group.source}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {group.settingsCount} setting{group.settingsCount !== 1 ? 's' : ''}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(group.status)}`}>
                          {group.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => togglePolicyExpansion(group.id)}
                          className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        >
                          {expandedPolicy === group.id ? 'Hide' : 'Show'} Settings
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={expandedPolicy === group.id ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                          </svg>
                        </button>
                      </td>
                    </tr>
                    {expandedPolicy === group.id && (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 bg-gray-50 dark:bg-gray-900">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                                {group.displayName} Settings
                              </h4>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {group.settings.length} setting{group.settings.length !== 1 ? 's' : ''}
                              </div>
                            </div>

                            {group.settings.length > 0 ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {group.settings.map((setting, idx) => (
                                  <div
                                    key={idx}
                                    className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0 flex-1">
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                          {setting.displayName}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                          {setting.name}
                                        </div>
                                      </div>
                                      {setting.isEnabled !== undefined && (
                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                                          setting.isEnabled
                                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                        }`}>
                                          {setting.isEnabled ? 'Enabled' : 'Disabled'}
                                        </span>
                                      )}
                                    </div>
                                    {setting.value && (
                                      <div className="mt-2 text-xs font-mono text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded px-2 py-1">
                                        {setting.value}
                                      </div>
                                    )}
                                    {setting.description && (
                                      <div className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                                        {setting.description}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                                <p className="text-sm">No detailed settings available</p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Debug Accordion */}
      <details className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
        <summary className="cursor-pointer px-4 py-3 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-800/50">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Debug API JSON Data</span>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            intune_policies: {(device?.modules?.profiles?.intune_policies || device?.profiles?.intune_policies || []).length} | 
            security_policies: {(device?.modules?.profiles?.security_policies || device?.profiles?.security_policies || []).length}
          </span>
        </summary>
        <div className="border-t border-gray-200 dark:border-gray-700">
          <div className="p-4">
            <div className="mb-4 p-3 bg-gray-800 rounded text-xs text-gray-300 font-mono">
              <div><strong>Data sources checked:</strong></div>
              <div>• device.modules.profiles: {device?.modules?.profiles ? 'exists' : 'missing'}</div>
              <div>• device.profiles: {device?.profiles ? 'exists' : 'missing'}</div>
              <div>• data prop: {data ? 'exists' : 'missing'}</div>
              <div className="mt-2"><strong>intune_policies sample (first 3):</strong></div>
              {((device?.modules?.profiles?.intune_policies || device?.profiles?.intune_policies || []) as any[]).slice(0, 3).map((p: any, i: number) => (
                <div key={i}>  [{i}] policy_name: "{p?.policy_name || '(empty)'}", config keys: {Object.keys(p?.configuration || {}).length}</div>
              ))}
            </div>
            <div className="flex justify-end gap-2 mb-2">
              <button
                onClick={() => {
                  const jsonString = JSON.stringify(device?.modules?.profiles || device?.profiles || data, null, 2)
                  navigator.clipboard.writeText(jsonString)
                }}
                className="px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Copy JSON
              </button>
            </div>
            <pre className="p-4 bg-gray-900 dark:bg-black text-gray-100 text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-[600px] overflow-y-auto rounded border border-gray-700">
              {JSON.stringify(device?.modules?.profiles || device?.profiles || data, null, 2)}
            </pre>
          </div>
        </div>
      </details>
    </div>
  )
}

export default ProfilesTab

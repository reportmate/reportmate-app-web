/**
 * Profiles Tab Component
 * MDM configuration profiles and settings
 */

import React, { useState, useMemo, useRef, useEffect } from 'react'
import { processProfilesData } from '../../lib/data-processing/component-data'
import { formatRelativeTime } from '../../lib/time'

interface ProfileInfo {
  id: string
  displayName: string
  description?: string
  organization?: string
  uuid: string
  installDate: string
  type: 'Device' | 'User'
  payloads?: Array<{
    type?: string
    displayName?: string
    identifier?: string
    name?: string
    value?: string
    category?: string
    description?: string
  }> | null
  isRemovable: boolean
  hasRemovalPasscode: boolean
  isEncrypted: boolean
}

interface ProfilesTabProps {
  device: any
  data?: any
}

export const ProfilesTab: React.FC<ProfilesTabProps> = ({ device, data }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedProfile, setExpandedProfile] = useState<string | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Handle scrollbar visibility for macOS-style scrolling
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let scrollTimeout: NodeJS.Timeout;
    
    const handleScroll = () => {
      container.classList.add('scrolling');
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        container.classList.remove('scrolling');
      }, 1000);
    };

    const handleMouseEnter = () => {
      container.classList.add('scrolling');
    };

    const handleMouseLeave = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        container.classList.remove('scrolling');
      }, 300);
    };

    container.addEventListener('scroll', handleScroll);
    container.addEventListener('mouseenter', handleMouseEnter);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      container.removeEventListener('mouseenter', handleMouseEnter);
      container.removeEventListener('mouseleave', handleMouseLeave);
      clearTimeout(scrollTimeout);
    };
  }, []);

  // Process profiles data from the modular device structure
  const profilesModuleData = processProfilesData(device)
  
  // Check if we have profiles data - prioritize data prop, then processed device data
  const hasProfilesData = data?.profiles?.length > 0 ||
                          device?.profiles?.length > 0 ||
                          device?.modules?.profiles?.ConfigurationProfiles?.length > 0 || 
                          device?.modules?.profiles?.configurationProfiles?.length > 0 || 
                          device?.modules?.profiles?.IntunePolicies?.length > 0 || 
                          device?.modules?.profiles?.intunePolicies?.length > 0 || 
                          device?.modules?.profiles?.RegistryPolicies?.length > 0 ||
                          device?.modules?.profiles?.registryPolicies?.length > 0 ||
                          profilesModuleData?.profiles?.length > 0

  console.log('🔍 ProfilesTab Debug:', {
    hasDataProp: !!data,
    dataProfilesLength: data?.profiles?.length,
    hasDeviceProfiles: !!device?.profiles,
    deviceProfilesLength: device?.profiles?.length,
    hasModuleProfiles: !!device?.modules?.profiles,
    moduleConfigurationProfilesLength: device?.modules?.profiles?.ConfigurationProfiles?.length,
    moduleConfigurationProfilesLengthCamel: device?.modules?.profiles?.configurationProfiles?.length,
    moduleIntunePoliciesLength: device?.modules?.profiles?.IntunePolicies?.length,
    moduleIntunePoliciesLengthCamel: device?.modules?.profiles?.intunePolicies?.length,
    moduleRegistryPoliciesLength: device?.modules?.profiles?.RegistryPolicies?.length,
    moduleRegistryPoliciesLengthCamel: device?.modules?.profiles?.registryPolicies?.length,
    hasProcessedData: !!profilesModuleData?.profiles?.length,
    hasProfilesData,
    fullDevice: JSON.stringify(device).substring(0, 1000),
    deviceModuleKeys: device?.modules ? Object.keys(device.modules) : 'NO_MODULES',
    profilesModuleKeys: device?.modules?.profiles ? Object.keys(device.modules.profiles) : 'NO_PROFILES_MODULE',
    profilesModuleData: JSON.stringify(profilesModuleData).substring(0, 500)
  });

  // Prioritize data prop, then processed device data, then fallback to raw module data
  let profiles = []
  if (data?.profiles?.length > 0) {
    console.log('✅ Using data prop (processedData.profiles)');
    profiles = data.profiles
  } else if (profilesModuleData?.profiles?.length > 0) {
    console.log('✅ Using processed profiles data');
    profiles = profilesModuleData.profiles
  } else if (device?.modules?.profiles?.intunePolicies?.length > 0) {
    console.log('⚠️ Falling back to raw module intunePolicies data (camelCase)');
    profiles = device.modules.profiles.intunePolicies.map((policy: any) => ({
      id: policy.policyId || 'unknown',
      displayName: policy.policyName || 'Unknown Policy',
      uuid: policy.policyId || 'unknown',
      type: 'Device',
      installDate: policy.assignedDate || policy.lastSync || '',
      organization: 'Microsoft Intune',
      description: policy.policyType || '',
      payloads: policy.settings || [],
      isRemovable: policy.enforcementState !== 'Enforced',
      hasRemovalPasscode: false,
      isEncrypted: false
    }))
  } else if (device?.modules?.profiles?.ConfigurationProfiles) {
    console.log('⚠️ Falling back to raw module ConfigurationProfiles data (PascalCase)');
    profiles = device.modules.profiles.ConfigurationProfiles.map((profile: any) => ({
      ...profile,
      displayName: profile.Name || profile.name || 'Unknown',
      uuid: profile.id || profile.identifier || 'unknown',
      type: 'Device',
      isRemovable: true,
      hasRemovalPasscode: false,
      isEncrypted: false
    }))
  } else if (device?.modules?.profiles?.IntunePolicies) {
    console.log('⚠️ Falling back to raw module IntunePolicies data (PascalCase)');
    profiles = device.modules.profiles.IntunePolicies.map((policy: any) => ({
      id: policy.PolicyId || 'unknown',
      displayName: policy.PolicyName || 'Unknown Policy',
      uuid: policy.PolicyId || 'unknown',
      type: 'Device',
      installDate: policy.AssignedDate || policy.LastSync || '',
      organization: 'Microsoft Intune',
      description: policy.PolicyType || '',
      payloads: policy.Settings || [],
      isRemovable: policy.EnforcementState !== 'Enforced',
      hasRemovalPasscode: false,
      isEncrypted: false
    }))
  } else if (device?.profiles) {
    console.log('⚠️ Falling back to device.profiles');
    profiles = device.profiles
  } else {
    console.log('❌ No profiles data found');
    profiles = []
  }

  if (!hasProfilesData || profiles.length === 0) {
    return (
      <div className="space-y-6">
        {/* Header with Icon - Consistent with other tabs */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Configuration Profiles</h1>
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
      </div>
    )
  }

  const deviceProfiles = profiles.filter((p: ProfileInfo) => p.type === 'Device')
  const userProfiles = profiles.filter((p: ProfileInfo) => p.type === 'User')

  // Filter profiles based on search term
  const filteredProfiles = useMemo(() => {
    if (!searchTerm.trim()) {
      return profiles;
    }
    
    const searchLower = searchTerm.toLowerCase().trim();
    
    return profiles.filter((profile: ProfileInfo) => {
      return (
        (profile.displayName && profile.displayName.toLowerCase().includes(searchLower)) ||
        (profile.organization && profile.organization.toLowerCase().includes(searchLower)) ||
        (profile.description && profile.description.toLowerCase().includes(searchLower)) ||
        (profile.uuid && profile.uuid.toLowerCase().includes(searchLower)) ||
        (profile.payloads && profile.payloads.some(payload => 
          (payload.type && payload.type.toLowerCase().includes(searchLower)) ||
          (payload.displayName && payload.displayName.toLowerCase().includes(searchLower)) ||
          (payload.name && payload.name.toLowerCase().includes(searchLower))
        ))
      );
    });
  }, [profiles, searchTerm]);

  // Helper function to safely format payload details
  const formatPayloadDetails = (payloads: ProfileInfo['payloads']) => {
    if (!payloads || payloads.length === 0) return 'No payload details';
    
    try {
      return JSON.stringify(payloads, null, 2);
    } catch (error) {
      return 'Error displaying payload details';
    }
  };

  // Toggle profile expansion
  const toggleProfileExpansion = (profileId: string) => {
    setExpandedProfile(current => current === profileId ? null : profileId);
  };

  return (
    <div className="space-y-6">
      {/* Header with Icon - Consistent with other tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Configuration Profiles</h1>
            <p className="text-base text-gray-600 dark:text-gray-400">MDM configuration profiles and policies</p>
          </div>
        </div>
        {/* Total Profiles - Top Right */}
        {profiles.length > 0 && (
          <div className="text-right">
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Profiles</div>
            <div className="text-xl font-semibold text-purple-600 dark:text-purple-400">
              {profiles.length.toLocaleString()}
            </div>
          </div>
        )}
      </div>

      {/* Profiles Table - Single unified table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Configuration Profiles</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Device configuration profiles and policies</p>
              </div>
            </div>
            {/* Search Field */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search profiles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-64 pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              {searchTerm && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button
                    onClick={() => setSearchTerm('')}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Show filtered count */}
        {searchTerm && (
          <div className="px-6 py-2 bg-gray-50 dark:bg-gray-900 text-sm text-gray-600 dark:text-gray-400">
            Showing {filteredProfiles.length} of {profiles.length} profiles
          </div>
        )}
        
        {/* Table with overlay scrolling */}
        <div 
          ref={scrollContainerRef}
          className="h-[800px] overflow-auto table-scrollbar"
        >
          <table className="w-full min-w-full">
            <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Profile</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Organization</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Install Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredProfiles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    {searchTerm ? 'No profiles match your search' : 'No configuration profiles found'}
                  </td>
                </tr>
              ) : (
                filteredProfiles.map((profile: ProfileInfo) => (
                  <React.Fragment key={profile.uuid}>
                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {profile.displayName}
                          </div>
                          {profile.description && (
                            <div className="text-sm text-gray-500 dark:text-gray-400">{profile.description}</div>
                          )}
                          <div className="text-xs text-gray-400 dark:text-gray-500 font-mono">{profile.uuid}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {profile.organization || 'Unknown'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          profile.type === 'Device' 
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                            : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        }`}>
                          {profile.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {profile.installDate ? formatRelativeTime(profile.installDate) : 'Unknown'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            profile.isRemovable 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}>
                            {profile.isRemovable ? 'Removable' : 'System'}
                          </span>
                          {profile.isEncrypted && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              Encrypted
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleProfileExpansion(profile.uuid)}
                          className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                          aria-expanded={expandedProfile === profile.uuid}
                        >
                          {expandedProfile === profile.uuid ? 'Hide' : 'Show'} Details
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={expandedProfile === profile.uuid ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                          </svg>
                        </button>
                      </td>
                    </tr>
                    {expandedProfile === profile.uuid && (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 bg-gray-50 dark:bg-gray-900">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                                Profile Details
                              </h4>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {Array.isArray(profile.payloads) ? profile.payloads.length : 0} payload{(Array.isArray(profile.payloads) ? profile.payloads.length : 0) !== 1 ? 's' : ''}
                              </div>
                            </div>
                            
                            {profile.payloads && profile.payloads.length > 0 ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {profile.payloads.map((payload, index) => (
                                  <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between">
                                        <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                                          {payload.displayName || payload.name || payload.type || `Payload ${index + 1}`}
                                        </h5>
                                        {payload.type && (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                                            {payload.type}
                                          </span>
                                        )}
                                      </div>
                                      {payload.description && (
                                        <p className="text-xs text-gray-600 dark:text-gray-400">{payload.description}</p>
                                      )}
                                      {payload.identifier && (
                                        <p className="text-xs text-gray-500 dark:text-gray-500 font-mono">{payload.identifier}</p>
                                      )}
                                      {payload.value && (
                                        <div className="mt-2">
                                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Value: </span>
                                          <span className="text-xs text-gray-600 dark:text-gray-400 font-mono">{payload.value}</span>
                                        </div>
                                      )}
                                      {payload.category && (
                                        <div className="mt-1">
                                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Category: </span>
                                          <span className="text-xs text-gray-600 dark:text-gray-400">{payload.category}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <p className="text-sm">No payload details available</p>
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
    </div>
  )
}

export default ProfilesTab

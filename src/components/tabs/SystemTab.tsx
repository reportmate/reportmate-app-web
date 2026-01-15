/**
 * System Tab Component
 * Detailed system information and operating system details
 * Supports both Windows and macOS platforms
 */

import { formatRelativeTime, formatExactTime, parseInstallTime } from '../../lib/time'
import React, { useState, useMemo, useRef, useEffect } from 'react'
import { extractSystem } from '../../lib/data-processing/modules/system'
import { ScheduledTasksTable } from '../tables/ScheduledTasksTable'
import { LaunchdTable } from '../tables/LaunchdTable'
import { ExtensionsTable } from '../tables/ExtensionsTable'
import { normalizeKeys } from '../../lib/utils/powershell-parser'

// Get macOS marketing name from version number
function getMacOSMarketingName(version: string | undefined): string {
  if (!version) return 'Unknown'
  
  // Parse major version
  const major = parseInt(version.split('.')[0], 10)
  
  // macOS version to marketing name mapping
  const versionNames: Record<number, string> = {
    26: 'Tahoe',
    15: 'Sequoia',
    14: 'Sonoma',
    13: 'Ventura',
    12: 'Monterey',
    11: 'Big Sur',
    10: 'Catalina', // 10.15, but major=10 doesn't work well, handle separately
  }
  
  if (major === 10) {
    // Handle 10.x versions
    const minor = parseInt(version.split('.')[1] || '0', 10)
    const catalinaMajor: Record<number, string> = {
      15: 'Catalina',
      14: 'Mojave',
      13: 'High Sierra',
      12: 'Sierra',
      11: 'El Capitan',
      10: 'Yosemite',
    }
    return catalinaMajor[minor] || 'macOS'
  }
  
  return versionNames[major] || 'macOS'
}

interface DeviceData {
  id: string;
  name: string;
  modules?: {
    system?: {
      operatingSystem?: {
        name?: string;
        version?: string;
        displayVersion?: string;
        edition?: string;
        build?: string;
        architecture?: string;
        locale?: string;
        timeZone?: string;
        activeKeyboardLayout?: string;
        featureUpdate?: string;
      };
      uptimeString?: string;
    };
    services?: Array<{
      name: string;
      display_name?: string;
      status?: string;
      start_type?: string;
    }>;
  };
  [key: string]: unknown;
}

interface SystemTabProps {
  device: DeviceData
  data?: Record<string, unknown>
}

export const SystemTab: React.FC<SystemTabProps> = ({ device, data: _data }) => {
  // Normalize snake_case to camelCase for system module
  const rawSystemModule = device?.modules?.system
  const normalizedSystemModule = rawSystemModule ? normalizeKeys(rawSystemModule) as any : null
  const normalizedDevice = {
    ...device,
    modules: {
      ...device?.modules,
      system: normalizedSystemModule
    }
  }
  
  // Process system data using the centralized data processing function
  const systemTabData = extractSystem(normalizedDevice)
  const { services, environment, updates, scheduledTasks, runningServices, isMac, pendingAppleUpdates, installHistory, loginItems, systemExtensions, kernelExtensions, privilegedHelperTools } = systemTabData
  
  // State for services search
  const [servicesSearch, setServicesSearch] = useState('')
  // State for launchd scope filter (Mac)
  const [launchdScopeFilter, setLaunchdScopeFilter] = useState<'all' | 'system' | 'user' | 'apple'>('all')
  // State for privileged helper tools search
  const [helperSearch, setHelperSearch] = useState('')
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // State for tracking which row's Team ID was copied (by index)
  const [copiedRowIndex, setCopiedRowIndex] = useState<number | null>(null)

  // Copy Team ID to clipboard
  const handleCopyTeamId = async (teamId: string, rowIndex: number) => {
    try {
      await navigator.clipboard.writeText(teamId)
      setCopiedRowIndex(rowIndex)
      setTimeout(() => setCopiedRowIndex(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  // Filter privileged helper tools by search
  const filteredHelpers = useMemo(() => {
    if (!helperSearch.trim()) return privilegedHelperTools
    const searchLower = helperSearch.toLowerCase()
    return privilegedHelperTools.filter(helper => 
      helper.name?.toLowerCase().includes(searchLower) ||
      helper.bundleIdentifier?.toLowerCase().includes(searchLower) ||
      helper.teamId?.toLowerCase().includes(searchLower) ||
      helper.path?.toLowerCase().includes(searchLower)
    )
  }, [privilegedHelperTools, helperSearch])
  
  // Handle scrollbar visibility for services table
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
      container.classList.remove('scrolling');
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
  
  // Get operating system information (same logic as SystemWidget)
  // Use modules.system data only - support both snake_case (Windows) and camelCase (Mac)
  // Mac uses camelCase: operatingSystem, systemDetails, uptimeString
  // Windows uses snake_case: operating_system, uptime_string
  const rawOsInfo = device.modules?.system?.operatingSystem || device.modules?.system?.operating_system
  const uptimeString = device.modules?.system?.uptimeString || device.modules?.system?.uptime_string

  // Normalize OS info to support both snake_case and camelCase field access
  // Mac stores timezone, locale, keyboardLayouts in systemDetails (separate field)
  // Windows stores them directly in operating_system
  const systemDetails = device.modules?.system?.systemDetails || device.modules?.system?.system_details || {}
  
  const osInfo = rawOsInfo ? {
    name: rawOsInfo.name || rawOsInfo.product_name,
    version: rawOsInfo.version,
    // Mac uses majorVersion.minorVersion.patchVersion
    displayVersion: rawOsInfo.display_version || rawOsInfo.displayVersion ||
      (rawOsInfo.majorVersion !== undefined ? `${rawOsInfo.majorVersion}.${rawOsInfo.minorVersion || 0}.${rawOsInfo.patchVersion || 0}` : ''),
    edition: rawOsInfo.edition || rawOsInfo.platform,  // Mac uses platform (Darwin)
    build: rawOsInfo.build || rawOsInfo.build_number || rawOsInfo.buildNumber,
    architecture: rawOsInfo.architecture || rawOsInfo.arch,
    // Check both rawOsInfo and systemDetails for Mac
    locale: rawOsInfo.locale || systemDetails.locale,
    timeZone: rawOsInfo.time_zone || rawOsInfo.timeZone || systemDetails.timeZone || systemDetails.time_zone,
    activeKeyboardLayout: rawOsInfo.active_keyboard_layout || rawOsInfo.activeKeyboardLayout || 
      (rawOsInfo.keyboard_layouts?.length > 0 ? rawOsInfo.keyboard_layouts.join(', ') : '') ||
      (systemDetails.keyboardLayouts?.length > 0 ? systemDetails.keyboardLayouts.filter((k: string) => k).join(', ') : ''),
    featureUpdate: rawOsInfo.feature_update || rawOsInfo.featureUpdate,
    activation: rawOsInfo.activation ? {
      isActivated: rawOsInfo.activation.is_activated ?? rawOsInfo.activation.isActivated,
      status: rawOsInfo.activation.status,
      statusCode: rawOsInfo.activation.status_code ?? rawOsInfo.activation.statusCode,
      partialProductKey: rawOsInfo.activation.partial_product_key ?? rawOsInfo.activation.partialProductKey,
      licenseType: rawOsInfo.activation.license_type ?? rawOsInfo.activation.licenseType
    } : undefined
  } : undefined

  // Filter services based on search
  const filteredServices = useMemo(() => {
    if (!servicesSearch.trim()) return services
    
    const searchLower = servicesSearch.toLowerCase()
    return services.filter((service: any) => 
      service.name?.toLowerCase().includes(searchLower) ||
      service.displayName?.toLowerCase().includes(searchLower) ||
      service.description?.toLowerCase().includes(searchLower) ||
      service.status?.toLowerCase().includes(searchLower)
    )
  }, [services, servicesSearch])
  
  return (
    <div className="space-y-6">
      {/* Header with Icon - Consistent with Management and Security Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System Information</h1>
            <p className="text-base text-gray-600 dark:text-gray-400">Operating system and hardware details</p>
          </div>
        </div>
        {/* Operating System - Top Right */}
        {osInfo?.name && (
          <div className="text-right mr-8">
            <div className="text-sm text-gray-500 dark:text-gray-400">Operating System</div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {osInfo.name}
            </div>
          </div>
        )}
      </div>

      {/* Detailed System Information */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Operating System Details</h3>
          {/* Windows Activation Badge */}
          {osInfo?.activation && (
            <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
              osInfo.activation.isActivated 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}>
              <svg className={`w-4 h-4 mr-1.5 ${osInfo.activation.isActivated ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} fill="currentColor" viewBox="0 0 20 20">
                {osInfo.activation.isActivated ? (
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                ) : (
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                )}
              </svg>
              Windows {osInfo.activation.isActivated ? 'Activated' : 'Not Activated'}
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* First Column */}
          <div className="space-y-4">
            {isMac ? (
              <>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Version</label>
                  <p className="text-gray-900 dark:text-white">{getMacOSMarketingName(osInfo?.displayVersion || osInfo?.version)}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Version</label>
                  <p className="text-gray-900 dark:text-white font-mono">{osInfo?.displayVersion || 'Unknown'}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Build</label>
                  <p className="text-gray-900 dark:text-white font-mono">{osInfo?.build || 'Unknown'}</p>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Display Version</label>
                  <p className="text-gray-900 dark:text-white">{osInfo?.displayVersion || 'Unknown'}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Version</label>
                  <p className="text-gray-900 dark:text-white">
                    {osInfo?.version || 'Unknown'}
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Feature Update</label>
                  <p className="text-gray-900 dark:text-white">{osInfo?.featureUpdate || 'Unknown'}</p>
                </div>
              </>
            )}
          </div>
          
          {/* Second Column */}
          <div className="space-y-4">
            {!isMac && (
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Edition</label>
                <p className="text-gray-900 dark:text-white">{osInfo?.edition || 'Unknown'}</p>
              </div>
            )}
            
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">System Uptime</label>
              <p className="text-gray-900 dark:text-white">{uptimeString || 'Unknown'}</p>
            </div>
            
            {systemTabData.bootTime && systemTabData.bootTime !== 'Unknown' && (
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Last Boot Time</label>
                <p className="text-gray-900 dark:text-white">{formatExactTime(systemTabData.bootTime)}</p>
              </div>
            )}
            
          </div>
          
          {/* Third Column */}
          <div className="space-y-4">
            
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">System Locale</label>
              <p className="text-gray-900 dark:text-white">{osInfo?.locale || 'Unknown'}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Time Zone</label>
              <p className="text-gray-900 dark:text-white">{osInfo?.timeZone || 'Unknown'}</p>
            </div>
            
            {!isMac && (
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Keyboard Layout</label>
                <p className="text-gray-900 dark:text-white">{osInfo?.activeKeyboardLayout || 'Unknown'}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Windows Updates - Second from top */}
      {!isMac && updates.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Windows Updates</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Recently installed system updates</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Update</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Install Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Restart Required</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {updates.slice(0, 10).map((update: any, index: number) => (
                  <tr key={update.id || index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {update.title || update.id}
                        </div>
                        {update.id && update.title && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                            {update.id}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {update.category || 'Windows Update'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {update.installDate ? new Date(update.installDate).toLocaleDateString() : 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        update.requiresRestart 
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      }`}>
                        {update.requiresRestart ? 'Required' : 'No'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* macOS Updates */}
      {isMac && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">macOS Updates</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {pendingAppleUpdates.length > 0 
                    ? `${pendingAppleUpdates.length} available system update${pendingAppleUpdates.length !== 1 ? 's' : ''} from Apple`
                    : 'System software and security updates'}
                </p>
              </div>
              {/* Status indicator in header */}
              {pendingAppleUpdates.length === 0 ? (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/40 rounded-full mr-2">
                  <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">Up to Date</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-sm font-medium">{pendingAppleUpdates.length} pending</span>
                </div>
              )}
            </div>
          </div>
          {/* Pending Updates */}
          {pendingAppleUpdates.length > 0 && (
            <div className="overflow-x-auto border-b border-gray-200 dark:border-gray-700">
              <div className="px-6 py-2 bg-yellow-50 dark:bg-yellow-900/20">
                <span className="text-xs font-medium text-yellow-700 dark:text-yellow-300">Pending Updates</span>
              </div>
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Update</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Version</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Restart</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {pendingAppleUpdates.map((update, index) => (
                  <tr key={update.productKey || index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{update.name}</div>
                        {update.productKey && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">{update.productKey}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {update.version || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-1">
                        {update.isSecurity && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                            Security
                          </span>
                        )}
                        {update.recommended && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            Recommended
                          </span>
                        )}
                        {!update.isSecurity && !update.recommended && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                            Optional
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        update.restartRequired 
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      }`}>
                        {update.restartRequired ? 'Required' : 'No'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
          
          {/* Recently Installed System Updates (from Install History - macOS updates only) */}
          {(() => {
            const systemUpdates = installHistory
              .filter(item => 
                item.packageId?.toLowerCase().includes('com.apple') ||
                item.packageId?.toLowerCase().includes('macos') ||
                item.packageId?.toLowerCase().includes('securityupdate') ||
                item.packageId?.toLowerCase().includes('safari') ||
                item.packageId?.toLowerCase().includes('xprotect')
              )
              .slice(0, 10)
            
            return systemUpdates.length > 0 && (
              <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
                    <tr>
                      <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Update</th>
                      <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Version</th>
                      <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Installed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {systemUpdates.map((item, index) => (
                      <tr key={item.packageId || index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-3">
                          <div className="text-sm font-medium text-gray-900 dark:text-white font-mono">{item.packageId}</div>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {item.version || 'Unknown'}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {item.installTime ? formatRelativeTime(new Date(parseInstallTime(item.installTime)).toISOString()) : 'Unknown'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })()}
        </div>
      )}
      
      {/* System Statistics */}
      <div className={`grid grid-cols-1 ${isMac ? 'md:grid-cols-4' : 'md:grid-cols-5'} gap-4`}>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {isMac ? (services.length + scheduledTasks.length) : services.length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">{isMac ? 'Background Items' : 'Total Services'}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{runningServices}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Running</div>
        </div>
        {!isMac && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {updates.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Windows Updates</div>
          </div>
        )}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {isMac ? systemExtensions.length : environment.length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">{isMac ? 'Extensions' : 'Environment Vars'}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-pink-600 dark:text-pink-400">
            {isMac ? loginItems.length : scheduledTasks.length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">{isMac ? 'Open at Login' : 'Scheduled Tasks'}</div>
        </div>
      </div>

      {/* Scheduled Tasks Table (Windows) / Background Activity (Mac) */}
      {!isMac && scheduledTasks.length > 0 && (
        <ScheduledTasksTable scheduledTasks={scheduledTasks} />
      )}

      {/* Mac: Background Activity - Consolidated launchd services and scheduled tasks */}
      {isMac && (scheduledTasks.length > 0 || services.length > 0) && (
        <LaunchdTable 
          launchdItems={[...scheduledTasks, ...services]} 
          title="Background Activity" 
          defaultScope="system"
        />
      )}

      {/* Services Table (Windows) */}
      {!isMac && services.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Windows Services</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  System services and their status ({filteredServices.length} of {services.length} services)
                </p>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Search services..."
                  value={servicesSearch}
                  onChange={(e) => setServicesSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="overflow-hidden">
            <div 
              ref={scrollContainerRef}
              className="max-h-96 overflow-auto overlay-scrollbar"
            >
              <table className="w-full min-w-full">
                <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Service</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Start Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredServices.map((service: any, index: number) => (
                    <tr key={service.name || index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {service.displayName || service.name}
                          </div>
                          {service.displayName && service.name && service.displayName !== service.name && (
                            <div className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                              {service.name}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          (service.status === 'RUNNING' || service.status === 'Running') 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {service.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {service.startType || service.start_type || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {service.description || 'No description available'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredServices.length === 0 && servicesSearch && (
                <div className="px-6 py-8 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No services found matching &quot;{servicesSearch}&quot;
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mac: Extensions (By App / By Category) */}
      {isMac && systemExtensions.length > 0 && (
        <ExtensionsTable extensions={systemExtensions} title="Extensions" />
      )}

      {/* Mac: Kernel Extensions */}
      {isMac && kernelExtensions.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Kernel Extensions</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Third-party kernel extensions (kexts) - {kernelExtensions.length} loaded
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Version</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Size</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {kernelExtensions.map((kext, index) => (
                  <tr key={kext.name || index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white font-mono">{kext.name}</div>
                        {kext.path && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-md">{kext.path}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {kext.version || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {kext.size ? `${(kext.size / 1024).toFixed(1)} KB` : 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        kext.loaded 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}>
                        {kext.loaded ? 'Loaded' : 'Not Loaded'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mac: Privileged Helper Tools */}
      {isMac && privilegedHelperTools.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Privileged Helper Tools</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Background services installed by applications ({filteredHelpers.length} of {privilegedHelperTools.length} tools)
                </p>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  className="block w-full sm:w-64 pl-9 pr-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Search helpers..."
                  value={helperSearch}
                  onChange={(e) => setHelperSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="overflow-x-auto max-h-[416px] overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Team ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Signed</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Bundle ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredHelpers.map((helper, index) => (
                  <tr key={helper.name || index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{helper.name}</div>
                        {helper.path && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate max-w-md">{helper.path}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-900 dark:text-white font-mono">{helper.teamId || 'Unknown'}</span>
                        {helper.teamId && helper.teamId !== 'Unknown' && (
                          <button
                            onClick={() => handleCopyTeamId(helper.teamId!, index)}
                            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            title="Copy Team ID"
                          >
                            {copiedRowIndex === index ? (
                              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        helper.signed 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      }`}>
                        {helper.signed ? 'Signed' : 'Unsigned'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono">
                      {helper.bundleIdentifier || 'Unknown'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mac: Open at Login - after Privileged Helper Tools */}
      {isMac && loginItems.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Open at Login</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Applications that open automatically when you log in ({loginItems.length} items)</p>
          </div>
          <div className="overflow-x-auto max-h-[280px] overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Item</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Kind</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loginItems.map((item, index) => (
                  <tr key={item.name || index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-3">
                      <div className="flex items-center">
                        <div className="w-6 h-6 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center mr-3">
                          <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {item.type || 'Application'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mac: Install History */}
      {isMac && installHistory.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Install History</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Packages installed in the last 30 days ({installHistory.length} packages)
            </p>
          </div>
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Install Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Package</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Version</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {[...installHistory]
                  .sort((a, b) => parseInstallTime(b.installTime) - parseInstallTime(a.installTime))
                  .map((item, index) => (
                  <tr key={item.packageId || index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {item.installTime ? formatExactTime(item.installTime) : 'Unknown'}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white font-mono">{item.packageId}</div>
                        {item.packageFilename && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">{item.packageFilename}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {item.version || 'Unknown'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Environment Variables Table */}
      {environment.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Environment Variables</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">System environment variables</p>
          </div>
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-48">Variable</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {/* Sort PATH to top */}
                {[...environment].sort((a, b) => {
                  if (a.name === 'PATH' || a.name === 'path') return -1
                  if (b.name === 'PATH' || b.name === 'path') return 1
                  return (a.name || '').localeCompare(b.name || '')
                }).map((env: any, index: number) => {
                  const isPath = env.name === 'PATH' || env.name === 'path'
                  const pathParts = isPath ? (env.value || '').split(':').filter(Boolean) : []
                  
                  return (
                    <tr key={env.name || index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap align-top">
                        <div className="text-sm font-medium text-gray-900 dark:text-white font-mono">
                          {env.name}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {isPath ? (
                          <details className="group" open>
                            <summary className="cursor-pointer text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                              <span>{pathParts.length} paths</span>
                              <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </summary>
                            <pre className="mt-2 p-3 bg-gray-100 dark:bg-gray-900 rounded-lg text-xs font-mono text-gray-800 dark:text-gray-200 overflow-x-auto whitespace-pre-wrap break-all">
                              {pathParts.join('\n')}
                            </pre>
                          </details>
                        ) : (
                          <div className="text-sm text-gray-900 dark:text-white font-mono break-all">
                            {env.value}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Debug Accordion for API Data */}
      <div className="mt-6">
        <details className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
          <summary className="cursor-pointer px-4 py-3 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Debug API JSON Data</span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              device.modules.system
            </span>
          </summary>
          <div className="border-t border-gray-200 dark:border-gray-700">
            <div className="p-4">
              <div className="flex justify-end gap-2 mb-2">
                <button
                  onClick={() => {
                    const jsonString = JSON.stringify(device?.modules?.system, null, 2)
                    navigator.clipboard.writeText(jsonString)
                  }}
                  className="px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Copy JSON
                </button>
              </div>
              <pre className="p-4 bg-gray-900 dark:bg-black text-gray-100 text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-[600px] overflow-y-auto rounded border border-gray-700">
                {JSON.stringify(device?.modules?.system, null, 2)}
              </pre>
            </div>
          </div>
        </details>
      </div>
    </div>
  )
}

export default SystemTab

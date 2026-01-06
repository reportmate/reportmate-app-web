/**
 * System Tab Component
 * Detailed system information and operating system details
 */

import { formatExactTime } from '../../lib/time'
import React, { useState, useMemo, useRef, useEffect } from 'react'
import { extractSystem } from '../../lib/data-processing/modules/system'
import { ScheduledTasksTable } from '../tables/ScheduledTasksTable'
import { normalizeKeys } from '../../lib/utils/powershell-parser'

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
  const { services, environment, updates, scheduledTasks, runningServices } = systemTabData
  
  // State for services search
  const [servicesSearch, setServicesSearch] = useState('')
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
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
          </div>
          
          {/* Second Column */}
          <div className="space-y-4">
            
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Edition</label>
              <p className="text-gray-900 dark:text-white">{osInfo?.edition || 'Unknown'}</p>
            </div>
            
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
            
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Keyboard Layout</label>
              <p className="text-gray-900 dark:text-white">{osInfo?.activeKeyboardLayout || 'Unknown'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Windows Updates - Second from top */}
      {updates.length > 0 && (
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
      
      {/* System Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{services.length}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Services</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{runningServices}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Running Services</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{updates.length}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Windows Updates</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{environment.length}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Environment Variables</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-pink-600 dark:text-pink-400">{scheduledTasks.length}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Scheduled Tasks</div>
        </div>
      </div>

      {/* Scheduled Tasks Table */}
      {scheduledTasks.length > 0 && (
        <ScheduledTasksTable scheduledTasks={scheduledTasks} />
      )}

      {/* Services Table */}
      {services.length > 0 && (
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

      {/* Environment Variables Table */}
      {environment.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Environment Variables</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">System environment variables</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Variable</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {environment.slice(0, 10).map((env: any, index: number) => (
                  <tr key={env.name || index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white font-mono">
                        {env.name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white font-mono max-w-md truncate">
                        {env.value}
                      </div>
                    </td>
                  </tr>
                ))}
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

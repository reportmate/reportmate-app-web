/**
 * System Tab Component
 * Detailed system information and operating system details
 */

import { formatExactTime } from '../../lib/time'
import React, { useState, useMemo, useRef, useEffect } from 'react'
import { extractSystem } from '../../lib/data-processing/modules/system'
import { ScheduledTasksTable } from '../tables/ScheduledTasksTable'

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
  // Process system data using the centralized data processing function
  const systemTabData = extractSystem(device)
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
  // Use modules.system data only
  const osInfo = device.modules?.system?.operatingSystem
  const uptimeString = device.modules?.system?.uptimeString

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
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Operating System Details</h3>
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
    </div>
  )
}

export default SystemTab

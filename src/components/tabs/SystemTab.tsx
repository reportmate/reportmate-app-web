/**
 * System Tab Component
 * Detailed system information and operating system details
 */

import { formatExactTime } from '../../lib/time'
import React from 'react'
import { SystemWidget } from '../widgets/System'
import { processSystemTabData } from '../../lib/data-processing/component-data'

interface SystemTabProps {
  device: any
  data?: any
}

export const SystemTab: React.FC<SystemTabProps> = ({ device, data }) => {
  // Process system data using the centralized data processing function
  const systemTabData = processSystemTabData(device)
  const { services, environment, updates, runningServices, operatingSystem } = systemTabData
  
  return (
    <div className="space-y-8">
      {/* System Overview Widget */}
      <SystemWidget device={device} />
      
      {/* System Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
      </div>
      
      {/* Detailed System Information */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Detailed System Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {systemTabData.uptime && systemTabData.uptime !== 'Unknown' && (
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">System Uptime</label>
              <p className="text-gray-900 dark:text-white">{systemTabData.uptime}</p>
            </div>
          )}
          {systemTabData.bootTime && systemTabData.bootTime !== 'Unknown' && (
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Last Boot Time</label>
              <p className="text-gray-900 dark:text-white">{formatExactTime(systemTabData.bootTime)}</p>
            </div>
          )}
          {operatingSystem.installDate && (
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">OS Install Date</label>
              <p className="text-gray-900 dark:text-white">{new Date(operatingSystem.installDate).toLocaleDateString()}</p>
            </div>
          )}
          {operatingSystem.locale && (
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">System Locale</label>
              <p className="text-gray-900 dark:text-white">{operatingSystem.locale}</p>
            </div>
          )}
          {operatingSystem.timeZone && (
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Time Zone</label>
              <p className="text-gray-900 dark:text-white">{operatingSystem.timeZone}</p>
            </div>
          )}
          {operatingSystem.edition && (
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Windows Edition</label>
              <p className="text-gray-900 dark:text-white">{operatingSystem.edition}</p>
            </div>
          )}
        </div>
      </div>

      {/* Services Table */}
      {services.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Windows Services</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">System services and their status</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Service</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Start Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {services.slice(0, 10).map((service: any, index: number) => (
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

      {/* Recent Windows Updates */}
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
    </div>
  )
}

export default SystemTab

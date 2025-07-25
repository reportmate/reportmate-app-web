/**
 * Security Tab Component
 * Comprehensive security status and compliance information
 */

import React from 'react'
import { SecurityCard } from '../tables'

interface SecurityTabProps {
  device: any
  data?: any
}

export const SecurityTab: React.FC<SecurityTabProps> = ({ device, data }) => {
  const processes = device?.processes || []
  const services = device?.services || []
  const environment = device?.environment || []
  
  // Security-related processes and services
  const antivirusProcesses = processes.filter((p: any) => 
    p.name?.toLowerCase().includes('antivirus') || 
    p.name?.toLowerCase().includes('defender') ||
    p.name?.toLowerCase().includes('mcafee') ||
    p.name?.toLowerCase().includes('norton') ||
    p.name?.toLowerCase().includes('avg')
  )
  
  const securityServices = services.filter((s: any) =>
    s.name?.toLowerCase().includes('defender') ||
    s.name?.toLowerCase().includes('firewall') ||
    s.name?.toLowerCase().includes('security') ||
    s.name?.toLowerCase().includes('antimalware') ||
    s.name?.toLowerCase().includes('windows update') ||
    s.name?.toLowerCase().includes('cryptsvc') ||
    s.name?.toLowerCase().includes('wscsvc')
  )
  
  const criticalServices = securityServices.filter((s: any) => s.status === 'RUNNING')
  const stoppedSecurityServices = securityServices.filter((s: any) => s.status === 'STOPPED')
  
  // Environment variables that might indicate security software
  const securityEnvVars = environment.filter((env: any) => 
    env.name?.toLowerCase().includes('antivirus') ||
    env.name?.toLowerCase().includes('defender') ||
    env.name?.toLowerCase().includes('security') ||
    env.name?.toLowerCase().includes('firewall')
  )

  return (
    <div className="space-y-8">
      {/* Security Overview Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{criticalServices.length}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Active Security Services</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stoppedSecurityServices.length}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Stopped Security Services</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{antivirusProcesses.length}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Security Processes</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{securityEnvVars.length}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Security Environment Vars</div>
        </div>
      </div>

      {/* Windows Defender & Security Services */}
      {securityServices.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Security Services</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Windows security and protection services</p>
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
                {securityServices.slice(0, 10).map((service: any, index: number) => (
                  <tr key={service.name || index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{service.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 font-mono">{service.service_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        service.status === 'RUNNING'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {service.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {service.start_type || 'Unknown'}
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

      {/* Security Processes */}
      {antivirusProcesses.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Active Security Processes</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Running antivirus and security processes</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Process</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">PID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Memory (KB)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Path</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {antivirusProcesses.map((process: any, index: number) => (
                  <tr key={process.pid || index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{process.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{process.cmdline}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-white">
                      {process.pid}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-white">
                      {process.resident_size ? Math.round(process.resident_size / 1024) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-500 dark:text-gray-400">
                      {process.path || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Traditional Security Card */}
      <SecurityCard data={data || device.security || {}} />
    </div>
  )
}

export default SecurityTab

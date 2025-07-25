import React from 'react';
import { formatRelativeTime } from '../../lib/time';

interface ManagedPackage {
  id: string;
  name: string;
  displayName: string;
  version: string;
  installedVersion?: string;
  size?: number;
  type: 'munki' | 'cimian';
  status: 'installed' | 'pending_install' | 'pending_removal' | 'install_failed' | 'install_succeeded' | 'uninstalled' | 'uninstall_failed' | 'removed' | 'Pending Update' | 'Installed' | 'Failed';
  lastUpdate: string;
  description?: string;
  publisher?: string;
  category?: string;
}

interface ManagedInstallsData {
  totalPackages: number;
  installed: number;
  pending: number;
  failed: number;
  lastUpdate: string;
  config?: {
    type: 'munki' | 'cimian';
    version: string;
    softwareRepoURL: string;
    appleCatalogURL?: string | null;
    manifest: string;
    localOnlyManifest?: string | null;
    runType: string;
    lastRun: string;
    duration: string;
  };
  messages?: {
    errors: Array<{
      id: string;
      timestamp: string;
      package: string;
      message: string;
      details: string;
    }>;
    warnings: Array<{
      id: string;
      timestamp: string;
      package: string;
      message: string;
      details: string;
    }>;
  };
  packages: ManagedPackage[];
}

interface ManagedInstallsTableProps {
  data: ManagedInstallsData;
}

export const ManagedInstallsTable: React.FC<ManagedInstallsTableProps> = ({ data }) => {
  if (!data || !data.packages || data.packages.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Managed Installs</h3>
        <p className="text-gray-600 dark:text-gray-400">This device does not have managed software installations configured.</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'installed':
      case 'Installed':
      case 'install_succeeded':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending_install':
      case 'Pending Update':
        return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200';
      case 'pending_removal':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'install_failed':
      case 'Failed':
      case 'uninstall_failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Layout: 1/3 left sidebar for config + 2/3 right area for packages */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Sidebar - Configuration and Status (1/3 width) */}
        <div className="lg:col-span-1 space-y-6">
          {/* Error and Warning Messages */}
          {data.messages && (data.messages.errors.length > 0 || data.messages.warnings.length > 0) && (
            <div className="space-y-4">
              {data.messages.errors.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <div className="flex items-center mb-2">
                    <div className="w-4 h-4 text-red-600 dark:text-red-400 mr-2">
                      <svg fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h4 className="text-xs font-medium text-red-800 dark:text-red-200">
                      {data.messages.errors.length} Error{data.messages.errors.length !== 1 ? 's' : ''}
                    </h4>
                  </div>
                  <div className="space-y-1">
                    {data.messages.errors.slice(0, 2).map((error) => (
                      <div key={error.id} className="text-xs text-red-700 dark:text-red-300">
                        <span className="font-medium">{error.package}:</span> {error.message}
                      </div>
                    ))}
                    {data.messages.errors.length > 2 && (
                      <div className="text-xs text-red-600 dark:text-red-400">
                        ... and {data.messages.errors.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {data.messages.warnings.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                  <div className="flex items-center mb-2">
                    <div className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mr-2">
                      <svg fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h4 className="text-xs font-medium text-yellow-800 dark:text-yellow-200">
                      {data.messages.warnings.length} Warning{data.messages.warnings.length !== 1 ? 's' : ''}
                    </h4>
                  </div>
                  <div className="space-y-1">
                    {data.messages.warnings.slice(0, 2).map((warning) => (
                      <div key={warning.id} className="text-xs text-yellow-700 dark:text-yellow-300">
                        <span className="font-medium">{warning.package}:</span> {warning.message}
                      </div>
                    ))}
                    {data.messages.warnings.length > 2 && (
                      <div className="text-xs text-yellow-600 dark:text-yellow-400">
                        ... and {data.messages.warnings.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Configuration Section */}
          {data.config && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      {data.config.type === 'cimian' ? 'Cimian' : 'Munki'} Config
                    </h3>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Manifest</label>
                    <p className="text-xs font-mono text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 p-2 rounded break-all">
                      {data.config.manifest}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Repository URL</label>
                    <p className="text-xs font-mono text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 p-2 rounded break-all">
                      {data.config.softwareRepoURL}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Version</label>
                    <p className="text-sm text-gray-900 dark:text-white">{data.config.version}</p>
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Last Run</label>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {formatRelativeTime(data.config.lastRun)}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Run Type</label>
                    <p className="text-sm text-gray-900 dark:text-white">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        data.config.runType === 'auto' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        data.config.runType === 'manual' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                      }`}>
                        {data.config.runType}
                      </span>
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Duration</label>
                    <p className="text-sm text-gray-900 dark:text-white">{data.config.duration}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-xl font-bold text-gray-900 dark:text-white">{data.totalPackages}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Total</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-xl font-bold text-green-600 dark:text-green-400">{data.installed}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Installed</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-xl font-bold text-yellow-600 dark:text-yellow-400">{data.pending}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Pending</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-xl font-bold text-red-600 dark:text-red-400">{data.failed}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Failed</div>
            </div>
          </div>
        </div>

        {/* Right Area - Packages Table (2/3 width) */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Managed Packages</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Packages managed by {data.config?.type === 'cimian' ? 'Cimian' : 'Munki'}
                  </p>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Package</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Version</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Last Update</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {[...data.packages].sort((a, b) => 
                    (a.displayName || a.name).localeCompare(b.displayName || b.name)
                  ).map((pkg) => (
                    <tr key={pkg.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{pkg.displayName}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{pkg.name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {pkg.version}
                          {pkg.installedVersion && pkg.installedVersion !== pkg.version && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              (installed: {pkg.installedVersion})
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(pkg.status)}`}>
                          {pkg.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatRelativeTime(pkg.lastUpdate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagedInstallsTable;

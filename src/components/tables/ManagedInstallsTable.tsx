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
    <div className="space-y-8">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{data.totalPackages}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Packages</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{data.installed}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Installed</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{data.pending}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Pending</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{data.failed}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Failed</div>
        </div>
      </div>

      {/* Packages Table */}
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
                Packages managed by {data.config?.type === 'munki' ? 'Munki' : data.config?.type === 'cimian' ? 'Cimian' : 'management system'}
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
  );
};

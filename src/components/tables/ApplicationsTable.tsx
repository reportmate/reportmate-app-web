import React from 'react';
import { formatRelativeTime } from '../../lib/time';

interface ApplicationInfo {
  id: string;
  name: string;
  displayName?: string;
  path?: string;
  version: string;
  bundle_version?: string;
  last_modified?: number;
  obtained_from?: string;
  runtime_environment?: string;
  info?: string;
  has64bit?: boolean;
  signed_by?: string;
  publisher?: string;
  category?: string;
  installDate?: string;  // Windows install date format
  size?: string;
  bundleId?: string;
  // Service-specific fields
  status?: string;
  startType?: string;
  description?: string;
}

interface ApplicationsData {
  totalApps: number;
  signedApps?: number;
  recentApps?: number;
  runningApps?: number;
  stoppedApps?: number;
  installedApps: ApplicationInfo[];
}

interface ApplicationsTableProps {
  data: ApplicationsData;
}

export const ApplicationsTable: React.FC<ApplicationsTableProps> = ({ data }) => {
  if (!data || !data.installedApps || data.installedApps.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-7H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Applications Data</h3>
        <p className="text-gray-600 dark:text-gray-400">Application information is not available for this device.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{data.totalApps}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Applications</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{data.signedApps || 0}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Signed Applications</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{data.recentApps || 0}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Recently Installed</div>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-7H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Installed Applications</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Complete software inventory for this device</p>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Application</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Version</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Publisher</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Install Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {data.installedApps.map((app, index) => (
                <tr key={app.id || app.name || `app-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {app.displayName || app.name}
                      </div>
                      {app.path && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-mono">
                          {app.path}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {app.version || 'Unknown'}
                    </div>
                    {app.bundle_version && app.bundle_version !== app.version && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Bundle: {app.bundle_version}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {app.publisher || app.signed_by || 'Unknown'}
                    </div>
                    {app.signed_by && (
                      <div className="text-xs text-green-600 dark:text-green-400">
                        ✓ Signed
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {app.category || 'Uncategorized'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {app.installDate ? formatRelativeTime(app.installDate) : 'Unknown'}
                    </div>
                    {app.size && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {app.size}
                      </div>
                    )}
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

import React, { useState } from 'react';
import { formatRelativeTime } from '../../lib/time';
import { InstallsData } from '../../lib/data-processing/component-data';

interface ManagedInstallsTableProps {
  data: InstallsData;
}

export const ManagedInstallsTable: React.FC<ManagedInstallsTableProps> = ({ data }) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'installed' | 'pending' | 'warning' | 'error' | 'removed'>('all');
  const [expandedErrors, setExpandedErrors] = useState(false);
  const [expandedWarnings, setExpandedWarnings] = useState(false);

  // Debug the data being passed to the table
  console.log('🔍 [MANAGED INSTALLS TABLE] Received data:', {
    hasData: !!data,
    totalPackages: data?.totalPackages,
    packagesLength: data?.packages?.length,
    hasConfig: !!data?.config,
    configType: data?.config?.type,
    systemName: data?.systemName,
    firstPackage: data?.packages?.[0],
    samplePackageFields: data?.packages?.[0] ? Object.keys(data.packages[0]) : []
  });

  // Check if this is truly no managed installs system vs. no packages
  const hasManagementSystem = data?.config || data?.systemName;
  const hasPackages = data?.packages && data.packages.length > 0;

  console.log('🔍 [MANAGED INSTALLS TABLE] System status:', {
    hasManagementSystem,
    hasPackages,
    configExists: !!data?.config,
    systemName: data?.systemName
  });

  // Only show "No Managed Installs" if there's no management system configured at all
  if (!data || (!hasManagementSystem && !hasPackages)) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2-2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Managed Installs</h3>
        <p className="text-gray-600 dark:text-gray-400">This device does not have managed software installations configured.</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    const statusLower = status?.toLowerCase() || '';
    switch (statusLower) {
      case 'installed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending':
        return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'removed':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getFilteredPackages = () => {
    if (!data.packages || data.packages.length === 0) return [];
    if (statusFilter === 'all') return data.packages;
    
    return data.packages.filter(pkg => {
      const status = pkg.status?.toLowerCase() || '';
      switch (statusFilter) {
        case 'installed':
          return status === 'installed';
        case 'pending':
          return status === 'pending';
        case 'warning':
          return status === 'warning'; 
        case 'error':
          return status === 'error';
        case 'removed':
          return status === 'removed';
        default:
          return true;
      }
    });
  };

  const filteredPackages = getFilteredPackages();

  // Calculate counts for each status (handle empty packages array)
  const installedCount = data.packages ? data.packages.filter(pkg => pkg.status?.toLowerCase() === 'installed').length : 0;
  const pendingCount = data.packages ? data.packages.filter(pkg => pkg.status?.toLowerCase() === 'pending').length : 0;
  const warningCount = data.packages ? data.packages.filter(pkg => pkg.status?.toLowerCase() === 'warning').length : 0;
  const errorCount = data.packages ? data.packages.filter(pkg => pkg.status?.toLowerCase() === 'error').length : 0;
  const removedCount = data.packages ? data.packages.filter(pkg => pkg.status?.toLowerCase() === 'removed').length : 0;

  return (
    <div className="space-y-6">
      {/* Full Width Packages Table */}
      <div className="space-y-4">
        {/* Error and Warning Messages - Above Packages Table Only */}
        {data.messages && (data.messages.errors.length > 0 || data.messages.warnings.length > 0) && (
          <div className="space-y-4">
              {/* Errors Section */}
              {data.messages.errors.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div 
                    className="p-4 cursor-pointer select-none"
                    onClick={() => setExpandedErrors(!expandedErrors)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-5 h-5 text-red-600 dark:text-red-400 mr-3">
                          <svg fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <h3 className="text-sm font-semibold text-red-800 dark:text-red-200">
                          {data.messages.errors.length} Error{data.messages.errors.length !== 1 ? 's' : ''} Detected
                        </h3>
                      </div>
                      <div className="flex items-center text-red-600 dark:text-red-400">
                        <span className="text-xs mr-2">Click to {expandedErrors ? 'collapse' : 'expand'}</span>
                        <svg 
                          className={`w-4 h-4 transition-transform duration-200 ${expandedErrors ? 'rotate-180' : ''}`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    
                    {/* Preview - show first error when collapsed */}
                    {!expandedErrors && data.messages.errors.length > 0 && (
                      <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                        <span className="font-medium">{data.messages.errors[0].package}:</span> {data.messages.errors[0].message}
                        {data.messages.errors.length > 1 && (
                          <span className="ml-2 text-red-600 dark:text-red-400 font-medium">
                            +{data.messages.errors.length - 1} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Expanded Content */}
                  {expandedErrors && (
                    <div className="border-t border-red-200 dark:border-red-800 p-4 bg-red-25 dark:bg-red-900/10">
                      <div className="space-y-4">
                        {data.messages.errors.map((error: { id: string; package?: string; message: string; timestamp?: string; context?: { runType?: string }; details?: string }) => (
                          <div key={error.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-red-200 dark:border-red-700">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-semibold text-red-800 dark:text-red-200">
                                    {error.package || 'System'}
                                  </span>
                                  {error.timestamp && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      {new Date(error.timestamp).toLocaleString()}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-red-700 dark:text-red-300 mb-2">
                                  {error.message}
                                </p>
                                
                                {/* Simplified Context Information - Only Run Type */}
                                {error.context && error.context.runType && (
                                  <div className="text-xs text-gray-600 dark:text-gray-400">
                                    <span className="font-medium">Run Type:</span> {error.context.runType}
                                  </div>
                                )}
                                
                                {error.details && (
                                  <div className="mt-3">
                                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Technical Details:</p>
                                    <pre className="text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-2 rounded border overflow-x-auto max-h-32">
                                      {error.details}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Warnings Section */}
              {data.messages.warnings.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div 
                    className="p-4 cursor-pointer select-none"
                    onClick={() => setExpandedWarnings(!expandedWarnings)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-3">
                          <svg fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                          {data.messages.warnings.length} Warning{data.messages.warnings.length !== 1 ? 's' : ''} Detected
                        </h3>
                      </div>
                      <div className="flex items-center text-yellow-600 dark:text-yellow-400">
                        <span className="text-xs mr-2">Click to {expandedWarnings ? 'collapse' : 'expand'}</span>
                        <svg 
                          className={`w-4 h-4 transition-transform duration-200 ${expandedWarnings ? 'rotate-180' : ''}`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    
                    {/* Preview - show first warning when collapsed */}
                    {!expandedWarnings && data.messages.warnings.length > 0 && (
                      <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                        <span className="font-medium">{data.messages.warnings[0].package}:</span> {data.messages.warnings[0].message}
                        {data.messages.warnings.length > 1 && (
                          <span className="ml-2 text-yellow-600 dark:text-yellow-400 font-medium">
                            +{data.messages.warnings.length - 1} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Expanded Content */}
                  {expandedWarnings && (
                    <div className="border-t border-yellow-200 dark:border-yellow-800 p-4 bg-yellow-25 dark:bg-yellow-900/10">
                      <div className="space-y-4">
                        {data.messages.warnings.map((warning: { id: string; package?: string; message: string; timestamp?: string; context?: { runType?: string }; details?: string }) => (
                          <div key={warning.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-yellow-200 dark:border-yellow-700">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                                    {warning.package || 'System'}
                                  </span>
                                  {warning.timestamp && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      {new Date(warning.timestamp).toLocaleString()}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-2">
                                  {warning.message}
                                </p>
                                
                                {/* Simplified Context Information - Only Run Type */}
                                {warning.context && warning.context.runType && (
                                  <div className="text-xs text-gray-600 dark:text-gray-400">
                                    <span className="font-medium">Run Type:</span> {warning.context.runType}
                                  </div>
                                )}
                                
                                {warning.details && (
                                  <div className="mt-3">
                                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Technical Details:</p>
                                    <pre className="text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-2 rounded border overflow-x-auto max-h-32">
                                      {warning.details}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Packages Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      Managed Packages:
                      <span className="text-sm font-semibold text-gray-900 dark:text-white"> {data.totalPackages || 0}</span>
                    </h3>
                  </div>
                </div>
                
                {/* Status Filters */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                      statusFilter === 'all'
                        ? 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setStatusFilter('installed')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                      statusFilter === 'installed'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    Installed - {installedCount}
                  </button>
                  <button
                    onClick={() => setStatusFilter('pending')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                      statusFilter === 'pending'
                        ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    Pending - {pendingCount}
                  </button>
                  <button
                    onClick={() => setStatusFilter('warning')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                      statusFilter === 'warning'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    Warning - {warningCount}
                  </button>
                  <button
                    onClick={() => setStatusFilter('error')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                      statusFilter === 'error'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    Error - {errorCount}
                  </button>
                  <button
                    onClick={() => setStatusFilter('removed')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                      statusFilter === 'removed'
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    Removed - {removedCount}
                  </button>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto overlay-scrollbar">
              {statusFilter !== 'all' && (
                <div className="px-6 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Showing {filteredPackages.length} of {data.packages.length} packages
                    <span className="ml-2">
                      filtered by: <span className="font-medium capitalize">{statusFilter}</span>
                    </span>
                  </div>
                </div>
              )}
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
                  {!hasPackages ? (
                    // Empty state when managed system is configured but no packages
                    <tr>
                      <td colSpan={4} className="px-6 py-16">
                        <div className="text-center">
                          <div className="w-12 h-12 mx-auto mb-4 bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                            {data.systemName ? `${data.systemName.charAt(0).toUpperCase() + data.systemName.slice(1)} System Active` : 'Management System Active'}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            The managed installs system is configured and running, but no packages are currently assigned to this device.
                          </p>
                          {data.config?.lastRun && (
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                              Last check: {formatRelativeTime(data.config.lastRun)}
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    // Show packages when available
                    [...filteredPackages].sort((a, b) => 
                      (a.displayName || a.name).localeCompare(b.displayName || b.name)
                    ).map((pkg) => (
                      <tr key={pkg.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{pkg.displayName || pkg.name || 'Unknown Package'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {pkg.version || 'Unknown'}
                            {pkg.installedVersion && pkg.installedVersion !== pkg.version && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {pkg.installedVersion} installed
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(pkg.status || 'unknown')}`}>
                            {(pkg.status || 'Unknown').replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatRelativeTime(pkg.lastUpdate)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
    </div>
  );
};

export default ManagedInstallsTable;

import React, { useState } from 'react';
import { formatRelativeTime } from '../../lib/time';
import { InstallsInfo } from '../../lib/data-processing/modules';
import { getErrorCodeInfo, categorizeError, getErrorDescription, getRecommendedAction, ErrorCategory, ErrorMessage, WarningMessage } from '../../lib/data-processing/modules/installs';

interface ManagedInstallsTableProps {
  data: InstallsInfo;
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
    cacheSizeMb: data?.cacheSizeMb,
    hasCacheSizeMb: !!data?.cacheSizeMb,
    cacheSizeMbType: typeof data?.cacheSizeMb,
    firstPackage: data?.packages?.[0],
    samplePackageFields: data?.packages?.[0] ? Object.keys(data.packages[0]) : [],
    allDataKeys: data ? Object.keys(data) : []
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

  // Get category color for error badges
  const getCategoryColor = (category: ErrorCategory) => {
    switch (category) {
      case ErrorCategory.ARCHITECTURE:
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case ErrorCategory.MSI_INSTALLER:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case ErrorCategory.EXE_INSTALLER:
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
      case ErrorCategory.CHOCOLATEY:
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case ErrorCategory.POWERSHELL:
        return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200';
      case ErrorCategory.TIMEOUT:
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case ErrorCategory.DEPENDENCY:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  // UPDATED: Display proper capitalization while maintaining lowercase comparison
  const getStatusDisplay = (status: string) => {
    const statusLower = status?.toLowerCase() || '';
    switch (statusLower) {
      case 'installed': return 'Installed';
      case 'pending': return 'Pending';
      case 'warning': return 'Warning';
      case 'error': return 'Error';
      case 'removed': return 'Removed';
      default: return status || 'Unknown';
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
                        {data.messages.errors.map((error: ErrorMessage) => {
                          const category = categorizeError(error);
                          const codeInfo = getErrorCodeInfo(error.code);
                          const description = getErrorDescription(error);
                          const recommendedAction = getRecommendedAction(error);
                          
                          return (
                            <div key={error.id || `error-${Date.now()}`} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-red-200 dark:border-red-700">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-semibold text-red-800 dark:text-red-200">
                                        {error.package || 'System'}
                                      </span>
                                      {/* Error Category Badge */}
                                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(category)}`}>
                                        {category.replace('_', ' ')}
                                      </span>
                                      {/* Error Code Badge */}
                                      {error.code && (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                                          Code: {error.code}
                                        </span>
                                      )}
                                    </div>
                                    {error.timestamp && (
                                      <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {new Date(error.timestamp).toLocaleString()}
                                      </span>
                                    )}
                                  </div>
                                  
                                  {/* Enhanced Error Description */}
                                  <div className="mb-2">
                                    <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                                      {description}
                                    </p>
                                    <p className="text-sm text-red-700 dark:text-red-300">
                                      {error.message}
                                    </p>
                                  </div>
                                  
                                  {/* Enhanced Context Information */}
                                  {error.context && (
                                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                      {error.context.runType && (
                                        <div><span className="font-medium">Run Type:</span> {error.context.runType}</div>
                                      )}
                                      {error.context.exitCode && (
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium">Exit Code:</span> {error.context.exitCode}
                                          {error.context.exitMeaning && (
                                            <span className="text-red-600 dark:text-red-400">({error.context.exitMeaning})</span>
                                          )}
                                        </div>
                                      )}
                                      {error.context.systemArch && error.context.supportedArch && (
                                        <div>
                                          <span className="font-medium">Architecture:</span> System: {error.context.systemArch}, 
                                          Package supports: {Array.isArray(error.context.supportedArch) ? error.context.supportedArch.join(', ') : error.context.supportedArch}
                                        </div>
                                      )}
                                      {error.context.installerPath && (
                                        <div><span className="font-medium">Installer:</span> {error.context.installerPath}</div>
                                      )}
                                      {error.context.commandUsed && (
                                        <div><span className="font-medium">Command:</span> {error.context.commandUsed}</div>
                                      )}
                                      {error.context.timeoutDuration && (
                                        <div><span className="font-medium">Timeout:</span> {error.context.timeoutDuration}s</div>
                                      )}
                                    </div>
                                  )}
                                  
                                  {/* Recommended Action */}
                                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                    <div className="flex items-start gap-2">
                                      <div className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5">
                                        <svg fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                        </svg>
                                      </div>
                                      <div className="flex-1">
                                        <p className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">Recommended Action</p>
                                        <p className="text-xs text-blue-700 dark:text-blue-300">{recommendedAction}</p>
                                      </div>
                                    </div>
                                  </div>
                                  
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
                          );
                        })}
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
                        {data.messages.warnings.map((warning: WarningMessage) => {
                          const category = categorizeError(warning);
                          const codeInfo = getErrorCodeInfo(warning.code);
                          const description = getErrorDescription(warning);
                          const recommendedAction = getRecommendedAction(warning);
                          
                          return (
                            <div key={warning.id || `warning-${Date.now()}`} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-yellow-200 dark:border-yellow-700">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                                        {warning.package || 'System'}
                                      </span>
                                      {/* Warning Category Badge */}
                                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(category)}`}>
                                        {category.replace('_', ' ')}
                                      </span>
                                      {/* Warning Code Badge */}
                                      {warning.code && (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                                          Code: {warning.code}
                                        </span>
                                      )}
                                    </div>
                                    {warning.timestamp && (
                                      <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {new Date(warning.timestamp).toLocaleString()}
                                      </span>
                                    )}
                                  </div>
                                  
                                  {/* Enhanced Warning Description */}
                                  <div className="mb-2">
                                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                                      {description}
                                    </p>
                                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                      {warning.message}
                                    </p>
                                  </div>
                                  
                                  {/* Enhanced Context Information */}
                                  {warning.context && (
                                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                      {warning.context.runType && (
                                        <div><span className="font-medium">Run Type:</span> {warning.context.runType}</div>
                                      )}
                                      {warning.context.exitCode && (
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium">Exit Code:</span> {warning.context.exitCode}
                                          {warning.context.exitMeaning && (
                                            <span className="text-yellow-600 dark:text-yellow-400">({warning.context.exitMeaning})</span>
                                          )}
                                        </div>
                                      )}
                                      {warning.context.systemArch && warning.context.supportedArch && (
                                        <div>
                                          <span className="font-medium">Architecture:</span> System: {warning.context.systemArch}, 
                                          Package supports: {Array.isArray(warning.context.supportedArch) ? warning.context.supportedArch.join(', ') : warning.context.supportedArch}
                                        </div>
                                      )}
                                      {warning.context.installerPath && (
                                        <div><span className="font-medium">Installer:</span> {warning.context.installerPath}</div>
                                      )}
                                    </div>
                                  )}
                                  
                                  {/* Recommended Action */}
                                  <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                                    <div className="flex items-start gap-2">
                                      <div className="w-4 h-4 text-orange-600 dark:text-orange-400 mt-0.5">
                                        <svg fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                        </svg>
                                      </div>
                                      <div className="flex-1">
                                        <p className="text-xs font-medium text-orange-800 dark:text-orange-200 mb-1">Recommended Action</p>
                                        <p className="text-xs text-orange-700 dark:text-orange-300">{recommendedAction}</p>
                                      </div>
                                    </div>
                                  </div>
                                  
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
                          );
                        })}
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
                      Managed Items:
                      <span className="text-sm font-semibold text-gray-900 dark:text-white"> {data.totalPackages || 0}</span>
                      {data.cacheSizeMb && (
                        <>
                          <span className="text-gray-500 dark:text-gray-400 mx-2">•</span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            Cache: {data.cacheSizeMb.toFixed(1)} MB
                          </span>
                        </>
                      )}
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
                            {getStatusDisplay(pkg.status || 'Unknown')}
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

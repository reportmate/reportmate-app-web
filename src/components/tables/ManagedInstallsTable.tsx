import React, { useState, useMemo } from 'react';
import { formatRelativeTime, formatExactTime } from '../../lib/time';
import { InstallsInfo, InstallPackage, ErrorMessage, WarningMessage } from '../../lib/data-processing/modules/installs';

// Helper function to format item size from bytes to human readable format
const formatItemSize = (sizeBytes?: string): string => {
  if (!sizeBytes || sizeBytes === '0') return '';
  
  const bytes = parseInt(sizeBytes, 10);
  if (isNaN(bytes) || bytes === 0) return '';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  const formatted = unitIndex === 0 ? size.toString() : size.toFixed(1);
  return `${formatted} ${units[unitIndex]}`;
};

interface ManagedInstallsTableProps {
  data: InstallsInfo;
}

export const ManagedInstallsTable: React.FC<ManagedInstallsTableProps> = ({ data }) => {
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPackageIds, setExpandedPackageIds] = useState<Set<string>>(new Set());
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const groupByCategory = true; // Always enabled

  const togglePackageExpansion = (packageId: string) => {
    const newExpandedIds = new Set(expandedPackageIds);
    if (newExpandedIds.has(packageId)) {
      newExpandedIds.delete(packageId);
    } else {
      newExpandedIds.add(packageId);
    }
    setExpandedPackageIds(newExpandedIds);
  };

  const toggleCategoryCollapse = (category: string) => {
    const newCollapsed = new Set(collapsedCategories);
    if (newCollapsed.has(category)) {
      newCollapsed.delete(category);
    } else {
      newCollapsed.add(category);
    }
    setCollapsedCategories(newCollapsed);
  };

  const toggleAllCategories = () => {
    if (collapsedCategories.size === 0) {
      // Collapse all
      if (groupedPackages) {
        setCollapsedCategories(new Set(groupedPackages.sortedCategories));
      }
    } else {
      // Expand all
      setCollapsedCategories(new Set());
    }
  };

  const toggleFilter = (filter: string) => {
    const newFilters = new Set(statusFilter);
    if (newFilters.has(filter)) {
      newFilters.delete(filter);
    } else {
      newFilters.add(filter);
    }
    setStatusFilter(newFilters);
  };

  const clearFilters = () => {
    setStatusFilter(new Set());
  };

  // Early return for completely missing data
  if (!data) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2-2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Install Data</h3>
        <p className="text-gray-600 dark:text-gray-400">No managed install data is available.</p>
      </div>
    );
  }

  // Check if this is truly no managed installs system vs. no packages
  const hasManagementSystem = data?.config || data?.systemName;
  const hasPackages = data?.packages && Array.isArray(data.packages) && data.packages.length > 0;

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
    if (!data || !data.packages || !Array.isArray(data.packages) || data.packages.length === 0) {
      return [];
    }
    
    let filtered = data.packages;

    // Apply status filter (multi-select)
    if (statusFilter.size > 0) {
      filtered = filtered.filter((pkg: any) => {
        const status = pkg.status?.toLowerCase() || '';
        return statusFilter.has(status);
      });
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((pkg: any) => 
        (pkg.displayName || pkg.name || '').toLowerCase().includes(query)
      );
    }
    
    return filtered;
  };

  const filteredPackages = getFilteredPackages();

  // Group packages by category
  const groupedPackages = useMemo(() => {
    if (!groupByCategory) {
      return null;
    }
    
    const groups: Record<string, InstallPackage[]> = {};
    const uncategorized: InstallPackage[] = [];
    
    for (const pkg of filteredPackages) {
      const category = pkg.category?.trim() || '';
      if (category) {
        if (!groups[category]) {
          groups[category] = [];
        }
        groups[category].push(pkg);
      } else {
        uncategorized.push(pkg);
      }
    }
    
    // Sort packages within each group alphabetically
    for (const category of Object.keys(groups)) {
      groups[category].sort((a, b) => 
        (a.displayName || a.name).localeCompare(b.displayName || b.name)
      );
    }
    uncategorized.sort((a, b) => 
      (a.displayName || a.name).localeCompare(b.displayName || b.name)
    );
    
    // Get sorted category names
    const sortedCategories = Object.keys(groups).sort();
    
    // Add uncategorized at the end if there are any
    if (uncategorized.length > 0) {
      groups['Uncategorized'] = uncategorized;
      sortedCategories.push('Uncategorized');
    }
    
    return { groups, sortedCategories };
  }, [filteredPackages, groupByCategory]);

  // Check if any packages have categories
  const hasCategories = useMemo(() => {
    return filteredPackages.some(pkg => pkg.category && pkg.category.trim() !== '');
  }, [filteredPackages]);

  // Calculate counts for each status (handle empty packages array)
  const packages = data?.packages && Array.isArray(data.packages) ? data.packages : [];
  const installedCount = packages.filter((pkg: any) => pkg.status?.toLowerCase() === 'installed').length;
  const pendingCount = packages.filter((pkg: any) => pkg.status?.toLowerCase() === 'pending').length;
  const warningCount = packages.filter((pkg: any) => pkg.status?.toLowerCase() === 'warning').length;
  const errorCount = packages.filter((pkg: any) => pkg.status?.toLowerCase() === 'error').length;
  const removedCount = packages.filter((pkg: any) => pkg.status?.toLowerCase() === 'removed').length;

  return (
    <div className="space-y-6">
      {/* Full Width Packages Table */}
      <div className="space-y-4">
          {/* Packages Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      Managed Items:
                      <span className="text-sm font-semibold text-gray-900 dark:text-white"> {data.totalPackages || 0}</span>
                      {data.cacheSizeMb && (
                        <>
                          <span className="text-gray-500 dark:text-gray-400 mx-2"></span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            Cache: {data.cacheSizeMb.toFixed(1)} MB
                          </span>
                        </>
                      )}
                    </h3>
                  </div>
                  {/* Clear Filters Button */}
                  {statusFilter.size > 0 && (
                    <button
                      onClick={clearFilters}
                      className="px-3 py-1.5 text-xs font-medium rounded-full transition-colors bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 hover:bg-yellow-200 dark:hover:bg-yellow-800"
                    >
                      Clear Filters
                    </button>
                  )}
                  {/* Expand/Collapse All Categories Button */}
                  {hasCategories && groupedPackages && groupedPackages.sortedCategories.length > 0 && (
                    <button
                      onClick={toggleAllCategories}
                      className="px-3 py-1.5 text-xs font-medium rounded-full transition-colors flex items-center gap-1 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      {collapsedCategories.size === 0 ? (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                          Collapse All
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                          Expand All
                        </>
                      )}
                    </button>
                  )}
                </div>
                
                {/* Search and Filters */}
                <div className="flex items-center gap-4">
                  {/* Status Filters */}
                  <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleFilter('installed')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                      statusFilter.has('installed')
                        ? 'bg-green-600 text-white dark:bg-green-400 dark:text-gray-900'
                        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                    }`}
                  >
                    Installed - {installedCount}
                  </button>
                  <button
                    onClick={() => toggleFilter('pending')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                      statusFilter.has('pending')
                        ? 'bg-cyan-600 text-white dark:bg-cyan-400 dark:text-gray-900'
                        : 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300 hover:bg-cyan-200 dark:hover:bg-cyan-900/50'
                    }`}
                  >
                    Pending - {pendingCount}
                  </button>
                  <button
                    onClick={() => toggleFilter('warning')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                      statusFilter.has('warning')
                        ? 'bg-yellow-600 text-white dark:bg-yellow-400 dark:text-gray-900'
                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-900/50'
                    }`}
                  >
                    Warning - {warningCount}
                  </button>
                  <button
                    onClick={() => toggleFilter('error')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                      statusFilter.has('error')
                        ? 'bg-red-600 text-white dark:bg-red-400 dark:text-gray-900'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50'
                    }`}
                  >
                    Error - {errorCount}
                  </button>
                  <button
                    onClick={() => toggleFilter('removed')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                      statusFilter.has('removed')
                        ? 'bg-purple-600 text-white dark:bg-purple-400 dark:text-gray-900'
                        : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50'
                    }`}
                  >
                    Removed - {removedCount}
                  </button>
                </div>

                  {/* Search Input */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Search items..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500 dark:placeholder-gray-400 w-48 transition-all focus:w-64"
                    />
                  </div>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto overlay-scrollbar">
              {statusFilter.size > 0 && (
                <div className="px-6 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Showing {filteredPackages.length} of {packages.length} packages
                    <span className="ml-2">
                      filtered by: <span className="font-medium capitalize">{Array.from(statusFilter).join(', ')}</span>
                    </span>
                  </div>
                </div>
              )}
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Package</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Version</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Item Size</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date Processed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {!hasPackages ? (
                    // Empty state when managed system is configured but no packages
                    <tr>
                      <td colSpan={5} className="px-6 py-16">
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
                  ) : filteredPackages.length === 0 && statusFilter.size > 0 ? (
                    // Empty state when filters are active but no matching packages
                    <tr>
                      <td colSpan={5} className="px-6 py-16">
                        <div className="text-center">
                          <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                            </svg>
                          </div>
                          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                            No items with {Array.from(statusFilter).map(f => f.toLowerCase()).join(' or ')}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            No packages match the selected filter{statusFilter.size > 1 ? 's' : ''}.
                          </p>
                          <button
                            onClick={clearFilters}
                            className="mt-4 px-4 py-2 text-sm font-medium rounded-lg transition-colors bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                          >
                            Clear Filters
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    // Show packages when available
                    <>
                      {groupByCategory && groupedPackages && hasCategories ? (
                        // Grouped by category view
                        groupedPackages.sortedCategories.map((category) => {
                          const categoryPackages = groupedPackages.groups[category];
                          const isCollapsed = collapsedCategories.has(category);
                          
                          return (
                            <React.Fragment key={`category-${category}`}>
                              {/* Category Header Row */}
                              <tr 
                                className="bg-gray-100 dark:bg-gray-800 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                                onClick={() => toggleCategoryCollapse(category)}
                              >
                                <td colSpan={5} className="px-6 py-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <svg 
                                        className={`w-4 h-4 text-gray-600 dark:text-gray-400 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-90'}`}
                                        fill="none" 
                                        stroke="currentColor" 
                                        viewBox="0 0 24 24"
                                      >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                      </svg>
                                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                        {category}
                                      </span>
                                      <span className="text-xs text-gray-600 dark:text-gray-400 ml-2">
                                        ({categoryPackages.length} {categoryPackages.length === 1 ? 'item' : 'items'})
                                      </span>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                              
                              {/* Category Packages */}
                              {!isCollapsed && categoryPackages.map((pkg) => {
                                const hasErrorsOrWarnings = (pkg.errors && pkg.errors.length > 0) || (pkg.warnings && pkg.warnings.length > 0);
                                const hasPendingReason = pkg.status?.toLowerCase() === 'pending' && pkg.pendingReason && pkg.pendingReason.trim() !== '';
                                const hasExpandableContent = hasErrorsOrWarnings || hasPendingReason;
                                const isExpanded = expandedPackageIds.has(pkg.id);
                                
                                return (
                                  <React.Fragment key={pkg.id}>
                                    {/* Main Package Row */}
                                    <tr 
                                      className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${hasExpandableContent ? 'cursor-pointer' : ''}`}
                                      onClick={() => hasExpandableContent && togglePackageExpansion(pkg.id)}
                                    >
                                      <td className="px-6 py-4 whitespace-nowrap pl-12">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(pkg.status || 'unknown')}`}>
                                          {getStatusDisplay(pkg.status || 'Unknown')}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                          {pkg.displayName || pkg.name || 'Unknown Package'}
                                        </div>
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
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {formatItemSize(pkg.itemSize) || ''}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        <div className="flex items-center justify-between">
                                          <span>{pkg.lastUpdate ? formatRelativeTime(pkg.lastUpdate) : ''}</span>
                                          {hasExpandableContent && (
                                            <svg 
                                              className={`w-5 h-5 text-gray-400 dark:text-gray-500 transition-transform duration-200 ml-2 ${isExpanded ? 'rotate-90' : ''}`}
                                              fill="none" 
                                              stroke="currentColor" 
                                              viewBox="0 0 24 24"
                                            >
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                          )}
                                        </div>
                                      </td>
                                    </tr>

                                    {/* Expandable Error/Warning/Pending Details Row */}
                                    {isExpanded && hasExpandableContent && (
                                      <tr className="bg-gray-50 dark:bg-gray-900">
                                        <td colSpan={5} className="px-6 py-4">
                                          <div className="space-y-3">
                                            {/* Errors Section */}
                                            {pkg.errors && pkg.errors.length > 0 && (
                                              <div className="space-y-2">
                                                {pkg.errors.map((error: ErrorMessage, idx: number) => (
                                                  <div key={error.id || `error-${idx}`} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-red-200 dark:border-red-700">
                                                    <div className="flex items-start justify-between mb-2">
                                                      {error.code && (
                                                        <span className="text-xs font-mono text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                                                          {error.code}
                                                        </span>
                                                      )}
                                                      {error.timestamp && (
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                                          {formatExactTime(error.timestamp)}
                                                        </span>
                                                      )}
                                                    </div>
                                                    <p className="text-sm text-red-700 dark:text-red-300">
                                                      {error.message}
                                                    </p>
                                                    {error.details && (
                                                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                                                        {error.details}
                                                      </p>
                                                    )}
                                                  </div>
                                                ))}
                                              </div>
                                            )}

                                            {/* Warnings Section */}
                                            {pkg.warnings && pkg.warnings.length > 0 && (
                                              <div className="space-y-2">
                                                {pkg.warnings.map((warning: WarningMessage, idx: number) => (
                                                  <div key={warning.id || `warning-${idx}`} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-yellow-200 dark:border-yellow-700">
                                                    <div className="flex items-start justify-between mb-2">
                                                      {warning.code && (
                                                        <span className="text-xs font-mono text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded">
                                                          {warning.code}
                                                        </span>
                                                      )}
                                                      {warning.timestamp && (
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                                          {formatExactTime(warning.timestamp)}
                                                        </span>
                                                      )}
                                                    </div>
                                                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                                      {warning.message}
                                                    </p>
                                                    {warning.details && (
                                                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                                                        {warning.details}
                                                      </p>
                                                    )}
                                                  </div>
                                                ))}
                                              </div>
                                            )}

                                            {/* Pending Reason Section */}
                                            {hasPendingReason && (
                                              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-cyan-200 dark:border-cyan-700">
                                                <div className="flex items-start gap-3">
                                                  <div className="flex-shrink-0">
                                                    <svg className="w-5 h-5 text-cyan-500 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                  </div>
                                                  <div>
                                                    <span className="text-xs font-mono text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/20 px-2 py-1 rounded">
                                                      PENDING
                                                    </span>
                                                    <p className="text-sm text-cyan-700 dark:text-cyan-300 mt-2">
                                                      {pkg.pendingReason}
                                                    </p>
                                                  </div>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </React.Fragment>
                                );
                              })}
                            </React.Fragment>
                          );
                        })
                      ) : (
                        // Flat list view (no grouping)
                        <>
                          {[...filteredPackages].sort((a, b) => 
                            (a.displayName || a.name).localeCompare(b.displayName || b.name)
                          ).map((pkg) => {
                            const hasErrorsOrWarnings = (pkg.errors && pkg.errors.length > 0) || (pkg.warnings && pkg.warnings.length > 0);
                            const hasPendingReason = pkg.status?.toLowerCase() === 'pending' && pkg.pendingReason && pkg.pendingReason.trim() !== '';
                            const hasExpandableContent = hasErrorsOrWarnings || hasPendingReason;
                            const isExpanded = expandedPackageIds.has(pkg.id);
                            
                            return (
                              <React.Fragment key={pkg.id}>
                            {/* Main Package Row */}
                            <tr 
                              className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${hasExpandableContent ? 'cursor-pointer' : ''}`}
                              onClick={() => hasExpandableContent && togglePackageExpansion(pkg.id)}
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(pkg.status || 'unknown')}`}>
                                  {getStatusDisplay(pkg.status || 'Unknown')}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {pkg.displayName || pkg.name || 'Unknown Package'}
                                </div>
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
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                {formatItemSize(pkg.itemSize) || ''}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                <div className="flex items-center justify-between">
                                  <span>{pkg.lastUpdate ? formatRelativeTime(pkg.lastUpdate) : ''}</span>
                                  {hasExpandableContent && (
                                    <svg 
                                      className={`w-5 h-5 text-gray-400 dark:text-gray-500 transition-transform duration-200 ml-2 ${isExpanded ? 'rotate-90' : ''}`}
                                      fill="none" 
                                      stroke="currentColor" 
                                      viewBox="0 0 24 24"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  )}
                                </div>
                              </td>
                            </tr>

                            {/* Expandable Error/Warning/Pending Details Row */}
                            {isExpanded && hasExpandableContent && (
                              <tr className="bg-gray-50 dark:bg-gray-900">
                                <td colSpan={5} className="px-6 py-4">
                                  <div className="space-y-3">
                                    {/* Errors Section */}
                                    {pkg.errors && pkg.errors.length > 0 && (
                                      <div className="space-y-2">
                                        {pkg.errors.map((error: ErrorMessage, idx: number) => (
                                          <div key={error.id || `error-${idx}`} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-red-200 dark:border-red-700">
                                            <div className="flex items-start justify-between mb-2">
                                              {error.code && (
                                                <span className="text-xs font-mono text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                                                  {error.code}
                                                </span>
                                              )}
                                              {error.timestamp && (
                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                  {formatExactTime(error.timestamp)}
                                                </span>
                                              )}
                                            </div>
                                            <p className="text-sm text-red-700 dark:text-red-300">
                                              {error.message}
                                            </p>
                                            {error.details && (
                                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                                                {error.details}
                                              </p>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {/* Warnings Section */}
                                    {pkg.warnings && pkg.warnings.length > 0 && (
                                      <div className="space-y-2">
                                        {pkg.warnings.map((warning: WarningMessage, idx: number) => (
                                          <div key={warning.id || `warning-${idx}`} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-yellow-200 dark:border-yellow-700">
                                            <div className="flex items-start justify-between mb-2">
                                              {warning.code && (
                                                <span className="text-xs font-mono text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded">
                                                  {warning.code}
                                                </span>
                                              )}
                                              {warning.timestamp && (
                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                  {formatExactTime(warning.timestamp)}
                                                </span>
                                              )}
                                            </div>
                                            <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                              {warning.message}
                                            </p>
                                            {warning.details && (
                                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                                                {warning.details}
                                              </p>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {/* Pending Reason Section */}
                                    {hasPendingReason && (
                                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-cyan-200 dark:border-cyan-700">
                                        <div className="flex items-start gap-3">
                                          <div className="flex-shrink-0">
                                            <svg className="w-5 h-5 text-cyan-500 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                          </div>
                                          <div>
                                            <span className="text-xs font-mono text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/20 px-2 py-1 rounded">
                                              PENDING
                                            </span>
                                            <p className="text-sm text-cyan-700 dark:text-cyan-300 mt-2">
                                              {pkg.pendingReason}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                        </>
                      )}
                    </>
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

import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  install_location?: string;
  description?: string;
  // Service-specific fields
  status?: string;
  startType?: string;
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
  const [searchTerm, setSearchTerm] = useState('');
  const [searchUpdateTrigger, setSearchUpdateTrigger] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Component mount tracking
  useEffect(() => {
    const mountId = Math.random().toString(36).substr(2, 9);
    console.log('🔍 ApplicationsTable: Component mounted with ID:', mountId);
    
    return () => {
      console.log('🔍 ApplicationsTable: Component unmounted, ID:', mountId);
    };
  }, []);
  
  // Debug effect to track search term changes
  useEffect(() => {
    console.log('🔍 ApplicationsTable: Search term state changed to:', searchTerm);
    console.log('🔍 ApplicationsTable: Current data.installedApps length:', data?.installedApps?.length || 0);
    setSearchUpdateTrigger(prev => prev + 1); // Force re-render
  }, [searchTerm]);
  
  // Debug effect to track data changes
  useEffect(() => {
    console.log('🔍 ApplicationsTable: Data prop changed, apps count:', data?.installedApps?.length || 0);
    console.log('🔍 ApplicationsTable: Sample app:', data?.installedApps?.[0]);
  }, [data]);
  
  // Filter applications based on search term
  const filteredApps = useMemo(() => {
    if (!data?.installedApps) {
      console.log('🔍 ApplicationsTable: No data.installedApps available');
      return [];
    }
    
    const apps = data.installedApps;
    
    if (!searchTerm.trim()) {
      console.log('🔍 ApplicationsTable: No search term, returning all', apps.length, 'apps');
      return apps;
    }
    
    const searchLower = searchTerm.toLowerCase().trim();
    console.log('🔍 ApplicationsTable: Filtering with search term:', searchLower);
    
    const filtered = apps.filter(app => {
      const matches = (
        (app.displayName && app.displayName.toLowerCase().includes(searchLower)) ||
        (app.name && app.name.toLowerCase().includes(searchLower)) ||
        (app.publisher && app.publisher.toLowerCase().includes(searchLower)) ||
        (app.signed_by && app.signed_by.toLowerCase().includes(searchLower)) ||
        (app.version && app.version.toLowerCase().includes(searchLower)) ||
        (app.bundle_version && app.bundle_version.toLowerCase().includes(searchLower)) ||
        (app.path && app.path.toLowerCase().includes(searchLower)) ||
        (app.install_location && app.install_location.toLowerCase().includes(searchLower)) ||
        (app.category && app.category.toLowerCase().includes(searchLower)) ||
        (app.info && app.info.toLowerCase().includes(searchLower)) ||
        (app.description && app.description.toLowerCase().includes(searchLower))
      );
      
      return matches;
    });
    
    console.log('🔍 ApplicationsTable: Filtered', filtered.length, 'out of', apps.length, 'apps');
    return filtered;
  }, [data?.installedApps, searchTerm, searchUpdateTrigger]);

  // Handle scrollbar visibility
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
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        container.classList.remove('scrolling');
      }, 300);
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
      {/* Applications Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
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
            {/* Search Field */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search apps..."
                value={searchTerm}
                onChange={(e) => {
                  const newValue = e.target.value;
                  console.log('🔍 ApplicationsTable: INPUT CHANGE EVENT - before setState, current searchTerm:', searchTerm);
                  console.log('🔍 ApplicationsTable: INPUT CHANGE EVENT - new value:', newValue);
                  
                  setSearchTerm(newValue);
                  
                  console.log('🔍 ApplicationsTable: INPUT CHANGE EVENT - setState called with:', newValue);
                  
                  // Test if filtering works with the new value directly
                  if (data?.installedApps && newValue.trim()) {
                    const testFiltered = data.installedApps.filter(app => 
                      (app.name && app.name.toLowerCase().includes(newValue.toLowerCase())) ||
                      (app.displayName && app.displayName.toLowerCase().includes(newValue.toLowerCase()))
                    );
                    console.log('🔍 ApplicationsTable: DIRECT FILTER TEST - found', testFiltered.length, 'matches for:', newValue);
                  }
                }}
                className="block w-64 pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              {searchTerm && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button
                    onClick={() => setSearchTerm('')}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Show filtered count */}
        {searchTerm && (
          <div className="px-6 py-2 bg-gray-50 dark:bg-gray-900 text-sm text-gray-600 dark:text-gray-400">
            Showing {filteredApps.length} of {data.totalApps} applications
          </div>
        )}
        
        {/* Table with overlay scrolling and no reserved space */}
        <div 
          ref={scrollContainerRef}
          className="h-[600px] overflow-auto table-scrollbar"
        >
          <table className="w-full min-w-full">
            <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Application</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Version</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Publisher</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Install Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    {searchTerm ? 'No applications match your search' : 'No applications found'}
                  </td>
                </tr>
              ) : (
                filteredApps.map((app, index) => (
                  <tr key={app.id || app.name || `app-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {app.displayName || app.name}
                        </div>
                        {app.path && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono break-all">
                            {app.path}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {app.version || 'Unknown'}
                      </div>
                      {app.bundle_version && app.bundle_version !== app.version && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Bundle: {app.bundle_version}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {app.publisher || app.signed_by || 'Unknown'}
                      </div>
                      {app.signed_by && (
                        <div className="text-xs text-green-600 dark:text-green-400">
                          ✓ Signed
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

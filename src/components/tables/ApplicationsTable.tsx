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
  installDate?: string;
  size?: string;
  bundleId?: string;
  install_location?: string;
  description?: string;
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Filter applications based on search term with relevance scoring
  const filteredApps = useMemo(() => {
    // First deduplicate applications by name + publisher, keeping latest version
    const appMap = new Map<string, ApplicationInfo & { originalIndex: number }>();
    
    (data?.installedApps || []).forEach((app: ApplicationInfo, index: number) => {
      const nameKey = `${app.name || 'unknown'}-${app.publisher || 'unknown'}`;
      const existing = appMap.get(nameKey);
      
      if (!existing) {
        appMap.set(nameKey, { ...app, originalIndex: index });
      } else {
        // Keep the one with newer version or later in the list (more recent)
        const currentVersion = app.version || '0.0.0';
        const existingVersion = existing.version || '0.0.0';
        
        // Simple version comparison - if current seems newer, replace
        if (currentVersion > existingVersion || index > existing.originalIndex) {
          appMap.set(nameKey, { ...app, originalIndex: index });
        }
      }
    });
    
    const deduplicatedApps = Array.from(appMap.values());
    
    if (!searchTerm.trim()) {
      return deduplicatedApps;
    }
    
    const searchLower = searchTerm.toLowerCase();
    
    // Filter and score results for relevance
    const filteredWithScores = deduplicatedApps
      .map((app: ApplicationInfo) => {
        let relevanceScore = 0;
        const name = app.name?.toLowerCase() || '';
        const displayName = app.displayName?.toLowerCase() || '';
        const publisher = app.publisher?.toLowerCase() || '';
        const signedBy = app.signed_by?.toLowerCase() || '';
        const version = app.version?.toLowerCase() || '';
        const path = app.path?.toLowerCase() || '';
        
        // Exact matches get highest score
        if (name === searchLower || displayName === searchLower) relevanceScore += 100;
        // Starts with search term gets high score
        else if (name.startsWith(searchLower) || displayName.startsWith(searchLower)) relevanceScore += 50;
        // Contains search term gets medium score
        else if (name.includes(searchLower) || displayName.includes(searchLower)) relevanceScore += 25;
        
        // Lower priority matches
        if (publisher.includes(searchLower)) relevanceScore += 10;
        if (signedBy.includes(searchLower)) relevanceScore += 8;
        if (version.includes(searchLower)) relevanceScore += 5;
        if (path.includes(searchLower)) relevanceScore += 3;
        
        return { app, relevanceScore };
      })
      .filter(item => item.relevanceScore > 0)
      .sort((a, b) => {
        // Sort by relevance score (descending), then by name (ascending)
        if (b.relevanceScore !== a.relevanceScore) {
          return b.relevanceScore - a.relevanceScore;
        }
        return (a.app.displayName || a.app.name || '').localeCompare(b.app.displayName || b.app.name || '');
      })
      .map(item => item.app);
    
    return filteredWithScores;
  }, [data?.installedApps, searchTerm]);

  // Handle scrollbar visibility
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const hasScrollbar = container.scrollHeight > container.clientHeight;
    
    if (hasScrollbar) {
      container.classList.add('overlay-scrollbar');
    } else {
      container.classList.remove('overlay-scrollbar');
    }
  }, [filteredApps]);

  if (!data?.installedApps?.length) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Applications Found</h3>
        <p className="text-gray-600 dark:text-gray-400">No applications are installed on this device.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        {/* Search Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-end">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </div>
              <input
                type="text"
                className="block w-64 pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                placeholder="Search applications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
        
        {/* Table with overlay scrolling */}
        <div 
          ref={scrollContainerRef}
          className="h-[600px] overflow-auto"
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
              {filteredApps.length === 0 && searchTerm ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    No applications found matching &quot;{searchTerm}&quot;
                  </td>
                </tr>
              ) : (
                filteredApps.map((app, index) => {
                  const uniqueKey = `${app.name || 'unknown'}-${app.version || 'unknown'}-${app.publisher || 'unknown'}-${index}`;
                  return (
                  <tr key={uniqueKey} className="hover:bg-gray-50 dark:hover:bg-gray-700">
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
                );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ApplicationsTable;

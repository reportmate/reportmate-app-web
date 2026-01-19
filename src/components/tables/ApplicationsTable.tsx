import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { formatRelativeTime } from '../../lib/time';

// Constants for pagination
const PAGE_SIZE = 100;
const INITIAL_VISIBLE = 50;

// Usage data for an application
// Supports both frontend-standard field names and Windows client variants
interface ApplicationUsage {
  launchCount: number;
  totalSeconds?: number;
  totalUsageSeconds?: number;  // Windows client variant
  lastUsed?: string;
  lastLaunchTime?: string;  // Windows client variant
  firstSeen?: string;
  users?: string[];
  uniqueUserCount?: number;
  averageSessionSeconds?: number;
}

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
  usage?: ApplicationUsage;
}

interface ApplicationsData {
  totalApps: number;
  signedApps?: number;
  recentApps?: number;
  runningApps?: number;
  stoppedApps?: number;
  installedApps: ApplicationInfo[];
}

// Helper to format duration
function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '-';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

interface ApplicationsTableProps {
  data: ApplicationsData;
}

export const ApplicationsTable: React.FC<ApplicationsTableProps> = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  
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

  // Paginated apps - only render what's visible
  const visibleApps = useMemo(() => {
    return filteredApps.slice(0, visibleCount);
  }, [filteredApps, visibleCount]);

  const hasMore = visibleCount < filteredApps.length;
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Load more callback for infinite scroll
  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    // Small delay for smooth UX
    setTimeout(() => {
      setVisibleCount(prev => Math.min(prev + PAGE_SIZE, filteredApps.length));
      setIsLoadingMore(false);
    }, 100);
  }, [isLoadingMore, hasMore, filteredApps.length]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, loadMore]);

  // Reset visible count when search changes
  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE);
  }, [searchTerm]);

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
        
        {/* Table with overlay scrolling - infinite scroll */}
        <div 
          ref={scrollContainerRef}
          className="max-h-[calc(100vh-300px)] min-h-[400px] overflow-auto"
        >
          <table className="w-full min-w-full">
            <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Application</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Version</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Last Used</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Launches</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Users</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {visibleApps.length === 0 && searchTerm ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    No applications found matching &quot;{searchTerm}&quot;
                  </td>
                </tr>
              ) : (
                visibleApps.map((app, index) => {
                  const uniqueKey = `${app.name || 'unknown'}-${app.version || 'unknown'}-${app.publisher || 'unknown'}-${index}`;
                  const hasUsage = app.usage && app.usage.launchCount > 0;
                  
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
                        {hasUsage && (app.usage?.lastUsed || app.usage?.lastLaunchTime)
                          ? formatRelativeTime(app.usage.lastUsed || app.usage.lastLaunchTime!)
                          : <span className="text-gray-400">-</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {hasUsage
                          ? formatDuration(app.usage!.totalSeconds || app.usage!.totalUsageSeconds || 0)
                          : <span className="text-gray-400">-</span>}
                      </div>
                      {hasUsage && app.usage?.averageSessionSeconds && app.usage.averageSessionSeconds > 0 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          avg: {formatDuration(app.usage.averageSessionSeconds)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {hasUsage 
                          ? app.usage!.launchCount.toLocaleString()
                          : <span className="text-gray-400">-</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {hasUsage && app.usage?.uniqueUserCount ? (
                        <div>
                          <div className="text-sm text-gray-900 dark:text-white">
                            {app.usage.uniqueUserCount} user{app.usage.uniqueUserCount > 1 ? 's' : ''}
                          </div>
                          {app.usage.users && app.usage.users.length > 0 && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-[150px]" title={app.usage.users.join(', ')}>
                              {app.usage.users.slice(0, 2).map(u => u.split('\\').pop()).join(', ')}
                              {app.usage.users.length > 2 && ` +${app.usage.users.length - 2}`}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                );
                })
              )}
            </tbody>
          </table>
          {/* Load more sentinel for IntersectionObserver */}
          <div ref={loadMoreRef} className="h-4" />
          {isLoadingMore && (
            <div className="px-6 py-3 text-center">
              <div className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading more...
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApplicationsTable;

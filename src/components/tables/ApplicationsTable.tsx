import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { formatRelativeTime } from '../../lib/time';
import { FilterPills, FilterPillOption } from '../ui/FilterPills';

const PAGE_SIZE = 100;
const INITIAL_VISIBLE = 50;

export interface ApplicationUsage {
  launchCount: number;
  totalSeconds?: number;
  totalUsageSeconds?: number;  // Windows client variant
  lastUsed?: string;
  lastLaunchTime?: string;  // Windows client variant
  firstSeen?: string;
  users?: string[];
  uniqueUserCount?: number;
  averageSessionSeconds?: number;
  activeNow?: boolean;
  daysSeen?: number;
}

export interface ApplicationInfo {
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
  source?: string;
  architecture?: string;
  nested?: boolean;
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

export type UsageFilter = 'all' | 'used' | 'unused' | 'active';

export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '-';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  const hours = Math.floor(seconds / 3600);
  if (hours >= 48) return `${Math.round(hours / 24)}d ${hours % 24}h`;
  const mins = Math.round((seconds % 3600) / 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function usageSeconds(usage?: ApplicationUsage): number {
  return usage?.totalSeconds || usage?.totalUsageSeconds || 0;
}

export function usageLastUsed(usage?: ApplicationUsage): string | undefined {
  return usage?.lastUsed || usage?.lastLaunchTime;
}

export function hasUsage(app: ApplicationInfo): boolean {
  return !!app.usage && (app.usage.launchCount > 0 || usageSeconds(app.usage) > 0);
}

function shortUser(user: string): string {
  return user.split('\\').pop() || user;
}

const SOURCE_TONE: Record<string, string> = {
  apple: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  system: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  user: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

interface ApplicationsTableProps {
  data: ApplicationsData;
  usageFilter?: UsageFilter;
  usageOptions?: FilterPillOption<UsageFilter>[];
  onUsageFilterChange?: (value: UsageFilter) => void;
  hideNested?: boolean;
  nestedCount?: number;
  onHideNestedChange?: (value: boolean) => void;
}

export const ApplicationsTable: React.FC<ApplicationsTableProps> = ({
  data, usageFilter, usageOptions, onUsageFilterChange, hideNested, nestedCount = 0, onHideNestedChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const filteredApps = useMemo(() => {
    const appMap = new Map<string, ApplicationInfo & { originalIndex: number }>();

    (data?.installedApps || []).forEach((app: ApplicationInfo, index: number) => {
      // Two copies of the same app at different paths are distinct rows; the same
      // name+publisher at the same path collapses to the newest version.
      const nameKey = `${app.name || 'unknown'}-${app.publisher || 'unknown'}-${app.path || ''}`;
      const existing = appMap.get(nameKey);

      if (!existing) {
        appMap.set(nameKey, { ...app, originalIndex: index });
      } else {
        const currentVersion = app.version || '0.0.0';
        const existingVersion = existing.version || '0.0.0';
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

    return deduplicatedApps
      .map((app: ApplicationInfo) => {
        let relevanceScore = 0;
        const name = app.name?.toLowerCase() || '';
        const displayName = app.displayName?.toLowerCase() || '';
        const publisher = app.publisher?.toLowerCase() || '';
        const signedBy = app.signed_by?.toLowerCase() || '';
        const version = app.version?.toLowerCase() || '';
        const path = app.path?.toLowerCase() || '';
        const bundleId = app.bundleId?.toLowerCase() || '';

        if (name === searchLower || displayName === searchLower) relevanceScore += 100;
        else if (name.startsWith(searchLower) || displayName.startsWith(searchLower)) relevanceScore += 50;
        else if (name.includes(searchLower) || displayName.includes(searchLower)) relevanceScore += 25;

        if (publisher.includes(searchLower)) relevanceScore += 10;
        if (signedBy.includes(searchLower)) relevanceScore += 8;
        if (bundleId.includes(searchLower)) relevanceScore += 6;
        if (version.includes(searchLower)) relevanceScore += 5;
        if (path.includes(searchLower)) relevanceScore += 3;
        if (app.usage?.users?.some(u => u.toLowerCase().includes(searchLower))) relevanceScore += 4;

        return { app, relevanceScore };
      })
      .filter(item => item.relevanceScore > 0)
      .sort((a, b) => {
        if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore;
        return (a.app.displayName || a.app.name || '').localeCompare(b.app.displayName || b.app.name || '');
      })
      .map(item => item.app);
  }, [data?.installedApps, searchTerm]);

  const maxSeconds = useMemo(
    () => filteredApps.reduce((max, app) => Math.max(max, usageSeconds(app.usage)), 0),
    [filteredApps]
  );

  const visibleApps = useMemo(() => filteredApps.slice(0, visibleCount), [filteredApps, visibleCount]);

  const hasMore = visibleCount < filteredApps.length;
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCount(prev => Math.min(prev + PAGE_SIZE, filteredApps.length));
      setIsLoadingMore(false);
    }, 100);
  }, [isLoadingMore, hasMore, filteredApps.length]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) loadMore();
      },
      { threshold: 0.1, rootMargin: '100px' }
    );
    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, loadMore]);

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE);
  }, [searchTerm, usageFilter, hideNested]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const hasScrollbar = container.scrollHeight > container.clientHeight;
    container.classList.toggle('overlay-scrollbar', hasScrollbar);
  }, [filteredApps]);

  const showControls = !!(usageOptions && onUsageFilterChange) || !!onHideNestedChange;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {usageOptions && onUsageFilterChange && usageFilter && (
              <FilterPills ariaLabel="Application usage" options={usageOptions} value={usageFilter} onChange={onUsageFilterChange} />
            )}
            {onHideNestedChange && nestedCount > 0 && (
              <label className="inline-flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 select-none cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 dark:border-gray-600"
                  checked={!!hideNested}
                  onChange={(e) => onHideNestedChange(e.target.checked)}
                />
                Hide {nestedCount.toLocaleString()} bundled helpers
              </label>
            )}
            {!showControls && <span />}
          </div>
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
                <button onClick={() => setSearchTerm('')} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div ref={scrollContainerRef} className="max-h-[calc(100vh-300px)] min-h-[400px] overflow-auto">
        <table className="w-full min-w-full table-fixed">
          <colgroup>
            <col className="w-[38%]" />
            <col className="w-[16%]" />
            <col className="w-[12%]" />
            <col className="w-[14%]" />
            <col className="w-[8%]" />
            <col className="w-[12%]" />
          </colgroup>
          <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Application</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Version</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Last used</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Launches</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Users</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {visibleApps.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                  {searchTerm ? `No applications match "${searchTerm}"` : 'No applications in this view'}
                </td>
              </tr>
            ) : (
              visibleApps.map((app, index) => {
                const uniqueKey = `${app.name || 'unknown'}-${app.version || 'unknown'}-${app.path || index}`;
                const used = hasUsage(app);
                const seconds = usageSeconds(app.usage);
                const lastUsed = usageLastUsed(app.usage);
                const users = app.usage?.users || [];
                const sourceKey = (app.source || '').toLowerCase();
                const sourceTone = SOURCE_TONE[sourceKey];
                const share = maxSeconds > 0 ? Math.max(2, Math.round((seconds / maxSeconds) * 100)) : 0;

                return (
                  <tr key={uniqueKey} className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${used ? '' : 'text-gray-500'}`}>
                    <td className="px-6 py-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          {app.usage?.activeNow && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Running now" />
                          )}
                          <span className={`text-sm font-medium truncate ${used ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                            {(app.displayName || app.name).replace(/\.app$/, '')}
                          </span>
                          {app.nested && (
                            <span className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500 shrink-0">helper</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate" title={app.path || undefined}>
                          {app.publisher && app.publisher !== 'Unknown Publisher' ? app.publisher : (app.bundleId || app.path || '')}
                          {app.publisher && app.publisher !== 'Unknown Publisher' && app.bundleId ? <span className="text-gray-400 dark:text-gray-500"> · {app.bundleId}</span> : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm text-gray-900 dark:text-white font-mono truncate" title={app.version || undefined}>
                          {app.version && app.version !== 'Unknown' ? app.version : <span className="text-gray-400">—</span>}
                        </span>
                        {sourceTone && (
                          <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${sourceTone}`}>{app.source}</span>
                        )}
                      </div>
                      {app.architecture && (
                        <div className="text-xs text-gray-400 dark:text-gray-500">{app.architecture}</div>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {used && lastUsed ? formatRelativeTime(lastUsed) : <span className="text-gray-400">—</span>}
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      {used && seconds > 0 ? (
                        <div>
                          <div className="text-sm text-gray-900 dark:text-white tabular-nums">{formatDuration(seconds)}</div>
                          <div className="mt-1 h-1 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                            <div className="h-full rounded-full bg-blue-500/70 dark:bg-blue-400/70" style={{ width: `${share}%` }} />
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="text-sm text-gray-900 dark:text-white tabular-nums">
                        {used && app.usage!.launchCount > 0 ? app.usage!.launchCount.toLocaleString() : <span className="text-gray-400">—</span>}
                      </div>
                      {used && app.usage?.daysSeen ? (
                        <div className="text-xs text-gray-400 dark:text-gray-500">{app.usage.daysSeen} day{app.usage.daysSeen > 1 ? 's' : ''}</div>
                      ) : null}
                    </td>
                    <td className="px-6 py-3">
                      {used && users.length > 0 ? (
                        <div className="text-sm text-gray-900 dark:text-white truncate" title={users.join(', ')}>
                          {users.slice(0, 2).map(shortUser).join(', ')}
                          {users.length > 2 && <span className="text-gray-500 dark:text-gray-400"> +{users.length - 2}</span>}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
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
  );
};

export default ApplicationsTable;

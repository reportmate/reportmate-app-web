/**
 * Applications Tab Component
 * Installed applications, software inventory, and usage tracking
 */

import React, { useMemo, useState } from 'react'
import { ApplicationsTable } from '../tables'
import { formatDuration, hasUsage, usageSeconds, usageLastUsed, type UsageFilter } from '../tables/ApplicationsTable'
import type { FilterPillOption } from '../ui/FilterPills'
import { formatRelativeTime } from '../../lib/time'
import { extractApplications } from '../../lib/data-processing/modules/applications'
import { normalizeKeys } from '../../lib/utils/powershell-parser'
import { DebugAccordion } from '../DebugAccordion'

// Extended ApplicationInfo with usage data
// Supports both frontend-standard field names and Windows client variants
interface ApplicationUsage {
  launchCount: number
  totalSeconds?: number
  totalUsageSeconds?: number  // Windows client variant
  lastUsed?: string
  lastLaunchTime?: string  // Windows client variant
  firstSeen?: string
  users?: string[]
  uniqueUserCount?: number
  averageSessionSeconds?: number
  activeNow?: boolean
  daysSeen?: number
}

// macOS active session from SQLite watcher
interface ActiveSession {
  name: string
  path: string
  user: string
  isActive: number | boolean
  processId: number
  sessionId: string
  startTime: string
  durationSeconds: number
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

// Usage snapshot from the module
interface UsageSnapshot {
  IsCaptureEnabled?: boolean
  isCaptureEnabled?: boolean
  Status?: string
  status?: string
  TotalLaunches?: number
  totalLaunches?: number
  TotalUsageSeconds?: number
  totalUsageSeconds?: number
  Applications?: ApplicationUsage[]
  applications?: ApplicationUsage[]
  ActiveSessions?: ActiveSession[]
  activeSessions?: ActiveSession[]
  CaptureMethod?: string
  captureMethod?: string
}

interface DeviceData {
  applications?: {
    installedApps?: ApplicationInfo[]
  }
  modules?: {
    applications?: {
      installed_applications?: ApplicationInfo[]
      installedApplications?: ApplicationInfo[]
      InstalledApplications?: ApplicationInfo[]
      Usage?: UsageSnapshot
      usage?: UsageSnapshot
    }
  }
}

interface ApplicationsTabProps {
  device: DeviceData
  data?: {
    installedApps?: ApplicationInfo[]
  }
}

// Helper to format duration

interface DailyUsageRow {
  date?: string
  appName?: string
  launches?: number
  totalSeconds?: number
  users?: string[]
}

interface AggregatedUsage {
  launchCount: number
  totalSeconds: number
  lastUsed: string
  firstSeen: string
  users: Set<string>
  days: Set<string>
  activeNow: boolean
}

const emptyUsage = (): AggregatedUsage => ({ launchCount: 0, totalSeconds: 0, lastUsed: '', firstSeen: '', users: new Set(), days: new Set(), activeNow: false })

// History names come as "Safari", "Safari.app", or "com.apple.Safari.SandboxBroker (Safari)".
function usageKey(name?: string): string {
  if (!name) return ''
  const paren = name.match(/\(([^)]+)\)\s*$/)
  const base = paren ? paren[1] : name
  return base.replace(/\.app$/i, '').trim().toLowerCase()
}

export const ApplicationsTab: React.FC<ApplicationsTabProps> = ({ device, data }) => {
  const [usageFilter, setUsageFilter] = useState<UsageFilter>('all')
  const [hideNested, setHideNested] = useState(true)
  
  // Normalize snake_case to camelCase for applications module
  // Prefer direct data prop if available
  const rawApplicationsModule = data || device?.modules?.applications
  const normalizedApplicationsModule = rawApplicationsModule ? normalizeKeys(rawApplicationsModule) as any : null
  
  // Process applications data from the modular device structure (or constructed from data)
  const applicationsModuleData = extractApplications(normalizedApplicationsModule ? { applications: normalizedApplicationsModule } : device?.modules || {})
  
  // Extract usage data - check both raw and normalized module
  // macOS sends applicationUsage at the module level with activeSessions array
  const rawUsageData = (rawApplicationsModule as any)?.applicationUsage || (rawApplicationsModule as any)?.usage
  const normalizedUsageData = normalizedApplicationsModule?.applicationUsage || normalizedApplicationsModule?.usage
  const usageData = rawUsageData || normalizedUsageData
  

  // Get active sessions from macOS data — wrapped in useMemo for stable reference
  const activeSessions: ActiveSession[] = useMemo(
    () => usageData?.activeSessions || usageData?.ActiveSessions || [],
    [usageData?.activeSessions, usageData?.ActiveSessions]
  )
  
  // Per-day history is the long view (one row per app per day, carrying launches,
  // seconds and users); the session list is only the current capture window but
  // is the one place that says what is running right now.
  const dailyHistory: DailyUsageRow[] = useMemo(
    () => (normalizedApplicationsModule?.dailyUsageHistory || (rawApplicationsModule as any)?.dailyUsageHistory || []) as DailyUsageRow[],
    [normalizedApplicationsModule?.dailyUsageHistory, rawApplicationsModule]
  )

  const usageByName = useMemo(() => {
    const map = new Map<string, AggregatedUsage>()
    for (const row of dailyHistory) {
      const key = usageKey(row.appName)
      if (!key) continue
      const entry = map.get(key) || emptyUsage()
      entry.launchCount += row.launches || 0
      entry.totalSeconds += row.totalSeconds || 0
      if (row.date) {
        entry.days.add(row.date)
        if (!entry.lastUsed || row.date > entry.lastUsed.slice(0, 10)) entry.lastUsed = `${row.date}T00:00:00Z`
        if (!entry.firstSeen || row.date < entry.firstSeen.slice(0, 10)) entry.firstSeen = `${row.date}T00:00:00Z`
      }
      for (const user of row.users || []) entry.users.add(user)
      map.set(key, entry)
    }
    return map
  }, [dailyHistory])

  const usageByPath = useMemo(() => {
    const map = new Map<string, AggregatedUsage>()
    for (const session of activeSessions) {
      const path = session.path
      if (!path) continue
      const entry = map.get(path) || emptyUsage()
      entry.launchCount += 1
      entry.totalSeconds += session.durationSeconds || 0
      if (session.startTime && session.startTime > entry.lastUsed) entry.lastUsed = session.startTime
      if (session.startTime && (!entry.firstSeen || session.startTime < entry.firstSeen)) entry.firstSeen = session.startTime
      if (session.user) entry.users.add(session.user)
      if (session.isActive === true || session.isActive === 1) entry.activeNow = true
      if (session.startTime) entry.days.add(session.startTime.slice(0, 10))
      map.set(path, entry)
    }
    return map
  }, [activeSessions])

  const hasApplicationsData = (data?.installedApps?.length ?? 0) > 0 ||
                              (device?.applications?.installedApps?.length ?? 0) > 0 ||
                              (normalizedApplicationsModule?.installedApplications?.length ?? 0) > 0 ||
                              (applicationsModuleData?.applications?.length ?? 0) > 0

  const installedApps = useMemo(() => {
    if (data?.installedApps?.length) {
      return data.installedApps
    } else if (normalizedApplicationsModule?.installedApplications) {
      return normalizedApplicationsModule.installedApplications
    } else if (applicationsModuleData?.applications) {
      return applicationsModuleData.applications
    }
    return []
  }, [
    data?.installedApps,
    normalizedApplicationsModule?.installedApplications,
    applicationsModuleData?.applications
  ])

  const processedApps = useMemo(() => {
    return installedApps.map((app: ApplicationInfo, index: number) => {
      const raw = app as unknown as Record<string, unknown>
      const appPath = app.path || (raw.installLocation as string) || (raw.install_location as string)
      const name = app.name || app.displayName || 'Unknown Application'

      // Windows attaches usage to the app; macOS keys sessions by bundle path; the
      // daily history is keyed by name on both. Merge all three, longest view wins.
      const existing = (app.usage || (raw.Usage as ApplicationUsage & { totalUsageSeconds?: number; lastLaunchTime?: string })) as (ApplicationUsage & { totalUsageSeconds?: number; lastLaunchTime?: string }) | undefined
      const merged = emptyUsage()
      if (existing) {
        merged.launchCount = existing.launchCount || 0
        merged.totalSeconds = existing.totalSeconds || existing.totalUsageSeconds || 0
        merged.lastUsed = existing.lastUsed || existing.lastLaunchTime || ''
        merged.firstSeen = existing.firstSeen || ''
        for (const user of existing.users || []) merged.users.add(user)
      }
      const byPath = appPath ? usageByPath.get(appPath) : undefined
      const byName = usageByName.get(usageKey(name))
      for (const source of [byName, byPath]) {
        if (!source) continue
        merged.launchCount = Math.max(merged.launchCount, source.launchCount)
        merged.totalSeconds = Math.max(merged.totalSeconds, source.totalSeconds)
        if (source.lastUsed > merged.lastUsed) merged.lastUsed = source.lastUsed
        if (source.firstSeen && (!merged.firstSeen || source.firstSeen < merged.firstSeen)) merged.firstSeen = source.firstSeen
        for (const user of source.users) merged.users.add(user)
        for (const day of source.days) merged.days.add(day)
        if (source.activeNow) merged.activeNow = true
      }
      // Sessions alone (no history) still count as launches.
      if (merged.launchCount === 0 && byPath) merged.launchCount = byPath.launchCount

      const usage: ApplicationUsage | undefined = (merged.launchCount > 0 || merged.totalSeconds > 0 || merged.activeNow) ? {
        launchCount: merged.launchCount,
        totalSeconds: merged.totalSeconds,
        lastUsed: merged.lastUsed || undefined,
        firstSeen: merged.firstSeen || undefined,
        users: Array.from(merged.users),
        uniqueUserCount: merged.users.size,
        averageSessionSeconds: merged.launchCount > 0 ? merged.totalSeconds / merged.launchCount : undefined,
        activeNow: merged.activeNow,
        daysSeen: merged.days.size,
      } : undefined

      const nested = !!appPath && /\.app\/.*\.app$/i.test(appPath)

      return {
        ...app,
        id: app.id || app.name || `app-${index}`,
        name,
        displayName: app.displayName || app.name,
        version: app.version || (raw.bundle_version as string) || 'Unknown',
        publisher: app.publisher || (raw.signed_by as string) || 'Unknown Publisher',
        category: app.category || 'Uncategorized',
        installDate: app.installDate || (raw.install_date as string) || (raw.last_modified as string),
        size: app.size,
        path: appPath,
        bundleId: (raw.bundleId as string) || (raw.bundle_id as string) || (raw.bundleIdentifier as string),
        source: (raw.source as string) || undefined,
        architecture: (raw.architecture as string) || undefined,
        nested,
        info: raw.info as string,
        obtained_from: raw.obtained_from as string,
        runtime_environment: raw.runtime_environment as string,
        has64bit: raw.has64bit as boolean,
        signed_by: raw.signed_by as string,
        usage
      } as ApplicationInfo & { nested: boolean; source?: string; architecture?: string }
    })
  }, [installedApps, usageByPath, usageByName])

  // Most-used first; the version report is the same table read top to bottom.
  const sortedApps = useMemo(() => {
    return [...processedApps].sort((a, b) => {
      const sa = usageSeconds(a.usage), sb = usageSeconds(b.usage)
      if (sb !== sa) return sb - sa
      const la = a.usage?.launchCount || 0, lb = b.usage?.launchCount || 0
      if (lb !== la) return lb - la
      return (a.displayName || a.name).localeCompare(b.displayName || b.name)
    })
  }, [processedApps])

  const nestedCount = useMemo(() => sortedApps.filter(a => a.nested).length, [sortedApps])
  const baseApps = useMemo(() => hideNested ? sortedApps.filter(a => !a.nested) : sortedApps, [sortedApps, hideNested])

  const usedApps = useMemo(() => baseApps.filter(hasUsage), [baseApps])
  const activeApps = useMemo(() => baseApps.filter(a => a.usage?.activeNow), [baseApps])
  const unusedApps = useMemo(() => baseApps.filter(a => !hasUsage(a)), [baseApps])

  const usageOptions: FilterPillOption<UsageFilter>[] = useMemo(() => [
    { value: 'all', label: 'All', count: baseApps.length },
    { value: 'used', label: 'Used', count: usedApps.length },
    { value: 'active', label: 'Running', count: activeApps.length },
    { value: 'unused', label: 'No usage', count: unusedApps.length },
  ], [baseApps.length, usedApps.length, activeApps.length, unusedApps.length])

  const filteredApps = useMemo(() => {
    switch (usageFilter) {
      case 'used': return usedApps
      case 'active': return activeApps
      case 'unused': return unusedApps
      default: return baseApps
    }
  }, [usageFilter, baseApps, usedApps, activeApps, unusedApps])

  const distinctUsers = useMemo(() => {
    const users = new Set<string>()
    for (const app of processedApps) for (const user of app.usage?.users || []) users.add(user)
    return users.size
  }, [processedApps])

  const totalUsageSeconds = useMemo(() => usedApps.reduce((sum, app) => sum + usageSeconds(app.usage), 0), [usedApps])

  const historyDays = useMemo(() => {
    const days = new Set<string>()
    for (const row of dailyHistory) if (row.date) days.add(row.date)
    return days.size
  }, [dailyHistory])

  const topApps = useMemo(() => usedApps.filter(a => usageSeconds(a.usage) > 0).slice(0, 8), [usedApps])
  const topMax = topApps.length ? usageSeconds(topApps[0].usage) : 0

  const applicationsData = useMemo(() => ({
    totalApps: filteredApps.length,
    installedApps: filteredApps
  }), [filteredApps])

  const header = (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
          <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Applications</h1>
          <p className="text-base text-gray-600 dark:text-gray-400">Versions installed and how much each is used</p>
        </div>
      </div>
      {processedApps.length > 0 && (
        <div className="text-right">
          <div className="text-sm text-gray-500 dark:text-gray-400">Applications</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{(sortedApps.length - nestedCount).toLocaleString()}</div>
          {nestedCount > 0 && <div className="text-xs text-gray-400 dark:text-gray-500">+{nestedCount.toLocaleString()} bundled helpers</div>}
        </div>
      )}
    </div>
  )

  if (!hasApplicationsData) {
    return (
      <div className="space-y-6">
        {header}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 px-6 py-16 text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No applications reported</h3>
          <p className="text-gray-600 dark:text-gray-400">The applications module has not reported an inventory for this device.</p>
        </div>
      </div>
    )
  }

  const stat = (label: string, value: string, hint?: string) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 px-5 py-4">
      <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
      <div className="text-2xl font-semibold text-gray-900 dark:text-white tabular-nums">{value}</div>
      {hint && <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{hint}</div>}
    </div>
  )

  return (
    <div className="space-y-6">
      {header}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stat('Used', usedApps.length.toLocaleString(), historyDays > 0 ? `across ${historyDays} day${historyDays > 1 ? 's' : ''} of history` : 'in the current capture window')}
        {stat('Running now', activeApps.length.toLocaleString(), activeSessions.length ? `${activeSessions.length.toLocaleString()} session${activeSessions.length === 1 ? '' : 's'} in the capture window` : undefined)}
        {stat('Time in apps', formatDuration(totalUsageSeconds), 'process lifetime, summed')}
        {stat('People', distinctUsers.toLocaleString(), distinctUsers === 1 ? 'one account seen' : 'accounts seen in usage')}
      </div>

      {topApps.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Most used</h2>
          </div>
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {topApps.map(app => {
              const seconds = usageSeconds(app.usage)
              const share = topMax > 0 ? Math.max(2, Math.round((seconds / topMax) * 100)) : 0
              const lastUsed = usageLastUsed(app.usage)
              return (
                <li key={app.id} className="px-6 py-3">
                  <div className="flex items-baseline justify-between gap-4">
                    <div className="flex items-baseline gap-2 min-w-0">
                      {app.usage?.activeNow && <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 translate-y-[-1px]" title="Running now" />}
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{(app.displayName || app.name).replace(/\.app$/, '')}</span>
                      {app.version && app.version !== 'Unknown' && <span className="text-xs font-mono text-gray-500 dark:text-gray-400 shrink-0">{app.version}</span>}
                    </div>
                    <div className="flex items-baseline gap-4 text-xs text-gray-500 dark:text-gray-400 shrink-0 tabular-nums">
                      <span className="text-sm text-gray-900 dark:text-white">{formatDuration(seconds)}</span>
                      <span>{(app.usage?.launchCount || 0).toLocaleString()} launch{app.usage?.launchCount === 1 ? '' : 'es'}</span>
                      {app.usage?.uniqueUserCount ? <span>{app.usage.uniqueUserCount} user{app.usage.uniqueUserCount > 1 ? 's' : ''}</span> : null}
                      {lastUsed && <span>{formatRelativeTime(lastUsed)}</span>}
                    </div>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                    <div className="h-full rounded-full bg-blue-500/70 dark:bg-blue-400/70" style={{ width: `${share}%` }} />
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <ApplicationsTable
        data={applicationsData}
        usageFilter={usageFilter}
        usageOptions={usageOptions}
        onUsageFilterChange={setUsageFilter}
        hideNested={hideNested}
        nestedCount={nestedCount}
        onHideNestedChange={setHideNested}
      />

      <DebugAccordion
        data={device?.modules?.applications}
        label="device.modules.applications"
        moduleVersion={(device?.modules?.applications as any)?.moduleVersion}
      />
    </div>
  )
}

export default ApplicationsTab

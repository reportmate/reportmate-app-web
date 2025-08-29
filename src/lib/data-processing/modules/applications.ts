/**
 * Applications Module - Reader Only
 * Frontend reads pre-processed application data from device collection
 * NO heavy processing - device should provide clean, standardized data
 */

export interface ApplicationInfo {
  totalApplications: number
  recentlyInstalled: number
  recentlyUpdated: number
  securityRisk: number
  categories: Record<string, number>
  applications: ApplicationItem[]
  lastUpdated?: string
}

export interface ApplicationItem {
  name: string
  version: string
  vendor: string
  category: string
  installDate: string
  lastUsed?: string
  size?: number
  status: 'installed' | 'outdated' | 'security_risk' | 'unknown'
  riskLevel?: 'low' | 'medium' | 'high'
  description?: string
}

/**
 * Extract applications information from device modules
 * READER ONLY: Expects device to provide pre-processed, clean data
 */
export function extractApplications(deviceModules: any): ApplicationInfo {
  if (!deviceModules?.applications) {
    console.log('[APPLICATIONS MODULE] No applications data found in modules')
    return {
      totalApplications: 0,
      recentlyInstalled: 0,
      recentlyUpdated: 0,
      securityRisk: 0,
      categories: {},
      applications: []
    }
  }

  const apps = deviceModules.applications
  
  console.log('[APPLICATIONS MODULE] Reading pre-processed applications data:', {
    hasInstalledApps: !!apps.installed_applications,
    appCount: apps.installed_applications?.length || 0,
    hasSummary: !!apps.summary
  })

  // READER PATTERN: Device should provide summary statistics
  const summary = apps.summary || {}
  
  const applications: ApplicationItem[] = []
  const categories: Record<string, number> = {}

  // Process application list - minimal frontend processing
  if (apps.installed_applications && Array.isArray(apps.installed_applications)) {
    for (const app of apps.installed_applications) {
      const appItem: ApplicationItem = {
        name: app.name || 'Unknown Application',
        version: app.version || 'Unknown',
        vendor: app.vendor || app.publisher || 'Unknown',
        category: app.category || 'Other',
        installDate: app.install_date || app.installDate || '',
        lastUsed: app.last_used || app.lastUsed,
        size: app.size,
        status: app.status || 'installed',
        riskLevel: app.risk_level || app.riskLevel,
        description: app.description
      }

      applications.push(appItem)

      // Count categories (simple aggregation only)
      const category = appItem.category
      categories[category] = (categories[category] || 0) + 1
    }
  }

  const applicationsInfo: ApplicationInfo = {
    totalApplications: applications.length,
    // PREFER device-calculated summaries over frontend calculation
    recentlyInstalled: summary.recentlyInstalled || 0,
    recentlyUpdated: summary.recentlyUpdated || 0,
    securityRisk: summary.securityRisk || 0,
    categories,
    applications,
    lastUpdated: apps.lastUpdated || apps.collectedAt
  }

  console.log('[APPLICATIONS MODULE] Applications info read:', {
    totalApplications: applicationsInfo.totalApplications,
    categoriesCount: Object.keys(categories).length,
    usesSummaryFromDevice: !!summary.recentlyInstalled
  })

  return applicationsInfo
}

/**
 * Applications Tab Component
 * Installed applications and software inventory
 */

import React from 'react'
import { ApplicationsTable } from '../tables'
import { processApplicationsData } from '../../lib/data-processing/component-data'

interface ApplicationsTabProps {
  device: any
  data?: any
}

export const ApplicationsTab: React.FC<ApplicationsTabProps> = ({ device, data }) => {
  // Process applications data from the modular device structure
  const applicationsModuleData = processApplicationsData(device)
  
  // Check if we have applications data from the modules
  const hasApplicationsData = device?.modules?.applications?.installed_applications?.length > 0 || 
                              device?.applications?.installedApps?.length > 0 ||
                              applicationsModuleData?.installedApps?.length > 0

  // If no applications data, show empty state with proper message
  if (!hasApplicationsData) {
    const applicationsData = {
      totalApps: 0,
      installedApps: []
    }
    
    return (
      <div className="space-y-8">
        <ApplicationsTable data={applicationsData} />
      </div>
    )
  }

  // Transform applications data for the table component
  let installedApps = []
  
  // Try different data sources for applications
  if (device?.modules?.applications?.installed_applications) {
    installedApps = device.modules.applications.installed_applications
  } else if (device?.applications?.installedApps) {
    installedApps = device.applications.installedApps
  } else if (applicationsModuleData?.installedApps) {
    installedApps = applicationsModuleData.installedApps
  }

  // Transform the data to match ApplicationsTable expected format
  const processedApps = installedApps.map((app: any, index: number) => ({
    id: app.id || app.name || `app-${index}`,
    name: app.name || app.displayName || 'Unknown Application',
    displayName: app.displayName || app.name,
    version: app.version || app.bundle_version || 'Unknown',
    publisher: app.publisher || app.signed_by || 'Unknown Publisher',
    category: app.category || 'Uncategorized',
    installDate: app.installDate || app.install_date || app.last_modified,
    size: app.size,
    path: app.path || app.install_location,
    bundleId: app.bundleId || app.bundle_id,
    info: app.info,
    obtained_from: app.obtained_from,
    runtime_environment: app.runtime_environment,
    has64bit: app.has64bit,
    signed_by: app.signed_by
  }))

  // Calculate summary statistics
  const totalApps = processedApps.length
  const signedApps = processedApps.filter((app: any) => app.signed_by || app.publisher !== 'Unknown Publisher').length
  const recentApps = processedApps.filter((app: any) => {
    if (!app.installDate) return false
    const installDate = new Date(app.installDate)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    return installDate > thirtyDaysAgo
  }).length

  const applicationsData = {
    totalApps,
    signedApps,
    recentApps,
    installedApps: processedApps
  }

  return (
    <div className="space-y-8">
      <ApplicationsTable data={applicationsData} />
    </div>
  )
}

export default ApplicationsTab

/**
 * Applications Widget
 * Displays installed applications summary
 */

import React from 'react'
import { StatBlock, Stat, EmptyState, Icons, WidgetColors } from './shared'

interface ApplicationInfo {
  id: string
  name: string
  displayName?: string
  version: string
  publisher?: string
  category?: string
  installDate?: string
  signed_by?: string
}

interface ApplicationsData {
  totalApps: number
  installedApps: ApplicationInfo[]
}

interface Device {
  id: string
  name: string
  // Modular applications data
  modules?: {
    applications?: ApplicationsData
  }
}

interface ApplicationsWidgetProps {
  device: Device
}

export const ApplicationsWidget: React.FC<ApplicationsWidgetProps> = ({ device }) => {
  // Access applications data from modular structure
  const applications = device.modules?.applications
  const hasApplicationsInfo = applications && applications.installedApps && applications.installedApps.length > 0

  if (!hasApplicationsInfo) {
    return (
      <StatBlock 
        title="Applications" 
        subtitle="Installed software"
        icon={Icons.applications}
        iconColor={WidgetColors.purple}
      >
        <EmptyState message="Application information not available" />
      </StatBlock>
    )
  }

  const stats = {
    total: applications.totalApps || applications.installedApps.length,
    signed: applications.installedApps.filter(app => app.signed_by || app.publisher).length,
    categories: new Set(applications.installedApps.map(app => app.category).filter(Boolean)).size,
    publishers: new Set(applications.installedApps.map(app => app.publisher).filter(Boolean)).size
  }

  return (
    <StatBlock 
      title="Applications" 
      subtitle="Installed software"
      icon={Icons.applications}
      iconColor={WidgetColors.purple}
    >
      <Stat label="Total Applications" value={stats.total.toString()} />
      <Stat label="Signed Applications" value={stats.signed.toString()} />
      <Stat label="Categories" value={stats.categories.toString()} />
      <Stat label="Publishers" value={stats.publishers.toString()} />
      
      {/* Show a few recent applications */}
      {applications.installedApps.slice(0, 3).map((app, index) => (
        <div key={app.id || index} className="pt-2 border-t border-gray-200 dark:border-gray-700 first:border-t-0 first:pt-0">
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {app.displayName || app.name}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {app.version}{app.publisher && ` • ${app.publisher}`}
          </div>
        </div>
      ))}
      
      {applications.installedApps.length > 3 && (
        <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
          +{applications.installedApps.length - 3} more applications
        </div>
      )}
    </StatBlock>
  )
}

export default ApplicationsWidget

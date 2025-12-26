/**
 * Installs Widget
 * Displays software installation activity and summary
 */

import React from 'react'
import { StatBlock, Stat, EmptyState, Icons, WidgetColors } from './shared'

interface InstallEvent {
  id: string
  name: string
  version?: string
  type: 'install' | 'update' | 'removal'
  status: 'success' | 'failure' | 'pending'
  timestamp: string
  duration?: number
}

interface InstallsData {
  totalInstalls: number
  recentInstalls: InstallEvent[]
  successfulInstalls: number
  failedInstalls: number
  pendingInstalls: number
}

interface Device {
  id: string
  name: string
  // Modular structure
  modules?: {
    installs?: InstallsData
  }
}

interface InstallsWidgetProps {
  device: Device
}

export const InstallsWidget: React.FC<InstallsWidgetProps> = ({ device }) => {
  // Access installs data from modular structure
  const installs = device.modules?.installs
  const hasInstallsInfo = installs && (installs.totalInstalls > 0 || installs.recentInstalls?.length > 0)

  if (!hasInstallsInfo) {
    return (
      <StatBlock 
        title="Installs" 
        subtitle="Software installation activity"
        icon={Icons.applications}
        iconColor={WidgetColors.green}
      >
        <EmptyState message="Installation information not available" />
      </StatBlock>
    )
  }

  const formatInstallType = (type: string) => {
    switch (type) {
      case 'install': return 'New Install'
      case 'update': return 'Update'
      case 'removal': return 'Removal'
      default: return type
    }
  }

  const formatStatus = (status: string) => {
    switch (status) {
      case 'success': return 'Successful'
      case 'failure': return 'Failed'
      case 'pending': return 'In Progress'
      default: return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 dark:text-green-400'
      case 'failure': return 'text-red-600 dark:text-red-400'
      case 'pending': return 'text-yellow-600 dark:text-yellow-400'
      default: return 'text-gray-600 dark:text-gray-400'
    }
  }

  return (
    <StatBlock 
      title="Installs" 
      subtitle="Software installation activity"
      icon={Icons.applications}
      iconColor={WidgetColors.green}
    >
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Stat 
          label="Total Installs" 
          value={installs.totalInstalls || 0} 
        />
        <Stat 
          label="Successful" 
          value={installs.successfulInstalls || 0} 
        />
        <Stat 
          label="Failed" 
          value={installs.failedInstalls || 0} 
        />
        <Stat 
          label="Pending" 
          value={installs.pendingInstalls || 0} 
        />
      </div>

      {installs.recentInstalls && installs.recentInstalls.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Recent Activity</h4>
          <div className="space-y-2">
            {installs.recentInstalls.slice(0, 5).map((install) => (
              <div key={install.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {install.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {formatInstallType(install.type)}
                    {install.version && ` v${install.version}`}
                    {install.duration && ` ${install.duration}s`}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <span className={`text-xs font-medium ${getStatusColor(install.status)}`}>
                    {formatStatus(install.status)}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(install.timestamp).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(!installs.recentInstalls || installs.recentInstalls.length === 0) && installs.totalInstalls > 0 && (
        <div className="text-center py-4">
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            {installs.totalInstalls} total installs recorded
          </p>
        </div>
      )}
    </StatBlock>
  )
}

export default InstallsWidget

/**
 * Installs Tab Component
 * Managed software installations and updates
 */

import React from 'react'
import { ManagedInstallsTable } from '../tables'

interface InstallsTabProps {
  device: any
  data?: any
}

export const InstallsTab: React.FC<InstallsTabProps> = ({ device, data }) => {
  return (
    <div className="space-y-8">
      <ManagedInstallsTable data={data || device.managedInstalls || {
        totalPackages: 0,
        installed: 0,
        pending: 0,
        failed: 0,
        lastUpdate: '',
        packages: []
      }} />
    </div>
  )
}

export default InstallsTab

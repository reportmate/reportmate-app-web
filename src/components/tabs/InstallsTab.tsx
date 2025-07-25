/**
 * Installs Tab Component
 * Managed software installations and updates
 */

import React from 'react'
import { ManagedInstallsTable } from '../tables'
import { processInstallsData } from '../../lib/data-processing/component-data'

interface InstallsTabProps {
  device: any
  data?: any
}

export const InstallsTab: React.FC<InstallsTabProps> = ({ device, data }) => {
  // Use the processed installs data which includes configuration
  const installsData = data || processInstallsData(device)

  return (
    <div className="space-y-8">
      {/* Managed Installs with Configuration */}
      <ManagedInstallsTable data={installsData} />
    </div>
  )
}

export default InstallsTab

/**
 * Applications Tab Component
 * Installed applications and software inventory
 */

import React from 'react'
import { ApplicationsTable } from '../tables'

interface ApplicationsTabProps {
  device: any
  data?: any
}

export const ApplicationsTab: React.FC<ApplicationsTabProps> = ({ device, data }) => {
  return (
    <div className="space-y-8">
      <ApplicationsTable data={data || device.applications || {
        totalApps: 0,
        installedApps: []
      }} />
    </div>
  )
}

export default ApplicationsTab

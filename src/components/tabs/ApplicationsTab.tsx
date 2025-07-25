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
  // Extract services from the device data as applications
  const services = device?.services || []
  const runningServices = services.filter((s: any) => s.status === 'RUNNING')
  const stoppedServices = services.filter((s: any) => s.status === 'STOPPED')
  
  // Transform services into application-like data for display
  const applicationsData = {
    totalApps: services.length,
    runningApps: runningServices.length,
    stoppedApps: stoppedServices.length,
    installedApps: services.map((service: any) => ({
      id: service.name,
      name: service.displayName || service.name,
      displayName: service.displayName,
      path: service.path,
      version: 'N/A',
      publisher: 'Microsoft Corporation',
      category: service.status === 'RUNNING' ? 'Active Service' : 'Inactive Service',
      description: service.description,
      status: service.status,
      startType: service.startType
    }))
  }

  return (
    <div className="space-y-8">
      <ApplicationsTable data={applicationsData} />
    </div>
  )
}

export default ApplicationsTab

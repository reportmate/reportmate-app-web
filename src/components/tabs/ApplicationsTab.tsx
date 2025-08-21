/**
 * Applications Tab Component
 * Installed applications and software inventory
 */

import React, { useMemo } from 'react'
import { ApplicationsTable } from '../tables'
import { processApplicationsData } from '../../lib/data-processing/component-data'

interface ApplicationInfo {
  id: string;
  name: string;
  displayName?: string;
  version?: string;
  publisher?: string;
  category?: string;
  installDate?: string;
  size?: string;
  path?: string;
  [key: string]: unknown; // Allow additional properties from API
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
    }
  }
}

interface ApplicationsTabProps {
  device: DeviceData
  data?: {
    installedApps?: ApplicationInfo[]
  }
}

export const ApplicationsTab: React.FC<ApplicationsTabProps> = ({ device, data }) => {
  // Process applications data from the modular device structure
  const applicationsModuleData = processApplicationsData(device)
  
  // Check if we have applications data - prioritize data prop, then processed device data
  const hasApplicationsData = (data?.installedApps?.length ?? 0) > 0 ||
                              (device?.applications?.installedApps?.length ?? 0) > 0 ||
                              (device?.modules?.applications?.installed_applications?.length ?? 0) > 0 || 
                              (device?.modules?.applications?.installedApplications?.length ?? 0) > 0 || 
                              (applicationsModuleData?.installedApps?.length ?? 0) > 0

  console.log('🔍 ApplicationsTab Debug:', {
    hasDataProp: !!data,
    dataInstalledAppsLength: data?.installedApps?.length,
    hasDeviceApplications: !!device?.applications,
    deviceApplicationsLength: device?.applications?.installedApps?.length,
    hasModuleApplications: !!device?.modules?.applications,
    moduleApplicationsLength: device?.modules?.applications?.installed_applications?.length,
    moduleApplicationsLengthCamelCase: device?.modules?.applications?.installedApplications?.length,
    hasProcessedData: !!applicationsModuleData?.installedApps?.length,
    hasApplicationsData,
    // More detailed debugging
    fullDevice: JSON.stringify(device).substring(0, 1000),
    deviceModuleKeys: device?.modules ? Object.keys(device.modules) : 'NO_MODULES',
    applicationsModuleData: JSON.stringify(applicationsModuleData).substring(0, 500)
  });

  // Transform applications data for the table component
  let installedApps: ApplicationInfo[] = []
  
  console.log('🔍 ApplicationsTab Data Sources Debug:', {
    hasDataProp: !!data?.installedApps?.length,
    dataPropsAppsCount: data?.installedApps?.length || 0,
    hasDeviceApplications: !!device?.applications?.installedApps,
    deviceApplicationsCount: device?.applications?.installedApps?.length || 0,
    hasRawModuleSnakeCase: !!device?.modules?.applications?.installed_applications,
    rawModuleSnakeCaseCount: device?.modules?.applications?.installed_applications?.length || 0,
    hasRawModuleCamelCase: !!device?.modules?.applications?.installedApplications,
    rawModuleCamelCaseCount: device?.modules?.applications?.installedApplications?.length || 0,
    hasProcessedModuleData: !!applicationsModuleData?.installedApps,
    processedModuleDataCount: applicationsModuleData?.installedApps?.length || 0,
    // Check for the actual Windows client field name
    hasWindowsClientField: !!device?.modules?.applications?.InstalledApplications,
    windowsClientFieldCount: device?.modules?.applications?.InstalledApplications?.length || 0,
    applicationModuleKeys: device?.modules?.applications ? Object.keys(device.modules.applications) : []
  });
  
  // Prioritize data prop, then processed device data, then fallback to raw module data
  if (data?.installedApps?.length) {
    console.log('✅ Using data prop (processedData.applications)');
    installedApps = data.installedApps
  } else if (device?.modules?.applications?.installedApplications) {
    console.log('⚠️ Falling back to raw module data (camelCase)');
    installedApps = device.modules.applications.installedApplications
  } else if (device?.modules?.applications?.InstalledApplications) {
    console.log('⚠️ Falling back to raw module data (PascalCase - Windows Client)');
    installedApps = device.modules.applications.InstalledApplications
  } else if (device?.modules?.applications?.installed_applications) {
    console.log('⚠️ Falling back to raw module data (snake_case)');
    installedApps = device.modules.applications.installed_applications
  } else if (applicationsModuleData?.installedApps) {
    console.log('⚠️ Using processed module data');
    installedApps = applicationsModuleData.installedApps
  }

  // Transform the data to match ApplicationsTable expected format
  const processedApps = installedApps.map((app: ApplicationInfo, index: number) => ({
    id: app.id || app.name || `app-${index}`,
    name: app.name || app.displayName || 'Unknown Application',
    displayName: app.displayName || app.name,
    version: app.version || (app as unknown as Record<string, unknown>).bundle_version as string || 'Unknown',
    publisher: app.publisher || (app as unknown as Record<string, unknown>).signed_by as string || 'Unknown Publisher',
    category: app.category || 'Uncategorized',
    installDate: app.installDate || (app as unknown as Record<string, unknown>).install_date as string || (app as unknown as Record<string, unknown>).last_modified as string,
    size: app.size,
    path: app.path || (app as unknown as Record<string, unknown>).install_location as string,
    bundleId: (app as unknown as Record<string, unknown>).bundleId as string || (app as unknown as Record<string, unknown>).bundle_id as string,
    info: (app as unknown as Record<string, unknown>).info as string,
    obtained_from: (app as unknown as Record<string, unknown>).obtained_from as string,
    runtime_environment: (app as unknown as Record<string, unknown>).runtime_environment as string,
    has64bit: (app as unknown as Record<string, unknown>).has64bit as boolean,
    signed_by: (app as unknown as Record<string, unknown>).signed_by as string
  }))

  // Calculate summary statistics
  const totalApps = processedApps.length
  const signedApps = processedApps.filter((app: ApplicationInfo) => (app as unknown as Record<string, unknown>).signed_by || app.publisher !== 'Unknown Publisher').length
  const recentApps = processedApps.filter((app: ApplicationInfo) => {
    if (!app.installDate) return false
    const installDate = new Date(app.installDate)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    return installDate > thirtyDaysAgo
  }).length

  const applicationsData = useMemo(() => ({
    totalApps,
    signedApps,
    recentApps,
    installedApps: processedApps
  }), [totalApps, signedApps, recentApps, processedApps]);

  console.log('🔍 ApplicationsTab Final Data Debug:', {
    totalApps,
    signedApps,
    recentApps,
    processedAppsCount: processedApps.length,
    sampleProcessedApp: processedApps[0] ? {
      id: processedApps[0].id,
      name: processedApps[0].name,
      displayName: processedApps[0].displayName,
      publisher: processedApps[0].publisher,
      version: processedApps[0].version
    } : null
  });

  // If no applications data, show empty state with proper message
  if (!hasApplicationsData) {
    return (
      <div className="space-y-6">
        {/* Header with Icon */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Applications</h1>
              <p className="text-base text-gray-600 dark:text-gray-400">Inventory and details</p>
            </div>
          </div>
        </div>

        <ApplicationsTable data={applicationsData} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Icon */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Applications</h1>
            <p className="text-base text-gray-600 dark:text-gray-400">Inventory and details</p>
          </div>
        </div>
        {/* Total Apps - Top Right */}
        {totalApps > 0 && (
          <div className="text-right mr-8">
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Applications</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {totalApps.toLocaleString()}
            </div>
          </div>
        )}
      </div>

      <ApplicationsTable key="applications-table" data={applicationsData} />
    </div>
  )
}

export default ApplicationsTab

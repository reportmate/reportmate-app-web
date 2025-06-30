import React from 'react';
import { formatRelativeTime } from '../../../lib/time';
import { ExtendedModuleManifest, DeviceWidget, WidgetCondition, DeviceWidgetProps, ModuleConfigSchema } from '../EnhancedModule';

interface ApplicationInfo {
  id: string;
  name: string;
  displayName?: string;
  path: string;
  version: string;
  bundle_version?: string;
  last_modified: number;
  obtained_from?: string;
  runtime_environment?: string;
  info?: string;
  has64bit?: boolean;
  signed_by?: string;
  publisher?: string;
  category?: string;
}

interface ApplicationsData {
  totalApps: number;
  installedApps: ApplicationInfo[];
}

// Applications Overview Widget
const ApplicationsOverviewWidget: React.FC<DeviceWidgetProps> = ({ device }) => {
  const applications = device?.applications as ApplicationsData | undefined;

  if (!applications || !applications.installedApps?.length) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-7H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2z" />
          </svg>
        </div>
        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">No Applications</h3>
        <p className="text-xs text-gray-600 dark:text-gray-400">No application data available</p>
      </div>
    );
  }

  const stats = {
    total: applications.totalApps || applications.installedApps.length,
    signed: applications.installedApps.filter(app => app.signed_by || app.publisher).length,
    categories: new Set(applications.installedApps.map(app => app.category).filter(Boolean)).size,
  };

  return (
    <div className="p-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
            {stats.total}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Total Apps</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
            {stats.signed}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Signed Apps</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">
            {stats.categories}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Categories</div>
        </div>
      </div>
    </div>
  );
};

// Applications Table Widget
const ApplicationsTableWidget: React.FC<DeviceWidgetProps> = ({ device }) => {
  const applications = device?.applications as ApplicationsData | undefined;

  if (!applications?.installedApps?.length) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-7H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Applications Data</h3>
        <p className="text-gray-600 dark:text-gray-400">Application information is not available for this device.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-gray-900">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Application</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Version</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Bundle ID</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Publisher</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Last Modified</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {applications.installedApps.map((app, index) => (
            <tr key={app.id || app.name || `app-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">
              <td className="px-6 py-4 whitespace-nowrap">
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{app.displayName || app.name}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{app.path}</div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900 dark:text-white">
                  {app.version}
                  {app.bundle_version && app.bundle_version !== app.version && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">Build: {app.bundle_version}</div>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900 dark:text-white font-mono">{app.id}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900 dark:text-white">{app.publisher || app.signed_by || 'Unknown'}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                {app.last_modified ? formatRelativeTime(new Date(app.last_modified * 1000).toISOString()) : 'Unknown'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Categories Widget
const ApplicationsCategoriesWidget: React.FC<DeviceWidgetProps> = ({ device }) => {
  const applications = device?.applications as ApplicationsData | undefined;

  if (!applications?.installedApps?.length) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-gray-600 dark:text-gray-400">No application categories available</p>
      </div>
    );
  }

  const categoryStats = applications.installedApps.reduce((acc, app) => {
    const category = app.category || 'Uncategorized';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sortedCategories = Object.entries(categoryStats)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10); // Top 10 categories

  return (
    <div className="p-6">
      <div className="space-y-3">
        {sortedCategories.map(([category, count]) => (
          <div key={category} className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {category}
            </span>
            <div className="flex items-center gap-2">
              <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2 flex-1 min-w-[60px]">
                <div 
                  className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full"
                  style={{ width: `${(count / Math.max(...Object.values(categoryStats))) * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400 w-8 text-right">
                {count}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Module Definition
const ApplicationsModule = {
  manifest: {
    id: 'applications',
    name: 'Applications',
    version: '1.0.0',
    description: 'Display installed applications and application statistics',
    author: 'ReportMate',
    enabled: true,
    category: 'device',
    tags: ['applications', 'software', 'inventory'],
    dependencies: [],
    documentation: 'Shows installed applications with detailed information including versions, publishers, and categories.',
  } as ExtendedModuleManifest,

  configSchema: {
    title: 'Applications Module Configuration',
    description: 'Configure how applications are displayed',
    properties: {
      showCategories: {
        type: 'boolean' as const,
        title: 'Show Categories',
        description: 'Display application categories breakdown',
        default: true,
      },
      maxAppsInTable: {
        type: 'number' as const,
        title: 'Max Apps in Table',
        description: 'Maximum number of applications to show in table',
        default: 100,
        validation: {
          min: 10,
          max: 1000,
        },
      },
      hideSystemApps: {
        type: 'boolean' as const,
        title: 'Hide System Apps',
        description: 'Hide system and built-in applications',
        default: false,
      },
    },
  } as ModuleConfigSchema,

  defaultConfig: {
    showCategories: true,
    maxAppsInTable: 100,
    hideSystemApps: false,
  },

  deviceWidgets: [
    {
      id: 'applications-overview',
      name: 'Applications Overview',
      description: 'Overview of installed applications with key statistics',
      component: ApplicationsOverviewWidget,
      category: 'overview' as const,
      size: 'small' as const,
      order: 1,
      conditions: [{
        type: 'has_data' as const,
        field: 'applications.installedApps',
        operator: 'exists' as const,
        value: true,
      }],
      refreshInterval: 300000, // 5 minutes
    },
    {
      id: 'applications-table',
      name: 'Applications Table',
      description: 'Detailed table of all installed applications',
      component: ApplicationsTableWidget,
      category: 'software' as const,
      size: 'full' as const,
      order: 2,
      conditions: [{
        type: 'has_data' as const,
        field: 'applications.installedApps',
        operator: 'exists' as const,
        value: true,
      }],
      refreshInterval: 300000, // 5 minutes
    },
    {
      id: 'applications-categories',
      name: 'Application Categories',
      description: 'Breakdown of applications by category',
      component: ApplicationsCategoriesWidget,
      category: 'software' as const,
      size: 'medium' as const,
      order: 3,
      conditions: [{
        type: 'has_data' as const,
        field: 'applications.installedApps',
        operator: 'exists' as const,
        value: true,
      }],
      refreshInterval: 300000, // 5 minutes
    },
  ] as DeviceWidget[],

  // Lifecycle hooks
  async onInstall() {
    console.log('ApplicationsModule installed');
  },

  async onUninstall() {
    console.log('ApplicationsModule uninstalled');
  },

  async onEnable() {
    console.log('ApplicationsModule enabled');
  },

  async onDisable() {
    console.log('ApplicationsModule disabled');
  },

  async onConfigChange(config: any) {
    console.log('ApplicationsModule config changed:', config);
  },

  async onDataUpdate(newData: any, oldData: any) {
    console.log('ApplicationsModule data updated');
  },
};

export default ApplicationsModule;

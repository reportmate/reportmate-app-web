import React from 'react';
import { ExtendedModuleManifest, DeviceWidget, DeviceWidgetProps, ModuleConfigSchema } from '../EnhancedModule';

interface MDMInfo {
  enrolled: boolean;
  enrolled_via_dep: boolean;
  server_url?: string | null;
  user_approved?: boolean;
  organization?: string | null;
  department?: string | null;
  profiles?: Array<{
    id: string;
    name: string;
    description: string;
    type: string;
    status: string;
    lastModified: string;
  }>;
  restrictions?: {
    app_installation?: string;
    camera_disabled?: boolean;
    screen_recording_disabled?: boolean;
    system_preferences_disabled?: boolean;
    touch_id_disabled?: boolean;
    siri_disabled?: boolean;
  };
  apps?: Array<{
    id: string;
    name: string;
    bundleId: string;
    status: string;
    source: string;
    lastUpdate: string;
  }>;
}

// MDM Overview Widget
const MDMOverviewWidget: React.FC<DeviceWidgetProps> = ({ device }) => {
  const mdm = device?.mdm as MDMInfo | undefined;

  if (!mdm) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">No MDM Data</h3>
        <p className="text-xs text-gray-600 dark:text-gray-400">MDM enrollment information not available</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="space-y-4">
        <div className="text-center">
          <div className={`text-lg font-bold mb-1 ${
            mdm.enrolled ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'
          }`}>
            {mdm.enrolled ? 'ENROLLED' : 'NOT ENROLLED'}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">MDM Status</div>
        </div>
        
        {mdm.enrolled && (
          <>
            <div className="text-center">
              <div className={`text-sm font-bold mb-1 ${
                mdm.enrolled_via_dep ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
              }`}>
                {mdm.enrolled_via_dep ? 'DEP ENROLLED' : 'MANUAL ENROLLMENT'}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Enrollment Type</div>
            </div>
            
            <div className="text-center">
              <div className={`text-sm font-bold mb-1 ${
                mdm.user_approved ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'
              }`}>
                {mdm.user_approved ? 'USER APPROVED' : 'NOT APPROVED'}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Approval Status</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// MDM Details Widget
const MDMDetailsWidget: React.FC<DeviceWidgetProps> = ({ device }) => {
  const mdm = device?.mdm as MDMInfo | undefined;

  if (!mdm || !mdm.enrolled) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Device Not Enrolled</h3>
        <p className="text-gray-600 dark:text-gray-400">This device is not enrolled in MDM.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enrollment Details */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Enrollment Details</h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Enrollment Status</label>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              Enrolled
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">DEP Enrollment</label>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              mdm.enrolled_via_dep 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
            }`}>
              {mdm.enrolled_via_dep ? 'Yes' : 'No'}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">User Approved</label>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              mdm.user_approved 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
            }`}>
              {mdm.user_approved ? 'Yes' : 'No'}
            </span>
          </div>
          
          {mdm.organization && (
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Organization</label>
              <p className="text-gray-900 dark:text-white text-sm">{mdm.organization}</p>
            </div>
          )}
          
          {mdm.department && (
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Department</label>
              <p className="text-gray-900 dark:text-white text-sm">{mdm.department}</p>
            </div>
          )}
          
          {mdm.server_url && (
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Server URL</label>
              <p className="text-gray-900 dark:text-white text-sm font-mono break-all">{mdm.server_url}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// MDM Profiles Widget
const MDMProfilesWidget: React.FC<DeviceWidgetProps> = ({ device }) => {
  const mdm = device?.mdm as MDMInfo | undefined;

  if (!mdm?.profiles?.length) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">No Profiles</h3>
        <p className="text-xs text-gray-600 dark:text-gray-400">No MDM profiles installed</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {mdm.profiles.map((profile) => (
        <div key={profile.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">{profile.name}</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">{profile.description}</p>
            </div>
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              profile.status === 'installed' 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
            }`}>
              {profile.status}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
            <span>Type: {profile.type}</span>
            <span>Modified: {new Date(profile.lastModified).toLocaleDateString()}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

// MDM Restrictions Widget
const MDMRestrictionsWidget: React.FC<DeviceWidgetProps> = ({ device }) => {
  const mdm = device?.mdm as MDMInfo | undefined;

  if (!mdm?.restrictions) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-gray-600 dark:text-gray-400">No restrictions data available</p>
      </div>
    );
  }

  const restrictions = mdm.restrictions;

  return (
    <div className="p-6 space-y-4">
      {restrictions.app_installation && (
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">App Installation</label>
          <span className="text-sm text-gray-900 dark:text-white">{restrictions.app_installation}</span>
        </div>
      )}
      
      {restrictions.camera_disabled !== undefined && (
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Camera</label>
          <span className={`text-sm font-semibold ${
            restrictions.camera_disabled ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
          }`}>
            {restrictions.camera_disabled ? 'Disabled' : 'Enabled'}
          </span>
        </div>
      )}
      
      {restrictions.screen_recording_disabled !== undefined && (
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Screen Recording</label>
          <span className={`text-sm font-semibold ${
            restrictions.screen_recording_disabled ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
          }`}>
            {restrictions.screen_recording_disabled ? 'Disabled' : 'Enabled'}
          </span>
        </div>
      )}
      
      {restrictions.system_preferences_disabled !== undefined && (
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">System Preferences</label>
          <span className={`text-sm font-semibold ${
            restrictions.system_preferences_disabled ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
          }`}>
            {restrictions.system_preferences_disabled ? 'Disabled' : 'Enabled'}
          </span>
        </div>
      )}
      
      {restrictions.touch_id_disabled !== undefined && (
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Touch ID</label>
          <span className={`text-sm font-semibold ${
            restrictions.touch_id_disabled ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
          }`}>
            {restrictions.touch_id_disabled ? 'Disabled' : 'Enabled'}
          </span>
        </div>
      )}
      
      {restrictions.siri_disabled !== undefined && (
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Siri</label>
          <span className={`text-sm font-semibold ${
            restrictions.siri_disabled ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
          }`}>
            {restrictions.siri_disabled ? 'Disabled' : 'Enabled'}
          </span>
        </div>
      )}
    </div>
  );
};

// Module Definition
const MDMModule = {
  manifest: {
    id: 'mdm',
    name: 'MDM Management',
    version: '1.0.0',
    description: 'Display MDM enrollment status and management information',
    author: 'ReportMate',
    enabled: true,
    category: 'device',
    tags: ['mdm', 'management', 'enrollment', 'profiles', 'restrictions'],
    dependencies: [],
    documentation: 'Shows MDM enrollment status, organization details, profiles, and restrictions.',
  } as ExtendedModuleManifest,

  configSchema: {
    title: 'MDM Module Configuration',
    description: 'Configure how MDM information is displayed',
    properties: {
      showProfiles: {
        type: 'boolean' as const,
        title: 'Show Profiles',
        description: 'Display installed MDM profiles',
        default: true,
      },
      showRestrictions: {
        type: 'boolean' as const,
        title: 'Show Restrictions',
        description: 'Display MDM restrictions and policies',
        default: true,
      },
      showServerDetails: {
        type: 'boolean' as const,
        title: 'Show Server Details',
        description: 'Display MDM server URL and technical details',
        default: false,
      },
    },
  } as ModuleConfigSchema,

  defaultConfig: {
    showProfiles: true,
    showRestrictions: true,
    showServerDetails: false,
  },

  deviceWidgets: [
    {
      id: 'mdm-overview',
      name: 'MDM Overview',
      description: 'Quick overview of MDM enrollment status',
      component: MDMOverviewWidget,
      category: 'overview' as const,
      size: 'small' as const,
      order: 1,
      conditions: [{
        type: 'has_data' as const,
        field: 'mdm',
        operator: 'exists' as const,
        value: true,
      }],
      refreshInterval: 300000, // 5 minutes
    },
    {
      id: 'mdm-details',
      name: 'MDM Details',
      description: 'Detailed MDM enrollment and organization information',
      component: MDMDetailsWidget,
      category: 'custom' as const,
      size: 'large' as const,
      order: 2,
      conditions: [{
        type: 'has_data' as const,
        field: 'mdm.enrolled',
        operator: 'eq' as const,
        value: true,
      }],
      refreshInterval: 300000, // 5 minutes
    },
    {
      id: 'mdm-profiles',
      name: 'MDM Profiles',
      description: 'Installed MDM configuration profiles',
      component: MDMProfilesWidget,
      category: 'custom' as const,
      size: 'medium' as const,
      order: 3,
      conditions: [{
        type: 'has_data' as const,
        field: 'mdm.profiles',
        operator: 'exists' as const,
        value: true,
      }],
      refreshInterval: 300000, // 5 minutes
    },
    {
      id: 'mdm-restrictions',
      name: 'MDM Restrictions',
      description: 'Device restrictions and policies enforced by MDM',
      component: MDMRestrictionsWidget,
      category: 'custom' as const,
      size: 'medium' as const,
      order: 4,
      conditions: [{
        type: 'has_data' as const,
        field: 'mdm.restrictions',
        operator: 'exists' as const,
        value: true,
      }],
      refreshInterval: 300000, // 5 minutes
    },
  ] as DeviceWidget[],

  // Lifecycle hooks
  async onInstall() {
    console.log('MDMModule installed');
  },

  async onUninstall() {
    console.log('MDMModule uninstalled');
  },

  async onEnable() {
    console.log('MDMModule enabled');
  },

  async onDisable() {
    console.log('MDMModule disabled');
  },

  async onConfigChange(config: any) {
    console.log('MDMModule config changed:', config);
  },
};

export default MDMModule;

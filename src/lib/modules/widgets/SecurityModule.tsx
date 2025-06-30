import React from 'react';
import { ExtendedModuleManifest, DeviceWidget, DeviceWidgetProps, ModuleConfigSchema } from '../EnhancedModule';

interface SecurityInfo {
  gatekeeper?: string;
  sip?: string;
  ssh_groups?: string;
  ssh_users?: string;
  ard_groups?: string;
  root_user?: string;
  ard_users?: string;
  firmwarepw?: string;
  firewall_state?: string;
  skel_state?: string;
  t2_secureboot?: string;
  t2_externalboot?: string;
  activation_lock?: string;
  filevault_status?: boolean;
  filevault_users?: string;
  as_security_mode?: string;
}

// Security Overview Widget
const SecurityOverviewWidget: React.FC<DeviceWidgetProps> = ({ device }) => {
  const security = device?.security as SecurityInfo | undefined;

  if (!security) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">No Security Data</h3>
        <p className="text-xs text-gray-600 dark:text-gray-400">Security information not available</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className={`text-lg font-bold mb-1 ${
            security.filevault_status ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-300'
          }`}>
            {security.filevault_status ? 'ON' : 'OFF'}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">FileVault</div>
        </div>
        
        <div className="text-center">
          <div className={`text-lg font-bold mb-1 ${
            security.firewall_state === 'On' ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-300'
          }`}>
            {security.firewall_state === 'On' ? 'ON' : 'OFF'}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Firewall</div>
        </div>
        
        <div className="text-center">
          <div className={`text-lg font-bold mb-1 ${
            security.gatekeeper === 'Enabled' ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-300'
          }`}>
            {security.gatekeeper === 'Enabled' ? 'ON' : 'OFF'}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Gatekeeper</div>
        </div>
      </div>
    </div>
  );
};

// System Security Widget
const SystemSecurityWidget: React.FC<DeviceWidgetProps> = ({ device }) => {
  const security = device?.security as SecurityInfo | undefined;

  if (!security) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-gray-600 dark:text-gray-400">No system security data available</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {security.sip && (
        <div>
          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">System Integrity Protection</label>
          <p className={`text-sm font-semibold ${
            security.sip === 'Enabled' ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-300'
          }`}>
            {security.sip}
          </p>
        </div>
      )}
      {security.t2_secureboot && (
        <div>
          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Secure Boot</label>
          <p className="text-sm text-gray-900 dark:text-white">{security.t2_secureboot}</p>
        </div>
      )}
      {security.as_security_mode && (
        <div>
          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Security Mode</label>
          <p className="text-sm text-gray-900 dark:text-white">{security.as_security_mode}</p>
        </div>
      )}
      {security.activation_lock && (
        <div>
          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Activation Lock</label>
          <p className={`text-sm font-semibold ${
            security.activation_lock === 'Disabled' ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-300'
          }`}>
            {security.activation_lock}
          </p>
        </div>
      )}
      {security.firmwarepw && (
        <div>
          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Firmware Password</label>
          <p className={`text-sm font-semibold ${
            security.firmwarepw === 'Set' ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'
          }`}>
            {security.firmwarepw}
          </p>
        </div>
      )}
    </div>
  );
};

// User Access Widget
const UserAccessWidget: React.FC<DeviceWidgetProps> = ({ device }) => {
  const security = device?.security as SecurityInfo | undefined;

  if (!security) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-gray-600 dark:text-gray-400">No user access data available</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {security.root_user && (
        <div>
          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Root User</label>
          <p className={`text-sm font-semibold ${
            security.root_user === 'Disabled' ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-300'
          }`}>
            {security.root_user}
          </p>
        </div>
      )}
      {security.ssh_users && (
        <div>
          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">SSH Users</label>
          <p className="text-sm text-gray-900 dark:text-white font-mono">{security.ssh_users}</p>
        </div>
      )}
      {security.ssh_groups && (
        <div>
          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">SSH Groups</label>
          <p className="text-sm text-gray-900 dark:text-white font-mono">{security.ssh_groups}</p>
        </div>
      )}
      {security.ard_users && (
        <div>
          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">ARD Users</label>
          <p className="text-sm text-gray-900 dark:text-white font-mono">{security.ard_users}</p>
        </div>
      )}
      {security.ard_groups && (
        <div>
          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">ARD Groups</label>
          <p className="text-sm text-gray-900 dark:text-white font-mono">{security.ard_groups}</p>
        </div>
      )}
      {security.filevault_users && (
        <div>
          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">FileVault Users</label>
          <p className="text-sm text-gray-900 dark:text-white font-mono">{security.filevault_users}</p>
        </div>
      )}
    </div>
  );
};

// Security Details Widget
const SecurityDetailsWidget: React.FC<DeviceWidgetProps> = ({ device }) => {
  const security = device?.security as SecurityInfo | undefined;

  if (!security) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Security Data</h3>
        <p className="text-gray-600 dark:text-gray-400">Security information is not available for this device.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Security Status</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Security features and compliance status</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className={`text-2xl font-bold mb-1 ${
              security.filevault_status ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-300'
            }`}>
              {security.filevault_status ? 'Enabled' : 'Disabled'}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">FileVault</div>
          </div>
          
          <div className="text-center">
            <div className={`text-2xl font-bold mb-1 ${
              security.firewall_state === 'On' ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-300'
            }`}>
              {security.firewall_state || 'Unknown'}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Firewall</div>
          </div>
          
          <div className="text-center">
            <div className={`text-2xl font-bold mb-1 ${
              security.gatekeeper === 'Enabled' ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-300'
            }`}>
              {security.gatekeeper || 'Unknown'}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Gatekeeper</div>
          </div>
        </div>
      </div>
      
      {/* Detailed Security Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SystemSecurityWidget deviceId={device?.id || ''} device={device} />
        <UserAccessWidget deviceId={device?.id || ''} device={device} />
      </div>
    </div>
  );
};

// Module Definition
const SecurityModule = {
  manifest: {
    id: 'security',
    name: 'Security',
    version: '1.0.0',
    description: 'Display security status and compliance information',
    author: 'ReportMate',
    enabled: true,
    category: 'security',
    tags: ['security', 'compliance', 'filevault', 'firewall', 'gatekeeper'],
    dependencies: [],
    documentation: 'Shows security status including FileVault, firewall, gatekeeper, and other security features.',
  } as ExtendedModuleManifest,

  configSchema: {
    title: 'Security Module Configuration',
    description: 'Configure how security information is displayed',
    properties: {
      showAdvancedSecurity: {
        type: 'boolean' as const,
        title: 'Show Advanced Security',
        description: 'Display advanced security features and settings',
        default: true,
      },
      highlightRisks: {
        type: 'boolean' as const,
        title: 'Highlight Security Risks',
        description: 'Use color coding to highlight security risks',
        default: true,
      },
      showUserAccess: {
        type: 'boolean' as const,
        title: 'Show User Access',
        description: 'Display user access and permissions information',
        default: true,
      },
    },
  } as ModuleConfigSchema,

  defaultConfig: {
    showAdvancedSecurity: true,
    highlightRisks: true,
    showUserAccess: true,
  },

  deviceWidgets: [
    {
      id: 'security-overview',
      name: 'Security Overview',
      description: 'Quick overview of key security features',
      component: SecurityOverviewWidget,
      category: 'security' as const,
      size: 'small' as const,
      order: 1,
      conditions: [{
        type: 'has_data' as const,
        field: 'security',
        operator: 'exists' as const,
        value: true,
      }],
      refreshInterval: 300000, // 5 minutes
    },
    {
      id: 'system-security',
      name: 'System Security',
      description: 'System-level security features and settings',
      component: SystemSecurityWidget,
      category: 'security' as const,
      size: 'medium' as const,
      order: 2,
      conditions: [{
        type: 'has_data' as const,
        field: 'security',
        operator: 'exists' as const,
        value: true,
      }],
      refreshInterval: 300000, // 5 minutes
    },
    {
      id: 'user-access',
      name: 'User Access',
      description: 'User access and permissions information',
      component: UserAccessWidget,
      category: 'security' as const,
      size: 'medium' as const,
      order: 3,
      conditions: [{
        type: 'has_data' as const,
        field: 'security',
        operator: 'exists' as const,
        value: true,
      }],
      refreshInterval: 300000, // 5 minutes
    },
    {
      id: 'security-details',
      name: 'Security Details',
      description: 'Comprehensive security status and compliance information',
      component: SecurityDetailsWidget,
      category: 'security' as const,
      size: 'full' as const,
      order: 4,
      conditions: [{
        type: 'has_data' as const,
        field: 'security',
        operator: 'exists' as const,
        value: true,
      }],
      refreshInterval: 300000, // 5 minutes
    },
  ] as DeviceWidget[],

  // Lifecycle hooks
  async onInstall() {
    console.log('SecurityModule installed');
  },

  async onUninstall() {
    console.log('SecurityModule uninstalled');
  },

  async onEnable() {
    console.log('SecurityModule enabled');
  },

  async onDisable() {
    console.log('SecurityModule disabled');
  },

  async onConfigChange(config: any) {
    console.log('SecurityModule config changed:', config);
  },
};

export default SecurityModule;

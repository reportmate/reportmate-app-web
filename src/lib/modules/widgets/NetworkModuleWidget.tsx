import React from 'react';
import { ExtendedModuleManifest, DeviceWidget, DeviceWidgetProps, ModuleConfigSchema } from '../EnhancedModule';

interface NetworkInfo {
  hostname: string;
  connectionType: string;
  ssid?: string | null;
  signalStrength?: string | null;
  service?: string;
  status?: number;
  ethernet?: string;
  clientid?: string;
  ipv4conf?: string;
  ipv4ip?: string;
  ipv4mask?: string;
  ipv4router?: string;
  ipv6conf?: string;
  ipv6ip?: string;
  ipv6prefixlen?: number;
  ipv6router?: string;
  ipv4dns?: string;
  vlans?: string;
  activemtu?: number;
  validmturange?: string;
  currentmedia?: string;
  activemedia?: string;
  searchdomain?: string;
  externalip?: string;
  location?: string;
  airdrop_channel?: string;
  airdrop_supported?: boolean;
  wow_supported?: boolean;
  supported_channels?: string;
  supported_phymodes?: string;
  wireless_card_type?: string;
  country_code?: string;
  firmware_version?: string;
  wireless_locale?: string;
}

// Network Overview Widget
const NetworkOverviewWidget: React.FC<DeviceWidgetProps> = ({ device }) => {
  const network = device?.network as NetworkInfo | undefined;
  const ipAddress = device?.ipAddress;
  const macAddress = device?.macAddress;

  if (!network && !ipAddress && !macAddress) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">No Network Data</h3>
        <p className="text-xs text-gray-600 dark:text-gray-400">Network information not available</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 gap-4">
        <div className="text-center">
          <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mb-1">
            {network?.connectionType || 'Unknown'}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Connection Type</div>
        </div>
        
        {ipAddress && (
          <div className="text-center">
            <div className="text-sm font-bold text-gray-900 dark:text-white mb-1 font-mono">
              {ipAddress}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">IP Address</div>
          </div>
        )}
        
        {macAddress && (
          <div className="text-center">
            <div className="text-sm font-bold text-gray-900 dark:text-white mb-1 font-mono">
              {macAddress}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">MAC Address</div>
          </div>
        )}
      </div>
    </div>
  );
};

// Network Details Widget
const NetworkDetailsWidget: React.FC<DeviceWidgetProps> = ({ device }) => {
  const network = device?.network as NetworkInfo | undefined;

  if (!network) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Network Data</h3>
        <p className="text-gray-600 dark:text-gray-400">Network information is not available for this device.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Basic Network Info */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Basic Information</h3>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Hostname</label>
            <p className="text-gray-900 dark:text-white font-mono">{network.hostname}</p>
          </div>
          {network.service && (
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Service</label>
              <p className="text-gray-900 dark:text-white">{network.service}</p>
            </div>
          )}
          {network.ethernet && (
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Interface</label>
              <p className="text-gray-900 dark:text-white font-mono">{network.ethernet}</p>
            </div>
          )}
          {network.clientid && (
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Client ID</label>
              <p className="text-gray-900 dark:text-white font-mono">{network.clientid}</p>
            </div>
          )}
        </div>
      </div>
      
      {/* IPv4 Configuration */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">IPv4 Configuration</h3>
        </div>
        <div className="p-6 space-y-4">
          {network.ipv4conf && (
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Configuration</label>
              <p className="text-gray-900 dark:text-white">{network.ipv4conf}</p>
            </div>
          )}
          {network.ipv4ip && (
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">IP Address</label>
              <p className="text-gray-900 dark:text-white font-mono">{network.ipv4ip}</p>
            </div>
          )}
          {network.ipv4mask && (
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Subnet Mask</label>
              <p className="text-gray-900 dark:text-white font-mono">{network.ipv4mask}</p>
            </div>
          )}
          {network.ipv4router && (
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Router</label>
              <p className="text-gray-900 dark:text-white font-mono">{network.ipv4router}</p>
            </div>
          )}
          {network.ipv4dns && (
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">DNS Servers</label>
              <p className="text-gray-900 dark:text-white font-mono">{network.ipv4dns}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Wireless Details Widget
const WirelessDetailsWidget: React.FC<DeviceWidgetProps> = ({ device }) => {
  const network = device?.network as NetworkInfo | undefined;

  if (!network || (!network.ssid && !network.wireless_card_type)) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
          </svg>
        </div>
        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">No Wireless Data</h3>
        <p className="text-xs text-gray-600 dark:text-gray-400">Wireless information not available</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {network.ssid && (
        <div>
          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Network Name (SSID)</label>
          <p className="text-gray-900 dark:text-white font-semibold">{network.ssid}</p>
        </div>
      )}
      {network.signalStrength && (
        <div>
          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Signal Strength</label>
          <p className="text-gray-900 dark:text-white">{network.signalStrength}</p>
        </div>
      )}
      {network.wireless_card_type && (
        <div>
          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Wireless Card</label>
          <p className="text-gray-900 dark:text-white">{network.wireless_card_type}</p>
        </div>
      )}
      {network.country_code && (
        <div>
          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Country Code</label>
          <p className="text-gray-900 dark:text-white">{network.country_code}</p>
        </div>
      )}
      {network.firmware_version && (
        <div>
          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Firmware Version</label>
          <p className="text-gray-900 dark:text-white font-mono">{network.firmware_version}</p>
        </div>
      )}
    </div>
  );
};

// Module Definition
const NetworkModule = {
  manifest: {
    id: 'network',
    name: 'Network',
    version: '1.0.0',
    description: 'Display network configuration and connectivity information',
    author: 'ReportMate',
    enabled: true,
    category: 'device',
    tags: ['network', 'connectivity', 'ip', 'wireless'],
    dependencies: [],
    documentation: 'Shows network configuration including IP addresses, wireless settings, and network interfaces.',
  } as ExtendedModuleManifest,

  configSchema: {
    title: 'Network Module Configuration',
    description: 'Configure how network information is displayed',
    properties: {
      showWirelessDetails: {
        type: 'boolean' as const,
        title: 'Show Wireless Details',
        description: 'Display detailed wireless network information',
        default: true,
      },
      showIPv6: {
        type: 'boolean' as const,
        title: 'Show IPv6 Information',
        description: 'Display IPv6 configuration details',
        default: true,
      },
      hideInternalIPs: {
        type: 'boolean' as const,
        title: 'Hide Internal IPs',
        description: 'Hide internal/private IP addresses',
        default: false,
      },
    },
  } as ModuleConfigSchema,

  defaultConfig: {
    showWirelessDetails: true,
    showIPv6: true,
    hideInternalIPs: false,
  },

  deviceWidgets: [
    {
      id: 'network-overview',
      name: 'Network Overview',
      description: 'Quick overview of network connectivity',
      component: NetworkOverviewWidget,
      category: 'network' as const,
      size: 'small' as const,
      order: 1,
      conditions: [{
        type: 'device_type' as const,
        field: 'type',
        operator: 'neq' as const,
        value: 'server', // Show for all devices except servers
      }],
      refreshInterval: 60000, // 1 minute
    },
    {
      id: 'network-details',
      name: 'Network Details',
      description: 'Detailed network configuration and interfaces',
      component: NetworkDetailsWidget,
      category: 'network' as const,
      size: 'large' as const,
      order: 2,
      conditions: [{
        type: 'has_data' as const,
        field: 'network',
        operator: 'exists' as const,
        value: true,
      }],
      refreshInterval: 300000, // 5 minutes
    },
    {
      id: 'wireless-details',
      name: 'Wireless Details',
      description: 'Wireless network configuration and signal information',
      component: WirelessDetailsWidget,
      category: 'network' as const,
      size: 'medium' as const,
      order: 3,
      conditions: [{
        type: 'has_data' as const,
        field: 'network.ssid',
        operator: 'exists' as const,
        value: true,
      }],
      refreshInterval: 30000, // 30 seconds
    },
  ] as DeviceWidget[],

  // Lifecycle hooks
  async onInstall() {
    console.log('NetworkModule installed');
  },

  async onUninstall() {
    console.log('NetworkModule uninstalled');
  },

  async onEnable() {
    console.log('NetworkModule enabled');
  },

  async onDisable() {
    console.log('NetworkModule disabled');
  },

  async onConfigChange(config: any) {
    console.log('NetworkModule config changed:', config);
  },
};

export default NetworkModule;

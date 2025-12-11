import React from 'react';

interface NetworkData {
  hostname?: string;
  connectionType?: string;
  ssid?: string | null;
  signalStrength?: string | number | null;
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

interface NetworkTableProps {
  data: NetworkData;
}

export const NetworkTable: React.FC<NetworkTableProps> = ({ data }) => {
  if (!data) {
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
    <div className="space-y-8">
      {/* Network Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Network Configuration</h2>
            <p className="text-gray-600 dark:text-gray-400">Connectivity and configuration details</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mb-1">
              {data.connectionType}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Connection Type</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1 font-mono">
              {data.ipv4ip || 'N/A'}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">IPv4 Address</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {data.hostname}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Hostname</div>
          </div>
        </div>
      </div>
      
      {/* Detailed Network Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Network Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Inventory</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Hostname</span>
              <span className="text-sm text-gray-900 dark:text-white font-mono">{data.hostname}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Service</span>
              <span className="text-sm text-gray-900 dark:text-white">{data.service || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Status</span>
              <span className="text-sm text-gray-900 dark:text-white">{data.status || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Current Media</span>
              <span className="text-sm text-gray-900 dark:text-white">{data.currentmedia || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Media</span>
              <span className="text-sm text-gray-900 dark:text-white">{data.activemedia || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* IP Configuration */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">IP Configuration</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">IPv4 Config</span>
              <span className="text-sm text-gray-900 dark:text-white">{data.ipv4conf || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">IPv4 Address</span>
              <span className="text-sm text-gray-900 dark:text-white font-mono">{data.ipv4ip || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">IPv4 Mask</span>
              <span className="text-sm text-gray-900 dark:text-white font-mono">{data.ipv4mask || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">IPv4 Router</span>
              <span className="text-sm text-gray-900 dark:text-white font-mono">{data.ipv4router || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">DNS</span>
              <span className="text-sm text-gray-900 dark:text-white font-mono">{data.ipv4dns || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Wireless Information */}
        {data.ssid && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Wireless Information</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">SSID</span>
                <span className="text-sm text-gray-900 dark:text-white">{data.ssid}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Signal Strength</span>
                <span className="text-sm text-gray-900 dark:text-white">{data.signalStrength || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Card Type</span>
                <span className="text-sm text-gray-900 dark:text-white">{data.wireless_card_type || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Country Code</span>
                <span className="text-sm text-gray-900 dark:text-white">{data.country_code || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Firmware Version</span>
                <span className="text-sm text-gray-900 dark:text-white">{data.firmware_version || 'N/A'}</span>
              </div>
            </div>
          </div>
        )}

        {/* IPv6 Configuration */}
        {data.ipv6conf && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">IPv6 Configuration</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">IPv6 Config</span>
                <span className="text-sm text-gray-900 dark:text-white">{data.ipv6conf}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">IPv6 Address</span>
                <span className="text-sm text-gray-900 dark:text-white font-mono">{data.ipv6ip || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">IPv6 Prefix Length</span>
                <span className="text-sm text-gray-900 dark:text-white">{data.ipv6prefixlen || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">IPv6 Router</span>
                <span className="text-sm text-gray-900 dark:text-white font-mono">{data.ipv6router || 'N/A'}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

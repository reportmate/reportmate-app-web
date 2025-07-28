import { formatExactTime } from '../../time'
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
  // VPN Properties
  vpnConnections?: VpnConnection[];
  // Active connection information
  activeConnection?: {
    connectionType?: string;
    interfaceName?: string;
    friendlyName?: string;
    ipAddress?: string;
    gateway?: string;
    activeWifiSsid?: string;
    wifiSignalStrength?: number;
    isVpnActive?: boolean;
    vpnName?: string;
  };
}

interface VpnConnection {
  name: string;
  type: string; // L2TP, PPTP, SSTP, IKEv2, OpenVPN, WireGuard, Cisco AnyConnect, etc.
  status: string; // Connected, Disconnected, Connecting, Error
  server?: string;
  serverAddress?: string;
  localAddress?: string;
  gateway?: string;
  dnsServers?: string[];
  authentication?: string;
  encryption?: string;
  encryptionLevel?: string;
  protocol?: string;
  isActive: boolean;
  connectedAt?: string;
  bytesSent?: number;
  bytesReceived?: number;
  splitTunneling?: boolean;
  clientVersion?: string;
  autoConnect?: boolean;
  compressionEnabled?: boolean;
  mtu?: number;
  remoteNetworks?: string[];
  excludedRoutes?: string[];
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

  // Use active connection info if available, fall back to legacy fields
  const connectionType = network?.activeConnection?.connectionType || network?.connectionType || 'Unknown';
  const activeIpAddress = network?.activeConnection?.ipAddress || ipAddress;
  const wifiInfo = network?.activeConnection?.activeWifiSsid;
  const isVpnActive = network?.activeConnection?.isVpnActive;
  
  // Get MAC address from the active interface
  const activeInterfaceName = network?.activeConnection?.interfaceName;
  const activeInterface = device?.modules?.network?.interfaces?.find((iface: any) => 
    iface.name === activeInterfaceName || iface.isActive
  );
  const activeMacAddress = activeInterface?.macAddress || macAddress;

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 gap-4">
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            {connectionType === 'Wireless' && (
              <svg className="w-5 h-5 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.07 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/>
              </svg>
            )}
            {connectionType === 'Wired' && (
              <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M7 20h4c0 1.1-.9 2-2 2s-2-.9-2-2zm2.8-2h8.2c.44 0 .8-.36.8-.8v-7.6c0-.44-.36-.8-.8-.8h-8.2c-.44 0-.8.36-.8.8v7.6c0 .44.36.8.8.8z"/>
              </svg>
            )}
            <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
              {connectionType}
            </div>
            {isVpnActive && (
              <svg className="w-4 h-4 text-blue-500 ml-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17,7H22V17H17V19A1,1 0 0,0 18,20H20V22H18A3,3 0 0,1 15,19V17H9V19A1,1 0 0,0 10,20H12V22H10A3,3 0 0,1 7,19V17H2V7H7V5A3,3 0 0,1 10,2H12V4H10A1,1 0 0,0 9,5V7H15V5A1,1 0 0,0 14,4H12V2H14A3,3 0 0,1 17,5V7Z"/>
              </svg>
            )}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Connection Type</div>
          {wifiInfo && (
            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">{wifiInfo}</div>
          )}
        </div>
        
        {activeIpAddress && (
          <div className="text-center">
            <div className="text-sm font-bold text-gray-900 dark:text-white mb-1 font-mono">
              {activeIpAddress}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">IP Address</div>
          </div>
        )}
        
        {activeMacAddress && (
          <div className="text-center">
            <div className="text-sm font-bold text-gray-900 dark:text-white mb-1 font-mono">
              {activeMacAddress}
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
      {/* Active Connection Status */}
      {network.activeConnection && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Active Connection</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Connection Type</label>
                <div className="flex items-center mt-1">
                  {network.activeConnection.connectionType === 'Wireless' && (
                    <svg className="w-4 h-4 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.07 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/>
                    </svg>
                  )}
                  {network.activeConnection.connectionType === 'Wired' && (
                    <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M7 20h4c0 1.1-.9 2-2 2s-2-.9-2-2zm2.8-2h8.2c.44 0 .8-.36.8-.8v-7.6c0-.44-.36-.8-.8-.8h-8.2c-.44 0-.8.36-.8.8v7.6c0 .44.36.8.8.8z"/>
                    </svg>
                  )}
                  <p className="text-gray-900 dark:text-white font-medium">{network.activeConnection.connectionType}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Interface</label>
                <p className="text-gray-900 dark:text-white font-mono">{network.activeConnection.friendlyName || network.activeConnection.interfaceName}</p>
              </div>
            </div>

            {network.activeConnection.activeWifiSsid && (
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">WiFi Network</label>
                <div className="flex items-center justify-between">
                  <p className="text-gray-900 dark:text-white">{network.activeConnection.activeWifiSsid}</p>
                  {network.activeConnection.wifiSignalStrength && (
                    <span className="text-sm text-gray-500">Signal: {network.activeConnection.wifiSignalStrength}%</span>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">IP Address</label>
                <p className="text-gray-900 dark:text-white font-mono">{network.activeConnection.ipAddress || network.ipv4ip}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Gateway</label>
                <p className="text-gray-900 dark:text-white font-mono">{network.activeConnection.gateway || network.ipv4router}</p>
              </div>
            </div>

            {/* MAC Address row */}
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">MAC Address</label>
              <p className="text-gray-900 dark:text-white font-mono">
                {(() => {
                  // Get MAC address from the active interface
                  const activeInterfaceName = network.activeConnection.interfaceName;
                  const activeInterface = device?.modules?.network?.interfaces?.find((iface: any) => 
                    iface.name === activeInterfaceName || iface.isActive
                  );
                  return activeInterface?.macAddress || device.macAddress || 'N/A';
                })()}
              </p>
            </div>

            {network.activeConnection.isVpnActive && network.activeConnection.vpnName && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17,7H22V17H17V19A1,1 0 0,0 18,20H20V22H18A3,3 0 0,1 15,19V17H9V19A1,1 0 0,0 10,20H12V22H10A3,3 0 0,1 7,19V17H2V7H7V5A3,3 0 0,1 10,2H12V4H10A1,1 0 0,0 9,5V7H15V5A1,1 0 0,0 14,4H12V2H14A3,3 0 0,1 17,5V7Z"/>
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">VPN Active</p>
                    <p className="text-xs text-blue-700 dark:text-blue-300">{network.activeConnection.vpnName}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}



      {/* Basic Network Info */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Network Details</h3>
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
          <p className="text-gray-900 dark:text-white font-semibold">{normalizeUnicodeString(network.ssid)}</p>
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

// VPN Overview Widget
const VpnOverviewWidget: React.FC<DeviceWidgetProps> = ({ device }) => {
  const network = device?.network as NetworkInfo | undefined;
  const vpnConnections = network?.vpnConnections || [];

  if (!vpnConnections.length) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">No VPN Connections</h3>
        <p className="text-xs text-gray-600 dark:text-gray-400">No VPN connections are configured on this device</p>
      </div>
    );
  }

  const activeConnections = vpnConnections.filter(vpn => vpn.isActive);
  const totalConnections = vpnConnections.length;

  return (
    <div className="space-y-4">
      {/* Status Summary */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3">
          <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mb-1">
            {totalConnections}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Total VPNs</div>
        </div>
        
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
          <div className="text-lg font-bold text-green-600 dark:text-green-400 mb-1">
            {activeConnections.length}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Active</div>
        </div>
        
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
          <div className="text-lg font-bold text-red-600 dark:text-red-400 mb-1">
            {totalConnections - activeConnections.length}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Inactive</div>
        </div>
      </div>

      {/* Active Connections List */}
      {activeConnections.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">Active Connections</h4>
          {activeConnections.map((vpn, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div>
                <div className="font-medium text-green-900 dark:text-green-100">{vpn.name}</div>
                <div className="text-sm text-green-700 dark:text-green-300">{vpn.type} • {vpn.server || vpn.serverAddress}</div>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span className="text-sm font-medium text-green-700 dark:text-green-300">Connected</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// VPN Details Widget  
const VpnDetailsWidget: React.FC<DeviceWidgetProps> = ({ device }) => {
  const network = device?.network as NetworkInfo | undefined;
  const vpnConnections = network?.vpnConnections || [];

  if (!vpnConnections.length) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No VPN Connections</h3>
        <p className="text-gray-600 dark:text-gray-400">No VPN connections are configured on this device.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {vpnConnections.map((vpn, index) => (
        <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{vpn.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{vpn.type}</p>
              </div>
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${
                  vpn.isActive ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  vpn.isActive 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}>
                  {vpn.status}
                </span>
              </div>
            </div>
          </div>
          
          <div className="p-6 space-y-4">
            {/* Connection Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(vpn.server || vpn.serverAddress) && (
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Server Address</label>
                  <p className="text-gray-900 dark:text-white font-mono">{vpn.server || vpn.serverAddress}</p>
                </div>
              )}
              
              {vpn.localAddress && (
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Local Address</label>
                  <p className="text-gray-900 dark:text-white font-mono">{vpn.localAddress}</p>
                </div>
              )}
              
              {vpn.gateway && (
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Gateway</label>
                  <p className="text-gray-900 dark:text-white font-mono">{vpn.gateway}</p>
                </div>
              )}
              
              {vpn.protocol && (
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Protocol</label>
                  <p className="text-gray-900 dark:text-white">{vpn.protocol}</p>
                </div>
              )}
            </div>

            {/* Security Details */}
            {(vpn.authentication || vpn.encryption || vpn.encryptionLevel) && (
              <div>
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">Security</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {vpn.authentication && (
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Authentication</label>
                      <p className="text-gray-900 dark:text-white">{vpn.authentication}</p>
                    </div>
                  )}
                  
                  {(vpn.encryption || vpn.encryptionLevel) && (
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Encryption</label>
                      <p className="text-gray-900 dark:text-white">{vpn.encryption || vpn.encryptionLevel}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Configuration Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vpn.splitTunneling !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Split Tunneling</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    vpn.splitTunneling 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                  }`}>
                    {vpn.splitTunneling ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              )}

              {vpn.autoConnect !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Auto Connect</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    vpn.autoConnect 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                  }`}>
                    {vpn.autoConnect ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              )}

              {vpn.compressionEnabled !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Compression</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    vpn.compressionEnabled 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                  }`}>
                    {vpn.compressionEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              )}

              {vpn.mtu && (
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">MTU</label>
                  <p className="text-gray-900 dark:text-white">{vpn.mtu}</p>
                </div>
              )}
            </div>

            {/* DNS Servers */}
            {vpn.dnsServers && vpn.dnsServers.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">DNS Servers</label>
                <div className="mt-1 space-y-1">
                  {vpn.dnsServers.map((dns, dnsIndex) => (
                    <p key={dnsIndex} className="text-gray-900 dark:text-white font-mono text-sm">{dns}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Network Routes */}
            {vpn.remoteNetworks && vpn.remoteNetworks.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Remote Networks</label>
                <div className="mt-1 space-y-1">
                  {vpn.remoteNetworks.map((network, netIndex) => (
                    <p key={netIndex} className="text-gray-900 dark:text-white font-mono text-sm">{network}</p>
                  ))}
                </div>
              </div>
            )}

            {vpn.excludedRoutes && vpn.excludedRoutes.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Excluded Routes</label>
                <div className="mt-1 space-y-1">
                  {vpn.excludedRoutes.map((route, routeIndex) => (
                    <p key={routeIndex} className="text-gray-900 dark:text-white font-mono text-sm">{route}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Statistics */}
            {(vpn.bytesSent || vpn.bytesReceived || vpn.connectedAt) && (
              <div>
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">Statistics</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {vpn.connectedAt && (
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Connected Since</label>
                      <p className="text-gray-900 dark:text-white">{formatExactTime(vpn.connectedAt)}</p>
                    </div>
                  )}
                  
                  {vpn.bytesSent && (
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Bytes Sent</label>
                      <p className="text-gray-900 dark:text-white">{formatDataTransfer(vpn.bytesSent)}</p>
                    </div>
                  )}
                  
                  {vpn.bytesReceived && (
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Bytes Received</label>
                      <p className="text-gray-900 dark:text-white">{formatDataTransfer(vpn.bytesReceived)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Client Information */}
            {vpn.clientVersion && (
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Client Version</label>
                <p className="text-gray-900 dark:text-white">{vpn.clientVersion}</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// VPN Security Widget
const VpnSecurityWidget: React.FC<DeviceWidgetProps> = ({ device }) => {
  const network = device?.network as NetworkInfo | undefined;
  const vpnConnections = network?.vpnConnections || [];
  const activeVpns = vpnConnections.filter(vpn => vpn.isActive);

  if (!activeVpns.length) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">No Active VPN Security</h3>
        <p className="text-xs text-gray-600 dark:text-gray-400">No active VPN connections to analyze</p>
      </div>
    );
  }

  // Analyze security levels
  const securityAnalysis = activeVpns.map(vpn => {
    let securityScore = 0;
    let issues: string[] = [];
    let strengths: string[] = [];

    // Protocol security scoring
    if (vpn.type) {
      switch (vpn.type.toLowerCase()) {
        case 'ikev2':
        case 'wireguard':
          securityScore += 25;
          strengths.push('Strong protocol');
          break;
        case 'openvpn':
        case 'sstp':
          securityScore += 20;
          strengths.push('Good protocol');
          break;
        case 'l2tp':
          securityScore += 15;
          break;
        case 'pptp':
          securityScore += 5;
          issues.push('PPTP is outdated and insecure');
          break;
      }
    }

    // Encryption scoring
    if (vpn.encryption || vpn.encryptionLevel) {
      const encryption = (vpn.encryption || vpn.encryptionLevel || '').toLowerCase();
      if (encryption.includes('aes-256') || encryption.includes('256') || encryption.includes('chacha20poly1305')) {
        securityScore += 25;
        strengths.push('Maximum encryption (AES-256/ChaCha20)');
      } else if (encryption.includes('aes-128') || encryption.includes('128') || encryption.includes('gcm')) {
        securityScore += 20;
        strengths.push('Good encryption (AES-128)');
      } else if (encryption.includes('aes')) {
        securityScore += 15;
        strengths.push('Standard encryption');
      } else if (encryption.includes('mppe-128')) {
        securityScore += 8;
        issues.push('MPPE-128 encryption is weak');
      } else if (encryption !== 'none' && encryption !== '') {
        securityScore += 10;
      } else {
        issues.push('Weak or no encryption');
      }
    }

    // Authentication scoring
    if (vpn.authentication) {
      const auth = vpn.authentication.toLowerCase();
      if (auth.includes('certificate') || auth.includes('rsa-2048') || auth.includes('curve25519') || auth.includes('public key')) {
        securityScore += 25;
        strengths.push('Certificate/Public Key authentication');
      } else if (auth.includes('rsa') || auth.includes('ecc') || auth.includes('certificate')) {
        securityScore += 20;
        strengths.push('Certificate authentication');
      } else if (auth.includes('psk') || auth.includes('pre-shared')) {
        securityScore += 15;
        strengths.push('Pre-shared key authentication');
      } else if (auth.includes('ms-chap') || auth.includes('chap')) {
        securityScore += 8;
        issues.push('MS-CHAP authentication has known vulnerabilities');
      } else if (auth.includes('password') || auth.includes('pap')) {
        securityScore += 5;
        issues.push('Password-based authentication is less secure');
      }
    }

    // Split tunneling analysis
    if (vpn.splitTunneling) {
      issues.push('Split tunneling may expose some traffic');
    } else {
      strengths.push('Full tunnel protection');
      securityScore += 10;
    }

    // DNS security
    if (vpn.dnsServers && vpn.dnsServers.length > 0) {
      strengths.push('Custom DNS servers');
      securityScore += 15;
    }

    // Protocol-specific vulnerability checks
    if (vpn.type?.toLowerCase() === 'l2tp' && vpn.protocol?.toLowerCase().includes('ipsec')) {
      strengths.push('L2TP over IPsec');
      securityScore += 5; // Bonus for IPsec wrapper
    } else if (vpn.type?.toLowerCase() === 'l2tp') {
      issues.push('L2TP without IPsec has vulnerabilities');
    }

    // MTU analysis for performance/security balance
    if (vpn.mtu && vpn.mtu < 1200) {
      issues.push('Low MTU may indicate network restrictions');
    } else if (vpn.mtu && vpn.mtu >= 1400) {
      strengths.push('Optimal MTU configuration');
      securityScore += 5;
    }

    return {
      vpn,
      securityScore: Math.min(securityScore, 100),
      issues,
      strengths
    };
  });

  return (
    <div className="space-y-6">
      {securityAnalysis.map((analysis, index) => (
        <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{analysis.vpn.name}</h3>
              <div className="flex items-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-sm font-bold ${
                  analysis.securityScore >= 80 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : analysis.securityScore >= 60
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}>
                  {analysis.securityScore}
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-6 space-y-4">
            {/* Security Strengths */}
            {analysis.strengths.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">Security Strengths</h4>
                <div className="space-y-1">
                  {analysis.strengths.map((strength, strengthIndex) => (
                    <div key={strengthIndex} className="flex items-center text-sm text-green-700 dark:text-green-300">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {strength}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Security Issues */}
            {analysis.issues.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-red-900 dark:text-red-100 mb-2">Security Concerns</h4>
                <div className="space-y-1">
                  {analysis.issues.map((issue, issueIndex) => (
                    <div key={issueIndex} className="flex items-center text-sm text-red-700 dark:text-red-300">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {issue}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Technical Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Protocol</label>
                <p className="text-gray-900 dark:text-white">{analysis.vpn.type}</p>
              </div>
              
              {(analysis.vpn.encryption || analysis.vpn.encryptionLevel) && (
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Encryption</label>
                  <p className="text-gray-900 dark:text-white">{analysis.vpn.encryption || analysis.vpn.encryptionLevel}</p>
                </div>
              )}
              
              {analysis.vpn.authentication && (
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Authentication</label>
                  <p className="text-gray-900 dark:text-white">{analysis.vpn.authentication}</p>
                </div>
              )}
              
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Split Tunneling</label>
                <p className="text-gray-900 dark:text-white">{analysis.vpn.splitTunneling ? 'Enabled' : 'Disabled'}</p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Helper function to format data transfer amounts
const formatDataTransfer = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`;
};

// Helper function to normalize Unicode strings for display
const normalizeUnicodeString = (str: string): string => {
  if (!str) return str;
  
  try {
    // Handle escaped Unicode sequences like \u0393 (Greek letters)
    if (str.includes('\\u')) {
      // Simple regex to handle basic Unicode escapes
      return str.replace(/\\u([0-9A-Fa-f]{4})/g, (match, code) => {
        return String.fromCharCode(parseInt(code, 16));
      });
    }
    
    return str;
  } catch (error) {
    console.warn('Failed to normalize Unicode string:', str, error);
    return str; // Return original if normalization fails
  }
};

// Module Definition
const NetworkModule = {
  manifest: {
    id: 'network',
    name: 'Network',
    version: '1.1.0',
    description: 'Display comprehensive network configuration including connectivity, wireless settings, and VPN connections',
    author: 'ReportMate',
    enabled: true,
    category: 'device',
    tags: ['network', 'connectivity', 'ip', 'wireless', 'vpn', 'security', 'tunneling'],
    dependencies: [],
    documentation: 'Shows comprehensive network configuration including IP addresses, wireless settings, VPN connections, and security analysis.',
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
      showVpnDetails: {
        type: 'boolean' as const,
        title: 'Show VPN Details',
        description: 'Display detailed VPN connection information',
        default: true,
      },
      showVpnSecurity: {
        type: 'boolean' as const,
        title: 'Show VPN Security Analysis',
        description: 'Display security analysis for VPN connections',
        default: true,
      },
      hideDisconnectedVpns: {
        type: 'boolean' as const,
        title: 'Hide Disconnected VPNs',
        description: 'Only show active VPN connections',
        default: false,
      },
      vpnSecurityThreshold: {
        type: 'number' as const,
        title: 'VPN Security Alert Threshold',
        description: 'Show security alerts for VPNs below this score (0-100)',
        default: 60,
        minimum: 0,
        maximum: 100,
      },
    },
  } as ModuleConfigSchema,

  defaultConfig: {
    showWirelessDetails: true,
    showIPv6: true,
    hideInternalIPs: false,
    showVpnDetails: true,
    showVpnSecurity: true,
    hideDisconnectedVpns: false,
    vpnSecurityThreshold: 60,
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
    {
      id: 'vpn-overview',
      name: 'VPN Overview',
      description: 'Overview of VPN connections and status',
      component: VpnOverviewWidget,
      category: 'vpn' as const,
      size: 'small' as const,
      order: 4,
      conditions: [{
        type: 'has_data' as const,
        field: 'network.vpnConnections',
        operator: 'exists' as const,
        value: true,
      }],
      refreshInterval: 60000, // 1 minute
    },
    {
      id: 'vpn-details',
      name: 'VPN Details',
      description: 'Detailed information about VPN connections',
      component: VpnDetailsWidget,
      category: 'vpn' as const,
      size: 'large' as const,
      order: 5,
      conditions: [{
        type: 'has_data' as const,
        field: 'network.vpnConnections',
        operator: 'exists' as const,
        value: true,
      }],
      refreshInterval: 300000, // 5 minutes
    },
    {
      id: 'vpn-security',
      name: 'VPN Security',
      description: 'Security analysis of VPN connections',
      component: VpnSecurityWidget,
      category: 'vpn' as const,
      size: 'medium' as const,
      order: 6,
      conditions: [{
        type: 'has_data' as const,
        field: 'network.vpnConnections',
        operator: 'exists' as const,
        value: true,
      }],
      refreshInterval: 300000, // 5 minutes
    },
  ] as DeviceWidget[],

  // Lifecycle hooks
  async onInstall() {
    // Module installed
  },

  async onUninstall() {
    // Module uninstalled
  },

  async onEnable() {
    // Module enabled
  },

  async onDisable() {
    // Module disabled
  },

  async onConfigChange(config: any) {
    // Module configuration changed
  },
};

export default NetworkModule;

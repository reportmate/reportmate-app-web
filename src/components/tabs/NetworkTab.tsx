/**
 * Network Tab Component - Fresh Redesign
 * Active connections as prominent cards on left, secondary info on right
 */

import React, { useState } from 'react'
import { extractNetwork } from '../../lib/data-processing/modules/network'
import { normalizeKeys } from '../../lib/utils/powershell-parser'

interface NetworkTabProps {
  device: any
  data?: any
  isLoading?: boolean
}

// Copyable value with inline copy button
const CopyableValue: React.FC<{ 
  value: string | undefined | null, 
  className?: string,
  mono?: boolean
}> = ({ value, className = "", mono = true }) => {
  const [copied, setCopied] = useState(false)

  if (!value) return <span className="text-gray-400 dark:text-gray-500">—</span>

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (err) {
      console.error('Copy failed:', err)
    }
  }

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className={mono ? 'font-mono' : ''}>{value}</span>
      <button
        onClick={handleCopy}
        className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        title={copied ? 'Copied!' : 'Copy'}
      >
        {copied ? (
          <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </button>
    </span>
  )
}

// Single info row in the card
const InfoRow: React.FC<{ label: string; value: React.ReactNode; mono?: boolean }> = ({ label, value, mono = false }) => {
  // Don't render row if no value
  if (!value) return null
  
  return (
    <div className="grid grid-cols-[140px_1fr] gap-4 py-1.5 border-b border-gray-100 dark:border-gray-700/50 last:border-0">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className={`text-sm font-medium text-gray-900 dark:text-white ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  )
}

// Active Connection Card - the main display for each active interface
const ActiveConnectionCard: React.FC<{ 
  iface: any
  connectionType: string
  isWiFi: boolean
  wifiData?: any
  dnsServers?: string[]
}> = ({ iface, connectionType, isWiFi, wifiData, dnsServers }) => {
  // Determine icon and colors based on type
  const bgColor = 'bg-white dark:bg-gray-800'
  const borderColor = 'border-gray-200 dark:border-gray-700'
  const iconBg = isWiFi ? 'bg-blue-100 dark:bg-blue-900' : 'bg-emerald-100 dark:bg-emerald-900'
  const iconColor = isWiFi ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400'
  const accentColor = isWiFi ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400'

  // Get IPv4 address
  const getIPv4 = (ipAddress: string | string[] | undefined): string | null => {
    if (!ipAddress) return null
    const ips = Array.isArray(ipAddress) ? ipAddress : [ipAddress]
    return ips.find(ip => /^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) || null
  }

  const ipv4 = getIPv4(iface.ipAddress) || getIPv4(iface.ipAddresses)

  return (
    <div className={`${bgColor} rounded-xl border ${borderColor} overflow-hidden`}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-200/50 dark:border-gray-700/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 ${iconBg} rounded-lg flex items-center justify-center`}>
            {isWiFi ? (
              <svg className={`w-5 h-5 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
              </svg>
            ) : (
              <svg className={`w-5 h-5 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h16M7 4v3M7 17v3M17 4v3M17 17v3" />
              </svg>
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {isWiFi ? 'Wireless' : 'Ethernet'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {iface.name}
              {iface.friendlyName && iface.friendlyName !== iface.name && ` • ${iface.friendlyName}`}
            </p>
          </div>
        </div>
        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
          <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
          Connected
        </span>
      </div>

      {/* Body */}
      <div className="p-5">
        {isWiFi ? (
          // WiFi card - two columns with WiFi-specific info
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0">
            <div>
              <InfoRow label="IP Address" value={ipv4 ? <CopyableValue value={ipv4} /> : null} />
              <InfoRow label="MAC Address" value={iface.macAddress ? <CopyableValue value={iface.macAddress} /> : null} />
              {dnsServers && dnsServers.map((dns, idx) => (
                <InfoRow 
                  key={idx} 
                  label={idx === 0 ? "DNS Server" : ""} 
                  value={dns} 
                />
              ))}
              <InfoRow label="Link Speed" value={iface.linkSpeed} />
            </div>
            <div>
              <InfoRow label="SSID" value={wifiData?.ssid && wifiData.ssid !== '[Location Services Required]' ? wifiData.ssid : null} />
              <InfoRow label="Protocol" value={wifiData?.wifi_version || iface.wirelessProtocol} />
              <InfoRow label="Band" value={wifiData?.channel_band || iface.wirelessBand} />
              <InfoRow label="Channel" value={wifiData?.channel} />
              <InfoRow label="Security" value={wifiData?.security} />
              <InfoRow label="Mode" value={wifiData?.phyMode || wifiData?.phy_mode} />
            </div>
          </div>
        ) : (
          // Ethernet card - two columns
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0">
            <div>
              <InfoRow label="IP Address" value={ipv4 ? <CopyableValue value={ipv4} /> : null} />
              <InfoRow label="MAC Address" value={iface.macAddress ? <CopyableValue value={iface.macAddress} /> : null} />
              {dnsServers && dnsServers.map((dns, idx) => (
                <InfoRow 
                  key={idx} 
                  label={idx === 0 ? "DNS Server" : ""} 
                  value={dns} 
                />
              ))}
              <InfoRow label="Link Speed" value={iface.linkSpeed} />
              <InfoRow label="Duplex" value={iface.duplex} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export const NetworkTab: React.FC<NetworkTabProps> = ({ device, data, isLoading = false }) => {
  const [showInactive, setShowInactive] = useState(false)
  const [wifiSearch, setWifiSearch] = useState('')
  
  // Process network data
  const rawNetworkModule = data || device?.modules?.network
  const normalizedNetworkModule = rawNetworkModule ? normalizeKeys(rawNetworkModule) as any : null
  const networkData = normalizedNetworkModule 
    ? extractNetwork({ ...device, modules: { ...device?.modules, network: normalizedNetworkModule } }) 
    : extractNetwork(device)

  // Separate active and inactive interfaces
  const interfaces = networkData.interfaces || []
  const activeInterfaces = interfaces.filter((iface: any) => 
    iface.isActive === true || iface.status === 'Active' || iface.status === 'Connected'
  )
  const inactiveInterfaces = interfaces.filter((iface: any) => 
    !(iface.isActive === true || iface.status === 'Active' || iface.status === 'Connected')
  )

  // Sort active interfaces: Ethernet first, then WiFi
  const sortedActiveInterfaces = [...activeInterfaces].sort((a: any, b: any) => {
    const aIsEthernet = a.type?.toLowerCase().includes('ethernet') || a.type?.toLowerCase().includes('wired') || a.name === 'en1'
    const bIsEthernet = b.type?.toLowerCase().includes('ethernet') || b.type?.toLowerCase().includes('wired') || b.name === 'en1'
    if (aIsEthernet && !bIsEthernet) return -1
    if (!aIsEthernet && bIsEthernet) return 1
    return 0
  })

  // Get WiFi data for active WiFi interface (from raw module data)
  const currentWiFi = rawNetworkModule?.currentWiFiNetwork || normalizedNetworkModule?.currentWiFiNetwork

  // Check if VPN is connected
  const connectedVpns = networkData.vpnConnections?.filter((vpn: any) => vpn.status === 'Connected') || []
  const hasConnectedVpn = connectedVpns.length > 0

  // Check if network quality has data
  const hasNetworkQuality = networkData.networkQuality && (
    networkData.networkQuality.downlinkCapacity || 
    networkData.networkQuality.uplinkCapacity || 
    networkData.networkQuality.idleLatency
  )

  // Filter WiFi networks by search
  const filteredWifiNetworks = (networkData.wifiNetworks || []).filter((network: any) => 
    !wifiSearch || network.ssid?.toLowerCase().includes(wifiSearch.toLowerCase())
  )

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          <div>
            <div className="h-7 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
            <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
        <div className="flex gap-6">
          <div className="w-[70%] space-y-4">
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
          </div>
          <div className="w-[30%] space-y-4">
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
            <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Network</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {activeInterfaces.length} active connection{activeInterfaces.length !== 1 ? 's' : ''}
              {hasConnectedVpn && ' • VPN connected'}
            </p>
          </div>
        </div>
        
        {/* Primary Connection - Top Right */}
        {sortedActiveInterfaces.length > 0 && (
          <div className="text-right mr-8">
            <div className="text-sm text-gray-500 dark:text-gray-400">Primary Connection</div>
            <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">
              {(() => {
                const primary = sortedActiveInterfaces[0]
                const isWiFi = primary.type?.toLowerCase().includes('wifi') || 
                              primary.type?.toLowerCase().includes('wireless') ||
                              (primary.name === 'en0' && !primary.type?.toLowerCase().includes('ethernet'))
                return isWiFi ? 'Wireless' : 'Ethernet'
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Local Hostname - Prominent display for Mac */}
      {(networkData.localHostname || rawNetworkModule?.localHostname) && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 pl-6">
          <div className="flex items-center">
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Local Hostname</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                <CopyableValue 
                  value={networkData.localHostname || rawNetworkModule?.localHostname} 
                  className="text-lg"
                  mono={true}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Layout: 70% left / 30% right */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column - 70% - Active Connections */}
        <div className="lg:w-[70%] space-y-4">
          {sortedActiveInterfaces.length > 0 ? (
            sortedActiveInterfaces.map((iface: any, index: number) => {
              const isWiFi = iface.type?.toLowerCase().includes('wifi') || 
                            iface.type?.toLowerCase().includes('wireless') ||
                            (iface.name === 'en0' && !iface.type?.toLowerCase().includes('ethernet'))
              return (
                <ActiveConnectionCard
                  key={iface.name || index}
                  iface={iface}
                  connectionType={iface.type || 'Unknown'}
                  isWiFi={isWiFi}
                  wifiData={isWiFi ? currentWiFi : undefined}
                  dnsServers={networkData.activeDnsServers || iface.dnsServers}
                />
              )
            })
          ) : (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6 text-center">
              <svg className="w-12 h-12 mx-auto text-yellow-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-yellow-800 dark:text-yellow-200 font-medium">No active network connections</p>
            </div>
          )}
        </div>

        {/* Right Column - 30% - VPN, Quality, WiFi Networks, Inactive */}
        <div className="lg:w-[30%] space-y-4">
          {/* VPN Connection - Only shown when connected */}
          {hasConnectedVpn && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <span className="font-semibold text-gray-900 dark:text-white">VPN</span>
              </div>
              <div className="space-y-2">
                {connectedVpns.map((vpn: any, index: number) => (
                  <div 
                    key={vpn.name || index} 
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700/50"
                  >
                    <span className="text-sm font-medium text-gray-900 dark:text-white flex-1">{vpn.name}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{vpn.type || 'IPSec'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Network Quality - Only if data exists */}
          {hasNetworkQuality && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <span className="font-semibold text-gray-900 dark:text-white">Network Quality</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {networkData.networkQuality.downlinkCapacity && (
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Download</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">{networkData.networkQuality.downlinkCapacity}</div>
                  </div>
                )}
                {networkData.networkQuality.uplinkCapacity && (
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Upload</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">{networkData.networkQuality.uplinkCapacity}</div>
                  </div>
                )}
                {networkData.networkQuality.idleLatency && (
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Latency</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">{networkData.networkQuality.idleLatency}</div>
                  </div>
                )}
                {networkData.networkQuality.downlinkResponsiveness && (
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Quality</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {networkData.networkQuality.downlinkResponsiveness}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Saved WiFi Networks - Simple list with search */}
          {networkData.wifiNetworks && networkData.wifiNetworks.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-sky-600 dark:text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                    </svg>
                    <span className="font-semibold text-sm text-gray-900 dark:text-white">Saved WiFi</span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{networkData.wifiNetworks.length}</span>
                </div>
                {/* Search */}
                <div className="relative">
                  <svg className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search networks..."
                    value={wifiSearch}
                    onChange={(e) => setWifiSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-400"
                  />
                </div>
              </div>
              <div className="overflow-y-auto max-h-[200px]">
                {filteredWifiNetworks.length > 0 ? (
                  <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                    {filteredWifiNetworks
                      .sort((a: any, b: any) => (a.ssid || '').localeCompare(b.ssid || ''))
                      .map((network: any, index: number) => (
                        <li key={network.ssid || index} className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <span className="text-sm text-gray-700 dark:text-gray-300">{network.ssid}</span>
                        </li>
                      ))}
                  </ul>
                ) : (
                  <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                    No networks match "{wifiSearch}"
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Inactive Interfaces - Collapsed */}
          {inactiveInterfaces.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-900/30 rounded-xl border border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowInactive(!showInactive)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors rounded-xl"
              >
                <div className="flex items-center gap-2">
                  <svg 
                    className={`w-4 h-4 text-gray-400 transition-transform ${showInactive ? 'rotate-90' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {inactiveInterfaces.length} Inactive
                  </span>
                </div>
              </button>
              
              {showInactive && (
                <div className="px-4 pb-4">
                  <ul className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
                    {inactiveInterfaces.map((iface: any, index: number) => (
                      <li key={iface.name || index} className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500 flex justify-between">
                        <span>{iface.name}</span>
                        <span className="text-xs">{iface.type || ''}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Debug Accordion for API Data */}
      <div className="mt-6">
        <details className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
          <summary className="cursor-pointer px-4 py-3 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Debug API JSON Data</span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              device.modules.network
            </span>
          </summary>
          <div className="border-t border-gray-200 dark:border-gray-700">
            <div className="p-4">
              <div className="flex justify-end gap-2 mb-2">
                <button
                  onClick={() => {
                    const jsonString = JSON.stringify(device?.modules?.network, null, 2)
                    navigator.clipboard.writeText(jsonString)
                  }}
                  className="px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Copy JSON
                </button>
              </div>
              <pre className="p-4 bg-gray-900 dark:bg-black text-gray-100 text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-[600px] overflow-y-auto rounded border border-gray-700">
                {JSON.stringify(device?.modules?.network, null, 2)}
              </pre>
            </div>
          </div>
        </details>
      </div>
    </div>
  )
}

export default NetworkTab

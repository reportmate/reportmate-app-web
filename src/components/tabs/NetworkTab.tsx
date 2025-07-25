/**
 * Network Tab Component
 * Detailed network configuration and connectivity information
 */

import React from 'react'
import { NetworkTable } from '../tables'

interface NetworkTabProps {
  device: any
  data?: any
}

export const NetworkTab: React.FC<NetworkTabProps> = ({ device, data }) => {
  const networkInterfaces = device?.interfaces || []
  const primaryInterface = networkInterfaces[0] || {}
  
  // Enhanced network data from interfaces
  const networkData = data || {
    hostname: device.name || device.hostname || 'Unknown',
    connectionType: primaryInterface.type || 'Ethernet',
    ipv4ip: primaryInterface.address || device.ipAddress,
    ethernet: primaryInterface.mac || device.macAddress,
    ipv4mask: primaryInterface.mask,
    ipv4router: primaryInterface.gateway,
    service: primaryInterface.name,
    status: primaryInterface.status ? 1 : 0,
    activemtu: primaryInterface.mtu,
    currentmedia: primaryInterface.type,
    activemedia: primaryInterface.type,
    clientid: primaryInterface.dhcp_client_id,
    ...device.network
  }

  return (
    <div className="space-y-8">
      {/* Network Interface Summary */}
      {networkInterfaces.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{networkInterfaces.length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Network Interfaces</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {networkInterfaces.filter((iface: any) => iface.status).length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Active Interfaces</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {networkInterfaces.filter((iface: any) => iface.type === 'wireless').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Wireless Adapters</div>
          </div>
        </div>
      )}
      
      {/* Primary Interface Details */}
      <NetworkTable data={networkData} />
      
      {/* Additional Network Interfaces */}
      {networkInterfaces.length > 1 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">All Network Interfaces</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Complete list of network adapters</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Interface</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">IP Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">MAC Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">MTU</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {networkInterfaces.map((iface: any, index: number) => (
                  <tr key={iface.name || index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{iface.name}</div>
                      {iface.friendly_name && iface.friendly_name !== iface.name && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">{iface.friendly_name}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        iface.type === 'wireless' 
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                      }`}>
                        {iface.type || 'ethernet'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        iface.status
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {iface.status ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-white">
                      {iface.address || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-white">
                      {iface.mac || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {iface.mtu || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default NetworkTab

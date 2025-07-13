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
  return (
    <div className="space-y-8">
      <NetworkTable data={data || device.network || {
        hostname: device.name || 'Unknown',
        connectionType: 'Unknown',
        ipv4ip: device.ipAddress,
        ethernet: device.macAddress
      }} />
    </div>
  )
}

export default NetworkTab

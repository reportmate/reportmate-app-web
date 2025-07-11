/**
 * Info Tab Component
 * Device overview with widgets for system information, hardware, security, network, and management
 */

import React from 'react'
import { InformationWidget } from '../widgets/Information'
import { SystemWidget } from '../widgets/System'
import { HardwareWidget } from '../widgets/Hardware'
import { ManagementWidget } from '../widgets/Management'
import { SecurityWidget } from '../widgets/Security'
import { NetworkWidget } from '../widgets/Network'

interface InfoTabProps {
  device: any
}

export const InfoTab: React.FC<InfoTabProps> = ({ device }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {/* Information Widget (Basic device info) */}
      <InformationWidget device={device} />
      
      {/* System (Operating System) Widget */}
      <SystemWidget device={device} />
      
      {/* Hardware Widget */}
      <HardwareWidget device={device} />
      
      {/* Security Widget */}
      <SecurityWidget 
        platform={device.platform || device.os} 
        securityFeatures={device.securityFeatures} 
      />
      
      {/* Network Widget */}
      <NetworkWidget device={device} />
      
      {/* Management Widget */}
      <ManagementWidget device={device} />
    </div>
  )
}

export default InfoTab

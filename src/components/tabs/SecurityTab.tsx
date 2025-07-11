/**
 * Security Tab Component
 * Comprehensive security status and compliance information
 */

import React from 'react'
import { SecurityCard } from '../tables'

interface SecurityTabProps {
  device: any
}

export const SecurityTab: React.FC<SecurityTabProps> = ({ device }) => {
  return (
    <div className="space-y-8">
      <SecurityCard data={device.security || {}} />
    </div>
  )
}

export default SecurityTab

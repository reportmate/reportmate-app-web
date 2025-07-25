/**
 * Printers Widget
 * Displays installed printers and print queue information
 */

import React from 'react'
import { StatBlock, Stat, StatusBadge, EmptyState, Icons, WidgetColors } from './shared'

interface PrinterInfo {
  name: string
  driverName?: string
  portName?: string
  shareName?: string
  location?: string
  comment?: string
  status?: string
  isDefault?: boolean
  isLocal?: boolean
  isShared?: boolean
  isOnline?: boolean
  paperSize?: string
  resolution?: string
}

interface PrintersData {
  totalPrinters: number
  printers: PrinterInfo[]
  defaultPrinter?: PrinterInfo
  activePrintJobs?: number
  recentPrintJobs?: any[]
}

interface Device {
  id: string
  name: string
  // Modular printers data
  printers?: PrintersData
}

interface PrintersWidgetProps {
  device: Device
}

export const PrintersWidget: React.FC<PrintersWidgetProps> = ({ device }) => {
  // Access printers data from modular structure
  const printers = device.printers
  const hasPrintersInfo = printers && printers.printers && printers.printers.length > 0

  if (!hasPrintersInfo) {
    return (
      <StatBlock 
        title="Printers" 
        subtitle="Print devices and queues"
        icon={Icons.printers}
        iconColor={WidgetColors.green}
      >
        <EmptyState message="Printer information not available" />
      </StatBlock>
    )
  }

  const defaultPrinter = printers.printers.find(p => p.isDefault) || printers.printers[0]
  const onlinePrinters = printers.printers.filter(p => p.isOnline).length
  const sharedPrinters = printers.printers.filter(p => p.isShared).length

  return (
    <StatBlock 
      title="Printers" 
      subtitle="Print devices and queues"
      icon={Icons.printers}
      iconColor={WidgetColors.green}
    >
      <Stat label="Total Printers" value={printers.totalPrinters?.toString() || printers.printers.length.toString()} />
      <Stat label="Online Printers" value={onlinePrinters.toString()} />
      
      {sharedPrinters > 0 && (
        <Stat label="Shared Printers" value={sharedPrinters.toString()} />
      )}
      
      {printers.activePrintJobs !== undefined && (
        <Stat label="Active Print Jobs" value={printers.activePrintJobs.toString()} />
      )}
      
      {defaultPrinter && (
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
            Default Printer:
          </div>
          <div className="text-sm text-gray-900 dark:text-gray-100">
            {defaultPrinter.name}
          </div>
          {defaultPrinter.location && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Location: {defaultPrinter.location}
            </div>
          )}
          {defaultPrinter.status && (
            <StatusBadge
              label="Status"
              status={defaultPrinter.status}
              type={defaultPrinter.isOnline ? 'success' : 'error'}
            />
          )}
        </div>
      )}
      
      {printers.printers.length > 1 && (
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
            Other Printers:
          </div>
          {printers.printers.filter(p => !p.isDefault).slice(0, 2).map((printer, index) => (
            <div key={index} className="text-xs text-gray-500 dark:text-gray-400">
              {printer.name} {printer.isOnline ? '(Online)' : '(Offline)'}
            </div>
          ))}
          {printers.printers.length > 3 && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              +{printers.printers.length - 3} more printers
            </div>
          )}
        </div>
      )}
    </StatBlock>
  )
}

export default PrintersWidget

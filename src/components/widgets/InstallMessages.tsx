"use client"

import { useMemo } from 'react'
import Link from 'next/link'
import { aggregateInstallErrors, aggregateInstallWarnings, getMessagesForItem } from '../../hooks/useInstallsData'

interface InstallMessagesWidgetsProps {
  devices: any[]
  maxItems?: number
  onFilter?: (type: 'errors' | 'warnings', message?: string) => void
}

/**
 * Widget displaying aggregated error messages across all devices
 * Similar to MunkiReport's "Munki Errors" panel
 */
export function InstallErrorsWidget({ devices, maxItems = 5, onFilter }: InstallMessagesWidgetsProps) {
  const errors = useMemo(() => aggregateInstallErrors(devices), [devices])
  
  if (errors.length === 0) return null
  
  const totalCount = errors.reduce((sum, e) => sum + e.count, 0)
  
  return (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
      <div 
        className="flex items-center justify-between mb-3 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => onFilter?.('errors')}
        title="Click to filter by errors"
      >
        <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          Errors
        </h3>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
          {totalCount}
        </span>
      </div>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {errors.slice(0, maxItems).map((error, idx) => (
          <div 
            key={idx}
            onClick={() => onFilter?.('errors', error.message)}
            className="flex items-start justify-between gap-2 p-2 bg-white dark:bg-gray-800 rounded border border-red-100 dark:border-red-900/30 hover:border-red-200 dark:hover:border-red-800 transition-colors cursor-pointer"
            title="Click to show devices with this error"
          >
            <p className="text-xs text-gray-700 dark:text-gray-300 flex-1 line-clamp-2" title={error.message}>
              {error.message}
            </p>
            <span className="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-1.5 py-0.5 rounded shrink-0">
              {error.count}
            </span>
          </div>
        ))}
        {errors.length > maxItems && (
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center pt-1">
            +{errors.length - maxItems} more error messages
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * Widget displaying aggregated warning messages across all devices
 * Similar to MunkiReport's "Munki Warnings" panel
 */
export function InstallWarningsWidget({ devices, maxItems = 5, onFilter }: InstallMessagesWidgetsProps) {
  const warnings = useMemo(() => aggregateInstallWarnings(devices), [devices])
  
  if (warnings.length === 0) return null
  
  const totalCount = warnings.reduce((sum, w) => sum + w.count, 0)
  
  return (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
      <div 
        className="flex items-center justify-between mb-3 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => onFilter?.('warnings')}
        title="Click to filter by warnings"
      >
        <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          Warnings
        </h3>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
          {totalCount}
        </span>
      </div>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {warnings.slice(0, maxItems).map((warning, idx) => (
          <div 
            key={idx}
            onClick={() => onFilter?.('warnings', warning.message)}
            className="flex items-start justify-between gap-2 p-2 bg-white dark:bg-gray-800 rounded border border-amber-100 dark:border-amber-900/30 hover:border-amber-200 dark:hover:border-amber-800 transition-colors cursor-pointer"
            title="Click to show devices with this warning"
          >
            <p className="text-xs text-gray-700 dark:text-gray-300 flex-1 line-clamp-2" title={warning.message}>
              {warning.message}
            </p>
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded shrink-0">
              {warning.count}
            </span>
          </div>
        ))}
        {warnings.length > maxItems && (
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center pt-1">
            +{warnings.length - maxItems} more warning messages
          </p>
        )}
      </div>
    </div>
  )
}

interface SelectedItemMessagesProps {
  devices: any[]
  itemName: string
  messageType: 'errors' | 'warnings'
  onClose?: () => void
}

/**
 * Panel displaying error/warning messages for a specific selected item
 * Shown above the filtered table when an item is clicked in the widgets
 */
export function SelectedItemMessages({ devices, itemName, messageType, onClose }: SelectedItemMessagesProps) {
  const messages = useMemo(
    () => getMessagesForItem(devices, itemName, messageType), 
    [devices, itemName, messageType]
  )
  
  if (messages.length === 0) {
    return (
      <div className={`mx-6 mt-4 p-4 rounded-lg border ${
        messageType === 'errors' 
          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
      }`}>
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No {messageType} messages found for &quot;{itemName}&quot;
          </p>
          {onClose && (
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    )
  }
  
  const isError = messageType === 'errors'
  const totalCount = messages.reduce((sum, m) => sum + m.count, 0)
  
  return (
    <div className={`mx-6 mt-4 p-4 rounded-lg border ${
      isError 
        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className={`text-sm font-semibold flex items-center gap-2 ${
          isError ? 'text-red-800 dark:text-red-200' : 'text-amber-800 dark:text-amber-200'
        }`}>
          {isError ? (
            <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          )}
          {isError ? 'Errors' : 'Warnings'} for &quot;{itemName}&quot;
          <span className={`text-xs font-normal px-2 py-0.5 rounded-full ${
            isError 
              ? 'bg-red-100 text-red-700 dark:bg-red-800/50 dark:text-red-300'
              : 'bg-amber-100 text-amber-700 dark:bg-amber-800/50 dark:text-amber-300'
          }`}>
            {totalCount} total
          </span>
        </h4>
        {onClose && (
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            title="Close messages"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {messages.map((msg, idx) => (
          <div 
            key={idx}
            className={`p-3 rounded-lg border ${
              isError
                ? 'bg-white dark:bg-gray-800 border-red-100 dark:border-red-900/50'
                : 'bg-white dark:bg-gray-800 border-amber-100 dark:border-amber-900/50'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <p className={`text-sm flex-1 ${
                isError ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'
              }`}>
                {msg.message}
              </p>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded shrink-0 ${
                isError
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
              }`}>
                {msg.count} device{msg.count !== 1 ? 's' : ''}
              </span>
            </div>
            
            {/* Show affected devices (first 3) */}
            {msg.devices.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {msg.devices.slice(0, 3).map((device, dIdx) => (
                  <Link
                    key={dIdx}
                    href={`/device/${device.serialNumber}#installs`}
                    className="inline-flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded"
                  >
                    {device.deviceName}
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </Link>
                ))}
                {msg.devices.length > 3 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 px-2 py-0.5">
                    +{msg.devices.length - 3} more
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export { aggregateInstallErrors, aggregateInstallWarnings, getMessagesForItem }

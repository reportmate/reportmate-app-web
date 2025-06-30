/**
 * Dashboard Stats Widgets
 * Core statistics widgets for the dashboard overview
 */

import React from 'react'
import Link from 'next/link'

interface StatsWidgetProps {
  value: number
  label: string
  icon: React.ReactNode
  color: 'green' | 'yellow' | 'red' | 'blue'
  href?: string
}

const StatsWidget: React.FC<StatsWidgetProps> = ({ value, label, icon, color, href }) => {
  const colorClasses = {
    green: {
      bg: 'bg-green-100 dark:bg-green-900',
      text: 'text-green-600 dark:text-green-400',
      hover: 'group-hover:text-green-700 dark:group-hover:text-green-300'
    },
    yellow: {
      bg: 'bg-yellow-100 dark:bg-yellow-900', 
      text: 'text-yellow-600 dark:text-yellow-400',
      hover: 'group-hover:text-yellow-700 dark:group-hover:text-yellow-300'
    },
    red: {
      bg: 'bg-red-100 dark:bg-red-900',
      text: 'text-red-500 dark:text-red-300', 
      hover: 'group-hover:text-red-700 dark:group-hover:text-red-300'
    },
    blue: {
      bg: 'bg-blue-100 dark:bg-blue-900',
      text: 'text-blue-600 dark:text-blue-400',
      hover: 'group-hover:text-blue-700 dark:group-hover:text-blue-300'
    }
  }

  const classes = colorClasses[color]
  
  const content = (
    <div className="flex items-center gap-3">
      <div className={`w-12 h-12 ${classes.bg} rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform`}>
        <div className={`w-6 h-6 ${classes.text}`}>
          {icon}
        </div>
      </div>
      <div>
        <p className={`text-2xl font-bold ${classes.text} ${classes.hover} transition-colors`}>
          {value}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
          {label}
        </p>
      </div>
    </div>
  )

  if (href) {
    return (
      <Link 
        href={href}
        className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md dark:hover:border-gray-600 transition-all duration-200 cursor-pointer group block"
      >
        {content}
      </Link>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      {content}
    </div>
  )
}

// Success Events Widget
export const SuccessStatsWidget: React.FC<{ events: any[] }> = ({ events }) => {
  const successCount = events.filter(e => e.kind.toLowerCase() === 'success').length
  
  return (
    <StatsWidget
      value={successCount}
      label="Success"
      color="green"
      href="/events?filter=success"
      icon={
        <svg fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      }
    />
  )
}

// Warning Events Widget
export const WarningStatsWidget: React.FC<{ events: any[] }> = ({ events }) => {
  const warningCount = events.filter(e => e.kind.toLowerCase() === 'warning').length
  
  return (
    <StatsWidget
      value={warningCount}
      label="Warnings"
      color="yellow"
      href="/events?filter=warning"
      icon={
        <svg fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      }
    />
  )
}

// Error Events Widget
export const ErrorStatsWidget: React.FC<{ events: any[] }> = ({ events }) => {
  const errorCount = events.filter(e => e.kind.toLowerCase() === 'error').length
  
  return (
    <StatsWidget
      value={errorCount}
      label="Errors"
      color="red"
      href="/events?filter=error"
      icon={
        <svg fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      }
    />
  )
}

// Total Devices Widget  
export const DevicesStatsWidget: React.FC<{ devices: any[] }> = ({ devices }) => {
  return (
    <Link 
      href="/devices"
      className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md dark:hover:border-gray-600 transition-all duration-200 cursor-pointer group block"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {devices.length}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Total Devices
            </p>
          </div>
        </div>
        <div className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  )
}

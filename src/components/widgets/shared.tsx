/**
 * Shared Widget Components
 * Common components used across all device widgets for consistent formatting
 */

import React from 'react'

export interface StatProps {
  label: string
  value: string | number | undefined
  isMono?: boolean
  sublabel?: string
}

export const Stat: React.FC<StatProps> = ({ label, value, isMono = false, sublabel }) => (
  <div>
    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</dt>
    <dd className={`mt-1 text-sm text-gray-900 dark:text-gray-100 ${isMono ? 'font-mono' : ''}`}>
      {value || 'Unknown'}
    </dd>
    {sublabel && (
      <dd className="text-xs text-gray-500 dark:text-gray-400 mt-1">{sublabel}</dd>
    )}
  </div>
)

export interface StatusBadgeProps {
  label: string
  status: string | boolean | undefined
  type?: 'success' | 'warning' | 'error' | 'info'
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ label, status, type = 'info' }) => {
  const getStatusColor = () => {
    if (type === 'success' || status === true || status === 'Enabled' || status === 'Up to date') {
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    } else if (type === 'error' || status === false || status === 'Disabled') {
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    } else if (type === 'warning') {
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    } else {
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const displayStatus = typeof status === 'boolean' 
    ? (status ? 'Enabled' : 'Disabled')
    : (status || 'Unknown')

  return (
    <div className="flex justify-between items-center">
      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</label>
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor()}`}>
        {displayStatus}
      </span>
    </div>
  )
}

export interface StatBlockProps {
  title: string
  subtitle?: string
  icon: React.ReactNode
  iconColor: string
  children: React.ReactNode
}

export const StatBlock: React.FC<StatBlockProps> = ({ title, subtitle, icon, iconColor, children }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 ${iconColor} rounded-lg flex items-center justify-center`}>
          {icon}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          {subtitle && (
            <p className="text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
    <div className="px-6 py-4">
      <dl className="space-y-4">
        {children}
      </dl>
    </div>
  </div>
)

export interface ListItemProps {
  title: string
  subtitle?: string
  badge?: string
  value?: string
}

export const ListItem: React.FC<ListItemProps> = ({ title, subtitle, badge, value }) => (
  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{title}</p>
      {subtitle && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
      )}
    </div>
    <div className="flex items-center gap-2 ml-2">
      {badge && (
        <span className="text-xs text-gray-500 dark:text-gray-400">{badge}</span>
      )}
      {value && (
        <span className="text-xs text-gray-500 dark:text-gray-400">{value}</span>
      )}
    </div>
  </div>
)

export const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="text-center py-4">
    <p className="text-gray-600 dark:text-gray-400">{message}</p>
  </div>
)

// Common icons
export const Icons = {
  information: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  system: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  hardware: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
    </svg>
  ),
  security: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  network: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
    </svg>
  ),
  applications: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ),
  management: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  )
}

// Common color schemes for widgets
export const WidgetColors = {
  blue: "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400",
  orange: "bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400", 
  red: "bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400",
  green: "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400",
  purple: "bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400",
  indigo: "bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400"
}

"use client"

import { normalizePlatform } from '../../providers/PlatformFilterProvider'

interface PlatformBadgeProps {
  platform: 'macOS' | 'Windows' | 'Mac' | 'Macintosh' | string
  size?: 'xs' | 'sm' | 'md'
  className?: string
}

/**
 * Shared platform badge component for displaying Mac/Windows icons
 * Used across tables to indicate device platform at 50% opacity gray
 */
export function PlatformBadge({ platform, size = 'sm', className = '' }: PlatformBadgeProps) {
  const normalized = normalizePlatform(platform)
  const isMac = normalized === 'macOS'
  const isWindows = normalized === 'Windows'

  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5'
  }

  const iconSize = sizeClasses[size]

  if (isMac) {
    return (
      <span className={`inline-flex items-center ${className}`} title="macOS">
        <svg className={`${iconSize} text-gray-400 dark:text-gray-500 opacity-50`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
        </svg>
      </span>
    )
  }

  if (isWindows) {
    return (
      <span className={`inline-flex items-center ${className}`} title="Windows">
        <svg className={`${iconSize} text-gray-400 dark:text-gray-500 opacity-50`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z"/>
        </svg>
      </span>
    )
  }

  // Unknown platform - show question mark
  return (
    <span className={`inline-flex items-center ${className}`} title={platform || 'Unknown'}>
      <svg className={`${iconSize} text-gray-300 dark:text-gray-600 opacity-50`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </span>
  )
}

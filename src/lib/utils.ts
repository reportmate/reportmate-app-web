/**
 * Utility functions for the dashboard
 */

/**
 * Format a timestamp as relative time (e.g., "2 minutes ago")
 */
export function formatRelativeTime(timestamp: string): string {
  const now = new Date()
  const past = new Date(timestamp)
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return 'Just now'
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes} min${diffInMinutes === 1 ? '' : 's'} ago`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`
  }

  // For older timestamps, show the actual date
  return past.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: past.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  })
}

/**
 * Toggle dark mode
 */
export function toggleDarkMode(): void {
  if (typeof window === 'undefined') return
  
  const isDark = document.documentElement.classList.contains('dark')
  
  if (isDark) {
    document.documentElement.classList.remove('dark')
    localStorage.setItem('theme', 'light')
  } else {
    document.documentElement.classList.add('dark')
    localStorage.setItem('theme', 'dark')
  }
}

/**
 * Get current theme
 */
export function getCurrentTheme(): 'light' | 'dark' | 'system' {
  if (typeof window === 'undefined') return 'system'
  
  const stored = localStorage.getItem('theme')
  if (stored === 'light' || stored === 'dark') return stored
  
  return 'system'
}

/**
 * Initialize theme from system preference or localStorage
 */
export function initializeTheme(): void {
  if (typeof window === 'undefined') return
  
  const stored = localStorage.getItem('theme')
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  
  if (stored === 'dark' || (!stored && prefersDark)) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

/**
 * Force theme synchronization with system preference
 * Useful for Edge browser issues where theme detection fails
 */
export function forceThemeSync(): void {
  if (typeof window === 'undefined') return
  
  try {
    const stored = localStorage.getItem('reportmate-theme') || localStorage.getItem('theme')
    
    if (!stored || stored === 'system') {
      // Re-evaluate system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      const root = document.documentElement
      
      root.classList.remove('light', 'dark')
      root.classList.add(prefersDark ? 'dark' : 'light')
      
      console.log('[Utils] Forced theme sync:', {
        systemPrefersDark: prefersDark,
        appliedTheme: prefersDark ? 'dark' : 'light',
        userAgent: navigator.userAgent
      })
    } else {
      // Apply stored explicit theme
      const root = document.documentElement
      root.classList.remove('light', 'dark')
      root.classList.add(stored)
      
      console.log('[Utils] Forced explicit theme sync:', {
        storedTheme: stored,
        appliedTheme: stored
      })
    }
  } catch (error) {
    console.warn('[Utils] Force theme sync failed:', error)
  }
}

// Make function globally available for console debugging
if (typeof window !== 'undefined') {
  (window as any).forceThemeSync = forceThemeSync
}

/**
 * Detect if running on Edge browser
 */
export function isEdgeBrowser(): boolean {
  if (typeof window === 'undefined') return false
  return navigator.userAgent.includes('Edg/')
}

/**
 * Utility to combine class names
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

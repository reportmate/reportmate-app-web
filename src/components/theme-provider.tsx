"use client"

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light' | 'system'

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: 'system',
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'reportmate-theme',
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    // Initialize with default theme to prevent hydration mismatch
    return defaultTheme
  })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    // Initialize theme from localStorage after mounting
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored && ['light', 'dark', 'system'].includes(stored)) {
        setTheme(stored as Theme)
      }
    } catch (error) {
      console.warn('Failed to read theme from localStorage:', error)
    }
  }, [storageKey])

  useEffect(() => {
    if (!mounted) return

    const root = window.document.documentElement
    
    const getSystemTheme = () => {
      // Edge browser compatibility: Force refresh of media query
      if (window.matchMedia) {
        try {
          const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
          // Force re-evaluation for Edge
          const matches = mediaQuery.matches
          
          console.log('[ThemeProvider] Media query matches:', matches)
          console.log('[ThemeProvider] Media query object:', mediaQuery)
          console.log('[ThemeProvider] User agent:', navigator.userAgent)
          
          return matches ? 'dark' : 'light'
        } catch (error) {
          console.warn('[ThemeProvider] matchMedia failed:', error)
          return 'light'
        }
      }
      return 'light'
    }
    
    const applyTheme = (themeToApply: Theme) => {
      root.classList.remove('light', 'dark')

      if (themeToApply === 'system') {
        const systemTheme = getSystemTheme()
        root.classList.add(systemTheme)
        
        console.log('[ThemeProvider] Applied system theme:', systemTheme)
        
        return systemTheme
      } else {
        root.classList.add(themeToApply)
        console.log('[ThemeProvider] Applied explicit theme:', themeToApply)
        return themeToApply
      }
    }

    const appliedTheme = applyTheme(theme)

    // Edge-specific workaround: Periodic system theme check
    let edgeWorkaroundInterval: NodeJS.Timeout | null = null
    const isEdge = navigator.userAgent.includes('Edg/')
    
    if (isEdge) {
      console.log('[ThemeProvider] Edge detected - setting up enhanced periodic theme check')
      edgeWorkaroundInterval = setInterval(() => {
        if (theme === 'system') {
          const currentSystemTheme = getSystemTheme()
          const currentAppliedTheme = root.classList.contains('dark') ? 'dark' : 'light'
          
          if (currentSystemTheme !== currentAppliedTheme) {
            console.log('[ThemeProvider] Edge workaround - theme mismatch detected, correcting')
            applyTheme('system')
          }
        } else {
          // For explicit themes, ensure they're still applied correctly
          const currentAppliedTheme = root.classList.contains('dark') ? 'dark' : 'light'
          if (currentAppliedTheme !== theme) {
            console.log('[ThemeProvider] Edge workaround - explicit theme mismatch detected, correcting')
            applyTheme(theme)
          }
        }
      }, 1500) // Check every 1.5 seconds for faster responsiveness
    }

    // Only set up listener for system theme changes if using system theme
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      
      const handleChange = (e: MediaQueryListEvent) => {
        console.log('[ThemeProvider] System theme changed:', e.matches ? 'dark' : 'light')
        
        // Force a re-application of system theme for Edge compatibility
        setTimeout(() => {
          applyTheme('system')
        }, 10)
      }
      
      // Use multiple compatibility approaches for Edge
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange)
      } else if (mediaQuery.addListener) {
        // Fallback for older browsers/Edge
        mediaQuery.addListener(handleChange)
      }
      
      // Additional Edge compatibility: Force theme re-evaluation on focus
      const handleFocus = () => {
        if (theme === 'system') {
          console.log('[ThemeProvider] Window focus - re-evaluating system theme')
          applyTheme('system')
        }
      }
      
      window.addEventListener('focus', handleFocus)
      
      return () => {
        if (mediaQuery.removeEventListener) {
          mediaQuery.removeEventListener('change', handleChange)
        } else if (mediaQuery.removeListener) {
          mediaQuery.removeListener(handleChange)
        }
        window.removeEventListener('focus', handleFocus)
        
        if (edgeWorkaroundInterval) {
          clearInterval(edgeWorkaroundInterval)
        }
      }
    }
    
    return () => {
      if (edgeWorkaroundInterval) {
        clearInterval(edgeWorkaroundInterval)
      }
    }
  }, [theme, mounted])

  const value = {
    theme,
    setTheme: (newTheme: Theme) => {
      try {
        localStorage.setItem(storageKey, newTheme)
        setTheme(newTheme)
        console.log('[ThemeProvider] Theme changed to:', newTheme)
      } catch (error) {
        console.warn('Failed to save theme to localStorage:', error)
        setTheme(newTheme)
      }
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider')

  return context
}

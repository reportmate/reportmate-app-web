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
    
    const applyTheme = (themeToApply: Theme) => {
      root.classList.remove('light', 'dark')

      if (themeToApply === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        root.classList.add(systemTheme)
        
        console.log('[ThemeProvider] Applied system theme:', systemTheme)
        console.log('[ThemeProvider] matchMedia result:', window.matchMedia('(prefers-color-scheme: dark)').matches)
        console.log('[ThemeProvider] User agent:', navigator.userAgent)
        
        return systemTheme
      } else {
        root.classList.add(themeToApply)
        console.log('[ThemeProvider] Applied explicit theme:', themeToApply)
        return themeToApply
      }
    }

    const appliedTheme = applyTheme(theme)

    // Only set up listener for system theme changes if using system theme
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      
      const handleChange = (e: MediaQueryListEvent) => {
        console.log('[ThemeProvider] System theme changed:', e.matches ? 'dark' : 'light')
        applyTheme('system')
      }
      
      // Use both addEventListener and addListener for better compatibility
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange)
      } else if (mediaQuery.addListener) {
        // Fallback for older browsers/Edge
        mediaQuery.addListener(handleChange)
      }
      
      return () => {
        if (mediaQuery.removeEventListener) {
          mediaQuery.removeEventListener('change', handleChange)
        } else if (mediaQuery.removeListener) {
          mediaQuery.removeListener(handleChange)
        }
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

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
    } catch {
      // Silently fail if localStorage unavailable
    }
  }, [storageKey])

  useEffect(() => {
    if (!mounted) return

    const root = window.document.documentElement
    
    const getSystemTheme = () => {
      if (window.matchMedia) {
        try {
          return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        } catch {
          return 'light'
        }
      }
      return 'light'
    }
    
    const applyTheme = (themeToApply: Theme) => {
      root.classList.remove('light', 'dark')
      if (themeToApply === 'system') {
        root.classList.add(getSystemTheme())
      } else {
        root.classList.add(themeToApply)
      }
    }

    applyTheme(theme)

    // Only set up listener for system theme changes if using system theme
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      
      const handleChange = () => {
        applyTheme('system')
      }
      
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange)
      } else if (mediaQuery.addListener) {
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
      } catch {
        // Silently fail
      }
      setTheme(newTheme)
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

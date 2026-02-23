'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type DebugModeState = {
  debugMode: boolean
  setDebugMode: (enabled: boolean) => void
}

const DebugModeContext = createContext<DebugModeState>({
  debugMode: false,
  setDebugMode: () => null,
})

export function DebugModeProvider({ children }: { children: React.ReactNode }) {
  const [debugMode, setDebugModeState] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('reportmate-debug-mode')
      if (stored === 'true') {
        setDebugModeState(true)
      }
    } catch {
      // Silently fail if localStorage unavailable
    }
  }, [])

  const setDebugMode = (enabled: boolean) => {
    try {
      localStorage.setItem('reportmate-debug-mode', String(enabled))
    } catch {
      // Silently fail
    }
    setDebugModeState(enabled)
  }

  return (
    <DebugModeContext.Provider value={{ debugMode, setDebugMode }}>
      {children}
    </DebugModeContext.Provider>
  )
}

export const useDebugMode = () => useContext(DebugModeContext)

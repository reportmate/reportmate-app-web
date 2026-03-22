'use client'

import { createContext, useContext } from 'react'

type DemoModeState = {
  isDemoMode: boolean
}

const DemoModeContext = createContext<DemoModeState>({
  isDemoMode: false,
})

export function DemoModeProvider({ children }: { children: React.ReactNode }) {
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

  return (
    <DemoModeContext.Provider value={{ isDemoMode }}>
      {children}
    </DemoModeContext.Provider>
  )
}

export const useDemoMode = () => useContext(DemoModeContext)

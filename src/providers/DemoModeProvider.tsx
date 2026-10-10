'use client'

import { createContext, useContext } from 'react'

type DemoModeState = {
  isDemoMode: boolean
}

export const DemoModeContext = createContext<DemoModeState>({
  isDemoMode: false,
})

// The root layout (a server component) reads the demo switch from the
// container environment at request time and passes it in here, so client
// components follow the runtime setting rather than a value baked in at build.
export function DemoModeProvider({
  isDemoMode,
  children,
}: {
  isDemoMode: boolean
  children: React.ReactNode
}) {
  return (
    <DemoModeContext.Provider value={{ isDemoMode }}>
      {children}
    </DemoModeContext.Provider>
  )
}

export const useDemoMode = () => useContext(DemoModeContext)

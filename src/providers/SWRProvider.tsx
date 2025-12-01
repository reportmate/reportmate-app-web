"use client"

import { SWRConfig } from 'swr'
import { ReactNode } from 'react'

interface SWRProviderProps {
  children: ReactNode
}

export function SWRProvider({ children }: SWRProviderProps) {
  return (
    <SWRConfig
      value={{
        // Global SWR configuration
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        dedupingInterval: 30000,
        errorRetryCount: 3,
        keepPreviousData: true,
        
        // Global error handler
        onError: (error, key) => {
          if (process.env.NODE_ENV === 'development') {
            console.error(`[SWR Error] ${key}:`, error)
          }
        },
        
        // Prevent infinite loading on hydration mismatch
        fallback: {},
      }}
    >
      {children}
    </SWRConfig>
  )
}

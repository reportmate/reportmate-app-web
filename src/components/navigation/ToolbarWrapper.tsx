'use client'

import { usePathname } from 'next/navigation'
import { AppToolbar } from './AppToolbar'
import { ReactNode } from 'react'

interface ToolbarWrapperProps {
  children?: ReactNode
}

// Routes where the toolbar should be hidden
const hiddenToolbarRoutes = [
  '/auth',
  '/auth/signin',
  '/auth/error',
]

function shouldHideToolbar(pathname: string): boolean {
  return hiddenToolbarRoutes.some(route => pathname.startsWith(route))
}

export function ToolbarWrapper({ children }: ToolbarWrapperProps) {
  const pathname = usePathname()
  
  if (shouldHideToolbar(pathname)) {
    return <>{children}</>
  }
  
  return (
    <>
      <AppToolbar />
      {children}
    </>
  )
}

'use client'

import { useSession, signIn } from 'next-auth/react'
import { useEffect, ReactNode } from 'react'
import { usePathname } from 'next/navigation'

interface AutoAuthProps {
  children: ReactNode
}

// Define public routes that don't require authentication
const publicRoutes = [
  '/auth/signin',
  '/auth/error',
  '/terms',
  '/privacy',
  '/api'
]

function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some(route => pathname.startsWith(route))
}

export default function AutoAuth({ children }: AutoAuthProps) {
  // Always call hooks at the top level
  const { data: _session, status } = useSession()
  const pathname = usePathname()
  
  // In development mode, bypass all authentication
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  console.log('[AutoAuth] NODE_ENV:', process.env.NODE_ENV, 'isDevelopment:', isDevelopment)
  
  useEffect(() => {
    // Skip authentication logic in development
    if (isDevelopment) {
      console.log('[AutoAuth] Development mode - bypassing authentication')
      return
    }

    console.log('[AutoAuth] Production mode - checking authentication', { status, pathname })

    // Don't redirect if we're already on a public route
    if (isPublicRoute(pathname)) {
      return
    }

    // Don't redirect while loading
    if (status === 'loading') {
      return
    }

    // If not authenticated, automatically sign in with Azure AD
    if (status === 'unauthenticated') {
      console.log('Auto-redirecting to Azure AD SSO...')
      signIn('azure-ad', { 
        callbackUrl: pathname || '/dashboard',
        redirect: true 
      })
      return
    }
  }, [isDevelopment, status, pathname])

  // In development mode, always render children
  if (isDevelopment) {
    return <>{children}</>
  }

  // Show loading for protected routes while checking authentication
  if (!isPublicRoute(pathname) && status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            Loading...
          </p>
        </div>
      </div>
    )
  }

  // Show loading while redirecting to sign in
  if (!isPublicRoute(pathname) && status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            Redirecting to sign in...
          </p>
        </div>
      </div>
    )
  }

  // Render the children for authenticated users or public routes
  return <>{children}</>
}

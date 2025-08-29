'use client'

import { ReactNode } from 'react'
import { useRequireAuth, useHasRole } from '@/hooks/useAuth'

interface ProtectedRouteProps {
  children: ReactNode
  requiredRoles?: string | string[]
  fallback?: ReactNode
}

export default function ProtectedRoute({ 
  children, 
  requiredRoles, 
  fallback 
}: ProtectedRouteProps) {
  const { session, isLoading } = useRequireAuth()
  const hasRequiredRole = useHasRole(requiredRoles || [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!session) {
    return null // useRequireAuth will redirect
  }

  if (requiredRoles && !hasRequiredRole) {
    if (fallback) {
      return <>{fallback}</>
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-red-600">
            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
          <p className="text-gray-600">
            You don&apos;t have the required permissions to access this page.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

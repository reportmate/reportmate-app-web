'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

// Hook to require authentication
export function useRequireAuth() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return // Still loading

    if (!session) {
      router.push('/auth/signin')
    }
  }, [session, status, router])

  return { session, status, isLoading: status === 'loading' }
}

// Hook to check if user has specific roles
export function useHasRole(requiredRoles: string | string[]) {
  const { data: session } = useSession()
  
  if (!session?.user?.roles) return false
  
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles]
  return roles.some(role => session.user.roles.includes(role))
}

// Hook to check if user belongs to specific tenant
export function useHasTenant(tenantId: string) {
  const { data: session } = useSession()
  return session?.user?.tenantId === tenantId
}

// Hook to get user provider info
export function useAuthProvider() {
  const { data: session } = useSession()
  return {
    provider: session?.user?.provider,
    isAzureAD: session?.user?.provider === 'azure-ad',
    isGoogle: session?.user?.provider === 'google',
    isCredentials: session?.user?.provider === 'credentials'
  }
}

"use client"

// Force dynamic rendering and disable caching for main page
export const dynamic = 'force-dynamic'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useSession } from 'next-auth/react'

export default function HomePage() {
  const router = useRouter()
  
  // Development mode: skip authentication completely
  const isDevelopment = process.env.NODE_ENV === 'development'
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
  const skipAuth = isDevelopment || isDemoMode
  
  // Get session data (only used in production)
  const { data: _session, status } = useSession()
  
  useEffect(() => {
    if (skipAuth) {
      // In development or demo mode, go straight to dashboard
      router.push('/dashboard')
      return
    }
    
    // Production mode: use authentication
    if (status === 'authenticated') {
      router.push('/dashboard')
    }
  }, [router, skipAuth, status])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">
          {isDevelopment ? 'Development Mode - Redirecting to Dashboard...' : 'Loading...'}
        </p>
      </div>
    </div>
  )
}

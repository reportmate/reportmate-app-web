"use client"

// Force dynamic rendering and disable caching for main page
export const dynamic = 'force-dynamic'

import { useSession } from 'next-auth/react'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'authenticated') {
      // User is authenticated, redirect to dashboard
      router.push('/dashboard')
    }
  }, [status, router])

  // Show loading while checking authentication or redirecting
  // The AutoAuth component will handle the SSO redirect if not authenticated
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">
          {status === 'loading' ? 'Loading...' : 'Redirecting...'}
        </p>
      </div>
    </div>
  )
}

"use client"

// Force dynamic rendering and disable caching for main page
export const dynamic = 'force-dynamic'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function HomePage() {
  const router = useRouter()
  
  // Development mode: skip authentication completely
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  useEffect(() => {
    if (isDevelopment) {
      // In development, go straight to dashboard
      console.log('[HOME] Development mode - redirecting to dashboard')
      router.push('/dashboard')
      return
    }
    
    // Production mode: use authentication (imported only when needed)
    import('next-auth/react').then(({ useSession }) => {
      const { data: session, status } = useSession()
      
      if (status === 'authenticated') {
        router.push('/dashboard')
      }
    })
  }, [router, isDevelopment])

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

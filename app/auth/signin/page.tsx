'use client'

import { getProviders, signIn, getSession } from 'next-auth/react'
import { useEffect, useState, Suspense } from 'react'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { getProviderDisplayName, getProviderIconConfig } from '@/lib/auth-client'

interface Provider {
  id: string
  name: string
  type: string
}

function SignInContent() {
  const [providers, setProviders] = useState<Record<string, Provider> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [signingIn, setSigningIn] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'
  const error = searchParams.get('error')

  useEffect(() => {
    // Clear any error parameters from the URL to prevent error display
    if (error) {
      console.log('[SIGNIN] Clearing error parameter:', error)
      const url = new URL(window.location.href)
      url.searchParams.delete('error')
      window.history.replaceState({}, '', url.toString())
    }
  }, [error])

  useEffect(() => {
    (async () => {
      // Check if user is already signed in
      const session = await getSession()
      if (session) {
        router.push(callbackUrl)
        return
      }

      // Get available providers
      const res = await getProviders()
      setProviders(res)
      setIsLoading(false)
    })()
  }, [callbackUrl, router])

  const handleSignIn = async (providerId: string) => {
    setSigningIn(providerId)
    
    try {
      // Clear any existing errors before signing in
      const url = new URL(window.location.href)
      url.searchParams.delete('error')
      window.history.replaceState({}, '', url.toString())
      
      await signIn(providerId, { 
        callbackUrl,
        redirect: true // Changed to true to ensure proper redirect
      })
    } catch (error) {
      console.error('Sign in error:', error)
      setSigningIn(null)
    }
  }



  const renderProviderIcon = (providerId: string) => {
    const iconConfig = getProviderIconConfig(providerId)
    
    if (iconConfig.type === 'outline') {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox={iconConfig.viewBox}>
          {(iconConfig.paths as string[]).map((path, index) => (
            <path 
              key={index}
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={iconConfig.strokeWidth || 2} 
              d={path} 
            />
          ))}
        </svg>
      )
    } else if (iconConfig.type === 'svg' && Array.isArray(iconConfig.paths) && typeof iconConfig.paths[0] === 'object') {
      // Google provider with multiple colored paths
      return (
        <svg className="w-5 h-5" viewBox={iconConfig.viewBox}>
          {(iconConfig.paths as Array<{fill: string, d: string}>).map((pathObj, index) => (
            <path key={index} fill={pathObj.fill} d={pathObj.d} />
          ))}
        </svg>
      )
    } else {
      // Simple SVG with single path
      return (
        <svg className="w-5 h-5" viewBox={iconConfig.viewBox} fill={iconConfig.fill || "currentColor"}>
          {(iconConfig.paths as string[]).map((path, index) => (
            <path key={index} d={path} />
          ))}
        </svg>
      )
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full space-y-8">
          <div className="animate-pulse">
            {/* Logo skeleton */}
            <div className="flex justify-center mb-8">
              <div className="h-24 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
            {/* Title skeleton */}
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mx-auto mb-4"></div>
            {/* Button skeletons */}
            <div className="space-y-3">
              <div className="h-14 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              <div className="h-14 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Explicitly log that we're not showing any errors
  console.log('[SIGNIN] Rendering signin page - no error display logic active')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          {/* ReportMate Logo - Large and Prominent */}
          <div className="flex justify-center mb-8">
            <Image
              src="/reportmate-logo.png"
              alt="ReportMate"
              width={240}
              height={96}
              className="h-24 w-auto dark:brightness-0 dark:invert"
              priority
            />
          </div>
          
          {/* Welcome Text */}
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome to ReportMate
            </h1>
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4">
              Fleet Live Reporting Dashboard
            </h2>
          </div>
        </div>

        <div className="mt-8 space-y-4">
          {providers && Object.values(providers)
            .filter(provider => provider.id !== 'credentials') // Show OAuth providers first
            .map((provider) => (
            <button
              key={provider.id}
              onClick={() => handleSignIn(provider.id)}
              disabled={signingIn === provider.id}
              className="group relative w-full flex justify-center py-4 px-6 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-4">
                {signingIn === provider.id ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 dark:border-blue-400"></div>
                ) : (
                  <div className="text-blue-600 dark:text-blue-400">
                    {renderProviderIcon(provider.id)}
                  </div>
                )}
              </span>
              <span className="font-semibold">
                Sign in with {getProviderDisplayName(provider.id)}
              </span>
            </button>
          ))}

          {/* Credentials provider (if enabled) */}
          {providers?.credentials && (
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">Or continue with</span>
                </div>
              </div>
              <div className="mt-6">
                <button
                  onClick={() => handleSignIn('credentials')}
                  disabled={signingIn === 'credentials'}
                  className="group relative w-full flex justify-center py-4 px-6 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <span className="absolute left-0 inset-y-0 flex items-center pl-4">
                    {signingIn === 'credentials' ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 dark:border-blue-400"></div>
                    ) : (
                      <div className="text-blue-600 dark:text-blue-400">
                        {renderProviderIcon('credentials')}
                      </div>
                    )}
                  </span>
                  <span className="font-semibold">
                    Sign in with Email & Password
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

export default function SignIn() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full space-y-8">
          <div className="animate-pulse">
            {/* Logo skeleton */}
            <div className="flex justify-center mb-8">
              <div className="h-24 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
            {/* Title skeleton */}
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mx-auto mb-4"></div>
            {/* Button skeletons */}
            <div className="space-y-3">
              <div className="h-14 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              <div className="h-14 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    }>
      <SignInContent />
    </Suspense>
  )
}

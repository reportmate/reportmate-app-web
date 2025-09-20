'use client'

import { getProviders, signIn, getSession } from 'next-auth/react'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getProviderDisplayName, getProviderIconConfig, getErrorMessage } from '@/lib/auth-client'

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
      await signIn(providerId, { 
        callbackUrl,
        redirect: false 
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          {/* ReportMate Logo - Large and Prominent */}
          <div className="flex justify-center mb-8">
            <img 
              src="/reportmate-logo.png" 
              alt="ReportMate" 
              className="h-24 w-auto dark:brightness-0 dark:invert"
            />
          </div>
          
          {/* Welcome Text */}
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome to ReportMate
            </h1>
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4">
              Fleet Management Dashboard
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Sign in to access your device inventory and monitoring dashboard
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4 border dark:border-red-800">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400 dark:text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-400">Authentication Error</h3>
                <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                  <p>{getErrorMessage(error)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

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

        <div className="mt-8">
          <div className="text-center text-xs text-gray-500 dark:text-gray-400">
            <p>
              By signing in, you agree to our{' '}
              <a href="/terms" className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 underline">
                Privacy Policy
              </a>
            </p>
          </div>
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

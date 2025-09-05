'use client'

import { getProviders, signIn, getSession } from 'next-auth/react'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getProviderDisplayName } from '@/lib/auth'

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

  const getProviderIcon = (providerId: string) => {
    switch (providerId) {
      case 'azure-ad':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z"/>
          </svg>
        )
      case 'google':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        )
      case 'credentials':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
          </svg>
        )
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  const getErrorMessage = (error: string) => {
    switch (error) {
      case 'Configuration':
        return 'Authentication service configuration error. Please contact support.'
      case 'AccessDenied':
        return 'Access denied. You may not have permission to access this application.'
      case 'Verification':
        return 'Email verification required. Please verify your email address.'
      case 'Default':
        return 'An error occurred during authentication. Please try again.'
      default:
        return 'Authentication failed. Please try again.'
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
                    {getProviderIcon(provider.id)}
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
                        {getProviderIcon('credentials')}
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

'use client'

import { signIn, getSession } from 'next-auth/react'
import { useEffect, useState, Suspense, useRef } from 'react'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'

function SignInContent() {
  const [status, setStatus] = useState<'checking' | 'redirecting' | 'error'>('checking')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'
  const error = searchParams.get('error')
  const hasTriggeredSignIn = useRef(false)

  useEffect(() => {
    // Clear any error parameters from the URL
    if (error) {
      console.log('[SIGNIN] Error parameter detected:', error)
      const url = new URL(window.location.href)
      url.searchParams.delete('error')
      window.history.replaceState({}, '', url.toString())
      
      // If we've had repeated errors, show manual sign-in option
      const errorCount = parseInt(sessionStorage.getItem('signin-error-count') || '0')
      if (errorCount >= 2) {
        setErrorMessage('Authentication is having issues. Please try again.')
        setStatus('error')
        sessionStorage.setItem('signin-error-count', '0')
        return
      }
      sessionStorage.setItem('signin-error-count', String(errorCount + 1))
    }
  }, [error])

  useEffect(() => {
    // Prevent double trigger
    if (hasTriggeredSignIn.current) return
    
    const autoSignIn = async () => {
      try {
        // Check if user is already signed in
        const session = await getSession()
        if (session) {
          console.log('[SIGNIN] Already authenticated, redirecting...')
          router.push(callbackUrl)
          return
        }

        // Not authenticated - auto-redirect to Azure AD SSO
        console.log('[SIGNIN] Not authenticated, auto-redirecting to Azure AD SSO...')
        setStatus('redirecting')
        hasTriggeredSignIn.current = true
        
        // Use signIn with redirect: true to let NextAuth handle the redirect properly
        await signIn('azure-ad', { 
          callbackUrl,
          redirect: true
        })
      } catch (err) {
        console.error('[SIGNIN] Auto sign-in error:', err)
        setErrorMessage('Failed to initiate sign-in. Please try again.')
        setStatus('error')
        hasTriggeredSignIn.current = false
      }
    }

    // Small delay to prevent flash if already authenticated
    const timeoutId = setTimeout(autoSignIn, 100)
    return () => clearTimeout(timeoutId)
  }, [callbackUrl, router])

  const handleManualSignIn = async () => {
    setStatus('redirecting')
    setErrorMessage(null)
    sessionStorage.setItem('signin-error-count', '0')
    
    try {
      await signIn('azure-ad', { 
        callbackUrl,
        redirect: true 
      })
    } catch (err) {
      console.error('[SIGNIN] Manual sign-in error:', err)
      setErrorMessage('Failed to initiate sign-in. Please try again.')
      setStatus('error')
    }
  }

  // Show error state with manual sign-in option
  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
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
            
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                Welcome to ReportMate
              </h1>
              <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4">
                Fleet Live Reporting Dashboard
              </h2>
            </div>
          </div>

          {errorMessage && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200 text-center">
                {errorMessage}
              </p>
            </div>
          )}

          <button
            onClick={handleManualSignIn}
            className="group relative w-full flex justify-center py-4 px-6 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <span className="absolute left-0 inset-y-0 flex items-center pl-4">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" viewBox="0 0 23 23" fill="currentColor">
                <path d="M0 0h11v11H0zM12 0h11v11H12zM0 12h11v11H0zM12 12h11v11H12z"/>
              </svg>
            </span>
            <span className="font-semibold">
              Sign in with Microsoft Entra ID
            </span>
          </button>
        </div>
      </div>
    )
  }

  // Show loading/redirecting state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
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
          
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome to ReportMate
            </h1>
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4">
              Fleet Live Reporting Dashboard
            </h2>
          </div>
        </div>

        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            {status === 'checking' ? 'Checking authentication...' : 'Redirecting to Microsoft sign-in...'}
          </p>
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
            <div className="flex justify-center mb-8">
              <div className="h-24 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mx-auto mb-4"></div>
            <div className="space-y-3">
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

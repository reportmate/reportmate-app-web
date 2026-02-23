'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { useAuthProvider } from '@/hooks/useAuth'

export default function UserMenu() {
  const { data: session } = useSession()
  const { provider } = useAuthProvider()
  const [isOpen, setIsOpen] = useState(false)

  if (!session?.user) return null

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' })
  }

  const getProviderBadge = () => {
    switch (provider) {
      case 'azure-ad':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
            Microsoft
          </span>
        )
      case 'google':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
            Google
          </span>
        )
      case 'credentials':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
            Local
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        {session.user.image ? (
          <Image
            className="h-8 w-8 rounded-full"
            src={session.user.image}
            alt={session.user.name || 'User avatar'}
            width={32}
            height={32}
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
            <svg className="h-5 w-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </div>
        )}
        <span className="hidden md:block text-gray-700 font-medium">
          {session.user.name || session.user.email}
        </span>
        <svg
          className={`h-4 w-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-200">
            <div className="py-1">
              {/* User Info */}
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  {session.user.image ? (
                    <Image
                      className="h-10 w-10 rounded-full"
                      src={session.user.image}
                      alt={session.user.name || 'User avatar'}
                      width={40}
                      height={40}
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                      <svg className="h-6 w-6 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {session.user.name || 'User'}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {session.user.email}
                    </p>
                    <div className="mt-1">
                      {getProviderBadge()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="py-1">
                <Link
                  href="/dashboard"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setIsOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  href="/settings"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setIsOpen(false)}
                >
                  Settings
                </Link>
              </div>

              {/* Roles */}
              {session.user.roles && session.user.roles.length > 0 && (
                <div className="py-1 border-t border-gray-100">
                  <div className="px-4 py-2">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Roles
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {session.user.roles.map((role) => (
                        <span
                          key={role}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Sign Out */}
              <div className="py-1 border-t border-gray-100">
                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center space-x-2"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

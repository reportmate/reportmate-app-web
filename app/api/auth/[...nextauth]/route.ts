import NextAuth from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"

// Development mode: bypass authentication completely
const isDevelopment = process.env.NODE_ENV === 'development'

let GET: any, POST: any

if (isDevelopment) {
  const mockSession = {
    user: {
      id: "dev-user",
      name: "Development User", 
      email: "dev@localhost",
      provider: "development"
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  }

  // Mock handler for development
  const devHandler = async (req: NextRequest) => {
    const url = new URL(req.url)
    const action = url.pathname.split('/').pop()
    const callbackUrl = url.searchParams.get('callbackUrl')
    
    console.log('[DEV AUTH] Mock authentication handler:', action, 'callback:', callbackUrl)
    
    // Handle different NextAuth endpoints
    switch (action) {
      case 'session':
        return NextResponse.json(mockSession)
      case 'signin':
        // If there's a callback URL, redirect directly to it instead of showing signin page
        if (callbackUrl) {
          console.log('[DEV AUTH] Redirecting to callback URL:', callbackUrl)
          return NextResponse.redirect(new URL(callbackUrl, req.url))
        }
        return NextResponse.json({ url: '/' })
      case 'signout':
        return NextResponse.json({ url: '/' })
      case 'providers':
        return NextResponse.json({})
      case 'csrf':
        return NextResponse.json({ csrfToken: 'dev-csrf-token' })
      case 'azure-ad':
        // For Azure AD signin, redirect directly to callback or home
        if (callbackUrl) {
          console.log('[DEV AUTH] Azure AD signin - redirecting to:', callbackUrl)
          return NextResponse.redirect(new URL(callbackUrl, req.url))
        }
        return NextResponse.redirect(new URL('/', req.url))
      default:
        return NextResponse.json(mockSession)
    }
  }

  GET = devHandler
  POST = devHandler
} else {
  // Production: use proper NextAuth
  console.log('NextAuth configured for production with Azure AD')
  const handler = NextAuth(authOptions)
  GET = handler
  POST = handler
}

export { GET, POST }

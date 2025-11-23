import { NextAuthOptions } from "next-auth"
import AzureADProvider from "next-auth/providers/azure-ad"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"

// Define supported auth providers
export const AUTH_PROVIDERS = {
  AZURE_AD: 'azure-ad',
  GOOGLE: 'google',
  CREDENTIALS: 'credentials'
} as const

// Auth configuration interface for extensibility
interface AuthConfig {
  providers: string[]
  defaultProvider?: string
  requireEmailVerification?: boolean
  allowedDomains?: string[]
}

// Get auth configuration from environment or defaults (server-side only)
export const getAuthConfig = (): AuthConfig => ({
  providers: (process.env.AUTH_PROVIDERS || 'azure-ad').split(','),
  defaultProvider: process.env.DEFAULT_AUTH_PROVIDER || AUTH_PROVIDERS.AZURE_AD,
  requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION === 'true',
  allowedDomains: process.env.ALLOWED_DOMAINS?.split(',') || []
})

// Email domain validation helper
const isAllowedDomain = (email: string, allowedDomains: string[]): boolean => {
  if (allowedDomains.length === 0) return true
  const domain = email.split('@')[1]
  return allowedDomains.includes(domain)
}

// Build providers array based on configuration
const buildProviders = () => {
  const config = getAuthConfig()
  const providers = []

  // Entra ID / Entra ID Provider
  if (config.providers.includes(AUTH_PROVIDERS.AZURE_AD)) {
    const clientId = process.env.AZURE_AD_CLIENT_ID
    const clientSecret = process.env.AZURE_AD_CLIENT_SECRET
    const tenantId = process.env.AZURE_AD_TENANT_ID

    if (!clientId || !clientSecret || !tenantId) {
      console.error('[AUTH] Missing required Entra ID environment variables')
      throw new Error('Missing required Entra ID environment variables')
    }

    providers.push(
      AzureADProvider({
        clientId: clientId,
        clientSecret: clientSecret, 
        tenantId: tenantId,
        authorization: {
          params: {
            scope: process.env.AZURE_AD_SCOPE || "openid profile email User.Read",
            redirect_uri: `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback/azure-ad`
          }
        },
        profile(profile) {
          return {
            id: profile.sub,
            name: profile.name,
            email: profile.email || profile.preferred_username,
            image: profile.picture,
            provider: AUTH_PROVIDERS.AZURE_AD,
            tenantId: profile.tid,
            roles: profile.roles || []
          }
        }
      })
    )
  }

  // Google Provider (for future use)
  if (config.providers.includes(AUTH_PROVIDERS.GOOGLE)) {
    providers.push(
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        profile(profile) {
          return {
            id: profile.sub,
            name: profile.name,
            email: profile.email,
            image: profile.picture,
            provider: AUTH_PROVIDERS.GOOGLE,
            emailVerified: profile.email_verified
          }
        }
      })
    )
  }

  // Credentials Provider (for local/testing)
  if (config.providers.includes(AUTH_PROVIDERS.CREDENTIALS)) {
    providers.push(
      CredentialsProvider({
        name: "credentials",
        credentials: {
          email: { label: "Email", type: "email" },
          password: { label: "Password", type: "password" }
        },
        async authorize(credentials) {
          // TODO: Implement your credential validation logic
          // This is a placeholder for future implementation
          if (credentials?.email && credentials?.password) {
            // Replace with actual validation
            if (credentials.email === "admin@reportmate.ecuad.ca" && credentials.password === "admin") {
              return {
                id: "1",
                name: "Admin User",
                email: credentials.email,
                provider: AUTH_PROVIDERS.CREDENTIALS
              }
            }
          }
          return null
        }
      })
    )
  }

  return providers
}

export const authOptions: NextAuthOptions = {
  providers: buildProviders(),
  
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error'
  },

  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },

  // Force the correct base URL for all auth operations
  useSecureCookies: process.env.NODE_ENV === 'production',

  callbacks: {
  async signIn({ user, account, profile: _profile }) {
      if (account?.error) {
        console.error('[AUTH] OAuth account error:', account.error)
        return false
      }

      const config = getAuthConfig()
      
      // Check allowed domains if configured
      if (user.email && config.allowedDomains && config.allowedDomains.length > 0) {
        if (!isAllowedDomain(user.email, config.allowedDomains)) {
          console.warn(`Sign-in blocked for email domain: ${user.email}`)
          return false
        }
      }

      // Email verification check for certain providers
      if (config.requireEmailVerification && account?.provider === AUTH_PROVIDERS.GOOGLE) {
        return (_profile as any)?.email_verified === true
      }

      return true
    },

    async jwt({ token, user, account }) {
      // Include additional user data in JWT
      if (user) {
        token.provider = user.provider
        token.roles = user.roles || []
        token.tenantId = user.tenantId
      }
      
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
      }

      return token
    },

    async session({ session, token }) {
      // Include additional data in session
      if (token && session.user) {
        session.user.id = token.sub!
        session.user.provider = token.provider as string
        session.user.roles = token.roles as string[]
        session.user.tenantId = token.tenantId as string
        session.accessToken = token.accessToken as string
      }

      return session
    },

    async redirect({ url, baseUrl }) {
      // Get the correct base URL from environment variables
      const correctBaseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || baseUrl
      
      // Always use the configured base URL
      if (url.startsWith("/")) {
        const redirectUrl = `${correctBaseUrl}${url}`
        return redirectUrl
      }
      
      // Replace any incorrect base URL with the correct one
      if (url.includes('0.0.0.0:3000') || url.includes('localhost:3000')) {
        const correctedUrl = url.replace(/(https?:\/\/)[^\/]+/, correctBaseUrl)
        return correctedUrl
      }
      
      // For absolute URLs, ensure they use the correct origin
      try {
        const urlObj = new URL(url)
        const correctBaseUrlObj = new URL(correctBaseUrl)
        if (urlObj.origin !== correctBaseUrlObj.origin) {
          urlObj.hostname = correctBaseUrlObj.hostname
          urlObj.protocol = correctBaseUrlObj.protocol
          urlObj.port = correctBaseUrlObj.port || ''
          const correctedUrl = urlObj.toString()
          return correctedUrl
        }
        return url
      } catch (_error) {
        console.error(`[NextAuth Redirect] Invalid URL ${url}, redirecting to ${correctBaseUrl}`, _error)
        return correctBaseUrl
      }
    }
  },

  events: {
  async signIn({ user, account, profile: _profile }) {
      // User signed in
    },
    
    async signOut({ session }) {
      // User signed out
    }
  },

  debug: false, // Disable debug logging
}


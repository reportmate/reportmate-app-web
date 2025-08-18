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

// Get auth configuration from environment or defaults
const getAuthConfig = (): AuthConfig => ({
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

  // Azure AD / Entra ID Provider
  if (config.providers.includes(AUTH_PROVIDERS.AZURE_AD)) {
    providers.push(
      AzureADProvider({
        clientId: process.env.AZURE_AD_CLIENT_ID!,
        clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
        tenantId: process.env.AZURE_AD_TENANT_ID!,
        authorization: {
          params: {
            scope: "openid profile email User.Read"
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

  callbacks: {
    async signIn({ user, account, profile }) {
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
        return (profile as any)?.email_verified === true
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
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl
    }
  },

  events: {
    async signIn({ user, account, profile }) {
      console.log(`User signed in: ${user.email} via ${account?.provider}`)
    },
    
    async signOut({ session }) {
      console.log(`User signed out: ${session?.user?.email}`)
    }
  },

  debug: process.env.NODE_ENV === 'development'
}

// Helper function to get available providers for UI
export const getAvailableProviders = () => {
  const config = getAuthConfig()
  return config.providers.map(provider => ({
    id: provider,
    name: getProviderDisplayName(provider),
    enabled: true
  }))
}

// Helper function to get provider display names
export const getProviderDisplayName = (provider: string): string => {
  switch (provider) {
    case AUTH_PROVIDERS.AZURE_AD:
      return 'Microsoft Entra ID'
    case AUTH_PROVIDERS.GOOGLE:
      return 'Google'
    case AUTH_PROVIDERS.CREDENTIALS:
      return 'Email & Password'
    default:
      return provider
  }
}

// Export auth configuration for use in other parts of the app
export const authConfig = getAuthConfig()

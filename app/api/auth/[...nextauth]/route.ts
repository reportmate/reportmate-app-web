import NextAuth from "next-auth"
import AzureADProvider from "next-auth/providers/azure-ad"
import type { NextAuthOptions } from "next-auth"

console.log('[NEXTAUTH ROUTE] Loading NextAuth route handler')

// Build authOptions at module level but defer provider creation
const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
      authorization: {
        params: {
          scope: "openid profile email",
          redirect_uri: "https://reportmate.ecuad.ca/api/auth/callback/azure-ad"
        }
      },
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email || profile.preferred_username,
          image: profile.picture,
        }
      }
    })
  ],
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error'
  },
  session: {
    strategy: 'jwt' as const,
    maxAge: 24 * 60 * 60, // 24 hours
  },
  useSecureCookies: true,
  callbacks: {
    async signIn() {
      // Always allow sign in - let NextAuth handle any issues
      return true
    },
    async redirect({ url, baseUrl }) {
      const correctBaseUrl = 'https://reportmate.ecuad.ca'
      console.log(`[NEXTAUTH] Redirect - URL: ${url}, baseUrl: ${baseUrl}, forcing: ${correctBaseUrl}`)
      
      if (url.startsWith("/")) {
        return `${correctBaseUrl}${url}`
      }
      
      if (url.includes('0.0.0.0:3000') || url.includes('localhost:3000')) {
        return url.replace(/(https?:\/\/)[^\/]+/, correctBaseUrl)
      }
      
      try {
        const urlObj = new URL(url)
        if (urlObj.origin !== correctBaseUrl) {
          urlObj.hostname = 'reportmate.ecuad.ca'
          urlObj.protocol = 'https:'
          urlObj.port = ''
          return urlObj.toString()
        }
        return url
      } catch {
        return correctBaseUrl
      }
    }
  }
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }

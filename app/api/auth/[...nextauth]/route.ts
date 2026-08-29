import NextAuth from "next-auth"
import AzureADProvider from "next-auth/providers/azure-ad"
import type { NextAuthOptions } from "next-auth"

// Build authOptions at module level but defer provider creation
const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
      authorization: {
        params: {
          scope: "openid profile email"
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
    // Carry the kiosk role from the JWT into the session so client code can
    // hide controls a viewer cannot use.
    async jwt({ token }) {
      return token
    },
    async session({ session, token }) {
      const role = (token as { role?: string }).role
      if (role) (session as { role?: string }).role = role
      return session
    },
    async signIn() {
      // Always allow sign in - let NextAuth handle any issues
      return true
    },
    async redirect({ url, baseUrl }) {
      // baseUrl is NextAuth's own view of this deployment, derived from
      // NEXTAUTH_URL. Anything else pins the deployment to one hostname.
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`
      }

      try {
        const urlObj = new URL(url)
        // Never hand control to another origin.
        return urlObj.origin === baseUrl ? url : baseUrl
      } catch {
        return baseUrl
      }
    }
  }
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }

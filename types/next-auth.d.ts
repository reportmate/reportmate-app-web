import NextAuth, { DefaultSession, DefaultUser } from "next-auth"
import { DefaultJWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      provider: string
      roles: string[]
      tenantId?: string
    } & DefaultSession["user"]
    accessToken?: string
  }

  interface User extends DefaultUser {
    provider?: string
    roles?: string[]
    tenantId?: string
    emailVerified?: boolean
  }

  interface Profile {
    email_verified?: boolean
    tid?: string
    roles?: string[]
    preferred_username?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    provider?: string
    roles?: string[]
    tenantId?: string
    accessToken?: string
    refreshToken?: string
  }
}

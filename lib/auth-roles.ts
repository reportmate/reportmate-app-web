/**
 * Role-based authorization helpers.
 *
 * Roles flow from Entra ID app role assignments into the JWT via the `roles`
 * claim, which is captured in lib/auth.ts:71 and surfaced on session.user.roles.
 *
 * The `admin` role itself is defined in Terraform at
 * infrastructure/azure/modules/auth/variables.tf (var.app_roles → Administrator,
 * value `admin`). Grant a principal admin access by adding their object ID to
 * `var.admin_principal_ids` and applying Terraform — that creates an
 * azuread_app_role_assignment binding them to the admin role. The user must
 * then sign out and back in for the JWT to pick up the new claim.
 */

import type { Session } from 'next-auth'
import { getToken, type JWT } from 'next-auth/jwt'
import { NextResponse } from 'next/server'

export const ADMIN_ROLE = 'admin'

export function hasRole(roles: string[] | undefined, role: string): boolean {
  return Array.isArray(roles) && roles.includes(role)
}

export function isAdmin(session: Session | null): boolean {
  return hasRole(session?.user?.roles, ADMIN_ROLE)
}

export function tokenIsAdmin(token: JWT | null): boolean {
  return hasRole(token?.roles, ADMIN_ROLE)
}

/**
 * Server-side guard for API route handlers. Returns a minimal session built
 * from the JWT on success, or a `NextResponse` with a 401/403 that the caller
 * should return directly.
 *
 *   const guard = await requireAdmin(request)
 *   if (guard instanceof NextResponse) return guard
 *   // ...authorized work...
 */
export async function requireAdmin(request: Request): Promise<Session | NextResponse> {
  const token = await getToken({
    req: request as any,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: process.env.NODE_ENV === 'production',
  })

  if (!token) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  if (!tokenIsAdmin(token)) {
    return NextResponse.json(
      { error: 'Forbidden', detail: `Requires role ${ADMIN_ROLE}` },
      { status: 403 }
    )
  }

  return {
    user: {
      id: token.sub ?? '',
      provider: (token.provider as string) ?? '',
      roles: (token.roles as string[]) ?? [],
      tenantId: token.tenantId as string | undefined,
      name: token.name ?? null,
      email: token.email ?? null,
      image: token.picture ?? null,
    },
  } as unknown as Session
}

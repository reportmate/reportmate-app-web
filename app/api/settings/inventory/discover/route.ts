import { NextResponse } from "next/server"
import { getInternalApiHeaders } from "@/lib/api-auth"

export const dynamic = "force-dynamic"
export const revalidate = 0

const ADMIN_ROLES = (process.env.SETTINGS_ADMIN_ROLES || "admin,administrator,owner")
  .split(",")
  .map((r) => r.trim().toLowerCase())
  .filter(Boolean)

function hasAdminRole(roles: unknown): boolean {
  if (!Array.isArray(roles)) return false
  return roles.some((r) => typeof r === "string" && ADMIN_ROLES.includes(r.toLowerCase()))
}

// Lazy so `@/lib/auth` (which evaluates the Entra provider at import) isn't run
// during build when its env vars are absent.
async function getSession() {
  const { getServerSession } = await import("next-auth")
  const { authOptions } = await import("@/lib/auth")
  return getServerSession(authOptions)
}

export async function GET(request: Request) {
  try {
    const isDemoOrDev =
      process.env.NEXT_PUBLIC_DEMO_MODE === "true" || process.env.NODE_ENV === "development"

    if (!isDemoOrDev) {
      const session = await getSession()
      if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
      if (!hasAdminRole((session.user as { roles?: unknown })?.roles)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    const apiBaseUrl = process.env.API_BASE_URL
    if (!apiBaseUrl) {
      return NextResponse.json({ error: "API_BASE_URL not configured" }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const includeArchived = searchParams.get("include_archived") || "false"

    const response = await fetch(
      `${apiBaseUrl}/api/v1/settings/inventory/discover?include_archived=${encodeURIComponent(includeArchived)}`,
      { method: "GET", headers: getInternalApiHeaders(), cache: "no-store" }
    )

    const data = await response.json()
    return NextResponse.json(data, { status: response.ok ? 200 : response.status })
  } catch (error) {
    console.error("[SETTINGS] discover failed:", error)
    return NextResponse.json(
      { error: "Inventory discovery failed", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

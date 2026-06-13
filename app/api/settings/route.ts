import { NextResponse } from "next/server"
import { getInternalApiHeaders } from "@/lib/api-auth"

export const dynamic = "force-dynamic"
export const revalidate = 0

// Resolve the current session lazily. `@/lib/auth` evaluates the Entra provider
// at module load and throws when its env vars are absent (e.g. during build), so
// it must only be imported at request time when the environment is populated.
async function getSession() {
  const { getServerSession } = await import("next-auth")
  const { authOptions } = await import("@/lib/auth")
  return getServerSession(authOptions)
}

// Roles permitted to write org settings. Configurable so each deployment can
// map its own Azure AD app role; matched case-insensitively.
const ADMIN_ROLES = (process.env.SETTINGS_ADMIN_ROLES || "admin,administrator,owner")
  .split(",")
  .map((r) => r.trim().toLowerCase())
  .filter(Boolean)

function hasAdminRole(roles: unknown): boolean {
  if (!Array.isArray(roles)) return false
  return roles.some((r) => typeof r === "string" && ADMIN_ROLES.includes(r.toLowerCase()))
}

export async function GET() {
  try {
    const apiBaseUrl = process.env.API_BASE_URL
    if (!apiBaseUrl) {
      return NextResponse.json({ error: "API_BASE_URL not configured" }, { status: 500 })
    }

    const response = await fetch(`${apiBaseUrl}/api/v1/settings`, {
      method: "GET",
      headers: getInternalApiHeaders(),
      cache: "no-store",
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.ok ? 200 : response.status })
  } catch (error) {
    console.error("[SETTINGS] GET failed:", error)
    return NextResponse.json(
      { error: "Failed to load settings", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    // The public demo is strictly read-only — never allow settings writes there.
    if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
      return NextResponse.json(
        { error: "Settings are read-only in the demo environment" },
        { status: 403 }
      )
    }

    // Role gating happens here — the FastAPI tier has no per-user identity.
    // Local dev has no session, so allow it there for testing.
    const isDev = process.env.NODE_ENV === "development"
    const session = isDev ? null : await getSession()

    if (!isDev) {
      if (!session) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
      }
      if (!hasAdminRole((session.user as { roles?: unknown })?.roles)) {
        return NextResponse.json(
          { error: "Forbidden: settings can only be changed by an administrator" },
          { status: 403 }
        )
      }
    }

    const apiBaseUrl = process.env.API_BASE_URL
    if (!apiBaseUrl) {
      return NextResponse.json({ error: "API_BASE_URL not configured" }, { status: 500 })
    }

    const body = await request.json()

    const headers = getInternalApiHeaders()
    const actor = session?.user?.email
    if (actor) headers["X-Updated-By"] = actor

    const response = await fetch(`${apiBaseUrl}/api/v1/settings`, {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.ok ? 200 : response.status })
  } catch (error) {
    console.error("[SETTINGS] PUT failed:", error)
    return NextResponse.json(
      { error: "Failed to save settings", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

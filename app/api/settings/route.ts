import { NextResponse } from "next/server"
import { getInternalApiHeaders } from "@/lib/api-auth"
import { requireAdmin } from "@/lib/auth-roles"

export const dynamic = "force-dynamic"
export const revalidate = 0

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

    // Admin role gating (the FastAPI tier has no per-user identity).
    const guard = await requireAdmin(request)
    if (guard instanceof NextResponse) return guard

    const apiBaseUrl = process.env.API_BASE_URL
    if (!apiBaseUrl) {
      return NextResponse.json({ error: "API_BASE_URL not configured" }, { status: 500 })
    }

    const body = await request.json()

    const headers = getInternalApiHeaders()
    const actor = guard.user?.email
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

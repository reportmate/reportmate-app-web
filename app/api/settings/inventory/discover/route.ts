import { NextResponse } from "next/server"
import { getInternalApiHeaders } from "@/lib/api-auth"
import { requireAdmin } from "@/lib/auth-roles"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(request: Request) {
  try {
    // Discovery exposes inventory values, so it's admin-only.
    const guard = await requireAdmin(request)
    if (guard instanceof NextResponse) return guard

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

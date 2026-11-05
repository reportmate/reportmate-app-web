"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"

/**
 * The Identity report's header: the title is itself the switch between its
 * tabs. /identity and /identity?tab=posture; the global `platform` carries across.
 */
export function IdentityViewSwitch({ current }: { current: "users" | "posture" }) {
  const searchParams = useSearchParams()
  const platform = searchParams?.get("platform")
  const withPlatform = (query: string) => {
    const params = new URLSearchParams(query)
    if (platform) params.set("platform", platform)
    const qs = params.toString()
    return qs ? `/identity?${qs}` : "/identity"
  }
  const items = [
    { key: "users", label: "Identity & Users", href: withPlatform("") },
    { key: "posture", label: "Sign-in & Recovery Posture", href: withPlatform("tab=posture") },
  ] as const
  return (
    <nav aria-label="Identity tabs" className="inline-flex flex-wrap rounded-lg border border-gray-300 dark:border-gray-600 p-0.5 bg-gray-100 dark:bg-gray-900">
      {items.map(item => {
        const active = item.key === current
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`px-3 py-0.5 rounded-md text-lg font-semibold transition-colors ${
              active
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            }`}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

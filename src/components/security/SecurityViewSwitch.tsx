"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"

export type SecurityTab = "posture" | "vulnerabilities" | "threats"

/**
 * The Security report's header: the title is the switch between its tabs,
 * /security, /security?tab=vulnerabilities and /security?tab=threats. Only
 * the global `platform` carries across; each tab owns its other filters.
 */
export function SecurityViewSwitch({ current }: { current: SecurityTab }) {
  const searchParams = useSearchParams()
  const platform = searchParams?.get("platform")
  const href = (tab: SecurityTab) => {
    const params = new URLSearchParams()
    if (tab !== "posture") params.set("tab", tab)
    if (platform) params.set("platform", platform)
    const qs = params.toString()
    return qs ? `/security?${qs}` : "/security"
  }
  const items = [
    { key: "posture", label: "Security" },
    { key: "vulnerabilities", label: "Vulnerabilities" },
    { key: "threats", label: "Threat Detections" },
  ] as const
  return (
    <nav aria-label="Security tabs" className="inline-flex flex-wrap rounded-lg border border-gray-300 dark:border-gray-600 p-0.5 bg-gray-100 dark:bg-gray-900">
      {items.map(item => {
        const active = item.key === current
        return (
          <Link
            key={item.key}
            href={href(item.key)}
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

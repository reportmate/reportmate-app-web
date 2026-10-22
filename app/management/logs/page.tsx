import { redirect } from "next/navigation"

/**
 * The Logs tab lives at /management?tab=logs. Links to /management/logs,
 * including the API's dashboard card links, land there with their filters.
 */
export default async function ManagementLogsRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = new URLSearchParams({ tab: "logs" })
  for (const [key, value] of Object.entries(await searchParams)) {
    if (key === "tab") continue
    for (const v of Array.isArray(value) ? value : value === undefined ? [] : [value]) params.append(key, v)
  }
  redirect(`/management?${params.toString()}`)
}

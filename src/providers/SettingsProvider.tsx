"use client"

import { createContext, useContext, useMemo, ReactNode } from "react"
import useSWR from "swr"
import { withDefaults } from "@/src/lib/settings/defaults"
import { migrateSettings } from "@/src/lib/settings/migrate"
import {
  InventoryFieldMapping,
  SecurityConfig,
  SettingsDocument,
  SettingsResponse,
} from "@/src/lib/settings/types"

interface SettingsContextValue {
  /** Fully-merged settings (defaults applied), always non-null. */
  settings: SettingsDocument
  /** Convenience accessors. */
  inventoryFields: InventoryFieldMapping[]
  securityConfig: SecurityConfig
  /** True when no settings doc exists yet OR onboarding hasn't completed. */
  isFirstTime: boolean
  /** Whether a stored doc exists server-side. */
  exists: boolean
  isLoading: boolean
  error: unknown
  /** Re-fetch settings (call after a successful save). */
  refresh: () => Promise<unknown>
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

const fetcher = async (url: string): Promise<SettingsResponse> => {
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) throw new Error(`Failed to load settings: ${res.status}`)
  return res.json()
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { data, error, isLoading, mutate } = useSWR<SettingsResponse>(
    "/api/settings",
    fetcher,
    { revalidateOnFocus: false }
  )

  const value = useMemo<SettingsContextValue>(() => {
    const raw = data?.value ? migrateSettings(data.value) : null
    const settings = withDefaults(raw)
    const exists = Boolean(data?.exists)
    const onboarded = Boolean(settings.general?.onboardingCompletedAt)
    return {
      settings,
      inventoryFields: settings.inventory?.fields ?? [],
      securityConfig: settings.security!,
      isFirstTime: !exists || !onboarded,
      exists,
      isLoading,
      error,
      refresh: () => mutate(),
    }
  }, [data, error, isLoading, mutate])

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) {
    throw new Error("useSettings must be used within a SettingsProvider")
  }
  return ctx
}

/** Safe variant for components that may render outside the provider (e.g. some
 * widgets reused in isolation): returns defaults instead of throwing. */
export function useSettingsOptional(): SettingsContextValue | null {
  return useContext(SettingsContext)
}

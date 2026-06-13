/**
 * Shared types for the server-side settings system.
 *
 * These mirror the JSONB document persisted by the FastAPI `app_settings` table
 * and are the contract the web app (and future native Swift/C# apps) read from.
 */

export type Severity = "ok" | "warning" | "danger" | "neutral" | "unknown"

/** Canonical inventory fields ReportMate understands. Fixed enum so rules and
 * native apps reference stable keys; only the mapping/labels are configurable. */
export const CANONICAL_INVENTORY_KEYS = [
  "usage",
  "catalog",
  "department",
  "area",
  "location",
  "fleet",
  "assetTag",
  "owner",
] as const

export type CanonicalInventoryKey = (typeof CANONICAL_INVENTORY_KEYS)[number]

export interface InventoryFieldMapping {
  /** Canonical key (fixed). */
  key: CanonicalInventoryKey
  /** Key as it appears in the device's Inventory.yaml / inventory JSON. */
  sourceKey: string
  /** Display label. */
  label: string
  /** Display order (ascending). */
  order: number
  /** Whether the field is shown. */
  visible: boolean
  /** Known/allowed values (e.g. usage values), used by rules + filters. */
  knownValues?: string[]
}

export interface SecurityCheckDefault {
  enabledSeverity: Severity
  disabledSeverity: Severity
}

/** Logical security checks the UI colors. Open-ended (string) so orgs can add. */
export type SecurityCheckId = "encryption" | "firewall" | "ssh" | "rdp" | "sip" | (string & {})

export interface RuleOperator {
  in?: string[]
  eq?: string
  ne?: string
}

export interface RuleCondition {
  /** Conditions on the device's inventory context, keyed by canonical key.
   * Multiple keys are AND-ed. */
  inventory?: Partial<Record<CanonicalInventoryKey, RuleOperator>>
}

export interface SecurityRule {
  id: string
  module?: string
  check: SecurityCheckId
  /** Optional concrete field path (for native parity / disambiguation). */
  fieldPath?: string
  when?: RuleCondition
  /** Which value the rule applies to. */
  state?: "enabled" | "disabled" | "any"
  severity: Severity
  enabled?: boolean
}

export interface SecurityConfig {
  /** Baseline severity per check when no rule matches. */
  defaults: Record<string, SecurityCheckDefault>
  rules: SecurityRule[]
}

export interface GeneralSettings {
  fleetName?: string
  defaultPlatformFilter?: string
  /** ISO timestamp; absent/null means onboarding has not run. */
  onboardingCompletedAt?: string | null
  [k: string]: unknown
}

export interface InventorySettings {
  fields: InventoryFieldMapping[]
}

export interface SettingsDocument {
  schemaVersion: number
  general?: GeneralSettings
  inventory?: InventorySettings
  security?: SecurityConfig
}

/** Shape returned by GET /api/settings (proxy → FastAPI). */
export interface SettingsResponse {
  exists: boolean
  value: SettingsDocument | null
  schemaVersion: number
  updatedAt?: string
  updatedBy?: string | null
}

/** One row from the inventory discovery endpoint. */
export interface DiscoveredInventoryKey {
  key: string
  deviceCount: number
  distinctCount: number
  sampleValues: string[]
}

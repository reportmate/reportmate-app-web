/**
 * Default settings used as the fallback before an org has saved any settings
 * (and as the seed for the onboarding wizard). The app renders correctly off
 * these defaults so there's no regression pre-onboarding.
 */

import {
  InventoryFieldMapping,
  SecurityConfig,
  SettingsDocument,
} from "./types"

export const CURRENT_SCHEMA_VERSION = 1

/** Canonical inventory fields with sensible defaults (sourceKey == key). */
export const DEFAULT_INVENTORY_FIELDS: InventoryFieldMapping[] = [
  { key: "usage", sourceKey: "usage", label: "Usage", order: 0, visible: true, knownValues: [] },
  { key: "catalog", sourceKey: "catalog", label: "Catalog", order: 1, visible: true, knownValues: [] },
  { key: "department", sourceKey: "department", label: "Department", order: 2, visible: true, knownValues: [] },
  { key: "area", sourceKey: "area", label: "Area", order: 3, visible: false, knownValues: [] },
  { key: "location", sourceKey: "location", label: "Location", order: 4, visible: true, knownValues: [] },
  { key: "fleet", sourceKey: "fleet", label: "Fleet", order: 5, visible: false, knownValues: [] },
  { key: "assetTag", sourceKey: "assetTag", label: "Asset Tag", order: 6, visible: true, knownValues: [] },
  { key: "owner", sourceKey: "owner", label: "Owner", order: 7, visible: true, knownValues: [] },
]

/**
 * Baseline severities reproduce today's hardcoded behavior so nothing changes
 * visually until an org adds rules:
 *  - encryption/sip off  -> danger (red)
 *  - firewall off        -> warning (amber)
 *  - ssh/rdp on          -> warning (amber); off -> ok
 */
export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  defaults: {
    encryption: { enabledSeverity: "ok", disabledSeverity: "danger" },
    firewall: { enabledSeverity: "ok", disabledSeverity: "warning" },
    ssh: { enabledSeverity: "warning", disabledSeverity: "ok" },
    rdp: { enabledSeverity: "warning", disabledSeverity: "ok" },
    sip: { enabledSeverity: "ok", disabledSeverity: "danger" },
  },
  rules: [],
}

export const DEFAULT_SETTINGS: SettingsDocument = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  general: { onboardingCompletedAt: null },
  inventory: { fields: DEFAULT_INVENTORY_FIELDS },
  security: DEFAULT_SECURITY_CONFIG,
}

/** Starter rules seeded by onboarding: shared/lab devices aren't expected to be
 * encrypted, so don't flag them red. */
export const STARTER_SECURITY_RULES = [
  {
    id: "encryption-shared-neutral",
    module: "security",
    check: "encryption",
    when: { inventory: { usage: { in: ["Shared", "Lab"] } } },
    state: "disabled" as const,
    severity: "neutral" as const,
    enabled: true,
  },
]

/** Merge a (possibly null/partial) stored document with defaults so consumers
 * always get a complete config. */
export function withDefaults(doc: SettingsDocument | null | undefined): SettingsDocument {
  // Always build fresh objects/arrays — never hand back the shared DEFAULT_*
  // singletons, so a consumer mutating the result can't leak across the module.
  if (!doc) return structuredClone(DEFAULT_SETTINGS)
  return {
    schemaVersion: doc.schemaVersion ?? CURRENT_SCHEMA_VERSION,
    general: { ...DEFAULT_SETTINGS.general, ...(doc.general ?? {}) },
    inventory: {
      fields:
        doc.inventory?.fields && doc.inventory.fields.length > 0
          ? structuredClone(doc.inventory.fields)
          : structuredClone(DEFAULT_INVENTORY_FIELDS),
    },
    security: {
      defaults: { ...structuredClone(DEFAULT_SECURITY_CONFIG.defaults), ...(doc.security?.defaults ?? {}) },
      rules: doc.security?.rules ? structuredClone(doc.security.rules) : [],
    },
  }
}

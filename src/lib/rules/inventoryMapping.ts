/**
 * Turns raw inventory JSON into display rows using the org's field mapping, and
 * builds the canonical inventory context the security evaluator consumes.
 */

import { DEFAULT_INVENTORY_FIELDS } from "@/src/lib/settings/defaults"
import {
  CanonicalInventoryKey,
  InventoryFieldMapping,
} from "@/src/lib/settings/types"
import { InventoryContext } from "./evaluateSecurity"

function toSnake(key: string): string {
  return key.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase()
}

function toCamel(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase())
}

/** Resolve a value from raw inventory by source key, tolerating snake/camel
 * casing differences (device JSON mixes `asset_tag` and `assetTag`). */
function resolveValue(raw: Record<string, unknown>, sourceKey: string): string | undefined {
  if (!raw || typeof raw !== "object") return undefined
  const candidates = [sourceKey, toSnake(sourceKey), toCamel(sourceKey)]
  for (const k of candidates) {
    const v = raw[k]
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      return String(v)
    }
  }
  return undefined
}

export interface MappedInventoryRow {
  key: CanonicalInventoryKey
  label: string
  value: string
}

/** Ordered, visible inventory rows for display. */
export function mapInventory(
  rawInventory: Record<string, unknown> | null | undefined,
  fields: InventoryFieldMapping[] = DEFAULT_INVENTORY_FIELDS
): MappedInventoryRow[] {
  const raw = (rawInventory ?? {}) as Record<string, unknown>
  return [...fields]
    .filter((f) => f.visible)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((f) => {
      const value = resolveValue(raw, f.sourceKey)
      return value === undefined ? null : { key: f.key, label: f.label, value }
    })
    .filter((row): row is MappedInventoryRow => row !== null)
}

/** Canonical-key -> value context for the security rules engine. Includes all
 * mapped fields (regardless of visibility) so rules can key off hidden fields. */
export function getDeviceInventoryContext(
  rawInventory: Record<string, unknown> | null | undefined,
  fields: InventoryFieldMapping[] = DEFAULT_INVENTORY_FIELDS
): InventoryContext {
  const raw = (rawInventory ?? {}) as Record<string, unknown>
  const ctx: InventoryContext = {}
  for (const f of fields) {
    const value = resolveValue(raw, f.sourceKey)
    if (value !== undefined) ctx[f.key] = value
  }
  return ctx
}

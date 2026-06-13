/**
 * Forward-migration of stored settings documents. When the document shape
 * changes, bump CURRENT_SCHEMA_VERSION (in defaults.ts) and add a step here so
 * older saved docs (or those written by an older native app) upgrade in memory
 * before consumers read them.
 */

import { CURRENT_SCHEMA_VERSION } from "./defaults"
import { SettingsDocument } from "./types"

export function migrateSettings(doc: SettingsDocument): SettingsDocument {
  let migrated = doc
  const version = migrated.schemaVersion ?? 1

  // No migrations needed yet (v1 is current). Future steps go here, e.g.:
  // if (version < 2) { migrated = { ...migrated, /* v1 -> v2 */ schemaVersion: 2 } }

  if (version !== CURRENT_SCHEMA_VERSION) {
    migrated = { ...migrated, schemaVersion: CURRENT_SCHEMA_VERSION }
  }
  return migrated
}

/**
 * Module slot registry.
 *
 * Extension modules (server-attached integrations or installed add-ons) declare
 * where they render via *mount points* — named slots that host components expose
 * (e.g. `device.security.cards`, `report.security.widgets`). A module either
 * ships a custom component for its slot or falls back to the GenericModulePanel,
 * so it is usable the moment its data lands on a device.
 *
 * This keeps rendering source-agnostic: a module's data may arrive from a client
 * collector or a server-side `POST /device/{serial}/module/{id}` ingress — the
 * slot host renders it the same way.
 */

import type { ComponentType } from 'react'

/** Props every slot component receives. `data` is the module's JSONB payload. */
export interface ModuleSlotComponentProps {
  moduleId: string
  data: any
  device?: any
}

export interface ModuleMount {
  /** Named slot a host component exposes, e.g. 'device.security.cards'. */
  slot: string
  /** Custom renderer; omit to use the GenericModulePanel fallback. */
  component?: ComponentType<ModuleSlotComponentProps>
  /** Lower renders earlier within a slot. Defaults to 100. */
  order?: number
}

interface Registration {
  moduleId: string
  mount: ModuleMount
}

/**
 * Core modules render through their own dedicated tabs and must never be
 * treated as extensions or double-rendered in a slot.
 */
export const CORE_MODULE_IDS: ReadonlySet<string> = new Set([
  'system', 'hardware', 'network', 'installs', 'security', 'applications',
  'inventory', 'management', 'peripherals', 'identity', 'events', 'profiles',
  'displays', 'printers',
])

const _registrations: Registration[] = []

/** Register a module's mount. Idempotent per (moduleId, slot). */
export function registerModuleMount(moduleId: string, mount: ModuleMount): void {
  const exists = _registrations.some(
    (r) => r.moduleId === moduleId && r.mount.slot === mount.slot,
  )
  if (!exists) _registrations.push({ moduleId, mount })
}

/**
 * Populate the registry from loaded module manifests. A manifest may declare
 * `mounts: ModuleMount[]`; each becomes a registration. Safe to call repeatedly.
 */
export function syncMountsFromManifests(
  manifests: Array<{ id: string; mounts?: ModuleMount[] }>,
): void {
  for (const manifest of manifests) {
    for (const mount of manifest.mounts ?? []) {
      registerModuleMount(manifest.id, mount)
    }
  }
}

export interface SlotContribution {
  moduleId: string
  data: any
  component?: ModuleMount['component']
  order: number
}

/**
 * Contributions for a slot that actually have data on this device, ordered.
 * A registered mount with no data on the device is skipped.
 */
export function getSlotContributions(slot: string, device: any): SlotContribution[] {
  const modules = device?.modules || {}
  return _registrations
    .filter((r) => r.mount.slot === slot && modules[r.moduleId] != null)
    .map((r) => ({
      moduleId: r.moduleId,
      data: modules[r.moduleId],
      component: r.mount.component,
      order: r.mount.order ?? 100,
    }))
    .sort((a, b) => a.order - b.order)
}

/** Test/hot-reload helper. */
export function _resetModuleMounts(): void {
  _registrations.length = 0
}

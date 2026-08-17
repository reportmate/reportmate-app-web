/**
 * ModuleSlot
 *
 * Host for a named mount point. Drop `<ModuleSlot slot="device.security.cards"
 * device={device} />` into any tab or report; it renders every registered
 * module contribution that has data on this device — each via its custom
 * component, or the GenericModulePanel fallback. Renders nothing when there are
 * no contributions, so adding a slot to a host is inert until a module mounts.
 */

import React from 'react'

import { getSlotContributions } from '../../lib/modules/moduleSlots'
import { GenericModulePanel } from './GenericModulePanel'

interface ModuleSlotProps {
  slot: string
  device: any
}

export const ModuleSlot: React.FC<ModuleSlotProps> = ({ slot, device }) => {
  const contributions = getSlotContributions(slot, device)
  if (contributions.length === 0) return null

  return (
    <>
      {contributions.map((c) => {
        const Custom = c.component
        return Custom ? (
          <Custom key={c.moduleId} moduleId={c.moduleId} data={c.data} device={device} />
        ) : (
          <GenericModulePanel key={c.moduleId} moduleId={c.moduleId} data={c.data} />
        )
      })}
    </>
  )
}

export default ModuleSlot

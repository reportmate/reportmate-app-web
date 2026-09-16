export interface InstalledUpdate {
  id?: string | null
  title?: string | null
  installedOn?: string | null
}

export interface SystemSearchRecord {
  deviceName?: string | null
  serialNumber?: string | null
  assetTag?: string | null
  operatingSystem?: string | null
  osVersion?: string | null
  buildNumber?: string | null
  installedUpdates?: InstalledUpdate[] | null
}

const searchableUpdateText = (update: InstalledUpdate) =>
  [update.id, update.title, update.installedOn]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

export function matchingInstalledUpdates(
  device: SystemSearchRecord,
  query: string,
): InstalledUpdate[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return []
  return (device.installedUpdates || []).filter(update =>
    searchableUpdateText(update).includes(normalized),
  )
}

export function matchesSystemSearch(device: SystemSearchRecord, query: string): boolean {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return true

  const systemText = [
    device.deviceName,
    device.serialNumber,
    device.assetTag,
    device.operatingSystem,
    device.osVersion,
    device.buildNumber,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return systemText.includes(normalized) || matchingInstalledUpdates(device, normalized).length > 0
}

export function updatesToDisplay(device: SystemSearchRecord, query: string): InstalledUpdate[] {
  const matches = matchingInstalledUpdates(device, query)
  if (matches.length > 0) return matches.slice(0, 2)

  return [...(device.installedUpdates || [])]
    .sort((a, b) => String(b.installedOn || '').localeCompare(String(a.installedOn || '')))
    .slice(0, 1)
}

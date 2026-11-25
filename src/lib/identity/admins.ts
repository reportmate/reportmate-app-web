interface AdminDevice {
  serialNumber: string
  deviceName: string
  adminUsernames?: string[]
  adminAccounts?: { username: string; creationTime?: string | null }[]
}

const day = 86_400_000

function ageDays(creationTime: string | null, now: number) {
  const date = creationTime ? Date.parse(creationTime) : NaN
  return Number.isFinite(date) && date <= now ? Math.floor((now - date) / day) : null
}

export function adminAge(creationTime: string | null, now = Date.now()) {
  const days = ageDays(creationTime, now)
  return days === null ? 'Unknown' : days === 1 ? '1 day' : `${days.toLocaleString()} days`
}

export function adminAssignments<D extends AdminDevice>(devices: D[], adminFilter?: string | null, search = '') {
  const selected = adminFilter?.toLowerCase()
  const query = search.trim().toLowerCase()
  return devices.flatMap(device => {
    const metadata = new Map((device.adminAccounts ?? []).map(account => [account.username.toLowerCase(), account.creationTime ?? null]))
    const seen = new Set<string>()
    const deviceMatches = [device.deviceName, device.serialNumber].some(value => (value ?? '').toLowerCase().includes(query))
    return (device.adminUsernames ?? []).flatMap(admin => {
      const key = admin.toLowerCase()
      if (seen.has(key) || (selected && key !== selected) || (!deviceMatches && !key.includes(query))) return []
      seen.add(key)
      return [{ admin, device, creationTime: metadata.get(key) ?? null }]
    })
  }).sort((a, b) => a.admin.localeCompare(b.admin, undefined, { sensitivity: 'base' }) ||
    (a.device.deviceName ?? '').localeCompare(b.device.deviceName ?? ''))
}

export function adminWidgetCounts(devices: AdminDevice[], now = Date.now()) {
  const names = new Map<string, { label: string; count: number }>()
  const countsByDevice = new Map<string, number>()
  const ages = [0, 0, 0, 0]
  for (const { admin, device, creationTime } of adminAssignments(devices)) {
    const key = admin.toLowerCase()
    const entry = names.get(key) ?? { label: admin, count: 0 }
    entry.count++
    names.set(key, entry)
    countsByDevice.set(device.serialNumber, (countsByDevice.get(device.serialNumber) ?? 0) + 1)
    const days = ageDays(creationTime, now)
    ages[days === null ? 3 : days < 30 ? 0 : days < 365 ? 1 : 2]++
  }

  const perDevice = [0, 0, 0]
  for (const device of devices) {
    const count = countsByDevice.get(device.serialNumber) ?? 0
    perDevice[Math.min(count, 2)]++
  }

  return [
    { title: 'Admin Account Age', entries: ['Under 30 days', '30–364 days', '365 days or more', 'Unknown'].map((label, i) => ({ label, count: ages[i] })) },
    { title: 'Administrators per Device', entries: ['None reported', '1 administrator', '2 or more administrators'].map((label, i) => ({ label, count: perDevice[i] })) },
    { title: 'Administrator Names', byName: true, entries: [...names.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)) },
  ]
}

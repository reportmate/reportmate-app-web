/**
 * Pure install-status logic: how a reported item is classified, what text it
 * contributes, and how those roll up across a fleet.
 *
 * Kept out of `useInstallsData` on purpose -- that module pulls in SWR and a
 * "use client" boundary, and none of this needs either. Everything here is a
 * plain function over the installs payload, so it can be unit tested and used
 * from server code.
 */

/**
 * Get all install items from a device, checking both Cimian and Munki paths.
 * Cimian is preferred; falls back to Munki items if no Cimian data.
 */
/**
 * Munki reports a run's warnings as one semicolon/newline-joined string on the
 * run, not on the item they concern ("Download of Excel failed: error -1005").
 * The Warnings card reads that string; the Items with Warnings box read only
 * items, so it stayed at zero on macOS. This attributes each run-level warning
 * to its package by the name embedded in the text, so both agree.
 */
export interface RunLevelWarning {
  message: string
  itemName: string | null
}

const RUN_WARNING_ITEM_PATTERNS: RegExp[] = [
  /^(?:Download|Install|Installation|Removal|Update) of (.+?) failed/i,
  /Could not process item (\S+)/i,
  /Will not attempt to remove (\S+)/i,
  /^(\S+) (?:requires|is not|was not|could not)/i,
]

/** The package a Munki run message is about, or null when it names none. */
export function itemNameFromMessage(message: string): string | null {
  for (const pattern of RUN_WARNING_ITEM_PATTERNS) {
    const match = message.match(pattern)
    if (match) return match[1].replace(/[.,:]+$/, '')
  }
  return null
}

export function runLevelWarnings(device: any): RunLevelWarning[] {
  const raw = device?.modules?.installs?.munki?.warnings
  if (typeof raw !== 'string' || raw.trim() === '') return []
  return raw
    .split(/WARNING:|[\n\r]+/)
    .map((w: string) => w.trim())
    .filter(Boolean)
    .map((message: string) => ({ message, itemName: itemNameFromMessage(message) }))
}

export function getDeviceInstallItems(device: any): any[] {
  const cimianItems = device?.modules?.installs?.cimian?.items
  if (cimianItems && cimianItems.length > 0) return cimianItems
  return device?.modules?.installs?.munki?.items || []
}

/**
 * Categorize devices by install status
 * Returns arrays of devices with errors, warnings, pending, and healthy installs
 * Note: Warnings and Pending are DIFFERENT categories:
 *   - Warnings: Items that need attention (warning status, needs-attention)
 *   - Pending: Items scheduled for installation/removal (will-be-installed, update-available, etc.)
 */
export function categorizeDevicesByInstallStatus(devices: any[]) {
  const devicesWithErrors: any[] = []
  const devicesWithWarnings: any[] = []
  const devicesWithPending: any[] = []
  const devicesWithSuccess: any[] = []
  const healthyDevices: any[] = []
  
  for (const device of devices) {
    // Skip archived devices
    if (device.archived === true) continue
    
    const items = getDeviceInstallItems(device)

    const hasError = items.some(isErrorItem)
    // Warnings are issues that need attention - NOT pending changes
    const hasWarning = items.some(isWarningItem) || runLevelWarnings(device).length > 0
    // Pending are scheduled changes - installations, removals, updates
    const hasPending = items.some(isPendingItem)
    // Success is an install that actually completed in the most recent run
    const hasSuccess = items.some(isSuccessItem)
    
    // Devices can be in multiple categories - they're not mutually exclusive
    // A device with errors can also have pending items
    if (hasError) {
      devicesWithErrors.push(device)
    }
    if (hasWarning) {
      devicesWithWarnings.push(device)
    }
    if (hasPending) {
      devicesWithPending.push(device)
    }
    if (hasSuccess) {
      devicesWithSuccess.push(device)
    }
    if (!hasError && !hasWarning && !hasPending) {
      healthyDevices.push(device)
    }
  }
  
  return { devicesWithErrors, devicesWithWarnings, devicesWithPending, devicesWithSuccess, healthyDevices }
}

/**
 * Status predicates for a single install item, shared by every view that
 * splits items into errors / warnings / pending.
 *
 * The API classifies each item at ingest and stores the answer on the item as
 * `reportmateStatus`, so this reads that field first and everything — the
 * device page, the drill-downs, the dashboard tiles — agrees by construction.
 * The ladder below is the fallback for items stored before that shipped, and
 * mirrors the server's exactly.
 *
 * Munki and Cimian are not different problems. Both fill `currentStatus` from
 * one Installed/Pending/Warning/Error/Removed vocabulary — the Munki fork's
 * session logger writes it and the Mac client copies it across. What differs
 * is that a status of Installed is a claim about *presence*, not about how the
 * last attempt went: both tools report an item as Installed while recording a
 * failure against it in `lastAttemptStatus` or `lastError`. So a status that
 * names a problem wins, a status that merely names presence does not, and
 * legacy Munki — which has no normalized status at all — is served by the same
 * message fallback rather than by a platform special case.
 */
type ItemStatusCategory = 'error' | 'warning' | 'pending' | 'success' | null

/** The state the API computed at ingest, when the item carries one. */
function storedCategory(item: any): ItemStatusCategory {
  switch (item?.reportmateStatus) {
    case 'error': return 'error'
    case 'warning': return 'warning'
    case 'pending': return 'pending'
    case 'installed': return 'success'
    default: return null
  }
}

/**
 * Whether the tool's verdict says the item is fine. currentStatus/mappedStatus
 * is written after the run, so Installed and Removed are judgements: an
 * installed item's last attempt succeeded, or it would not be installed.
 * Distinct from the 'success' category below, which means installed in the
 * MOST RECENT run rather than merely present.
 */
function verdictIsGood(item: any): boolean {
  const status = String(item?.currentStatus || item?.mappedStatus || '')
    .toLowerCase().replace(/[ _]/g, '-')
  if (!status || status === 'not-installed') return false
  return ['installed', 'removed', 'uninstalled', 'install-succeeded', 'completed', 'success']
    .includes(status)
}

function statusCategory(raw: any): ItemStatusCategory {
  // One state is spelled three ways across live payloads — "Update Available",
  // "update-available", "update_available" — so normalize before matching.
  const status = String(raw || '').toLowerCase().replace(/[ _]/g, '-')
  if (!status) return null
  // A status of "Install Loop" is a failure: the package reinstalls every run
  // and never lands. Cimian's client files it under the run's failed items, so
  // the events feed shows it red — reading it as a warning here is what made
  // the feed and the tiles disagree.
  if (status.includes('error') || status.includes('failed') || status.includes('problem') ||
      status.includes('install-loop') || status === 'needs-reinstall') {
    return 'error'
  }
  // Each of these contains a token meaning the opposite of what it says, so
  // they have to match exactly: "not-installed" contains "installed" (the
  // package is managed, was expected, and is absent) and "not-available"
  // contains "available" (the catalog does not offer a package this device is
  // managed for — Cimian raises it as a warning item).
  if (status.includes('warning') || status === 'needs-attention' ||
      status === 'not-installed' || status === 'not-available') {
    return 'warning'
  }
  if (status.includes('pending') || status.includes('will-be-installed') ||
      status.includes('update-available') || status.includes('will-be-removed') ||
      status.includes('scheduled') || status.includes('available') ||
      status.includes('downloading') || status.includes('installing') ||
      status === 'skipped' || status === 'unknown') {
    return 'pending'
  }
  // An install that ran and completed in the MOST RECENT run. Distinct from the
  // vastly larger 'installed' set, which only says the package is present.
  if (status === 'install-succeeded' || status === 'completed' || status === 'success') {
    return 'success'
  }
  return null
}

/**
 * Whether the run itself attributed this message, rather than the client having
 * scraped it out of the Munki run log and matched it to an item by name. The
 * fork stamps lastSeenInSession when a warning or error came from the session's
 * own warningItems; a log scrape carries no stamp and produces no event, so
 * counting it shows a warning the events feed can never back.
 */
function runReported(item: any, hasSessions: boolean): boolean {
  if (!hasSessions) return true
  return hasText(item?.lastSeenInSession)
}

/** A flag that arrives as a boolean from Cimian and as 1 from the Mac client. */
function isTrue(value: any): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') return ['true', 'yes', '1'].includes(value.trim().toLowerCase())
  return false
}

/** A package that reinstalls every run is not healthy, however it reports. */
function hasInstallLoop(item: any): boolean {
  return isTrue(item?.hasInstallLoop) || isTrue(item?.installLoopDetected)
}

function hasText(value: any): boolean {
  return typeof value === 'string' && value.trim() !== ''
}

// Cimian leaves `currentStatus` at "Installed" for an item whose most recent
// attempt raised a warning or failed, and records the outcome in
// `lastAttemptStatus` instead (with no message text). Read it when the status
// itself says nothing, or every Windows warning is invisible.
function attemptCategory(item: any): ItemStatusCategory {
  const attempt = (item?.lastAttemptStatus || '').toLowerCase()
  if (!attempt) return null
  if (attempt.includes('warn')) return 'warning'
  if (attempt.includes('fail') || attempt.includes('error')) return 'error'
  return null
}

/** The item's state, by the same ladder the API applies at ingest. */
export function itemCategory(item: any, hasSessions = false): ItemStatusCategory {
  const stored = storedCategory(item)
  if (stored) return stored

  // A verdict naming a problem settles it.
  const verdict = statusCategory(item?.currentStatus || item?.mappedStatus)
  if (verdict === 'error' || verdict === 'warning') return verdict

  // So does a verdict saying the item is fine — nothing below can overturn it
  // except a detected install loop.
  if (verdictIsGood(item)) return hasInstallLoop(item) ? 'warning' : verdict

  // Legacy Munki writes only `status`, a statement about presence rather than a
  // verdict, so a message still speaks. Pending likewise says an install is
  // owed — often owed precisely because the last attempt warned.
  const presence = statusCategory(item?.status)
  if (presence === 'error' || presence === 'warning') return presence

  // Only consulted with no verdict. Against a verdict of Installed a bare
  // lastAttemptStatus is not evidence: every such mismatch in the fleet carried
  // no message, no failureCount and no warningCount.
  const attempt = attemptCategory(item)
  if (attempt === 'error' || attempt === 'warning') return attempt

  if (runReported(item, hasSessions)) {
    if (hasText(item?.lastError)) return 'error'
    if (hasText(item?.lastWarning)) return 'warning'
  }
  if (hasInstallLoop(item)) return 'warning'
  return verdict ?? presence
}

export function isErrorItem(item: any): boolean {
  return itemCategory(item) === 'error'
}

export function isWarningItem(item: any): boolean {
  return itemCategory(item) === 'warning'
}

export function isPendingItem(item: any): boolean {
  return itemCategory(item) === 'pending'
}

export function isSuccessItem(item: any): boolean {
  return itemCategory(item) === 'success'
}

export type ItemStatusFilter = 'errors' | 'warnings' | 'pending' | 'success' | 'all'

export function matchesItemStatus(item: any, statusFilter: ItemStatusFilter): boolean {
  if (statusFilter === 'all') return true
  if (statusFilter === 'errors') return isErrorItem(item)
  if (statusFilter === 'warnings') return isWarningItem(item)
  if (statusFilter === 'success') return isSuccessItem(item)
  return isPendingItem(item)
}

function firstText(...values: any[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() !== '') return value.trim()
  }
  return ''
}

/**
 * The line of text an item contributes to its drill-down.
 *
 * Errors and warnings carry real text from the install run. Successes and
 * pending items carry none — neither client records a success string — so the
 * version is the message: what landed, or what is waiting to. Cimian leaves
 * `installedVersion` empty and reports `latestVersion` instead, so both are
 * read. An item with no version at all returns '' and the caller renders it as
 * unreported rather than inventing text.
 */
export function getItemMessage(item: any, messageType: ItemStatusFilter): string {
  if (messageType === 'errors') return firstText(item?.lastError)
  if (messageType === 'warnings') return firstText(item?.lastWarning)
  if (messageType === 'success') {
    const version = firstText(item?.installedVersion, item?.version, item?.latestVersion)
    return version ? `Installed ${version}` : ''
  }
  if (messageType === 'pending') {
    const reason = firstText(item?.pendingReason)
    if (reason) return reason
    const target = firstText(item?.version, item?.latestVersion)
    return target ? `Waiting to install ${target}` : ''
  }
  return ''
}

/** When the item last changed state, for the drill-down's timestamp column. */
export function getItemTimestamp(item: any): string {
  return firstText(item?.endTime, item?.lastAttemptTime, item?.lastUpdate)
}

/**
 * Get install items with a specific status from all devices
 */
export function getInstallItemsByStatus(devices: any[], statusFilter: ItemStatusFilter) {
  const items: any[] = []

  for (const device of devices) {
    for (const item of getDeviceInstallItems(device)) {
      if (matchesItemStatus(item, statusFilter)) {
        items.push({ ...item, device })
      }
    }
  }

  return items
}

/**
 * Interface for aggregated install messages
 */
export interface AggregatedInstallMessage {
  message: string
  count: number
  devices: Array<{
    serialNumber: string
    deviceName: string
    itemName?: string
    timestamp?: string
  }>
  type: 'error' | 'warning'
  source?: string // e.g., 'cimian', 'munki'
}

/**
 * Aggregate all error messages from devices
 * Groups identical messages and counts occurrences
 * Similar to MunkiReport's "Munki Errors" widget
 */
export function aggregateInstallErrors(devices: any[]): AggregatedInstallMessage[] {
  const errorMap = new Map<string, AggregatedInstallMessage>()
  
  for (const device of devices) {
    if (device.archived === true) continue
    
    const deviceName = device.modules?.inventory?.deviceName || device.serialNumber || 'Unknown'
    const serialNumber = device.serialNumber || device.deviceId || 'Unknown'
    
    // Cimian and Munki both attach the run's message to the item
    for (const item of getDeviceInstallItems(device)) {
      if (item.lastError && item.lastError.trim() !== '') {
        const errorMsg = item.lastError.trim()
        const existing = errorMap.get(errorMsg)
        
        if (existing) {
          existing.count++
          existing.devices.push({
            serialNumber,
            deviceName,
            itemName: item.itemName || item.name,
            timestamp: item.lastUpdate || item.lastAttemptTime
          })
        } else {
          errorMap.set(errorMsg, {
            message: errorMsg,
            count: 1,
            devices: [{
              serialNumber,
              deviceName,
              itemName: item.itemName || item.name,
              timestamp: item.lastUpdate || item.lastAttemptTime
            }],
            type: 'error',
            source: device.modules?.installs?.cimian ? 'cimian' : 'munki'
          })
        }
      }
    }
    
    // Check Munki errors (if available)
    const munkiData = device.modules?.installs?.munki
    if (munkiData?.errors && munkiData.errors.trim() !== '') {
      // Munki can have multiple errors concatenated, split by common delimiters
      const munkiErrors = munkiData.errors.split(/ERROR:|[\n\r]+/).filter((e: string) => e.trim())
      for (const errorMsg of munkiErrors) {
        const trimmedError = errorMsg.trim()
        if (!trimmedError) continue
        
        const existing = errorMap.get(trimmedError)
        if (existing) {
          existing.count++
          existing.devices.push({
            serialNumber,
            deviceName,
            timestamp: munkiData.endTime
          })
        } else {
          errorMap.set(trimmedError, {
            message: trimmedError,
            count: 1,
            devices: [{
              serialNumber,
              deviceName,
              timestamp: munkiData.endTime
            }],
            type: 'error',
            source: 'munki'
          })
        }
      }
    }
  }
  
  // Sort by count (most common first)
  return Array.from(errorMap.values()).sort((a, b) => b.count - a.count)
}

/**
 * Aggregate all warning messages from devices
 * Groups identical messages and counts occurrences
 * Similar to MunkiReport's "Munki Warnings" widget
 */
export function aggregateInstallWarnings(devices: any[]): AggregatedInstallMessage[] {
  const warningMap = new Map<string, AggregatedInstallMessage>()
  
  for (const device of devices) {
    if (device.archived === true) continue
    
    const deviceName = device.modules?.inventory?.deviceName || device.serialNumber || 'Unknown'
    const serialNumber = device.serialNumber || device.deviceId || 'Unknown'
    
    // Cimian and Munki both attach the run's message to the item. Munki stamps a
    // failed download with both lastError and lastWarning, so an item that is an
    // error is skipped here or every failure is counted twice and the Warnings
    // card disagrees with the Items with Warnings box.
    for (const item of getDeviceInstallItems(device)) {
      if (isErrorItem(item)) continue
      if (item.lastWarning && item.lastWarning.trim() !== '') {
        const warningMsg = item.lastWarning.trim()
        const existing = warningMap.get(warningMsg)
        
        if (existing) {
          existing.count++
          existing.devices.push({
            serialNumber,
            deviceName,
            itemName: item.itemName || item.name,
            timestamp: item.lastUpdate || item.lastAttemptTime
          })
        } else {
          warningMap.set(warningMsg, {
            message: warningMsg,
            count: 1,
            devices: [{
              serialNumber,
              deviceName,
              itemName: item.itemName || item.name,
              timestamp: item.lastUpdate || item.lastAttemptTime
            }],
            type: 'warning',
            source: device.modules?.installs?.cimian ? 'cimian' : 'munki'
          })
        }
      }
    }
    
    // Check Munki warnings (if available)
    const munkiData = device.modules?.installs?.munki
    if (munkiData?.warnings && munkiData.warnings.trim() !== '') {
      // Munki can have multiple warnings, split by common delimiters
      const munkiWarnings = munkiData.warnings.split(/WARNING:|[\n\r]+/).filter((w: string) => w.trim())
      for (const warningMsg of munkiWarnings) {
        const trimmedWarning = warningMsg.trim()
        if (!trimmedWarning) continue
        
        const existing = warningMap.get(trimmedWarning)
        if (existing) {
          existing.count++
          existing.devices.push({
            serialNumber,
            deviceName,
            timestamp: munkiData.endTime
          })
        } else {
          warningMap.set(trimmedWarning, {
            message: trimmedWarning,
            count: 1,
            devices: [{
              serialNumber,
              deviceName,
              timestamp: munkiData.endTime
            }],
            type: 'warning',
            source: 'munki'
          })
        }
      }
    }
    
    // Also check problemInstalls
    if (munkiData?.problemInstalls && munkiData.problemInstalls.trim() !== '') {
      const problemMsg = `Problem installs: ${munkiData.problemInstalls.trim()}`
      const existing = warningMap.get(problemMsg)
      if (existing) {
        existing.count++
        existing.devices.push({
          serialNumber,
          deviceName,
          timestamp: munkiData.endTime
        })
      } else {
        warningMap.set(problemMsg, {
          message: problemMsg,
          count: 1,
          devices: [{
            serialNumber,
            deviceName,
            timestamp: munkiData.endTime
          }],
          type: 'warning',
          source: 'munki'
        })
      }
    }
  }
  
  // Sort by count (most common first)
  return Array.from(warningMap.values()).sort((a, b) => b.count - a.count)
}

/** One device/package pair that reported a given message. */
export interface InstallMessageOccurrence {
  serialNumber: string
  deviceName: string
  assetTag?: string
  itemName: string
  status: string
  /** When the item last changed state, when the client reported it. */
  timestamp?: string
  lastSeen?: string
}

/** One device that reported a message, and the packages it reported it for. */
export interface InstallMessageDevice {
  serialNumber: string
  deviceName: string
  assetTag?: string
  itemNames: string[]
  timestamp?: string
  lastSeen?: string
}

/** Distinct message text, with every device/package that reported it. */
export interface InstallMessageGroup {
  message: string
  itemNames: string[]
  occurrences: InstallMessageOccurrence[]
  /** One entry per device, deduped: a device hitting five packages with the
   *  same message is one device, not five. */
  devices: InstallMessageDevice[]
  deviceCount: number
}

/**
 * Group every item in the given status across the given devices by its message.
 *
 * The device table answers "which machines"; this answers "what actually
 * happened", which otherwise takes one click per device to find out. For
 * successes the message is the version, so the grouping doubles as "which build
 * landed where". Items carrying the status but no message text are collected
 * under the empty message so the group counts still reconcile with the device
 * table.
 */
export function aggregateStatusMessages(
  devices: any[],
  messageType: 'errors' | 'warnings' | 'pending' | 'success',
  options: { itemNameFilter?: string } = {}
): InstallMessageGroup[] {
  const groups = new Map<string, InstallMessageGroup>()
  const nameFilter = options.itemNameFilter?.toLowerCase() || ''

  for (const device of devices) {
    if (device.archived === true) continue

    const deviceName = device.modules?.inventory?.deviceName || device.serialNumber || 'Unknown'
    const serialNumber = device.serialNumber || device.deviceId || 'Unknown'
    const assetTag = device.modules?.inventory?.assetTag

    for (const item of getDeviceInstallItems(device)) {
      if (!matchesItemStatus(item, messageType)) continue

      const itemName = item.itemName || item.name || item.displayName || 'Unknown'
      const message = getItemMessage(item, messageType)
      const timestamp = getItemTimestamp(item)
      if (nameFilter && !itemName.toLowerCase().includes(nameFilter) && !message.toLowerCase().includes(nameFilter)) {
        continue
      }

      let group = groups.get(message)
      if (!group) {
        group = { message, itemNames: [], occurrences: [], devices: [], deviceCount: 0 }
        groups.set(message, group)
      }
      if (!group.itemNames.includes(itemName)) group.itemNames.push(itemName)
      group.occurrences.push({
        serialNumber,
        deviceName,
        assetTag,
        itemName,
        status: item.currentStatus || item.status || '',
        timestamp,
        lastSeen: device.lastSeen,
      })
    }
  }

  for (const group of groups.values()) {
    const byDevice = new Map<string, InstallMessageDevice>()
    for (const occurrence of group.occurrences) {
      let device = byDevice.get(occurrence.serialNumber)
      if (!device) {
        device = {
          serialNumber: occurrence.serialNumber,
          deviceName: occurrence.deviceName,
          assetTag: occurrence.assetTag,
          itemNames: [],
          timestamp: occurrence.timestamp,
          lastSeen: occurrence.lastSeen,
        }
        byDevice.set(occurrence.serialNumber, device)
      }
      if (!device.itemNames.includes(occurrence.itemName)) device.itemNames.push(occurrence.itemName)
    }
    group.devices = Array.from(byDevice.values()).sort((a, b) => a.deviceName.localeCompare(b.deviceName))
    group.deviceCount = group.devices.length
    group.itemNames.sort((a, b) => a.localeCompare(b))
  }

  // Most widespread first, with the "no message reported" bucket pinned last so
  // it never pushes an actionable message off the top of the table.
  return Array.from(groups.values()).sort((a, b) => {
    if (!a.message !== !b.message) return a.message ? -1 : 1
    if (b.deviceCount !== a.deviceCount) return b.deviceCount - a.deviceCount
    return a.message.localeCompare(b.message)
  })
}

/**
 * Get error/warning messages for a specific package item across all devices
 * Used when clicking on an item in the Items with Errors/Warnings widgets
 */
export function getMessagesForItem(
  devices: any[], 
  itemName: string, 
  messageType: 'errors' | 'warnings'
): AggregatedInstallMessage[] {
  const messageMap = new Map<string, AggregatedInstallMessage>()
  
  for (const device of devices) {
    if (device.archived === true) continue
    
    const deviceName = device.modules?.inventory?.deviceName || device.serialNumber || 'Unknown'
    const serialNumber = device.serialNumber || device.deviceId || 'Unknown'
    
    for (const item of getDeviceInstallItems(device)) {
      const currentItemName = item.itemName || item.name || ''
      if (currentItemName.toLowerCase() !== itemName.toLowerCase()) continue
      
      const messageField = messageType === 'errors' ? item.lastError : item.lastWarning
      if (messageField && messageField.trim() !== '') {
        const message = messageField.trim()
        const existing = messageMap.get(message)
        
        if (existing) {
          existing.count++
          existing.devices.push({
            serialNumber,
            deviceName,
            itemName: currentItemName,
            timestamp: item.lastUpdate || item.lastAttemptTime
          })
        } else {
          messageMap.set(message, {
            message,
            count: 1,
            devices: [{
              serialNumber,
              deviceName,
              itemName: currentItemName,
              timestamp: item.lastUpdate || item.lastAttemptTime
            }],
            type: messageType === 'errors' ? 'error' : 'warning',
            source: device.modules?.installs?.cimian ? 'cimian' : 'munki'
          })
        }
      }
    }
  }
  
  // Sort by count (most common first)
  return Array.from(messageMap.values()).sort((a, b) => b.count - a.count)
}

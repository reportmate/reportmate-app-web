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
    const hasWarning = items.some(isWarningItem)
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
 * Cimian records a failure in `currentStatus`, so status alone classifies it.
 * Munki keeps `status` factual — an item whose install failed this run is
 * still reported with its real state, and the run's message is attached to
 * `lastError` / `lastWarning` by the Mac client instead. Classifying on status
 * alone therefore finds no macOS warnings at all, which is why the warnings
 * drill-down came up empty on `?platform=mac` while the API's own counts
 * (which do read `lastWarning`) said otherwise. Status wins when it says
 * something; the message fields are the fallback.
 */
type ItemStatusCategory = 'error' | 'warning' | 'pending' | 'success' | null

function statusCategory(item: any): ItemStatusCategory {
  const status = (item?.currentStatus || item?.status || '').toLowerCase()
  if (!status) return null
  // An install that ran and completed in the MOST RECENT run. Distinct from the
  // vastly larger 'installed' set, which only says the package is present.
  if (status === 'install_succeeded' || status === 'install-succeeded' || status === 'completed') {
    return 'success'
  }
  if (status.includes('error') || status.includes('failed') || status.includes('problem') || status === 'needs_reinstall') {
    return 'error'
  }
  if (status.includes('warning') || status === 'needs-attention') return 'warning'
  if (status.includes('will-be-installed') || status.includes('update-available') ||
      status.includes('update_available') || status.includes('will-be-removed') ||
      status.includes('pending') || status.includes('scheduled') ||
      status === 'managed-update-available') {
    return 'pending'
  }
  return null
}

function hasText(value: any): boolean {
  return typeof value === 'string' && value.trim() !== ''
}

export function isErrorItem(item: any): boolean {
  const category = statusCategory(item)
  if (category) return category === 'error'
  return hasText(item?.lastError)
}

export function isWarningItem(item: any): boolean {
  const category = statusCategory(item)
  if (category) return category === 'warning'
  return !hasText(item?.lastError) && hasText(item?.lastWarning)
}

export function isPendingItem(item: any): boolean {
  return statusCategory(item) === 'pending'
}

export function isSuccessItem(item: any): boolean {
  return statusCategory(item) === 'success'
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
    
    // Cimian and Munki both attach the run's message to the item
    for (const item of getDeviceInstallItems(device)) {
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

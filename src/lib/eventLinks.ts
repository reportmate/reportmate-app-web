/**
 * Where a Recent Events row's device link should land.
 *
 * The events list endpoint omits payloads, so module detection runs on the event
 * message. That matters most for installs: a "2 Munki warnings" row has to land on
 * the installs tab with the warning filter already applied, not on the device's
 * default tab, or the operator has to hunt for the two items among 140.
 */

export interface LinkableEvent {
  kind: string
  message?: string
  payload?: Record<string, unknown> | string | null
}

// Munki and Cimian both report through the installs module, and their messages name
// the tool, the action, or the unit — none of which contain the word "installs".
const INSTALLS_MESSAGE = /\b(munki|cimian|managed software|package|packages|install|installs|installed|installing|uninstall|removal|removed|update|updated|pkginfo|manifest|catalog)\b/i

const MODULE_MESSAGE_PATTERNS: Array<[string, RegExp]> = [
  ['hardware', /\b(hardware|cpu|processor|memory|ram|disk|storage|battery)\b/i],
  ['network', /\b(network|wifi|wi-fi|ethernet|dns|dhcp|ip address)\b/i],
  ['security', /\b(security|antivirus|defender|firewall|tpm|encryption|filevault|bitlocker)\b/i],
  ['management', /\b(profile|policy|configuration|management|mdm|enrollment|intune)\b/i],
  ['applications', /\b(application|applications|app)\b/i],
  ['inventory', /\b(inventory|asset tag|serial)\b/i],
  ['peripherals', /\b(peripheral|printer|display|monitor|keyboard|mouse)\b/i],
  ['identity', /\b(identity|account|user|logon)\b/i],
  ['system', /\b(system|operating system|os|uptime|boot)\b/i],
]

/** The installs-tab filter that shows what this event is actually reporting. */
function installsFilterForKind(kind: string): string {
  switch (kind.toLowerCase()) {
    case 'error':
      return 'error'
    case 'warning':
      return 'warning'
    // A success event reports what the run did, which is exactly the Last Run set —
    // the "installed" filter would show the whole inventory instead.
    default:
      return 'last_run'
  }
}

export function getEventModuleId(event: LinkableEvent): string | null {
  if (event.payload && typeof event.payload === 'object') {
    const moduleId = (event.payload as Record<string, unknown>).module_id
    if (typeof moduleId === 'string' && moduleId) return moduleId
  }

  const message = event.message || ''
  if (!message) return null

  // Installs is checked first: its vocabulary overlaps several others ("software
  // update", "configuration profile removed") and it is the tab that benefits most
  // from a filtered landing.
  if (INSTALLS_MESSAGE.test(message)) return 'installs'

  for (const [moduleId, pattern] of MODULE_MESSAGE_PATTERNS) {
    if (pattern.test(message)) return moduleId
  }

  // Success, warning and error events are raised by the managed-software run, so an
  // unmatched one ("AmdAdrenalinDriver warning", "2 warnings") is an installs event
  // whose message simply names the item rather than the tool. Info and system events
  // get no such fallback — they are routine collection chatter.
  if (['success', 'warning', 'error'].includes(event.kind?.toLowerCase())) return 'installs'

  return null
}

/** Path suffix appended to /device/<serial> for an event row's device link. */
export function getEventDeviceHrefSuffix(event: LinkableEvent): string {
  const moduleId = getEventModuleId(event)
  if (!moduleId) return ''
  if (moduleId === 'installs') return `?filter=${installsFilterForKind(event.kind)}#installs`
  return `#${moduleId}`
}

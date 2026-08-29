/**
 * Classify Windows services and scheduled tasks as built-in (shipped with the
 * OS) or third-party, from the paths osquery reports. The client sends no
 * vendor field, so the install location is the signal.
 */

export type WindowsSource = 'windows' | 'third-party'

const OS_PATH_PREFIXES = [
  '\\systemroot\\',
  '%systemroot%',
  '%windir%',
  'system32\\',
  '\\system32\\',
]

/**
 * A service binary under the Windows directory is built-in, with one carve-out:
 * DriverStore\FileRepository is where third-party driver packages are staged,
 * so a driver living there belongs to its vendor even though it sits under
 * C:\Windows.
 */
export function classifyServicePath(path: string | undefined | null): WindowsSource {
  const p = (path || '').trim().toLowerCase().replace(/^"/, '')
  if (!p) return 'windows'
  if (p.includes('\\driverstore\\filerepository\\')) return 'third-party'
  if (/^[a-z]:\\windows\\/.test(p)) return 'windows'
  if (OS_PATH_PREFIXES.some(prefix => p.startsWith(prefix))) return 'windows'
  return 'third-party'
}

/**
 * Task Scheduler keeps everything Microsoft ships under \Microsoft\; anything
 * at the root or in another folder was registered by an installer or a person.
 */
export function classifyTaskPath(path: string | undefined | null): WindowsSource {
  const p = (path || '').trim().toLowerCase()
  return p.startsWith('\\microsoft\\') ? 'windows' : 'third-party'
}

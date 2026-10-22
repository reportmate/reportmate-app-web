/**
 * Application name normalisation for the Applications report and its filters
 * route ("Adobe Photoshop 2026 27.1.0 (x64)" → "Adobe Photoshop"). Names are
 * device-reported, so each input is capped at MAX_APP_NAME_LENGTH characters
 * and no pattern repeats a quantified group back to back, which keeps every
 * match linear.
 */

export const MAX_APP_NAME_LENGTH = 256

/** The Applications report's normaliser (app/applications/page.tsx). */
export function normalizeAppNameForReport(appName: string): string {
  if (!appName || typeof appName !== 'string') return ''
  
  // Device-reported: cap the length so no pattern below can run long
  let normalized = String(appName ?? "").slice(0, MAX_APP_NAME_LENGTH).trim()
  if (!normalized) return ''
  
  // Step 1: Remove placeholder/junk entries
  if (normalized.includes('${{') || normalized.includes('}}')) return ''
  if (normalized === 'Unknown' || normalized === 'N/A') return ''
  
  // Step 2: Handle specific product lines first (before generic patterns)
  
  // Microsoft Visual C++ Redistributables - consolidate all versions
  if (normalized.match(/Microsoft Visual C\+\+ \d{4}/i)) {
    return 'Microsoft Visual C++ Redistributable'
  }
  
  // Microsoft .NET components - aggressive consolidation
  if (normalized.startsWith('Microsoft.NET') || normalized.includes('Microsoft ASP.NET Core')) {
    if (normalized.includes('Workload')) return 'Microsoft .NET Workload'
    if (normalized.includes('Sdk') || normalized.includes('SDK')) return 'Microsoft .NET SDK'
    if (normalized.includes('ASP.NET Core')) return 'Microsoft ASP.NET Core'
    if (normalized.includes('Runtime') || normalized.includes('AppHost') || 
        normalized.includes('Targeting Pack') || normalized.includes('Host FX Resolver')) {
      return 'Microsoft .NET Runtime'
    }
    return 'Microsoft .NET'
  }
  
  // Microsoft Visual Studio Tools
  if (normalized.includes('Microsoft Visual Studio Tools')) {
    return 'Microsoft Visual Studio Tools'
  }
  
  // Office 365 / Microsoft 365
  if (normalized.match(/Microsoft (365|Office 365)/i)) {
    return 'Microsoft 365'
  }
  
  // Kinect Language Packs - consolidate all language variants
  if (normalized.match(/Kinect for Windows Speech Recognition Language Pack/i)) {
    return 'Kinect for Windows Speech Recognition Language Pack'
  }
  
  // Microsoft Language Packs (general pattern)
  if (normalized.match(/Microsoft.*Language Pack/i)) {
    return 'Microsoft Language Pack'
  }
  
  // Kits Configuration Installer
  if (normalized.match(/Kits Configuration Installer/i)) {
    return 'Kits Configuration Installer'
  }
  
  // VRS/VR related software
  if (normalized.match(/Kofax VRS/i)) {
    return 'Kofax VRS'
  }
  
  // Adobe products - normalize across versions
  if (normalized.startsWith('Adobe ')) {
    const product = normalized.match(/Adobe ([A-Za-z\s]+)/)?.[1]?.split(/\s+/)[0]
    if (product && product !== 'AIR') return `Adobe ${product}`
  }
  
  // 7-Zip versions - consolidate all versions
  if (normalized.match(/^7-Zip/i)) {
    return '7-Zip'
  }
  
  // Chrome versions
  if (normalized.match(/Google Chrome|Chrome/i)) {
    return 'Google Chrome'
  }
  
  // Firefox versions
  if (normalized.match(/Mozilla Firefox|Firefox/i)) {
    return 'Mozilla Firefox'
  }
  
  // AMD components
  if (normalized.startsWith('AMD ') && (normalized.includes('Driver') || normalized.includes('Chipset'))) {
    if (normalized.includes('Chipset')) return 'AMD Chipset Software'
    return 'AMD Drivers'
  }
  
  // SOLIDWORKS components
  if (normalized.includes('SOLIDWORKS')) {
    if (normalized.includes('3DEXPERIENCE')) return '3DEXPERIENCE for SOLIDWORKS'
    return 'SOLIDWORKS'
  }
  
  // HP components
  if (normalized.startsWith('HP ') || normalized.includes('HP ')) {
    return 'HP Software'
  }
  
  // Step 3: Generic version number removal (more aggressive)
  
  // Remove version numbers at the end
  normalized = normalized
    // Version patterns: 1.2.3, v1.2, 2024, 2024.1, 20.5.278, etc.
    .replace(/\s+v?\d+(\.\d+)*$/i, '')
    .replace(/\s+\d{4}(\.\d+)*$/i, '') // Year versions
    .replace(/\s+-\s+\d+(\.\d+)*$/i, '') // Dash versions
    .replace(/\s+\(\d+(\.\d+)*\)$/i, '') // Parentheses versions
    .replace(/\s+build\s+\d+/i, '') // Build numbers
    .replace(/\s+\d+(\.\d+)*$/i, '') // Direct versions
    
  // Remove version patterns in the middle (more aggressive)
  normalized = normalized
    .replace(/\s+\d{4}\.\d{2}-\d+/i, '') // Anaconda-style versions: 2025.06-0
    .replace(/\s+\d{1,2}\.\d+\.\d+/i, '') // Standard versions: 10.3.1.3
    .replace(/\s+\d{4}/i, '') // Year versions in middle
    .replace(/\s+v\d+(\.\d+)*/i, '') // v-prefixed versions
  
  // Step 4: Remove architecture and platform info (more aggressive)
  normalized = normalized
    .replace(/\s+(x64|x86|64-bit|32-bit|amd64|i386)$/i, '')
    .replace(/\s+\((x64|x86|64-bit|32-bit|amd64|i386)\)$/i, '')
    .replace(/\s+\(Python\s+[\d\.]+\s+(64-bit|32-bit)\)$/i, '')
    .replace(/\s+\(git\s+[a-f0-9]+\)$/i, '') // Git commit hashes
    .replace(/\s+\([^)]*bit[^)]*\)/i, '') // Any parentheses with "bit"
    .replace(/\s+\([^)]*\d+\.\d+\.\d+[^)]*\)/i, '') // Any parentheses with version numbers
  
  // Step 5: Remove Microsoft-specific runtime suffixes
  normalized = normalized
    .replace(/\s+(Additional Runtime|Minimum Runtime|Redistributable|Shared Framework|Targeting Pack|AppHost Pack|Host FX Resolver|Hosting Support)$/i, '')
    .replace(/\s+-\s+(en-us|x64|x86|\d+(\.\d+)*)$/i, '') // Language codes and versions with dashes
  
  // Step 6: Remove common application suffixes
  normalized = normalized
    .replace(/\s+(Desktop|App|Application|Software|Program|Tool|Suite|Client|Server)$/i, '')
    .replace(/\s+(Pro|Professional|Standard|Basic|Free|Premium|Enterprise|Business|Personal|Home|Student|Education)$/i, '')
    .replace(/\s+(Trial|Beta|Alpha|RC|Release|Final|Portable|Standalone)$/i, '')
  
  // Step 7: Remove update/version info in the middle
  normalized = normalized
    .replace(/\s+Update\s+\d+/i, '') // "Update 1", "Update 2024", etc.
    .replace(/\s+SP\d+/i, '') // Service packs
    .replace(/\s+Patch\s+\d+/i, '') // Patches
  
  // Step 8: Handle specific patterns
  
  // Remove language indicators
  normalized = normalized.replace(/\s+-\s+en-us$/i, '')
  
  // Clean up common words that add no value
  normalized = normalized
    .replace(/\s+for\s+Windows$/i, '')
    .replace(/\s+for\s+Microsoft\s+Windows$/i, '')
    .replace(/\s+Windows\s+Edition$/i, '')
  
  // Step 9: Final cleanup
  normalized = normalized
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/\s*-\s*$/, '') // Remove trailing dashes
    .replace(/^\s*-\s*/, '') // Remove leading dashes
    .trim()
    .replace(/\s+$/, '') // Remove trailing space
    .replace(/^\s+/, '') // Remove leading space
  
  // Step 10: Handle empty results
  if (!normalized || normalized.length < 2) return ''
  
  return normalized
}

/** The filters route's normaliser (app/api/v1/applications/filters/route.ts). */
export function normalizeAppNameForFilters(appName: string): string {
  if (!appName || typeof appName !== 'string') return ''
  
  // Device-reported: cap the length so no pattern below can run long
  let normalized = String(appName ?? "").slice(0, MAX_APP_NAME_LENGTH).trim()
  if (!normalized) return ''
  
  // Step 1: Remove placeholder/junk entries
  if (normalized.includes('${{') || normalized.includes('}}')) return ''
  if (normalized === 'Unknown' || normalized === 'N/A') return ''
  
  // Step 2: Handle specific product lines first
  if (normalized.match(/Microsoft Visual C\+\+ \d{4}/i)) {
    return 'Microsoft Visual C++ Redistributable'
  }
  
  if (normalized.startsWith('Microsoft.NET') || normalized.includes('Microsoft ASP.NET Core')) {
    if (normalized.includes('Workload')) return 'Microsoft .NET Workload'
    if (normalized.includes('Sdk') || normalized.includes('SDK')) return 'Microsoft .NET SDK'
    if (normalized.includes('ASP.NET Core')) return 'Microsoft ASP.NET Core'
    if (normalized.includes('Runtime') || normalized.includes('AppHost') || 
        normalized.includes('Targeting Pack') || normalized.includes('Host FX Resolver')) {
      return 'Microsoft .NET Runtime'
    }
    return 'Microsoft .NET'
  }
  
  if (normalized.includes('Microsoft Visual Studio Tools')) {
    return 'Microsoft Visual Studio Tools'
  }
  
  if (normalized.match(/Microsoft (365|Office 365)/i)) {
    return 'Microsoft 365'
  }
  
  // Kinect Language Packs - consolidate all language variants
  if (normalized.match(/Kinect for Windows Speech Recognition Language Pack/i)) {
    return 'Kinect for Windows Speech Recognition Language Pack'
  }
  
  // Microsoft Language Packs (general pattern)
  if (normalized.match(/Microsoft.*Language Pack/i)) {
    return 'Microsoft Language Pack'
  }
  
  // Kits Configuration Installer
  if (normalized.match(/Kits Configuration Installer/i)) {
    return 'Kits Configuration Installer'
  }
  
  // VRS/VR related software
  if (normalized.match(/Kofax VRS/i)) {
    return 'Kofax VRS'
  }
  
  if (normalized.startsWith('Adobe ')) {
    const product = normalized.match(/Adobe ([A-Za-z\s]+)/)?.[1]?.split(/\s+/)[0]
    if (product && product !== 'AIR') return `Adobe ${product}`
  }
  
  if (normalized.match(/^7-Zip/i)) {
    return '7-Zip'
  }
  
  if (normalized.match(/Google Chrome|Chrome/i)) {
    return 'Google Chrome'
  }
  
  if (normalized.match(/Mozilla Firefox|Firefox/i)) {
    return 'Mozilla Firefox'
  }
  
  // Step 3: Generic version number removal
  normalized = normalized
    .replace(/\s+v?\d+(\.\d+)*$/i, '')
    .replace(/\s+\d{4}(\.\d+)*$/i, '')
    .replace(/\s+-\s+\d+(\.\d+)*$/i, '')
    .replace(/\s+\(\d+(\.\d+)*\)$/i, '')
    .replace(/\s+build\s+\d+/i, '')
    .replace(/\s+\d+(\.\d+)*$/i, '')
    
  // Step 4: Remove architecture and platform info
  normalized = normalized
    .replace(/\s+(x64|x86|64-bit|32-bit|amd64|i386)$/i, '')
    .replace(/\s+\((x64|x86|64-bit|32-bit|amd64|i386)\)$/i, '')
    .replace(/\s+\(Python\s+[\d\.]+\s+(64-bit|32-bit)\)$/i, '')
    .replace(/\s+\(git\s+[a-f0-9]+\)$/i, '')
    .replace(/\s+\([^)]*bit[^)]*\)/i, '')
    .replace(/\s+\([^)]*\d+\.\d+\.\d+[^)]*\)/i, '')
  
  // Step 5: Final cleanup
  normalized = normalized
    .replace(/\s+/g, ' ')
    .replace(/\s*-\s*$/, '')
    .replace(/^\s*-\s*/, '')
    .replace(/\.app$/i, '')
    .trim()
  
  if (!normalized || normalized.length < 2) return ''
  
  return normalized
}

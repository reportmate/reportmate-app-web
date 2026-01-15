/**
 * Extensions Table Component
 * Displays macOS extensions with By App / By Category views
 * Similar to macOS System Settings Extensions pane
 */

import React, { useState, useMemo } from 'react'

export interface Extension {
  identifier: string
  version?: string
  state: string
  teamId?: string
  bundlePath?: string
  category?: string
  type?: string
  extensionCategory?: string
  appName?: string
  managedByProfile?: boolean
  profileIdentifier?: string
}

interface ExtensionsTableProps {
  extensions: Extension[]
  title?: string
}

// Extension status types for filtering
type StatusFilter = 'all' | 'enabled' | 'waiting' | 'disabled'

// Normalize extension state for display - treat 'activated' as 'enabled'
function normalizeState(state: string): { label: string; status: StatusFilter } {
  const stateLower = (state || '').toLowerCase()
  
  // Handle "activated_waiting_for_user" format
  if (stateLower.includes('waiting')) {
    return { label: 'Waiting', status: 'waiting' }
  }
  // All activated and enabled states are treated as "Enabled"
  if (stateLower.includes('activated') || stateLower.includes('enabled') || stateLower === 'active') {
    return { label: 'Enabled', status: 'enabled' }
  }
  if (stateLower === 'disabled' || stateLower === 'inactive') {
    return { label: 'Disabled', status: 'disabled' }
  }
  return { label: state || 'Unknown', status: 'all' }
}

// Get status badge styling
function getStatusBadgeClass(status: StatusFilter): string {
  switch (status) {
    case 'enabled':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    case 'waiting':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    case 'disabled':
      return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
  }
}

// Extension categories matching macOS System Settings exactly (from screenshot)
const EXTENSION_CATEGORIES = [
  'Actions',
  'Camera Extensions',
  'Dock Tiles',
  'Driver Extensions',
  'Endpoint Security Extensions',
  'File Providers',
  'File System Extensions',
  'Finder',
  'Media Extensions',
  'Network Extensions',
  'Photos Editing',
  'Quick Look',
  'Sharing',
  'Spotlight',
  'Xcode Source Editor'
] as const

// Get category from extension type/category
function getExtensionCategory(ext: Extension): string {
  const category = ext.extensionCategory || ext.category || ext.type || ''
  const identifier = ext.identifier?.toLowerCase() || ''
  const bundlePath = ext.bundlePath?.toLowerCase() || ''
  
  // Try to match known categories from category field
  if (category.toLowerCase().includes('network')) return 'Network Extensions'
  if (category.toLowerCase().includes('endpoint') || category.toLowerCase().includes('security')) return 'Endpoint Security Extensions'
  if (category.toLowerCase().includes('driver') || category.toLowerCase().includes('driverkit')) return 'Driver Extensions'
  if (category.toLowerCase().includes('file provider')) return 'File Providers'
  if (category.toLowerCase().includes('file system')) return 'File System Extensions'
  if (category.toLowerCase().includes('finder')) return 'Finder'
  if (category.toLowerCase().includes('quicklook') || category.toLowerCase().includes('quick look')) return 'Quick Look'
  if (category.toLowerCase().includes('sharing') || category.toLowerCase().includes('share')) return 'Sharing'
  if (category.toLowerCase().includes('spotlight')) return 'Spotlight'
  if (category.toLowerCase().includes('photos')) return 'Photos Editing'
  if (category.toLowerCase().includes('action')) return 'Actions'
  if (category.toLowerCase().includes('camera')) return 'Camera Extensions'
  if (category.toLowerCase().includes('media')) return 'Media Extensions'
  if (category.toLowerCase().includes('dock')) return 'Dock Tiles'
  if (category.toLowerCase().includes('xcode') || category.toLowerCase().includes('source editor')) return 'Xcode Source Editor'
  
  // Infer from identifier
  if (identifier.includes('quicklook') || identifier.includes('qlgenerator')) return 'Quick Look'
  if (identifier.includes('share') || identifier.includes('sharingservice')) return 'Sharing'
  if (identifier.includes('fileprovider')) return 'File Providers'
  if (identifier.includes('network')) return 'Network Extensions'
  if (identifier.includes('endpoint') || identifier.includes('edr') || identifier.includes('security')) return 'Endpoint Security Extensions'
  if (identifier.includes('finder') || identifier.includes('findersync')) return 'Finder'
  if (identifier.includes('spotlight') || identifier.includes('mdimporter')) return 'Spotlight'
  if (identifier.includes('action')) return 'Actions'
  if (identifier.includes('camera')) return 'Camera Extensions'
  if (identifier.includes('photos') || identifier.includes('photoedit')) return 'Photos Editing'
  if (identifier.includes('docktile')) return 'Dock Tiles'
  
  // Infer from bundle path
  if (bundlePath.includes('quicklook')) return 'Quick Look'
  if (bundlePath.includes('share')) return 'Sharing'
  if (bundlePath.includes('finder')) return 'Finder'
  if (bundlePath.includes('spotlight') || bundlePath.includes('mdimporter')) return 'Spotlight'
  if (bundlePath.includes('fileprovider')) return 'File Providers'
  if (bundlePath.includes('photoedit')) return 'Photos Editing'
  
  // Default to Actions if truly unclassifiable (most generic category)
  return ext.extensionCategory || 'Actions'
}

// Get app name from extension
function getAppName(ext: Extension): string {
  if (ext.appName) return ext.appName
  
  // Try to extract from bundle path - look for .app anywhere in path
  const bundlePath = ext.bundlePath || ''
  const appMatch = bundlePath.match(/\/([^\/]+)\.app/)
  if (appMatch) return appMatch[1]
  
  // Try to extract from identifier
  const identifier = ext.identifier || ''
  const parts = identifier.split('.')
  
  // Handle common patterns:
  // com.apple.findmy.FindMyWidgetIntentsExtension -> Find My
  // com.1password.1password.browser -> 1Password
  // com.company.AppName.extension -> AppName
  if (parts.length >= 3) {
    // Skip com/org prefix and domain
    let appPart = ''
    
    // Known app identifier mappings
    const knownApps: Record<string, string> = {
      'findmy': 'Find My',
      '1password': '1Password',
      'icloud': 'iCloud',
      'iwork': 'iWork',
      'keynote': 'Keynote',
      'pages': 'Pages',
      'numbers': 'Numbers',
      'safari': 'Safari',
      'mail': 'Mail',
      'notes': 'Notes',
      'photos': 'Photos',
      'preview': 'Preview',
      'textedit': 'TextEdit',
      'xcode': 'Xcode',
      'automator': 'Automator',
      'finder': 'Finder',
      'zoom': 'Zoom',
      'slack': 'Slack',
      'dropbox': 'Dropbox',
      'onedrive': 'OneDrive',
      'googledrive': 'Google Drive',
      'chrome': 'Google Chrome',
      'firefox': 'Firefox',
      'vscode': 'VS Code',
      'visualstudiocode': 'VS Code',
      'iterm': 'iTerm',
      'iterm2': 'iTerm2',
      'terminal': 'Terminal',
      'bartender': 'Bartender',
      'cleanmymac': 'CleanMyMac',
      'raycast': 'Raycast',
      'alfred': 'Alfred',
      'bettertouchtool': 'BetterTouchTool',
      'keyboard-maestro': 'Keyboard Maestro',
      'screenflow': 'ScreenFlow',
      'vlc': 'VLC',
      'spotify': 'Spotify',
      'microsoft': 'Microsoft',
      'office': 'Microsoft Office',
      'word': 'Microsoft Word',
      'excel': 'Microsoft Excel',
      'powerpoint': 'Microsoft PowerPoint',
      'outlook': 'Microsoft Outlook',
      'teams': 'Microsoft Teams',
    }
    
    // Check each part for known app names
    for (let i = 2; i < parts.length; i++) {
      const partLower = parts[i].toLowerCase()
      if (knownApps[partLower]) {
        return knownApps[partLower]
      }
    }
    
    // Extension types to skip
    const extensionTypes = ['extension', 'widget', 'intent', 'intents', 'share', 'sharing', 'action', 'quicklook', 'spotlight', 'finder', 'provider', 'network', 'endpoint', 'security', 'helper', 'service', 'daemon', 'agent']
    
    // Find first non-extension part after domain
    for (let i = 2; i < parts.length; i++) {
      const partLower = parts[i].toLowerCase()
      if (!extensionTypes.some(t => partLower.includes(t)) && partLower.length > 2) {
        appPart = parts[i]
        break
      }
    }
    
    // Fallback if no good part found
    if (!appPart && parts.length >= 3) {
      appPart = parts[2]
    }
    
    // Convert from identifier format to display name
    // Handle camelCase and capitalize properly
    return appPart
      .replace(/([a-z])([A-Z])/g, '$1 $2')  // camelCase to spaces
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')  // Handle ALL CAPS followed by word
      .replace(/[-_]/g, ' ')  // dashes/underscores to spaces
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .trim()
  }
  
  return 'System'
}

// Get category icon
function getCategoryIcon(category: string): React.ReactNode {
  const iconClass = "w-5 h-5 text-gray-500 dark:text-gray-400"
  
  switch (category) {
    case 'Actions':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    case 'Network Extensions':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
      )
    case 'Endpoint Security Extensions':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
    case 'Driver Extensions':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
        </svg>
      )
    case 'File Providers':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      )
    case 'Quick Look':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      )
    case 'Sharing':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
      )
    case 'Spotlight':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      )
    default:
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      )
  }
}

export const ExtensionsTable: React.FC<ExtensionsTableProps> = ({ 
  extensions = [],
  title = 'Extensions'
}) => {
  const [viewMode, setViewMode] = useState<'byApp' | 'byCategory'>('byCategory')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  // Count extensions by status
  const statusCounts = useMemo(() => {
    const counts = { all: extensions.length, enabled: 0, waiting: 0, disabled: 0 }
    extensions.forEach(ext => {
      const { status } = normalizeState(ext.state)
      if (status === 'enabled') counts.enabled++
      else if (status === 'waiting') counts.waiting++
      else if (status === 'disabled') counts.disabled++
    })
    return counts
  }, [extensions])

  // Filter extensions by status
  const statusFilteredExtensions = useMemo(() => {
    if (statusFilter === 'all') return extensions
    return extensions.filter(ext => normalizeState(ext.state).status === statusFilter)
  }, [extensions, statusFilter])

  // Group extensions by app
  const extensionsByApp = useMemo(() => {
    const groups = new Map<string, Extension[]>()
    statusFilteredExtensions.forEach(ext => {
      const appName = getAppName(ext)
      if (!groups.has(appName)) {
        groups.set(appName, [])
      }
      groups.get(appName)!.push(ext)
    })
    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
  }, [statusFilteredExtensions])

  // Group extensions by category
  const extensionsByCategory = useMemo(() => {
    const groups = new Map<string, Extension[]>()
    statusFilteredExtensions.forEach(ext => {
      const category = getExtensionCategory(ext)
      if (!groups.has(category)) {
        groups.set(category, [])
      }
      groups.get(category)!.push(ext)
    })
    // Sort by predefined order
    return EXTENSION_CATEGORIES
      .filter(cat => groups.has(cat))
      .map(cat => [cat, groups.get(cat)!] as [string, Extension[]])
  }, [statusFilteredExtensions])

  // Filter based on search
  const filteredByApp = useMemo(() => {
    if (!search.trim()) return extensionsByApp
    const searchLower = search.toLowerCase()
    return extensionsByApp
      .map(([app, exts]) => [
        app,
        exts.filter(ext => 
          ext.identifier?.toLowerCase().includes(searchLower) ||
          app.toLowerCase().includes(searchLower) ||
          getExtensionCategory(ext).toLowerCase().includes(searchLower)
        )
      ] as [string, Extension[]])
      .filter(([, exts]) => exts.length > 0)
  }, [extensionsByApp, search])

  const filteredByCategory = useMemo(() => {
    if (!search.trim()) return extensionsByCategory
    const searchLower = search.toLowerCase()
    return extensionsByCategory
      .map(([cat, exts]) => [
        cat,
        exts.filter(ext => 
          ext.identifier?.toLowerCase().includes(searchLower) ||
          getAppName(ext).toLowerCase().includes(searchLower) ||
          cat.toLowerCase().includes(searchLower)
        )
      ] as [string, Extension[]])
      .filter(([, exts]) => exts.length > 0)
  }, [extensionsByCategory, search])

  const toggleExpanded = (key: string) => {
    const newSet = new Set(expandedItems)
    if (newSet.has(key)) {
      newSet.delete(key)
    } else {
      newSet.add(key)
    }
    setExpandedItems(newSet)
  }

  if (!extensions.length) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="text-center">
          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Extensions</h3>
          <p className="text-gray-600 dark:text-gray-400">No extension data available for this device.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Extensions add extra functionality to your Mac and apps, and some may run in the background.
            </p>
          </div>
          
          {/* View Mode Toggle + Status Filters + Search - all in one row */}
          <div className="flex flex-wrap items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('byApp')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  viewMode === 'byApp'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                By App
              </button>
              <button
                onClick={() => setViewMode('byCategory')}
                className={`px-3 py-1.5 text-sm font-medium border-l border-gray-300 dark:border-gray-600 transition-colors ${
                  viewMode === 'byCategory'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                By Category
              </button>
            </div>
            
            {/* Separator */}
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 hidden sm:block" />

            {/* Status Filters - toggle on/off */}
            <div className="flex flex-wrap gap-1.5">
              {statusCounts.enabled > 0 && (
                <button
                  onClick={() => setStatusFilter(statusFilter === 'enabled' ? 'all' : 'enabled')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                    statusFilter === 'enabled'
                      ? 'bg-green-200 dark:bg-green-800 text-green-900 dark:text-green-100'
                      : 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800'
                  }`}
                >
                  Enabled ({statusCounts.enabled})
                </button>
              )}
              {statusCounts.waiting > 0 && (
                <button
                  onClick={() => setStatusFilter(statusFilter === 'waiting' ? 'all' : 'waiting')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                    statusFilter === 'waiting'
                      ? 'bg-yellow-200 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100'
                      : 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-800'
                  }`}
                >
                  Waiting for User Action ({statusCounts.waiting})
                </button>
              )}
              {statusCounts.disabled > 0 && (
                <button
                  onClick={() => setStatusFilter(statusFilter === 'disabled' ? 'all' : 'disabled')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                    statusFilter === 'disabled'
                      ? 'bg-gray-300 dark:bg-gray-500 text-gray-800 dark:text-gray-100'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Disabled ({statusCounts.disabled})
                </button>
              )}
            </div>

            {/* Spacer to push search to right */}
            <div className="flex-1" />

            {/* Search */}
            <div className="relative w-full sm:w-56">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                className="block w-full pl-9 pr-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
      
      <div className="min-h-[500px] max-h-[800px] overflow-y-auto">
        {viewMode === 'byCategory' ? (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredByCategory.map(([category, exts]) => (
              <div key={category} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <button
                  onClick={() => toggleExpanded(`cat-${category}`)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                      {getCategoryIcon(category)}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{category}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {exts.map(e => getAppName(e)).filter((v, i, a) => a.indexOf(v) === i).slice(0, 3).join(', ')}
                        {exts.length > 3 && ` and ${exts.length - 3} more.`}
                      </div>
                    </div>
                  </div>
                  <svg 
                    className={`w-5 h-5 text-gray-400 transition-transform ${expandedItems.has(`cat-${category}`) ? 'rotate-180' : ''}`}
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {expandedItems.has(`cat-${category}`) && (
                  <div className="px-6 pb-4">
                    <div className="ml-11 space-y-2">
                      {exts.map((ext, idx) => {
                        const { label, status } = normalizeState(ext.state)
                        return (
                          <div key={ext.identifier || idx} className="grid grid-cols-[auto_1fr_auto] gap-3 items-start py-2 px-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${getStatusBadgeClass(status)}`}>
                              {label}
                            </span>
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{getAppName(ext)}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">{ext.identifier}</div>
                            </div>
                            {ext.managedByProfile && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 whitespace-nowrap" title={ext.profileIdentifier || 'Managed by MDM Profile'}>
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                                Managed
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredByApp.map(([appName, exts]) => (
              <div key={appName} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <button
                  onClick={() => toggleExpanded(`app-${appName}`)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{appName}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {exts.length} extension{exts.length !== 1 ? 's' : ''} • {exts.map(e => getExtensionCategory(e)).filter((v, i, a) => a.indexOf(v) === i).join(', ')}
                      </div>
                    </div>
                  </div>
                  <svg 
                    className={`w-5 h-5 text-gray-400 transition-transform ${expandedItems.has(`app-${appName}`) ? 'rotate-180' : ''}`}
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {expandedItems.has(`app-${appName}`) && (
                  <div className="px-6 pb-4">
                    <div className="ml-11 space-y-2">
                      {exts.map((ext, idx) => {
                        const { label, status } = normalizeState(ext.state)
                        return (
                          <div key={ext.identifier || idx} className="grid grid-cols-[auto_1fr_auto] gap-3 items-start py-2 px-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${getStatusBadgeClass(status)}`}>
                              {label}
                            </span>
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{getExtensionCategory(ext)}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">{ext.identifier}</div>
                            </div>
                            {ext.managedByProfile && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 whitespace-nowrap" title={ext.profileIdentifier || 'Managed by MDM Profile'}>
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                                Managed
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {(viewMode === 'byCategory' ? filteredByCategory : filteredByApp).length === 0 && search && (
          <div className="px-6 py-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No extensions found matching &quot;{search}&quot;
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ExtensionsTable

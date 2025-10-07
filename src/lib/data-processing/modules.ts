// Data processing functions for ReportMate device modules

export interface InstallsData {
  totalPackages: number
  installed: number
  pending: number
  failed: number
  packages: Array<{
    name: string
    status: 'installed' | 'pending' | 'failed'
    version?: string
    type?: 'chocolatey' | 'nupkg' | 'msi' | 'exe' | 'cimian'
  }>
  systemName: string
  cacheSizeMb?: number
  config?: any
  messages: string[]
  recentEvents?: any[]
  sessions?: any[]
}

export function extractInstalls(modules: any): InstallsData {
  // Initialize default response
  const result: InstallsData = {
    totalPackages: 0,
    installed: 0,
    pending: 0,
    failed: 0,
    packages: [],
    systemName: 'Unknown',
    messages: []
  }

  try {
    // Check if installs module exists
    if (!modules?.installs) {
      return result
    }

    const installsModule = modules.installs

    // Handle PowerShell object format from Azure Functions API
    const cimian = installsModule.cimian
    if (typeof cimian === 'string' && cimian.startsWith('@{')) {
      // Parse PowerShell object format - this is a temporary workaround
      // The real fix should be in the Azure Functions API to return proper JSON
      console.warn('[INSTALLS] Cimian data is in PowerShell object format, attempting to extract basic info')
      
      // Extract basic information from PowerShell object string
      const statusMatch = cimian.match(/status=([^;]+);/)
      const versionMatch = cimian.match(/version=([^;]+);/)
      const isInstalledMatch = cimian.match(/isInstalled=([^;]+);/)
      
      result.systemName = 'Cimian Package Manager'
      if (statusMatch) {
        result.messages.push(`System Status: ${statusMatch[1]}`)
      }
      if (versionMatch) {
        result.messages.push(`Version: ${versionMatch[1]}`)
      }
      if (isInstalledMatch) {
        result.messages.push(`Installed: ${isInstalledMatch[1]}`)
      }
      
      result.messages.push('Warning: Data in PowerShell format - Azure Functions API needs to return proper JSON')
      return result
    }

    // If we have proper JSON structure, process normally
    if (cimian && typeof cimian === 'object') {
      result.systemName = 'Cimian Package Manager'
      result.config = cimian.config
      
      // Get pending packages
      if (cimian.pendingPackages && Array.isArray(cimian.pendingPackages)) {
        result.pending = cimian.pendingPackages.length
        
        // Add pending packages to packages array
        cimian.pendingPackages.forEach((pkg: string) => {
          result.packages.push({
            name: pkg,
            status: 'pending',
            type: 'cimian'
          })
        })
      }

      // Get cache information
      if (cimian.cacheStatus?.cache_size_mb) {
        result.cacheSizeMb = cimian.cacheStatus.cache_size_mb
      }

      // Process recent events to find installed/failed packages
      if (cimian.events && Array.isArray(cimian.events)) {
        result.recentEvents = cimian.events.slice(0, 10) // Keep recent events
        
        // Count successful and failed installations from events
        const installEvents = cimian.events.filter((event: any) => 
          event.eventType === 'install' || event.action === 'install_package'
        )
        
        // Track processed packages to avoid duplicates
        const processedPackages = new Set<string>()
        
        installEvents.forEach((event: any) => {
          const message = event.message || ''
          const packageName = event.package || 'Unknown Package'
          
          // Only process if we have a meaningful package name
          if (packageName && packageName !== 'Unknown Package' && !processedPackages.has(packageName)) {
            processedPackages.add(packageName)
            
            if (message.includes('completed successfully') || 
                message.includes('installation completed')) {
              result.installed++
              result.packages.push({
                name: packageName,
                status: 'installed',
                version: event.version,
                type: message.includes('NUPKG') ? 'nupkg' : 
                      message.includes('Chocolatey') ? 'chocolatey' : 'cimian'
              })
            } else if (message.includes('failed') || 
                      message.includes('error')) {
              result.failed++
              result.packages.push({
                name: packageName,
                status: 'failed',
                version: event.version,
                type: message.includes('NUPKG') ? 'nupkg' : 
                      message.includes('Chocolatey') ? 'chocolatey' : 'cimian'
              })
            }
          }
          
          // Also extract packages from messages when package name is not in separate field
          if (!event.package || event.package === '') {
            // Try to extract package names from common patterns in messages
            if (message.includes('NUPKG installation')) {
              result.packages.push({
                name: 'NUPKG Package',
                status: message.includes('completed successfully') ? 'installed' : 'failed',
                type: 'nupkg'
              })
              if (message.includes('completed successfully')) {
                result.installed++
              } else {
                result.failed++
              }
            } else if (message.includes('Chocolatey install')) {
              result.packages.push({
                name: 'Chocolatey Package',
                status: message.includes('completed successfully') ? 'installed' : 'failed',
                type: 'chocolatey'
              })
              if (message.includes('completed successfully')) {
                result.installed++
              } else {
                result.failed++
              }
            }
          }
        })
      }

      // Get session information
      if (cimian.sessions && Array.isArray(cimian.sessions)) {
        result.sessions = cimian.sessions
        
        // Get average packages managed per session
        const totalPackagesManaged = cimian.sessions.reduce((sum: number, session: any) => {
          return sum + (session.totalPackagesManaged || 0)
        }, 0)
        
        if (totalPackagesManaged > 0) {
          result.totalPackages = Math.max(result.totalPackages, totalPackagesManaged)
        }
      }

      // Extract installed items if available
      if (cimian.items && Array.isArray(cimian.items)) {
        cimian.items.forEach((item: any) => {
          result.packages.push({
            name: item.name || item.package || 'Unknown Package',
            status: 'installed',
            version: item.version
          })
        })
        result.installed += cimian.items.length
      }

      // Check installation status
      if (cimian.status) {
        result.messages.push(`System Status: ${cimian.status}`)
      }

      if (cimian.isInstalled === false) {
        result.messages.push('Package management system not yet installed')
      }

      // Add performance recommendations if available
      if (cimian.cacheStatus?.performance_recommendations) {
        result.messages.push(...cimian.cacheStatus.performance_recommendations)
      }
    }

    // Handle cache status data
    if (installsModule.cacheStatus) {
      const cacheStatus = installsModule.cacheStatus
      if (typeof cacheStatus === 'string' && cacheStatus.startsWith('@{')) {
        // Extract cache size from PowerShell format
        const cacheSizeMatch = cacheStatus.match(/cache_size_mb=([^;]+);/)
        if (cacheSizeMatch) {
          result.cacheSizeMb = parseFloat(cacheSizeMatch[1])
        }
      } else if (typeof cacheStatus === 'object' && cacheStatus.cache_size_mb) {
        result.cacheSizeMb = cacheStatus.cache_size_mb
      }
    }

    // Calculate total packages
    result.totalPackages = Math.max(
      result.totalPackages,
      result.installed + result.pending + result.failed,
      result.packages.length
    )

    return result

  } catch (error) {
    console.error('Error extracting installs data:', error)
    return result
  }
}

export function extractInventory(modules: any) {
  if (!modules?.inventory) return null
  
  const inventory = modules.inventory
  return {
    deviceName: inventory.deviceName || inventory.computerName,
    manufacturer: inventory.manufacturer,
    model: inventory.model,
    osVersion: inventory.osVersion,
    architecture: inventory.architecture,
    memory: inventory.totalMemory,
    storage: inventory.storage
  }
}

export function extractSecurity(modules: any) {
  if (!modules?.security) return null
  
  const security = modules.security
  return {
    antivirusStatus: security.antivirusStatus,
    firewallStatus: security.firewallStatus,
    updates: security.updates,
    encryption: security.encryption
  }
}

export function extractDisplay(modules: any) {
  if (!modules?.display) return null
  
  const display = modules.display
  return {
    monitors: display.monitors,
    resolution: display.resolution,
    refreshRate: display.refreshRate
  }
}

import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await params
    console.log('[DEVICE API] Fetching device data for:', deviceId)

    // Use server-side API base URL configuration
    const apiBaseUrl = process.env.API_BASE_URL
    
    if (!apiBaseUrl) {
      console.error('[DEVICE API] API_BASE_URL environment variable not configured')
      return NextResponse.json({
        error: 'API configuration error',
        details: 'API_BASE_URL environment variable not configured'
      }, { status: 500 })
    }
    
    console.log('[DEVICE API] Using API base URL:', apiBaseUrl)
    const response = await fetch(`${apiBaseUrl}/api/device/${encodeURIComponent(deviceId)}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'X-API-PASSPHRASE': 's3cur3-p@ssphras3!'
      }
    })
    
    if (!response.ok) {
      console.error('[DEVICE API] Azure Functions API error:', response.status, response.statusText)
      
      // If Azure Functions API is not available, fall back to sample data
      console.log('[DEVICE API] Falling back to sample data')
      
      try {
        // Read sample data from file
        const path = require('path')
        const fs = require('fs')
        const workingDir = process.cwd()
        console.log('[DEVICE API] Working directory:', workingDir)
        
        // Try multiple possible paths
        const possiblePaths = [
          path.join(workingDir, 'sample-api-data.json'),
          path.join(workingDir, '../../sample-api-data.json'),
          path.join(workingDir, '../../../sample-api-data.json'),
          path.join(__dirname, '../../../../../../sample-api-data.json')
        ]
        
        let sampleDataPath = null
        for (const testPath of possiblePaths) {
          console.log('[DEVICE API] Testing path:', testPath)
          if (fs.existsSync(testPath)) {
            sampleDataPath = testPath
            console.log('[DEVICE API] Found sample data at:', testPath)
            break
          }
        }
        
        if (sampleDataPath) {
          const sampleData = JSON.parse(fs.readFileSync(sampleDataPath, 'utf8'))
          console.log('[DEVICE API] Using sample data fallback')
          
          // Return sample data in the expected format
          return NextResponse.json({
            success: true,
            device: sampleData,
            source: 'sample-data'
          }, {
            headers: {
              'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          })
        } else {
          console.log('[DEVICE API] Sample data file not found in any of the expected locations')
        }
      } catch (sampleError) {
        console.error('[DEVICE API] Failed to load sample data:', sampleError)
      }
      
      if (response.status === 404) {
        return NextResponse.json({
          error: 'Device not found'
        }, { 
          status: 404,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        })
      }
      return NextResponse.json({
        error: 'Failed to fetch device from API',
        details: `API returned ${response.status}: ${response.statusText}`
      }, { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
    }

    const data = await response.json()
    console.log('[DEVICE API] Successfully fetched device data from Azure Functions')
    console.log('[DEVICE API] Response structure:', {
      hasMetadata: 'metadata' in data,
      metadataKeys: data.metadata ? Object.keys(data.metadata) : [],
      responseKeys: Object.keys(data),
      responseSize: JSON.stringify(data).length
    })
    
    console.log('[DEVICE API] Unified data structure sample:', JSON.stringify({
      metadata: data.metadata,
      moduleKeys: Object.keys(data).filter(k => k !== 'metadata')
    }, null, 2).substring(0, 500) + '...')
    
    // Handle new unified structure - data is the device info directly
    if (data.metadata) {
      const metadata = data.metadata
      const inventory = data.inventory || {}
      const system = data.system || {}
      const hardware = data.hardware || {}
      
      console.log('[DEVICE API] Metadata:', {
        deviceId: metadata.deviceId,
        serialNumber: metadata.serialNumber,
        clientVersion: metadata.clientVersion,
        collectedAt: metadata.collectedAt
      })
      console.log('[DEVICE API] Available modules:', Object.keys(data).filter(k => k !== 'metadata'))
      
      // Extract system data from the system module
      // First try the correct location: system.operatingSystem (from database)
      const operatingSystem = system.operatingSystem || {}
      
      // For backward compatibility, also try the old nested location
      const systemData = system.osQuery?.system?.[0] || system || {}
      
      console.log('[DEVICE API] System module keys:', Object.keys(system))
      console.log('[DEVICE API] Operating system data:', Object.keys(operatingSystem))
      console.log('[DEVICE API] Operating system sample:', {
        name: operatingSystem.name,
        version: operatingSystem.version,
        build: operatingSystem.build,
        architecture: operatingSystem.architecture
      })
      console.log('[DEVICE API] Inventory data structure:', JSON.stringify(inventory, null, 2))
      console.log('[DEVICE API] Inventory data structure loaded successfully')
      
      // Log network module structure for debugging
      const networkModule = data.network || {}
      console.log('[DEVICE API] Network module structure:', {
        hasNetwork: !!data.network,
        networkKeys: Object.keys(networkModule),
        hasActiveConnection: !!networkModule.activeConnection,
        activeConnectionData: networkModule.activeConnection,
        networkModuleSample: JSON.stringify(networkModule).substring(0, 500)
      })
      
      const transformedDevice: any = {
        id: metadata.serialNumber || metadata.deviceId, // Use serial number as the primary ID
        serialNumber: metadata.serialNumber,
        deviceId: metadata.deviceId,
        name: inventory.deviceName || inventory.device_name || inventory.ComputerName || metadata.serialNumber || 'Unknown Device',
        hostname: inventory.deviceName || inventory.device_name,
        osName: operatingSystem.name,
        osVersion: operatingSystem.version,
        clientVersion: metadata.clientVersion,
        status: 'active', // Default status since we have recent data
        lastSeen: metadata.collectedAt,
        createdAt: metadata.collectedAt,
        
        // Extract hardware information from modules
        model: hardware.model || inventory.model,
        manufacturer: hardware.manufacturer || inventory.manufacturer,
        processor: hardware.processor?.name,
        cores: hardware.processor?.cores,
        memory: hardware.memory?.totalPhysical ? `${Math.round(hardware.memory.totalPhysical / (1024*1024*1024))} GB` : undefined,
        graphics: hardware.graphics?.name,
        architecture: operatingSystem.architecture,
        
        // Battery information
        batteryLevel: hardware.battery?.chargePercent,
        batteryHealth: hardware.battery?.health,
        batteryCycleCount: hardware.battery?.cycleCount,
        isCharging: hardware.battery?.isCharging,
        
        // Storage information (extract main drive)
        storage: hardware.storage && Array.isArray(hardware.storage) ? (() => {
          console.log('[DEVICE API] Hardware storage array:', hardware.storage)
          const mainDrive = hardware.storage.find((s: any) => s.type === 'SSD' && s.capacity > 0) || 
                           hardware.storage.find((s: any) => s.capacity > 0) || 
                           hardware.storage[0]
          console.log('[DEVICE API] Found main drive:', mainDrive)
          if (mainDrive && mainDrive.capacity) {
            const totalGB = Math.round(mainDrive.capacity / (1024*1024*1024))
            const freeGB = Math.round((mainDrive.freeSpace || 0) / (1024*1024*1024))
            console.log('[DEVICE API] Storage calculations:', {
              capacity: mainDrive.capacity,
              freeSpace: mainDrive.freeSpace,
              totalGB: totalGB,
              freeGB: freeGB,
              type: mainDrive.type
            })
            if (freeGB > 0) {
              return `${totalGB} GB ${mainDrive.type || 'Drive'} • ${freeGB} GB free`
            } else {
              return `${totalGB} GB ${mainDrive.type || 'Drive'}`
            }
          }
          return undefined
        })() : undefined,
        os: operatingSystem.name ? `${operatingSystem.name} ${operatingSystem.version || ''} ${operatingSystem.build ? `(Build ${operatingSystem.build})` : ''}`.trim() : 'Unknown OS',
        uptime: systemData.uptimeString || systemData.uptime,
        bootTime: systemData.lastBootTime,
        
        // System information
        osDisplayVersion: operatingSystem.displayVersion,
        osEdition: operatingSystem.edition,
        osFeatureUpdate: operatingSystem.featureUpdate,
        osInstallDate: operatingSystem.installDate,
        osLocale: operatingSystem.locale,
        osTimeZone: operatingSystem.timeZone,
        keyboardLayouts: operatingSystem.keyboardLayouts,
        
        // Pass through the complete modules data for processing by the frontend
        modules: {
          system: {
            operatingSystem: operatingSystem
          },
          security: data.security ? (() => {
            console.log('[DEVICE API] Processing security module data...')
            console.log('[DEVICE API] Raw security data type:', typeof data.security)
            console.log('[DEVICE API] Raw security data sample:', JSON.stringify(data.security).substring(0, 500))
            
            // The Azure Functions API returns the security data as an object
            // but nested objects might still be PowerShell object representations
            let securityData = data.security
            
            if (typeof securityData === 'object' && securityData !== null) {
              console.log('[DEVICE API] Security data is an object, processing nested fields...')
              
              // Process and clean up the security data structure
              const processedSecurity = {
                moduleId: securityData.moduleId || 'security',
                deviceId: securityData.deviceId || metadata.deviceId,
                collectedAt: securityData.collectedAt || metadata.collectedAt,
                version: securityData.version || '1.0.0',
                
                // Process antivirus data
                antivirus: securityData.antivirus ? {
                  name: securityData.antivirus.name || 'Unknown',
                  version: securityData.antivirus.version || 'Unknown',
                  isEnabled: Boolean(securityData.antivirus.isEnabled),
                  isUpToDate: Boolean(securityData.antivirus.isUpToDate),
                  lastScan: securityData.antivirus.lastScan || null,
                  scanType: securityData.antivirus.scanType || 'Unknown',
                  lastUpdate: securityData.antivirus.lastUpdate || null
                } : { name: 'Unknown', isEnabled: false, isUpToDate: false },
                
                // Process firewall data
                firewall: securityData.firewall ? {
                  isEnabled: Boolean(securityData.firewall.isEnabled),
                  profile: securityData.firewall.profile || 'Unknown',
                  rules: Array.isArray(securityData.firewall.rules) ? securityData.firewall.rules : []
                } : { isEnabled: false, profile: 'Unknown', rules: [] },
                
                // Process TPM data
                tpm: securityData.tpm ? {
                  version: securityData.tpm.version || 'Unknown',
                  isEnabled: Boolean(securityData.tpm.isEnabled),
                  isPresent: Boolean(securityData.tpm.isPresent),
                  isActivated: Boolean(securityData.tpm.isActivated),
                  manufacturer: securityData.tpm.manufacturer || 'Unknown'
                } : { isPresent: false, isEnabled: false, isActivated: false },
                
                // Process encryption data
                encryption: securityData.encryption ? {
                  deviceEncryption: Boolean(securityData.encryption.deviceEncryption),
                  bitLocker: securityData.encryption.bitLocker ? {
                    status: securityData.encryption.bitLocker.status || 'Unknown',
                    isEnabled: Boolean(securityData.encryption.bitLocker.isEnabled),
                    recoveryKeyId: securityData.encryption.bitLocker.recoveryKeyId || '',
                    encryptedDrives: Array.isArray(securityData.encryption.bitLocker.encryptedDrives) 
                      ? securityData.encryption.bitLocker.encryptedDrives 
                      : []
                  } : { isEnabled: false, status: 'Disabled', encryptedDrives: [] },
                  encryptedVolumes: Array.isArray(securityData.encryption.encryptedVolumes) ? 
                    securityData.encryption.encryptedVolumes : []
                } : { deviceEncryption: false, encryptedVolumes: [] },
                
                // Process security updates
                securityUpdates: Array.isArray(securityData.securityUpdates) ? 
                  securityData.securityUpdates.map((update: any) => ({
                    id: update.id || 'Unknown',
                    title: update.title || 'Unknown Update',
                    status: update.status || 'Unknown',
                    severity: update.severity || 'Unknown',
                    installDate: update.installDate || null
                  })) : [],
                
                // Process security events
                securityEvents: Array.isArray(securityData.securityEvents) ? 
                  securityData.securityEvents : [],
                
                lastSecurityScan: securityData.lastSecurityScan || metadata.collectedAt
              }
              
              console.log('[DEVICE API] Processed security data:', JSON.stringify(processedSecurity).substring(0, 500))
              return processedSecurity
            }
            
            console.log('[DEVICE API] Security data is not an object, using fallback')
            return {
              moduleId: 'security-fallback',
              deviceId: metadata.deviceId,
              collectedAt: metadata.collectedAt,
              antivirus: { name: 'Unknown', isEnabled: false },
              firewall: { isEnabled: false },
              encryption: { deviceEncryption: false },
              tpm: { isPresent: false },
              securityUpdates: [],
              securityEvents: [],
              lastSecurityScan: metadata.collectedAt
            }
          })() : {
            // Complete fallback if no security data at all
            moduleId: 'security-no-data',
            deviceId: metadata.deviceId,
            collectedAt: metadata.collectedAt,
            antivirus: { name: 'Unknown', isEnabled: false },
            firewall: { isEnabled: false },
            encryption: { deviceEncryption: false },
            tpm: { isPresent: false },
            securityUpdates: [],
            securityEvents: [],
            lastSecurityScan: metadata.collectedAt
          },
          network: data.network || {
            // Fallback if no network data
            moduleId: 'network-fallback',
            deviceId: metadata.deviceId,
            collectedAt: metadata.collectedAt,
            interfaces: [],
            primaryInterface: 'Unknown',
            hostname: inventory.deviceName || 'unknown-device',
            dns: [],
            gateway: 'Unknown'
          },
          hardware: hardware,
          inventory: inventory,
          management: data.management || {},
          applications: data.applications || {},
          profiles: data.profiles || {},
          installs: data.installs || {}
        },
        
        // Extract specific module data for backward compatibility
        system: systemData,
        operatingSystem: operatingSystem,
        inventory: inventory,
        hardware: hardware,
        
        // Environment and service information
        services: systemData.services || [],
        environment: systemData.environment || [],
        
        // Module counts for debugging
        moduleCount: Object.keys(data).filter(k => k !== 'metadata').length
      }
      
      // Return device in the expected format for the frontend
      const responseData = {
        success: true,
        device: transformedDevice
      }
      
      console.log('[DEVICE API] Returning transformed device data')
      return NextResponse.json(responseData, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
    }
    
    // If no metadata found, return error
    console.log('[DEVICE API] No metadata found in response')
    return NextResponse.json({
      error: 'Invalid device data structure',
      details: 'Expected unified data format with metadata'
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('[DEVICE API] Error fetching device:', error)
    return NextResponse.json({
      error: 'Failed to fetch device',
      details: error instanceof Error ? error.message : String(error)
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  }
}

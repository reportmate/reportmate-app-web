import { NextResponse } from 'next/server'

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const timestamp = new Date().toISOString()
    console.log(`[INVENTORY API] ${timestamp} - Using FastAPI Container hybrid approach`)

    // Use the enhanced FastAPI Container bulk endpoint instead of direct database access
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://reportmate-functions-api.blackdune-79551938.canadacentral.azurecontainerapps.io'
    const devicesResponse = await fetch(`${API_BASE_URL}/api/devices`, {
      headers: {
        'Cache-Control': 'no-cache',
        'User-Agent': 'ReportMate-Frontend/1.0'
      }
    })

    if (!devicesResponse.ok) {
      throw new Error(`FastAPI Container returned ${devicesResponse.status}: ${devicesResponse.statusText}`)
    }

    const devicesData = await devicesResponse.json()
    const devices = devicesData.devices || []
    
    console.log(`[INVENTORY API] ${timestamp} - Found ${devices.length} devices from FastAPI Container bulk endpoint`)
    
    // OPTIMIZED: Get system data from ALL devices using CONCURRENT batches for speed
    console.log(`[INVENTORY API] ${timestamp} - Getting system data from ALL ${devices.length} devices using optimized concurrent batches`)
    
    const systemDataMap = new Map()
    const BATCH_SIZE = 10 // Process 10 devices concurrently
    const BATCH_DELAY = 100 // 100ms delay between batches
    
    // Process devices in concurrent batches for optimal speed
    for (let i = 0; i < devices.length; i += BATCH_SIZE) {
      const batch = devices.slice(i, i + BATCH_SIZE)
      console.log(`[INVENTORY API] Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(devices.length/BATCH_SIZE)} (${batch.length} devices)`)
      
      // Process current batch concurrently
      const batchPromises = batch.map(async (device: any) => {
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout per device
          
          const deviceResponse = await fetch(`${API_BASE_URL}/api/device/${device.serialNumber}`, {
            headers: {
              'Cache-Control': 'no-cache',
              'User-Agent': 'ReportMate-Frontend/1.0'
            },
            signal: controller.signal
          })
          
          clearTimeout(timeoutId)
          
          if (deviceResponse.ok) {
            const deviceData = await deviceResponse.json()
            return { serial: device.serialNumber, data: deviceData.device?.modules?.system || null }
          } else {
            return { serial: device.serialNumber, data: null }
          }
        } catch (error) {
          if (error instanceof Error && error.name !== 'AbortError') {
            console.warn(`[INVENTORY API] Failed to get system data for ${device.serialNumber}:`, error.message)
          }
          return { serial: device.serialNumber, data: null }
        }
      })
      
      // Wait for current batch to complete
      const batchResults = await Promise.allSettled(batchPromises)
      
      // Store results from current batch
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          systemDataMap.set(result.value.serial, result.value.data)
        }
      })
      
      // Small delay between batches to prevent overwhelming the API
      if (i + BATCH_SIZE < devices.length) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY))
      }
    }
    
    const successfulSystemCalls = Array.from(systemDataMap.values()).filter(v => v !== null).length
    const totalTime = Date.now() - new Date(timestamp).getTime()
    console.log(`[INVENTORY API] ${timestamp} - Got system data for ${successfulSystemCalls}/${devices.length} ALL devices using optimized concurrent batches (${totalTime}ms total)`)
    
    // Process all devices with inventory data, and add system data where available
    const processedDevices = devices.map((device: any) => {
      const systemModule = systemDataMap.get(device.serialNumber)
      
      return {
        deviceId: device.deviceId,
        serialNumber: device.serialNumber,
        name: device.deviceName || device.serialNumber,
        lastSeen: device.lastSeen || new Date().toISOString(),
        createdAt: device.createdAt,
        status: device.status === 'online' ? 'active' : (device.status || 'unknown'),
        totalEvents: device.totalEvents || 0,
        lastEventTime: device.lastEventTime || device.lastSeen,
        // Include both inventory data (from bulk) and system data (from sample)
        modules: {
          inventory: {
            deviceName: device.deviceName || device.serialNumber,
            serialNumber: device.serialNumber,
            uuid: device.deviceId,
            assetTag: device.assetTag || null,
            location: device.location || null,
            usage: device.usage || null,
            catalog: device.catalog || null,
            department: device.department || null,
            owner: device.owner || null,
            collectedAt: device.lastSeen || new Date().toISOString()
          },
          // Add system module data if available (for charts)
          ...(systemModule && { system: systemModule })
        }
      }
    })
    
    console.log(`[INVENTORY API] ${timestamp} - Processed ${processedDevices.length} devices with OPTIMIZED concurrent approach (1 bulk + ${devices.length} system calls in batches)`)
    
    // Log sample inventory data
    const sampleDevice = processedDevices.find((d: any) => d.modules.inventory.assetTag || d.modules.inventory.location)
    if (sampleDevice) {
      console.log(`[INVENTORY API] Sample device with inventory data:`, {
        serialNumber: sampleDevice.serialNumber,
        deviceName: sampleDevice.name,
        assetTag: sampleDevice.modules.inventory.assetTag,
        location: sampleDevice.modules.inventory.location,
        usage: sampleDevice.modules.inventory.usage,
        catalog: sampleDevice.modules.inventory.catalog,
        hasSystemData: !!sampleDevice.modules.system
      })
    } else {
      console.log(`[INVENTORY API] No devices found with inventory data (assetTag, location, usage, catalog all null)`)
    }
    
    return NextResponse.json(processedDevices, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache', 
        'Expires': '0',
        'X-Fetched-At': timestamp,
        'X-Data-Source': 'fastapi-container-hybrid',
        'X-Devices-Processed': processedDevices.length.toString(),
        'X-System-Sample-Size': devices.length.toString(),
        'X-Performance': 'all-devices-no-limits'
      }
    })

  } catch (error) {
    console.error('[INVENTORY API] Error fetching inventory:', error)
    return NextResponse.json([], {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Error': error instanceof Error ? error.message : String(error)
      }
    })
  }
}

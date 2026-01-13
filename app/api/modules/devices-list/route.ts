import { NextResponse } from 'next/server'
import { getInternalApiHeaders } from '@/lib/api-auth'

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const timestamp = new Date().toISOString()
    
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://reportmate-functions-api.blackdune-79551938.canadacentral.azurecontainerapps.io'
    
    // Use shared authentication headers
    const headers = getInternalApiHeaders()

    const devicesResponse = await fetch(`${API_BASE_URL}/api/devices`, { headers })

    if (!devicesResponse.ok) {
      throw new Error(`FastAPI Container returned ${devicesResponse.status}: ${devicesResponse.statusText}`)
    }

    const devicesData = await devicesResponse.json()
    const devices = devicesData.devices || []
    
        
    // Process devices with inventory data only - NO system calls
    const processedDevices = devices.map((device: any) => ({
      deviceId: device.deviceId,
      serialNumber: device.serialNumber,
      name: device.deviceName || device.serialNumber,
      lastSeen: device.lastSeen || new Date().toISOString(),
      createdAt: device.createdAt,
      status: device.status === 'online' ? 'active' : (device.status || 'unknown'),
      totalEvents: device.totalEvents || 0,
      lastEventTime: device.lastEventTime || device.lastSeen,
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
        }
      }
    }))
    
        
    return NextResponse.json(processedDevices, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache', 
        'Expires': '0',
        'X-Fetched-At': timestamp,
        'X-Data-Source': 'fastapi-container-inventory-only',
        'X-Devices-Processed': processedDevices.length.toString(),
        'X-Performance': 'ultra-fast-inventory-only'
      }
    })

  } catch (error) {
    console.error('[DEVICES LIST API] Error:', error)
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
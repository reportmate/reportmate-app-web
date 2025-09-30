import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('[DIAGNOSTIC] Testing both APIs from server side')
    
    // Test devices API
    const devicesResponse = await fetch('http://localhost:3000/api/devices', {
      cache: 'no-store'
    })
    const devicesData = await devicesResponse.json()
    
    // Test events API
    const eventsResponse = await fetch('http://localhost:3000/api/events?limit=5', {
      cache: 'no-store'
    })
    const eventsData = await eventsResponse.json()
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      devices: {
        status: devicesResponse.status,
        hasSuccess: 'success' in devicesData,
        successValue: devicesData.success,
        hasDevices: 'devices' in devicesData,
        devicesCount: devicesData.devices?.length || 0,
        firstDeviceName: devicesData.devices?.[0]?.name
      },
      events: {
        status: eventsResponse.status,
        hasSuccess: 'success' in eventsData,
        successValue: eventsData.success,
        hasEvents: 'events' in eventsData,
        eventsCount: eventsData.events?.length || 0,
        firstEventDevice: eventsData.events?.[0]?.device
      }
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
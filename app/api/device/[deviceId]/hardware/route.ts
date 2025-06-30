import { NextResponse } from 'next/server'
import { deviceDatabase } from '../route'

export async function GET(
  request: Request,
  { params }: { params: { deviceId: string } }
) {
  try {
    const { deviceId } = params
    const device = deviceDatabase[deviceId]

    if (!device) {
      return NextResponse.json({ success: false, error: 'Device not found' }, { status: 404 })
    }

    // Format hardware data from device properties
    const hardware = {
      processor: device.processor,
      processorSpeed: device.processorSpeed,
      cores: device.cores,
      totalRAM: device.memory,
      availableRAM: device.availableRAM,
      memorySlots: device.memorySlots,
      storage: device.storage,
      availableStorage: device.availableStorage,
      storageType: device.storageType,
      gpu: device.graphics,
      vram: device.vram,
      resolution: device.resolution,
      // Additional hardware details
      architecture: device.architecture,
      temperature: device.temperature,
      batteryLevel: device.batteryLevel,
      diskUtilization: device.diskUtilization,
      memoryUtilization: device.memoryUtilization,
      cpuUtilization: device.cpuUtilization
    }

    return NextResponse.json({ success: true, hardware })
  } catch (error) {
    console.error('Error fetching hardware data:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

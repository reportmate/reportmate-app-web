import { NextResponse } from 'next/server'

// Import the device database to get managed installs data
import { deviceDatabase } from '../route'

export async function GET(
  request: Request,
  { params }: { params: { deviceId: string } }
) {
  const { deviceId } = params
  
  // Get device from mock database
  const device = deviceDatabase[deviceId]
  
  if (!device) {
    return NextResponse.json({ 
      success: false, 
      error: 'Device not found' 
    }, { status: 404 })
  }

  if (!device.managedInstalls) {
    return NextResponse.json({ 
      success: false, 
      error: 'No managed installs data available' 
    }, { status: 404 })
  }

  // Transform and enhance the managed installs data
  const managedInstalls = {
    ...device.managedInstalls,
    // Add summary statistics
    totalPackages: device.managedInstalls.packages?.length || 0,
    installed: device.managedInstalls.packages?.filter((p: any) => 
      p.status === 'Installed' || p.status === 'installed'
    ).length || 0,
    pending: device.managedInstalls.packages?.filter((p: any) => 
      p.status.includes('Pending') || p.status.includes('pending')
    ).length || 0,
    failed: device.managedInstalls.packages?.filter((p: any) => 
      p.status === 'Failed' || p.status === 'failed' || p.status.includes('Failed')
    ).length || 0,
    // Transform packages for consistent interface
    packages: device.managedInstalls.packages?.map((pkg: any, index: number) => ({
      id: `pkg-${deviceId}-${index}`,
      name: pkg.name,
      displayName: pkg.name,
      version: pkg.version,
      installedVersion: pkg.installedVersion || pkg.version,
      status: pkg.status,
      lastUpdate: pkg.installDate,
      size: pkg.size,
      type: device.managedInstalls.type.toLowerCase(),
      description: pkg.description || '',
      publisher: pkg.publisher || '',
      category: pkg.category || 'Software'
    })) || []
  }

  return NextResponse.json({
    success: true,
    managedInstalls
  })
}

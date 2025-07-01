import { NextResponse } from 'next/server'
import { pool } from '../../../src/lib/db'

// Mock device database - extended to match individual device endpoint
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const deviceDatabase: Record<string, any> = {
  // Mac Device 1 - Marketing Designer
  'JY93C5YGGM': {
    id: 'JY93C5YGGM',
    name: 'Celeste Martin',
    model: 'MacBook Air (15-inch, M2, 2023)',
    os: 'macOS 15.2.0',
    lastSeen: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
    status: 'online',
    uptime: '25 days, 14 hours',
    location: 'Marketing',
    serialNumber: 'JY93C5YGGM',
    assetTag: 'MAC-001',
    ipAddress: '108.172.84.175',
    macAddress: '00:9B:8F:7F:4B:D4',
    totalEvents: 1247,
    lastEventTime: new Date(Date.now() - 1800000).toISOString()
  },
  
  // Mac Device 2 - Software Developer
  'FVFXQ2P3JM': {
    id: 'FVFXQ2P3JM',
    name: 'Alex Chen',
    model: 'MacBook Pro (16-inch, M3 Pro, 2023)',
    os: 'macOS 15.2.0',
    lastSeen: new Date(Date.now() - 900000).toISOString(), // 15 minutes ago
    status: 'online',
    uptime: '12 days, 8 hours',
    location: 'Engineering',
    serialNumber: 'FVFXQ2P3JM',
    assetTag: 'MAC-002',
    ipAddress: '192.168.1.142',
    macAddress: '14:7D:DA:8C:9A:2B',
    totalEvents: 2134,
    lastEventTime: new Date(Date.now() - 900000).toISOString()
  },
  
  // Mac Device 3 - Executive Assistant
  'C02ZK8WVLVDQ': {
    id: 'C02ZK8WVLVDQ',
    name: 'Sarah Johnson',
    model: 'iMac (24-inch, M1, 2021)',
    os: 'macOS 15.1.0',
    lastSeen: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
    status: 'offline',
    uptime: '0 days',
    location: 'Executive Office',
    serialNumber: 'C02ZK8WVLVDQ',
    ipAddress: '192.168.1.89',
    macAddress: 'A4:83:E7:2C:45:8A',
    totalEvents: 567,
    lastEventTime: new Date(Date.now() - 43200000).toISOString()
  },
  
  // Windows Device 1 - Accounting Manager
  'WS-ACC-001': {
    id: 'WS-ACC-001',
    name: 'Jennifer Davis',
    model: 'Dell OptiPlex 7090',
    os: '11.0.22631.2861',
    lastSeen: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    status: 'warning',
    uptime: '5 days, 16 hours',
    location: 'Accounting',
    serialNumber: 'WS-ACC-001',
    assetTag: 'WIN-001',
    ipAddress: '192.168.1.156',
    macAddress: '00:0C:29:8F:A2:B4',
    totalEvents: 1089,
    lastEventTime: new Date(Date.now() - 3600000).toISOString()
  },
  
  // Windows Device 2 - Sales Representative
  'LT-SAL-007': {
    id: 'LT-SAL-007',
    name: 'Marcus Thompson',
    model: 'Lenovo ThinkPad X1 Carbon Gen 11',
    os: '11.0.22631.2861',
    lastSeen: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
    status: 'online',
    uptime: '18 days, 4 hours',
    location: 'Sales',
    serialNumber: 'LT-SAL-007',
    assetTag: 'WIN-002',
    ipAddress: '10.0.2.47',
    macAddress: '48:2A:E3:4F:7D:C1',
    totalEvents: 1756,
    lastEventTime: new Date(Date.now() - 600000).toISOString()
  },
  
  // Windows Device 3 - IT Technician
  'WS-IT-003': {
    id: 'WS-IT-003',
    name: 'Ryan Martinez',
    model: 'HP Z4 G5 Workstation',
    os: '11.0.22631.2861',
    lastSeen: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    status: 'warning',
    uptime: '3 days, 22 hours',
    location: 'IT Department',
    serialNumber: 'WS-IT-003',
    assetTag: 'WIN-003',
    ipAddress: '192.168.1.203',
    macAddress: '94:C6:91:1A:2F:8E',
    totalEvents: 2945,
    lastEventTime: new Date(Date.now() - 7200000).toISOString()
  },
  
  // Additional Mac Device - Designer
  'F8Q7L5MNPX': {
    id: 'F8Q7L5MNPX',
    name: 'Emily Rodriguez',
    model: 'MacBook Pro (14-inch, M2 Pro, 2023)',
    os: 'macOS 15.0.0',
    lastSeen: new Date(Date.now() - 2700000).toISOString(), // 45 minutes ago
    status: 'online',
    uptime: '8 days, 12 hours',
    location: 'Design',
    serialNumber: 'F8Q7L5MNPX',
    assetTag: 'MAC-003',
    ipAddress: '192.168.1.89',
    macAddress: 'F4:5C:89:B2:A1:D3',
    totalEvents: 892,
    lastEventTime: new Date(Date.now() - 2700000).toISOString()
  },
  
  // Older Mac Device - Legacy System
  'C02VH8XKHV2T': {
    id: 'C02VH8XKHV2T',
    name: 'David Wilson',
    model: 'MacBook Pro (13-inch, 2020)',
    os: 'macOS 14.7.2',
    lastSeen: new Date(Date.now() - 5400000).toISOString(), // 1.5 hours ago
    status: 'offline',
    uptime: '0 days',
    location: 'Research',
    serialNumber: 'C02VH8XKHV2T',
    assetTag: 'MAC-004',
    ipAddress: '192.168.1.145',
    macAddress: '88:E9:FE:8B:7A:9C',
    totalEvents: 1456,
    lastEventTime: new Date(Date.now() - 5400000).toISOString()
  },
  
  // Windows 10 Device - Legacy System
  'WS-LEG-005': {
    id: 'WS-LEG-005',
    name: 'Lisa Brown',
    model: 'Dell Latitude 5520',
    os: '10.0.19045.3803',
    lastSeen: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
    status: 'error',
    uptime: '0 days',
    location: 'Operations',
    serialNumber: 'WS-LEG-005',
    assetTag: 'WIN-004',
    ipAddress: '192.168.1.178',
    macAddress: '2C:F0:5D:A7:8B:1E',
    totalEvents: 743,
    lastEventTime: new Date(Date.now() - 10800000).toISOString()
  },
  
  // Another Windows 10 Device
  'WS-HR-002': {
    id: 'WS-HR-002',
    name: 'Michael Garcia',
    model: 'HP ProDesk 600 G6',
    os: '10.0.19045.3803',
    lastSeen: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
    status: 'online',
    uptime: '7 days, 9 hours',
    location: 'HR',
    serialNumber: 'WS-HR-002',
    assetTag: 'WIN-005',
    ipAddress: '192.168.1.167',
    macAddress: '70:85:C2:3F:D1:B8',
    totalEvents: 1234,
    lastEventTime: new Date(Date.now() - 1800000).toISOString()
  },

  // Additional Windows 11 Device with different build
  'WS-DEV-008': {
    id: 'WS-DEV-008',
    name: 'Angela Foster',
    model: 'Surface Laptop Studio',
    os: '11.0.22631.3007',
    lastSeen: new Date(Date.now() - 1200000).toISOString(), // 20 minutes ago
    status: 'online',
    uptime: '2 days, 15 hours',
    location: 'Development',
    serialNumber: 'WS-DEV-008',
    assetTag: 'WIN-006',
    ipAddress: '192.168.1.198',
    macAddress: '3C:A8:2A:4B:9F:7E',
    totalEvents: 967,
    lastEventTime: new Date(Date.now() - 1200000).toISOString()
  },
  
  // Windows 11 with different build number
  'WS-MKT-009': {
    id: 'WS-MKT-009',
    name: 'Carlos Rodriguez',
    model: 'Dell XPS 13',
    os: '11.0.22631.2428',
    lastSeen: new Date(Date.now() - 2400000).toISOString(), // 40 minutes ago
    status: 'online',
    uptime: '6 days, 11 hours',
    location: 'Marketing',
    serialNumber: 'WS-MKT-009',
    assetTag: 'WIN-007',
    ipAddress: '192.168.1.201',
    macAddress: '9C:B6:D0:1A:4F:2C',
    totalEvents: 1543,
    lastEventTime: new Date(Date.now() - 2400000).toISOString()
  },

  // Additional macOS versions
  'MBP-ENG-010': {
    id: 'MBP-ENG-010',
    name: 'Jessica Park',
    model: 'MacBook Pro (16-inch, M3 Max, 2023)', 
    os: 'macOS 15.5.0',
    lastSeen: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
    status: 'online',
    uptime: '15 days, 3 hours',
    location: 'Engineering',
    serialNumber: 'MBP-ENG-010',
    assetTag: 'MAC-005',
    ipAddress: '192.168.1.220',
    macAddress: 'BC:D0:74:A8:9B:3F',
    totalEvents: 3421,
    lastEventTime: new Date(Date.now() - 300000).toISOString()
  },

  // macOS 15.1.0
  'MBA-DES-011': {
    id: 'MBA-DES-011',
    name: 'Thomas Wright',
    model: 'MacBook Air (13-inch, M3, 2024)',
    os: 'macOS 15.1.0',
    lastSeen: new Date(Date.now() - 900000).toISOString(), // 15 minutes ago
    status: 'online', 
    uptime: '9 days, 7 hours',
    location: 'Design',
    serialNumber: 'MBA-DES-011',
    assetTag: 'MAC-006',
    ipAddress: '192.168.1.225',
    macAddress: 'F0:18:98:5C:2A:1D',
    totalEvents: 1876,
    lastEventTime: new Date(Date.now() - 900000).toISOString()
  },

  // Windows 11 with newer revision
  'WS-ENG-012': {
    id: 'WS-ENG-012',
    name: 'Rachel Kim',
    model: 'Microsoft Surface Studio',
    os: '11.0.22631.4602', 
    lastSeen: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
    status: 'online',
    uptime: '11 days, 2 hours',
    location: 'Engineering',
    serialNumber: 'WS-ENG-012',
    assetTag: 'WIN-008',
    ipAddress: '192.168.1.230',
    macAddress: 'A4:C3:F0:2D:8E:1B',
    totalEvents: 2187,
    lastEventTime: new Date(Date.now() - 600000).toISOString()
  }
}

// Function to register/update a device from ingest data
export function registerDevice(deviceName: string, eventData: any) {
  const deviceId = deviceName.toUpperCase()
  const now = new Date().toISOString()
  
  // Create or update device entry
  if (!deviceDatabase[deviceId]) {
    console.log(`[DEVICE] Registering new device: ${deviceId}`)
    
    // Create new device entry with defaults
    deviceDatabase[deviceId] = {
      id: deviceId,
      name: deviceName,
      model: 'Unknown Model',
      os: 'Unknown OS',
      lastSeen: now,
      status: 'online',
      uptime: 'Unknown',
      location: 'Unknown',
      serialNumber: deviceId,
      assetTag: deviceId,
      ipAddress: 'Unknown',
      macAddress: 'Unknown',
      totalEvents: 1,
      lastEventTime: now,
      // Extended properties
      processor: 'Unknown',
      memory: 'Unknown',
      storage: 'Unknown',
      networkInterfaces: [],
      securityFeatures: {},
      applications: [],
      isRealDevice: true // Flag to distinguish from demo devices
    }
  } else {
    console.log(`[DEVICE] Updating existing device: ${deviceId}`)
    
    // Update existing device
    deviceDatabase[deviceId].lastSeen = now
    deviceDatabase[deviceId].lastEventTime = now
    deviceDatabase[deviceId].status = 'online'
    deviceDatabase[deviceId].totalEvents = (deviceDatabase[deviceId].totalEvents || 0) + 1
  }
  
  // Extract and update device info from osquery data if available
  if (eventData.payload) {
    updateDeviceFromOsqueryData(deviceId, eventData.payload)
  }
  
  return deviceDatabase[deviceId]
}

// Function to update device details from osquery data
function updateDeviceFromOsqueryData(deviceId: string, payload: any) {
  const device = deviceDatabase[deviceId]
  if (!device) return
  
  try {
    // Update from system_info if available
    if (payload.system_info && Array.isArray(payload.system_info) && payload.system_info.length > 0) {
      const systemInfo = payload.system_info[0]
      device.name = systemInfo.hostname || device.name
      device.processor = systemInfo.cpu_brand || device.processor
      device.memory = systemInfo.physical_memory ? `${Math.round(systemInfo.physical_memory / 1024 / 1024 / 1024)} GB` : device.memory
      device.model = `${systemInfo.hardware_vendor || ''} ${systemInfo.hardware_model || ''}`.trim() || device.model
    }
    
    // Update from os_version if available
    if (payload.os_version && Array.isArray(payload.os_version) && payload.os_version.length > 0) {
      const osVersion = payload.os_version[0]
      device.os = `${osVersion.name || ''} ${osVersion.version || ''}`.trim() || device.os
    }
    
    // Update from network interfaces if available
    if (payload.network_interfaces && Array.isArray(payload.network_interfaces)) {
      device.networkInterfaces = payload.network_interfaces.map((intf: any) => ({
        name: intf.interface || 'Unknown',
        ipAddress: intf.address || null,
        type: 'Network',
        status: intf.address ? 'Connected' : 'Disconnected'
      }))
      
      // Set primary IP address
      const primaryInterface = payload.network_interfaces.find((intf: any) => 
        intf.address && !intf.address.startsWith('127.') && !intf.address.startsWith('169.254.')
      )
      if (primaryInterface) {
        device.ipAddress = primaryInterface.address
      }
    }
    
    // Update from installed applications if available
    if (payload.installed_applications && Array.isArray(payload.installed_applications)) {
      device.applications = payload.installed_applications.slice(0, 20).map((app: any) => ({
        name: app.name || 'Unknown Application',
        version: app.version || 'Unknown',
        publisher: app.publisher || 'Unknown',
        installDate: app.install_date || null,
        size: 'Unknown'
      }))
    }
    
    // Update security features for Windows
    if (payload.bitlocker_status || payload.security_features) {
      device.securityFeatures = {
        ...device.securityFeatures,
        bitlocker: payload.bitlocker_status ? { enabled: true, status: 'Encrypted' } : undefined,
        windowsDefender: payload.security_features ? { enabled: true, status: 'Active' } : undefined
      }
    }
    
    console.log(`[DEVICE] Updated device ${deviceId} with osquery data`)
  } catch (error) {
    console.warn(`[DEVICE] Failed to update device ${deviceId} from osquery data:`, error)
  }
}

export async function GET() {
  try {
    // Return all devices as an array
    const devices = Object.values(deviceDatabase).map(device => ({
      id: device.id,
      name: device.name,
      model: device.model,
      os: device.os.startsWith('macOS ') ? device.os.replace('macOS ', '') : device.os,
      lastSeen: device.lastSeen,
      status: device.status,
      uptime: device.uptime,
      location: device.location,
      serialNumber: device.serialNumber,
      assetTag: device.assetTag,
      ipAddress: device.ipAddress,
      macAddress: device.macAddress,
      totalEvents: device.totalEvents,
      lastEventTime: device.lastEventTime
    }))
    
    return NextResponse.json({
      success: true,
      devices,
      count: devices.length
    })
  } catch (error) {
    console.error('API: Error in device GET:', error)
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 })
  }
}

// POST method for device registration
export async function POST(request: Request) {
  try {
    const deviceData = await request.json()
    
    console.log(`[DEVICE REGISTRATION] Registering device: ${deviceData.serialNumber || deviceData.id || 'unknown'}`)
    
    // Validate required fields
    if (!deviceData.serialNumber && !deviceData.id) {
      return NextResponse.json({
        success: false,
        error: "Device serial number or ID is required",
        code: "SERIAL_REQUIRED"
      }, { status: 400 })
    }
    
    const deviceId = deviceData.serialNumber || deviceData.id
    const deviceName = deviceData.name || deviceData.hostname || deviceId
    
    // Insert or update device in the production database
    try {
      const insertResult = await pool.query(`
        INSERT INTO devices (id, name, machine_group_id, created_at, updated_at, last_seen)
        VALUES ($1, $2, NULL, NOW(), NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          updated_at = NOW(),
          last_seen = NOW()
        RETURNING id, name, created_at, updated_at
      `, [
        deviceId,
        deviceName
      ])
      
      const device = insertResult.rows[0]
      
      console.log(`[DEVICE REGISTRATION] Device ${device.id} registered successfully: ${device.name}`)
      
      // Also register in the in-memory cache for immediate lookup
      registerDevice(deviceId, { payload: deviceData })
      
      return NextResponse.json({
        success: true,
        message: "Device registered successfully",
        device: {
          id: device.id,
          name: device.name,
          serialNumber: device.id,
          registeredAt: device.created_at,
          lastUpdated: device.updated_at
        }
      })
      
    } catch (dbError) {
      console.error('[DEVICE REGISTRATION] Database insert failed:', dbError)
      
      return NextResponse.json({
        success: false,
        error: "Failed to register device in database",
        details: dbError instanceof Error ? dbError.message : String(dbError)
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('[DEVICE REGISTRATION] Error processing registration:', error)
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 })
  }
}

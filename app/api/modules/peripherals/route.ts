import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const createModuleAPI = (moduleName: string, moduleFields: any) => {
  return async function GET(request: Request) {
    try {
      const { searchParams } = new URL(request.url)
      const limit = Math.min(parseInt(searchParams.get('limit') || '1000'), 5000) // Max 5000, default 1000
      
      const timestamp = new Date().toISOString()
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Pool } = require('pg')
      const pool = new Pool({ connectionString: process.env.DATABASE_URL })

      const result = await pool.query(`
        SELECT 
          m.device_id, d.name as device_name, d.serial_number, d.last_seen,
          m.data, m.collected_at
        FROM ${moduleName} m
        JOIN devices d ON m.device_id = d.id
        ORDER BY m.updated_at DESC LIMIT $1
      `, [limit])
      
      const moduleData = result.rows.map((row: any) => {
        const data = row.data || {}
        return {
          id: row.device_id,
          deviceId: row.device_id,
          deviceName: row.device_name || 'Unknown Device',
          serialNumber: row.serial_number,
          lastSeen: row.last_seen,
          collectedAt: row.collected_at,
          ...moduleFields(data),
          raw: data
        }
      })
      
      return NextResponse.json(moduleData, {
        headers: { 'X-Fetched-At': timestamp, 'X-Data-Source': 'local-database' }
      })
      
    } catch (error) {
      console.error(`[${moduleName.toUpperCase()} API] Error:`, error)
      return NextResponse.json({ 
        error: `Failed to fetch ${moduleName} data`,
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }
  }
}

// Peripherals module fields extractor
const peripheralsFields = (data: any) => ({
  displays: data.displays || [],
  printers: data.printers || [],
  usbDevices: data.usbDevices || [],
  inputDevices: data.inputDevices || [],
  audioDevices: data.audioDevices || [],
  bluetoothDevices: data.bluetoothDevices || [],
  totalPeripherals: (data.displays?.length || 0) + 
                   (data.printers?.length || 0) + 
                   (data.usbDevices?.length || 0) + 
                   (data.inputDevices?.length || 0) + 
                   (data.audioDevices?.length || 0) + 
                   (data.bluetoothDevices?.length || 0)
})

export const GET = createModuleAPI('peripherals', peripheralsFields)

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '1000'), 5000) // Max 5000, default 1000
    const timestamp = new Date().toISOString()
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pool } = require('pg')
    const pool = new Pool({ connectionString: process.env.DATABASE_URL })

    const result = await pool.query(`
      SELECT 
        s.device_id, d.name as device_name, d.serial_number, d.last_seen,
        s.data, s.collected_at
      FROM system s
      JOIN devices d ON s.device_id = d.id
      ORDER BY s.updated_at DESC LIMIT $1
    `, [limit])
    
    const systemData = result.rows.map((row: any) => {
      const data = row.data || {}
      return {
        id: row.device_id,
        deviceId: row.device_id,
        deviceName: row.device_name || 'Unknown Device',
        serialNumber: row.serial_number,
        lastSeen: row.last_seen,
        collectedAt: row.collected_at,
        operatingSystem: data.operatingSystem?.name || data.os || 'Unknown OS',
        osVersion: data.operatingSystem?.version || data.osVersion || null,
        buildNumber: data.operatingSystem?.build || data.buildNumber || null,
        uptime: data.uptime || null,
        bootTime: data.bootTime || data.lastBootTime || null,
        raw: data
      }
    })
    
    return NextResponse.json(systemData, {
      headers: { 'X-Fetched-At': timestamp, 'X-Data-Source': 'local-database' }
    })
    
  } catch (error) {
    console.error('[SYSTEM API] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch system data' }, { status: 500 })
  }
}

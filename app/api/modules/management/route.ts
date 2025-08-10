import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const timestamp = new Date().toISOString()
    const { Pool } = require('pg')
    const pool = new Pool({ connectionString: process.env.DATABASE_URL })

    const result = await pool.query(`
      SELECT 
        m.device_id, d.name as device_name, d.serial_number, d.last_seen,
        m.data, m.collected_at
      FROM management m
      JOIN devices d ON m.device_id = d.id
      ORDER BY m.updated_at DESC LIMIT 1000
    `)
    
    const managementData = result.rows.map((row: any) => {
      const data = row.data || {}
      return {
        id: row.device_id,
        deviceId: row.device_id,
        deviceName: row.device_name || 'Unknown Device',
        serialNumber: row.serial_number,
        lastSeen: row.last_seen,
        collectedAt: row.collected_at,
        mdmEnrolled: data.mdmEnrolled || data.enrolled || false,
        managementServer: data.managementServer || data.server || null,
        enrollmentStatus: data.enrollmentStatus || data.status || 'unknown',
        lastSync: data.lastSync || data.lastSyncTime || null,
        raw: data
      }
    })
    
    return NextResponse.json(managementData, {
      headers: { 'X-Fetched-At': timestamp, 'X-Data-Source': 'local-database' }
    })
    
  } catch (error) {
    console.error('[MANAGEMENT API] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch management data' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const timestamp = new Date().toISOString()
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pool } = require('pg')
    const pool = new Pool({ connectionString: process.env.DATABASE_URL })

    const result = await pool.query(`
      SELECT 
        p.device_id, d.name as device_name, d.serial_number, d.last_seen,
        p.data, p.collected_at
      FROM profiles p
      JOIN devices d ON p.device_id = d.id
      ORDER BY p.updated_at DESC LIMIT 1000
    `)
    
    const profilesData = result.rows.map((row: any) => {
      const data = row.data || {}
      return {
        id: row.device_id,
        deviceId: row.device_id,
        deviceName: row.device_name || 'Unknown Device',
        serialNumber: row.serial_number,
        lastSeen: row.last_seen,
        collectedAt: row.collected_at,
        profiles: data.profiles || [],
        totalProfiles: data.profiles?.length || 0,
        systemProfiles: data.profiles?.filter((p: any) => p.scope === 'system').length || 0,
        userProfiles: data.profiles?.filter((p: any) => p.scope === 'user').length || 0,
        raw: data
      }
    })
    
    return NextResponse.json(profilesData, {
      headers: { 'X-Fetched-At': timestamp, 'X-Data-Source': 'local-database' }
    })
    
  } catch (error) {
    console.error('[PROFILES API] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch profiles data' }, { status: 500 })
  }
}

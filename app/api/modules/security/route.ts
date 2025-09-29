import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '1000'), 5000) // Max 5000, default 1000
    const timestamp = new Date().toISOString()
    console.log(`[SECURITY API] ${timestamp} - Fetching security data`)

    const apiBaseUrl = process.env.API_BASE_URL
    
    if (!apiBaseUrl) {
      return NextResponse.json({
        error: 'API configuration error',
        details: 'API_BASE_URL environment variable not configured'
      }, { status: 500 })
    }
    
    const useLocalFallback = true
    
    if (useLocalFallback) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { Pool } = require('pg')
        const pool = new Pool({
          connectionString: process.env.DATABASE_URL
        })

        const result = await pool.query(`
          SELECT 
            s.device_id,
            d.name as device_name,
            d.serial_number,
            d.last_seen,
            s.data,
            s.collected_at
          FROM security s
          JOIN devices d ON s.device_id = d.id
          ORDER BY s.updated_at DESC
          LIMIT $1
        `, [limit])
        
        const securityData = result.rows.map((row: any) => {
          const data = row.data || {}
          
          return {
            id: row.device_id,
            deviceId: row.device_id,
            deviceName: row.device_name || 'Unknown Device',
            serialNumber: row.serial_number,
            lastSeen: row.last_seen,
            collectedAt: row.collected_at,
            // Security-specific fields
            antivirus: data.antivirus || data.antivirusStatus || null,
            firewall: data.firewall || data.firewallStatus || null,
            bitlocker: data.bitlocker || data.encryption || null,
            tpm: data.tpm || data.trustedPlatformModule || null,
            windowsDefender: data.windowsDefender || data.defender || null,
            // Raw data
            raw: data
          }
        })
        
        console.log(`[SECURITY API] ${timestamp} - Successfully fetched ${securityData.length} security records`)
        
        return NextResponse.json(securityData, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'X-Fetched-At': timestamp,
            'X-Data-Source': 'local-database'
          }
        })
        
      } catch (dbError) {
        console.error(`[SECURITY API] ${timestamp} - Local database error:`, dbError)
        return NextResponse.json({
          error: 'Database error',
          details: 'Failed to fetch security data'
        }, { status: 500 })
      }
    }
    
  } catch (error) {
    console.error('[SECURITY API] Failed to fetch security data:', error)
    return NextResponse.json({
      error: 'API request failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

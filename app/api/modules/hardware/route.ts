import { NextResponse } from 'next/server'

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const timestamp = new Date().toISOString()
    console.log(`[HARDWARE API] ${timestamp} - Fetching hardware data`)

    const apiBaseUrl = process.env.API_BASE_URL
    
    if (!apiBaseUrl) {
      console.error(`[HARDWARE API] ${timestamp} - API_BASE_URL environment variable not configured`)
      return NextResponse.json({
        error: 'API configuration error',
        details: 'API_BASE_URL environment variable not configured'
      }, { status: 500 })
    }
    
    let response
    let useLocalFallback = false
    
    try {
      response = await fetch(`${apiBaseUrl}/api/hardware`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'X-API-PASSPHRASE': 's3cur3-p@ssphras3!'
        }
      })
      
      if (!response.ok) {
        console.error(`[HARDWARE API] ${timestamp} - Azure Functions API error:`, response.status, response.statusText)
        useLocalFallback = true
      }
    } catch (fetchError) {
      console.error(`[HARDWARE API] ${timestamp} - Failed to reach Azure Functions API:`, fetchError)
      useLocalFallback = true
    }
    
    if (useLocalFallback) {
      console.log(`[HARDWARE API] ${timestamp} - Using local database fallback`)
      
      try {
        const { Pool } = require('pg')
        const pool = new Pool({
          connectionString: process.env.DATABASE_URL
        })

        const result = await pool.query(`
          SELECT 
            h.device_id,
            d.name as device_name,
            d.serial_number,
            d.last_seen,
            h.data,
            h.collected_at
          FROM hardware h
          JOIN devices d ON h.device_id = d.id
          ORDER BY h.updated_at DESC
          LIMIT 1000
        `)
        
        const hardwareData = result.rows.map((row: any) => {
          const data = row.data || {}
          
          return {
            id: row.device_id,
            deviceId: row.device_id,
            deviceName: row.device_name || 'Unknown Device',
            serialNumber: row.serial_number,
            lastSeen: row.last_seen,
            collectedAt: row.collected_at,
            // Hardware-specific fields
            processor: data.processor?.name || data.cpu?.name || 'Unknown Processor',
            processorSpeed: data.processor?.speed || data.cpu?.speed || null,
            processorCores: data.processor?.cores || data.cpu?.cores || null,
            memory: data.memory?.total || data.ram?.total || 'Unknown',
            memoryModules: data.memory?.modules || data.ram?.modules || [],
            storage: data.storage?.drives || data.disks || [],
            graphics: data.graphics?.cards || data.gpu || [],
            motherboard: data.motherboard || data.mainboard || null,
            // Raw data
            raw: data
          }
        })
        
        console.log(`[HARDWARE API] ${timestamp} - Successfully fetched ${hardwareData.length} hardware records`)
        
        return NextResponse.json(hardwareData, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'X-Fetched-At': timestamp,
            'X-Data-Source': 'local-database'
          }
        })
        
      } catch (dbError) {
        console.error(`[HARDWARE API] ${timestamp} - Local database error:`, dbError)
        return NextResponse.json({
          error: 'Database error',
          details: 'Failed to fetch hardware data'
        }, { status: 500 })
      }
    }
    
    if (!response) {
      throw new Error('Response is undefined')
    }
    
    const data = await response.json()
    console.log(`[HARDWARE API] ${timestamp} - Successfully received data from Azure Functions API`)
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Fetched-At': timestamp,
        'X-Data-Source': 'azure-functions'
      }
    })
    
  } catch (error) {
    console.error('[HARDWARE API] Failed to fetch hardware data:', error)
    return NextResponse.json({
      error: 'API request failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

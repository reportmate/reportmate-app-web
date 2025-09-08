import { NextResponse } from 'next/server'

// Cache for bulk hardware data
let hardwareCache: any[] = []
let cacheTimestamp: number = 0
const CACHE_DURATION = 30 * 1000 // 30 seconds (shorter for debugging)

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const timestamp = new Date().toISOString()
    console.log(`[BULK HARDWARE API] ${timestamp} - Fetching bulk hardware data`)

    // Check cache first - but add debugging
    const now = Date.now()
    if (hardwareCache.length > 0 && (now - cacheTimestamp) < CACHE_DURATION) {
      console.log(`[BULK HARDWARE API] ${timestamp} - Serving from cache: ${hardwareCache.length} devices`)
      console.log(`[BULK HARDWARE API] ${timestamp} - Cache sample:`, hardwareCache[0] ? Object.keys(hardwareCache[0]) : 'no items')
      return NextResponse.json(hardwareCache, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'X-Fetched-At': new Date(cacheTimestamp).toISOString(),
          'X-Data-Source': 'in-memory-cache'
        }
      })
    }

    console.log(`[BULK HARDWARE API] ${timestamp} - Fetching fresh data, cache age: ${now - cacheTimestamp}ms, cache size: ${hardwareCache.length}`)

    // Get database connection
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pool } = require('pg')
    const pool = new Pool({ connectionString: process.env.DATABASE_URL })

    try {
      // Get all devices with their hardware data in a single optimized query
      const query = `
        SELECT DISTINCT ON (d.serial_number)
          d.serial_number,
          d.device_id,
          d.last_seen,
          d.created_at,
          h.data as hardware_data,
          h.collected_at as hardware_collected_at,
          h.updated_at as hardware_updated_at,
          s.data as system_data,
          -- Get device name from inventory
          inv.data->>'deviceName' as device_name,
          inv.data->>'computerName' as computer_name
        FROM devices d
        LEFT JOIN hardware h ON d.id = h.device_id
        LEFT JOIN system s ON d.id = s.device_id
        LEFT JOIN inventory inv ON d.id = inv.device_id
        WHERE d.serial_number IS NOT NULL
          AND d.serial_number NOT LIKE 'TEST-%'
          AND d.serial_number != 'localhost'
        ORDER BY d.serial_number, h.updated_at DESC, s.updated_at DESC, inv.updated_at DESC
      `

      const result = await pool.query(query)
      console.log(`[BULK HARDWARE API] ${timestamp} - Got ${result.rows.length} device records from database`)

      // Process the hardware data using the same extraction logic
      const { extractHardware } = await import('../../../../src/lib/data-processing/modules/hardware')
      
      const processedDevices = result.rows
        .map((row: any) => {
          try {
            const serialNumber = row.serial_number
            const deviceName = row.device_name || row.computer_name || serialNumber || 'Unknown Device'
            
            // Create device structure for module processing
            const deviceModules = {
              hardware: row.hardware_data || {},
              system: row.system_data || {}
            }
            
            // Extract hardware using the ReportMate module system
            const hardwareData = extractHardware(deviceModules)

            // Extract architecture from various sources
            let architecture = 'Unknown'
            
            if (hardwareData.architecture) {
              architecture = hardwareData.architecture
            } else if (row.system_data?.operatingSystem?.architecture) {
              architecture = row.system_data.operatingSystem.architecture
            } else if (row.hardware_data?.processor?.architecture) {
              architecture = row.hardware_data.processor.architecture
            }

            return {
              id: row.device_id,
              deviceId: row.device_id,
              deviceName: deviceName,
              serialNumber: serialNumber,
              lastSeen: row.last_seen,
              collectedAt: row.hardware_collected_at || row.last_seen,
              
              // Hardware summary fields
              manufacturer: row.hardware_data?.manufacturer || 'Unknown',
              model: row.hardware_data?.model || 'Unknown',
              architecture: architecture,
              processor: hardwareData.processor || 'Unknown',
              processorSpeed: hardwareData.processorSpeed || 'Unknown',
              processorCores: hardwareData.cores || 0,
              cores: hardwareData.cores || 0,
              memory: hardwareData.memory || 'Unknown',
              storage: hardwareData.storage || 'Unknown',
              graphics: hardwareData.graphics || 'Unknown',
              memoryGB: row.hardware_data?.memory?.totalGB || 0,
              storageGB: row.hardware_data?.storage?.totalGB || 0,
              
              // Full hardware data for detailed views
              hardware: hardwareData,
              raw: {
                hardware: row.hardware_data,
                system: row.system_data
              },
              
              // Include full modules structure for chart processing
              modules: {
                hardware: row.hardware_data || {},
                system: row.system_data || {}
              }
            }
          } catch (error) {
            console.warn(`[BULK HARDWARE API] Error processing device ${row.serial_number}:`, error)
            return null
          }
        })
        .filter(Boolean) // Remove null entries

      await pool.end()

      // Update cache
      hardwareCache = processedDevices
      cacheTimestamp = now

      console.log(`[BULK HARDWARE API] ${timestamp} - Processed ${processedDevices.length} devices with hardware data`)
      
      return NextResponse.json(processedDevices, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'X-Fetched-At': timestamp,
          'X-Data-Source': 'database-fresh'
        }
      })

    } finally {
      // Ensure pool is closed
      try {
        await pool.end()
      } catch (poolError) {
        console.warn(`[BULK HARDWARE API] ${timestamp} - Error closing pool:`, poolError)
      }
    }

  } catch (error) {
    console.error('[BULK HARDWARE API] Error:', error)
    
    // If we have cached data, return it even if fresh fetch fails
    if (hardwareCache.length > 0) {
      console.log(`[BULK HARDWARE API] Falling back to stale cache: ${hardwareCache.length} devices`)
      return NextResponse.json(hardwareCache, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'X-Fetched-At': new Date(cacheTimestamp).toISOString(),
          'X-Data-Source': 'stale-cache-fallback',
          'X-Warning': 'Fresh-data-fetch-failed'
        }
      })
    }
    
    return NextResponse.json({
      error: 'Failed to fetch bulk hardware data',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

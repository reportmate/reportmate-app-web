import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Processing devices-installs-filters request (Next.js)')
    
    // Query 1: Get all Cimian install items from all devices
    const cimianQuery = `
      SELECT 
        devices.serial_number,
        jsonb_array_elements(installs.data->'cimian'->'items') as item
      FROM installs 
      JOIN devices ON installs.device_id = devices.device_id
      WHERE installs.data->'cimian'->'items' IS NOT NULL
    `
    
    const cimianResult = await pool.query(cimianQuery)
    console.log(`📦 Found ${cimianResult.rows.length} Cimian install records`)
    
    // Extract managed install names (from Cimian)
    const managedInstalls = new Set()
    const devicesWithData = new Set()
    
    for (const record of cimianResult.rows) {
      const serialNumber = record.serial_number
      const itemData = record.item
      
      if (itemData && typeof itemData === 'object') {
        // Extract install name - try multiple possible fields
        const installName = (
          itemData.itemName || 
          itemData.displayName || 
          itemData.name || 
          itemData.id || ''
        )
        
        if (installName && installName.trim()) {
          managedInstalls.add(installName.trim())
          devicesWithData.add(serialNumber)
        }
      }
    }
    
    // Query 2: Get all application names for comparison (unmanaged)
    const applicationsQuery = `
      SELECT DISTINCT
        jsonb_array_elements_text(applications.data->'applications') as app_name
      FROM applications 
      JOIN devices ON applications.device_id = devices.device_id
      WHERE applications.data->'applications' IS NOT NULL
    `
    
    const appResult = await pool.query(applicationsQuery)
    console.log(`🔧 Found ${appResult.rows.length} application records`)
    
    // Extract all application names
    const allApplications = new Set()
    for (const record of appResult.rows) {
      const appName = record.app_name
      if (appName && appName.trim()) {
        allApplications.add(appName.trim())
      }
    }
    
    // Create unmanaged list (apps not in Cimian managed list)
    const unmanagedInstalls = new Set([...allApplications].filter(app => !managedInstalls.has(app)))
    
    // Convert to sorted arrays
    const managedList = Array.from(managedInstalls).sort()
    const unmanagedList = Array.from(unmanagedInstalls).sort()
    
    // Device count query
    const deviceCountResult = await pool.query('SELECT COUNT(DISTINCT device_id) FROM devices')
    const totalDevices = deviceCountResult.rows[0]?.count || 0
    
    console.log('✅ Smart filtering complete:')
    console.log(`   📱 Total devices: ${totalDevices}`)
    console.log(`   📊 Devices with Cimian data: ${devicesWithData.size}`)
    console.log(`   ✅ Managed installs: ${managedList.length}`)
    console.log(`   ❌ Unmanaged installs: ${unmanagedList.length}`)
    console.log(`   🔝 First 5 managed: ${managedList.slice(0, 5)}`)
    
    return NextResponse.json({
      success: true,
      managedInstalls: managedList,
      unmanagedInstalls: unmanagedList,
      devices: {
        total: parseInt(totalDevices),
        withCimianData: devicesWithData.size
      },
      summary: {
        totalManagedInstalls: managedList.length,
        totalUnmanagedInstalls: unmanagedList.length,
        devicesWithData: devicesWithData.size
      }
    })
    
  } catch (error) {
    console.error('❌ Error in devices-installs-filters:', error)
    return NextResponse.json(
      {
        success: false,
        error: `Failed to get install filters: ${error instanceof Error ? error.message : 'Unknown error'}`
      },
      { status: 500 }
    )
  }
}
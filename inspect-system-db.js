// Quick script to inspect what's in the system table
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: "postgresql://reportmate:2sSWbVxyqjXp9WUpeMmzRaC@reportmate-database.postgres.database.azure.com:5432/reportmate?sslmode=require"
})

async function inspectSystemData() {
  try {
    console.log('🔍 Inspecting system table data...')
    
    // Get system table structure
    const structureResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'system'
      ORDER BY ordinal_position
    `)
    
    console.log('\n📋 System table structure:')
    structureResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`)
    })
    
    // Get sample system data
    const dataResult = await pool.query(`
      SELECT device_id, data
      FROM system 
      ORDER BY created_at DESC 
      LIMIT 1
    `)
    
    if (dataResult.rows.length > 0) {
      console.log('\n📦 Sample system data:')
      const systemData = dataResult.rows[0]
      console.log(`Device ID: ${systemData.device_id}`)
      console.log('Raw JSONB data:')
      console.log(JSON.stringify(systemData.data, null, 2))
      
      // Check if operatingSystem exists
      if (systemData.data && systemData.data.operatingSystem) {
        console.log('\n✅ operatingSystem data found!')
        console.log(JSON.stringify(systemData.data.operatingSystem, null, 2))
      } else {
        console.log('\n❌ No operatingSystem data found in the system table!')
        console.log('Available fields:', Object.keys(systemData.data || {}))
      }
    } else {
      console.log('\n❌ No system data found in database')
    }
    
  } catch (error) {
    console.error('❌ Error inspecting database:', error.message)
  } finally {
    await pool.end()
  }
}

inspectSystemData()

// Test script to explore the production database schema
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: "postgresql://reportmate:2sSWbVxyqjXp9WUpeMmzRaC@reportmate-database.postgres.database.azure.com:5432/reportmate?sslmode=require"
})

async function exploreDatabase() {
  try {
    console.log('🔍 Connecting to production database...')
    
    // List all tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `)
    
    console.log('📋 Available tables:')
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`)
    })
    
    // If there are tables, show their structure
    for (const row of tablesResult.rows) {
      const tableName = row.table_name
      console.log(`\n📊 Structure of table "${tableName}":`)
      
      const columnsResult = await pool.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = $1 
        ORDER BY ordinal_position
      `, [tableName])
      
      columnsResult.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(not null)'}`)
      })
      
      // Show sample data
      try {
        const sampleResult = await pool.query(`SELECT * FROM "${tableName}" LIMIT 3`)
        console.log(`  📝 Sample data (${sampleResult.rows.length} rows):`)
        sampleResult.rows.forEach((sampleRow, i) => {
          console.log(`    Row ${i + 1}:`, JSON.stringify(sampleRow, null, 2).substring(0, 200) + '...')
        })
      } catch (err) {
        console.log(`  ⚠️ Could not fetch sample data: ${err.message}`)
      }
    }
    
  } catch (error) {
    console.error('❌ Database exploration failed:', error.message)
  } finally {
    await pool.end()
  }
}

exploreDatabase()

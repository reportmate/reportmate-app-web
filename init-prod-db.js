// Apply database schema to production database
const { Pool } = require('pg')
const fs = require('fs')

const pool = new Pool({
  connectionString: "postgresql://reportmate:2sSWbVxyqjXp9WUpeMmzRaC@reportmate-database.postgres.database.azure.com:5432/reportmate?sslmode=require"
})

async function initializeDatabase() {
  try {
    console.log('🔧 Initializing production database schema...')
    
    // Read the simplified Azure-compatible schema file
    const schemaSQL = fs.readFileSync('../../azure-database-core.sql', 'utf8')
    
    // Execute the schema
    await pool.query(schemaSQL)
    console.log('✅ Database schema applied successfully!')
    
    // Verify tables were created
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `)
    
    console.log('📋 Available tables:')
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`)
    })
    
    console.log('✅ Database initialization completed successfully!')
    console.log('🎯 The API should now be able to store device data properly!')
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message)
    console.error('Full error:', error)
  } finally {
    await pool.end()
  }
}

initializeDatabase()

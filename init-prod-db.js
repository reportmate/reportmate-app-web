// Apply database schema to production database
const { Pool } = require('pg')
const fs = require('fs')

const pool = new Pool({
  connectionString: "postgresql://reportmate:2sSWbVxyqjXp9WUpeMmzRaC@reportmate-database.postgres.database.azure.com:5432/reportmate?sslmode=require"
})

async function initializeDatabase() {
  try {
    console.log('🔧 Initializing production database schema...')
    
    // Read the schema file
    const schemaSQL = fs.readFileSync('../../scripts/init-db.sql', 'utf8')
    
    // Execute the schema
    await pool.query(schemaSQL)
    console.log('✅ Database schema applied successfully!')
    
    // Verify tables were created
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `)
    
    console.log('📋 Created tables:')
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`)
    })
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message)
  } finally {
    await pool.end()
  }
}

initializeDatabase()

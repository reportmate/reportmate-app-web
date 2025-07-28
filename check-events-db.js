const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://reportmate:2sSWbVxyqjXp9WUpeMmzRaC@reportmate-database.postgres.database.azure.com:5432/reportmate?sslmode=require'
});

async function checkEventsTable() {
  try {
    console.log('🔍 Checking events table structure and data...')
    
    // Get events table structure
    const structureResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'events'
      ORDER BY ordinal_position
    `)
    
    console.log('\n📋 Events table structure:')
    structureResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${row.column_default ? `DEFAULT ${row.column_default}` : ''}`)
    })
    
    // Get count of events
    const countResult = await pool.query('SELECT COUNT(*) as total FROM events')
    console.log(`\n📊 Total events in database: ${countResult.rows[0].total}`)
    
    // Get sample events
    const sampleResult = await pool.query(`
      SELECT id, device_id, event_type, message, timestamp, 
             CASE WHEN details IS NOT NULL THEN 'has_details' ELSE 'no_details' END as details_status
      FROM events 
      ORDER BY timestamp DESC 
      LIMIT 5
    `)
    
    if (sampleResult.rows.length > 0) {
      console.log('\n📦 Sample events:')
      sampleResult.rows.forEach(row => {
        console.log(`  ID: ${row.id} | Device: ${row.device_id} | Type: ${row.event_type} | Time: ${row.timestamp} | Details: ${row.details_status}`)
        console.log(`      Message: ${row.message}`)
      })
    } else {
      console.log('\n📦 No events found in database')
    }
    
    // Check if we have recent events
    const recentResult = await pool.query(`
      SELECT COUNT(*) as recent_count 
      FROM events 
      WHERE timestamp > NOW() - INTERVAL '24 hours'
    `)
    console.log(`\n⏰ Events in last 24 hours: ${recentResult.rows[0].recent_count}`)
    
  } catch (error) {
    console.error('❌ Error checking events table:', error.message)
  } finally {
    await pool.end()
  }
}

checkEventsTable()

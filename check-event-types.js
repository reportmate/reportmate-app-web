const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://reportmate:2sSWbVxyqjXp9WUpeMmzRaC@reportmate-database.postgres.database.azure.com:5432/reportmate?sslmode=require'
});

async function checkEventTypes() {
  try {
    console.log('🔍 Checking current event types in database...')
    
    // Check existing event types/kinds
    const kindResult = await pool.query(`
      SELECT DISTINCT kind, COUNT(*) as count 
      FROM events 
      WHERE kind IS NOT NULL 
      GROUP BY kind 
      ORDER BY count DESC
    `)
    
    console.log('\n📊 Current "kind" values:')
    kindResult.rows.forEach(row => {
      console.log(`  - ${row.kind}: ${row.count} events`)
    })
    
    const eventTypeResult = await pool.query(`
      SELECT DISTINCT event_type, COUNT(*) as count 
      FROM events 
      WHERE event_type IS NOT NULL 
      GROUP BY event_type 
      ORDER BY count DESC
    `)
    
    console.log('\n📊 Current "event_type" values:')
    if (eventTypeResult.rows.length > 0) {
      eventTypeResult.rows.forEach(row => {
        console.log(`  - ${row.event_type}: ${row.count} events`)
      })
    } else {
      console.log('  (No event_type values found)')
    }
    
    // Check constraint details
    const constraintResult = await pool.query(`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conrelid = 'events'::regclass 
      AND contype = 'c'
    `)
    
    console.log('\n🔒 Current constraints:')
    constraintResult.rows.forEach(row => {
      console.log(`  - ${row.conname}: ${row.definition}`)
    })
    
  } catch (error) {
    console.error('❌ Error checking event types:', error.message)
  } finally {
    await pool.end()
  }
}

checkEventTypes()

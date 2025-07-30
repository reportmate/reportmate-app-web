const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://reportmate:2sSWbVxyqjXp9WUpeMmzRaC@reportmate-database.postgres.database.azure.com:5432/reportmate?sslmode=require'
});

async function migrateSystemEventsToInfo() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🔄 Starting migration of system events to info events...');
    
    // First, check how many system events exist
    const countResult = await client.query(`
      SELECT COUNT(*) as system_count 
      FROM events 
      WHERE event_type = 'system'
    `);
    
    const systemCount = countResult.rows[0].system_count;
    console.log(`📊 Found ${systemCount} system events to migrate`);
    
    if (systemCount > 0) {
      // Update all system events to info
      const updateResult = await client.query(`
        UPDATE events 
        SET event_type = 'info' 
        WHERE event_type = 'system'
        RETURNING id, device_id, message
      `);
      
      console.log(`✅ Successfully migrated ${updateResult.rows.length} system events to info events`);
      
      // Show sample of migrated events
      console.log('\n📦 Sample migrated events:');
      updateResult.rows.slice(0, 3).forEach(row => {
        console.log(`  ID: ${row.id} | Device: ${row.device_id} | Message: ${row.message}`);
      });
    } else {
      console.log('ℹ️  No system events found to migrate');
    }
    
    // Drop the old constraint if it exists
    console.log('\n🔧 Dropping old event type constraint...');
    try {
      await client.query(`ALTER TABLE events DROP CONSTRAINT IF EXISTS events_event_type_check`);
      console.log('✅ Old constraint dropped');
    } catch (error) {
      console.log('ℹ️  No existing constraint to drop');
    }
    
    // Add new constraint without 'system'
    console.log('🔧 Adding new event type constraint (without system)...');
    try {
      await client.query(`
        ALTER TABLE events 
        ADD CONSTRAINT events_event_type_check 
        CHECK (event_type IN ('success', 'warning', 'error', 'info'))
      `);
      console.log('✅ New constraint added successfully');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  Constraint already exists');
      } else {
        throw error;
      }
    }
    
    await client.query('COMMIT');
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('✅ All system events have been converted to info events');
    console.log('✅ Database constraint updated to exclude system event type');
    
    // Verify the results
    const verifyResult = await client.query(`
      SELECT event_type, COUNT(*) as count 
      FROM events 
      GROUP BY event_type 
      ORDER BY count DESC
    `);
    
    console.log('\n📊 Final event type distribution:');
    verifyResult.rows.forEach(row => {
      console.log(`  - ${row.event_type}: ${row.count} events`);
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrateSystemEventsToInfo().catch(console.error);

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://reportmate:2sSWbVxyqjXp9WUpeMmzRaC@reportmate-database.postgres.database.azure.com:5432/reportmate?sslmode=require'
});

async function simpleFixEventsTable() {
  try {
    console.log('🔄 Starting simple events table fix...');
    
    // Step 1: Remove the constraint temporarily to allow data migration
    console.log('📊 Step 1: Dropping existing constraint...');
    try {
      await pool.query(`ALTER TABLE events DROP CONSTRAINT IF EXISTS events_event_type_check`);
      console.log('✅ Constraint dropped');
    } catch (error) {
      console.log('⏭️  No constraint to drop');
    }
    
    // Step 2: Migrate data from old columns to new columns
    console.log('📊 Step 2: Migrating data...');
    
    await pool.query(`
      UPDATE events 
      SET 
        event_type = CASE 
          WHEN kind = 'data_collection' THEN 'system'
          WHEN kind IN ('success', 'warning', 'error', 'info', 'system') THEN kind
          ELSE 'info'
        END,
        message = CASE 
          WHEN kind = 'data_collection' THEN 'Data collection completed'
          WHEN kind = 'system' THEN 'System event'
          ELSE 'Event logged'
        END,
        details = COALESCE(payload, '{}'),
        timestamp = COALESCE(ts, created_at, NOW())
      WHERE event_type IS NULL
    `);
    
    console.log('✅ Data migrated');
    
    // Step 3: Add constraint back with valid values
    console.log('📊 Step 3: Adding constraint...');
    
    await pool.query(`
      ALTER TABLE events 
      ADD CONSTRAINT events_event_type_check 
      CHECK (event_type IN ('success', 'warning', 'error', 'info', 'system'))
    `);
    
    console.log('✅ Constraint added');
    
    // Step 4: Set NOT NULL constraints
    console.log('📊 Step 4: Setting NOT NULL constraints...');
    
    await pool.query(`ALTER TABLE events ALTER COLUMN event_type SET NOT NULL`);
    await pool.query(`ALTER TABLE events ALTER COLUMN timestamp SET NOT NULL`);
    
    console.log('✅ NOT NULL constraints set');
    
    console.log('\n🎉 Events table fix completed successfully!');
    
    // Verify
    const result = await pool.query(`
      SELECT event_type, COUNT(*) as count 
      FROM events 
      GROUP BY event_type 
      ORDER BY count DESC
    `);
    
    console.log('\n📊 Event types after migration:');
    result.rows.forEach(row => {
      console.log(`  - ${row.event_type}: ${row.count} events`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

simpleFixEventsTable();

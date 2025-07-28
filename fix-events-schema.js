const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://reportmate:2sSWbVxyqjXp9WUpeMmzRaC@reportmate-database.postgres.database.azure.com:5432/reportmate?sslmode=require'
});

async function fixEventsTable() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🔄 Starting events table schema fix...');
    
    // Step 1: Migrate data from old columns to new columns for existing events
    console.log('📊 Step 1: Migrating data from old columns to new columns...');
    
    await client.query(`
      UPDATE events 
      SET 
        event_type = COALESCE(event_type, 
          CASE 
            WHEN kind = 'data_collection' THEN 'system'
            WHEN kind IN ('success', 'warning', 'error', 'info', 'system') THEN kind
            ELSE 'info'
          END, 'info'),
        message = COALESCE(message, 'Event logged'),
        details = COALESCE(details, payload, '{}'),
        timestamp = COALESCE(timestamp, ts, created_at, NOW())
      WHERE event_type IS NULL OR message IS NULL OR details IS NULL OR timestamp IS NULL
    `);
    
    console.log('✅ Data migration completed');
    
    // Step 2: Make new columns NOT NULL (now that they have data)
    console.log('📊 Step 2: Setting NOT NULL constraints on new columns...');
    
    await client.query(`ALTER TABLE events ALTER COLUMN event_type SET NOT NULL`);
    await client.query(`ALTER TABLE events ALTER COLUMN timestamp SET NOT NULL`);
    
    console.log('✅ NOT NULL constraints added');
    
    // Step 3: Drop old columns
    console.log('📊 Step 3: Dropping old columns...');
    
    await client.query(`ALTER TABLE events DROP COLUMN IF EXISTS kind`);
    await client.query(`ALTER TABLE events DROP COLUMN IF EXISTS source`);
    await client.query(`ALTER TABLE events DROP COLUMN IF EXISTS payload`);
    await client.query(`ALTER TABLE events DROP COLUMN IF EXISTS severity`);
    await client.query(`ALTER TABLE events DROP COLUMN IF EXISTS ts`);
    
    console.log('✅ Old columns dropped');
    
    // Step 4: Add constraint for valid event types
    console.log('📊 Step 4: Adding event type constraint...');
    
    try {
      await client.query(`
        ALTER TABLE events 
        ADD CONSTRAINT events_event_type_check 
        CHECK (event_type IN ('success', 'warning', 'error', 'info', 'system'))
      `);
      console.log('✅ Event type constraint added');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('⏭️  Event type constraint already exists');
      } else {
        console.log('⚠️  Could not add constraint:', error.message);
      }
    }
    
    // Step 5: Create indexes for performance
    console.log('📊 Step 5: Creating indexes...');
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_events_device_id ON events(device_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_events_details_gin ON events USING GIN(details)`);
    
    console.log('✅ Indexes created');
    
    await client.query('COMMIT');
    
    console.log('\n🎉 Events table schema fix completed successfully!');
    
    // Verify the result
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'events'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Updated events table structure:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${row.column_default ? `DEFAULT ${row.column_default}` : ''}`);
    });
    
    // Check sample data
    const sampleResult = await client.query(`
      SELECT id, device_id, event_type, message, timestamp
      FROM events 
      ORDER BY timestamp DESC 
      LIMIT 3
    `);
    
    console.log('\n📦 Sample events after migration:');
    sampleResult.rows.forEach(row => {
      console.log(`  ID: ${row.id} | Device: ${row.device_id} | Type: ${row.event_type} | Time: ${row.timestamp}`);
      console.log(`      Message: ${row.message}`);
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error fixing events table:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixEventsTable().catch(console.error);

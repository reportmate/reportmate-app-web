const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://reportmate:2sSWbVxyqjXp9WUpeMmzRaC@reportmate-database.postgres.database.azure.com:5432/reportmate?sslmode=require'
});

async function fixSystemEventTypes() {
  try {
    console.log('🔄 Starting fix for system event types...');
    
    // Step 1: Check current constraint
    console.log('📊 Step 1: Checking current constraint...');
    
    const constraintResult = await pool.query(`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conrelid = 'events'::regclass 
      AND contype = 'c'
      AND conname = 'events_event_type_check'
    `);
    
    if (constraintResult.rows.length > 0) {
      console.log('Current constraint:', constraintResult.rows[0].definition);
      
      // Step 2: Drop existing constraint
      console.log('📊 Step 2: Dropping existing constraint...');
      await pool.query(`ALTER TABLE events DROP CONSTRAINT events_event_type_check`);
      console.log('✅ Constraint dropped');
    } else {
      console.log('⏭️  No existing constraint found');
    }
    
    // Step 3: Add new constraint that includes 'system'
    console.log('📊 Step 3: Adding new constraint with system event type...');
    
    await pool.query(`
      ALTER TABLE events 
      ADD CONSTRAINT events_event_type_check 
      CHECK (event_type IN ('success', 'warning', 'error', 'info', 'system'))
    `);
    
    console.log('✅ New constraint added with system event type support');
    
    // Step 4: Verify the constraint
    const newConstraintResult = await pool.query(`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conrelid = 'events'::regclass 
      AND contype = 'c'
      AND conname = 'events_event_type_check'
    `);
    
    console.log('📊 New constraint:', newConstraintResult.rows[0].definition);
    
    console.log('\n🎉 System event types fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixSystemEventTypes();

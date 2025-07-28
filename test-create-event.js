const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://reportmate:2sSWbVxyqjXp9WUpeMmzRaC@reportmate-database.postgres.database.azure.com:5432/reportmate?sslmode=require'
});

async function createTestEvent() {
  try {
    console.log('🧪 Creating test event...');
    
    // Insert a test event using the new schema
    const result = await pool.query(`
      INSERT INTO events (
        device_id, event_type, message, details, timestamp, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $5
      ) RETURNING id, device_id, event_type, message, timestamp
    `, [
      '0F33V9G25083HJ',  // device_id
      'info',             // event_type
      'Test event created from API', // message
      JSON.stringify({   // details
        test: true,
        message: 'This is a test event',
        timestamp: new Date().toISOString()
      }),
      new Date()         // timestamp
    ]);
    
    console.log('✅ Test event created:', result.rows[0]);
    
    // Check latest events
    const latest = await pool.query(`
      SELECT id, device_id, event_type, message, timestamp
      FROM events 
      ORDER BY timestamp DESC 
      LIMIT 3
    `);
    
    console.log('\n📦 Latest events:');
    latest.rows.forEach(row => {
      console.log(`  ID: ${row.id} | Device: ${row.device_id} | Type: ${row.event_type} | Time: ${row.timestamp}`);
      console.log(`      Message: ${row.message}`);
    });
    
  } catch (error) {
    console.error('❌ Error creating test event:', error.message);
  } finally {
    await pool.end();
  }
}

createTestEvent();

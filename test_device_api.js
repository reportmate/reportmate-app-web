const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://reportmate:2sSWbVxyqjXp9WUpeMmzRaC@reportmate-database.postgres.database.azure.com:5432/reportmate?sslmode=require'
});

async function testDeviceQuery() {
  
  try {
    console.log('Testing device queries...');
    
    // Test the exact query that Azure Functions is using
    const deviceQuery = `
        SELECT 
            id, device_id, name, serial_number, os, status, last_seen, 
            model, manufacturer, created_at, updated_at
        FROM devices 
        WHERE id = $1 OR serial_number = $1
        LIMIT 1`;
    
    const result = await pool.query(deviceQuery, ['0F33V9G25083HJ']);
    console.log('Device query result:');
    console.log('Row count:', result.rows.length);
    if (result.rows.length > 0) {
      console.log('Device found:', result.rows[0]);
    } else {
      console.log('No device found');
    }
    
    // Also test individual fields
    console.log('\n=== Testing individual device queries ===');
    
    const idResult = await pool.query('SELECT * FROM devices WHERE id = $1', ['0F33V9G25083HJ']);
    console.log('Query by id:', idResult.rows.length, 'rows');
    
    const serialResult = await pool.query('SELECT * FROM devices WHERE serial_number = $1', ['0F33V9G25083HJ']);
    console.log('Query by serial_number:', serialResult.rows.length, 'rows');
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

testDeviceQuery();

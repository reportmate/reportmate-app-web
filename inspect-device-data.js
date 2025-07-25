const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://reportmate:2sSWbVxyqjXp9WUpeMmzRaC@reportmate-database.postgres.database.azure.com:5432/reportmate?sslmode=require'
});

async function inspectDeviceDataTable() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Inspecting device_data table structure...');
    
    // Check table structure
    const columnsResult = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'device_data' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 device_data table columns:');
    columnsResult.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // Get sample data
    console.log('\n📊 Sample device_data records:');
    const sampleResult = await client.query(`
      SELECT * FROM device_data 
      ORDER BY created_at DESC 
      LIMIT 3
    `);
    
    if (sampleResult.rows.length > 0) {
      console.log('Sample record structure:');
      console.log(JSON.stringify(sampleResult.rows[0], null, 2));
    } else {
      console.log('No records found in device_data table');
    }
    
  } catch (error) {
    console.error('❌ Inspection failed:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

inspectDeviceDataTable();

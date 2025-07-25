const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://reportmate:2sSWbVxyqjXp9WUpeMmzRaC@reportmate-database.postgres.database.azure.com:5432/reportmate?sslmode=require'
});

async function inspectSystemTable() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Inspecting system table structure...');
    
    // Check table structure
    const columnsResult = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'system' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 system table columns:');
    columnsResult.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // Get count of records
    const countResult = await client.query('SELECT COUNT(*) FROM system');
    console.log(`\n📊 Total system records: ${countResult.rows[0].count}`);
    
    // Get sample data with device information
    console.log('\n📊 Sample system records:');
    const sampleResult = await client.query(`
      SELECT s.id, s.device_id, s.collected_at, s.created_at,
             LEFT(s.data::text, 200) as data_preview,
             d.serial_number, d.name as device_name
      FROM system s
      LEFT JOIN devices d ON s.device_id = d.id
      ORDER BY s.created_at DESC 
      LIMIT 5
    `);
    
    if (sampleResult.rows.length > 0) {
      sampleResult.rows.forEach((row, index) => {
        console.log(`\n--- Record ${index + 1} ---`);
        console.log(`ID: ${row.id}`);
        console.log(`Device ID: ${row.device_id}`);
        console.log(`Serial Number: ${row.serial_number}`);
        console.log(`Device Name: ${row.device_name}`);
        console.log(`Collected At: ${row.collected_at}`);
        console.log(`Created At: ${row.created_at}`);
        console.log(`Data Preview: ${row.data_preview}...`);
      });
      
      // Get the full data for the most recent record to inspect structure
      console.log('\n🔬 Full data structure from most recent record:');
      const fullDataResult = await client.query(`
        SELECT data FROM system 
        ORDER BY created_at DESC 
        LIMIT 1
      `);
      
      if (fullDataResult.rows.length > 0) {
        const systemData = fullDataResult.rows[0].data;
        console.log('Full system data structure:');
        console.log(JSON.stringify(systemData, null, 2));
        
        // Check specifically for operatingSystem data
        if (systemData.operatingSystem) {
          console.log('\n✅ operatingSystem data found in database:');
          console.log(JSON.stringify(systemData.operatingSystem, null, 2));
        } else {
          console.log('\n❌ operatingSystem data NOT found in database');
          console.log('Available keys:', Object.keys(systemData));
        }
      }
    } else {
      console.log('No records found in system table');
    }
    
  } catch (error) {
    console.error('❌ Inspection failed:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

inspectSystemTable();

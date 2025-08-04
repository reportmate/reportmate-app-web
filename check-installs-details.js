const pg = require('pg');

const client = new pg.Client({
  connectionString: 'postgresql://reportmate:2sSWbVxyqjXp9WUpeMmzRaC@reportmate-database.postgres.database.azure.com:5432/reportmate?sslmode=require'
});

async function checkInstallsDetails() {
  try {
    await client.connect();
    console.log('🔗 Connected to database');
    
    // Get installs table structure
    const structure = await client.query(
      "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'installs' ORDER BY ordinal_position"
    );
    
    console.log('📋 Installs table structure:');
    structure.rows.forEach(row => {
      console.log('  -', row.column_name + ':', row.data_type, row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL');
    });
    
    // Get the latest record
    const latest = await client.query('SELECT * FROM installs ORDER BY created_at DESC LIMIT 1');
    
    if (latest.rows.length > 0) {
      const row = latest.rows[0];
      console.log('\n📦 Latest installs record:');
      console.log('  Device ID:', row.device_id);
      console.log('  Created At:', row.created_at);
      console.log('  Version:', row.version);
      
      // Check if there's JSON data
      if (row.installs_data) {
        console.log('  Has installs_data: YES');
        console.log('  Data type:', typeof row.installs_data);
        
        if (typeof row.installs_data === 'object') {
          const keys = Object.keys(row.installs_data);
          console.log('  Data keys:', keys.join(', '));
          
          if (row.installs_data.managedInstalls) {
            console.log('  Managed installs count:', row.installs_data.managedInstalls.length);
            console.log('  Sample install names:', 
              row.installs_data.managedInstalls.slice(0, 3).map(i => i.name || i.displayName || 'unnamed').join(', ')
            );
          }
        }
      } else {
        console.log('  Has installs_data: NO');
      }
    } else {
      console.log('\n❌ No installs records found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await client.end();
  }
}

checkInstallsDetails();

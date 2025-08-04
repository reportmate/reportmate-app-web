const pg = require('pg');

const client = new pg.Client({
  connectionString: 'postgresql://reportmate:2sSWbVxyqjXp9WUpeMmzRaC@reportmate-database.postgres.database.azure.com:5432/reportmate?sslmode=require'
});

async function checkInstallsData() {
  try {
    await client.connect();
    console.log('🔗 Connected to database');
    
    // List all tables
    const tables = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    
    console.log('📋 Available tables:');
    tables.rows.forEach(row => console.log('  -', row.table_name));
    
    // Check specifically for installs table
    const installsExists = tables.rows.some(row => row.table_name === 'installs');
    
    if (installsExists) {
      console.log('\n✅ Installs table found');
      
      // Get installs data count
      const count = await client.query('SELECT COUNT(*) as count FROM installs');
      console.log('📊 Total installs records:', count.rows[0].count);
      
      // Get recent installs data
      const recent = await client.query(
        'SELECT device_id, created_at FROM installs WHERE created_at > NOW() - INTERVAL \'24 hours\' ORDER BY created_at DESC LIMIT 5'
      );
      
      console.log('📦 Recent installs data (last 24 hours):');
      recent.rows.forEach(row => {
        console.log('  Device:', row.device_id, '| Time:', row.created_at);
      });
    } else {
      console.log('\n❌ Installs table not found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkInstallsData();

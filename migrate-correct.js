const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://reportmate:2sSWbVxyqjXp9WUpeMmzRaC@reportmate-database.postgres.database.azure.com:5432/reportmate?sslmode=require'
});

async function migrateToModularTables() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Migrating data from device_data to modular tables...');
    
    // Get all data from device_data table with correct column name
    const dataResult = await client.query(`
      SELECT device_id, data_type, raw_data, created_at 
      FROM device_data 
      ORDER BY created_at DESC
    `);
    
    console.log(`📊 Found ${dataResult.rows.length} records in device_data to migrate`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const row of dataResult.rows) {
      const { device_id, data_type, raw_data, created_at } = row;
      
      try {
        // Check if the modular table exists
        const tableExistsResult = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = $1 AND table_schema = 'public'
          )
        `, [data_type]);
        
        if (!tableExistsResult.rows[0].exists) {
          console.log(`⚠️  Table ${data_type} doesn't exist, skipping...`);
          continue;
        }
        
        // Insert into the corresponding modular table
        const insertQuery = `
          INSERT INTO ${data_type} (device_id, data, created_at, updated_at)
          VALUES ($1, $2, $3, $3)
          ON CONFLICT (device_id) DO UPDATE SET
            data = EXCLUDED.data,
            updated_at = EXCLUDED.updated_at
        `;
        
        await client.query(insertQuery, [device_id, raw_data, created_at]);
        console.log(`✅ Migrated ${data_type} for device ${device_id}`);
        successCount++;
        
      } catch (error) {
        console.error(`❌ Error migrating ${data_type} for device ${device_id}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n📈 Migration Summary:`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    
    // Now check what's in the modular tables
    console.log('\n📋 Checking modular table contents after migration...');
    
    const moduleNames = ['applications', 'displays', 'hardware', 'installs', 'inventory', 
                        'management', 'network', 'printers', 'profiles', 'security', 'system'];
    
    for (const moduleName of moduleNames) {
      try {
        const countResult = await client.query(`SELECT COUNT(*) FROM ${moduleName}`);
        const count = countResult.rows[0].count;
        const icon = count > 0 ? '✅' : '⭕';
        console.log(`   ${icon} ${moduleName}: ${count} records`);
      } catch (error) {
        console.log(`   ❌ ${moduleName}: table error - ${error.message}`);
      }
    }
    
    console.log('\n🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

migrateToModularTables();

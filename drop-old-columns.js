const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://reportmate:2sSWbVxyqjXp9WUpeMmzRaC@reportmate-database.postgres.database.azure.com:5432/reportmate?sslmode=require'
});

async function dropOldColumns() {
  try {
    console.log('🔄 Dropping old columns from events table...');
    
    // Drop old columns one by one
    const oldColumns = ['kind', 'source', 'payload', 'severity', 'ts'];
    
    for (const column of oldColumns) {
      try {
        await pool.query(`ALTER TABLE events DROP COLUMN IF EXISTS ${column}`);
        console.log(`✅ Dropped column: ${column}`);
      } catch (error) {
        console.log(`⚠️  Error dropping ${column}:`, error.message);
      }
    }
    
    console.log('\n🎉 Old columns cleanup completed!');
    
    // Verify final structure
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'events'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Final events table structure:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${row.column_default ? `DEFAULT ${row.column_default}` : ''}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

dropOldColumns();

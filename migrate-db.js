const { Client } = require('pg');

// Database connection configuration
const dbConfig = {
    host: 'reportmate-database.postgres.database.azure.com',
    port: 5432,
    database: 'reportmate',
    user: 'reportmate',
    password: '2sSWbVxyqjXp9WUpeMmzRaC',
    ssl: {
        rejectUnauthorized: false
    }
};

async function migrateDatabase() {
    const client = new Client(dbConfig);
    
    try {
        console.log('Connecting to PostgreSQL database...');
        await client.connect();
        console.log('✓ Connected successfully');

        // Add missing device_id column to devices table
        console.log('\n📋 Adding device_id column to devices table...');
        const addDeviceIdQuery = `
            ALTER TABLE devices 
            ADD COLUMN IF NOT EXISTS device_id VARCHAR(255) UNIQUE;
        `;
        await client.query(addDeviceIdQuery);
        console.log('✓ device_id column added successfully');

        // Add missing client_version column
        console.log('\n📋 Adding client_version column to devices table...');
        const addClientVersionQuery = `
            ALTER TABLE devices 
            ADD COLUMN IF NOT EXISTS client_version VARCHAR(50);
        `;
        await client.query(addClientVersionQuery);
        console.log('✓ client_version column added successfully');

        // Create index for device_id column
        console.log('\n📋 Creating index for device_id column...');
        const createIndexQuery = `
            CREATE INDEX IF NOT EXISTS idx_devices_device_id ON devices(device_id);
        `;
        await client.query(createIndexQuery);
        console.log('✓ device_id index created successfully');

        // Update device_data table to ensure it has proper structure
        console.log('\n📋 Checking device_data table structure...');
        const columnsQuery = `
            SELECT column_name, data_type
            FROM information_schema.columns 
            WHERE table_name = 'device_data' AND table_schema = 'public'
            ORDER BY ordinal_position;
        `;
        const columnsResult = await client.query(columnsQuery);
        
        console.log('📋 device_data table columns:');
        columnsResult.rows.forEach(row => {
            console.log(`  - ${row.column_name} (${row.data_type})`);
        });

        // Verify the devices table now has device_id
        console.log('\n🔍 Verifying devices table has device_id column...');
        const deviceColumnsQuery = `
            SELECT column_name
            FROM information_schema.columns 
            WHERE table_name = 'devices' AND table_schema = 'public' AND column_name = 'device_id';
        `;
        const deviceColumnsResult = await client.query(deviceColumnsQuery);
        
        if (deviceColumnsResult.rows.length > 0) {
            console.log('✅ device_id column exists in devices table');
        } else {
            console.log('❌ device_id column not found in devices table');
        }

        console.log('\n✅ Database migration completed successfully!');

    } catch (error) {
        console.error('❌ Database migration failed:', error.message);
        if (error.code) {
            console.error(`   Error code: ${error.code}`);
        }
        if (error.detail) {
            console.error(`   Detail: ${error.detail}`);
        }
        process.exit(1);
    } finally {
        await client.end();
        console.log('🔌 Database connection closed');
    }
}

// Run the migration
console.log('🚀 Starting ReportMate database migration...');
migrateDatabase();

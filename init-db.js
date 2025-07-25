const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection configuration
const dbConfig = {
    host: 'reportmate-database.postgres.database.azure.com',
    port: 5432,
    database: 'reportmate',
    user: 'reportmate',
    password: '2sSWbVxyqjXp9WUpeMmzRaC', // From terraform.tfvars
    ssl: {
        rejectUnauthorized: false
    }
};

async function initializeDatabase() {
    const client = new Client(dbConfig);
    
    try {
        console.log('Connecting to PostgreSQL database...');
        await client.connect();
        console.log('✓ Connected successfully');

        // Read and execute the modular database schema
        console.log('\n📋 Creating modular database schema...');
        const modularSchema = fs.readFileSync(
            path.join(__dirname, '..', '..', 'infrastructure', 'schemas', 'modular-database-schema.sql'),
            'utf8'
        );
        
        // Split the SQL into individual statements for better error handling
        const statements = modularSchema.split(';').filter(stmt => stmt.trim().length > 0);
        
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i].trim();
            if (statement) {
                try {
                    console.log(`   Executing statement ${i + 1}/${statements.length}...`);
                    await client.query(statement);
                } catch (error) {
                    console.error(`   ❌ Error in statement ${i + 1}:`, error.message);
                    console.error(`   Statement: ${statement.substring(0, 100)}...`);
                    throw error;
                }
            }
        }
        console.log('✓ Devices schema created successfully');

        // Read and execute the comprehensive database schema
        console.log('\n📋 Creating application tables (hardware, system_info, etc.)...');
        const mainSchema = fs.readFileSync(
            path.join(__dirname, '..', '..', 'infrastructure', 'schemas', 'database.sql'),
            'utf8'
        );
        
        // Split main schema into statements as well
        const mainStatements = mainSchema.split(';').filter(stmt => stmt.trim().length > 0);
        
        for (let i = 0; i < mainStatements.length; i++) {
            const statement = mainStatements[i].trim();
            if (statement) {
                try {
                    console.log(`   Executing main schema statement ${i + 1}/${mainStatements.length}...`);
                    await client.query(statement);
                } catch (error) {
                    console.error(`   ❌ Error in main schema statement ${i + 1}:`, error.message);
                    console.error(`   Statement: ${statement.substring(0, 100)}...`);
                    // Continue with other statements for main schema
                    console.log(`   ⚠️  Continuing with remaining statements...`);
                }
            }
        }
        console.log('✓ Main database schema created successfully');

        // Verify tables were created
        console.log('\n🔍 Verifying table creation...');
        const tablesQuery = `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        `;
        const result = await client.query(tablesQuery);
        
        console.log('📊 Created tables:');
        result.rows.forEach(row => {
            console.log(`  - ${row.table_name}`);
        });

        console.log(`\n✅ Database initialization completed! Created ${result.rows.length} tables.`);

    } catch (error) {
        console.error('❌ Database initialization failed:', error.message);
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

// Run the initialization
console.log('🚀 Starting ReportMate database initialization...');
initializeDatabase();

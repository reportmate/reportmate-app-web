const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection string
const CONNECTION_STRING = "postgresql://reportmate:2sSWbVxyqjXp9WUpeMmzRaC@reportmate-database.postgres.database.azure.com:5432/reportmate?sslmode=require";

async function migrateToModularSchema() {
    const pool = new Pool({
        connectionString: CONNECTION_STRING
    });

    console.log("🔄 Starting migration to modular database schema");
    console.log("="*60);

    try {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            console.log("📋 Step 1: Analyzing current database structure...");
            
            // Get current tables
            const currentTables = await client.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name
            `);
            
            console.log(`   Found ${currentTables.rows.length} existing tables:`);
            currentTables.rows.forEach(row => {
                console.log(`   • ${row.table_name}`);
            });

            console.log("\n🗑️  Step 2: Dropping old complex tables (if they exist)...");
            
            // List of old tables to drop (the complex normalized ones)
            const oldTablesToDrop = [
                'device_displays',
                'device_display_adapters', 
                'device_display_config',
                'device_display_layout',
                'device_color_profiles',
                'device_printers',
                'device_print_drivers',
                'device_print_ports',
                'device_hardware',
                'device_system_info',
                'system_info',
                'mdm_info',
                'security_features',
                'cimian_runs'
            ];

            for (const tableName of oldTablesToDrop) {
                const exists = await client.query(`
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = $1
                    )
                `, [tableName]);

                if (exists.rows[0].exists) {
                    await client.query(`DROP TABLE IF EXISTS ${tableName} CASCADE`);
                    console.log(`   ✅ Dropped table: ${tableName}`);
                } else {
                    console.log(`   ⏭️  Table doesn't exist: ${tableName}`);
                }
            }

            console.log("\n🏗️  Step 3: Creating modular schema...");
            
            // Read and execute the modular schema
            const schemaPath = path.join(__dirname, '..', '..', 'infrastructure', 'schemas', 'modular-database-schema.sql');
            const schemaSql = fs.readFileSync(schemaPath, 'utf8');
            
            console.log("   📄 Executing modular schema SQL...");
            await client.query(schemaSql);
            console.log("   ✅ Modular schema created successfully");

            console.log("\n🔍 Step 4: Verifying new schema...");
            
            // Check that all required tables exist
            const requiredTables = [
                'devices',
                'events',
                'applications',
                'displays', 
                'hardware',
                'installs',
                'inventory',
                'management',
                'network',
                'printers',
                'profiles',
                'security',
                'system',
                'business_units',
                'machine_groups',
                'business_unit_users',
                'business_unit_groups'
            ];

            let allTablesExist = true;
            for (const tableName of requiredTables) {
                const exists = await client.query(`
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = $1
                    )
                `, [tableName]);

                if (exists.rows[0].exists) {
                    console.log(`   ✅ Table exists: ${tableName}`);
                } else {
                    console.log(`   ❌ Table missing: ${tableName}`);
                    allTablesExist = false;
                }
            }

            if (!allTablesExist) {
                throw new Error("Some required tables are missing after migration");
            }

            console.log("\n🔗 Step 5: Verifying constraints and indexes...");
            
            // Check key constraints
            const constraints = await client.query(`
                SELECT 
                    tc.table_name,
                    tc.constraint_name,
                    tc.constraint_type
                FROM information_schema.table_constraints tc
                WHERE tc.table_schema = 'public'
                AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE', 'FOREIGN KEY')
                ORDER BY tc.table_name, tc.constraint_type
            `);

            console.log(`   Found ${constraints.rows.length} constraints:`);
            constraints.rows.forEach(row => {
                console.log(`   • ${row.table_name}: ${row.constraint_name} (${row.constraint_type})`);
            });

            await client.query('COMMIT');

            console.log("\n✅ Migration completed successfully!");
            console.log("📊 Database is now using the clean modular architecture:");
            console.log("   • 1 table per JSON module from Windows client");
            console.log("   • Serial number + Device ID uniqueness enforced");
            console.log("   • Event type validation in place");
            console.log("   • JSONB storage for flexible module data");

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error("\n❌ Migration failed:", error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run migration if this file is executed directly
if (require.main === module) {
    migrateToModularSchema()
        .then(() => {
            console.log("\n🎉 Migration complete! Database is ready for modular data processing.");
            process.exit(0);
        })
        .catch((error) => {
            console.error("\n💥 Migration failed:", error);
            process.exit(1);
        });
}

module.exports = { migrateToModularSchema };

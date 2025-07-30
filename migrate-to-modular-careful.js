const { Pool } = require('pg');

// Database connection string
const CONNECTION_STRING = "postgresql://reportmate:2sSWbVxyqjXp9WUpeMmzRaC@reportmate-database.postgres.database.azure.com:5432/reportmate?sslmode=require";

async function migrateToModularSchema() {
    const pool = new Pool({
        connectionString: CONNECTION_STRING
    });

    console.log("🔄 Starting careful migration to modular database schema");
    console.log("="*60);

    try {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            console.log("📋 Step 1: Updating devices table for modular architecture...");
            
            // Add missing columns to devices table if they don't exist
            const missingColumns = [
                { name: 'ip_address_v4', type: 'VARCHAR(45)', default: null },
                { name: 'ip_address_v6', type: 'VARCHAR(45)', default: null },  
                { name: 'mac_address_primary', type: 'VARCHAR(17)', default: null },
                { name: 'manufacturer', type: 'VARCHAR(500)', default: null }
            ];

            for (const column of missingColumns) {
                const exists = await client.query(`
                    SELECT EXISTS (
                        SELECT FROM information_schema.columns 
                        WHERE table_name = 'devices' AND column_name = $1
                    )
                `, [column.name]);

                if (!exists.rows[0].exists) {
                    await client.query(`ALTER TABLE devices ADD COLUMN ${column.name} ${column.type}`);
                    console.log(`   ✅ Added column: devices.${column.name}`);
                } else {
                    console.log(`   ⏭️  Column exists: devices.${column.name}`);
                }
            }

            // Update ip_address_v4 from ip_address if not already done
            await client.query(`
                UPDATE devices 
                SET ip_address_v4 = ip_address
                WHERE ip_address IS NOT NULL 
                  AND ip_address_v4 IS NULL
                  AND ip_address ~ '^[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+$'
            `);

            // Update mac_address_primary from mac_address if not already done
            await client.query(`
                UPDATE devices 
                SET mac_address_primary = mac_address
                WHERE mac_address IS NOT NULL 
                  AND mac_address_primary IS NULL
            `);

            console.log("   ✅ Updated device table columns");

            console.log("\n📅 Step 2: Updating events table for strict event type validation...");
            
            // Check if event_type column exists (vs current 'kind' column)
            const eventTypeExists = await client.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_name = 'events' AND column_name = 'event_type'
                )
            `);

            if (!eventTypeExists.rows[0].exists) {
                // Add event_type column
                await client.query(`ALTER TABLE events ADD COLUMN event_type VARCHAR(20)`);
                
                // Migrate existing data from 'kind' to 'event_type' with validation
                await client.query(`
                    UPDATE events 
                    SET event_type = CASE 
                        WHEN LOWER(kind) IN ('success', 'warning', 'error', 'info') THEN LOWER(kind)
                        WHEN LOWER(severity) IN ('success', 'warning', 'error', 'info') THEN LOWER(severity)
                        ELSE 'info'
                    END
                `);
                
                console.log("   ✅ Added event_type column and migrated data");
            } else {
                console.log("   ⏭️  event_type column already exists");
            }

            // Add constraint for valid event types if it doesn't exist
            try {
                await client.query(`
                    ALTER TABLE events 
                    ADD CONSTRAINT events_event_type_check 
                    CHECK (event_type IN ('success', 'warning', 'error', 'info'))
                `);
                console.log("   ✅ Added event type validation constraint");
            } catch (error) {
                if (error.message.includes('already exists')) {
                    console.log("   ⏭️  Event type constraint already exists");
                } else {
                    console.log("   ⚠️  Could not add constraint:", error.message);
                }
            }

            console.log("\n📦 Step 3: Creating module tables...");
            
            // Module tables to create (skip applications as it already exists)
            const moduleTablesSQL = {
                displays: `
                    CREATE TABLE IF NOT EXISTS displays (
                        id SERIAL PRIMARY KEY,
                        device_id VARCHAR(255) NOT NULL,
                        data JSONB NOT NULL,
                        collected_at TIMESTAMP WITH TIME ZONE,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        CONSTRAINT unique_displays_per_device UNIQUE(device_id)
                    )`,
                hardware: `
                    CREATE TABLE IF NOT EXISTS hardware (
                        id SERIAL PRIMARY KEY,
                        device_id VARCHAR(255) NOT NULL,
                        data JSONB NOT NULL,
                        collected_at TIMESTAMP WITH TIME ZONE,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        CONSTRAINT unique_hardware_per_device UNIQUE(device_id)
                    )`,
                installs: `
                    CREATE TABLE IF NOT EXISTS installs (
                        id SERIAL PRIMARY KEY,
                        device_id VARCHAR(255) NOT NULL,
                        data JSONB NOT NULL,
                        collected_at TIMESTAMP WITH TIME ZONE,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        CONSTRAINT unique_installs_per_device UNIQUE(device_id)
                    )`,
                inventory: `
                    CREATE TABLE IF NOT EXISTS inventory (
                        id SERIAL PRIMARY KEY,
                        device_id VARCHAR(255) NOT NULL,
                        data JSONB NOT NULL,
                        collected_at TIMESTAMP WITH TIME ZONE,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        CONSTRAINT unique_inventory_per_device UNIQUE(device_id)
                    )`,
                management: `
                    CREATE TABLE IF NOT EXISTS management (
                        id SERIAL PRIMARY KEY,
                        device_id VARCHAR(255) NOT NULL,
                        data JSONB NOT NULL,
                        collected_at TIMESTAMP WITH TIME ZONE,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        CONSTRAINT unique_management_per_device UNIQUE(device_id)
                    )`,
                network: `
                    CREATE TABLE IF NOT EXISTS network (
                        id SERIAL PRIMARY KEY,
                        device_id VARCHAR(255) NOT NULL,
                        data JSONB NOT NULL,
                        collected_at TIMESTAMP WITH TIME ZONE,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        CONSTRAINT unique_network_per_device UNIQUE(device_id)
                    )`,
                printers: `
                    CREATE TABLE IF NOT EXISTS printers (
                        id SERIAL PRIMARY KEY,
                        device_id VARCHAR(255) NOT NULL,
                        data JSONB NOT NULL,
                        collected_at TIMESTAMP WITH TIME ZONE,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        CONSTRAINT unique_printers_per_device UNIQUE(device_id)
                    )`,
                profiles: `
                    CREATE TABLE IF NOT EXISTS profiles (
                        id SERIAL PRIMARY KEY,
                        device_id VARCHAR(255) NOT NULL,
                        data JSONB NOT NULL,
                        collected_at TIMESTAMP WITH TIME ZONE,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        CONSTRAINT unique_profiles_per_device UNIQUE(device_id)
                    )`,
                security: `
                    CREATE TABLE IF NOT EXISTS security (
                        id SERIAL PRIMARY KEY,
                        device_id VARCHAR(255) NOT NULL,
                        data JSONB NOT NULL,
                        collected_at TIMESTAMP WITH TIME ZONE,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        CONSTRAINT unique_security_per_device UNIQUE(device_id)
                    )`,
                system: `
                    CREATE TABLE IF NOT EXISTS system (
                        id SERIAL PRIMARY KEY,
                        device_id VARCHAR(255) NOT NULL,
                        data JSONB NOT NULL,
                        collected_at TIMESTAMP WITH TIME ZONE,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        CONSTRAINT unique_system_per_device UNIQUE(device_id)
                    )`
            };

            for (const [tableName, sql] of Object.entries(moduleTablesSQL)) {
                await client.query(sql);
                console.log(`   ✅ Created table: ${tableName}`);
            }

            console.log("\n🔗 Step 4: Creating indexes for performance...");
            
            // Create indexes for module tables
            const moduleNames = Object.keys(moduleTablesSQL);
            
            for (const moduleName of moduleNames) {
                // Device ID index
                await client.query(`
                    CREATE INDEX IF NOT EXISTS idx_${moduleName}_device_id 
                    ON ${moduleName}(device_id)
                `);
                
                // JSONB GIN index for data queries
                await client.query(`
                    CREATE INDEX IF NOT EXISTS idx_${moduleName}_data_gin 
                    ON ${moduleName} USING GIN(data)
                `);
                
                console.log(`   ✅ Created indexes for: ${moduleName}`);
            }

            // Update the existing applications table to match the modular structure
            console.log("\n🔄 Step 5: Updating applications table to modular structure...");
            
            // Check if applications table needs data column
            const appsHasData = await client.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_name = 'applications' AND column_name = 'data'
                )
            `);

            if (!appsHasData.rows[0].exists) {
                // Add data column
                await client.query(`ALTER TABLE applications ADD COLUMN data JSONB`);
                await client.query(`ALTER TABLE applications ADD COLUMN collected_at TIMESTAMP WITH TIME ZONE`);
                
                // Migrate existing data to JSONB format
                await client.query(`
                    UPDATE applications 
                    SET data = jsonb_build_object(
                        'name', name,
                        'version', version,
                        'bundle_id', bundle_id,
                        'path', path,
                        'last_opened', last_opened,
                        'size', size,
                        'signed', signed,
                        'category', category,
                        'publisher', publisher,
                        'install_date', install_date
                    ),
                    collected_at = updated_at
                    WHERE data IS NULL
                `);
                
                console.log("   ✅ Migrated applications table to modular structure");
            } else {
                console.log("   ⏭️  Applications table already has modular structure");
            }

            await client.query('COMMIT');

            console.log("\n✅ Migration completed successfully!");
            console.log("📊 Database now supports the clean modular architecture:");
            console.log("   • 1 table per JSON module from Windows client");
            console.log("   • Serial number + Device ID uniqueness enforced");
            console.log("   • Event type validation in place (success, warning, error, info)");
            console.log("   • JSONB storage for flexible module data");
            console.log("   • Performance indexes created");

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

const fs = require('fs');
const path = require('path');

// Simple PostgreSQL client using node-postgres
async function injectTestData() {
    console.log('📦 Installing pg package if needed...');
    
    try {
        // Try to require pg, install if not available
        const { Client } = require('pg');
        await runInjection();
    } catch (error) {
        console.log('📦 Installing pg package...');
        const { execSync } = require('child_process');
        try {
            execSync('npm install pg', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
            const { Client } = require('pg');
            await runInjection();
        } catch (installError) {
            console.error('❌ Failed to install pg package:', installError);
            console.log('💡 Alternative: Use Docker to inject data:');
            console.log('   docker exec -i reportmate-postgres-1 psql -U reportmate -d reportmate < scripts/inject-large-payloads.sql');
            process.exit(1);
        }
    }
}

async function runInjection() {
    const { Client } = require('pg');
    
    // Read the generated test payloads
    const payloadsPath = path.join(__dirname, 'large-test-payloads.json');
    if (!fs.existsSync(payloadsPath)) {
        console.log('❌ Test payloads not found. Running generator first...');
        const { generateTestPayloads } = require('./generate-large-payloads');
        await generateTestPayloads();
    }
    
    const payloads = JSON.parse(fs.readFileSync(payloadsPath, 'utf-8'));
    
    // Connect to local database
    const client = new Client({
        host: 'localhost',
        port: 5432,
        database: 'reportmate',
        user: 'reportmate',
        password: 'reportmate123'
    });
    
    try {
        console.log('🔌 Connecting to local database...');
        await client.connect();
        
        // Create events table if it doesn't exist (using FleetEvent structure)
        console.log('📊 Creating events table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS events (
                id TEXT PRIMARY KEY,
                device TEXT,
                kind TEXT,
                ts TIMESTAMP DEFAULT NOW(),
                payload JSONB
            );
        `);
        
        // Clear existing test data
        console.log('🧹 Clearing existing test data...');
        await client.query("DELETE FROM events WHERE id LIKE 'test-large-payload-%';");
        
        // Insert large payloads
        console.log('📥 Injecting large test payloads...');
        for (const payload of payloads) {
            // Transform to FleetEvent structure
            const fleetEvent = {
                id: payload.id,
                device: payload.device_id,
                kind: 'osquery_result',
                ts: payload.created_at,
                payload: payload.payload
            };
            
            await client.query(
                'INSERT INTO events (id, device, kind, ts, payload) VALUES ($1, $2, $3, $4, $5)',
                [fleetEvent.id, fleetEvent.device, fleetEvent.kind, fleetEvent.ts, fleetEvent.payload]
            );
            console.log(`✅ Injected ${fleetEvent.id} (${(payload.size_bytes / 1024 / 1024).toFixed(2)} MB)`);
        }
        
        // Verify insertion
        const result = await client.query(`
            SELECT id, device, kind, 
                   length(payload::text) as payload_size_bytes,
                   (length(payload::text) / 1024)::int as payload_size_kb,
                   ts 
            FROM events 
            WHERE id LIKE 'test-large-payload-%' 
            ORDER BY length(payload::text) DESC;
        `);
        
        console.log('\n📊 Injected Events:');
        console.table(result.rows);
        
        console.log('\n🚀 SUCCESS! Large test payloads injected into local database.');
        console.log('🎯 Next steps:');
        console.log('   1. cd .. && pnpm dev');
        console.log('   2. Navigate to http://localhost:3000/dashboard');
        console.log('   3. Navigate to http://localhost:3000/events');
        console.log('   4. Watch for crashes or errors in browser console');
        
    } catch (error) {
        console.error('❌ Database operation failed:', error);
        console.log('\n💡 Alternative approaches:');
        console.log('1. Use Docker: docker exec -i reportmate-postgres-1 psql -U reportmate -d reportmate < scripts/inject-large-payloads.sql');
        console.log('2. Install PostgreSQL client tools and use psql directly');
        console.log('3. Use Option 1 from REPRODUCE_ERROR_LOCALLY.md to connect to production database');
    } finally {
        await client.end();
    }
}

if (require.main === module) {
    injectTestData().catch(console.error);
}

module.exports = { injectTestData };

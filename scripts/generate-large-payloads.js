// Generate test data that mimics the large osquery payloads causing crashes
// This simulates what Windows clients are sending to production

const fs = require('fs');
const path = require('path');

// Generate a large osquery-style payload similar to what Windows clients send
function generateLargeOsqueryPayload() {
    const basePayload = {
        osquery_version: "5.9.1",
        platform: "windows",
        instance_id: "12345678-1234-1234-1234-123456789012",
        pid: "4567",
        epoch: Date.now(),
        counter: 1,
        decorations: {
            hostname: "DESKTOP-ABC123",
            username: "Administrator",
            uuid: "12345678-1234-1234-1234-123456789012"
        },
        data: []
    };

    // Generate massive data arrays like osquery sends
    const tables = [
        'processes', 'file_events', 'socket_events', 'registry', 
        'services', 'users', 'groups', 'network_interfaces',
        'disk_encryption', 'certificates', 'chrome_extensions',
        'firefox_addons', 'startup_items', 'scheduled_tasks'
    ];

    // Create hundreds of rows for each table (like real osquery)
    tables.forEach(table => {
        const tableData = [];
        
        // Generate 50-200 rows per table (osquery can send much more)
        const rowCount = Math.floor(Math.random() * 150) + 50;
        
        for (let i = 0; i < rowCount; i++) {
            const row = {
                name: table,
                hostIdentifier: "DESKTOP-ABC123",
                calendarTime: new Date().toISOString(),
                unixTime: Math.floor(Date.now() / 1000),
                epoch: 0,
                counter: i,
                columns: generateTableColumns(table, i)
            };
            tableData.push(row);
        }
        
        basePayload.data.push(...tableData);
    });

    return basePayload;
}

// Generate realistic columns for each osquery table
function generateTableColumns(table, index) {
    const commonColumns = {
        pid: Math.floor(Math.random() * 65535),
        uid: Math.floor(Math.random() * 1000),
        gid: Math.floor(Math.random() * 1000),
        time: Math.floor(Date.now() / 1000)
    };

    switch (table) {
        case 'processes':
            return {
                ...commonColumns,
                name: `process_${index}.exe`,
                path: `C:\\Program Files\\App${index}\\process_${index}.exe`,
                cmdline: `"C:\\Program Files\\App${index}\\process_${index}.exe" --arg1 --arg2 --very-long-argument-that-makes-this-string-much-longer`,
                cwd: `C:\\Program Files\\App${index}`,
                root: "C:\\",
                sid: `S-1-5-21-${Math.random().toString().slice(2, 12)}-${Math.random().toString().slice(2, 12)}-${Math.random().toString().slice(2, 12)}-${Math.floor(Math.random() * 10000)}`,
                on_disk: "1",
                wired_size: Math.floor(Math.random() * 1000000),
                resident_size: Math.floor(Math.random() * 1000000),
                total_size: Math.floor(Math.random() * 10000000),
                user_time: Math.floor(Math.random() * 100000),
                system_time: Math.floor(Math.random() * 100000),
                disk_bytes_read: Math.floor(Math.random() * 1000000000),
                disk_bytes_written: Math.floor(Math.random() * 1000000000),
                start_time: Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 86400),
                parent: Math.floor(Math.random() * 65535),
                pgroup: Math.floor(Math.random() * 65535),
                threads: Math.floor(Math.random() * 100),
                nice: 0
            };

        case 'file_events':
            return {
                ...commonColumns,
                target_path: `C:\\Users\\Administrator\\Documents\\file_${index}_with_very_long_filename_that_exceeds_normal_length.txt`,
                category: "CREATE",
                action: "CREATED",
                transaction_id: Math.floor(Math.random() * 1000000),
                md5: Array.from({length: 32}, () => Math.floor(Math.random() * 16).toString(16)).join(''),
                sha1: Array.from({length: 40}, () => Math.floor(Math.random() * 16).toString(16)).join(''),
                sha256: Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join(''),
                hashed: "1",
                size: Math.floor(Math.random() * 10000000)
            };

        case 'registry':
            return {
                ...commonColumns,
                key: `HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\VeryLongApplicationName${index}\\InstallLocationWithExtremelyLongPath`,
                name: `DefaultValue${index}`,
                type: "REG_SZ",
                data: `C:\\Program Files (x86)\\Very Long Application Name ${index}\\SubFolder\\AnotherSubFolder\\Application.exe`,
                mtime: Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 86400)
            };

        case 'services':
            return {
                ...commonColumns,
                name: `Service${index}`,
                service_type: "WIN32_OWN_PROCESS",
                display_name: `Very Long Service Display Name ${index} That Describes Complex Functionality`,
                status: "RUNNING",
                pid: Math.floor(Math.random() * 65535),
                start_type: "AUTO_START",
                win32_exit_code: 0,
                service_exit_code: 0,
                path: `C:\\Program Files\\ServiceProvider${index}\\ServiceExecutable.exe`,
                module_path: `C:\\Program Files\\ServiceProvider${index}\\ServiceModule.dll`,
                description: `This is a very long service description that explains in detail what this service does and why it's important for system functionality. Service ${index} provides critical features.`,
                user_account: `NT AUTHORITY\\LocalService${index}`
            };

        default:
            return {
                ...commonColumns,
                value: `Very long value for ${table} table entry ${index} that contains extensive information about system state and configuration`,
                description: `Detailed description of ${table} entry ${index} with comprehensive information about the system component and its current configuration state`
            };
    }
}

// Generate and save test payloads
async function generateTestPayloads() {
    console.log('🔄 Generating large test payloads...');
    
    const payloads = [];
    
    // Generate 5 different large payloads
    for (let i = 0; i < 5; i++) {
        const payload = generateLargeOsqueryPayload();
        const payloadSize = JSON.stringify(payload).length;
        
        payloads.push({
            id: `test-large-payload-${i + 1}`,
            device_id: `DESKTOP-TEST-${i + 1}`,
            event_type: 'osquery_result',
            payload: payload,
            created_at: new Date().toISOString(),
            size_bytes: payloadSize
        });
        
        console.log(`✅ Generated payload ${i + 1}: ${(payloadSize / 1024 / 1024).toFixed(2)} MB`);
    }
    
    // Save to JSON file
    fs.writeFileSync(
        path.join(__dirname, 'large-test-payloads.json'),
        JSON.stringify(payloads, null, 2)
    );
    
    console.log(`📁 Saved ${payloads.length} large test payloads to large-test-payloads.json`);
    console.log(`💾 Total size: ${(payloads.reduce((sum, p) => sum + p.size_bytes, 0) / 1024 / 1024).toFixed(2)} MB`);
    
    return payloads;
}

// Create a script to inject these into the local database
function generateDatabaseScript(payloads) {
    const sqlStatements = payloads.map(p => {
        const escapedPayload = JSON.stringify(p.payload).replace(/'/g, "''");
        return `INSERT INTO events (id, device_id, event_type, payload, created_at) VALUES ('${p.id}', '${p.device_id}', '${p.event_type}', '${escapedPayload}'::jsonb, '${p.created_at}');`;
    }).join('\n');
    
    const fullScript = `-- Script to inject large test payloads into local database
-- This simulates the production data causing crashes

-- Clear existing test data
DELETE FROM events WHERE id LIKE 'test-large-payload-%';

-- Insert large payloads
${sqlStatements}

-- Verify insertion
SELECT id, device_id, event_type, length(payload::text) as payload_size_bytes, created_at 
FROM events 
WHERE id LIKE 'test-large-payload-%' 
ORDER BY length(payload::text) DESC;
`;
    
    fs.writeFileSync(
        path.join(__dirname, 'inject-large-payloads.sql'),
        fullScript
    );
    
    console.log('📄 Generated inject-large-payloads.sql script');
}

// Main execution
if (require.main === module) {
    generateTestPayloads()
        .then(payloads => {
            generateDatabaseScript(payloads);
            console.log('\n🚀 Next steps:');
            console.log('1. Start your local database: docker-compose up -d postgres');
            console.log('2. Run: psql postgresql://reportmate:reportmate123@localhost:5432/reportmate -f scripts/inject-large-payloads.sql');
            console.log('3. Start the app: pnpm dev');
            console.log('4. Navigate to /dashboard to reproduce the crash');
        })
        .catch(console.error);
}

module.exports = { generateLargeOsqueryPayload, generateTestPayloads };

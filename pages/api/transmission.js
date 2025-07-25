const { Pool } = require('pg');

// Database connection string - aligned with new architecture
const CONNECTION_STRING = process.env.DATABASE_URL || 
    "postgresql://reportmate:2sSWbVxyqjXp9WUpeMmzRaC@reportmate-database.postgres.database.azure.com:5432/reportmate?sslmode=require";

// Initialize database pool
const pool = new Pool({
    connectionString: CONNECTION_STRING
});

// Valid event types (strict validation) - aligned with new API
const VALID_EVENT_TYPES = ['success', 'warning', 'error', 'info', 'system'];

// Valid modules based on our modular architecture
const VALID_MODULES = new Set([
    'applications', 'displays', 'hardware', 'installs', 'inventory',
    'management', 'network', 'printers', 'profiles', 'security', 'system'
]);

// Module table mapping (JSON file -> database table)
const MODULE_TABLES = {
    'applications': 'applications',
    'displays': 'displays', 
    'hardware': 'hardware',
    'installs': 'installs',
    'inventory': 'inventory',
    'management': 'management',
    'network': 'network',
    'printers': 'printers',
    'profiles': 'profiles',
    'security': 'security',
    'system': 'system'
};

export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            error: 'Method not allowed',
            message: 'Only POST requests are supported'
        });
    }

    console.log(`📡 Received unified payload from device`);
    
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const payload = req.body;
        
        // Validate payload structure
        if (!payload.deviceInfo || !payload.moduleData) {
            return res.status(400).json({
                error: "Invalid payload structure",
                message: "Payload must contain deviceInfo and moduleData"
            });
        }
        
        // Extract components
        const deviceInfo = payload.deviceInfo;
        const moduleData = payload.moduleData;
        const metadata = payload.metadata || [];
        
        // Validate device info
        if (!deviceInfo.serialNumber || !deviceInfo.deviceId) {
            return res.status(400).json({
                error: "Invalid device info",
                message: "Device must have both serialNumber and deviceId"
            });
        }
        
        const serialNumber = deviceInfo.serialNumber;
        const deviceId = deviceInfo.deviceId;
        
        console.log(`Processing device: ${serialNumber} (${deviceId})`);
        console.log(`Modules to process: ${Object.keys(moduleData).join(', ')}`);
        console.log(`Events to process: ${metadata.length}`);
        
        // 1. Register/update device with new schema validation
        await registerDevice(client, deviceInfo);
        
        // 2. Store module data (one table per module) - improved error handling
        const moduleResults = {};
        for (const [moduleName, data] of Object.entries(moduleData)) {
            try {
                await storeModuleData(client, deviceId, moduleName, data);
                moduleResults[moduleName] = true;
            } catch (error) {
                console.error(`Failed to store module ${moduleName}:`, error.message);
                moduleResults[moduleName] = false;
            }
        }
        
        // 3. Process events with strict validation
        let eventsStored = 0;
        for (const event of metadata) {
            try {
                await storeEvent(client, deviceId, event);
                eventsStored++;
            } catch (error) {
                console.error(`Failed to store event:`, error.message);
            }
        }
        
        await client.query('COMMIT');
        
        const successfulModules = Object.values(moduleResults).filter(success => success).length;
        const totalModules = Object.keys(moduleResults).length;
        
        console.log(`✅ Successfully processed device: ${serialNumber} (${deviceId})`);
        console.log(`   Modules processed: ${successfulModules}/${totalModules}`);
        console.log(`   Events processed: ${eventsStored}/${metadata.length}`);
        
        return res.status(201).json({
            status: "success",
            message: "Unified payload stored successfully",
            deviceId: deviceId,
            serialNumber: serialNumber,
            modulesProcessed: Object.keys(moduleData),
            modulesSuccessful: successfulModules,
            eventsProcessed: eventsStored,
            architecture: "modular"
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ Error processing unified payload:`, error);
        
        if (error.message.includes('constraint violation')) {
            return res.status(409).json({
                error: "Device constraint violation",
                message: error.message
            });
        }
        
        return res.status(500).json({
            error: "Internal server error",
            message: error.message
        });
    } finally {
        client.release();
    }
}

async function registerDevice(client, deviceInfo) {
    const serialNumber = deviceInfo.serialNumber;
    const deviceId = deviceInfo.deviceId;
    
    console.log(`Registering device: ${serialNumber} (${deviceId})`);
    
    // Validate deviceId is a UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(deviceId)) {
        throw new Error('deviceId must be a valid UUID');
    }
    
    // Check for existing device with same serialNumber but different deviceId
    const deviceCheckResult = await client.query(`
        SELECT device_id, serial_number 
        FROM devices 
        WHERE serial_number = $1 AND device_id != $2
    `, [serialNumber, deviceId]);

    if (deviceCheckResult.rows.length > 0) {
        throw new Error(`Serial number '${serialNumber}' already exists with different deviceId`);
    }
    
    // Insert or update device record using new schema
    await client.query(`
        INSERT INTO devices (
            device_id, serial_number, hostname, os_version, 
            architecture, last_boot_time, uptime, timezone, 
            collector_version, last_seen, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW(), NOW())
        ON CONFLICT (device_id) 
        DO UPDATE SET 
            serial_number = EXCLUDED.serial_number,
            hostname = EXCLUDED.hostname,
            os_version = EXCLUDED.os_version,
            architecture = EXCLUDED.architecture,
            last_boot_time = EXCLUDED.last_boot_time,
            uptime = EXCLUDED.uptime,
            timezone = EXCLUDED.timezone,
            collector_version = EXCLUDED.collector_version,
            last_seen = NOW(),
            updated_at = NOW()
    `, [
        deviceId,
        serialNumber,
        deviceInfo.hostname || null,
        deviceInfo.osVersion || null,
        deviceInfo.architecture || null,
        deviceInfo.lastBootTime || null,
        deviceInfo.uptime || null,
        deviceInfo.timezone || null,
        deviceInfo.clientVersion || null
    ]);
    
    console.log(`✅ Device registered: ${serialNumber} (${deviceId})`);
}

async function storeModuleData(client, deviceId, moduleName, data) {
    if (!VALID_MODULES.has(moduleName)) {
        console.warn(`Unknown module: ${moduleName}, skipping`);
        return;
    }
    
    try {
        // Use the new modular table schema
        await client.query(`
            INSERT INTO ${moduleName} (
                device_id, data, collector_timestamp, execution_time, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, NOW(), NOW())
            ON CONFLICT (device_id)
            DO UPDATE SET 
                data = EXCLUDED.data,
                collector_timestamp = EXCLUDED.collector_timestamp,
                execution_time = EXCLUDED.execution_time,
                updated_at = NOW()
        `, [
            deviceId,
            JSON.stringify(data),
            new Date().toISOString(), // collector_timestamp
            null // execution_time (not provided in old format)
        ]);
        
        console.log(`✅ Stored ${moduleName} data for device ${deviceId}`);
    } catch (error) {
        console.error(`❌ Failed to store ${moduleName} data:`, error.message);
        throw error;
    }
}

async function storeEvent(client, deviceId, event) {
    const eventLevel = (event.eventType || event.level || '').toLowerCase();
    
    // Strict event type validation
    if (!VALID_EVENT_TYPES.includes(eventLevel)) {
        console.warn(`Invalid event type '${eventLevel}' blocked. Must be one of: ${VALID_EVENT_TYPES.join(', ')}`);
        return;  // Block invalid events
    }
    
    try {
        // Use the new events table schema
        await client.query(`
            INSERT INTO events (
                device_id, timestamp, level, module, message, details, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        `, [
            deviceId,
            event.timestamp || new Date().toISOString(),
            eventLevel,
            event.module || 'system',
            event.message || '',
            event.details ? JSON.stringify(event.details) : null
        ]);
        
        console.log(`✅ Stored ${eventLevel} event for device ${deviceId}`);
    } catch (error) {
        console.error(`❌ Failed to store event:`, error.message);
        throw error;
    }
}

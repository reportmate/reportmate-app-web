const { Pool } = require('pg');

/**
 * Processes modular device data according to the ReportMate architecture.
 * Each JSON module from the Windows client gets stored in its own table.
 */
class ModularDataProcessor {
    constructor(connectionString) {
        this.pool = new Pool({
            connectionString: connectionString
        });
        
        // Valid event types (strict validation)
        this.VALID_EVENT_TYPES = new Set(['success', 'warning', 'error', 'info', 'system']);
        
        // Module table mapping (JSON file -> database table)
        this.MODULE_TABLES = {
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
    }

    /**
     * Process a unified payload from the Windows client.
     */
    async processUnifiedPayload(payload) {
        console.log("Processing unified payload");
        
        const client = await this.pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Extract components
            const deviceInfo = payload.deviceInfo || {};
            const moduleData = payload.moduleData || {};
            const metadata = payload.metadata || [];
            
            // Validate device info
            if (!deviceInfo.serialNumber || !deviceInfo.deviceId) {
                throw new Error("Device must have both serialNumber and deviceId");
            }
            
            const serialNumber = deviceInfo.serialNumber;
            const deviceId = deviceInfo.deviceId;
            
            // 1. Register/update device
            await this._registerDevice(client, deviceInfo);
            
            // 2. Store module data (one table per module)
            for (const [moduleName, data] of Object.entries(moduleData)) {
                if (this.MODULE_TABLES[moduleName]) {
                    await this._storeModuleData(client, serialNumber, moduleName, data);
                } else {
                    console.warn(`Unknown module: ${moduleName}`);
                }
            }
            
            // 3. Process events (strict validation)
            for (const event of metadata) {
                await this._storeEvent(client, serialNumber, event);
            }
            
            await client.query('COMMIT');
            
            console.log(`Successfully processed payload for device ${serialNumber}`);
            
            return {
                status: "success",
                message: "Unified payload stored successfully",
                deviceId: deviceId,
                serialNumber: serialNumber,
                modulesProcessed: Object.keys(moduleData),
                eventsProcessed: metadata.length
            };
            
        } catch (error) {
            await client.query('ROLLBACK');
            console.error(`Error processing payload: ${error.message}`);
            throw error;
        } finally {
            client.release();
        }
    }

    async _registerDevice(client, deviceInfo) {
        const serialNumber = deviceInfo.serialNumber;
        const deviceId = deviceInfo.deviceId;
        
        // Check if device exists with different serial/device pair (violation)
        const existingDevice = await client.query(`
            SELECT serial_number, device_id FROM devices 
            WHERE serial_number = $1 OR device_id = $2
        `, [serialNumber, deviceId]);
        
        if (existingDevice.rows.length > 0) {
            const existing = existingDevice.rows[0];
            if (existing.serial_number !== serialNumber || existing.device_id !== deviceId) {
                throw new Error(
                    `Device constraint violation: serialNumber '${serialNumber}' and ` +
                    `deviceId '${deviceId}' pair must be unique. Found existing device with ` +
                    `serial: ${existing.serial_number}, device_id: ${existing.device_id}`
                );
            }
        }
        
        // Upsert device record (using serial number as primary key)
        await client.query(`
            INSERT INTO devices (
                id, device_id, name, serial_number, hostname, model, manufacturer,
                os, os_name, os_version, processor, memory, storage, graphics,
                architecture, last_seen, status, ip_address_v4, ip_address_v6,
                mac_address_primary, uptime, client_version, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
                device_id = $2,
                name = $3,
                hostname = $5,
                model = $6,
                manufacturer = $7,
                os = $8,
                os_name = $9,
                os_version = $10,
                processor = $11,
                memory = $12,
                storage = $13,
                graphics = $14,
                architecture = $15,
                last_seen = $16,
                status = $17,
                ip_address_v4 = $18,
                ip_address_v6 = $19,
                mac_address_primary = $20,
                uptime = $21,
                client_version = $22,
                updated_at = NOW()
        `, [
            serialNumber,  // id (primary key)
            deviceId,
            deviceInfo.name || '',
            serialNumber,
            deviceInfo.hostname || '',
            deviceInfo.model || '',
            deviceInfo.manufacturer || '',
            deviceInfo.os || '',
            deviceInfo.osName || '',
            deviceInfo.osVersion || '',
            deviceInfo.processor || '',
            deviceInfo.memory || '',
            deviceInfo.storage || '',
            deviceInfo.graphics || '',
            deviceInfo.architecture || '',
            new Date(),  // last_seen
            'online',  // status
            deviceInfo.ipAddressV4 || '',
            deviceInfo.ipAddressV6 || '',
            deviceInfo.macAddress || '',
            deviceInfo.uptime || '',
            deviceInfo.clientVersion || ''
        ]);
        
        console.log(`Device registered: ${serialNumber} (${deviceId})`);
    }

    async _storeModuleData(client, deviceId, moduleName, data) {
        const tableName = this.MODULE_TABLES[moduleName];
        
        // Upsert module data (one record per device per module)
        await client.query(`
            INSERT INTO ${tableName} (
                device_id, data, collected_at, updated_at
            ) VALUES (
                $1, $2, $3, NOW()
            )
            ON CONFLICT (device_id) DO UPDATE SET
                data = $2,
                collected_at = $3,
                updated_at = NOW()
        `, [deviceId, JSON.stringify(data), new Date()]);
        
        console.log(`Stored ${moduleName} data for device ${deviceId}`);
    }

    async _storeEvent(client, deviceId, event) {
        const eventType = (event.eventType || '').toLowerCase();
        
        // Strict event type validation
        if (!this.VALID_EVENT_TYPES.has(eventType)) {
            console.warn(`Invalid event type '${eventType}' blocked. Must be one of: ${Array.from(this.VALID_EVENT_TYPES).join(', ')}`);
            return;  // Block invalid events
        }
        
        // Store the event
        await client.query(`
            INSERT INTO events (
                device_id, event_type, message, details, timestamp
            ) VALUES (
                $1, $2, $3, $4, $5
            )
        `, [
            deviceId,
            eventType,
            event.message || '',
            JSON.stringify(event.details || {}),
            event.timestamp || new Date().toISOString()
        ]);
        
        console.log(`Stored ${eventType} event for device ${deviceId}`);
    }

    async getDeviceData(serialNumber) {
        const client = await this.pool.connect();
        
        try {
            // Get device info
            const deviceResult = await client.query(`
                SELECT * FROM devices WHERE id = $1
            `, [serialNumber]);
            
            if (deviceResult.rows.length === 0) {
                return null;
            }
            
            const deviceData = deviceResult.rows[0];
            
            // Get all module data
            const moduleData = {};
            for (const [moduleName, tableName] of Object.entries(this.MODULE_TABLES)) {
                const moduleResult = await client.query(`
                    SELECT data, collected_at FROM ${tableName} WHERE device_id = $1
                `, [serialNumber]);
                
                if (moduleResult.rows.length > 0) {
                    const moduleRecord = moduleResult.rows[0];
                    moduleData[moduleName] = {
                        data: JSON.parse(moduleRecord.data),
                        collected_at: moduleRecord.collected_at.toISOString()
                    };
                }
            }
            
            // Get recent events
            const eventsResult = await client.query(`
                SELECT event_type, message, details, timestamp 
                FROM events 
                WHERE device_id = $1 
                ORDER BY timestamp DESC 
                LIMIT 10
            `, [serialNumber]);
            
            deviceData.moduleData = moduleData;
            deviceData.recentEvents = eventsResult.rows;
            
            return deviceData;
            
        } finally {
            client.release();
        }
    }

    async getDevicesList(limit = 50, offset = 0) {
        const client = await this.pool.connect();
        
        try {
            const result = await client.query(`
                SELECT 
                    id, device_id, name, serial_number, model, manufacturer,
                    os, last_seen, status, ip_address_v4, client_version
                FROM devices 
                ORDER BY last_seen DESC
                LIMIT $1 OFFSET $2
            `, [limit, offset]);
            
            return result.rows;
            
        } finally {
            client.release();
        }
    }

    async close() {
        await this.pool.end();
    }
}

module.exports = ModularDataProcessor;

import { Pool } from 'pg';

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
        this.VALID_EVENT_TYPES = new Set(['success', 'warning', 'error', 'info']);
        
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
            
            // Invalidate relevant caches when device checks in
            try {
                console.log(`Invalidating caches for device ${serialNumber} after check-in`)
                await this._invalidateDeviceCaches(serialNumber, deviceId)
            } catch (cacheError) {
                console.warn(`Cache invalidation failed for device ${serialNumber}:`, cacheError)
                // Don't fail the main operation if cache invalidation fails
            }
            
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
        
        // Upsert device record (using serial number as database primary key, deviceId as unique identifier)
        await client.query(`
            INSERT INTO devices (
                id, device_id, serial_number, last_seen, status, 
                client_version, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
                device_id = $2,
                last_seen = $4,
                status = $5,
                client_version = $6,
                updated_at = NOW()
        `, [
            serialNumber,  // id (database primary key) 
            deviceId,      // device_id (unique internal identifier)
            serialNumber,  // serial_number (human-readable unique identifier)
            new Date(),    // last_seen
            'online',      // status
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
            // Get device info (minimal - just identifiers and status)
            const deviceResult = await client.query(`
                SELECT device_id, serial_number, last_seen, status, client_version 
                FROM devices WHERE id = $1
            `, [serialNumber]);
            
            if (deviceResult.rows.length === 0) {
                return null;
            }
            
            const deviceData = deviceResult.rows[0];
            
            // Get all module data - this is the source of truth
            const modules = {};
            const moduleOrder = ['inventory', 'system', 'hardware', 'management'];
            
            // Add priority modules first
            for (const moduleName of moduleOrder) {
                if (this.MODULE_TABLES[moduleName]) {
                    const moduleResult = await client.query(`
                        SELECT data, collected_at FROM ${this.MODULE_TABLES[moduleName]} WHERE device_id = $1
                    `, [deviceData.device_id]);
                    
                    if (moduleResult.rows.length > 0) {
                        const moduleRecord = moduleResult.rows[0];
                        modules[moduleName] = moduleRecord.data;
                        modules[moduleName].collectedAt = moduleRecord.collected_at;
                    }
                }
            }
            
            // Add remaining modules alphabetically
            const remainingModules = Object.keys(this.MODULE_TABLES)
                .filter(moduleName => !moduleOrder.includes(moduleName))
                .sort();
                
            for (const moduleName of remainingModules) {
                const moduleResult = await client.query(`
                    SELECT data, collected_at FROM ${this.MODULE_TABLES[moduleName]} WHERE device_id = $1
                `, [deviceData.device_id]);
                
                if (moduleResult.rows.length > 0) {
                    const moduleRecord = moduleResult.rows[0];
                    modules[moduleName] = moduleRecord.data;
                    modules[moduleName].collectedAt = moduleRecord.collected_at;
                }
            }
            
            // Get recent events
            const eventsResult = await client.query(`
                SELECT event_type, message, details, timestamp 
                FROM events 
                WHERE device_id = $1 
                ORDER BY timestamp DESC 
                LIMIT 10
            `, [deviceData.device_id]);
            
            // Return clean structure - modules are the source of truth
            return {
                success: true,
                device: {
                    deviceId: deviceData.device_id,        // Internal UUID
                    serialNumber: deviceData.serial_number, // Human-readable ID
                    status: deviceData.status,
                    lastSeen: deviceData.last_seen,
                    clientVersion: deviceData.client_version,
                    modules: modules,  // All data comes from here - including name from inventory
                    recentEvents: eventsResult.rows
                }
            };
            
        } finally {
            client.release();
        }
    }

    async getDevicesList(limit = 50, offset = 0) {
        const client = await this.pool.connect();
        
        try {
            const result = await client.query(`
                SELECT 
                    device_id, serial_number, last_seen, status, client_version
                FROM devices 
                ORDER BY last_seen DESC
                LIMIT $1 OFFSET $2
            `, [limit, offset]);
            
            // Return clean list - no duplicate data, just identifiers and status
            return result.rows.map(device => ({
                deviceId: device.device_id,
                serialNumber: device.serial_number,
                lastSeen: device.last_seen,
                status: device.status,
                clientVersion: device.client_version
            }));
            
        } finally {
            client.release();
        }
    }

    async close() {
        await this.pool.end();
    }

    /**
     * Invalidate relevant caches when a device checks in
     */
    async _invalidateDeviceCaches(serialNumber, deviceId) {
        // This is a placeholder for cache invalidation logic
        // In a production system, this would:
        // 1. Clear in-memory caches for affected endpoints
        // 2. Send cache invalidation signals to other instances
        // 3. Update cache tags or timestamps
        
        console.log(`Cache invalidation triggered for device ${serialNumber} (${deviceId})`)
        
        // For now, we'll just log the invalidation
        // The actual cache clearing will happen when the TTL expires (30-60 seconds)
        // This gives us immediate database updates with near-real-time cache refresh
    }
}

module.exports = ModularDataProcessor;

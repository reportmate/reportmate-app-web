/**
 * Shared utilities for installs API routes
 * This module is imported directly by routes - no HTTP calls needed
 * 
 * OPTIMIZED: Uses bulk /api/devices/installs endpoint instead of 
 * fetching each device individually (349 devices = 42+ seconds → ~10 seconds)
 */

import { getInternalApiHeaders } from '@/lib/api-auth'

// Shared cache with 5 minute TTL
let cachedInstallRecords: { records: any[], timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch all install records from the FastAPI bulk endpoint
 * Uses the optimized /api/devices/installs endpoint instead of individual device fetches
 */
export async function fetchBulkInstallRecords(): Promise<any[]> {
  const API_BASE_URL = process.env.API_BASE_URL;
  
  if (!API_BASE_URL) {
    throw new Error('API_BASE_URL not configured');
  }

  // Check cache first
  if (cachedInstallRecords && (Date.now() - cachedInstallRecords.timestamp) < CACHE_TTL) {
    console.log('[INSTALLS SHARED] Using cached install records');
    return cachedInstallRecords.records;
  }

  console.log('[INSTALLS SHARED] Fetching install records from bulk endpoint');
  
  // Use shared authentication headers
  const headers = getInternalApiHeaders();
  
  // Use the bulk /api/devices/installs endpoint - much faster than individual fetches!
  const response = await fetch(`${API_BASE_URL}/api/devices/installs`, {
    cache: 'no-store',
    headers
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch bulk installs: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  // FastAPI endpoint returns array directly, not wrapped in { devices: [] }
  const records = Array.isArray(data) ? data : (Array.isArray(data.devices) ? data.devices : []);
  
  // Cache the results
  cachedInstallRecords = {
    records,
    timestamp: Date.now()
  };

  console.log(`[INSTALLS SHARED] Cached ${records.length} install records`);
  return records;
}

/**
 * Parse PowerShell-formatted inventory string into JSON object
 */
export function parseInventory(inventory: any): any {
  if (typeof inventory === 'string' && inventory.startsWith('@{')) {
    try {
      const jsonStr = inventory
        .replace(/@\{/g, '{')
        .replace(/\}/g, '}')
        .replace(/([a-zA-Z_][a-zA-Z0-9_]*)=/g, '"$1":')
        .replace(/; /g, ', ')
        .replace(/: ([^,}]+)/g, (match, value) => {
          if (!value.trim().startsWith('"')) {
            return `: "${value.trim()}"`;
          }
          return match;
        });
      return JSON.parse(jsonStr);
    } catch {
      return inventory;
    }
  }
  return inventory;
}

/**
 * Get install records for the report
 * Uses the optimized bulk endpoint which returns flattened install records
 * Format: { deviceId, serialNumber, deviceName, itemName, currentStatus, ... }
 */
export async function getDevicesWithInstalls(): Promise<{
  total: number;
  withInstalls: number;
  devices: any[];
}> {
  const records = await fetchBulkInstallRecords();
  
  // Group records by device for statistics
  const deviceMap = new Map<string, any[]>();
  for (const record of records) {
    const serial = record.serialNumber;
    if (!deviceMap.has(serial)) {
      deviceMap.set(serial, []);
    }
    deviceMap.get(serial)!.push(record);
  }
  
  // Transform bulk records into the expected device structure for compatibility
  // The bulk endpoint already has flattened records, but route.ts expects nested modules
  const devicesWithInstalls = Array.from(deviceMap.entries()).map(([serial, deviceRecords]) => {
    const firstRecord = deviceRecords[0];
    return {
      serialNumber: serial,
      deviceId: firstRecord.deviceId,
      deviceName: firstRecord.deviceName,
      lastSeen: firstRecord.lastSeen,
      modules: {
        installs: {
          cimian: {
            items: deviceRecords.map(r => ({
              itemName: r.itemName,
              displayName: r.itemName,
              currentStatus: r.currentStatus,
              latestVersion: r.latestVersion,
              installedVersion: r.installedVersion,
              ...r.raw
            }))
          }
        },
        inventory: {
          usage: firstRecord.usage,
          catalog: firstRecord.catalog,
          location: firstRecord.location,
          deviceName: firstRecord.deviceName
        }
      }
    };
  });

  return {
    total: deviceMap.size,
    withInstalls: devicesWithInstalls.length,
    devices: devicesWithInstalls
  };
}

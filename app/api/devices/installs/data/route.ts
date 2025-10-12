import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Shared cache with filters route (5 minute TTL)
let cachedData: { devices: any[], timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchAllDevicesWithModules(API_BASE_URL: string) {
  // Check cache first
  if (cachedData && (Date.now() - cachedData.timestamp) < CACHE_TTL) {
    console.log('[INSTALLS DATA] Using cached device data');
    return cachedData.devices;
  }

  console.log('[INSTALLS DATA] Fetching fresh device data from API');
  
  // Fetch all devices from FastAPI container
  const listResponse = await fetch(`${API_BASE_URL}/api/devices`, {
    cache: 'no-store'
  });

  if (!listResponse.ok) {
    throw new Error('Failed to fetch devices list');
  }

  const listData = await listResponse.json();
  const deviceList = Array.isArray(listData.devices) ? listData.devices : [];

  // Fetch detailed data in batches of 50 to avoid overwhelming the API
  const BATCH_SIZE = 50;
  const devices: any[] = [];
  
  for (let i = 0; i < deviceList.length; i += BATCH_SIZE) {
    const batch = deviceList.slice(i, i + BATCH_SIZE);
    const batchPromises = batch.map(async (device: any) => {
      try {
        const detailResponse = await fetch(`${API_BASE_URL}/api/device/${device.serialNumber}`, {
          cache: 'no-store'
        });
        if (!detailResponse.ok) return null;
        const detailData = await detailResponse.json();
        return detailData.device || detailData;
      } catch (fetchError) {
        console.warn('[INSTALLS DATA] Failed to fetch device details', {
          serial: device.serialNumber,
          error: fetchError instanceof Error ? fetchError.message : fetchError
        });
        return null;
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    devices.push(...batchResults.filter(d => d !== null));
  }

  // Cache the results
  cachedData = {
    devices,
    timestamp: Date.now()
  };

  console.log(`[INSTALLS DATA] Cached ${devices.length} devices`);
  return devices;
}

/**
 * GET /api/devices/installs/data
 * 
 * Returns all devices with ONLY installs + inventory modules
 * Uses shared cache with filters route for performance
 */
export async function GET() {
  const API_BASE_URL = process.env.API_BASE_URL;

  if (!API_BASE_URL) {
    return NextResponse.json({ error: 'API_BASE_URL not configured' }, { status: 500 });
  }

  try {
    const devices = await fetchAllDevicesWithModules(API_BASE_URL);

    // Extract only installs + inventory modules from each device
    const installsData = devices.map((device: any) => {
      const modules = device.modules || {};
      
      // Parse inventory if it's PowerShell format
      let inventory = modules.inventory;
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
          inventory = JSON.parse(jsonStr);
        } catch (parseError) {
          console.error('[INSTALLS DATA] Failed to parse inventory for device', device.serialNumber, parseError);
        }
      }

      return {
        serialNumber: device.serialNumber,
        deviceId: device.deviceId,
        deviceName: device.deviceName,
        lastSeen: device.lastSeen,
        // Only include installs + inventory modules
        modules: {
          installs: modules.installs || null,
          inventory: inventory || null
        }
      };
    });

    // Filter out devices that don't have installs data
    const devicesWithInstalls = installsData.filter((d: any) => 
      d.modules.installs?.cimian?.items?.length > 0
    );

    return NextResponse.json({
      success: true,
      total: devices.length,
      withInstalls: devicesWithInstalls.length,
      devices: devicesWithInstalls
    });

  } catch (error) {
    console.error('[INSTALLS DATA] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

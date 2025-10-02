import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/devices/installs/data
 * 
 * Returns all devices with ONLY installs + inventory modules
 * This keeps the response lightweight for the installs report page
 * 
 * TODO: Create FastAPI endpoint /api/devices/installs that returns module-specific data
 * For now, we fetch from /api/devices (serial numbers only) then individual /api/device/{serial}
 */
export async function GET() {
  const API_BASE_URL = process.env.API_BASE_URL;

  if (!API_BASE_URL) {
    return NextResponse.json({ error: 'API_BASE_URL not configured' }, { status: 500 });
  }

  try {
    // Step 1: Get list of all device serial numbers
    const listResponse = await fetch(`${API_BASE_URL}/api/devices`, {
      cache: 'no-store'
    });

    if (!listResponse.ok) {
      return NextResponse.json({ 
        error: 'Failed to fetch device list from API',
        status: listResponse.status 
      }, { status: listResponse.status });
    }

    const listData = await listResponse.json();
    // FastAPI returns: { devices: [], total: N, message: "..." }
    const deviceList = Array.isArray(listData.devices) ? listData.devices : (Array.isArray(listData) ? listData : []);
    
    console.log(`[INSTALLS DATA] Fetching detailed data for ${deviceList.length} devices...`);

    // Step 2: Fetch detailed data for each device (with installs module)
    // TODO: This is inefficient - FastAPI should provide a bulk endpoint with module filtering
    // Fetch ALL devices for complete inventory data
    const devicesToFetch = deviceList;
    
    const devicePromises = devicesToFetch.map(async (device: any) => {
      try {
        const detailResponse = await fetch(`${API_BASE_URL}/api/device/${device.serialNumber}`, {
          cache: 'no-store'
        });
        
        if (!detailResponse.ok) return null;
        
        const detailData = await detailResponse.json();
        return detailData.device || detailData;
      } catch (error) {
        console.error(`[INSTALLS DATA] Failed to fetch device ${device.serialNumber}`);
        return null;
      }
    });

    const devices = (await Promise.all(devicePromises)).filter(d => d !== null);

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
        } catch (e) {
          console.error('[INSTALLS DATA] Failed to parse inventory for device', device.serialNumber);
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

    console.log(`[INSTALLS DATA] Returning ${devicesWithInstalls.length} devices with installs data out of ${devices.length} total`);

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

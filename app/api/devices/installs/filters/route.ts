import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const API_BASE_URL = process.env.API_BASE_URL;

  if (!API_BASE_URL) {
    return NextResponse.json({ error: 'API_BASE_URL not configured' }, { status: 500 });
  }

  try {
    // Fetch all devices from FastAPI container
    const devicesResponse = await fetch(`${API_BASE_URL}/api/devices`, {
      cache: 'no-store'
    });

    if (!devicesResponse.ok) {
      return NextResponse.json({ error: 'API fetch failed' }, { status: 500 });
    }

    const devicesData = await devicesResponse.json();
    const deviceList = Array.isArray(devicesData.devices) ? devicesData.devices : [];
    
    console.log(`[INSTALLS FILTERS] Fetching detailed data for ${deviceList.length} devices...`);
    
    // Fetch detailed data for each device (to get installs module)
    const devicePromises = deviceList.map(async (device: any) => {
      try {
        const detailResponse = await fetch(`${API_BASE_URL}/api/device/${device.serialNumber}`, {
          cache: 'no-store'
        });
        if (!detailResponse.ok) return null;
        const detailData = await detailResponse.json();
        return detailData.device || detailData;
      } catch (error) {
        return null;
      }
    });

    const devices = (await Promise.all(devicePromises)).filter(d => d !== null);
    
    const installsDevices = devices.filter(d => d.modules?.installs);
    const inventoryDevices = devices;
    
    console.log('[FILTERS] Installs devices:', installsDevices.length);
    console.log('[FILTERS] Inventory devices:', inventoryDevices.length);
    
    const managed = new Set();
    const other = new Set();
    const usages = new Set();
    const catalogs = new Set();
    const rooms = new Set();
    const fleets = new Set();
    
    // Extract managed installs from devices WITH installs data
    for (const device of installsDevices) {
      const m = device.modules || {};
      
      // Extract managed installs from Cimian items
      if (m.installs?.cimian?.items) {
        console.log(`[FILTERS] Device ${device.serialNumber} has ${m.installs.cimian.items.length} Cimian items`);
        for (const item of m.installs.cimian.items) {
          const name = item.itemName || item.displayName || item.name;
          if (name) {
            managed.add(name.trim());
          }
        }
      }
    }
    
    // Extract inventory data from ALL devices
    for (const device of inventoryDevices) {
      const m = device.modules || {};
      
      // Parse inventory if it's PowerShell format
      let inventory = m.inventory;
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
          // Silently skip parse errors
        }
      }
      
      if (inventory && typeof inventory === 'object') {
        if (inventory.usage) usages.add(inventory.usage);
        if (inventory.catalog) catalogs.add(inventory.catalog);
        if (inventory.location) rooms.add(inventory.location);
        if (inventory.fleet) fleets.add(inventory.fleet);
      }
    }
    
    console.log('[FILTERS] Extraction complete:', {
      managed: managed.size,
      usages: usages.size,
      catalogs: catalogs.size,
      rooms: rooms.size,
      fleets: fleets.size
    });
    
    return NextResponse.json({
      success: true,
      managedInstalls: Array.from(managed).sort(),
      otherInstalls: Array.from(other).sort(),
      usages: Array.from(usages).sort(),
      catalogs: Array.from(catalogs).sort(),
      rooms: Array.from(rooms).sort(),
      fleets: Array.from(fleets).sort(),
      platforms: ['Windows', 'Macintosh'],
      devicesWithData: inventoryDevices.length
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

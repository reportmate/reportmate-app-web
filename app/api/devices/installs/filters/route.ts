import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Simple in-memory cache with 5 minute TTL
let cachedData: { devices: any[], timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchAllDevicesWithModules(API_BASE_URL: string, isLocalhost: boolean) {
  // Check cache first
  if (cachedData && (Date.now() - cachedData.timestamp) < CACHE_TTL) {
    console.log('[INSTALLS FILTERS] Using cached device data');
    return cachedData.devices;
  }

  console.log('[INSTALLS FILTERS] Fetching fresh device data from API');
  
  // Get managed identity principal ID from Azure Container Apps
  const managedIdentityId = process.env.AZURE_CLIENT_ID || process.env.MSI_CLIENT_ID
  
  // Build headers with authentication
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  
  if (process.env.REPORTMATE_PASSPHRASE) {
    headers['X-API-PASSPHRASE'] = process.env.REPORTMATE_PASSPHRASE
  } else if (managedIdentityId) {
    headers['X-MS-CLIENT-PRINCIPAL-ID'] = managedIdentityId
  }
  
  // Fetch all devices from FastAPI container
  const devicesResponse = await fetch(`${API_BASE_URL}/api/devices`, {
    cache: 'no-store',
    headers
  });

  if (!devicesResponse.ok) {
    throw new Error('Failed to fetch devices list');
  }

  const devicesData = await devicesResponse.json();
  const deviceList = Array.isArray(devicesData.devices) ? devicesData.devices : [];
  
  // Fetch detailed data in batches of 50 to avoid overwhelming the API
  const BATCH_SIZE = 50;
  const devices: any[] = [];
  
  for (let i = 0; i < deviceList.length; i += BATCH_SIZE) {
    const batch = deviceList.slice(i, i + BATCH_SIZE);
    const batchPromises = batch.map(async (device: any) => {
      try {
        const detailResponse = await fetch(`${API_BASE_URL}/api/device/${device.serialNumber}`, {
          cache: 'no-store',
          headers
        });
        if (!detailResponse.ok) return null;
        const detailData = await detailResponse.json();
        return detailData.device || detailData;
      } catch {
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

  console.log(`[INSTALLS FILTERS] Cached ${devices.length} devices`);
  return devices;
}

export async function GET(request: Request) {
  // LOCALHOST BYPASS: Skip auth check for local development
  const isLocalhost = request.headers.get('host')?.includes('localhost') || process.env.NODE_ENV === 'development'
  
  // CRITICAL: Check authentication (skip for localhost)
  if (!isLocalhost) {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        details: 'Authentication required'
      }, { status: 401 })
    }
  }

  const API_BASE_URL = process.env.API_BASE_URL;

  if (!API_BASE_URL) {
    return NextResponse.json({ error: 'API_BASE_URL not configured' }, { status: 500 });
  }

  try {
  const devices = await fetchAllDevicesWithModules(API_BASE_URL, isLocalhost);
    
    const installsDevices = devices.filter(d => d.modules?.installs);
    const inventoryDevices = devices;
    
    const managed = new Set();
    const usages = new Set();
    const catalogs = new Set();
    const rooms = new Set();
    const fleets = new Set();
    
    // Extract managed installs from devices WITH installs data
    for (const device of installsDevices) {
      const m = device.modules || {};
      
      // Extract managed installs from Cimian items
      if (m.installs?.cimian?.items) {
        for (const item of m.installs.cimian.items) {
          const name = item.itemName || item.displayName || item.name;
          const type = item.type || item.itemType || item.group;
          
          // Filter out internal managed_apps and managed_profiles items
          const isInternal = (name === 'managed_apps' || name === 'managed_profiles') || 
                             (type === 'managed_apps' || type === 'managed_profiles');
                             
          if (name && !isInternal) {
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
        } catch {
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
    
    // Return BOTH filter options AND device data to avoid duplicate API calls
    const devicesWithInstalls = installsDevices.map((device: any) => {
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
        } catch {
          // Silently skip parse errors
        }
      }

      return {
        serialNumber: device.serialNumber,
        deviceId: device.deviceId,
        deviceName: device.deviceName,
        lastSeen: device.lastSeen,
        modules: {
          installs: m.installs || null,
          inventory: inventory || null
        }
      };
    });

    return NextResponse.json({
      success: true,
      managedInstalls: Array.from(managed).sort(),
  otherInstalls: [],
      usages: Array.from(usages).sort(),
      catalogs: Array.from(catalogs).sort(),
      rooms: Array.from(rooms).sort(),
      fleets: Array.from(fleets).sort(),
      platforms: ['Windows', 'Macintosh'],
      devicesWithData: inventoryDevices.length,
      // Include device data to avoid second API call
      devices: devicesWithInstalls
    });
  } catch (error) {
    console.error('[INSTALLS FILTERS] Failed to build filter payload', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

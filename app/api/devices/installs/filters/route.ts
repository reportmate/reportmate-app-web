import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Simple in-memory cache with 5 minute TTL
let cachedInstalls: { data: any[], timestamp: number } | null = null;
let cachedDevices: { data: any[], timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchBulkInstalls(API_BASE_URL: string) {
  // Check cache first
  if (cachedInstalls && (Date.now() - cachedInstalls.timestamp) < CACHE_TTL) {
    console.log('[INSTALLS FILTERS] Using cached installs data');
    return cachedInstalls.data;
  }

  console.log('[INSTALLS FILTERS] Fetching fresh installs from /api/devices/installs bulk endpoint');
  
  // Build headers with authentication
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  
  if (process.env.REPORTMATE_PASSPHRASE) {
    headers['X-API-PASSPHRASE'] = process.env.REPORTMATE_PASSPHRASE
  } else {
    const managedIdentityId = process.env.AZURE_CLIENT_ID || process.env.MSI_CLIENT_ID
    if (managedIdentityId) {
      headers['X-MS-CLIENT-PRINCIPAL-ID'] = managedIdentityId
    }
  }
  
  // Use the bulk installs endpoint - single request gets all data
  const response = await fetch(`${API_BASE_URL}/api/devices/installs`, {
    cache: 'no-store',
    headers
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch bulk installs: ${response.status}`);
  }

  const installs = await response.json();
  const installsArray = Array.isArray(installs) ? installs : [];
  
  console.log(`[INSTALLS FILTERS] Fetched ${installsArray.length} install records`);

  // Cache the results
  cachedInstalls = {
    data: installsArray,
    timestamp: Date.now()
  };

  return installsArray;
}

async function fetchAllDevices(API_BASE_URL: string) {
  // Check cache first
  if (cachedDevices && (Date.now() - cachedDevices.timestamp) < CACHE_TTL) {
    console.log('[INSTALLS FILTERS] Using cached devices data');
    return cachedDevices.data;
  }

  console.log('[INSTALLS FILTERS] Fetching devices from /api/devices bulk endpoint');
  
  // Build headers with authentication
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  
  if (process.env.REPORTMATE_PASSPHRASE) {
    headers['X-API-PASSPHRASE'] = process.env.REPORTMATE_PASSPHRASE
  } else {
    const managedIdentityId = process.env.AZURE_CLIENT_ID || process.env.MSI_CLIENT_ID
    if (managedIdentityId) {
      headers['X-MS-CLIENT-PRINCIPAL-ID'] = managedIdentityId
    }
  }
  
  const response = await fetch(`${API_BASE_URL}/api/devices`, {
    cache: 'no-store',
    headers
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch devices: ${response.status}`);
  }

  const devicesData = await response.json();
  const devices = Array.isArray(devicesData.devices) ? devicesData.devices : [];
  
  console.log(`[INSTALLS FILTERS] Fetched ${devices.length} devices`);

  // Cache the results
  cachedDevices = {
    data: devices,
    timestamp: Date.now()
  };

  return devices;
}

export async function GET(request: Request) {
  // LOCALHOST BYPASS: Skip auth check for local development
  const isLocalhost = request.headers.get('host')?.includes('localhost') || process.env.NODE_ENV === 'development'
  
  // Check authentication (skip for localhost)
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
    // Fetch both bulk endpoints in parallel - each is a single fast request
    const [installs, devices] = await Promise.all([
      fetchBulkInstalls(API_BASE_URL),
      fetchAllDevices(API_BASE_URL)
    ]);
    
    // Extract unique filter options from installs data
    const managed = new Set<string>();
    const usages = new Set<string>();
    const catalogs = new Set<string>();
    const rooms = new Set<string>();
    const platforms = new Set<string>();
    const fleets = new Set<string>();
    
    // Process install records
    for (const install of installs) {
      // Extract item names (filter out internal items)
      const name = install.itemName;
      if (name && name !== 'managed_apps' && name !== 'managed_profiles') {
        managed.add(name.trim());
      }
      
      // Extract inventory fields
      if (install.usage) usages.add(install.usage);
      if (install.catalog) catalogs.add(install.catalog);
      if (install.location) rooms.add(install.location);
    }
    
    // Get additional inventory data from devices (for devices without installs)
    for (const device of devices) {
      // Extract from device-level inventory
      const inventory = device.inventory || device.modules?.inventory;
      if (inventory && typeof inventory === 'object') {
        if (inventory.usage) usages.add(inventory.usage);
        if (inventory.catalog) catalogs.add(inventory.catalog);
        if (inventory.location) rooms.add(inventory.location);
        if (inventory.fleet) fleets.add(inventory.fleet);
        
        // Normalize platform
        if (inventory.platform) {
          const normalizedPlatform = inventory.platform === 'Darwin' ? 'Macintosh' 
            : inventory.platform === 'Windows NT' ? 'Windows' 
            : inventory.platform;
          platforms.add(normalizedPlatform);
        }
      }
      
      // Also extract platform from device level
      const devicePlatform = device.platform;
      if (devicePlatform) {
        const normalizedPlatform = devicePlatform === 'Darwin' ? 'Macintosh' 
          : devicePlatform === 'Windows NT' ? 'Windows' 
          : devicePlatform;
        platforms.add(normalizedPlatform);
      }
    }

    // Group installs by device for the response
    const deviceInstallsMap = new Map<string, any>();
    
    for (const install of installs) {
      const serial = install.serialNumber;
      if (!deviceInstallsMap.has(serial)) {
        deviceInstallsMap.set(serial, {
          serialNumber: serial,
          deviceId: install.deviceId,
          deviceName: install.deviceName,
          lastSeen: install.lastSeen,
          modules: {
            installs: {
              cimian: {
                items: []
              }
            },
            inventory: {
              usage: install.usage,
              catalog: install.catalog,
              location: install.location
            }
          }
        });
      }
      
      // Add the install item
      deviceInstallsMap.get(serial).modules.installs.cimian.items.push(install.raw || {
        itemName: install.itemName,
        currentStatus: install.currentStatus,
        latestVersion: install.latestVersion,
        installedVersion: install.installedVersion
      });
    }
    
    const devicesWithInstalls = Array.from(deviceInstallsMap.values());

    return NextResponse.json({
      success: true,
      managedInstalls: Array.from(managed).sort(),
      otherInstalls: [],
      usages: Array.from(usages).sort(),
      catalogs: Array.from(catalogs).sort(),
      rooms: Array.from(rooms).sort(),
      fleets: Array.from(fleets).sort(),
      platforms: Array.from(platforms).sort(),
      devicesWithData: devices.length,
      // Include device data to avoid second API call
      devices: devicesWithInstalls
    });
  } catch (error) {
    console.error('[INSTALLS FILTERS] Failed to build filter payload', error);
    return NextResponse.json({ 
      error: 'Internal error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
